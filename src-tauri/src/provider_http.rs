//! Calls to OpenAI-compatible providers, made from Rust.
//!
//! The web UI never sees the API key (it lives in the session key store or the
//! OS credential store) and never sees project file contents: the UI sends the
//! approved paths and this module reads them through `project_fs`, then places
//! them in the prompt. Timeouts, retries, rate limits, cancellation and
//! streaming (server-sent events) are handled here.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tokio_util::sync::CancellationToken;

use crate::project_fs;

pub const DEFAULT_TIMEOUT_MS: u64 = 60_000;
pub const MAX_TIMEOUT_MS: u64 = 300_000;
/// Longest `Retry-After` accepted before giving up, so the UI never hangs silently.
pub const MAX_RETRY_WAIT_MS: u64 = 10_000;
const MAX_RETRIES: u32 = 4;
const MAX_MESSAGES: usize = 64;
const MAX_MESSAGE_CHARS: usize = 400_000;
const MAX_RESPONSE_BYTES: usize = 4 * 1024 * 1024;
/// Placeholder the UI puts in a message where the project files go.
pub const FILES_PLACEHOLDER: &str = "{{PROJECT_FILES}}";

// ------------------------------------------------------------------ types

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct WireMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Attachment {
    pub root: String,
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionRequest {
    pub request_id: String,
    pub base_url: String,
    pub model: String,
    pub messages: Vec<WireMessage>,
    #[serde(default)]
    pub temperature: Option<f32>,
    #[serde(default)]
    pub timeout_ms: Option<u64>,
    #[serde(default)]
    pub max_retries: Option<u32>,
    #[serde(default)]
    pub retry_delay_ms: Option<u64>,
    #[serde(default)]
    pub stream: bool,
    #[serde(default)]
    pub attach: Option<Attachment>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Usage {
    pub input_tokens: u64,
    pub output_tokens: u64,
}

/// What was read for the prompt, without contents.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FileMeta {
    pub path: String,
    pub bytes: usize,
    pub truncated: bool,
    pub redactions: usize,
    pub skipped: Option<&'static str>,
}

impl From<&project_fs::FileContent> for FileMeta {
    fn from(f: &project_fs::FileContent) -> Self {
        Self {
            path: f.path.clone(),
            bytes: f.bytes,
            truncated: f.truncated,
            redactions: f.redactions,
            skipped: f.skipped,
        }
    }
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CompletionResponse {
    pub content: String,
    pub usage: Option<Usage>,
    /// True when the answer arrived as a stream of events.
    pub streamed: bool,
    /// Files placed in the prompt (metadata only).
    pub files: Vec<FileMeta>,
    pub read_ms: u64,
    /// Attempts made, including the successful one.
    pub attempts: u32,
}

/// Error sent to the UI: a stable kind the UI translates, plus a short detail
/// that never contains the key.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProviderFailure {
    /// config, no_key, unauthorized, rate_limited, timeout, network, http,
    /// bad_response, aborted
    pub kind: &'static str,
    pub status: Option<u16>,
    pub retry_after_ms: Option<u64>,
    pub detail: String,
}

impl ProviderFailure {
    fn new(kind: &'static str, detail: impl Into<String>) -> Self {
        Self {
            kind,
            status: None,
            retry_after_ms: None,
            detail: detail.into(),
        }
    }
    fn http(kind: &'static str, status: u16, detail: impl Into<String>) -> Self {
        Self {
            status: Some(status),
            ..Self::new(kind, detail)
        }
    }
    fn aborted() -> Self {
        Self::new("aborted", "")
    }

    /// Rate limits, gateway hiccups and dropped connections deserve another try.
    pub fn is_transient(&self) -> bool {
        match self.kind {
            "rate_limited" | "network" => true,
            "http" => matches!(self.status, Some(502..=504)),
            _ => false,
        }
    }
}

/// Text arriving from a stream, sent to the UI as it comes.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEvent {
    pub delta: String,
}

// ------------------------------------------------------------------ helpers

/// Same rule as the UI: HTTPS, or plain HTTP only on this machine. No
/// credentials, query or fragment. Returns the URL without a trailing slash.
pub fn normalize_base_url(input: &str) -> Result<String, ProviderFailure> {
    let url =
        reqwest::Url::parse(input.trim()).map_err(|_| ProviderFailure::new("config", "bad_url"))?;
    let local = matches!(
        url.host_str(),
        Some("localhost") | Some("127.0.0.1") | Some("[::1]")
    );
    let ok_scheme = url.scheme() == "https" || (url.scheme() == "http" && local);
    if !ok_scheme {
        return Err(ProviderFailure::new("config", "https"));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(ProviderFailure::new("config", "credentials"));
    }
    if url.query().is_some() || url.fragment().is_some() {
        return Err(ProviderFailure::new("config", "query"));
    }
    Ok(url.as_str().trim_end_matches('/').to_string())
}

/// `Retry-After` in seconds. HTTP dates are rare from these APIs and are ignored.
pub fn parse_retry_after(value: Option<&str>) -> Option<u64> {
    let secs: f64 = value?.trim().parse().ok()?;
    (secs.is_finite() && secs >= 0.0).then_some((secs * 1000.0) as u64)
}

fn redact_key(text: &str, key: &str) -> String {
    if key.is_empty() {
        text.to_string()
    } else {
        text.replace(key, "[chave oculta]")
    }
}

fn clip(text: &str, max: usize) -> String {
    text.chars().take(max).collect()
}

/// Wraps file contents in explicit markers, labelled as untrusted. A marker
/// written inside a file is defused so it cannot close the block early.
pub fn file_blocks(files: &[project_fs::FileContent]) -> String {
    files
        .iter()
        .filter(|f| f.skipped.is_none())
        .map(|f| {
            let mut notes = Vec::new();
            if f.truncated {
                notes.push("truncated".to_string());
            }
            if f.redactions > 0 {
                notes.push(format!("{} secret(s) redacted", f.redactions));
            }
            let header = if notes.is_empty() {
                format!("<<<FILE {}>>>", f.path)
            } else {
                format!("<<<FILE {} ({})>>>", f.path, notes.join(", "))
            };
            let body = f.content.replace("<<<", "<\u{200b}<<");
            format!("{header}\n{body}\n<<<END FILE>>>")
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

/// Puts the file blocks where the UI left the placeholder (or at the end of the
/// last user message). Returns the metadata of what was read.
pub fn attach_files(
    messages: &mut [WireMessage],
    attach: &Attachment,
) -> Result<Vec<FileMeta>, ProviderFailure> {
    let files = project_fs::read_files(&attach.root, &attach.paths)
        .map_err(|e| ProviderFailure::new("config", format!("files: {}", e.code)))?;
    let blocks = file_blocks(&files);
    let slot = messages
        .iter()
        .position(|m| m.content.contains(FILES_PLACEHOLDER))
        .or_else(|| messages.iter().rposition(|m| m.role == "user"));
    if let Some(i) = slot {
        let m = &mut messages[i];
        m.content = if m.content.contains(FILES_PLACEHOLDER) {
            m.content.replacen(FILES_PLACEHOLDER, &blocks, 1)
        } else {
            format!("{}\n\n{}", m.content, blocks)
        };
    }
    Ok(files.iter().map(FileMeta::from).collect())
}

fn validate(req: &CompletionRequest) -> Result<(), ProviderFailure> {
    if req.model.trim().is_empty() || req.model.len() > 200 {
        return Err(ProviderFailure::new("config", "model"));
    }
    if req.messages.is_empty() || req.messages.len() > MAX_MESSAGES {
        return Err(ProviderFailure::new("config", "messages"));
    }
    let total: usize = req.messages.iter().map(|m| m.content.len()).sum();
    if total > MAX_MESSAGE_CHARS {
        return Err(ProviderFailure::new("config", "messages_too_long"));
    }
    if req
        .messages
        .iter()
        .any(|m| !matches!(m.role.as_str(), "system" | "user" | "assistant"))
    {
        return Err(ProviderFailure::new("config", "role"));
    }
    Ok(())
}

// ------------------------------------------------------------------ SSE

/// Incremental parser for `text/event-stream` bodies in the OpenAI format.
#[derive(Default)]
pub struct SseParser {
    buf: String,
    pub done: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub enum SseItem {
    Delta(String),
    Usage(Usage),
    Error(String),
}

impl SseParser {
    pub fn push(&mut self, chunk: &str) -> Vec<SseItem> {
        self.buf.push_str(&chunk.replace("\r\n", "\n"));
        let mut out = Vec::new();
        while let Some(end) = self.buf.find("\n\n") {
            let event: String = self.buf.drain(..end + 2).collect();
            for line in event.lines() {
                let Some(data) = line.strip_prefix("data:") else {
                    continue;
                };
                let data = data.trim();
                if data == "[DONE]" {
                    self.done = true;
                    continue;
                }
                let Ok(json) = serde_json::from_str::<serde_json::Value>(data) else {
                    continue;
                };
                if let Some(msg) = json.pointer("/error/message").and_then(|v| v.as_str()) {
                    out.push(SseItem::Error(msg.to_string()));
                }
                if let Some(text) = json
                    .pointer("/choices/0/delta/content")
                    .and_then(|v| v.as_str())
                    .filter(|t| !t.is_empty())
                {
                    out.push(SseItem::Delta(text.to_string()));
                }
                if let Some(u) = usage_from(&json) {
                    out.push(SseItem::Usage(u));
                }
            }
        }
        out
    }
}

fn usage_from(json: &serde_json::Value) -> Option<Usage> {
    let u = json.get("usage")?;
    Some(Usage {
        input_tokens: u.get("prompt_tokens")?.as_u64()?,
        output_tokens: u.get("completion_tokens")?.as_u64()?,
    })
}

// ------------------------------------------------------------------ calls

/// Everything one call needs besides the request itself.
pub struct CallContext<'a> {
    pub client: &'a reqwest::Client,
    pub key: &'a str,
    pub cancel: &'a CancellationToken,
}

async fn wait(ms: u64, cancel: &CancellationToken) -> Result<(), ProviderFailure> {
    tokio::select! {
        _ = tokio::time::sleep(Duration::from_millis(ms)) => Ok(()),
        _ = cancel.cancelled() => Err(ProviderFailure::aborted()),
    }
}

async fn error_from(response: reqwest::Response, key: &str) -> ProviderFailure {
    let status = response.status().as_u16();
    if status == 401 || status == 403 {
        return ProviderFailure::http("unauthorized", status, "");
    }
    if status == 429 {
        let retry = response
            .headers()
            .get("retry-after")
            .and_then(|v| v.to_str().ok())
            .map(str::to_string);
        return ProviderFailure {
            retry_after_ms: parse_retry_after(retry.as_deref()),
            ..ProviderFailure::http("rate_limited", status, retry.unwrap_or_default())
        };
    }
    let text = response.text().await.unwrap_or_default();
    let detail = serde_json::from_str::<serde_json::Value>(&text)
        .ok()
        .and_then(|v| {
            v.pointer("/error/message")
                .and_then(|m| m.as_str())
                .map(str::to_string)
        })
        .map(|m| clip(&redact_key(&m, key), 200))
        .unwrap_or_default();
    ProviderFailure::http("http", status, detail)
}

/// One HTTP attempt. `emitted` turns true once any streamed text reached the UI.
async fn attempt(
    ctx: &CallContext<'_>,
    url: &str,
    body: &serde_json::Value,
    timeout: Duration,
    on_delta: &mut (dyn FnMut(&str) + Send),
    emitted: &mut bool,
) -> Result<(String, Option<Usage>, bool), ProviderFailure> {
    let deadline = tokio::time::Instant::now() + timeout;
    let work = async {
        let mut builder = ctx
            .client
            .post(url)
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .body(serde_json::to_vec(body).unwrap_or_default());
        if !ctx.key.is_empty() {
            builder = builder.bearer_auth(ctx.key);
        }
        let response = builder.send().await.map_err(|e| {
            ProviderFailure::new("network", clip(&redact_key(&e.to_string(), ctx.key), 120))
        })?;
        if !response.status().is_success() {
            return Err(error_from(response, ctx.key).await);
        }
        let is_sse = response
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .is_some_and(|v| v.contains("text/event-stream"));
        if is_sse {
            let mut parser = SseParser::default();
            let mut text = String::new();
            let mut usage = None;
            let mut stream = response.bytes_stream();
            let mut pending: Vec<u8> = Vec::new();
            while let Some(chunk) = stream.next().await {
                let chunk = chunk.map_err(|e| {
                    ProviderFailure::new("network", clip(&redact_key(&e.to_string(), ctx.key), 120))
                })?;
                pending.extend_from_slice(&chunk);
                // Only decode complete UTF-8 sequences; keep the rest for the next chunk.
                let valid = match std::str::from_utf8(&pending) {
                    Ok(_) => pending.len(),
                    Err(e) => e.valid_up_to(),
                };
                let decoded = String::from_utf8_lossy(&pending[..valid]).into_owned();
                pending.drain(..valid);
                for item in parser.push(&decoded) {
                    match item {
                        SseItem::Delta(d) => {
                            if text.len() + d.len() > MAX_RESPONSE_BYTES {
                                return Err(ProviderFailure::new("bad_response", "too_long"));
                            }
                            text.push_str(&d);
                            *emitted = true;
                            on_delta(&d);
                        }
                        SseItem::Usage(u) => usage = Some(u),
                        SseItem::Error(m) => {
                            return Err(ProviderFailure::new(
                                "http",
                                clip(&redact_key(&m, ctx.key), 200),
                            ));
                        }
                    }
                }
                if parser.done {
                    break;
                }
            }
            return Ok((text, usage, true));
        }
        let bytes = response.bytes().await.map_err(|e| {
            ProviderFailure::new("network", clip(&redact_key(&e.to_string(), ctx.key), 120))
        })?;
        if bytes.len() > MAX_RESPONSE_BYTES {
            return Err(ProviderFailure::new("bad_response", "too_long"));
        }
        let json: serde_json::Value = serde_json::from_slice(&bytes)
            .map_err(|_| ProviderFailure::new("bad_response", "not_json"))?;
        let content = json
            .pointer("/choices/0/message/content")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        Ok((content, usage_from(&json), false))
    };
    tokio::select! {
        result = work => result,
        _ = tokio::time::sleep_until(deadline) => Err(ProviderFailure::new("timeout", timeout.as_millis().to_string())),
        _ = ctx.cancel.cancelled() => Err(ProviderFailure::aborted()),
    }
}

/// `/chat/completions` with retries for transient failures. When streaming is
/// asked for and the server answers 400, it tries once more without streaming
/// (some compatible servers do not accept `stream_options`).
pub async fn complete(
    ctx: &CallContext<'_>,
    req: &CompletionRequest,
    on_delta: &mut (dyn FnMut(&str) + Send),
) -> Result<CompletionResponse, ProviderFailure> {
    validate(req)?;
    let base = normalize_base_url(&req.base_url)?;
    let url = format!("{base}/chat/completions");
    let mut messages = req.messages.clone();
    let started = Instant::now();
    let files = match &req.attach {
        Some(a) => attach_files(&mut messages, a)?,
        None => Vec::new(),
    };
    let read_ms = if req.attach.is_some() {
        started.elapsed().as_millis() as u64
    } else {
        0
    };
    let timeout = Duration::from_millis(
        req.timeout_ms
            .unwrap_or(DEFAULT_TIMEOUT_MS)
            .clamp(1, MAX_TIMEOUT_MS),
    );
    let max_retries = req.max_retries.unwrap_or(2).min(MAX_RETRIES);
    let base_delay = req.retry_delay_ms.unwrap_or(600);
    let mut stream = req.stream;
    let mut emitted = false;
    let mut attempts = 0u32;
    let mut retries = 0u32;
    loop {
        if ctx.cancel.is_cancelled() {
            return Err(ProviderFailure::aborted());
        }
        attempts += 1;
        let mut body = serde_json::json!({
            "model": req.model.trim(),
            "messages": messages,
            "temperature": req.temperature.unwrap_or(0.2),
        });
        if stream {
            body["stream"] = serde_json::json!(true);
            body["stream_options"] = serde_json::json!({ "include_usage": true });
        }
        match attempt(ctx, &url, &body, timeout, on_delta, &mut emitted).await {
            Ok((content, usage, streamed)) => {
                if content.trim().is_empty() {
                    return Err(ProviderFailure::new("bad_response", "empty"));
                }
                return Ok(CompletionResponse {
                    content,
                    usage,
                    streamed,
                    files,
                    read_ms,
                    attempts,
                });
            }
            Err(f) if stream && !emitted && f.kind == "http" && f.status == Some(400) => {
                stream = false;
            }
            Err(f) => {
                // Text already shown cannot be taken back: no retry after that.
                if emitted || retries >= max_retries || !f.is_transient() {
                    return Err(f);
                }
                let delay = f.retry_after_ms.unwrap_or(base_delay << retries);
                if delay > MAX_RETRY_WAIT_MS {
                    return Err(f);
                }
                retries += 1;
                wait(delay, ctx.cancel).await?;
            }
        }
    }
}

/// `/models`, for the connection test.
pub async fn list_models(
    ctx: &CallContext<'_>,
    base_url: &str,
    timeout_ms: Option<u64>,
) -> Result<Vec<String>, ProviderFailure> {
    let base = normalize_base_url(base_url)?;
    let timeout = Duration::from_millis(timeout_ms.unwrap_or(20_000).clamp(1, MAX_TIMEOUT_MS));
    let work = async {
        let mut builder = ctx.client.get(format!("{base}/models"));
        if !ctx.key.is_empty() {
            builder = builder.bearer_auth(ctx.key);
        }
        let response = builder.send().await.map_err(|e| {
            ProviderFailure::new("network", clip(&redact_key(&e.to_string(), ctx.key), 120))
        })?;
        if !response.status().is_success() {
            return Err(error_from(response, ctx.key).await);
        }
        let bytes = response.bytes().await.map_err(|e| {
            ProviderFailure::new("network", clip(&redact_key(&e.to_string(), ctx.key), 120))
        })?;
        let json: serde_json::Value = serde_json::from_slice(&bytes)
            .map_err(|_| ProviderFailure::new("bad_response", "not_json"))?;
        Ok(json
            .get("data")
            .and_then(|d| d.as_array())
            .map(|items| {
                items
                    .iter()
                    .filter_map(|m| m.get("id").and_then(|v| v.as_str()).map(str::to_string))
                    .collect()
            })
            .unwrap_or_default())
    };
    tokio::select! {
        result = work => result,
        _ = tokio::time::sleep(timeout) => Err(ProviderFailure::new("timeout", timeout.as_millis().to_string())),
        _ = ctx.cancel.cancelled() => Err(ProviderFailure::aborted()),
    }
}

// ------------------------------------------------------------------ state

/// Keys typed in this session (memory only) and the calls in flight.
#[derive(Default)]
pub struct ProviderState {
    session_keys: Mutex<HashMap<String, String>>,
    in_flight: Mutex<HashMap<String, CancellationToken>>,
    client: std::sync::OnceLock<reqwest::Client>,
}

impl ProviderState {
    pub fn client(&self) -> &reqwest::Client {
        self.client.get_or_init(|| {
            reqwest::Client::builder()
                .connect_timeout(Duration::from_secs(15))
                .user_agent("agent-orchestra")
                .build()
                .unwrap_or_default()
        })
    }

    pub fn set_session_key(&self, account: &str, key: Option<&str>) {
        let mut keys = self.session_keys.lock().unwrap_or_else(|p| p.into_inner());
        match key.map(str::trim).filter(|k| !k.is_empty()) {
            Some(k) => {
                keys.insert(account.to_string(), k.to_string());
            }
            None => {
                keys.remove(account);
            }
        }
    }

    pub fn session_key(&self, account: &str) -> Option<String> {
        let keys = self.session_keys.lock().unwrap_or_else(|p| p.into_inner());
        keys.get(account).cloned()
    }

    /// Session key first, then the OS credential store, else no key (local servers).
    pub fn key_for(&self, account: &str) -> String {
        self.session_key(account)
            .or_else(|| crate::secrets::load(account).ok().flatten())
            .unwrap_or_default()
    }

    fn begin(&self, request_id: &str) -> CancellationToken {
        let token = CancellationToken::new();
        let mut map = self.in_flight.lock().unwrap_or_else(|p| p.into_inner());
        map.insert(request_id.to_string(), token.clone());
        token
    }

    fn end(&self, request_id: &str) {
        let mut map = self.in_flight.lock().unwrap_or_else(|p| p.into_inner());
        map.remove(request_id);
    }

    pub fn cancel(&self, request_id: &str) -> bool {
        let map = self.in_flight.lock().unwrap_or_else(|p| p.into_inner());
        map.get(request_id).map(CancellationToken::cancel).is_some()
    }
}

fn valid_request_id(id: &str) -> Result<(), ProviderFailure> {
    let ok = !id.is_empty()
        && id.len() <= 80
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    ok.then_some(())
        .ok_or_else(|| ProviderFailure::new("config", "request_id"))
}

// ------------------------------------------------------------------ commands

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct KeyStatus {
    pub session: bool,
    pub vault: bool,
}

/// Keeps the key typed in Settings in memory, in Rust. `None` or empty clears it.
#[tauri::command]
pub fn provider_set_key(
    state: tauri::State<'_, ProviderState>,
    base_url: String,
    key: Option<String>,
) -> Result<(), ProviderFailure> {
    let account = normalize_base_url(&base_url)?;
    if let Some(k) = key.as_deref()
        && !k.trim().is_empty()
    {
        crate::secrets::validate_secret(k).map_err(|e| ProviderFailure::new("config", e.0))?;
    }
    state.set_session_key(&account, key.as_deref());
    Ok(())
}

/// Whether a key exists, without ever returning it.
#[tauri::command]
pub fn provider_key_status(
    state: tauri::State<'_, ProviderState>,
    base_url: String,
) -> Result<KeyStatus, ProviderFailure> {
    let account = normalize_base_url(&base_url)?;
    let vault = crate::secrets::load(&account)
        .map_err(|e| ProviderFailure::new("config", e.0))?
        .is_some();
    Ok(KeyStatus {
        session: state.session_key(&account).is_some(),
        vault,
    })
}

#[tauri::command]
pub async fn provider_complete(
    state: tauri::State<'_, ProviderState>,
    request: CompletionRequest,
    on_event: tauri::ipc::Channel<StreamEvent>,
) -> Result<CompletionResponse, ProviderFailure> {
    valid_request_id(&request.request_id)?;
    let account = normalize_base_url(&request.base_url)?;
    let key = state.key_for(&account);
    let cancel = state.begin(&request.request_id);
    let ctx = CallContext {
        client: state.client(),
        key: &key,
        cancel: &cancel,
    };
    let mut on_delta = |d: &str| {
        let _ = on_event.send(StreamEvent {
            delta: d.to_string(),
        });
    };
    let result = complete(&ctx, &request, &mut on_delta).await;
    state.end(&request.request_id);
    result
}

#[tauri::command]
pub async fn provider_list_models(
    state: tauri::State<'_, ProviderState>,
    base_url: String,
    request_id: String,
    timeout_ms: Option<u64>,
) -> Result<Vec<String>, ProviderFailure> {
    valid_request_id(&request_id)?;
    let account = normalize_base_url(&base_url)?;
    let key = state.key_for(&account);
    let cancel = state.begin(&request_id);
    let ctx = CallContext {
        client: state.client(),
        key: &key,
        cancel: &cancel,
    };
    let result = list_models(&ctx, &base_url, timeout_ms).await;
    state.end(&request_id);
    result
}

#[tauri::command]
pub fn provider_cancel(state: tauri::State<'_, ProviderState>, request_id: String) -> bool {
    state.cancel(&request_id)
}

// ------------------------------------------------------------------ tests

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{BufRead, BufReader, Read, Write};
    use std::net::TcpListener;
    use std::sync::Arc;

    /// What the fake provider answers, one per connection.
    #[derive(Clone)]
    enum Reply {
        Json(u16, &'static str, Vec<(&'static str, &'static str)>),
        Sse(Vec<&'static str>, u64),
        Hang,
    }

    #[derive(Clone, Debug)]
    struct Seen {
        path: String,
        auth: String,
        body: String,
    }

    /// A tiny HTTP server on a random port, answering scripted replies in order.
    fn server(replies: Vec<Reply>) -> (String, Arc<Mutex<Vec<Seen>>>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let seen = Arc::new(Mutex::new(Vec::new()));
        let log = seen.clone();
        std::thread::spawn(move || {
            for (stream, reply) in listener.incoming().zip(replies) {
                let mut stream = stream.unwrap();
                let mut reader = BufReader::new(stream.try_clone().unwrap());
                let mut request_line = String::new();
                reader.read_line(&mut request_line).unwrap();
                let mut len = 0usize;
                let mut auth = String::new();
                loop {
                    let mut line = String::new();
                    reader.read_line(&mut line).unwrap();
                    if line == "\r\n" || line.is_empty() {
                        break;
                    }
                    let lower = line.to_ascii_lowercase();
                    if let Some(v) = lower.strip_prefix("content-length:") {
                        len = v.trim().parse().unwrap_or(0);
                    }
                    if lower.starts_with("authorization:") {
                        auth = line["authorization:".len()..].trim().to_string();
                    }
                }
                let mut body = vec![0u8; len];
                reader.read_exact(&mut body).unwrap();
                log.lock().unwrap().push(Seen {
                    path: request_line
                        .split_whitespace()
                        .nth(1)
                        .unwrap_or("")
                        .to_string(),
                    auth,
                    body: String::from_utf8_lossy(&body).into_owned(),
                });
                match reply {
                    Reply::Json(status, body, headers) => {
                        let mut head = format!(
                            "HTTP/1.1 {status} X\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n",
                            body.len()
                        );
                        for (k, v) in headers {
                            head.push_str(&format!("{k}: {v}\r\n"));
                        }
                        head.push_str("\r\n");
                        let _ = stream.write_all(head.as_bytes());
                        let _ = stream.write_all(body.as_bytes());
                    }
                    Reply::Sse(events, gap_ms) => {
                        let _ = stream.write_all(
                            b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n",
                        );
                        for e in events {
                            let _ = stream.write_all(e.as_bytes());
                            let _ = stream.flush();
                            std::thread::sleep(Duration::from_millis(gap_ms));
                        }
                    }
                    Reply::Hang => {
                        std::thread::sleep(Duration::from_secs(3));
                    }
                }
            }
        });
        (format!("http://127.0.0.1:{port}/v1"), seen)
    }

    const OK: &str = r#"{"choices":[{"message":{"content":"pronto"}}],"usage":{"prompt_tokens":11,"completion_tokens":7}}"#;

    fn request(base: &str) -> CompletionRequest {
        CompletionRequest {
            request_id: "t1".into(),
            base_url: base.into(),
            model: "m".into(),
            messages: vec![WireMessage {
                role: "user".into(),
                content: "oi".into(),
            }],
            temperature: None,
            timeout_ms: Some(2000),
            max_retries: None,
            retry_delay_ms: Some(5),
            stream: false,
            attach: None,
        }
    }

    async fn run(
        req: &CompletionRequest,
        key: &str,
        cancel: &CancellationToken,
    ) -> (Result<CompletionResponse, ProviderFailure>, String) {
        let client = reqwest::Client::new();
        let ctx = CallContext {
            client: &client,
            key,
            cancel,
        };
        let mut streamed = String::new();
        let mut on_delta = |d: &str| streamed.push_str(d);
        let result = complete(&ctx, req, &mut on_delta).await;
        (result, streamed)
    }

    #[tokio::test]
    async fn sends_the_key_from_rust_and_reads_usage() {
        let (base, seen) = server(vec![Reply::Json(200, OK, vec![])]);
        let (result, _) = run(&request(&base), "sk-rust-only", &CancellationToken::new()).await;
        let r = result.unwrap();
        assert_eq!(r.content, "pronto");
        assert_eq!(
            r.usage,
            Some(Usage {
                input_tokens: 11,
                output_tokens: 7
            })
        );
        let seen = seen.lock().unwrap();
        assert_eq!(seen[0].path, "/v1/chat/completions");
        assert_eq!(seen[0].auth, "Bearer sk-rust-only");
        assert!(seen[0].body.contains("\"model\":\"m\""));
    }

    #[tokio::test]
    async fn retries_a_503_then_succeeds() {
        let (base, seen) = server(vec![
            Reply::Json(503, "{}", vec![]),
            Reply::Json(200, OK, vec![]),
        ]);
        let (result, _) = run(&request(&base), "", &CancellationToken::new()).await;
        assert_eq!(result.unwrap().attempts, 2);
        assert_eq!(seen.lock().unwrap().len(), 2);
    }

    #[tokio::test]
    async fn never_retries_401_and_hides_the_key() {
        let (base, seen) = server(vec![Reply::Json(401, "{}", vec![])]);
        let (result, _) = run(&request(&base), "sk-secret", &CancellationToken::new()).await;
        let f = result.unwrap_err();
        assert_eq!((f.kind, f.status), ("unauthorized", Some(401)));
        assert_eq!(seen.lock().unwrap().len(), 1);

        let (base, _) = server(vec![Reply::Json(
            500,
            r#"{"error":{"message":"bad key sk-secret"}}"#,
            vec![],
        )]);
        let (result, _) = run(&request(&base), "sk-secret", &CancellationToken::new()).await;
        let f = result.unwrap_err();
        assert_eq!(f.kind, "http");
        assert!(!f.detail.contains("sk-secret"));
    }

    #[tokio::test]
    async fn honours_short_retry_after_and_gives_up_on_long_ones() {
        let (base, _) = server(vec![
            Reply::Json(429, "{}", vec![("Retry-After", "0")]),
            Reply::Json(200, OK, vec![]),
        ]);
        let (result, _) = run(&request(&base), "", &CancellationToken::new()).await;
        assert!(result.is_ok());

        let (base, seen) = server(vec![Reply::Json(429, "{}", vec![("Retry-After", "60")])]);
        let (result, _) = run(&request(&base), "", &CancellationToken::new()).await;
        let f = result.unwrap_err();
        assert_eq!((f.kind, f.retry_after_ms), ("rate_limited", Some(60_000)));
        assert_eq!(seen.lock().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn times_out_on_a_silent_server() {
        let (base, _) = server(vec![Reply::Hang]);
        let mut req = request(&base);
        req.timeout_ms = Some(150);
        req.max_retries = Some(0);
        let (result, _) = run(&req, "", &CancellationToken::new()).await;
        assert_eq!(result.unwrap_err().kind, "timeout");
    }

    #[tokio::test]
    async fn cancels_an_in_flight_call() {
        let (base, _) = server(vec![Reply::Hang]);
        let cancel = CancellationToken::new();
        let trigger = cancel.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(80)).await;
            trigger.cancel();
        });
        let started = Instant::now();
        let (result, _) = run(&request(&base), "", &cancel).await;
        assert_eq!(result.unwrap_err().kind, "aborted");
        assert!(started.elapsed() < Duration::from_secs(1));
    }

    #[tokio::test]
    async fn streams_deltas_and_usage() {
        let (base, seen) = server(vec![Reply::Sse(
            vec![
                "data: {\"choices\":[{\"delta\":{\"content\":\"Olá\"}}]}\n\n",
                "data: {\"choices\":[{\"delta\":{\"content\":\", mundo\"}}]}\n\n",
                "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":3,\"completion_tokens\":2}}\n\ndata: [DONE]\n\n",
            ],
            20,
        )]);
        let mut req = request(&base);
        req.stream = true;
        let (result, streamed) = run(&req, "", &CancellationToken::new()).await;
        let r = result.unwrap();
        assert!(r.streamed);
        assert_eq!(r.content, "Olá, mundo");
        assert_eq!(streamed, "Olá, mundo");
        assert_eq!(r.usage.unwrap().output_tokens, 2);
        assert!(seen.lock().unwrap()[0].body.contains("\"stream\":true"));
    }

    #[tokio::test]
    async fn falls_back_without_streaming_on_400() {
        let (base, seen) = server(vec![
            Reply::Json(
                400,
                r#"{"error":{"message":"stream_options not supported"}}"#,
                vec![],
            ),
            Reply::Json(200, OK, vec![]),
        ]);
        let mut req = request(&base);
        req.stream = true;
        let (result, _) = run(&req, "", &CancellationToken::new()).await;
        let r = result.unwrap();
        assert!(!r.streamed);
        let seen = seen.lock().unwrap();
        assert!(!seen[1].body.contains("\"stream\""));
    }

    #[tokio::test]
    async fn reads_approved_files_in_rust_and_returns_only_metadata() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("app.ts"),
            "const k = 'x';\n<<<END FILE>>>\n",
        )
        .unwrap();
        std::fs::write(dir.path().join(".env"), "TOKEN=abc").unwrap();
        let (base, seen) = server(vec![Reply::Json(200, OK, vec![])]);
        let mut req = request(&base);
        req.messages[0].content = format!("Plano\n{FILES_PLACEHOLDER}");
        req.attach = Some(Attachment {
            root: dir.path().to_string_lossy().into_owned(),
            paths: vec!["app.ts".into(), ".env".into(), "../fora.txt".into()],
        });
        let (result, _) = run(&req, "", &CancellationToken::new()).await;
        let r = result.unwrap();
        let by_path: HashMap<_, _> = r
            .files
            .iter()
            .map(|f| (f.path.as_str(), f.skipped))
            .collect();
        assert_eq!(by_path["app.ts"], None);
        assert_eq!(by_path[".env"], Some("denied"));
        assert!(by_path["../fora.txt"].is_some());
        let body = &seen.lock().unwrap()[0].body;
        assert!(body.contains("<<<FILE app.ts>>>"));
        assert!(!body.contains("TOKEN=abc"));
        assert!(!body.contains(FILES_PLACEHOLDER));
        // A marker inside the file cannot close the block early.
        assert_eq!(body.matches("<<<END FILE>>>").count(), 1);
    }

    #[test]
    fn parses_sse_split_across_chunks() {
        let mut p = SseParser::default();
        assert!(p.push("data: {\"choices\":[{\"delta\":{\"con").is_empty());
        assert_eq!(
            p.push("tent\":\"a\"}}]}\r\n\r\ndata: [DONE]\r\n\r\n"),
            vec![SseItem::Delta("a".into())]
        );
        assert!(p.done);
    }

    #[test]
    fn normalizes_and_restricts_base_urls() {
        assert_eq!(
            normalize_base_url(" https://api.example.com/v1/ ").unwrap(),
            "https://api.example.com/v1"
        );
        assert!(normalize_base_url("http://localhost:11434/v1").is_ok());
        assert_eq!(
            normalize_base_url("http://api.example.com/v1")
                .unwrap_err()
                .detail,
            "https"
        );
        assert!(normalize_base_url("https://u:p@api.example.com").is_err());
        assert!(normalize_base_url("https://api.example.com/v1?x=1").is_err());
        assert_eq!(parse_retry_after(Some("2")), Some(2000));
        assert_eq!(
            parse_retry_after(Some("Wed, 21 Oct 2026 07:28:00 GMT")),
            None
        );
    }

    #[test]
    fn session_keys_stay_in_rust_memory() {
        let state = ProviderState::default();
        state.set_session_key("https://a.test/v1", Some("  sk-1  "));
        assert_eq!(
            state.session_key("https://a.test/v1").as_deref(),
            Some("sk-1")
        );
        state.set_session_key("https://a.test/v1", None);
        assert!(state.session_key("https://a.test/v1").is_none());
        assert!(!state.cancel("nope"));
        let token = state.begin("r1");
        assert!(state.cancel("r1"));
        assert!(token.is_cancelled());
    }
}

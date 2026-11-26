//! API keys in the operating system's credential store.
//!
//! On Windows this is the Credential Manager (via `windows-native-keyring-store`).
//! Keys are never written to app files, logs or error messages. Every value that
//! crosses the IPC boundary is validated here, in Rust, before touching the store.

use keyring_core::{Entry, Error as KeyringError};

/// Service name under which all entries are stored.
pub const SERVICE: &str = "agent-orchestra";

const MAX_ACCOUNT_LEN: usize = 200;
const MAX_SECRET_LEN: usize = 4096;

/// Error type returned to the frontend. Messages never include the secret.
#[derive(Debug, PartialEq, Eq, serde::Serialize)]
pub struct SecretError(pub String);

impl SecretError {
    fn new(message: &str) -> Self {
        Self(message.to_string())
    }
}

/// The account is the normalized provider base URL (e.g. `https://api.openai.com/v1`).
pub fn validate_account(account: &str) -> Result<&str, SecretError> {
    let ok_chars = account
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || ".:/_-[]".contains(c));
    let ok_scheme = account.starts_with("https://") || account.starts_with("http://");
    if account.is_empty() || account.len() > MAX_ACCOUNT_LEN || !ok_chars || !ok_scheme {
        return Err(SecretError::new(
            "Endereço do provedor inválido para o cofre.",
        ));
    }
    Ok(account)
}

pub fn validate_secret(secret: &str) -> Result<&str, SecretError> {
    let trimmed = secret.trim();
    if trimmed.is_empty() {
        return Err(SecretError::new("A chave está vazia."));
    }
    if trimmed.len() > MAX_SECRET_LEN || trimmed.chars().any(char::is_control) {
        return Err(SecretError::new("A chave tem formato inválido."));
    }
    Ok(trimmed)
}

fn map_err(error: KeyringError) -> SecretError {
    match error {
        KeyringError::NoStorageAccess(_) | KeyringError::NoDefaultStore => {
            SecretError::new("O Gerenciador de Credenciais do sistema não está acessível.")
        }
        KeyringError::TooLong(_, _) => SecretError::new("A chave é longa demais para o cofre."),
        _ => SecretError::new("Falha ao acessar o Gerenciador de Credenciais."),
    }
}

fn entry(account: &str) -> Result<Entry, SecretError> {
    Entry::new(SERVICE, validate_account(account)?).map_err(map_err)
}

pub fn save(account: &str, secret: &str) -> Result<(), SecretError> {
    let secret = validate_secret(secret)?;
    entry(account)?.set_password(secret).map_err(map_err)
}

pub fn load(account: &str) -> Result<Option<String>, SecretError> {
    match entry(account)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(e) => Err(map_err(e)),
    }
}

pub fn delete(account: &str) -> Result<(), SecretError> {
    match entry(account)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(e) => Err(map_err(e)),
    }
}

/// Installs the platform credential store as the default. Returns false when no
/// supported store is available; commands then answer with a clear error.
pub fn init_store() -> bool {
    #[cfg(windows)]
    {
        match windows_native_keyring_store::Store::new() {
            Ok(store) => {
                keyring_core::set_default_store(store);
                true
            }
            Err(_) => false,
        }
    }
    #[cfg(not(windows))]
    {
        false
    }
}

/// Saves the key typed in this session (held in Rust memory) to the OS store.
/// The key itself never crosses the IPC boundary again: there is no load command.
#[tauri::command]
pub fn secret_save(
    state: tauri::State<'_, crate::provider_http::ProviderState>,
    account: String,
) -> Result<(), SecretError> {
    let account = validate_account(&account)?;
    let key = state
        .session_key(account)
        .ok_or_else(|| SecretError::new("Digite a chave antes de salvar no Windows."))?;
    save(account, &key)
}

/// Removes the key from the OS store and from this session.
#[tauri::command]
pub fn secret_delete(
    state: tauri::State<'_, crate::provider_http::ProviderState>,
    account: String,
) -> Result<(), SecretError> {
    state.set_session_key(validate_account(&account)?, None);
    delete(&account)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Once;

    static INIT: Once = Once::new();

    fn mock_store() {
        INIT.call_once(|| {
            keyring_core::set_default_store(keyring_core::mock::Store::new().unwrap());
        });
    }

    #[test]
    fn validates_accounts() {
        assert!(validate_account("https://api.openai.com/v1").is_ok());
        assert!(validate_account("http://localhost:11434/v1").is_ok());
        assert!(validate_account("http://[::1]:1234/v1").is_ok());
        assert!(validate_account("").is_err());
        assert!(validate_account("api.openai.com").is_err());
        assert!(validate_account("https://x.test/v1?key=abc").is_err());
        assert!(validate_account("https://evil.test/\nx").is_err());
        assert!(validate_account(&format!("https://{}", "a".repeat(300))).is_err());
    }

    #[test]
    fn validates_secrets() {
        assert_eq!(validate_secret("  sk-abc  ").unwrap(), "sk-abc");
        assert!(validate_secret("   ").is_err());
        assert!(validate_secret("sk-a\nb").is_err());
        assert!(validate_secret(&"x".repeat(5000)).is_err());
    }

    #[test]
    fn errors_never_contain_the_secret() {
        let secret = "sk-super-secret-value";
        let err = save("not a url", secret).unwrap_err();
        assert!(!err.0.contains(secret));
    }

    #[test]
    fn saves_loads_and_deletes_with_the_store() {
        mock_store();
        let account = "https://api.example.test/v1";
        let e = Entry::new(SERVICE, account).unwrap();
        e.set_password("sk-123").unwrap();
        assert_eq!(e.get_password().unwrap(), "sk-123");
        e.delete_credential().unwrap();
        assert!(matches!(e.get_password(), Err(KeyringError::NoEntry)));
        // The public helpers treat a missing entry as "no key", not as an error.
        assert_eq!(load("https://nothing.example.test/v1").unwrap(), None);
        assert!(delete("https://nothing.example.test/v1").is_ok());
    }
}

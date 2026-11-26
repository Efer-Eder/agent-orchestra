//! Agent Orchestra desktop shell.
//!
//! The shell hosts the web UI and exposes a small set of commands: the OS
//! credential store for API keys (`secrets`), read-only access to the
//! authorized project folder (`project_fs`) and the calls to the AI provider
//! (`provider_http`), so the key and file contents stay out of the web UI,
//! and writing approved changes inside that folder (`project_apply`).
//! No file system, shell or network plugin is enabled.
//! See `docs/threat-model.md`.

pub mod project_apply;
pub mod project_fs;
pub mod provider_http;
pub mod secrets;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    secrets::init_store();
    tauri::Builder::default()
        .manage(provider_http::ProviderState::default())
        .invoke_handler(tauri::generate_handler![
            secrets::secret_save,
            secrets::secret_delete,
            project_fs::project_check_root,
            project_fs::project_list_files,
            project_fs::project_inspect_files,
            project_apply::project_apply_changes,
            provider_http::provider_set_key,
            provider_http::provider_key_status,
            provider_http::provider_complete,
            provider_http::provider_list_models,
            provider_http::provider_cancel
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Agent Orchestra shell");
}

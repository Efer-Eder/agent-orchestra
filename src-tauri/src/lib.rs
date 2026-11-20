//! Agent Orchestra desktop shell.
//!
//! The shell hosts the web UI and exposes a small set of commands. The only
//! system resource it touches is the OS credential store, for API keys
//! (`secrets` module). No file system, shell or network plugin is enabled.
//! See `docs/threat-model.md`.

pub mod secrets;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    secrets::init_store();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            secrets::secret_save,
            secrets::secret_load,
            secrets::secret_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Agent Orchestra shell");
}

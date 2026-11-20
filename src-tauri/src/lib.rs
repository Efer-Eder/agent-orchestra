//! Agent Orchestra desktop shell.
//!
//! The shell hosts the web UI and exposes a small set of commands: the OS
//! credential store for API keys (`secrets`) and read-only access to the
//! authorized project folder (`project_fs`). No file system, shell or network
//! plugin is enabled.
//! See `docs/threat-model.md`.

pub mod project_fs;
pub mod secrets;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    secrets::init_store();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            secrets::secret_save,
            secrets::secret_load,
            secrets::secret_delete,
            project_fs::project_check_root,
            project_fs::project_list_files,
            project_fs::project_read_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Agent Orchestra shell");
}

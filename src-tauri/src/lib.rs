//! Agent Orchestra desktop shell.
//!
//! For now the shell only hosts the web UI. It exposes no custom commands and
//! enables no plugins: no file system, shell or network access is granted to
//! the frontend. See `docs/threat-model.md`.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the Agent Orchestra shell");
}

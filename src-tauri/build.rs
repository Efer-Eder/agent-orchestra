fn main() {
    // Declaring the app commands makes Tauri generate one permission per
    // command, so each must be granted explicitly in capabilities/.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "secret_save",
            "secret_delete",
            "project_check_root",
            "project_list_files",
            "project_inspect_files",
            "provider_set_key",
            "provider_key_status",
            "provider_complete",
            "provider_list_models",
            "provider_cancel",
        ]),
    ))
    .expect("failed to run tauri-build");
}

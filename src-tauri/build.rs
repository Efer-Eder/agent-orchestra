fn main() {
    // Declaring the app commands makes Tauri generate one permission per
    // command, so each must be granted explicitly in capabilities/.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["secret_save", "secret_load", "secret_delete"]),
    ))
    .expect("failed to run tauri-build");
}

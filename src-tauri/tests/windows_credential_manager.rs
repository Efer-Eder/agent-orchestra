//! Runs against the real Windows Credential Manager. Ignored by default so CI
//! and other machines are not touched; run locally with:
//! `cargo test --test windows_credential_manager -- --ignored`

#[cfg(windows)]
#[test]
#[ignore = "touches the real Windows Credential Manager"]
fn round_trip_in_windows_credential_manager() {
    use agent_orchestra_lib::secrets;

    assert!(secrets::init_store(), "Windows store should be available");
    let account = "https://agent-orchestra-selftest.invalid/v1";
    let secret = "sk-agent-orchestra-selftest";

    secrets::delete(account).unwrap();
    assert_eq!(secrets::load(account).unwrap(), None);

    secrets::save(account, secret).unwrap();
    assert_eq!(secrets::load(account).unwrap().as_deref(), Some(secret));

    secrets::delete(account).unwrap();
    assert_eq!(secrets::load(account).unwrap(), None);
}

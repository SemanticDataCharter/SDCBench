//! SDCStudio auth + projects, made from Rust so the API token never reaches the
//! webview and there's no CORS to fight. The token lives in the OS keychain (D3);
//! the frontend only ever learns "connected or not" + display info.

use keyring::Entry;

const SERVICE: &str = "com.axius-sdc.sdcbench";
const ACCOUNT: &str = "sdcstudio_api_key";

pub(crate) fn base_url() -> String {
    std::env::var("SDCSTUDIO_BASE_URL").unwrap_or_else(|_| "https://sdcstudio.axius-sdc.com".into())
}

/// A keychain entry for an arbitrary account under the SDCBench service, so other
/// modules (e.g. the BYO-LLM config) can store their own secrets.
pub(crate) fn keychain(account: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, account).map_err(|e| format!("keychain: {e}"))
}

fn entry() -> Result<Entry, String> {
    keychain(ACCOUNT)
}

pub(crate) fn stored_token() -> Option<String> {
    entry().ok().and_then(|e| e.get_password().ok())
}

pub(crate) fn get_json(path: &str, token: &str) -> Result<serde_json::Value, String> {
    let url = format!("{}{}", base_url(), path);
    match ureq::get(&url)
        .set("Authorization", &format!("Token {token}"))
        .call()
    {
        Ok(resp) => {
            let body = resp.into_string().map_err(|e| format!("read body: {e}"))?;
            serde_json::from_str(&body).map_err(|e| format!("bad JSON from {path}: {e}"))
        }
        Err(ureq::Error::Status(code, _)) => Err(format!("HTTP {code} from {path}")),
        Err(ureq::Error::Transport(t)) => Err(format!("cannot reach SDCStudio: {t}")),
    }
}

/// POST JSON; returns (status_code, body) WITHOUT erroring on non-2xx, so the
/// caller can branch on 200 / 202 / 402 (wallet) / 4xx itself.
pub(crate) fn post_json(
    path: &str,
    token: &str,
    body: &serde_json::Value,
) -> Result<(u16, serde_json::Value), String> {
    let url = format!("{}{}", base_url(), path);
    let parse = |s: String| serde_json::from_str(&s).unwrap_or(serde_json::json!({ "raw": s }));
    match ureq::post(&url)
        .set("Authorization", &format!("Token {token}"))
        .set("Content-Type", "application/json")
        .send_string(&body.to_string())
    {
        Ok(r) => {
            let code = r.status();
            Ok((code, parse(r.into_string().map_err(|e| format!("read body: {e}"))?)))
        }
        Err(ureq::Error::Status(code, r)) => Ok((code, parse(r.into_string().unwrap_or_default()))),
        Err(ureq::Error::Transport(t)) => Err(format!("cannot reach SDCStudio: {t}")),
    }
}

fn modeler_view(v: &serde_json::Value) -> serde_json::Value {
    serde_json::json!({
        "ok": true,
        "name": v.get("name"),
        "email": v.get("email"),
        "default_project_ct_id": v.get("project_ct_id"),
    })
}

/// Validate a key against `/auth/modeler/`, and only on success store it.
#[tauri::command]
pub fn sign_in(token: String) -> Result<serde_json::Value, String> {
    let v = get_json("/api/v1/auth/modeler/", &token).map_err(|e| format!("sign-in failed: {e}"))?;
    entry()?.set_password(&token).map_err(|e| format!("keychain save: {e}"))?;
    Ok(modeler_view(&v))
}

#[tauri::command]
pub fn whoami() -> Result<serde_json::Value, String> {
    let token = stored_token().ok_or("not signed in")?;
    Ok(modeler_view(&get_json("/api/v1/auth/modeler/", &token)?))
}

#[tauri::command]
pub fn auth_status() -> serde_json::Value {
    serde_json::json!({ "connected": stored_token().is_some() })
}

#[tauri::command]
pub fn sign_out() -> Result<(), String> {
    if let Ok(e) = entry() {
        let _ = e.delete_credential();
    }
    Ok(())
}

/// Owned-first project list (the API already orders + paginates, API-SURFACE).
#[tauri::command]
pub fn list_projects() -> Result<serde_json::Value, String> {
    let token = stored_token().ok_or("not signed in")?;
    let v = get_json("/api/v1/dmgen/projects/?page_size=200", &token)?;
    Ok(v.get("results").cloned().unwrap_or(v))
}

/// The user's USD wallet state (balance drives the mint-cost display). Read-only:
/// `GET /api/v1/wallet/` -> `{ balance, auto_reload_*, ... }`.
#[tauri::command]
pub fn wallet() -> Result<serde_json::Value, String> {
    let token = stored_token().ok_or("not signed in")?;
    get_json("/api/v1/wallet/", &token)
}

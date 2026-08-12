//! SDCBench Tauri shell.
//!
//! A thin desktop client for SDCStudio: sign in with an API key (kept in the OS
//! keychain, `auth.rs`), search the published component library (`library.rs`),
//! assemble a model on the canvas, and create a draft model in your project
//! (`drafts.rs`). Local draft save/load stays on the machine (D5).

mod auth;
mod drafts;
mod library;

use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
struct Health {
    ok: bool,
    app: String,
    version: String,
}

#[tauri::command]
fn health() -> Health {
    Health {
        ok: true,
        app: "SDCBench".into(),
        version: env!("CARGO_PKG_VERSION").into(),
    }
}

/// Open an SDCStudio page (relative `path`) in the system browser, using the
/// configured server base (D16) — for web signup / account-setup links (D17).
#[tauri::command]
fn open_studio(path: String) -> Result<(), String> {
    let url = format!("{}{}", crate::auth::base_url(), path);
    let prog = if cfg!(target_os = "macos") {
        "open"
    } else if cfg!(target_os = "windows") {
        "explorer"
    } else {
        "xdg-open"
    };
    std::process::Command::new(prog)
        .arg(&url)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("could not open {url}: {e}"))
}

/// Save the current model draft to the local machine (NOT SDCStudio): a JSON file
/// under a SDCBench folder in the user's Documents/home. Returns the path written.
/// Raw draft stays on the machine — nothing is sent to the server (D5).
#[tauri::command]
fn save_model(app: tauri::AppHandle, name: String, content: String) -> Result<String, String> {
    let dir = models_dir(&app)?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("could not create {}: {e}", dir.display()))?;
    let path = dir.join(format!("{}.sdcbench.json", stem_of(&name)));
    std::fs::write(&path, content).map_err(|e| format!("write failed: {e}"))?;
    Ok(path.display().to_string())
}

/// The local SDCBench models directory, created on demand. Prefer the user's
/// Documents folder (discoverable), but many Linux setups have no XDG Documents
/// dir configured — fall back to the home folder, then the app-data dir — so Save
/// always works without the user setting anything up.
fn models_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let p = app.path();
    let base = p
        .document_dir()
        .or_else(|_| p.home_dir())
        .or_else(|_| p.app_data_dir())
        .map_err(|e| format!("no writable location for drafts: {e}"))?;
    Ok(base.join("SDCBench"))
}

/// A safe filename stem from a model name (matches `save_model`).
fn stem_of(name: &str) -> String {
    let safe: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let trimmed = safe.trim_matches('_');
    if trimmed.is_empty() { "model".into() } else { trimmed.to_string() }
}

/// List saved local drafts (name + path) in the SDCBench models directory.
#[tauri::command]
fn list_models(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let dir = models_dir(&app)?;
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| format!("read dir: {e}"))? {
        let path = entry.map_err(|e| e.to_string())?.path();
        let fname = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if let Some(display) = fname.strip_suffix(".sdcbench.json") {
            out.push(serde_json::json!({ "name": display, "path": path.display().to_string() }));
        }
    }
    out.sort_by(|a, b| a["name"].as_str().cmp(&b["name"].as_str()));
    Ok(out)
}

/// Read a saved local draft by model name (constrained to the SDCBench dir).
#[tauri::command]
fn read_model(app: tauri::AppHandle, name: String) -> Result<String, String> {
    let path = models_dir(&app)?.join(format!("{}.sdcbench.json", stem_of(&name)));
    std::fs::read_to_string(&path).map_err(|e| format!("read failed: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            health,
            open_studio,
            save_model,
            list_models,
            read_model,
            auth::sign_in,
            auth::whoami,
            auth::auth_status,
            auth::sign_out,
            auth::list_projects,
            auth::wallet,
            drafts::create_model,
            library::search_components
        ])
        .run(tauri::generate_context!())
        .expect("error while running SDCBench");
}

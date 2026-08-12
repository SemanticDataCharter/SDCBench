//! SDCStudio published-component **library search** (Phase-2 FR-1, endpoint FR-0a).
//!
//! Backs the reuse-first assembly canvas: the domain expert searches the published
//! library and reuses components by `ct_id`, minting only when required. Runs from
//! Rust so the API token stays in the OS keychain and never reaches the webview
//! (same posture as `auth.rs`).

use serde_json::Value;

/// Search the published component library.
///
/// `GET /api/v1/dmgen/components/?status=published&search=<query>&page_size=25`
/// (confirmed against prod SDCStudio 4.4.0). The server queryset already scopes to
/// the user's projects + default-library projects + published-public components —
/// i.e. exactly "the library" — so a plain published search returns reusable
/// components. An empty `query` browses the library.
///
/// Returns the `results` array; each item is a `ComponentListSerializer` row:
/// `{ ct_id, label, description, type, published, public, project_name,
///   project_ct_id, created, updated }`. The `type` drives the canvas data-type
/// badge (`composition-model.json` → `canvas.node_kinds.Field.type_badges`), and
/// `ct_id` is what a reused component is wired into a Cluster by.
#[tauri::command]
pub fn search_components(query: String, project: Option<String>) -> Result<Value, String> {
    let token = crate::auth::stored_token().ok_or("not signed in")?;
    let url = format!("{}/api/v1/dmgen/components/", crate::auth::base_url());

    let mut req = ureq::get(&url)
        .set("Authorization", &format!("Token {token}"))
        .query("status", "published")
        .query("search", query.trim())
        .query("page_size", "25");
    if let Some(p) = project.as_deref().filter(|s| !s.is_empty()) {
        req = req.query("project", p);
    }

    match req.call() {
        Ok(resp) => {
            let body = resp.into_string().map_err(|e| format!("read body: {e}"))?;
            let v: Value = serde_json::from_str(&body)
                .map_err(|e| format!("bad JSON from /dmgen/components/: {e}"))?;
            // Paginated {count,next,previous,results}; hand the frontend the rows.
            Ok(v.get("results").cloned().unwrap_or(v))
        }
        Err(ureq::Error::Status(code, _)) => Err(format!("search failed (HTTP {code})")),
        Err(ureq::Error::Transport(t)) => Err(format!("cannot reach SDCStudio: {t}")),
    }
}

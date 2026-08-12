//! Create a **draft** data model bottom-up via the plain per-type CRUD endpoints:
//! leaf `Xd*` drafts -> a draft **Cluster** (preserving the user's grouping) -> a
//! draft **DM** with user-entered Dublin Core metadata. Everything stays
//! `published=False`; no publish. Finalizing (constraints, units, reference ranges,
//! structural slots) and publishing happen in SDCStudio.
//!
//! Wiring (confirmed against SDCStudio src/dmgen): there is no XdAdapter object to
//! create (`adapter_ctid` is auto-generated); a Cluster references its children by
//! `ct_id` in per-type write-only fields (`xdstring`, `xdquantity`, ...); a DM
//! takes `data: <cluster_ct_id>` plus writable DC fields.

use std::collections::BTreeMap;

use serde::Deserialize;

/// Dublin Core metadata the user enters for the DM (this version). All optional
/// except `title` (required + unique server-side). Empty fields are omitted so
/// SDCStudio's defaults (rights=CC-BY, coverage=Universal, language=en-US) apply.
#[derive(Deserialize, Default)]
pub struct DmMeta {
    #[serde(default)]
    title: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    subject: String,
    #[serde(default)]
    publisher: String,
    #[serde(default)]
    source: String,
    #[serde(default)]
    rights: String,
    #[serde(default)]
    language: String,
}

/// rm_type -> (leaf CRUD collection [hyphenated REST path], Cluster per-type field
/// [serializer field name, ct_id slug]). The 11 scalar leaf types the bench
/// creates; `Xd*List` (no REST endpoint) and XdInterval (a ReferenceRange building
/// block, not a Cluster member) are excluded.
fn endpoints_for(rm_type: &str) -> Option<(&'static str, &'static str)> {
    Some(match rm_type {
        "XdStringType" => ("xd-strings", "xdstring"),
        "XdBooleanType" => ("xd-booleans", "xdboolean"),
        "XdTokenType" => ("xd-tokens", "xdtoken"),
        "XdLinkType" => ("xd-links", "xdlink"),
        "XdFileType" => ("xd-files", "xdfile"),
        "XdCountType" => ("xd-counts", "xdcount"),
        "XdQuantityType" => ("xd-quantities", "xdquantity"),
        "XdFloatType" => ("xd-floats", "xdfloat"),
        "XdDoubleType" => ("xd-doubles", "xddouble"),
        "XdOrdinalType" => ("xd-ordinals", "xdordinal"),
        "XdTemporalType" => ("xd-temporals", "xdtemporal"),
        _ => return None,
    })
}

fn created_ct_id(data: &serde_json::Value) -> Option<String> {
    data.get("ct_id").and_then(|v| v.as_str()).map(String::from)
}

// ---------------------------------------------------------------------------
// Nested create — from the assembly canvas (Phase-2 2a).
//
// The canvas is a document tree: a root Group (-> the DM's root Cluster) holding
// new/reused Fields and nested sub-Groups. We build it bottom-up: mint or reuse
// leaves, recurse to build sub-Clusters, wire each Cluster's children by ct_id
// (leaves in their per-type M2M field, sub-Clusters + reused whole-Clusters in
// `clusters`), then root a draft DM on the top Cluster. Everything published=False.
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub struct FieldNode {
    label: String,
    #[serde(default)]
    rm_type: String, // new leaf: e.g. "XdQuantityType"
    #[serde(default)]
    description: String,
    /// Reused published leaf: its ct_id + the Cluster M2M field to wire it into
    /// (== the SDCStudio api `type`, e.g. "xdquantity").
    #[serde(default)]
    reuse_ct_id: String,
    #[serde(default)]
    cluster_field: String,
    /// New quantified leaf (XdQuantity/Float/Double/Count): the ct_id of the Units
    /// to reference. Required by the RM for these types.
    #[serde(default)]
    units_ct_id: String,
    /// New XdOrdered leaf: ct_ids of reused ReferenceRanges (M2M, optional at draft).
    #[serde(default)]
    reference_ranges: Vec<String>,
}

#[derive(Deserialize)]
pub struct GroupNode {
    #[serde(default)]
    label: String,
    /// Plain-language requirement for a new group (FR-13); empty for reused.
    #[serde(default)]
    description: String,
    /// Reused published Cluster (opaque): wire by ct_id, don't recurse.
    #[serde(default)]
    reuse_ct_id: String,
    #[serde(default)]
    fields: Vec<FieldNode>,
    #[serde(default)]
    groups: Vec<GroupNode>,
}

#[derive(Deserialize)]
pub struct ModelRequest {
    project_ct_id: String,
    root: GroupNode,
    #[serde(default)]
    dm: DmMeta,
}

/// Build a draft Cluster for `g` (recursing into sub-groups). Returns its
/// `(ct_id, numeric id)` on success. Appends per-child rows to `created`/`errors`.
fn build_cluster(
    g: &GroupNode,
    project: &str,
    token: &str,
    created: &mut Vec<serde_json::Value>,
    errors: &mut Vec<serde_json::Value>,
) -> Option<(String, serde_json::Value)> {
    // Child ct_ids bucketed by the Cluster field that holds them.
    let mut buckets: BTreeMap<String, Vec<String>> = BTreeMap::new();

    // 1) Fields — reuse by ct_id, or mint a new leaf draft.
    for f in &g.fields {
        if !f.reuse_ct_id.trim().is_empty() {
            let field = if !f.cluster_field.trim().is_empty() {
                f.cluster_field.trim().to_string()
            } else {
                endpoints_for(&f.rm_type).map(|(_, cf)| cf.to_string()).unwrap_or_default()
            };
            if field.is_empty() {
                errors.push(serde_json::json!({ "label": f.label, "error": "reused field: unknown component type" }));
                continue;
            }
            buckets.entry(field).or_default().push(f.reuse_ct_id.trim().to_string());
            created.push(serde_json::json!({ "label": f.label, "ct_id": f.reuse_ct_id.trim(), "reused": true }));
            continue;
        }
        let Some((collection, cluster_field)) = endpoints_for(&f.rm_type) else {
            errors.push(serde_json::json!({
                "label": f.label,
                "error": format!("{} is created in SDCStudio, not the bench", f.rm_type),
            }));
            continue;
        };
        let mut body = serde_json::Map::new();
        body.insert("project".into(), serde_json::Value::String(project.to_string()));
        body.insert("label".into(), serde_json::Value::String(f.label.clone()));
        body.insert("description".into(), serde_json::Value::String(f.description.clone()));
        body.insert("public".into(), serde_json::Value::Bool(false));
        if f.rm_type == "XdTemporalType" {
            body.insert("allow_date".into(), serde_json::Value::Bool(true));
            body.insert("allow_datetime".into(), serde_json::Value::Bool(true));
        }
        // Quantified leaves require a Units (null=False in SDCStudio); wire the
        // reused Units by ct_id. The frontend blocks create if it's missing.
        if !f.units_ct_id.trim().is_empty() {
            body.insert("units".into(), serde_json::Value::String(f.units_ct_id.trim().into()));
        }
        // XdOrdered leaves may carry reused ReferenceRanges (M2M, optional at draft).
        let rrs: Vec<&str> = f.reference_ranges.iter().map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
        if !rrs.is_empty() {
            body.insert("reference_ranges".into(), serde_json::json!(rrs));
        }
        match crate::auth::post_json(&format!("/api/v1/dmgen/{collection}/"), token, &serde_json::Value::Object(body)) {
            Ok((200 | 201, data)) => match created_ct_id(&data) {
                Some(ct) => {
                    buckets.entry(cluster_field.to_string()).or_default().push(ct.clone());
                    created.push(serde_json::json!({ "label": f.label, "rm_type": f.rm_type, "ct_id": ct }));
                }
                None => errors.push(serde_json::json!({ "label": f.label, "error": "created but no ct_id returned" })),
            },
            Ok((code, data)) => errors.push(serde_json::json!({ "label": f.label, "error": format!("HTTP {code}: {data}") })),
            Err(e) => errors.push(serde_json::json!({ "label": f.label, "error": e })),
        }
    }

    // 2) Sub-groups — reuse an opaque published Cluster, or recurse to build one.
    let mut child_clusters: Vec<String> = Vec::new();
    for sub in &g.groups {
        if !sub.reuse_ct_id.trim().is_empty() {
            child_clusters.push(sub.reuse_ct_id.trim().to_string());
            created.push(serde_json::json!({ "label": sub.label, "ct_id": sub.reuse_ct_id.trim(), "reused": true }));
        } else if let Some((ct, _)) = build_cluster(sub, project, token, created, errors) {
            child_clusters.push(ct);
        }
    }
    if !child_clusters.is_empty() {
        buckets.insert("clusters".into(), child_clusters);
    }

    // 3) Create this Cluster, wiring all children in by ct_id.
    let mut cluster_body = serde_json::Map::new();
    cluster_body.insert("project".into(), serde_json::Value::String(project.to_string()));
    cluster_body.insert(
        "label".into(),
        serde_json::Value::String(if g.label.trim().is_empty() { "data".into() } else { g.label.trim().into() }),
    );
    if !g.description.trim().is_empty() {
        cluster_body.insert("description".into(), serde_json::Value::String(g.description.trim().into()));
    }
    cluster_body.insert("public".into(), serde_json::Value::Bool(false));
    for (field, cts) in &buckets {
        cluster_body.insert(field.clone(), serde_json::json!(cts));
    }
    match crate::auth::post_json("/api/v1/dmgen/clusters/", token, &serde_json::Value::Object(cluster_body)) {
        Ok((200 | 201, data)) => match (created_ct_id(&data), data.get("id").cloned()) {
            (Some(ct), Some(id)) => Some((ct, id)),
            _ => {
                errors.push(serde_json::json!({ "label": format!("group '{}'", g.label), "error": "cluster created but missing ct_id/id" }));
                None
            }
        },
        Ok((code, data)) => {
            errors.push(serde_json::json!({ "label": format!("group '{}'", g.label), "error": format!("HTTP {code}: {data}") }));
            None
        }
        Err(e) => {
            errors.push(serde_json::json!({ "label": format!("group '{}'", g.label), "error": e }));
            None
        }
    }
}

#[tauri::command]
pub fn create_model(payload: ModelRequest) -> Result<serde_json::Value, String> {
    let ModelRequest { project_ct_id, root, dm } = payload;
    let token = crate::auth::stored_token().ok_or("not signed in")?;
    if project_ct_id.is_empty() {
        return Err("pick a project first".into());
    }
    if dm.title.trim().is_empty() {
        return Err("enter a model title".into());
    }

    let mut created = Vec::new();
    let mut errors = Vec::new();

    // Wallet 402 signal: any error that came back as insufficient funds so the UI
    // can offer a "fund your wallet" action (per-operation billing, HTTP 402).
    fn insufficient_funds(errors: &[serde_json::Value]) -> bool {
        errors.iter().any(|e| {
            e.get("error").and_then(|s| s.as_str()).is_some_and(|s| {
                s.contains("402") || s.to_lowercase().contains("insufficient")
            })
        })
    }

    // Build the root Cluster (and everything under it).
    let root_pk = match build_cluster(&root, &project_ct_id, &token, &mut created, &mut errors) {
        Some((_ct, id)) => id,
        None => {
            return Ok(serde_json::json!({
                "components": created, "errors": errors,
                "created_count": created.len(), "error_count": errors.len(),
                "insufficient_funds": insufficient_funds(&errors),
            }));
        }
    };

    // Root a draft DM on the root Cluster, with the Dublin Core metadata.
    let mut dm_ct = None;
    let mut dm_body = serde_json::Map::new();
    dm_body.insert("project".into(), serde_json::Value::String(project_ct_id.clone()));
    dm_body.insert("title".into(), serde_json::Value::String(dm.title.trim().into()));
    dm_body.insert("data".into(), root_pk);
    let mut put = |k: &str, v: &str| {
        if !v.trim().is_empty() {
            dm_body.insert(k.into(), serde_json::Value::String(v.trim().into()));
        }
    };
    put("description", &dm.description);
    put("dc_subject", &dm.subject);
    put("publisher", &dm.publisher);
    put("source", &dm.source);
    put("rights", &dm.rights);
    put("language", &dm.language);

    match crate::auth::post_json("/api/v1/dmgen/dms/", &token, &serde_json::Value::Object(dm_body)) {
        Ok((200 | 201, data)) => dm_ct = created_ct_id(&data),
        Ok((code, data)) => errors.push(serde_json::json!({ "label": "(model)", "error": format!("HTTP {code}: {data}") })),
        Err(e) => errors.push(serde_json::json!({ "label": "(model)", "error": e })),
    }

    Ok(serde_json::json!({
        "components": created,
        "dm_ct_id": dm_ct,
        "errors": errors,
        "created_count": created.len(),
        "error_count": errors.len(),
        "insufficient_funds": insufficient_funds(&errors),
    }))
}

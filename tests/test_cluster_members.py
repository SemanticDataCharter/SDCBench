"""The reuse flyout must only ever offer components that can legally sit in a
Cluster — Xd* leaves (descendants of XdAnyType) and sub-Clusters, never structural
types like Party/Audit/Participation. `cluster_member_api_types` drives that
filter, so it must mirror SDCStudio's Cluster M2M fields exactly (with the api
`cluster` standing in for the `clusters` field).
"""
import pytest


def test_no_structural_or_interval_members(model):
    members = set(model["canvas"]["cluster_member_api_types"])
    # XdInterval is a leaf but NOT a Cluster member (ReferenceRange building block).
    assert "interval" not in members
    # Structural types never appear (their api `type`s are party/audit/... which
    # are simply absent from the set).
    for forbidden in ("party", "participation", "audit", "attestation", "referencerange", "units"):
        assert forbidden not in members


def test_matches_sdcstudio_cluster_fields(model, sdcstudio_cluster_member_fields):
    if sdcstudio_cluster_member_fields is None:
        pytest.skip("SDCStudio repo not present (set SDCSTUDIO_DIR to enable)")
    members = set(model["canvas"]["cluster_member_api_types"])
    # Map the api vocabulary to the Cluster's field names: `cluster` -> `clusters`.
    as_fields = {"clusters" if m == "cluster" else m for m in members}
    assert as_fields == sdcstudio_cluster_member_fields, (
        "cluster_member_api_types drift vs SDCStudio Cluster M2M fields:\n"
        f"  only in canon:     {sorted(as_fields - sdcstudio_cluster_member_fields)}\n"
        f"  only in SDCStudio: {sorted(sdcstudio_cluster_member_fields - as_fields)}"
    )

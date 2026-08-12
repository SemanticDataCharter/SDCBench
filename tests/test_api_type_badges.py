"""api_type_badges lets the reuse-assembly canvas badge SDCStudio search results
straight from each row's `type` field. Two things must hold: every key is a real
SDCStudio component-list `type` (no drift), and every canvas Field leaf is
reachable through it (no result would fall back to a raw `xdstring` string).
"""
import pytest


def test_keys_are_real_sdcstudio_type_values(model, sdcstudio_component_type_keys):
    if sdcstudio_component_type_keys is None:
        pytest.skip("SDCStudio repo not present (set SDCSTUDIO_DIR to enable)")
    badges = model["canvas"]["api_type_badges"]
    unknown = sorted(set(badges) - sdcstudio_component_type_keys)
    assert not unknown, (
        "api_type_badges keys not in SDCStudio _COMPONENT_TYPE_TABLE (drift):\n  "
        + "\n  ".join(unknown))


def test_every_field_leaf_has_an_api_badge(model):
    """Each leaf the canvas can place must map from its API `type` key, so no
    reused Field renders a raw lowercase type. Derivation mirrors the generator:
    strip 'Type', lowercase, with XdInterval the lone exception."""
    badges = model["canvas"]["api_type_badges"]
    exceptions = {"XdIntervalType": "interval"}
    missing = []
    for rm in model["canvas"]["node_kinds"]["Field"]["rm_types"]:
        key = exceptions.get(rm, rm[:-4].lower())
        if key not in badges:
            missing.append(f"{rm} -> {key}")
    assert not missing, "Field leaves with no api_type_badge:\n  " + "\n  ".join(missing)


def test_cluster_badges_as_group(model):
    assert model["canvas"]["api_type_badges"].get("cluster") == "Group"

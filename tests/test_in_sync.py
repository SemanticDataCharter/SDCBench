"""The committed canon/composition-model.json must equal fresh generator output,
so the artifact can never silently drift from the schema + policy."""


def test_committed_matches_generated(model, committed):
    assert committed == model, (
        "canon/composition-model.json is stale — regenerate with "
        "`python tools/generate_composition.py`"
    )

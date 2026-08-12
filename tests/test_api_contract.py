"""The correctness test: every field a question binds_to must be a real
SDCStudio dmgen model field, so the bench emits valid API payloads.

Cross-repo. Skips gracefully when SDCStudio isn't checked out next door.
"""
import pytest


def test_every_binds_to_is_a_real_sdcstudio_field(model, sdcstudio_model_fields):
    if sdcstudio_model_fields is None:
        pytest.skip("SDCStudio repo not present (set SDCSTUDIO_DIR to enable)")

    unknown = []
    for group_id, questions in model["question_groups"].items():
        for q in questions:
            for field in q.get("binds_to", []):
                if "*" in field:
                    continue  # wildcard shorthand, not a literal field
                if field not in sdcstudio_model_fields:
                    unknown.append(f"{group_id}/{q['id']} -> {field}")

    assert not unknown, "binds_to fields not found on any dmgen model:\n  " + \
        "\n  ".join(unknown)

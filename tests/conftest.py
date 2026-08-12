"""Fixtures for the composition-model test suite.

The `model` fixture runs the REAL generator into a temp file and loads it, so the
suite tests the generator (the thing we change), not a stale committed artifact.
"""
import json
import os
import subprocess
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GENERATOR = os.path.join(ROOT, "tools", "generate_composition.py")
COMMITTED_JSON = os.path.join(ROOT, "canon", "composition-model.json")
SDCSTUDIO_DIR = os.environ.get("SDCSTUDIO_DIR", "/home/twcook/GitHub/SDCStudio")


@pytest.fixture(scope="session")
def model(tmp_path_factory):
    """Freshly generated composition-model.json, as a dict."""
    out = tmp_path_factory.mktemp("composition") / "composition-model.json"
    subprocess.run([sys.executable, GENERATOR, "--out", str(out)],
                   check=True, cwd=ROOT)
    with open(out, encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="session")
def committed():
    """The committed canon/composition-model.json, as a dict."""
    with open(COMMITTED_JSON, encoding="utf-8") as fh:
        return json.load(fh)


@pytest.fixture(scope="session")
def sdcstudio_model_fields():
    """All dmgen model field names defined in SDCStudio, or None if the repo
    isn't present. Used by the cross-repo API-contract test."""
    models_py = os.path.join(SDCSTUDIO_DIR, "src", "dmgen", "models.py")
    if not os.path.exists(models_py):
        return None
    import re
    fields = set()
    pat = re.compile(r"^\s+(\w+)\s*=\s*models\.")
    with open(models_py, encoding="utf-8") as fh:
        for line in fh:
            m = pat.match(line)
            if m:
                fields.add(m.group(1))
    return fields


@pytest.fixture(scope="session")
def sdcstudio_component_type_keys():
    """The lowercase `type` keys SDCStudio's component-list API emits — parsed from
    `_COMPONENT_TYPE_TABLE` in dmgen/viewsets.py — or None if the repo isn't
    present. Guards the canvas's api_type_badges against API-vocabulary drift."""
    viewsets_py = os.path.join(SDCSTUDIO_DIR, "src", "dmgen", "viewsets.py")
    if not os.path.exists(viewsets_py):
        return None
    import re
    with open(viewsets_py, encoding="utf-8") as fh:
        src = fh.read()
    block = re.search(r"_COMPONENT_TYPE_TABLE\s*=\s*\{(.*?)\}", src, re.S)
    if not block:
        return None
    return set(re.findall(r"'([a-z]+)'\s*:", block.group(1)))


@pytest.fixture(scope="session")
def sdcstudio_cluster_member_fields():
    """The M2M member fields on SDCStudio's Cluster model — the authoritative set
    of what may sit in a Cluster — or None if the repo isn't present. Guards the
    canvas's cluster_member_api_types (which must never offer a non-member)."""
    models_py = os.path.join(SDCSTUDIO_DIR, "src", "dmgen", "models.py")
    if not os.path.exists(models_py):
        return None
    import re
    with open(models_py, encoding="utf-8") as fh:
        src = fh.read()
    i = src.find("class Cluster(")
    j = src.find("\nclass ", i + 10)
    seg = src[i:j]
    return set(re.findall(r"^\s+(\w+)\s*=\s*models\.ManyToManyField", seg, re.M))

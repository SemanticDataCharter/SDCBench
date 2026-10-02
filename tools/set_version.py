#!/usr/bin/env python3
"""
One version, written everywhere it has to appear.

    python3 tools/set_version.py --check          exit 1 if any file disagrees with VERSION
    python3 tools/set_version.py 4.0.0-beta.3     write VERSION and every derived place

VERSION holds the semver form (4.0.0-beta.3). Two files show it in the short
"4.0.0b3" form that fits a window title. The six derived places are the ones the
README used to ask a human to edit by hand, which is how a tag and a window title
came to disagree.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "VERSION"
SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-(alpha|beta|rc)\.(\d+))?$")


def short(v):
    """4.0.0-beta.2 -> 4.0.0b2, 4.0.0-rc.1 -> 4.0.0rc1, 4.0.0 -> 4.0.0."""
    m = SEMVER.match(v)
    if not m:
        raise SystemExit(f"not a version this project uses: {v!r}")
    if not m.group(1):
        return v
    tag = {"alpha": "a", "beta": "b", "rc": "rc"}[m.group(1)]
    return v.split("-")[0] + tag + m.group(2)


# (path, regex with one group for the value, replacement builder)
PLACES = [
    ("app/package.json", r'("version":\s*")([^"]+)(")', lambda v: v),
    ("app/src-tauri/tauri.conf.json", r'("version":\s*")([^"]+)(")', lambda v: v),
    ("app/src-tauri/tauri.conf.json", r'("title":\s*"SDCBench )([^"]+)(")', short),
    ("app/src-tauri/Cargo.toml", r'(^version = ")([^"]+)(")', lambda v: v),
    ("app/src-tauri/Cargo.lock", r'(name = "sdcbench"\nversion = ")([^"]+)(")', lambda v: v),
    ("app/src/main.js", r"(const VERSION = ')([^']+)(')", short),
    ("app/src/canvas.js", r"(version: ')([^']+)(')", short),
]


def read_places():
    out = []
    for rel, rx, want in PLACES:
        text = (ROOT / rel).read_text(encoding="utf-8")
        m = re.search(rx, text, re.M)
        if not m:
            raise SystemExit(f"{rel}: pattern not found: {rx}")
        out.append((rel, rx, want, text, m))
    return out


def check(v):
    bad = []
    for rel, rx, want, text, m in read_places():
        expected = want(v)
        if m.group(2) != expected:
            bad.append(f"{rel}: has {m.group(2)!r}, VERSION says {expected!r}")
    # package-lock carries the app version too
    lock = json.loads((ROOT / "app/package-lock.json").read_text(encoding="utf-8"))
    for k in ("version",):
        if lock.get(k) != v:
            bad.append(f"app/package-lock.json: has {lock.get(k)!r}, VERSION says {v!r}")
    pkg = lock.get("packages", {}).get("", {})
    if pkg.get("version") != v:
        bad.append(f"app/package-lock.json packages['']: has {pkg.get('version')!r}, VERSION says {v!r}")
    if bad:
        print("\n".join(bad))
        sys.exit(1)
    print(f"all version markers agree: {v} ({short(v)})")


def write(v):
    if not SEMVER.match(v):
        raise SystemExit(f"not a version this project uses: {v!r}")
    VERSION_FILE.write_text(v + "\n", encoding="utf-8")
    for rel, rx, want, text, m in read_places():
        new = re.sub(rx, lambda mm: mm.group(1) + want(v) + mm.group(3), text, count=1, flags=re.M)
        (ROOT / rel).write_text(new, encoding="utf-8")
    lockp = ROOT / "app/package-lock.json"
    lock = lockp.read_text(encoding="utf-8")
    lock = re.sub(r'("name": "sdcbench-app",\s*"version": ")([^"]+)(")', lambda mm: mm.group(1) + v + mm.group(3), lock)
    lockp.write_text(lock, encoding="utf-8")
    print(f"wrote {v} ({short(v)}) to VERSION and {len(PLACES) + 1} places")
    check(v)


if __name__ == "__main__":
    args = sys.argv[1:]
    current = VERSION_FILE.read_text(encoding="utf-8").strip()
    if args == ["--check"] or not args:
        check(current)
    elif len(args) == 1:
        write(args[0])
    else:
        raise SystemExit(__doc__)

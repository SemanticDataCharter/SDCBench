#!/usr/bin/env bash
# Post-build step: copy the freshly-bundled AppImage to the repo's top-level
# dist/ (the shippable-artifact location). Run
# automatically by `npm run dist` after `tauri build`. Runs from app/ (npm cwd),
# so paths are relative to app/. dist/ is gitignored.
set -euo pipefail

SRC_DIR="src-tauri/target/release/bundle/appimage"
DEST="../dist"

shopt -s nullglob
imgs=("$SRC_DIR"/*.AppImage)
if [ ${#imgs[@]} -eq 0 ]; then
  echo "copy-appimage: no .AppImage found in $SRC_DIR (did tauri build run?)" >&2
  exit 1
fi

mkdir -p "$DEST"
for f in "${imgs[@]}"; do
  # --remove-destination unlinks an existing (possibly-running) AppImage first,
  # so a rebuild-while-the-old-one-is-open still succeeds (avoids ETXTBSY).
  cp -p --remove-destination "$f" "$DEST/"
  echo "copy-appimage: -> $(cd "$DEST" && pwd)/$(basename "$f")"
done

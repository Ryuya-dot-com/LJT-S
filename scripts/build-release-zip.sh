#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(grep -E "const APP_VERSION = " "$ROOT_DIR/js/app.js" | sed -E "s/.*'([^']+)'.*/\1/")"
DIST_DIR="$ROOT_DIR/dist"
BUILD_DIR="$DIST_DIR/$VERSION"
ZIP_PATH="$DIST_DIR/$VERSION.zip"

rm -rf "$BUILD_DIR" "$ZIP_PATH"
mkdir -p "$BUILD_DIR"

copy_file() {
  local src="$1"
  local dest="$BUILD_DIR/$src"
  mkdir -p "$(dirname "$dest")"
  cp "$ROOT_DIR/$src" "$dest"
}

copy_file "index.html"
copy_file "participant.html"
copy_file "README.md"
copy_file "assets/styles.css"
copy_file "data/items.js"
copy_file "data/conversion.js"
copy_file "data/submission.js"
copy_file "js/app.js"
copy_file "docs/researcher-guide.md"
copy_file "docs/offline-zip-ja.md"
copy_file "docs/offline-zip-en.md"

find "$ROOT_DIR/audio" -type f -name '*.m4a' -print0 |
  while IFS= read -r -d '' audio_file; do
    rel="${audio_file#$ROOT_DIR/}"
    copy_file "$rel"
  done

(cd "$DIST_DIR" && zip -qr "$(basename "$ZIP_PATH")" "$(basename "$BUILD_DIR")")
echo "$ZIP_PATH"

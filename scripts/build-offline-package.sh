#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OFFLINE_RELEASE_DATE="${OFFLINE_RELEASE_DATE:-20260710}"
PACKAGE_NAME="${PACKAGE_NAME:-LJT-S-offline-${OFFLINE_RELEASE_DATE}}"
DIST_DIR="$ROOT_DIR/dist"
PACKAGE_DIR="$DIST_DIR/$PACKAGE_NAME"
ZIP_PATH="$DIST_DIR/$PACKAGE_NAME.zip"
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ljts-offline-build.XXXXXX")"
STAGED_PACKAGE="$STAGING_DIR/$PACKAGE_NAME"
STAGED_ZIP="$STAGING_DIR/$PACKAGE_NAME.zip"
MANIFEST_PATH="$STAGING_DIR/audio-manifest.txt"

cleanup() {
  rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

fail() {
  echo "Offline build failed: $*" >&2
  exit 1
}

append_file() {
  local source_path="$1"
  while IFS= read -r line || [[ -n "$line" ]]; do
    printf '%s\n' "$line"
  done < "$source_path"
}

for required_file in \
  "assets/styles.css" \
  "data/items.js" \
  "data/conversion.js" \
  "js/app.js" \
  "offline/README_FIRST-ja.md" \
  "offline/README_FIRST-en.md"; do
  [[ -s "$ROOT_DIR/$required_file" ]] || fail "missing or empty source file: $required_file"
done

if grep -Eiq '</style[[:space:]]*>' "$ROOT_DIR/assets/styles.css"; then
  fail "assets/styles.css contains a closing style tag and cannot be inlined safely"
fi

for javascript_file in "data/items.js" "data/conversion.js" "js/app.js"; do
  if grep -Eiq '</script[[:space:]]*>' "$ROOT_DIR/$javascript_file"; then
    fail "$javascript_file contains a closing script tag and cannot be inlined safely"
  fi
done

sed -nE 's/.*"audio_path"[[:space:]]*:[[:space:]]*"(audio\/[^\"]+\.m4a)".*/\1/p' \
  "$ROOT_DIR/data/items.js" | LC_ALL=C sort -u > "$MANIFEST_PATH"

audio_count="$(wc -l < "$MANIFEST_PATH" | tr -d '[:space:]')"
[[ "$audio_count" == "44" ]] || fail "data/items.js references $audio_count unique M4A files; expected 44"

mkdir -p "$STAGED_PACKAGE"

{
  printf '%s\n' '<!doctype html>'
  printf '%s\n' '<html lang="en">'
  printf '%s\n' '<head>'
  printf '%s\n' '  <meta charset="utf-8">'
  printf '%s\n' '  <meta name="viewport" content="width=device-width, initial-scale=1">'
  printf '%s\n' '  <title>LJT-S Offline</title>'
  printf '%s\n' '  <link rel="icon" href="data:,">'
  printf '%s\n' '  <!-- BEGIN inline: assets/styles.css -->'
  printf '%s\n' '  <style data-inline-source="assets/styles.css">'
  append_file "$ROOT_DIR/assets/styles.css"
  printf '%s\n' '  </style>'
  printf '%s\n' '  <!-- END inline: assets/styles.css -->'
  printf '%s\n' '</head>'
  printf '%s\n' '<body>'
  printf '%s\n' '  <main id="app" class="app-shell" aria-live="polite"></main>'
  printf '%s\n' '  <!-- BEGIN inline: data/items.js -->'
  printf '%s\n' '  <script data-inline-source="data/items.js">'
  append_file "$ROOT_DIR/data/items.js"
  printf '%s\n' '  </script>'
  printf '%s\n' '  <!-- END inline: data/items.js -->'
  printf '%s\n' '  <!-- BEGIN inline: data/conversion.js -->'
  printf '%s\n' '  <script data-inline-source="data/conversion.js">'
  append_file "$ROOT_DIR/data/conversion.js"
  printf '%s\n' '  </script>'
  printf '%s\n' '  <!-- END inline: data/conversion.js -->'
  printf '%s\n' '  <!-- BEGIN inline: offline-submission -->'
  printf '%s\n' '  <script data-inline-source="offline-submission">'
  printf '%s\n' 'window.LJT_SHORT_SUBMISSION = Object.freeze({'
  printf '%s\n' '  enabled: false,'
  printf '%s\n' "  endpoint: '',"
  printf '%s\n' "  publicResearchCode: 'offline',"
  printf '%s\n' '  maxRetries: 1'
  printf '%s\n' '});'
  printf '%s\n' ''
  printf '%s\n' '// Open START_HERE.html directly in participant mode unless a researcher query was supplied.'
  printf '%s\n' 'try {'
  printf '%s\n' '  const offlineUrl = new URL(window.location.href);'
  printf '%s\n' "  if (!offlineUrl.searchParams.has('take') && !offlineUrl.searchParams.has('research')) {"
  printf '%s\n' "    offlineUrl.searchParams.set('take', '1');"
  printf '%s\n' "    offlineUrl.searchParams.set('submit', '0');"
  printf '%s\n' "    window.history.replaceState(null, '', offlineUrl.toString());"
  printf '%s\n' '  }'
  printf '%s\n' '} catch (error) {'
  printf '%s\n' '  // The disabled submission configuration remains authoritative if History API access is restricted.'
  printf '%s\n' '}'
  printf '%s\n' '  </script>'
  printf '%s\n' '  <!-- END inline: offline-submission -->'
  printf '%s\n' '  <!-- BEGIN inline: js/app.js -->'
  printf '%s\n' '  <script data-inline-source="js/app.js">'
  append_file "$ROOT_DIR/js/app.js"
  printf '%s\n' '  </script>'
  printf '%s\n' '  <!-- END inline: js/app.js -->'
  printf '%s\n' '</body>'
  printf '%s\n' '</html>'
} > "$STAGED_PACKAGE/START_HERE.html"

cp "$ROOT_DIR/offline/README_FIRST-ja.md" "$STAGED_PACKAGE/README_FIRST-ja.md"
cp "$ROOT_DIR/offline/README_FIRST-en.md" "$STAGED_PACKAGE/README_FIRST-en.md"

while IFS= read -r relative_audio_path; do
  [[ -n "$relative_audio_path" ]] || continue
  source_audio_path="$ROOT_DIR/$relative_audio_path"
  [[ -s "$source_audio_path" ]] || fail "referenced audio is missing or empty: $relative_audio_path"
  mkdir -p "$(dirname "$STAGED_PACKAGE/$relative_audio_path")"
  cp "$source_audio_path" "$STAGED_PACKAGE/$relative_audio_path"
done < "$MANIFEST_PATH"

"$ROOT_DIR/scripts/verify-offline-package.sh" "$STAGED_PACKAGE"

(cd "$STAGING_DIR" && zip -qr "$STAGED_ZIP" "$PACKAGE_NAME")

"$ROOT_DIR/scripts/verify-offline-package.sh" "$STAGED_PACKAGE" "$STAGED_ZIP"

mkdir -p "$DIST_DIR"
rm -rf "$PACKAGE_DIR"
rm -f "$ZIP_PATH"
mv "$STAGED_PACKAGE" "$PACKAGE_DIR"
mv "$STAGED_ZIP" "$ZIP_PATH"

"$ROOT_DIR/scripts/verify-offline-package.sh" "$PACKAGE_DIR" "$ZIP_PATH"

echo "Offline package created:"
echo "  $PACKAGE_DIR"
echo "  $ZIP_PATH"

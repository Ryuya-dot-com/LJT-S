#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_PACKAGE_NAME="LJT-S-offline-${OFFLINE_RELEASE_DATE:-20260710}"
PACKAGE_DIR="${1:-$ROOT_DIR/dist/$DEFAULT_PACKAGE_NAME}"
ZIP_PATH="${2:-}"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ljts-offline-verify.XXXXXX")"
EXPECTED_AUDIO="$TEMP_DIR/expected-audio.txt"

cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

fail() {
  echo "Offline package verification failed: $*" >&2
  exit 1
}

sed -nE 's/.*"audio_path"[[:space:]]*:[[:space:]]*"(audio\/[^\"]+\.m4a)".*/\1/p' \
  "$ROOT_DIR/data/items.js" | LC_ALL=C sort -u > "$EXPECTED_AUDIO"

expected_count="$(wc -l < "$EXPECTED_AUDIO" | tr -d '[:space:]')"
[[ "$expected_count" == "44" ]] || fail "source item data references $expected_count unique M4A files; expected 44"

verify_tree() {
  local tree_root="$1"
  local label="$2"
  local html_path="$tree_root/START_HERE.html"
  local actual_audio="$TEMP_DIR/actual-audio-$label.txt"
  local actual_files="$TEMP_DIR/actual-files-$label.txt"
  local expected_files="$TEMP_DIR/expected-files-$label.txt"
  local non_m4a="$TEMP_DIR/non-m4a-$label.txt"
  local zero_m4a="$TEMP_DIR/zero-m4a-$label.txt"

  verify_inline_source() {
    local source_relative_path="$1"
    local opening_tag="$2"
    local closing_tag="$3"
    local extracted_path="$TEMP_DIR/extracted-$label-$(basename "$source_relative_path")"

    awk -v opening="$opening_tag" -v closing="$closing_tag" '
      $0 == opening { copying = 1; next }
      copying && $0 == closing { exit }
      copying { print }
    ' "$html_path" > "$extracted_path"

    diff -u "$ROOT_DIR/$source_relative_path" "$extracted_path" >/dev/null \
      || fail "$label inline copy differs from current source: $source_relative_path"
  }

  [[ -d "$tree_root" ]] || fail "$label directory does not exist: $tree_root"
  [[ -s "$html_path" ]] || fail "$label START_HERE.html is missing or empty"
  [[ -s "$tree_root/README_FIRST-ja.md" ]] || fail "$label README_FIRST-ja.md is missing or empty"
  [[ -s "$tree_root/README_FIRST-en.md" ]] || fail "$label README_FIRST-en.md is missing or empty"

  find "$tree_root/audio" -type f ! -iname '*.m4a' -print > "$non_m4a"
  [[ ! -s "$non_m4a" ]] || fail "$label audio directory contains files other than M4A: $(tr '\n' ' ' < "$non_m4a")"

  find "$tree_root/audio" -type f -iname '*.m4a' -size 0 -print > "$zero_m4a"
  [[ ! -s "$zero_m4a" ]] || fail "$label contains empty M4A files: $(tr '\n' ' ' < "$zero_m4a")"

  find "$tree_root/audio" -type f -iname '*.m4a' -print \
    | sed "s#^$tree_root/##" | LC_ALL=C sort > "$actual_audio"

  actual_count="$(wc -l < "$actual_audio" | tr -d '[:space:]')"
  [[ "$actual_count" == "44" ]] || fail "$label contains $actual_count M4A files; expected 44"
  diff -u "$EXPECTED_AUDIO" "$actual_audio" >/dev/null \
    || fail "$label audio files do not exactly match the 44 paths referenced by data/items.js"

  {
    printf '%s\n' 'README_FIRST-en.md'
    printf '%s\n' 'README_FIRST-ja.md'
    printf '%s\n' 'START_HERE.html'
    sed -n '1,$p' "$EXPECTED_AUDIO"
  } | LC_ALL=C sort > "$expected_files"
  find "$tree_root" -type f -print \
    | sed "s#^$tree_root/##" | LC_ALL=C sort > "$actual_files"
  diff -u "$expected_files" "$actual_files" >/dev/null \
    || fail "$label contains missing or unexpected files"

  if find "$tree_root" -type f -iname '*.wav' -print -quit | grep -q .; then
    fail "$label contains a WAV file"
  fi

  if grep -Eiq '<script[^>]+src[[:space:]]*=' "$html_path"; then
    fail "$label START_HERE.html contains an external script reference"
  fi

  if grep -Eiq "<link[^>]+rel[[:space:]]*=[[:space:]]*['\"]?stylesheet" "$html_path"; then
    fail "$label START_HERE.html contains an external stylesheet reference"
  fi

  for marker in \
    'BEGIN inline: assets/styles.css' \
    'BEGIN inline: data/items.js' \
    'BEGIN inline: data/conversion.js' \
    'BEGIN inline: offline-submission' \
    'BEGIN inline: js/app.js'; do
    marker_count="$(grep -Fc "$marker" "$html_path")"
    [[ "$marker_count" == "1" ]] || fail "$label marker must occur once: $marker"
  done

  style_line="$(grep -nF 'BEGIN inline: assets/styles.css' "$html_path" | cut -d: -f1)"
  items_line="$(grep -nF 'BEGIN inline: data/items.js' "$html_path" | cut -d: -f1)"
  conversion_line="$(grep -nF 'BEGIN inline: data/conversion.js' "$html_path" | cut -d: -f1)"
  submission_line="$(grep -nF 'BEGIN inline: offline-submission' "$html_path" | cut -d: -f1)"
  app_line="$(grep -nF 'BEGIN inline: js/app.js' "$html_path" | cut -d: -f1)"

  if ! (( style_line < items_line && items_line < conversion_line && conversion_line < submission_line && submission_line < app_line )); then
    fail "$label inline assets are not in the required order"
  fi

  sed -n "/BEGIN inline: offline-submission/,/END inline: offline-submission/p" "$html_path" \
    > "$TEMP_DIR/submission-$label.txt"
  grep -Eq 'enabled:[[:space:]]*false' "$TEMP_DIR/submission-$label.txt" \
    || fail "$label offline submission configuration is not disabled"
  grep -Eq "endpoint:[[:space:]]*''" "$TEMP_DIR/submission-$label.txt" \
    || fail "$label offline submission endpoint is not empty"

  verify_inline_source "assets/styles.css" \
    '  <style data-inline-source="assets/styles.css">' '  </style>'
  verify_inline_source "data/items.js" \
    '  <script data-inline-source="data/items.js">' '  </script>'
  verify_inline_source "data/conversion.js" \
    '  <script data-inline-source="data/conversion.js">' '  </script>'
  verify_inline_source "js/app.js" \
    '  <script data-inline-source="js/app.js">' '  </script>'
}

verify_tree "$PACKAGE_DIR" "package"

if [[ -n "$ZIP_PATH" ]]; then
  [[ -s "$ZIP_PATH" ]] || fail "Zip archive is missing or empty: $ZIP_PATH"
  unzip -tq "$ZIP_PATH" >/dev/null || fail "Zip integrity check failed: $ZIP_PATH"
  unzip -q "$ZIP_PATH" -d "$TEMP_DIR/archive"
  archive_root="$TEMP_DIR/archive/$(basename "$PACKAGE_DIR")"
  verify_tree "$archive_root" "archive"

  (cd "$PACKAGE_DIR" && find . -type f -print | LC_ALL=C sort) > "$TEMP_DIR/package-files.txt"
  (cd "$archive_root" && find . -type f -print | LC_ALL=C sort) > "$TEMP_DIR/archive-files.txt"
  diff -u "$TEMP_DIR/package-files.txt" "$TEMP_DIR/archive-files.txt" >/dev/null \
    || fail "Zip contents differ from the package directory"
fi

echo "Offline package verification passed: exact file set, 44 non-empty M4A files, no WAV, current inline sources in order, submission disabled, and no external script/stylesheet references."

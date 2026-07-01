#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BITRATE="${1:-80k}"

convert_dir() {
  local dir="$1"
  find "$dir" -maxdepth 1 -type f -name '*.wav' -print0 |
    while IFS= read -r -d '' input; do
      local output="${input%.wav}.m4a"
      ffmpeg -y -hide_banner -loglevel error \
        -i "$input" \
        -ac 1 \
        -c:a aac \
        -b:a "$BITRATE" \
        "$output"
    done
}

convert_dir "$ROOT_DIR/audio/main"
convert_dir "$ROOT_DIR/audio/practice"

echo "Converted WAV files to mono AAC .m4a at $BITRATE"

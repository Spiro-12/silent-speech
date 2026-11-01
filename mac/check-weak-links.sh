#!/usr/bin/env bash
# The app supports macOS 14+, but the calendar summary uses FoundationModels (macOS 26 only).
# That framework must be weak linked, or the app would not even launch on macOS 14 or 15.
# Usage: mac/check-weak-links.sh path/to/SilentSpeechBridge.app/Contents/MacOS/SilentSpeechBridge
set -euo pipefail
BIN="$1"
for arch in $(lipo -archs "$BIN"); do
  strong=$(otool -arch "$arch" -l "$BIN" | awk '/cmd LC_LOAD_DYLIB$/ {s=1; next} /cmd / {s=0} s && /name .*FoundationModels/ {print}')
  if [ -n "$strong" ]; then
    echo "::error::FoundationModels is strongly linked for $arch: the app would not launch on macOS 14/15 ($strong)"
    exit 1
  fi
  echo "$arch: FoundationModels is weak linked or not linked: OK"
done

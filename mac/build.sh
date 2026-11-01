#!/bin/bash
# Builds SilentSpeechBridge.app with only the Command Line Tools. No Xcode needed (Xcode is ~15 GB).
# Same settings as project.yml. Signs with "SilentSpeech Local" if that identity exists (see make-cert.sh), else ad hoc
# (then macOS may ask for the permissions again after each rebuild; run ./make-cert.sh once to avoid that).
# Usage: ./build.sh             -> build/Debug/SilentSpeechBridge.app    this Mac's chip, for working on the app
#        ./build.sh --release   -> build/Release/SilentSpeechBridge.app  universal (arm64 + x86_64), optimized: what
#                                  .github/workflows/release.yml zips for the download
# Env: SIGN_IDENTITY (default "SilentSpeech Local"; "-" signs ad hoc), APP_VERSION (default 0.1.0, like 1.2.3).
set -euo pipefail
cd "$(dirname "$0")"

NAME=SilentSpeechBridge
case "${1:-}" in
  "") CONFIG=Debug ;;
  --release) CONFIG=Release ;;
  *) echo "Usage: ./build.sh [--release]"; exit 2 ;;
esac
APP="build/$CONFIG/$NAME.app"
ARCH="$(uname -m)"
IDENTITY="${SIGN_IDENTITY:-SilentSpeech Local}"
VERSION="${APP_VERSION:-0.1.0}"
[[ "$VERSION" =~ ^[0-9]+(\.[0-9]+){0,2}$ ]] || { echo "FAILED: APP_VERSION must look like 1.2.3 (got: $VERSION)"; exit 1; }

# /usr/bin/xcrun always exists (a stub), so check for a real toolchain.
xcode-select -p >/dev/null 2>&1 && xcrun --find swiftc >/dev/null 2>&1 || { echo "FAILED: Command Line Tools missing. Run: xcode-select --install"; exit 1; }

rm -rf "$APP" "build/$CONFIG/$NAME.dSYM"
mkdir -p "$APP/Contents/MacOS"

if [ "$CONFIG" = Debug ]; then
  BUILT="$ARCH"
  xcrun swiftc -swift-version 5 -parse-as-library -Onone -g \
    -target "$ARCH-apple-macos14.0" -module-name "$NAME" \
    -o "$APP/Contents/MacOS/$NAME" SilentSpeechBridge/*.swift
else
  # One optimized build per chip, then lipo puts both into one universal binary.
  BUILT="arm64 + x86_64"
  SLICES=()
  for A in arm64 x86_64; do
    rm -f "build/$CONFIG/$NAME-$A"
    xcrun swiftc -swift-version 5 -parse-as-library -O \
      -target "$A-apple-macos14.0" -module-name "$NAME" \
      -o "build/$CONFIG/$NAME-$A" SilentSpeechBridge/*.swift
    SLICES+=("build/$CONFIG/$NAME-$A")
  done
  xcrun lipo -create -output "$APP/Contents/MacOS/$NAME" "${SLICES[@]}"
  rm -f "${SLICES[@]}"
fi

# Info.plist with the project.yml values filled in.
sed -e "s/\$(EXECUTABLE_NAME)/$NAME/g" \
    -e "s/\$(PRODUCT_BUNDLE_IDENTIFIER)/com.spiro.$NAME/g" \
    -e "s/\$(PRODUCT_NAME)/$NAME/g" \
    -e "s/\$(MARKETING_VERSION)/$VERSION/g" \
    -e "s/\$(CURRENT_PROJECT_VERSION)/1/g" \
    -e "s/\$(MACOSX_DEPLOYMENT_TARGET)/14.0/g" \
    SilentSpeechBridge/Info.plist > "$APP/Contents/Info.plist"
if grep -q '\$(' "$APP/Contents/Info.plist"; then echo "FAILED: unreplaced \$(...) in Info.plist"; exit 1; fi
plutil -lint "$APP/Contents/Info.plist" >/dev/null
printf 'APPL????' > "$APP/Contents/PkgInfo"

# Debug symbols must not sit inside the signed bundle.
for d in "$APP"/Contents/MacOS/*.dSYM; do [ -e "$d" ] && mv "$d" "build/$CONFIG/"; done

if [ "$IDENTITY" = "-" ]; then
  SIGN="-"
elif security find-identity -v -p codesigning 2>/dev/null | grep -q "\"$IDENTITY\""; then
  SIGN="$IDENTITY"
else
  echo "Note: no \"$IDENTITY\" signing identity, so signing ad hoc: macOS may ask for permissions again after each rebuild (run ./make-cert.sh once to avoid that)."
  SIGN="-"
fi
codesign --force --sign "$SIGN" --entitlements SilentSpeechBridge/SilentSpeechBridge.entitlements "$APP"
codesign --verify --strict "$APP"
echo "OK: built $APP ($BUILT, version $VERSION, signed: $SIGN)"

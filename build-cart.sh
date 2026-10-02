#!/usr/bin/env bash
# build-cart.sh <project-dir> [output.wasc]
#
# Builds a Defold project's content and packs it with the wasmcart engine into
# a single .wasc. Encodes the three bob flags and the manifest dimensions that
# are each easy to miss and each fail without naming themselves - see README.md.
set -euo pipefail

PROJ="${1:?usage: build-cart.sh <project-dir> [output.wasc]}"
PROJ="$(cd "$PROJ" && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${2:-$PROJ/$(basename "$PROJ").wasc}"

# The engine repo, expected beside this one. DEFOLD_TREE overrides it and is
# honoured exactly as given: silently falling back from an explicit setting
# would mask a mistyped path and build against some other engine without
# saying so. Without it, ../defold is tried as well, so an existing local
# clone under the engine's old directory name keeps working.
if [ -n "${DEFOLD_TREE:-}" ]; then
  DEFOLD="$DEFOLD_TREE"
else
  DEFOLD="$HERE/../wasmcart-defold"
  [ -d "$DEFOLD" ] || DEFOLD="$HERE/../defold"
fi
ENGINE="$DEFOLD/tmp/dynamo_home/bin/wasm-web/dmengine_wasmcart.wasm"
BOB="$DEFOLD/tmp/dynamo_home/share/java/bob-light.jar"
# The engine tree ships a JDK; use it when present, else whatever java is on PATH.
JAVA="$(ls -d "$DEFOLD"/tmp/jdk/*/bin/java 2>/dev/null | head -1 || true)"
[ -x "$JAVA" ] || JAVA="$(command -v java)"

[ -f "$ENGINE" ] || {
  echo "no engine at $ENGINE"
  echo
  echo "Build it first:"
  echo "  git clone https://github.com/wasmcart/wasmcart-defold   # beside this repo"
  echo "  cd wasmcart-defold && ./scripts/build.py shell"
  echo "  ./scripts/build.py --platform=wasm-web --skip-tests build_engine -- \\"
  echo "      --skip-build-tests --with-wasmcart"
  echo
  echo "Or point DEFOLD_TREE at an existing checkout."
  exit 1
}
[ -f "$BOB" ]    || { echo "no bob-light.jar at $BOB"; exit 1; }

# Resolution comes from game.project so the cart manifest matches what the
# engine actually renders; a mismatch puts the frame in a corner of the window.
W=$(grep -A4 '^\[display\]' "$PROJ/game.project" | sed -n 's/^width *= *//p'  | head -1)
H=$(grep -A4 '^\[display\]' "$PROJ/game.project" | sed -n 's/^height *= *//p' | head -1)
W="${W:-960}"; H="${H:-540}"
NAME="$(sed -n 's/^title *= *//p' "$PROJ/game.project" | head -1)"
NAME="${NAME:-$(basename "$PROJ")}"

echo "building $NAME (${W}x${H})"
( cd "$PROJ" && "$JAVA" -jar "$BOB" --root . \
    --platform wasm-web `#  host bytecode fails: "bad header in precompiled chunk"` \
    --archive           `#  without it: "Unable to load bootstrap data"` \
    --use-uncompressed-lua-source \
    build >/dev/null )

STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/assets"
cp "$ENGINE" "$STAGE/cart.wasm"
for f in game.arci game.arcd game.dmanifest game.projectc; do
  cp "$PROJ/build/default/$f" "$STAGE/assets/"
done

node "$HERE/../wasmcart/bin/wasmcart-pack.js" \
  --wasm "$STAGE/cart.wasm" --assets "$STAGE/assets" \
  --name "$NAME" --width "$W" --height "$H" --output "$OUT" >/dev/null

echo "packed $OUT ($(du -h "$OUT" | cut -f1))"

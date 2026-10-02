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

# Defold's content compiler. It is upstream Defold's tool, not ours, so it is
# downloaded from Defold's own archive rather than built or vendored here. The
# stable channel is used deliberately: this project tracks a Defold release, it
# does not need the beta or alpha one.
#
# Note this is the full bob.jar, which carries its own /builtins. The engine
# tree's bob-light.jar does not, which is why a local engine build injects a
# builtins link and this path must not.
BOB_CACHE="${BOB_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/wasmcart-defold}"
BOB="${BOB_JAR:-}"
if [ -z "$BOB" ]; then
  INFO="$(curl -fsSL --max-time 30 https://d.defold.com/stable/info.json)" || {
    echo "cannot reach d.defold.com to resolve the Defold version" >&2; exit 1; }
  DEFOLD_VERSION="$(printf '%s' "$INFO" | sed -n 's/.*"version"[: ]*"\([^"]*\)".*/\1/p')"
  DEFOLD_SHA1="$(printf '%s' "$INFO" | sed -n 's/.*"sha1"[: ]*"\([^"]*\)".*/\1/p')"
  [ -n "$DEFOLD_SHA1" ] || { echo "could not read the Defold sha1 from info.json" >&2; exit 1; }
  BOB="$BOB_CACHE/bob-$DEFOLD_SHA1.jar"
  if [ ! -f "$BOB" ]; then
    echo "downloading Defold $DEFOLD_VERSION bob.jar"
    mkdir -p "$BOB_CACHE"
    curl -fL --max-time 900 -o "$BOB.part" \
      "https://d.defold.com/archive/stable/$DEFOLD_SHA1/bob/bob.jar" || {
        rm -f "$BOB.part"; echo "failed to download bob.jar" >&2; exit 1; }
    mv "$BOB.part" "$BOB"
  fi
fi

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
[ -f "$BOB" ]    || { echo "no bob.jar at $BOB"; exit 1; }

# Resolution comes from game.project so the cart manifest matches what the
# engine actually renders; a mismatch puts the frame in a corner of the window.
W=$(grep -A4 '^\[display\]' "$PROJ/game.project" | sed -n 's/^width *= *//p'  | head -1 || true)
H=$(grep -A4 '^\[display\]' "$PROJ/game.project" | sed -n 's/^height *= *//p' | head -1 || true)
# A project may omit [display] entirely and rely on Defold's defaults, and the
# grep above then yields an empty string. Under `set -e` that used to abort the
# script with no message at all, which reads as a mysterious silent failure.
W="${W:-960}"; H="${H:-540}"
case "$W" in ''|*[!0-9]*) W=960;; esac
case "$H" in ''|*[!0-9]*) H=540;; esac
NAME="$(sed -n 's/^title *= *//p' "$PROJ/game.project" | head -1 || true)"
NAME="${NAME:-$(basename "$PROJ")}"

# bob.jar carries its own /builtins, so the project must NOT contain one too:
# two copies of the same path make the content build abort with a relative path
# conflict. Remove any link left by an older build or a local engine tree.
rm -f "$PROJ/builtins"

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

# The packer comes from the wasmcart npm package. A sibling checkout is used
# when there is one, since that is the common development layout, but the
# installed package and `npx` both work, so this does not require any
# particular directory structure.
PACK="$HERE/../wasmcart/bin/wasmcart-pack.js"
if [ ! -f "$PACK" ]; then
  PACK="$HERE/node_modules/wasmcart/bin/wasmcart-pack.js"
fi
if [ -f "$PACK" ]; then
  PACK_CMD=(node "$PACK")
elif command -v npx >/dev/null 2>&1; then
  PACK_CMD=(npx --yes wasmcart pack)
else
  echo "cannot find the wasmcart packer: install it with 'npm install wasmcart'" >&2
  exit 1
fi

"${PACK_CMD[@]}" \
  --wasm "$STAGE/cart.wasm" --assets "$STAGE/assets" \
  --name "$NAME" --width "$W" --height "$H" --output "$OUT" >/dev/null

echo "packed $OUT ($(du -h "$OUT" | cut -f1))"

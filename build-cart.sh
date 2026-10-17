#!/usr/bin/env bash
# build-cart.sh <project-dir> [output-dir]
#
# Builds a Defold project's content and packs it as wasmcart carts: a GL cart
# and, when the WebGPU engine exists, a WebGPU cart from the same archive.
# This is a thin wrapper around tools/build-cart.mjs, which also handles native
# extensions (through the wasmcart-defold SDK) and the games/<id> projects;
# see its header for the environment it reads (DEFOLD_TREE, BOB_JAR, ...).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PROJ="${1:?usage: build-cart.sh <project-dir> [output-dir]}"
if [ $# -ge 2 ]; then
  exec node "$HERE/tools/build-cart.mjs" "$PROJ" --out "$2"
fi
exec node "$HERE/tools/build-cart.mjs" "$PROJ"

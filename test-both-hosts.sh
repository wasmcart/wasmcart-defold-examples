#!/usr/bin/env bash
# test-both-hosts.sh <cart-name> [cart-name ...]
#
# Run each cart through BOTH hosts and report each side's resolution and
# verdict. With no arguments, runs every example.
#
# Testing ONE host hides bugs that live in the other, and this suite has now
# been bitten in both directions:
#
#   - wc_get_info() resetting the resolution was invisible under romdev (which
#     does not re-read it after init) and cropped a 1280x720 cart to 960x540
#     in the native player.
#   - The two GL uniform-block imports were missing from the native player
#     alone, and a cart that needs them draws NOTHING with no GL error raised.
#
# Neither would have been found by running the host that happened to be handy.
set -uo pipefail
EX=/home/monteslu/code/cliemu/defold-wasmcart-examples
NAT=/home/monteslu/code/cliemu/wasmcart-native/build/wasmcart-run
OUT="${TMPDIR:-/tmp}/bothtest"; mkdir -p "$OUT"

# ONE session for the whole suite, reused for every cart. A session per cart
# makes the server hold a live emulator each, and at maxHosts it evicts the
# oldest idle one - which on 2026-09-30 was somebody's running livestream. The
# suite loads carts in sequence and never needs two at once.
SESS="${ROMDEV_SESSION:-both-hosts}"

printf '%-14s | %-22s | %-22s\n' "cart" "romdev" "native"
printf '%s\n' "---------------+------------------------+-----------------------"
CARTS=("$@")
if [ ${#CARTS[@]} -eq 0 ]; then
  CARTS=(hello_defold breakout bombfrog apitest particles proxytest buffertest inputtest)
fi
for p in "${CARTS[@]}"; do
  cart="$EX/$p/$p.wasc"
  [ -f "$cart" ] || { printf '%-14s | %-22s | %s\n' "$p" "NO CART" "NO CART"; continue; }

  # --- romdev ---
  curl -s -X POST http://127.0.0.1:7331/tool/loadMedia \
    -H 'Content-Type: application/json' -H "x-romdev-session: $SESS" \
    --data-binary "{\"platform\":\"wasmcart\",\"path\":\"$cart\"}" > "$OUT/$p.load" 2>&1
  rres=$(grep -oE '"fbWidth":[0-9]+,"fbHeight":[0-9]+' "$OUT/$p.load" | tr -d '"' | sed 's/fbWidth://;s/,fbHeight:/x/')
  curl -s -X POST http://127.0.0.1:7331/tool/frame \
    -H 'Content-Type: application/json' -H "x-romdev-session: $SESS" \
    --data-binary '{"op":"step","frames":320}' > "$OUT/$p.step" 2>&1
  # Read the step RESPONSE. An evicted host or a dead server answers with an
  # error and a resolution parsed from the earlier load still looks like a
  # pass, so "it did not say error" is the only honest success signal here.
  rok=$(grep -oE '"framesRun":[0-9]+' "$OUT/$p.step" | head -1)
  if grep -q '"error"' "$OUT/$p.step" 2>/dev/null; then
    rres="STEP ERROR"; rok=""
  elif [ -z "$rres" ]; then
    rres="LOAD FAILED"
  fi

  # --- native ---
  ( cd "$EX/$p" && timeout 25 "$NAT" "$p.wasc" > "$OUT/$p.nat" 2>&1 )
  nres=$(grep -oE 'running .* \([0-9]+x[0-9]+' "$OUT/$p.nat" | grep -oE '[0-9]+x[0-9]+' | head -1)
  nstub=$(grep 'stubbed missing import' "$OUT/$p.nat" | grep -ci '\.gl' || true)
  nerr=$(grep -cE 'ERROR:SCRIPT|cart trapped' "$OUT/$p.nat" || true)
  [ -z "$nres" ] && nres="NO RENDER"

  printf '%-14s | %-22s | %s\n' "$p" "${rres} ${rok:+ok}" "${nres} glstub=${nstub} err=${nerr}"
done

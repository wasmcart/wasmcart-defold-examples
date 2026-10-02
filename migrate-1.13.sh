#!/usr/bin/env bash
# migrate-1.13.sh <project-dir>
#
# Defold 1.13 made breaking API changes that stop older projects dead. Games
# written for 1.9-1.12 (the benjames-171/defold-games collection, for example)
# need these before they will run on a 1.14 engine. Each one fails at RUNTIME
# with a Lua error rather than at build time, so a project can compile cleanly
# and still not start.
#
# Idempotent: safe to re-run, and it reports what it changed.
set -euo pipefail
PROJ="${1:?usage: migrate-1.13.sh <project-dir>}"
cd "$PROJ"

FILES=$(grep -rl --include='*.script' --include='*.lua' --include='*.render_script' --include='*.gui_script' \
  -E 'sys\.get_config\(|render\.(BUFFER_|STATE_|BLEND_FACTOR_|COMPARE_FUNC_|FACE_)' . 2>/dev/null || true)
[ -z "$FILES" ] && { echo "  nothing to migrate in $PROJ"; exit 0; }

for f in $FILES; do
  before=$(md5sum "$f" | cut -d' ' -f1)

  # 1. sys.get_config split into typed getters. These call sites all read
  #    numbers (clear colours, sizes); a string config needs get_config_string
  #    and is left alone for a human to classify.
  sed -i -E 's/sys\.get_config\(("[^"]*(color|colour|width|height|_red|_green|_blue|_alpha)[^"]*")/sys.get_config_number(\1/g' "$f"

  # 1b. Everything else sys.get_config read is a STRING on these projects
  #     (project.title, project.version). Left as get_config it is simply nil
  #     and the call fails at runtime with "attempt to call field 'get_config'".
  sed -i -E 's/sys\.get_config\(/sys.get_config_string(/g' "$f"

  # 2. Render constants moved from the `render` module to `graphics`, and the
  #    buffer names changed shape as well, and COLOR gained a render-target
  #    index: BUFFER_COLOR_BIT -> BUFFER_TYPE_COLOR0_BIT (not ..._COLOR).
  sed -i -E \
    -e 's/\brender\.BUFFER_COLOR_BIT\b/graphics.BUFFER_TYPE_COLOR0_BIT/g' \
    -e 's/\brender\.BUFFER_DEPTH_BIT\b/graphics.BUFFER_TYPE_DEPTH_BIT/g' \
    -e 's/\brender\.BUFFER_STENCIL_BIT\b/graphics.BUFFER_TYPE_STENCIL_BIT/g' \
    -e 's/\brender\.(STATE_[A-Z_]+)\b/graphics.\1/g' \
    -e 's/\brender\.BLEND_FACTOR_([A-Z_]+)\b/graphics.BLEND_FACTOR_\1/g' \
    -e 's/\brender\.BLEND_([A-Z_]+)\b/graphics.BLEND_FACTOR_\1/g' \
    -e 's/\brender\.(COMPARE_FUNC_[A-Z_]+)\b/graphics.\1/g' \
    -e 's/\brender\.(FACE_[A-Z_]+)\b/graphics.\1/g' \
    "$f"

  after=$(md5sum "$f" | cut -d' ' -f1)
  [ "$before" != "$after" ] && echo "  migrated $f"
done
echo "  done: $PROJ"

# defold-wasmcart examples

Defold games built as [wasmcart](https://github.com/monteslu/wasmcart) carts.
The engine is a fork on the `wasmcart` branch of
[Defold](https://github.com/defold/defold); see
`internal-wasmcart/DEFOLD_STATE.md` for what is built, measured and still open.

## Status

| | |
| --- | --- |
| Engine boots as a cart | works |
| Lua `init` / `update` / `on_input` | works |
| Sprites, fonts, tilemaps, GUI, labels | works |
| Input: keyboard, mouse | works |
| Input: gamepad (12 buttons + sticks + triggers) | works |
| Sound | works (440 Hz measured against a 440 Hz source) |
| Frame delta (`dt`), timers, `go.animate` | works |
| Physics: gravity, contacts, `collision_response` | works |
| Save data (`sys.save` / `sys.load` / `sys.exists`) | works, persists across sessions |
| `resource.create_texture` / `set_texture` | works |
| Particle FX, collection proxies, buffers | works |

`apitest` reports **14 PASS 0 FAIL** and `buffertest` **6 PASS 0 FAIL** on this
engine. Four defects were open when these examples were first written and all
four are now closed; each is worth recording because none of them announced
itself as what it was.

**Geometry did not draw.** Two GL imports were missing:
`glGetActiveUniformBlockiv` and `glGetActiveUniformsiv`. The auto-stub returned
0, so the engine read a 2-byte size for a 64-byte `mat4` uniform block, built a
zero view-projection matrix, and put every vertex off-screen. No GL error was
raised at any point. The fix is in `wasmcart/src/webgl_imports.js`.

**`dt` was near zero.** The engine takes its frame delta from
`dmTime::GetMonotonicTime()`, which on a host-stepped cart measures real time
that barely passes: 120 host frames accumulated 0.026s instead of 2s. Timers
never fired, physics never moved and `go.animate` never completed, and all
three looked like three separate bugs. `DM_PLATFORM_WASMCART` now advances a
virtual clock by one 60 Hz frame per `wc_render()`, so `dt` is exactly 0.01667.

**Gamepads never arrived.** There was no gamepad driver for this platform, and
`hid_native.cpp` only calls a driver's `DetectDevices` once at install time
plus on a GLFW device-changed callback that a cart never receives. Even with a
driver, the one detect ran before the host had written a pad block, so no pad
was ever created. There is now `hid_gamepad_driver_wasmcart.cpp`, and a cart
build polls for devices each `Update()`.

**`sys.save` could not write.** A cart has no filesystem, so every `fopen`
failed. `sys.save`/`sys.load`/`sys.exists` now route into the ABI's save block
(`platform_wasmcart_save.cpp`), which the host persists across sessions.

One thing was never broken: `resource.set_texture` works, and the test that
reported it as unsupported was wrong. It used the pre-1.13 constant spelling
(`resource.TEXTURE_TYPE_2D` rather than `graphics.TEXTURE_TYPE_2D`) and a
`pcall` swallowed the message that said so.

## Examples

### `hello_defold`

The Phase 1 gate fixture. Clears to a known colour so a screenshot can be
checked by pixel value, prints three frames, and plays a 440 Hz tone so audio
can be measured rather than assumed. It is deliberately not a game.

### `breakout`

Paddle, ball, 50 bricks, lives and scoring, driving keyboard and gamepad
through the *same* held-state booleans so neither is a second-class alias of
the other, plus three sound effects and a saved high score.

### `bombfrog` (on disk, not in this repo)

A full third-party Defold game: title screen, menus, tilemap levels, animated
sprites, enemies and bombs. It is the strongest render test here because it
exercises the pipeline on real content rather than on a fixture, and it is how
the renderer fix was confirmed. It is deliberately NOT committed: it arrived
with no licence file or provenance, so it stays a local test fixture until
those are established.

### `apitest`

Drives, and reports PASS/FAIL on, the surface the games never touch: physics
bodies and contacts, GUI scenes, labels, timers (repeating, one-shot and
cancelled), `go.animate` with easing and a completion callback, `json`, `zlib`,
`hash`, `vmath` beyond add/scale, and `sys.save`/`sys.load`/`sys.exists`
including a value carried from a previous session.

### `inputtest`

Every input path a cart can receive, reported live and printed. Each gamepad
button is checked by *identity*, not merely by count: a driver with two buttons
transposed delivers exactly the same number of actions, so the test compares
each delivered `action_id` against the hash of the action it expects.

### `particles`, `proxytest`, `buffertest`

Particle FX with state callbacks; a collection proxy loaded and confirmed
initialised; and buffer streams, `buffer.copy_stream`, float32 access and a
runtime-generated texture uploaded to the GPU.

## Building an example

Nothing about this was previously written down, and two steps are easy to miss.

```bash
# 1. Build the engine once (see DEFOLD_STATE.md for the environment setup)
cd defold
source ./dmenv.sh
./scripts/build.py --platform=wasm-web --skip-tests build_engine -- \
    --skip-build-tests --with-wasmcart
# -> tmp/dynamo_home/bin/wasm-web/dmengine_wasmcart.wasm

# 2. Build content and pack a cart (content build + pack in one step)
cd ../defold-wasmcart-examples
./build-cart.sh breakout          # -> breakout/breakout.wasc
```

`build-cart.sh` reads the resolution and title out of `game.project`, stages
into a `mktemp -d` and packs the result, so the two steps below cannot drift
apart. It is the supported path; what follows is what it does, for when
something needs changing.

```bash
java -jar ../defold/tmp/dynamo_home/share/java/bob-light.jar \
    --root . --platform wasm-web --archive --use-uncompressed-lua-source build
# -> build/default/game.{arci,arcd,dmanifest,projectc}

node ../wasmcart/bin/wasmcart-pack.js \
    --wasm <staged>/cart.wasm --assets <staged>/assets \
    --name Breakout --width 960 --height 540 --output breakout.wasc
```

Three flags are load-bearing and each one fails in a way that does not name
itself:

- **`--archive`** - without it bob compiles the content but writes no
  `game.arci/.arcd/.dmanifest`, and the cart reports
  `Unable to load bootstrap data`.
- **`--platform wasm-web`** - without it bob compiles Lua bytecode for the
  host architecture and the cart fails with
  `bad header in precompiled chunk`.
- **`--use-uncompressed-lua-source`** - bob's archive writer errored here
  when compiling Lua to bytecode for this target. Uncompressed source builds
  cleanly and the engine loads it.

And in the pack step, **`--width`/`--height` are not optional**: the window
sizes itself from the manifest, so a cart that omits them opens at the 1280x720
default while the engine renders at its own resolution.

## Running a cart

```bash
npx wasmcart breakout.wasc --gl --window          # windowed, with input
npx wasmcart breakout.wasc --gl --frames 300      # headless, timed
npx wasmcart breakout.wasc --gl --frames 60 --shot out.png
```

It also runs under romdev, which is the better harness when you want frame
stepping, screenshots and memory reads:

```js
loadMedia({ platform: 'wasmcart', path: 'breakout.wasc' })
frame({ op: 'step', frames: 60 })
frame({ op: 'screenshot', path: 'out.png' })
```

(An earlier note in `DEFOLD_STATE.md` claimed romdev could not load a `.wasc`.
That was wrong: `wasmcart` is a romdev platform and loads these carts fine.)

Two limits worth knowing before writing a test around either harness:

- **Headless `--frames` does not persist the save block.** It calls
  `host.destroy()` without the save step the interactive player runs, so a
  cart's `sys.save` survives within the run and is gone on the next one. To
  test persistence, drive `CartHost` directly: run, `getSaveData()`, then load
  a fresh host with `{ saveData }`.
- **romdev drives the pad, not the keyboard, on a wasmcart cart.**
  `input({op:'press', button:'a'})` reaches `on_input`; `pressKey`/`typeText`
  route to a C64-specific path and error out. An example that must be driven
  from romdev should bind gamepad actions.

## Gamepad

The pad maps onto Defold's standard action names through the automatic gamepad
config, so `/builtins/input/all.input_binding` works with no device row in
`gamecontrollerdb.txt`:

| wasmcart button | Defold action |
| --- | --- |
| A | `gamepad_rpad_down` |
| B | `gamepad_rpad_right` |
| X | `gamepad_rpad_left` |
| Y | `gamepad_rpad_up` |
| L / R | `gamepad_lshoulder` / `gamepad_rshoulder` |
| START / SELECT | `gamepad_start` / `gamepad_back` |
| d-pad | `gamepad_lpad_*` (delivered as a hat) |
| L3 / R3 | `gamepad_lstick_click` / `gamepad_rstick_click` |

Sticks arrive as `gamepad_lstick_*` / `gamepad_rstick_*` past the dead zone and
triggers as `gamepad_ltrigger` / `gamepad_rtrigger`. All four pad slots are
polled, and a pad that appears mid-session is picked up on the next frame.

## Licence

The Defold engine is under the [Defold License
1.0](https://defold.com/license/), which permits a fork ("You can modify the
engine as much as you like") but whose clause 4(a) forbids *selling* the work
as a Game Engine Product - and the definition explicitly covers the runtime. A
free defold-wasmcart is fine; a paid one, or a paid hosted service producing
cart runtimes, is not.

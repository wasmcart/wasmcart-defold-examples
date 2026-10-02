# breakout

A playable Defold game packed as a wasmcart cart.

    left / right   or d-pad or left stick   move the paddle
    space          or gamepad A or start    launch the ball

Lose the ball and you lose a life. Lose three and the run ends and the high
score is written - though saving does not currently work; see below.

## What it is for

`hello_defold` proves the engine BOOTS. This proves it PLAYS, and it is the
harness for the four things a cart runtime has to get right that a
clear-colour fixture cannot test:

- **input** - keyboard and gamepad drive the same held-state booleans
- **sound** - three effects at different pitches, triggered by gameplay
- **save** - a high score through `sys.save` / `sys.load`
- **render** - real sprites through a factory and the standard pipeline

## Known limitations

- **No per-sprite colour.** Everything is white, and shape carries the meaning
  instead. `sprite.set_constant` is not registered in this engine build (only
  `reset_constant` is), and `go.set(url, "tint", ...)` reports "does not have
  any property called" on a factory-created object, so there is no working
  route to a per-sprite tint from Lua. This is a Defold API limit rather than
  something the cart runtime removed.
- **The high score does not persist.** `sys.save` fails - no writable
  filesystem is mounted for carts. The save/load code is correct and is left
  in place as the test case for when that is fixed.
- **No text.** A font needs its own atlas; the HUD is a score bar and life
  pips instead, keeping the example to one 8x8 image.

## Files

    main/main.script    all the game logic, heavily commented
    main/block.go       one sprite, spawned by the factory for everything
    main/sprites.atlas  the 8x8 white square
    main/white.png      that square (72 bytes)
    main/tone.wav       one tone, replayed at three pitches

Build and run instructions are in the parent `README.md`.

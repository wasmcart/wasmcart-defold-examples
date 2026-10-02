# Credits and third-party content

Every file in this repository is either written for it or listed below with
its origin and licence. Nothing here is copied from a commercial game.

## Bundled assets

### DejaVu Sans Mono Bold (`*/main/font/DejaVuSansMono-Bold.ttf`)

- **Author:** Stepan Roh and the DejaVu fonts contributors
- **Upstream:** https://dejavu-fonts.github.io/
- **Copyright:** Copyright (c) 2003 by Bitstream, Inc. All Rights Reserved.
  Bitstream Vera is a trademark of Bitstream, Inc. DejaVu changes are in the
  public domain.
- **Licence:** Bitstream Vera Fonts Copyright, reproduced in full in
  `LICENSE.txt` beside every copy of the font.

Bundled byte-for-byte unmodified, so the licence's renaming clause (which
applies only to modified fonts) does not come into play. It is copied into
each project rather than shared because Defold resolves resource paths within
a project root, and the licence must travel with every copy.

### `*/main/white.png`

An 8x8 image of 64 identical white pixels, generated for this repository.
Sprites are tinted and scaled from it so the examples need no art pipeline.

### `*/main/tone.wav`

A one-second 440 Hz sine wave at 44.1 kHz, generated for this repository.
Measured at 93% of spectral energy in the 440 Hz bin. Pitch-shifted at
playback to produce the different effects in `breakout`.

## Bundled games

Five complete games from the
[benjames-171/defold-games](https://github.com/benjames-171/defold-games)
collection.

- **Author:** Ben James ([github.com/benjames-171](https://github.com/benjames-171))
- **Upstream:** https://github.com/benjames-171/defold-games
- **Copyright:** Copyright (c) 2022 Ben James
- **Licence:** MIT, reproduced in `LICENSE-benjames.txt` inside each game

| directory | game | source |
| --- | --- | --- |
| `mansion/` | Mystery Mansion | [Mystery Mansion](https://github.com/benjames-171/defold-games/tree/master/Mystery%20Mansion) |
| `exolon/` | Exolon: REDUX | [Exolon](https://github.com/benjames-171/defold-games/tree/master/Exolon) |
| `planetoid/` | Planetoid | [Planetoid](https://github.com/benjames-171/defold-games/tree/master/Planetoid) |
| `pathfinder/` | Pathfinder | [Pathfinder](https://github.com/benjames-171/defold-games/tree/master/Pathfinder) |
| `unit4/` | Unit 4 | [Unit 4](https://github.com/benjames-171/defold-games/tree/master/Unit%204) |

Each bundles the author's own art and audio, and none credits a separate
musician on its title screen. Other games in the same collection do, for
example Snowline's reads "music by dalezy & gOAT"; an MIT grant from the game's
author does not convey rights to music licensed from someone else, so those are
not included here.

Changes made when porting, all mechanical: the 1.13 API migration
(`migrate-1.13.sh`), texture filtering set to `nearest`, and removal of a
`defos` dependency whose calls manage a desktop window and have no meaning in a
cart.

## Engine and tooling

The examples build against
[wasmcart-defold](https://github.com/wasmcart/wasmcart-defold), which vendors
the [Defold](https://defold.com) engine under the
[Defold License 1.0](https://defold.com/license/). Defold is
Copyright the Defold Foundation.

Content is compiled by Defold's own `bob` build tool, and carts are packed by
[wasmcart](https://github.com/wasmcart/wasmcart).

## Not included

Several other games from the same MIT collection build and run on this port
but are left out because they bundle music credited to third parties:
Sub Strike, Snowline and Pixel Crypt.

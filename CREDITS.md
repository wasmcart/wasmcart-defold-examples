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

## Showcase games (`games/`)

Open-source Defold projects by other developers, fetched at a pinned commit
by `tools/fetch-games.mjs` and built as carts; nothing of theirs is copied
into this repository. `games/<id>/game.json` records the repository, commit,
author and licence; `games/<id>/patches/` and `overrides/` hold every change
made to build the game on wasmcart-defold, with the reason for each.

| directory | game | author | source | licence |
| --- | --- | --- | --- | --- |
| `games/treasure3d/` | Treasure Scene | FlexYourBrain (Agustin); art by Agustin R. | [FlexYourBrain/Basic3d_TreasureScene](https://github.com/FlexYourBrain/Basic3d_TreasureScene) @ 5876b8c | MIT |
| `games/littlecoaster/` | Little Coaster | FlexYourBrain (Agustin); all assets by the author | [FlexYourBrain/sample_littlecoaster](https://github.com/FlexYourBrain/sample_littlecoaster) @ 52b6dc3 | MIT |
| `games/horror3d/` | Horror 3D | Pawel Jarosz | [paweljarosz/horror_3d_game_mwdj_2023](https://github.com/paweljarosz/horror_3d_game_mwdj_2023) @ 40a23b6 | MIT |
| `games/illumination/` | Illumination demo | Roman Silin (astrochili) | [astrochili/defold-illumination](https://github.com/astrochili/defold-illumination) @ 7bf05fc | MIT |
| `games/mergegetaway/` | Merge Getaway | Artsiom Trubchyk (aglitchman) | [aglitchman/defold-ld50-game](https://github.com/aglitchman/defold-ld50-game) @ 1668afb | MIT |
| `games/brdfdeferred/` | BRDF Deferred Rendering V2 | Mikhail Martianov (martianovdev) | [martianovdev/Defold-BRDF-Deferred-Rendering-V2](https://github.com/martianovdev/Defold-BRDF-Deferred-Rendering-V2) @ 4de9b8b | CC BY 4.0 |
| `games/stylizedwater/` | Stylized Water | Selim Anaç (selimanac); after Daniel Shervheim's Unity shader | [selimanac/defold-stylized-water-shader](https://github.com/selimanac/defold-stylized-water-shader) @ bdcc1d8 | MIT |
| `games/superweird/` (disabled) | SuperWEIRD Game Kit | Luden.io | [ludenio/SuperWEIRDGameKit](https://github.com/ludenio/SuperWEIRDGameKit) @ 4e86c38 | CC0 1.0 |
| `games/slasher/` (disabled) | Slasher prototype | Igor Suntsev (Dragosha) | [Dragosha/slasher-prototype](https://github.com/Dragosha/slasher-prototype) @ 111608f | MIT (code), CC0 (art) |

Third-party content inside those games, as each project's README credits it:

- **Horror 3D:** built on Illumination (Roman Silin, MIT) and Horri-fold
  (Aayush Kashyap); textures by Joao Paulo, [3dtextures.me](https://3dtextures.me);
  models from cgtrader's free models: [low-poly zombie](https://www.cgtrader.com/free-3d-models/character/fantasy-character/low-poly-zombie),
  [dead trees](https://www.cgtrader.com/free-3d-models/plant/leaf/free-3-dead-trees-sample-models),
  [realistic trees pack](https://www.cgtrader.com/free-3d-models/plant/other/realistic-trees-pack-of-2),
  [metal door](https://www.cgtrader.com/free-3d-models/interior/other/metal-door-2671b706-d623-4579-94c8-1535bfbb0dcb),
  [cross stone](https://www.cgtrader.com/free-3d-models/architectural/decoration/cross-stone),
  [candles set](https://www.cgtrader.com/free-3d-models/interior/other/candles-set-low-poly-3d-model),
  [meatcube arm](https://www.cgtrader.com/free-3d-models/various/various-models/meatcubearm).
  Its ten Collada models are shipped converted to glTF in `patches/`, geometry
  only, because Defold 1.14 no longer reads Collada.
- **Illumination:** textures from Tiny Texture Pack [1](https://screamingbrainstudios.itch.io/tiny-texture-pack)
  and [2](https://screamingbrainstudios.itch.io/tiny-texture-pack-2) by Screaming
  Brain Studios; normal and specular maps made with
  [Normal Map Online](https://cpetry.github.io/NormalMap-Online/) by @cpetry.
- **Merge Getaway:** built on [Scene3D](https://github.com/indiesoftby/defold-scene3d)
  (Indiesoft LLC, MIT); three Scene3D shaders are replaced under `overrides/`.
  Models, 2D art and music by the author.
- **Stylized Water:** a port of [unity-stylized-water](https://github.com/danielshervheim/unity-stylized-water)
  by Daniel Shervheim.
- **Little Coaster:** bundles [defold-pbr](https://github.com/defold/defold-pbr)
  (the Defold Foundation); depends on [vantage](https://github.com/Jhonnyg/vantage)
  (Jhonny Göransson) and [dirtylarry](https://github.com/andsve/dirtylarry)
  (Sven Andersson).
- **BRDF Deferred Rendering V2** is CC BY 4.0: this repository redistributes
  it at the pinned commit with the changes in `games/brdfdeferred/patches/`,
  and credits Mikhail Martianov ([martianov.tech](https://martianov.tech)) as
  its author, as the licence requires.

Lua libraries the games depend on (all permissively licensed, fetched by bob
at build time, not stored here): [ludobits](https://github.com/britzl/ludobits)
and [defold-input](https://github.com/britzl/defold-input) by Björn Ritzl;
[defold-operator](https://github.com/astrochili/defold-operator) and
[defold-trenchbroom](https://github.com/astrochili/defold-trenchbroom) by Roman
Silin; [pigeon](https://github.com/paweljarosz/pigeon) by Pawel Jarosz;
[defold-pointer-lock](https://github.com/indiesoftby/defold-pointer-lock) by
Indiesoft LLC (its Lua half; the native half is replaced by
`cart-ext/pointer_lock`).

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

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

## Engine and tooling

The examples build against
[wasmcart-defold](https://github.com/wasmcart/wasmcart-defold), which vendors
the [Defold](https://defold.com) engine under the
[Defold License 1.0](https://defold.com/license/). Defold is
Copyright the Defold Foundation.

Content is compiled by Defold's own `bob` build tool, and carts are packed by
[wasmcart](https://github.com/wasmcart/wasmcart).

## Not included

`bombfrog`, a third-party Defold game used locally as a rendering test, is
deliberately **not** in this repository: it arrived with no licence file or
stated provenance. It is excluded by `.gitignore` and will stay out unless its
author and terms are established.

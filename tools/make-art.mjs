#!/usr/bin/env node
// make-art.mjs [<project> ...]
//
// Makes the launcher pictures a cart carries (wasmcart manifest "art") for
// every project with an art/ folder, or the projects named: art/cover.png, a
// 600x900 box cover drawn from the cart's own screenshot with the game's name
// on it, and for a game whose project has a title logo (assets/png/logo.png),
// art/logo.png, that logo scaled up whole pixels to at least 1280 wide on its
// own transparent background. art/art.json names them and the screenshots;
// tools/build-cart.mjs packs the folder, adding "screenshot.png" from
// docs/screenshots/<name>.png. The cover background is art/play.png when
// there is one, else that docs screenshot, or art/title.png alone (below).
//
// A development tool, run by hand when a game's pictures change; the results
// are committed, so CI needs nothing it uses. Requires ImageMagick 7 (magick).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONT = process.env.ART_FONT || 'DejaVu-Sans-Bold';
const magick = (...a) => execFileSync('magick', a, { stdio: ['ignore', 'inherit', 'inherit'] });
const size = f => execFileSync('magick', ['identify', '-format', '%w %h', f], { encoding: 'utf8' }).split(' ').map(Number);

const all = execFileSync(process.execPath, [path.join(ROOT, 'tools/list-carts.mjs')], { encoding: 'utf8' }).split('\n').filter(Boolean);
const want = process.argv.slice(2);
for (const p of want.length ? want : all) {
  const dir = path.join(ROOT, p);
  const art = path.join(dir, 'art');
  if (!fs.existsSync(art)) continue;
  const name = path.basename(p);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'game.json'), 'utf8'));
  const title = meta.manifest?.title || meta.title || name;
  const project = fs.existsSync(path.join(dir, 'game.project')) ? dir : path.join(dir, 'src');
  const logoSrc = path.join(project, 'assets/png/logo.png');
  // game.json "art": {"cover": "title"}: the title screen already carries the
  // game's name, so the cover is art/title.png alone.
  const fromTitle = meta.art?.cover === 'title';
  const bg = (fromTitle ? [path.join(art, 'title.png')] : [path.join(art, 'play.png'), path.join(ROOT, 'docs/screenshots', `${name}.png`)]).find(f => fs.existsSync(f));
  if (!bg) { console.error(`${p}: no art/play.png or docs/screenshots/${name}.png to draw a cover from`); process.exit(1); }
  const [bw, bh] = size(bg);
  // Pixel art scales by whole pixels (nearest); a 3D render scales smoothly.
  const pixel = fs.existsSync(logoSrc);
  const filter = pixel ? ['-filter', 'point'] : [];
  const cover = path.join(art, 'cover.png');
  const tmp = path.join(art, '.cover-bg.png');
  const shade = fromTitle ? [] : ['(', '-size', '600x900', 'gradient:#000000b0-#00000000', ')', '-compose', 'over', '-composite'];
  magick(bg, ...filter, '-resize', '600x900^', '-gravity', 'center', '-extent', '600x900', ...shade, tmp);
  if (fromTitle) {
    fs.copyFileSync(tmp, cover);
  } else if (pixel) {
    const [lw] = size(logoSrc);
    const k = Math.max(1, Math.floor(540 / lw));
    magick(tmp, '(', logoSrc, '-filter', 'point', '-resize', `${k * 100}%`, ')', '-gravity', 'north', '-geometry', '+0+90', '-compose', 'over', '-composite', cover);
    const L = Math.max(1, Math.ceil(1280 / lw));
    magick(logoSrc, '-filter', 'point', '-resize', `${L * 100}%`, path.join(art, 'logo.png'));
  } else {
    magick(tmp, '(', '-background', 'none', '-fill', 'white', '-stroke', '#000000', '-strokewidth', '2', '-font', FONT,
      '-size', '520x220', '-gravity', 'center', `caption:${title}`, ')', '-gravity', 'north', '-geometry', '+0+80', '-compose', 'over', '-composite', cover);
  }
  fs.rmSync(tmp);
  console.log(`${p}: art/cover.png from ${path.relative(ROOT, bg)} (${bw}x${bh})${pixel ? ', art/logo.png' : ''}`);
}

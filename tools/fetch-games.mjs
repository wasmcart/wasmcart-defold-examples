#!/usr/bin/env node
// fetch-games.mjs [id...]: check out each third-party game at its pinned
// commit into games/<id>/src and apply the patches in games/<id>/patches.
//
// The games are not copied into this repo. Each games/<id>/game.json names the
// upstream repository, the exact commit and the licence; the patches are the
// whole of what this repo changes, so `git -C games/<id>/src diff` is always an
// exact account of it. A fresh fetch discards local edits in src/: to change a
// patch, edit src/, then write it back with --save.
//
//   node tools/fetch-games.mjs              fetch every game
//   node tools/fetch-games.mjs horror3d     fetch one
//   node tools/fetch-games.mjs --save horror3d
//                                           write src/'s changes to
//                                           games/horror3d/patches/wasmcart.patch
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAMES = path.join(ROOT, 'games');
const args = process.argv.slice(2);
const save = args.includes('--save');
const ids = args.filter(a => !a.startsWith('--'));
const all = fs.readdirSync(GAMES).filter(d => fs.existsSync(path.join(GAMES, d, 'game.json'))).sort();
for (const id of ids) if (!all.includes(id)) { console.error(`fetch-games: no games/${id}/game.json`); process.exit(1); }

const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 30 });

for (const id of ids.length ? ids : all) {
  const dir = path.join(GAMES, id);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'game.json'), 'utf8'));
  const src = path.join(dir, 'src');
  const patches = path.join(dir, 'patches');

  if (save) {
    fs.mkdirSync(patches, { recursive: true });
    git(src, 'add', '-A');
    const diff = git(src, 'diff', '--cached', '--binary', meta.commit);
    git(src, 'reset', '-q');
    const out = path.join(patches, 'wasmcart.patch');
    if (diff.trim()) fs.writeFileSync(out, diff); else fs.rmSync(out, { force: true });
    console.log(`${id}: ${diff.trim() ? `wrote ${path.relative(ROOT, out)}` : 'no changes'}`);
    continue;
  }

  if (!fs.existsSync(path.join(src, '.git'))) {
    fs.rmSync(src, { recursive: true, force: true });
    fs.mkdirSync(src, { recursive: true });
    git(src, 'init', '-q');
    git(src, 'remote', 'add', 'origin', meta.repo);
  }
  // A shallow fetch of exactly the pinned commit: GitHub serves any reachable
  // commit by hash, so this works without knowing which branch it is on.
  git(src, 'fetch', '-q', '--depth', '1', 'origin', meta.commit);
  git(src, 'checkout', '-q', '--force', meta.commit);
  git(src, 'clean', '-q', '-fdx', '-e', 'build/', '-e', '.internal/');
  const list = fs.existsSync(patches) ? fs.readdirSync(patches).filter(f => f.endsWith('.patch')).sort() : [];
  for (const p of list) git(src, 'apply', '--whitespace=nowarn', path.join(patches, p));
  console.log(`${id}: ${meta.title} @ ${meta.commit.slice(0, 7)}${list.length ? `, ${list.length} patch${list.length > 1 ? 'es' : ''}` : ''}`);
}

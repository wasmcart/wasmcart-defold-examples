#!/usr/bin/env node
// list-carts.mjs [--frames <project>] [--runs <project>]
//
// Prints the projects CI builds and runs, one per line: every example
// project at the repo root that has a game.project, then every games/<id>
// whose game.json is not "enabled": false. With --frames <project>, prints
// the number of frames CI runs that cart for: game.json "ci": {"frames": N},
// else 480 for an example (apitest's physics verdict is at frame 420) and 120 for a game (the games are 1080p 3D scenes
// and run on a software rasterizer in CI). With --runs <project>, prints
// "yes" unless game.json has "ci": {"run": false}: a cart CI builds but does
// not run, with the reason beside the flag (a host bug the cart trips, say).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const examples = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(e => e.isDirectory() && fs.existsSync(path.join(ROOT, e.name, 'game.project')))
  .map(e => e.name).sort()
  // A project the repo ignores (games whose music terms are unknown) is on
  // disk here but not in a checkout, so CI never sees it either way.
  .filter(name => { try { execFileSync('git', ['-C', ROOT, 'check-ignore', '-q', name]); return false; } catch { return true; } });
const games = fs.readdirSync(path.join(ROOT, 'games'), { withFileTypes: true })
  .filter(e => e.isDirectory() && fs.existsSync(path.join(ROOT, 'games', e.name, 'game.json')))
  .map(e => e.name).sort()
  .filter(id => JSON.parse(fs.readFileSync(path.join(ROOT, 'games', id, 'game.json'), 'utf8')).enabled !== false)
  .map(id => `games/${id}`);

if (args[0] === '--runs') {
  const p = args[1];
  const meta = p.startsWith('games/') ? JSON.parse(fs.readFileSync(path.join(ROOT, p, 'game.json'), 'utf8')) : {};
  console.log(meta.ci?.run === false ? 'no' : 'yes');
} else if (args[0] === '--frames') {
  const p = args[1];
  const meta = p.startsWith('games/') ? JSON.parse(fs.readFileSync(path.join(ROOT, p, 'game.json'), 'utf8')) : {};
  console.log(meta.ci?.frames ?? (p.startsWith('games/') ? 120 : 480));
} else {
  for (const p of [...examples, ...games]) console.log(p);
}

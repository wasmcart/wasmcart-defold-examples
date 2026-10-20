#!/usr/bin/env node
// build-cart.mjs <project-dir> [--out DIR] [--name NAME] [--no-webgpu]
//
// Builds a Defold project's content with bob and packs it as one wasmcart
// cart, <name>.wasc. When the shaders compile to WGSL it is a dual cart, on the
// engine with both the GL and the WebGPU adapter: a host with WebGPU runs it
// on WebGPU and any other host on GL. Otherwise it is on the GL engine.
//
// <project-dir> is a Defold project (it has game.project) or a games/<id>
// folder, whose fetched source is in src/ (tools/fetch-games.mjs).
//
// Native extensions: bob builds the content, and Defold's build server
// normally builds the engine. bob sends every extension with C++ sources to
// that server whenever it builds a project that has one, and has no option to
// stop it. A cart gets its engine from the wasmcart-defold SDK instead, so
// bob is given a copy of the project with the extensions' native sources left
// out (the manifests, Lua and resources stay), and the SDK's link.mjs compiles
// those sources into the engines. bob is also pointed at a dead build server,
// so a missed case fails loudly rather than uploading anything.
//
// Environment:
//   DEFOLD_TREE          wasmcart-defold checkout (default ../wasmcart-defold)
//   WASMCART_DEFOLD_SDK  the SDK (default $DEFOLD_TREE/tmp/wasmcart-defold-sdk)
//   ENGINE_DIR           the stock engines (default $DEFOLD_TREE/tmp/dynamo_home/bin/wasm-web)
//   WASMCART_EMSDK       emsdk for link.mjs (default the engine tree's own, else
//                        $EMSDK). Not $EMSDK first: a shell's general-purpose
//                        emsdk is rarely the exact version the engine was built with.
//   BOB_JAR              bob.jar (default: Defold's, downloaded and cached)
//   JAVA                 java (default the engine tree's JDK, else PATH)
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LUA_FILE, RESOURCE_FILE, migrateLua, migrateResource } from './migrate-defold.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The Defold release the engine is: content from a newer bob can be
// unreadable to it, so bob is pinned to this release, not the stable channel.
const DEFOLD_VERSION = '1.14.0';
const DEFOLD_SHA1 = 'a81dbb0478e8b73931dc2d671563204f6ac0ef82';
const DEAD_BUILD_SERVER = 'http://127.0.0.1:9';

function fail(msg) { console.error(`build-cart: ${msg}`); process.exit(1); }
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts });

// --- arguments ---------------------------------------------------------------
const argv = process.argv.slice(2);
let input = null, outDir = null, name = null, webgpu = true;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--out') outDir = argv[++i];
  else if (a === '--name') name = argv[++i];
  else if (a === '--no-webgpu') webgpu = false;
  else if (a.startsWith('-')) fail(`unknown option ${a}`);
  else input = path.resolve(a);
}
if (!input) fail('usage: build-cart.mjs <project-dir> [--out DIR] [--name NAME] [--no-webgpu]');
let project = input;
if (!fs.existsSync(path.join(project, 'game.project')) && fs.existsSync(path.join(input, 'src/game.project'))) {
  project = path.join(input, 'src');
}
if (!fs.existsSync(path.join(project, 'game.project'))) fail(`no game.project in ${input} (for games/<id>, run tools/fetch-games.mjs first)`);
name = name || path.basename(input);
// games/<id>/overrides/ holds files copied over the staged content before bob
// runs: overrides/<project path> replaces a project file, and
// overrides/deps/<folder>/<path> replaces <folder>/<path> inside whichever
// dependency zip has it (a library's shader, say). The fetched sources and
// the dependency zips themselves stay as upstream published them.
//
// games/<id>/game.json may list native extensions the cart leaves out
// ("skipExtensions": manifest names) and cart implementations that replace a
// browser- or desktop-only extension of the same name ("cartExtensions":
// folders under games/<id>/), each with its reason in "notes".
const gameJson = path.join(input, 'game.json');
const gameMeta = fs.existsSync(gameJson) ? JSON.parse(fs.readFileSync(gameJson, 'utf8')) : {};
const cartExts = (gameMeta.cartExtensions || []).map(d => path.join(input, d));
const cartExtNames = cartExts.map(d => (fs.readFileSync(path.join(d, 'ext.manifest'), 'utf8').match(/^name:\s*"?([^"\n]+)"?/m) || [])[1]);
const skipExts = [...(gameMeta.skipExtensions || []), ...cartExtNames];
// "webgpu": false in game.json: a GL-only cart. For a game whose WebGPU path is
// known not to draw (a WGSL-valid cart that renders black on WebGPU is worse
// than one that runs on GL everywhere), with the reason in "notes".
if (gameMeta.webgpu === false) webgpu = false;
outDir = path.resolve(outDir || input);

// --- tools -------------------------------------------------------------------
const DEFOLD = path.resolve(process.env.DEFOLD_TREE || path.join(HERE, '../wasmcart-defold'));
const ENGINES = path.resolve(process.env.ENGINE_DIR || path.join(DEFOLD, 'tmp/dynamo_home/bin/wasm-web'));
const SDK = path.resolve(process.env.WASMCART_DEFOLD_SDK || path.join(DEFOLD, 'tmp/wasmcart-defold-sdk'));
const jdk = path.join(DEFOLD, 'tmp/jdk');
const JAVA = process.env.JAVA || (fs.existsSync(jdk) ? fs.readdirSync(jdk).map(d => path.join(jdk, d, 'bin/java')).find(p => fs.existsSync(p)) : null) || 'java';

let BOB = process.env.BOB_JAR;
if (!BOB) {
  const cache = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'wasmcart-defold');
  BOB = path.join(cache, `bob-${DEFOLD_SHA1}.jar`);
  if (!fs.existsSync(BOB)) {
    console.log(`downloading Defold ${DEFOLD_VERSION} bob.jar`);
    fs.mkdirSync(cache, { recursive: true });
    run('curl', ['-fL', '--max-time', '900', '-o', `${BOB}.part`, `https://d.defold.com/archive/stable/${DEFOLD_SHA1}/bob/bob.jar`]);
    fs.renameSync(`${BOB}.part`, BOB);
  }
}
// bob reports compile errors on stdout among its progress lines; keep the
// whole log and show only the errors when it fails.
function bob(cwd, ...a) {
  const errs = tryBob(cwd, ...a);
  if (errs) fail(`bob ${a[a.length - 1]} failed in ${cwd} (full log: ${path.join(cwd, 'build/bob.log')}):\n  ${errs.join('\n  ')}`);
}
/** Run bob; null on success, else its error lines. */
function tryBob(cwd, ...a) {
  const log = path.join(cwd, 'build/bob.log');
  fs.mkdirSync(path.dirname(log), { recursive: true });
  const fd = fs.openSync(log, 'w');
  try {
    execFileSync(JAVA, ['-jar', BOB, '--root', '.', ...a], { cwd, stdio: ['ignore', fd, fd] });
  } catch {
    return fs.readFileSync(log, 'utf8').split('\n').filter(l => /ERROR|error:/.test(l)).slice(0, 20);
  } finally {
    fs.closeSync(fd);
  }
  return null;
}

let PACK = [path.join(HERE, '../wasmcart/bin/wasmcart-pack.js'), path.join(HERE, 'node_modules/wasmcart/bin/wasmcart-pack.js')].find(p => fs.existsSync(p));
const pack = PACK ? (...a) => run(process.execPath, [PACK, ...a], { stdio: 'ignore' }) : (...a) => run('npx', ['--yes', 'wasmcart', 'pack', ...a], { stdio: 'ignore' });

// --- project -----------------------------------------------------------------
const gameProject = fs.readFileSync(path.join(project, 'game.project'), 'utf8');
function setting(section, key) {
  const m = gameProject.match(new RegExp(`^\\[${section}\\]([\\s\\S]*?)(?=^\\[|(?![\\s\\S]))`, 'm'));
  const v = m && m[1].match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
  return v ? v[1].trim() : null;
}
// Defold's own default when [display] is absent is 960x640.
const W = Number(setting('display', 'width')) || 960;
const H = Number(setting('display', 'height')) || 640;
const title = setting('project', 'title') || name;

// bob.jar carries its own /builtins; a builtins link in the project collides.
fs.rmSync(path.join(project, 'builtins'), { force: true, recursive: false });
if (/^dependencies/m.test(gameProject)) {
  console.log(`${name}: resolving dependencies`);
  bob(project, 'resolve');
}


/**
 * The dependency zips bob resolved for a project. .internal/lib keeps every
 * zip ever downloaded there, a stale one included when a dependency is
 * re-pinned, and dependencies.json names the current set: each entry's zip is
 * named by the SHA-1 of its url.
 */
function dependencyZips(libDir) {
  if (!fs.existsSync(libDir)) return [];
  const zips = fs.readdirSync(libDir).filter(f => f.endsWith('.zip'));
  const manifest = path.join(libDir, 'dependencies.json');
  if (!fs.existsSync(manifest)) return zips;
  const wanted = JSON.parse(fs.readFileSync(manifest, 'utf8')).map(e => crypto.createHash('sha1').update(e.url).digest('hex'));
  return zips.filter(z => wanted.some(h => z.startsWith(h)));
}

// Native extensions: an ext.manifest beside a src/ or commonsrc/ folder is what
// bob sends to the build server (ExtenderUtil.isEngineExtensionManifest).
const NATIVE_DIRS = ['src', 'commonsrc'];
function nativeExtDirs(root) {
  const out = [];
  (function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      if (['build', '.internal', '.git', 'node_modules'].includes(ent.name)) continue;
      const p = path.join(d, ent.name);
      if (fs.existsSync(path.join(p, 'ext.manifest')) && NATIVE_DIRS.some(n => fs.existsSync(path.join(p, n)))) out.push(p);
      walk(p);
    }
  })(root);
  return out;
}
const libDir = path.join(project, '.internal/lib');
const zips = dependencyZips(libDir);
function zipNativeDirs(zip) {
  const names = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n');
  const set = new Set(names);
  return names.filter(n => n.endsWith('/ext.manifest')).map(n => n.slice(0, -'ext.manifest'.length))
    .filter(dir => NATIVE_DIRS.some(s => names.some(n => n.startsWith(`${dir}${s}/`))))
    .flatMap(dir => NATIVE_DIRS.filter(s => names.some(n => n.startsWith(`${dir}${s}/`))).map(s => `${dir}${s}/`))
    .filter(Boolean)
    .filter(() => set.size);
}
const localNative = nativeExtDirs(project);
const zipNative = Object.fromEntries(zips.map(z => [z, zipNativeDirs(path.join(libDir, z))]).filter(([, d]) => d.length));
const hasNative = localNative.length > 0 || Object.keys(zipNative).length > 0;

// --- content ---------------------------------------------------------------
// bob builds a staged copy of the project: the native source folders left out
// (see the header), and the Lua migrated to the 1.14 API (migrate-defold.mjs),
// in the project and in every dependency zip. The fetched sources stay
// untouched, so the patches remain the only changes made by hand.
const contentRoot = path.join(project, 'build/wasmcart-content');
const excludes = ['build/', '.git/', ...localNative.flatMap(d => NATIVE_DIRS.map(n => `/${path.relative(project, path.join(d, n))}/`))];
fs.mkdirSync(contentRoot, { recursive: true });
run('rsync', ['-a', '--delete', ...excludes.flatMap(e => ['--exclude', e]), `${project}/`, `${contentRoot}/`]);
if (hasNative) {
  const left = [...localNative.map(d => path.relative(project, d)), ...Object.values(zipNative).flat().map(d => d.split('/').slice(-3, -2)[0])];
  console.log(`${name}: native extensions built by the SDK, not bob: ${[...new Set(left)].join(', ')}`);
}

// An app manifest tailors the engine Defold's build server links (which
// libraries and symbols to leave out). A cart's engine comes from the SDK, and
// bob treats any app_manifest setting as a reason to call the build server,
// so the staged game.project drops it.
{
  const gp = path.join(contentRoot, 'game.project');
  const text = fs.readFileSync(gp, 'utf8');
  const stripped = text.replace(/^app_manifest\s*=.*\n?/m, '');
  if (stripped !== text) {
    fs.writeFileSync(gp, stripped);
    console.log(`${name}: native_extension.app_manifest is for Defold's build server; the cart ignores it`);
  }
}

let migrated = 0;
const manual = [];
const MIGRATE = new RegExp(`(${LUA_FILE.source})|(${RESOURCE_FILE.source})`);
function migrateFile(file, label) {
  const lua = LUA_FILE.test(file);
  const { text, changes, manual: m = [] } = (lua ? migrateLua : migrateResource)(fs.readFileSync(file, 'utf8'));
  if (changes) { fs.writeFileSync(file, text); migrated++; }
  for (const x of m) manual.push(`${label}:${x.line} ${x.api}`);
  return changes > 0;
}
(function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()) { if (!['build', '.internal'].includes(ent.name)) walk(p); }
    else if (MIGRATE.test(ent.name)) migrateFile(p, path.relative(contentRoot, p));
  }
})(contentRoot);
for (const z of zips) {
  const zip = path.join(contentRoot, '.internal/lib', z);
  if (zipNative[z]) run('zip', ['-q', '-d', zip, ...zipNative[z].map(d => `${d}*`)], { stdio: 'ignore' });
  const lua = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').filter(n => MIGRATE.test(n));
  if (!lua.length) continue;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wasmcart-defold-dep-'));
  try {
    run('unzip', ['-q', '-o', zip, ...lua, '-d', tmp], { stdio: 'ignore' });
    const changed = lua.filter(n => migrateFile(path.join(tmp, n), n));
    if (changed.length) run('zip', ['-q', zip, ...changed], { cwd: tmp, stdio: 'ignore' });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
const overridesDir = path.join(input, 'overrides');
if (fs.existsSync(overridesDir)) {
  let n = 0;
  (function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) { walk(p); continue; }
      const rel = path.relative(overridesDir, p);
      if (rel.startsWith('deps/')) {
        const inner = rel.slice('deps/'.length);
        const hit = zips.map(z => path.join(contentRoot, '.internal/lib', z)).find(zip =>
          execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').some(e => e.endsWith('/' + inner)));
        if (!hit) fail(`overrides/${rel}: no dependency zip has a file ending in ${inner}`);
        const entry = execFileSync('unzip', ['-Z1', hit], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').find(e => e.endsWith('/' + inner));
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wasmcart-defold-override-'));
        try {
          fs.mkdirSync(path.join(tmp, path.dirname(entry)), { recursive: true });
          fs.copyFileSync(p, path.join(tmp, entry));
          run('zip', ['-q', hit, entry], { cwd: tmp, stdio: 'ignore' });
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      } else {
        fs.mkdirSync(path.dirname(path.join(contentRoot, rel)), { recursive: true });
        fs.copyFileSync(p, path.join(contentRoot, rel));
      }
      n++;
    }
  })(overridesDir);
  console.log(`${name}: ${n} file${n > 1 ? 's' : ''} from overrides/`);
}
if (migrated) console.log(`${name}: migrated ${migrated} file${migrated > 1 ? 's' : ''} to the Defold 1.14 API`);
if (manual.length) console.log(`${name}: WARNING removed Defold APIs that need a hand-written change:\n  ${manual.join('\n  ')}`);
// bob builds incrementally, and its cache does not key on game.project: a
// changed setting (glsl_es_default_precision_float, say) left every shader
// built under the old one. So the staged build is discarded whenever
// game.project or the bob jar changes.
{
  const stampFile = path.join(contentRoot, 'build/.wasmcart-stamp');
  const stamp = crypto.createHash('sha1').update(fs.readFileSync(path.join(contentRoot, 'game.project'))).update(BOB).digest('hex');
  if (!fs.existsSync(stampFile) || fs.readFileSync(stampFile, 'utf8') !== stamp) {
    fs.rmSync(path.join(contentRoot, 'build'), { recursive: true, force: true });
    fs.mkdirSync(path.join(contentRoot, 'build'), { recursive: true });
    fs.writeFileSync(stampFile, stamp);
  }
}
console.log(`${name}: building content (${W}x${H})`);
const BOB_BUILD = [
  '--platform', 'wasm-web',          // host bytecode fails: "bad header in precompiled chunk"
  '--archive',                       // without it: "Unable to load bootstrap data"
  '--use-uncompressed-lua-source',
  '--build-server', DEAD_BUILD_SERVER,
];
// WGSL beside GLSL ES, so the archive serves both of a dual cart's adapters.
const wgslErrors = webgpu ? tryBob(contentRoot, ...BOB_BUILD, '--debug-output-wgsl', 'true', 'build') : ['(--no-webgpu)'];
if (wgslErrors) {
  // A shader that compiles for GL can still fail Defold's SPIR-V -> WGSL step
  // (sampler2D function parameters, sampling in non-uniform control flow).
  // The cart is still worth having on GL; WebGPU needs the shader fixed.
  if (webgpu) console.log(`${name}: WARNING GL only: the shaders do not compile to WGSL:\n  ${wgslErrors.filter(l => !/^\s*$/.test(l)).slice(0, 8).join('\n  ')}`);
  webgpu = false;
  bob(contentRoot, ...BOB_BUILD, 'build');
}
const built = path.join(contentRoot, 'build/default');

// --- engines -----------------------------------------------------------------
let engineDir = ENGINES;
if (hasNative) {
  if (!fs.existsSync(path.join(SDK, 'link.mjs'))) fail(`this project has native extensions and needs the wasmcart-defold SDK; none at ${SDK} (set WASMCART_DEFOLD_SDK)`);
  engineDir = path.join(project, 'build/wasmcart-engine');
  let emsdk = process.env.WASMCART_EMSDK;
  const env = { ...process.env };
  if (!emsdk) {
    const own = path.join(DEFOLD, 'tmp/dynamo_home/ext/SDKs');
    const d = fs.existsSync(own) ? fs.readdirSync(own).find(x => x.startsWith('emsdk-')) : null;
    if (d) {
      emsdk = path.join(own, d);
      if (!env.EM_CONFIG && fs.existsSync(path.join(DEFOLD, 'tmp/emscripten_config'))) env.EM_CONFIG = path.join(DEFOLD, 'tmp/emscripten_config');
      if (!env.EM_CACHE) env.EM_CACHE = path.join(DEFOLD, 'tmp/emcache');
    }
  }
  emsdk = emsdk || process.env.EMSDK;
  const variants = webgpu ? 'dual' : 'gl';
  run(process.execPath, [path.join(SDK, 'link.mjs'), project, '--out', engineDir, '--variant', variants, ...skipExts.flatMap(e => ['--skip-ext', e]), ...cartExts.flatMap(d => ['--ext', d]), ...(emsdk ? ['--emsdk', emsdk] : [])], { env });
}

// --- pack --------------------------------------------------------------------
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'wasmcart-defold-pack-'));
process.on('exit', () => fs.rmSync(stage, { recursive: true, force: true }));
for (const f of ['game.arci', 'game.arcd', 'game.dmanifest', 'game.projectc']) fs.copyFileSync(path.join(built, f), path.join(stage, f));

fs.mkdirSync(outDir, { recursive: true });
const engine = webgpu ? 'dmengine_wasmcart_dual.wasm' : 'dmengine_wasmcart.wasm';
const wasm = path.join(engineDir, engine);
if (!fs.existsSync(wasm)) fail(`no engine at ${wasm}; build wasmcart-defold first (see its README)${webgpu ? ', with DEFOLD_EMDAWNWEBGPU_PORT set for the dual engine, or pass --no-webgpu' : ''}`);
const out = path.join(outDir, `${name}.wasc`);
pack('--wasm', wasm, '--assets', stage, '--name', title, '--width', String(W), '--height', String(H), '--output', out);
console.log(`packed ${out} (${(fs.statSync(out).size / 1048576).toFixed(1)} MB, ${webgpu ? 'dual GL+WebGPU' : 'GL'})`);

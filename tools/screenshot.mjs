#!/usr/bin/env node
// screenshot.mjs <cart.wasc> <out.png> [--frames N] [--input F:buttons,...] [--width W] [--gpu gl|webgpu]
//
// Runs a cart on the wasmcart Node host (a dual cart on WebGPU when the host
// has it, else GL; --gpu chooses) with a fixed pad script and writes one frame as a PNG, scaled down to
// --width if given. For docs/screenshots: every image comes from the cart
// as it runs on the host, never from the editor.
//
//   --frames N        frame to capture (default 300)
//   --input F:a+b,... hold buttons from frame F for 10 frames (a, b, x, y,
//                     start, select, up, down, left, right); repeatable list
//   --width W         scale the PNG to W pixels wide (nearest, integer or 2:1 box)
//   --gpu gl|webgpu   the API to run a dual cart on (webgpu fails if the host
//                     cannot provide it)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const [cart, out] = args.filter(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const GPU = opt('--gpu', null);
if (!cart || !out || (GPU && GPU !== 'gl' && GPU !== 'webgpu')) { console.error('usage: screenshot.mjs <cart.wasc> <out.png> [--frames N] [--input F:buttons,...] [--width W] [--gpu gl|webgpu]'); process.exit(1); }
const FRAMES = Number(opt('--frames', 300));
const WIDTH = Number(opt('--width', 0));
const BITS = { a: 1, b: 2, x: 4, y: 8, start: 1 << 4, select: 1 << 5, up: 1 << 8, down: 1 << 9, left: 1 << 10, right: 1 << 11 };
const script = (opt('--input', '') || '').split(',').filter(Boolean).map(s => {
  const [f, b] = s.split(':');
  return { from: Number(f), to: Number(f) + 10, buttons: b.split('+').reduce((m, n) => m | (BITS[n] ?? 0), 0) };
});
const buttonsAt = f => script.reduce((m, s) => (f >= s.from && f < s.to ? m | s.buttons : m), 0);

// The wasmcart beside this repo, else the installed package.
const here = path.dirname(new URL(import.meta.url).pathname);
const sibling = path.resolve(here, '../../wasmcart/index.js');
const wasmcart = fs.existsSync(sibling) ? pathToFileURL(sibling).href : 'wasmcart';
const { CartHost } = await import(wasmcart);

const quiet = () => {};
const origErr = console.error;
console.log = console.error = console.warn = quiet;
const host = new CartHost();
await host.load(cart, { ...(GPU === 'gl' ? { wgpu: false } : {}), adapterOptions: { powerPreference: 'low-power' }, deterministic: { seed: 42, stepMs: 1000 / 60 } });
if (GPU === 'webgpu' && !host.usesWgpu) { origErr(`${cart}: asked for WebGPU, but the host ran it on GL`); process.exit(1); }
const tick = () => new Promise(r => setImmediate(r));
for (let f = 0; f < FRAMES; f++) {
  host.runFrame([{ connected: true, buttons: buttonsAt(f) }]);
  if (host.usesWgpu && f % 4 === 0) await tick();
}
let frame;
if (host.usesWgpu) {
  frame = await host.readGpuFrame();
} else {
  const ctx = host.getGlContext();
  const { width, height } = host.getInfo();
  const flipped = new Uint8Array(width * height * 4);
  host.withRenderedFrame(() => ctx.readPixels(0, 0, width, height, ctx.RGBA, ctx.UNSIGNED_BYTE, flipped));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) data.set(flipped.subarray((height - 1 - y) * width * 4, (height - y) * width * 4), y * width * 4);
  frame = { width, height, data };
}
let { width, height, data } = frame;
for (let i = 3; i < data.length; i += 4) data[i] = 255;
if (WIDTH && WIDTH < width) {
  // Box-filter to the target width (area average), keeping the aspect ratio.
  const w2 = WIDTH, h2 = Math.round(height * WIDTH / width);
  const d2 = new Uint8Array(w2 * h2 * 4);
  for (let y = 0; y < h2; y++) {
    const y0 = Math.floor(y * height / h2), y1 = Math.max(y0 + 1, Math.floor((y + 1) * height / h2));
    for (let x = 0; x < w2; x++) {
      const x0 = Math.floor(x * width / w2), x1 = Math.max(x0 + 1, Math.floor((x + 1) * width / w2));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * width + xx) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
      const o = (y * w2 + x) * 4; d2[o] = r / n; d2[o + 1] = g / n; d2[o + 2] = b / n; d2[o + 3] = 255;
    }
  }
  width = w2; height = h2; data = d2;
}
const T = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = buf => { let c = 0xffffffff; for (const x of buf) c = T[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(type), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc(height * (1 + width * 4));
for (let y = 0; y < height; y++) { raw[y * (1 + width * 4)] = 0; Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (1 + width * 4) + 1); }
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
// A frame that ran is not a frame that drew: say how many distinct colours
// it holds (sampled), so a black or single-colour picture is visible in a log.
const colours = new Set();
for (let i = 0; i < data.length; i += 64) colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
origErr(`${out}: ${width}x${height} at frame ${FRAMES} (${host.usesWgpu ? 'WebGPU' : 'GL'}), ${colours.size} colours${colours.size < 8 ? ' (BLANK?)' : ''}`);
host.destroy?.();
process.exit(0);

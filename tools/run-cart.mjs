#!/usr/bin/env node
// run-cart.mjs <cart.wasc> [--frames N] [--gpu gl|webgpu|each]
//
// Steps a cart headless on the wasmcart Node host and prints the cart's log
// plus `ran N frames WxH on GL|WebGPU`, the line CI requires. A dual cart runs
// on whichever API the host picks, so --gpu chooses:
//   gl      WebGPU disabled in the host
//   webgpu  WebGPU required (fails if the host ran the cart on GL)
//   each    on GL, then on WebGPU too when the cart is a dual cart
//           (gpu_api 2): one `ran` line per API
// Without --gpu the host picks, as `npx wasmcart` does.
//
// Every frame advances the cart's clock by exactly 1/60 s (the host's fixed
// step), whatever the machine's speed. On wall-clock time a fast GPU runs 420
// frames in under half a second and a test waiting on a 0.5 s timer or on
// physics settling fails; slow software GL passed the same cart.
//
// Exit 0 when every frame ran on every API asked for; 1 on a load error, a
// trap, a lost device, or the wrong API.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const cart = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const FRAMES = Number(opt('--frames', 120));
const GPU = opt('--gpu', null);
if (!cart || (GPU && !['gl', 'webgpu', 'each'].includes(GPU))) {
  console.error('usage: run-cart.mjs <cart.wasc> [--frames N] [--gpu gl|webgpu|each]');
  process.exit(1);
}

// The wasmcart beside this repo, else the installed package.
const here = path.dirname(new URL(import.meta.url).pathname);
const sibling = path.resolve(here, '../../wasmcart/index.js');
const wasmcart = fs.existsSync(sibling) ? pathToFileURL(sibling).href : 'wasmcart';
const { CartHost } = await import(wasmcart);

const GPU_API_WEBGPU = 2;
const tick = () => new Promise(r => setImmediate(r));

/** Runs the cart once; returns its gpu_api, or exits 1 on any failure. */
async function run(want) {
  const host = new CartHost();
  const loadOpts = want === 'gl' ? { wgpu: false } : { adapterOptions: { powerPreference: 'low-power' } };
  try {
    await host.load(cart, loadOpts);
  } catch (e) {
    console.error(`run-cart: ${cart} did not load: ${e.message}`);
    process.exit(1);
  }
  if (want === 'webgpu' && !host.usesWgpu) {
    console.error(`run-cart: asked for WebGPU, but the host ran ${cart} on GL (no WebGPU adapter, or not a WebGPU cart)`);
    process.exit(1);
  }
  host.setFixedStep(1000 / 60);
  let ran = 0;
  try {
    for (; ran < FRAMES; ran++) {
      host.runFrame([]);
      if (host.gpuLost) throw new Error(`GPU lost: ${JSON.stringify(host.gpuLost)}`);
      // A WebGPU cart's async results arrive on the event loop between frames.
      if (host.usesWgpu) await tick();
    }
  } catch (e) {
    console.error(`run-cart: cart trapped at frame ${ran}: ${e.message}`);
    process.exit(1);
  }
  const { width, height, gpuApi } = host.getInfo();
  console.log(`ran ${ran} frames  ${width}x${height} on ${host.usesWgpu ? 'WebGPU' : 'GL'}`);
  host.destroy?.();
  return gpuApi;
}

if (GPU === 'each') {
  if (await run('gl') === GPU_API_WEBGPU) await run('webgpu');
} else {
  await run(GPU);
}
process.exit(0);

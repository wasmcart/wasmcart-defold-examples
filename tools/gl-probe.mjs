// Report what EGL/GL this machine can actually provide, and exit non-zero if
// it cannot make a context, so CI fails here with a reason instead of later
// with twelve carts that silently never started.
import fs from 'node:fs';
console.log('--- software drivers');
for (const d of ['/usr/lib/x86_64-linux-gnu/dri', '/usr/lib/dri']) {
  try {
    const hits = fs.readdirSync(d).filter(f => /swrast|llvmpipe|zink/.test(f));
    console.log(' ', d, hits.join(' ') || '(none)');
  } catch { console.log(' ', d, '(missing)'); }
}
console.log('--- env');
for (const k of ['DISPLAY','LIBGL_ALWAYS_SOFTWARE','EGL_PLATFORM','GALLIUM_DRIVER'])
  console.log(' ', k, '=', process.env[k] ?? '(unset)');
console.log('--- context');
try {
  const { createWebGL2Context } = await import('webgl-node');
  const { gl } = createWebGL2Context(64, 64);
  if (!gl) { console.log('  FAIL: no context object'); process.exit(3); }
  console.log('  OK', gl.getParameter(gl.VERSION), '|', gl.getParameter(gl.RENDERER));
} catch (e) { console.log('  FAIL:', e.message); process.exit(3); }

// migrate-defold.mjs: rewrite Lua written for Defold 1.12 and older to the API
// the 1.14 engine has.
//
// Defold 1.13 removed its deprecated Lua APIs (releasenotes/1.13.0, "Removed
// deprecated Lua APIs and constants"). A game written before it compiles
// cleanly and then stops at run time ("attempt to call field 'get_config' (a
// nil value)"), and so do the libraries it depends on. build-cart.mjs applies
// this to its staged copy of the project and of every dependency zip, so the
// fetched sources and the patches stay exactly upstream's code plus our fixes.
//
// Only mechanical rewrites are made: renamed constants, and functions whose
// replacement takes the same arguments. The rest (model.play's options table,
// physics.ray_cast's callback, ...) cannot be rewritten without reading the
// code, so each use is reported with its file and line instead.

/** Renamed constants, the whole 1.13 table. */
const CONSTANTS = [
  ['render.STATE_DEPTH_TEST', 'graphics.STATE_DEPTH_TEST'],
  ['render.STATE_STENCIL_TEST', 'graphics.STATE_STENCIL_TEST'],
  ['render.STATE_ALPHA_TEST', 'graphics.STATE_ALPHA_TEST'],
  ['render.STATE_BLEND', 'graphics.STATE_BLEND'],
  ['render.STATE_CULL_FACE', 'graphics.STATE_CULL_FACE'],
  ['render.STATE_POLYGON_OFFSET_FILL', 'graphics.STATE_POLYGON_OFFSET_FILL'],
  ['render.FORMAT_LUMINANCE', 'graphics.TEXTURE_FORMAT_LUMINANCE'],
  ['render.FORMAT_RGBA', 'graphics.TEXTURE_FORMAT_RGBA'],
  ['render.FORMAT_DEPTH', 'graphics.TEXTURE_FORMAT_DEPTH'],
  ['render.FORMAT_STENCIL', 'graphics.TEXTURE_FORMAT_STENCIL'],
  ['render.RGB', 'graphics.TEXTURE_FORMAT_RGB'],
  ['render.RGB16F', 'graphics.TEXTURE_FORMAT_RGB16F'],
  ['render.RGB32F', 'graphics.TEXTURE_FORMAT_RGB32F'],
  ['render.RGBA16F', 'graphics.TEXTURE_FORMAT_RGBA16F'],
  ['render.RGBA32F', 'graphics.TEXTURE_FORMAT_RGBA32F'],
  ['render.R16F', 'graphics.TEXTURE_FORMAT_R16F'],
  ['render.RG16F', 'graphics.TEXTURE_FORMAT_RG16F'],
  ['render.R32F', 'graphics.TEXTURE_FORMAT_R32F'],
  ['render.RG32F', 'graphics.TEXTURE_FORMAT_RG32F'],
  ['render.FILTER_LINEAR', 'graphics.TEXTURE_FILTER_LINEAR'],
  ['render.FILTER_NEAREST', 'graphics.TEXTURE_FILTER_NEAREST'],
  ['render.WRAP_CLAMP_TO_BORDER', 'graphics.TEXTURE_WRAP_CLAMP_TO_BORDER'],
  ['render.WRAP_CLAMP_TO_EDGE', 'graphics.TEXTURE_WRAP_CLAMP_TO_EDGE'],
  ['render.WRAP_MIRRORED_REPEAT', 'graphics.TEXTURE_WRAP_MIRRORED_REPEAT'],
  ['render.WRAP_REPEAT', 'graphics.TEXTURE_WRAP_REPEAT'],
  ['render.BLEND_ZERO', 'graphics.BLEND_FACTOR_ZERO'],
  ['render.BLEND_ONE', 'graphics.BLEND_FACTOR_ONE'],
  ['render.BLEND_SRC_COLOR', 'graphics.BLEND_FACTOR_SRC_COLOR'],
  ['render.BLEND_ONE_MINUS_SRC_COLOR', 'graphics.BLEND_FACTOR_ONE_MINUS_SRC_COLOR'],
  ['render.BLEND_DST_COLOR', 'graphics.BLEND_FACTOR_DST_COLOR'],
  ['render.BLEND_ONE_MINUS_DST_COLOR', 'graphics.BLEND_FACTOR_ONE_MINUS_DST_COLOR'],
  ['render.BLEND_SRC_ALPHA', 'graphics.BLEND_FACTOR_SRC_ALPHA'],
  ['render.BLEND_ONE_MINUS_SRC_ALPHA', 'graphics.BLEND_FACTOR_ONE_MINUS_SRC_ALPHA'],
  ['render.BLEND_DST_ALPHA', 'graphics.BLEND_FACTOR_DST_ALPHA'],
  ['render.BLEND_ONE_MINUS_DST_ALPHA', 'graphics.BLEND_FACTOR_ONE_MINUS_DST_ALPHA'],
  ['render.BLEND_SRC_ALPHA_SATURATE', 'graphics.BLEND_FACTOR_SRC_ALPHA_SATURATE'],
  ['render.BLEND_CONSTANT_COLOR', 'graphics.BLEND_FACTOR_CONSTANT_COLOR'],
  ['render.BLEND_ONE_MINUS_CONSTANT_COLOR', 'graphics.BLEND_FACTOR_ONE_MINUS_CONSTANT_COLOR'],
  ['render.BLEND_CONSTANT_ALPHA', 'graphics.BLEND_FACTOR_CONSTANT_ALPHA'],
  ['render.BLEND_ONE_MINUS_CONSTANT_ALPHA', 'graphics.BLEND_FACTOR_ONE_MINUS_CONSTANT_ALPHA'],
  ['render.BLEND_EQUATION_ADD', 'graphics.BLEND_EQUATION_ADD'],
  ['render.BLEND_EQUATION_SUBTRACT', 'graphics.BLEND_EQUATION_SUBTRACT'],
  ['render.BLEND_EQUATION_REVERSE_SUBTRACT', 'graphics.BLEND_EQUATION_REVERSE_SUBTRACT'],
  ['render.BLEND_EQUATION_MIN', 'graphics.BLEND_EQUATION_MIN'],
  ['render.BLEND_EQUATION_MAX', 'graphics.BLEND_EQUATION_MAX'],
  ['render.COMPARE_FUNC_NEVER', 'graphics.COMPARE_FUNC_NEVER'],
  ['render.COMPARE_FUNC_LESS', 'graphics.COMPARE_FUNC_LESS'],
  ['render.COMPARE_FUNC_LEQUAL', 'graphics.COMPARE_FUNC_LEQUAL'],
  ['render.COMPARE_FUNC_GREATER', 'graphics.COMPARE_FUNC_GREATER'],
  ['render.COMPARE_FUNC_GEQUAL', 'graphics.COMPARE_FUNC_GEQUAL'],
  ['render.COMPARE_FUNC_EQUAL', 'graphics.COMPARE_FUNC_EQUAL'],
  ['render.COMPARE_FUNC_NOTEQUAL', 'graphics.COMPARE_FUNC_NOTEQUAL'],
  ['render.COMPARE_FUNC_ALWAYS', 'graphics.COMPARE_FUNC_ALWAYS'],
  ['render.STENCIL_OP_KEEP', 'graphics.STENCIL_OP_KEEP'],
  ['render.STENCIL_OP_ZERO', 'graphics.STENCIL_OP_ZERO'],
  ['render.STENCIL_OP_REPLACE', 'graphics.STENCIL_OP_REPLACE'],
  ['render.STENCIL_OP_INCR', 'graphics.STENCIL_OP_INCR'],
  ['render.STENCIL_OP_INCR_WRAP', 'graphics.STENCIL_OP_INCR_WRAP'],
  ['render.STENCIL_OP_DECR', 'graphics.STENCIL_OP_DECR'],
  ['render.STENCIL_OP_DECR_WRAP', 'graphics.STENCIL_OP_DECR_WRAP'],
  ['render.STENCIL_OP_INVERT', 'graphics.STENCIL_OP_INVERT'],
  ['render.FACE_FRONT', 'graphics.FACE_TYPE_FRONT'],
  ['render.FACE_BACK', 'graphics.FACE_TYPE_BACK'],
  ['render.FACE_FRONT_AND_BACK', 'graphics.FACE_TYPE_FRONT_AND_BACK'],
  ['render.BUFFER_COLOR_BIT', 'graphics.BUFFER_TYPE_COLOR0_BIT'],
  ['render.BUFFER_COLOR0_BIT', 'graphics.BUFFER_TYPE_COLOR0_BIT'],
  ['render.BUFFER_COLOR1_BIT', 'graphics.BUFFER_TYPE_COLOR1_BIT'],
  ['render.BUFFER_COLOR2_BIT', 'graphics.BUFFER_TYPE_COLOR2_BIT'],
  ['render.BUFFER_COLOR3_BIT', 'graphics.BUFFER_TYPE_COLOR3_BIT'],
  ['render.BUFFER_DEPTH_BIT', 'graphics.BUFFER_TYPE_DEPTH_BIT'],
  ['render.BUFFER_STENCIL_BIT', 'graphics.BUFFER_TYPE_STENCIL_BIT'],
  ['resource.TEXTURE_TYPE_2D', 'graphics.TEXTURE_TYPE_2D'],
  ['resource.TEXTURE_TYPE_CUBE_MAP', 'graphics.TEXTURE_TYPE_CUBE_MAP'],
  ['resource.TEXTURE_TYPE_2D_ARRAY', 'graphics.TEXTURE_TYPE_2D_ARRAY'],
  ['resource.TEXTURE_TYPE_IMAGE_2D', 'graphics.TEXTURE_TYPE_IMAGE_2D'],
  ['resource.BUFFER_TYPE_COLOR0_BIT', 'graphics.BUFFER_TYPE_COLOR0_BIT'],
  ['resource.BUFFER_TYPE_COLOR1_BIT', 'graphics.BUFFER_TYPE_COLOR1_BIT'],
  ['resource.BUFFER_TYPE_COLOR2_BIT', 'graphics.BUFFER_TYPE_COLOR2_BIT'],
  ['resource.BUFFER_TYPE_COLOR3_BIT', 'graphics.BUFFER_TYPE_COLOR3_BIT'],
  ['resource.BUFFER_TYPE_DEPTH_BIT', 'graphics.BUFFER_TYPE_DEPTH_BIT'],
  ['resource.BUFFER_TYPE_STENCIL_BIT', 'graphics.BUFFER_TYPE_STENCIL_BIT'],
  ['resource.TEXTURE_USAGE_FLAG_SAMPLE', 'graphics.TEXTURE_USAGE_FLAG_SAMPLE'],
  ['resource.TEXTURE_USAGE_FLAG_MEMORYLESS', 'graphics.TEXTURE_USAGE_FLAG_MEMORYLESS'],
  ['resource.TEXTURE_USAGE_FLAG_STORAGE', 'graphics.TEXTURE_USAGE_FLAG_STORAGE'],
  ['resource.TEXTURE_FORMAT_LUMINANCE', 'graphics.TEXTURE_FORMAT_LUMINANCE'],
  ['resource.TEXTURE_FORMAT_RGB', 'graphics.TEXTURE_FORMAT_RGB'],
  ['resource.TEXTURE_FORMAT_RGBA', 'graphics.TEXTURE_FORMAT_RGBA'],
  ['resource.TEXTURE_FORMAT_DEPTH', 'graphics.TEXTURE_FORMAT_DEPTH'],
  ['resource.TEXTURE_FORMAT_STENCIL', 'graphics.TEXTURE_FORMAT_STENCIL'],
  ['resource.TEXTURE_FORMAT_RGB_PVRTC_2BPPV1', 'graphics.TEXTURE_FORMAT_RGB_PVRTC_2BPPV1'],
  ['resource.TEXTURE_FORMAT_RGB_PVRTC_4BPPV1', 'graphics.TEXTURE_FORMAT_RGB_PVRTC_4BPPV1'],
  ['resource.TEXTURE_FORMAT_RGBA_PVRTC_2BPPV1', 'graphics.TEXTURE_FORMAT_RGBA_PVRTC_2BPPV1'],
  ['resource.TEXTURE_FORMAT_RGBA_PVRTC_4BPPV1', 'graphics.TEXTURE_FORMAT_RGBA_PVRTC_4BPPV1'],
  ['resource.TEXTURE_FORMAT_RGB_ETC1', 'graphics.TEXTURE_FORMAT_RGB_ETC1'],
  ['resource.TEXTURE_FORMAT_RGBA_ETC2', 'graphics.TEXTURE_FORMAT_RGBA_ETC2'],
  ['resource.TEXTURE_FORMAT_RGBA_ASTC_4x4', 'graphics.TEXTURE_FORMAT_RGBA_ASTC_4x4'],
  ['resource.TEXTURE_FORMAT_RGB_BC1', 'graphics.TEXTURE_FORMAT_RGB_BC1'],
  ['resource.TEXTURE_FORMAT_RGBA_BC3', 'graphics.TEXTURE_FORMAT_RGBA_BC3'],
  ['resource.TEXTURE_FORMAT_R_BC4', 'graphics.TEXTURE_FORMAT_R_BC4'],
  ['resource.TEXTURE_FORMAT_RG_BC5', 'graphics.TEXTURE_FORMAT_RG_BC5'],
  ['resource.TEXTURE_FORMAT_RGBA_BC7', 'graphics.TEXTURE_FORMAT_RGBA_BC7'],
  ['resource.TEXTURE_FORMAT_RGB16F', 'graphics.TEXTURE_FORMAT_RGB16F'],
  ['resource.TEXTURE_FORMAT_RGB32F', 'graphics.TEXTURE_FORMAT_RGB32F'],
  ['resource.TEXTURE_FORMAT_RGBA16F', 'graphics.TEXTURE_FORMAT_RGBA16F'],
  ['resource.TEXTURE_FORMAT_RGBA32F', 'graphics.TEXTURE_FORMAT_RGBA32F'],
  ['resource.TEXTURE_FORMAT_R16F', 'graphics.TEXTURE_FORMAT_R16F'],
  ['resource.TEXTURE_FORMAT_RG16F', 'graphics.TEXTURE_FORMAT_RG16F'],
  ['resource.TEXTURE_FORMAT_R32F', 'graphics.TEXTURE_FORMAT_R32F'],
  ['resource.TEXTURE_FORMAT_RG32F', 'graphics.TEXTURE_FORMAT_RG32F'],
  ['resource.COMPRESSION_TYPE_DEFAULT', 'graphics.COMPRESSION_TYPE_DEFAULT'],
  ['resource.COMPRESSION_TYPE_BASIS_UASTC', 'graphics.COMPRESSION_TYPE_BASIS_UASTC'],
];

/** Functions whose replacement takes the same arguments. */
const FUNCTIONS = [
  ['sys.get_config', 'sys.get_config_string'],          // both return the string value
  ['go.get_scale_vector', 'go.get_scale'],
  ['go.delete_all', 'go.delete'],                       // go.delete takes the same id table
  ['vmath.matrix4_from_quat', 'vmath.matrix4_quat'],
  ['model.set_constant', 'go.set'],                     // (url, constant, value) in both
  ['sprite.set_constant', 'go.set'],
  ['tilemap.set_constant', 'go.set'],
  ['render.enable_render_target', 'render.set_render_target'],
  ['gui.cancel_animation', 'gui.cancel_animations'],           // (node, property) in both
];

/** Removed with no same-argument replacement: reported, never rewritten. */
const MANUAL = ['camera.acquire_focus', 'camera.release_focus', 'label.get_text_metrics', 'model.play',
  'physics.set_listener', 'physics.ray_cast', 'gui.get_text_metrics', 'gui.get_text_metrics_from_node',
  'render.draw_debug2d'];

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RULES = [
  ...CONSTANTS.map(([a, b]) => [new RegExp(`\\b${esc(a)}\\b`, 'g'), b]),
  ...FUNCTIONS.map(([a, b]) => [new RegExp(`\\b${esc(a)}(\\s*\\()`, 'g'), `${b}$1`]),
  // disable_render_target(rt) went back to the default target.
  [/\brender\.disable_render_target\s*\([^()]*\)/g, 'render.set_render_target(render.RENDER_TARGET_DEFAULT)'],
];
const MANUAL_RE = new RegExp(`\\b(${MANUAL.map(esc).join('|')})\\s*\\(`, 'g');

/** The file kinds that hold Lua. */
export const LUA_FILE = /\.(lua|script|gui_script|render_script|editor_script)$/;

/**
 * Migrate one file's text.
 * @param {string} text
 * @returns {{ text: string, changes: number, manual: { line: number, api: string }[] }}
 */
export function migrateLua(text) {
  let changes = 0;
  for (const [re, to] of RULES) text = text.replace(re, (...m) => { changes++; return typeof to === 'string' ? to.replace('$1', m[1] ?? '') : to; });
  const manual = [];
  text.split('\n').forEach((l, i) => { for (const m of l.matchAll(MANUAL_RE)) manual.push({ line: i + 1, api: m[1] }); });
  return { text, changes, manual };
}

/**
 * Builtins that moved or went away: the Collada meshes became glTF (Defold no
 * longer reads Collada at all), and the system font was folded into the
 * default one. Resource files name them by path.
 */
const BUILTIN_RENAMES = [
  [/\/builtins\/assets\/meshes\/(quad|quad_2x2|cube|sphere)\.dae\b/g, '/builtins/assets/gltf/$1.gltf'],
  [/\/builtins\/fonts\/system_font\.font\b/g, '/builtins/fonts/default.font'],
];

/** Text resource files that can name a builtin. */
export const RESOURCE_FILE = /\.(go|collection|model|gui|material|particlefx|font|label|sprite|tilemap|collisionobject|mesh|render|atlas|texture_profiles|display_profiles|input_binding|sound|camera|factory|collectionfactory|collectionproxy|project)$/;

/**
 * Migrate one resource file's text.
 * @param {string} text
 * @returns {{ text: string, changes: number }}
 */
export function migrateResource(text) {
  let changes = 0;
  for (const [re, to] of BUILTIN_RENAMES) text = text.replace(re, (...m) => { changes++; return to.replace('$1', m[1]); });
  return { text, changes };
}

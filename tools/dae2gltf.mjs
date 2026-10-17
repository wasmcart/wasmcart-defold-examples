#!/usr/bin/env node
// dae2gltf.mjs <in.dae> <out.gltf>: convert a static Collada mesh to glTF.
//
// Defold 1.14 no longer reads Collada (bob: "Unsupported resource type for
// 'mesh'"), and Blender 5 no longer imports it, so a game written for an older
// Defold needs its .dae models converted. This uses three.js's own Collada
// loader and glTF exporter. Geometry only (positions, normals, UVs, vertex
// colours): a Defold .model names its material and textures separately, and
// the scene graph's transforms are baked into the vertices. Skinned or
// animated Collada is refused rather than half converted.
//
// Needs: npm install --no-save three@0.180.0 @xmldom/xmldom@0.9.8
import fs from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import * as THREE from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) { console.error('usage: dae2gltf.mjs <in.dae> <out.gltf>'); process.exit(1); }

// ColladaLoader parses with the browser's DOMParser and FileReader.
globalThis.DOMParser = DOMParser;
globalThis.FileReader = class {
  readAsDataURL(blob) { blob.arrayBuffer().then(b => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`; this.onloadend?.(); }); }
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(b => { this.result = b; this.onloadend?.(); }); }
};

// Textures are not needed (the .model names its own) and would need a DOM.
THREE.TextureLoader.prototype.load = () => new THREE.Texture();

let text = fs.readFileSync(inPath, 'utf8');
// ColladaLoader reads TEXCOORD set 0 as uv and set 1 as uv1, and drops any
// higher set. Exporters number from 0, 1 or even 2, and Defold read whichever
// set a mesh had, so a file with one UV set is renumbered to set 0.
const sets = new Set([...text.matchAll(/<input semantic="TEXCOORD"[^>]*\bset="(\d+)"/g)].map(m => m[1]));
if (sets.size === 1) text = text.replace(/(<input semantic="TEXCOORD"[^>]*\bset=")\d+"/g, '$10"');
if (/<controller[\s>]/.test(text) || /<animation[\s>]/.test(text)) {
  console.error(`dae2gltf: ${inPath} is skinned or animated; this converter only handles static meshes`);
  process.exit(1);
}
const collada = new ColladaLoader().parse(text, '');
// ColladaLoader turns a Z-up file Y-up and applies <unit> at the root, which
// is what Defold's own Collada import did (ColladaUtil.getAssetSpace: y' = z,
// z' = -y, scaled by unit.meter), so baking the root keeps every model where
// the game placed it.
collada.scene.updateMatrixWorld(true);

// One mesh, transforms baked: Defold draws a .model's mesh as one primitive
// set with the model component's own transform.
const parts = [];
collada.scene.traverse(o => {
  if (!o.isMesh) return;
  const g = o.geometry.clone();
  g.applyMatrix4(o.matrixWorld);
  // Exporters number TEXCOORD sets from 0 or from 1, and ColladaLoader names
  // set 1 'uv1'. Defold read the first set there was, so that becomes the UVs.
  if (!g.attributes.uv) {
    const first = ['uv1', 'uv2', 'uv3'].find(n => g.attributes[n]);
    if (first) g.setAttribute('uv', g.attributes[first]);
  }
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
  if (g.index) parts.push(g.toNonIndexed()); else parts.push(g);
});
if (!parts.length) { console.error(`dae2gltf: no meshes in ${inPath}`); process.exit(1); }
const attrs = new Set(parts.flatMap(g => Object.keys(g.attributes)));
for (const g of parts) {
  const n = g.attributes.position.count;
  if (attrs.has('uv') && !g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (attrs.has('normal') && !g.attributes.normal) g.computeVertexNormals();
  if (attrs.has('color') && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  g.clearGroups();
}
const merged = mergeGeometries(parts, false);
const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial());
mesh.name = 'mesh';
const scene = new THREE.Scene();
scene.add(mesh);

const gltf = await new GLTFExporter().parseAsync(scene, { binary: false, onlyVisible: false });
fs.writeFileSync(outPath, JSON.stringify(gltf));
console.log(`${outPath}: ${merged.attributes.position.count / 3} triangles from ${parts.length} mesh${parts.length > 1 ? 'es' : ''}`);

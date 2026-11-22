// Downloads + optimizes the CC0 assets of the 3D world (Poly Haven, CC0 — no attribution required).
// Output: public/media/world/{sky,tex,models}/
//
// Usage: npm run world-assets            (skips files that already exist)
//        npm run world-assets -- --force
//
// Sky:      1k HDR (lighting / env map) + the tonemapped sky as a 4096×2048 WebP (the visible background).
// Textures: 1k diffuse / normal (GL) / ARM (ao-rough-metal) → WebP.
// Models:   1k glTF → gltf-transform: weld + simplify + meshopt + WebP textures (one .glb each).
import { mkdir, writeFile, access, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'media', 'world');
const TMP = path.join(ROOT, '.check', 'world-src');
const force = process.argv.includes('--force');
const UA = { 'User-Agent': 'asset-fetch/1.0' };

const SKY = 'kloofendal_48d_partly_cloudy_puresky';
/** [poly haven id, local name, resolution] */
const TEXTURES = [
  ['red_sandstone_wall', 'sandstone', '1k'],
  ['white_plaster_rough_01', 'plaster', '1k'],
  ['red_sandstone_pavement', 'paving', '1k'],
];
/** [id, simplify ratio (fraction of triangles kept)] */
const MODELS = [
  ['quiver_tree_01', 0.16],
  ['shrub_01', 0.14],
  ['shrub_03', 0.2],
];

const exists = (p) => access(p).then(() => true, () => false);
async function get(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (err) {
      if (i >= tries) throw err;
      console.log(`  retry ${i} ${path.basename(url)}`);
      await new Promise((res) => setTimeout(res, 1500 * i));
    }
  }
}
const files = (id) => get(`https://api.polyhaven.com/files/${id}`).then((b) => JSON.parse(b.toString()));

async function sky() {
  const dir = path.join(OUT, 'sky');
  await mkdir(dir, { recursive: true });
  const hdr = path.join(dir, 'sky-1k.hdr');
  const bg = path.join(dir, 'sky.webp');
  if (!force && (await exists(hdr)) && (await exists(bg))) return console.log('• sky (cached)');
  const f = await files(SKY);
  await writeFile(hdr, await get(f.hdri['1k'].hdr.url));
  await sharp(await get(f.tonemapped.url), { limitInputPixels: false }).resize(4096, 2048).webp({ quality: 86 }).toFile(bg);
  console.log('• sky');
}

async function textures() {
  const dir = path.join(OUT, 'tex');
  await mkdir(dir, { recursive: true });
  for (const [id, name, res] of TEXTURES) {
    const target = path.join(dir, `${name}-diff.webp`);
    if (!force && (await exists(target))) {
      console.log(`• ${name} (cached)`);
      continue;
    }
    const f = await files(id);
    for (const [key, suffix, q] of [['Diffuse', 'diff', 84], ['nor_gl', 'nor', 90], ['arm', 'arm', 86]]) {
      const src = await get(f[key][res].jpg.url);
      await sharp(src).webp({ quality: q }).toFile(path.join(dir, `${name}-${suffix}.webp`));
    }
    console.log(`• ${name}`);
  }
}

async function models() {
  const dir = path.join(OUT, 'models');
  await mkdir(dir, { recursive: true });
  for (const [id, ratio] of MODELS) {
    const target = path.join(dir, `${id}.glb`);
    if (!force && (await exists(target))) {
      console.log(`• ${id} (cached)`);
      continue;
    }
    const src = path.join(TMP, id);
    await mkdir(path.join(src, 'textures'), { recursive: true });
    const g = (await files(id)).gltf['1k'].gltf;
    await writeFile(path.join(src, `${id}.gltf`), await get(g.url));
    for (const [rel, inc] of Object.entries(g.include)) await writeFile(path.join(src, rel), await get(inc.url));
    const cli = (...args) => execFileSync('npx', ['--yes', '@gltf-transform/cli@4', ...args], { stdio: 'inherit', shell: true });
    const tmp1 = path.join(src, 'a.glb');
    cli('weld', path.join(src, `${id}.gltf`), tmp1);
    const tmp2 = path.join(src, 'b.glb');
    cli('simplify', tmp1, tmp2, '--ratio', String(ratio), '--error', '0.002');
    const tmp3 = path.join(src, 'c.glb');
    cli('webp', tmp2, tmp3, '--quality', '82');
    cli('meshopt', tmp3, target);
    console.log(`• ${id}`);
  }
}

await sky();
await textures();
await models();
await rm(TMP, { recursive: true, force: true });
console.log(`\n✓ world assets in ${path.relative(ROOT, OUT)}/`);

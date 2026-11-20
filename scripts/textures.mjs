// Downloads the Earth maps once into .cache/earth-src and writes compressed WebP
// versions to public/textures/earth/{hd,sd}.
// Source: Solar System Scope (CC BY 4.0), as resized/merged in the three.js repo.
// Usage: npm run textures   (add --force to re-encode)
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(ROOT, '.cache', 'earth-src');
const OUT_DIR = path.join(ROOT, 'public', 'textures', 'earth');
const BASE = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/';
const force = process.argv.includes('--force');

const sources = {
  day: 'earth_day_4096.jpg',
  night: 'earth_night_4096.jpg',
  packed: 'earth_bump_roughness_clouds_4096.jpg', // R bump · G roughness (ocean) · B clouds
  normal: 'earth_normal_2048.jpg',
};

const exists = (p) => access(p).then(() => true, () => false);

async function download(name, file) {
  const dest = path.join(SRC_DIR, file);
  if (await exists(dest)) return dest;
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`  ↓ ${name} (${file})`);
  return dest;
}

// tier → width per map. Heights are width / 2 (equirectangular).
const sizes = {
  hd: { day: 4096, night: 4096, clouds: 4096, ocean: 2048, normal: 2048 },
  sd: { day: 2048, night: 2048, clouds: 2048, ocean: 1024, normal: 1024 },
};

async function main() {
  await mkdir(SRC_DIR, { recursive: true });
  const src = {};
  for (const [name, file] of Object.entries(sources)) src[name] = await download(name, file);

  for (const [tier, s] of Object.entries(sizes)) {
    const dir = path.join(OUT_DIR, tier);
    await mkdir(dir, { recursive: true });
    const jobs = [
      // colour maps: lossy WebP is fine
      ['day', sharp(src.day).resize(s.day, s.day / 2).webp({ quality: 84 })],
      ['night', sharp(src.night).resize(s.night, s.night / 2).webp({ quality: 82 })],
      ['normal', sharp(src.normal).resize(s.normal, s.normal / 2).webp({ quality: 90 })],
      // data maps: split channels into greyscale so lossy chroma never bleeds between them
      ['clouds', sharp(src.packed).extractChannel('blue').resize(s.clouds, s.clouds / 2).webp({ quality: 82 })],
      ['ocean', sharp(src.packed).extractChannel('green').negate().resize(s.ocean, s.ocean / 2).webp({ quality: 85 })],
    ];
    for (const [name, pipeline] of jobs) {
      const out = path.join(dir, `${name}.webp`);
      if (!force && (await exists(out))) continue;
      const info = await pipeline.toFile(out);
      console.log(`  ✓ ${tier}/${name}.webp  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

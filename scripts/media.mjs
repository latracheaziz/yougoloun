// Brand images + portfolio placeholders → optimized WebP in public/media/.
//
// Usage:
//   node scripts/media.mjs --brand <studio> <social> <analytics>   (client images, any size/format)
//   node scripts/media.mjs --placeholders                          (art-directed project placeholders)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'media');
const args = process.argv.slice(2);

async function brand([studio, social, analytics]) {
  const dir = path.join(OUT, 'brand');
  await mkdir(dir, { recursive: true });
  for (const [name, src] of Object.entries({ studio, social, analytics })) {
    if (!src) throw new Error(`missing source for ${name}`);
    for (const [suffix, width] of [['', 1800], ['-sm', 900]]) {
      const info = await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, `${name}${suffix}.webp`));
      console.log(`  ✓ brand/${name}${suffix}.webp  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
    }
  }
}

/** Placeholder art per project, in its accent palette, clearly marked as a placeholder. */
const PROJECTS = {
  // brand palette only (src/config/palette.ts): blue, green, navy
  hajiss: { bg: ['#0F3550', '#2C7DB5', '#6CC4EE'], accent: '#DFF1FB', title: 'Hajiss Cafe', motif: 'steam' },
  ghalia: { bg: ['#1C3511', '#5E8F33', '#9CC566'], accent: '#EEF6E2', title: 'Ghalia Chocolate', motif: 'facets' },
  odun: { bg: ['#14142E', '#2B2A5C', '#3A9AD3'], accent: '#CFEAF8', title: 'Odun Pide', motif: 'embers' },
};

function motif(kind, accent) {
  if (kind === 'steam')
    return [0, 1, 2, 3, 4]
      .map((i) => `<path d="M${520 + i * 140} 1100 C ${470 + i * 140} 860, ${640 + i * 140} 720, ${560 + i * 140} 480 S ${600 + i * 140} 160, ${560 + i * 140} 40" fill="none" stroke="${accent}" stroke-opacity="${0.1 + i * 0.04}" stroke-width="${18 - i * 2}" stroke-linecap="round"/>`)
      .join('');
  if (kind === 'facets')
    return Array.from({ length: 9 }, (_, i) => {
      const x = 260 + (i % 3) * 380;
      const y = 180 + Math.floor(i / 3) * 280;
      return `<rect x="${x}" y="${y}" width="300" height="220" rx="28" fill="${accent}" fill-opacity="${0.05 + (i % 4) * 0.035}" stroke="${accent}" stroke-opacity="0.35"/>`;
    }).join('');
  return Array.from({ length: 70 }, (_, i) => {
    const x = (i * 197) % 1600;
    const y = 1100 - ((i * 131) % 900);
    const r = 2 + (i % 5) * 1.6;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${accent}" fill-opacity="${0.25 + (i % 6) * 0.1}"/>`;
  }).join('');
}

async function placeholders() {
  for (const [slug, p] of Object.entries(PROJECTS)) {
    const dir = path.join(OUT, 'work', slug);
    await mkdir(dir, { recursive: true });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1100" viewBox="0 0 1600 1100">
      <defs>
        <radialGradient id="g" cx="62%" cy="38%" r="85%">
          <stop offset="0" stop-color="${p.bg[2]}"/><stop offset="0.45" stop-color="${p.bg[1]}"/><stop offset="1" stop-color="${p.bg[0]}"/>
        </radialGradient>
        <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.08 0"/></filter>
      </defs>
      <rect width="1600" height="1100" fill="url(#g)"/>
      ${motif(p.motif, p.accent)}
      <rect width="1600" height="1100" filter="url(#n)"/>
      <text x="80" y="1010" font-family="Arial, sans-serif" font-size="30" letter-spacing="6" fill="${p.accent}" fill-opacity="0.7">PLACEHOLDER — ${p.title.toUpperCase()}</text>
    </svg>`;
    const info = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(path.join(dir, 'cover.webp'));
    console.log(`  ✓ work/${slug}/cover.webp  ${(info.size / 1024).toFixed(0)} KB`);
  }
}

if (args[0] === '--brand') await brand(args.slice(1));
else if (args[0] === '--placeholders') await placeholders();
else console.log('Usage: node scripts/media.mjs --brand <studio> <social> <analytics> | --placeholders');

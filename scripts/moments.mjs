// Screenshots of the journey's key moments at exact scroll positions (desktop + mobile),
// plus a contact sheet. Output: .check/moments/
//
// Usage: npm run moments                 (/ar, the key moments)
//        npm run moments -- --all        (extra in-between moments for review)
//        npm run moments -- --lang=en
//        npm run moments -- --reduced   (prefers-reduced-motion)
//        npm run moments -- --fps       (rough frame-rate probe per moment)
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.check', 'moments');
const all = process.argv.includes('--all');
const reduced = process.argv.includes('--reduced');
const fps = process.argv.includes('--fps');
const query = (process.argv.find((a) => a.startsWith('--query=')) ?? '--query=').split('=')[1];
const lang = (process.argv.find((a) => a.startsWith('--lang=')) ?? '--lang=ar').split('=')[1];

/** [file name, section id, local progress p] */
const KEY = [
  ['1-gulf-arcs', 'about', 0.86],
  ['2-rings-intersect', 'cornerstones', 0.95],
  ['3-mid-dive', 'positioning', 0.5],
  ['4-landing-pin', 'landing', 0.88],
];
const EXTRA = [
  ['0-hero', 'home', 0],
  ['2a-rings-lighting', 'cornerstones', 0.45],
  ['3a-dive-start', 'positioning', 0.25],
  ['3b-dive-swap', 'positioning', 0.62],
  ['3c-hail-from-above', 'positioning', 0.85],
  ['5-services', 'services', 0.5],
  ['6-portfolio', 'portfolio', 0.5],
  ['7-nightfall', 'process', 0.6],
  ['8-faq-sky', 'faq', 0.6],
  ['9-rise', 'contact', 0.25],
  ['9b-back-to-earth', 'contact', 0.95],
];
const moments = all ? [...KEY, ...EXTRA].sort((a, b) => a[0].localeCompare(b[0])) : KEY;

const viewports = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

async function launch() {
  const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--enable-unsafe-swiftshader'];
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true, args });
    } catch {}
  }
  throw new Error('No Edge or Chrome found for Playwright.');
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5198, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await launch();
  const errors = [];
  const shots = { desktop: [], mobile: [] };

  try {
    for (const [size, opts] of Object.entries(viewports)) {
      const context = await browser.newContext({ ...opts, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(`[${size}] ${e.message}`));
      page.on('console', (m) => m.type() === 'error' && errors.push(`[${size}] ${m.text()}`));
      await page.goto(`${base}/${lang}${query ? '?' + query : ''}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('canvas');
      await page.waitForTimeout(5000); // textures + terrain worker

      for (const [name, id, p] of moments) {
        const y = await page.evaluate(
          ([id, p]) => {
            const el = document.querySelector(`[data-track="${id}"]`);
            return el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * p;
          },
          [id, p],
        );
        await page.evaluate((y) => window.scrollTo(0, y), Math.round(y));
        await page.waitForTimeout(1600);
        let rate = '';
        if (fps) {
          const f = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res((n * 1000) / (performance.now() - t0)); }; requestAnimationFrame(tick); }));
          rate = `  ${f.toFixed(0)} fps`;
        }
        const file = path.join(OUT, `${size}-${name}.png`);
        await page.screenshot({ path: file });
        shots[size].push({ file, name });
        console.log(`• ${size} ${name}${rate}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // contact sheets: one grid per viewport
  const grid = { desktop: { w: 640, h: 400, cols: 4 }, mobile: { w: 234, h: 506, cols: 8 } };
  const gap = 14;
  for (const size of ['desktop', 'mobile']) {
    const { w, h, cols } = grid[size];
    const n = shots[size].length;
    const c = Math.min(cols, n);
    const rows = Math.ceil(n / c);
    const tiles = await Promise.all(shots[size].map((s) => sharp(s.file).resize(w, h).png().toBuffer()));
    await sharp({ create: { width: gap + c * (w + gap), height: gap + rows * (h + gap), channels: 3, background: '#05070D' } })
      .composite(tiles.map((input, i) => ({ input, left: gap + (i % c) * (w + gap), top: gap + Math.floor(i / c) * (h + gap) })))
      .png()
      .toFile(path.join(OUT, `contact-${size}.png`));
  }

  if (errors.length) {
    console.log(`\n✗ ${errors.length} error(s):`);
    for (const e of [...new Set(errors)]) console.log('  ' + e);
    process.exit(1);
  }
  console.log(`\n✓ ${moments.length * 2} screenshots + contact sheets in ${path.relative(ROOT, OUT)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

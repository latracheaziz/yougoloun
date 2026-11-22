// Screenshots of key moments at exact scroll positions — desktop + mobile, AR + EN — plus
// contact sheets. Output: .check/moments/
//
// Usage: npm run moments                  (key moments, ar + en)
//        npm run moments -- --all         (also the space-part scenes)
//        npm run moments -- --space       (only the 3D journey, densely sampled)
//        npm run moments -- --only=h      (only moments whose name starts with h)
//        npm run moments -- --lang=en     (one language)
//        npm run moments -- --reduced     (prefers-reduced-motion)
//        npm run moments -- --fps         (rough frame-rate probe per moment)
//        npm run moments -- --query=nofx  (append a dev query string, e.g. nofx or tier=low)
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.check', 'moments');
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const all = process.argv.includes('--all');
const space = process.argv.includes('--space');
const reduced = process.argv.includes('--reduced');
const fps = process.argv.includes('--fps');
const query = arg('query') ?? '';
const langs = (arg('lang') ?? 'ar,en').split(',');

/**
 * [name, where, action]
 * where: { track, p } → a point of a space track · { selector, vh } → element top + vh × viewport height
 * action (optional): { hover: selector } (desktop) / { tap: selector } (mobile)
 */
const KEY = [
  ['1-dive-clouds', { track: 'positioning', p: 0.44 }],
  ['2-clouds-to-paper', { track: 'positioning', p: 0.72 }],
  ['3-arrival', { selector: '#statements', vh: -0.9 }],
  ['3b-statements', { selector: '#statements', vh: 1.4 }],
  ['3c-word-from', { selector: '#statements', vh: 0.04 }],
  ['3d-word-morph', { selector: '#statements', vh: 0.3 }],
  ['3e-word-to', { selector: '#statements', vh: 0.7 }],
  ['4-services', { selector: '#services', vh: 0.62 }, { hover: '#services li:nth-child(4) button', tap: '#services li:nth-child(4) button' }],
  ['4b-buzz', { selector: '#buzz', vh: 0.12 }],
  ['4c-buzz-lower', { selector: '#buzz', vh: 0.85 }],
  ['4d-studio', { selector: '#studio', vh: 0.1 }, { hover: '#studio [data-cursor="drag"]' }],
  ['5-portfolio', { selector: '#portfolio', vh: 0.02 }, { hover: '#portfolio article:first-of-type img' }],
  ['5b-portfolio-scrolled', { selector: '#portfolio', vh: 0.9 }],
  // process pins for 3 × 85svh (desktop): step i is in the middle at vh = 2.55 × (i + 0.5) / 4
  ['6a-process-audit', { selector: '#process', vh: 0.32 }],
  ['6b-process-strategy', { selector: '#process', vh: 0.96 }],
  ['6c-process-launch', { selector: '#process', vh: 1.59 }],
  ['6d-process-scale', { selector: '#process', vh: 2.23 }],
  ['7-contact', { selector: '#contact', vh: 0.02 }],
  ['7b-contact-details', { selector: '#contact', vh: 0.9 }],
];
const SPACE = [
  ['0a-hero', { track: 'home', p: 0 }],
  ['0b-gulf-arcs', { track: 'about', p: 0.86 }],
  ['0c-rings-meet', { track: 'cornerstones', p: 0.95 }],
  ['0d-statements', { selector: '#statements', vh: 0.2 }],
  ['0e-platforms', { selector: '#services', vh: 3.2 }],
  ['0f-faq', { selector: '#faq', vh: 0.1 }],
  ['0g-footer', { selector: 'footer', vh: -0.2 }],
];
/** The 3D journey, densely sampled (--space). */
const JOURNEY = [
  ['s1-hero', { track: 'home', p: 0 }],
  ['s1b-hero-burst', { track: 'home', p: 0 }, { burst: true }],
  ['s2-hero-late', { track: 'home', p: 0.8 }],
  ['s3-about-in', { track: 'about', p: 0.3 }],
  ['s4-about', { track: 'about', p: 0.75 }],
  ['s5-corner-in', { track: 'cornerstones', p: 0.15 }],
  ['s6-corner-reveal', { track: 'cornerstones', p: 0.55 }],
  ['s7-corner-meet', { track: 'cornerstones', p: 0.95 }],
  ['s7b-corner-burst', { track: 'cornerstones', p: 0.95 }, { burst: true }],
  ['s7c-planet-focus', { track: 'cornerstones', p: 0.8 }, { focus: 2 }],
  ['s8-dive', { track: 'positioning', p: 0.2 }],
  ['s9-dive-clouds', { track: 'positioning', p: 0.4 }],
  // word of mouth (arrival, 320vh, right before #statements): progress p ↔ vh = -4.2 + 3.2p
  ['w1-hail', { selector: '#statements', vh: -4.2 + 3.2 * 0.12 }],
  ['w2-spreading', { selector: '#statements', vh: -4.2 + 3.2 * 0.35 }],
  ['w3-cities', { selector: '#statements', vh: -4.2 + 3.2 * 0.58 }],
  ['w4-region', { selector: '#statements', vh: -4.2 + 3.2 * 0.9 }],
  ['w5-broadcast', { selector: '#statements', vh: -4.2 + 3.2 * 0.9 }, { burst: true }],
];
const only = arg('only');
const moments = (space ? JOURNEY : all ? [...SPACE, ...KEY] : KEY).filter(([name]) => !only || only.split(',').some((o) => name.startsWith(o)));

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
  const shots = {};

  try {
    for (const lang of langs) {
      for (const [size, opts] of Object.entries(viewports)) {
        const key = `${lang}-${size}`;
        shots[key] = [];
        const context = await browser.newContext({ ...opts, reducedMotion: reduced ? 'reduce' : 'no-preference' });
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(`[${key}] ${e.message}`));
        page.on('console', (m) => m.type() === 'error' && errors.push(`[${key}] ${m.text()}`));
        await page.goto(`${base}/${lang}${query ? '?' + query : ''}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('canvas');
        await page.waitForTimeout(4000);

        for (const [name, where, action] of moments) {
          const y = await page.evaluate((w) => {
            if (w.track) {
              const el = document.querySelector(`[data-track="${w.track}"]`);
              return el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * w.p;
            }
            const el = document.querySelector(w.selector);
            return el.getBoundingClientRect().top + window.scrollY + window.innerHeight * w.vh;
          }, where);
          await page.mouse.move(5, 5);
          await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, Math.round(y)));
          await page.waitForTimeout(1700);
          if (action?.hover && size === 'desktop') {
            const box = await page.locator(action.hover).first().boundingBox();
            if (box) {
              await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5, { steps: 8 });
              await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.45, { steps: 8 });
              await page.waitForTimeout(900);
            }
          } else if (action?.focus !== undefined) {
            // fly to a cornerstone planet (dev store handle), let ~40 frames of the flight play
            await page.evaluate((i) => window.__app.getState().setFocus(i), action.focus);
            await page.evaluate(() => new Promise((res) => { let n = 0; const f = () => (++n >= 40 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
          } else if (action?.burst) {
            // hold to awaken: press until the charge completes, then let ~24 frames of the burst play
            const vp = page.viewportSize();
            await page.mouse.move(vp.width * 0.72, vp.height * 0.45);
            await page.mouse.down();
            await page.waitForFunction(
              () => {
                const ring = document.querySelector('.cursor-ring') ?? document.querySelector('.hold-ring');
                const v = parseFloat(ring?.style.getPropertyValue('--hold') || '0');
                const w = window;
                const done = (w.__peak ?? 0) > 0.9 && v < w.__peak;
                w.__peak = Math.max(w.__peak ?? 0, v);
                return done;
              },
              null,
              { timeout: 60000, polling: 50 },
            );
            await page.mouse.up();
            await page.evaluate(() => new Promise((res) => { let n = 0; const f = () => (++n >= 24 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
            await page.evaluate(() => (window.__peak = 0));
          } else if (action?.tap && size === 'mobile') {
            await page.locator(action.tap).first().tap();
            await page.waitForTimeout(900);
          }
          let rate = '';
          if (fps) {
            const f = await page.evaluate(
              () =>
                new Promise((res) => {
                  let n = 0;
                  const t0 = performance.now();
                  const tick = () => {
                    n++;
                    if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
                    else res((n * 1000) / (performance.now() - t0));
                  };
                  requestAnimationFrame(tick);
                }),
            );
            rate = `  ${f.toFixed(0)} fps`;
          }
          const file = path.join(OUT, `${key}-${name}.png`);
          await page.screenshot({ path: file });
          shots[key].push(file);
          console.log(`• ${key} ${name}${rate}`);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // contact sheets: one grid per language × viewport
  const gap = 14;
  for (const [key, files] of Object.entries(shots)) {
    const mobile = key.endsWith('mobile');
    const w = mobile ? 234 : 560;
    const h = mobile ? 506 : 350;
    const cols = Math.min(files.length, mobile ? 7 : 4);
    const rows = Math.ceil(files.length / cols);
    const tiles = await Promise.all(files.map((f) => sharp(f).resize(w, h).png().toBuffer()));
    await sharp({ create: { width: gap + cols * (w + gap), height: gap + rows * (h + gap), channels: 3, background: '#0E0E10' } })
      .composite(tiles.map((input, i) => ({ input, left: gap + (i % cols) * (w + gap), top: gap + Math.floor(i / cols) * (h + gap) })))
      .png()
      .toFile(path.join(OUT, `sheet-${key}.png`));
  }

  if (errors.length) {
    console.log(`\n✗ ${errors.length} error(s):`);
    for (const e of [...new Set(errors)]) console.log('  ' + e);
    process.exit(1);
  }
  console.log(`\n✓ screenshots + contact sheets in ${path.relative(ROOT, OUT)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

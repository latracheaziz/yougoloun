// Phase gate: boots the Vite dev server, opens every route in headless Edge/Chrome
// (desktop + mobile), scrolls through every section, fails on console errors / page errors,
// and saves screenshots to .check/ for visual review.
//
// Usage: npm run check              (all routes, all viewports)
//        npm run check -- --quick   (desktop /ar hero only)
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.check');
const quick = process.argv.includes('--quick');

const viewports = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const routes = quick ? ['/ar'] : ['/ar', '/en'];
const sizes = quick ? ['desktop'] : Object.keys(viewports);

const IGNORE = [
  /Download the React DevTools/i,
  /\[vite\] (connecting|connected)/i,
  // GPU driver chatter from headless Chromium, not from the site
  /GPU stall due to ReadPixels/i,
  /Automatic fallback to software WebGL/i,
];

async function launch() {
  const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--enable-unsafe-swiftshader'];
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true, args });
    } catch {}
  }
  throw new Error('No Edge or Chrome found for Playwright (channel msedge/chrome).');
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await launch();
  const problems = [];
  const warnings = [];

  try {
    // Root redirect
    {
      const page = await browser.newPage();
      await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForURL(/\/ar$/, { timeout: 5000 }).catch(() => problems.push(`/ did not redirect to /ar (got ${page.url()})`));
      await page.close();
    }

    for (const size of sizes) {
      for (const route of routes) {
        const context = await browser.newContext(viewports[size]);
        const page = await context.newPage();
        const tag = `${route.slice(1)}-${size}`;
        page.on('console', (msg) => {
          const text = msg.text();
          if (IGNORE.some((re) => re.test(text))) return;
          if (msg.type() === 'error') problems.push(`[${tag}] console.error: ${text}`);
          else if (msg.type() === 'warning') warnings.push(`[${tag}] console.warn: ${text}`);
        });
        page.on('pageerror', (err) => problems.push(`[${tag}] page error: ${err.message}`));
        page.on('requestfailed', (req) => problems.push(`[${tag}] request failed: ${req.url()} (${req.failure()?.errorText})`));
        page.on('response', (res) => {
          if (res.status() >= 400) problems.push(`[${tag}] HTTP ${res.status()}: ${res.url()}`);
        });

        await page.goto(base + route, { waitUntil: 'networkidle' });
        await page.waitForSelector('canvas', { timeout: 20000 });

        const info = await page.evaluate(() => {
          const c = document.createElement('canvas').getContext('webgl2');
          const ext = c?.getExtension('WEBGL_debug_renderer_info');
          return {
            renderer: ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
            lang: document.documentElement.lang,
            dir: document.documentElement.dir,
            title: document.title,
            h1: document.querySelector('h1')?.textContent,
          };
        });
        if (info.lang !== route.slice(1)) problems.push(`[${tag}] <html lang> is "${info.lang}"`);
        const expectedDir = route === '/ar' ? 'rtl' : 'ltr';
        if (info.dir !== expectedDir) problems.push(`[${tag}] <html dir> is "${info.dir}", expected ${expectedDir}`);
        console.log(`• ${tag}  ${info.dir}  "${info.h1}"  — WebGL: ${info.renderer}`);

        await page.waitForTimeout(3500); // intro animation + textures
        await page.screenshot({ path: path.join(OUT, `${tag}-00-home.png`) });

        if (!quick) {
          const sections = await page.evaluate(() =>
            [...document.querySelectorAll('[data-track]')].map((el) => ({
              id: el.getAttribute('data-track'),
              top: el.getBoundingClientRect().top + window.scrollY,
              height: el.offsetHeight,
            })),
          );
          let i = 0;
          for (const s of sections.slice(1)) {
            i++;
            await page.evaluate((y) => window.scrollTo(0, y), Math.round(s.top + s.height * 0.5));
            await page.waitForTimeout(1300);
            await page.screenshot({ path: path.join(OUT, `${tag}-${String(i).padStart(2, '0')}-${s.id}.png`) });
          }
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          await page.waitForTimeout(1300);
          await page.screenshot({ path: path.join(OUT, `${tag}-99-footer.png`) });
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of [...new Set(warnings)]) console.log('  ' + w);
  }
  if (problems.length) {
    console.log(`\n✗ ${problems.length} problem(s):`);
    for (const p of [...new Set(problems)]) console.log('  ' + p);
    process.exit(1);
  }
  console.log(`\n✓ No console errors. Screenshots in ${path.relative(ROOT, OUT)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

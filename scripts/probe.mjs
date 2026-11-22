// Frame-rate probe: one scroll position, several URL variants, measured on this machine's GPU.
// Usage: npm run probe -- <track> <p> "<query>" ["<query>" …]
//   e.g. npm run probe -- about 0.75 "tier=medium" "tier=medium&nofx" "tier=medium&no=arch,shadows"
//   DPR=1.5 → device scale factor · PREVIEW=1 → the production build (npm run build first)
// Close the site in your own browser while probing: it shares the GPU and halves the numbers.
import { createServer, preview } from 'vite';
import { chromium } from 'playwright-core';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const [track, p, ...variants] = process.argv.slice(2);
// PREVIEW=1 → the production build (npm run build first)
const server = process.env.PREVIEW
  ? await preview({ root: ROOT, logLevel: 'error', preview: { port: 5200, strictPort: false } })
  : await (async () => { const s = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, strictPort: false } }); await s.listen(); return s; })();
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
for (const q of variants) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
  await page.goto(`${base}/en?${q}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.evaluate(({ track, p }) => { const el = document.querySelector(`[data-track="${track}"]`); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + el.offsetHeight * p); }, { track, p: Number(p) });
  await page.waitForTimeout(3000);
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : res((n * 1000) / (performance.now() - t0)); }; requestAnimationFrame(f); }));
  console.log(`${q.padEnd(44)} ${fps.toFixed(0)} fps`);
  await page.close();
}
await browser.close();
await (server.close ? server.close() : server.httpServer.close());

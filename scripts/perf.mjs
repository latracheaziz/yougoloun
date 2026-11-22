// Real-use performance: load timing + a full scroll through the page like a person (wheel steps),
// recording main-thread freezes (long tasks ≥ 50 ms, with the section on screen) and dropped frames.
// Usage: npm run build && npm run perf            (production build — what visitors get)
//        npm run perf -- --dev                    (dev server)
//        npm run perf -- --lang=ar --dpr=1.5 --query=tier=low
// Close the site in your own browser first: it shares the GPU.
import path from 'node:path';
import { createServer, preview } from 'vite';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const dev = process.argv.includes('--dev');
const lang = arg('lang') ?? 'en';
const dpr = Number(arg('dpr') ?? 1);
const query = arg('query') ?? '';

const server = dev
  ? await (async () => {
      const s = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5202, strictPort: false } });
      await s.listen();
      return s;
    })()
  : await preview({ root: ROOT, logLevel: 'error', preview: { port: 5203, strictPort: false } });
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });

await page.addInitScript(() => {
  const w = window;
  w.__perf = { long: [], frames: [] };
  const where = () => {
    const y = scrollY + innerHeight / 2;
    const el = [...document.querySelectorAll('[data-track], section[id]:not(.stage), section[aria-label]:not(.stage)')].find((e) => {
      const r = e.getBoundingClientRect();
      return r.top + scrollY <= y && r.bottom + scrollY > y;
    });
    return el?.id || el?.getAttribute('data-track') || (el?.getAttribute('aria-label') ? 'arrival' : '?');
  };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) w.__perf.long.push({ t: Math.round(e.startTime), d: Math.round(e.duration), at: where() });
  }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((list) => {
    const e = list.getEntries().at(-1);
    if (e) w.__perf.lcp = Math.round(e.startTime);
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  let last = performance.now();
  const tick = (now) => {
    if (w.__perf.recording) w.__perf.frames.push({ dt: now - last, at: where() });
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const t0 = Date.now();
await page.goto(`${base}/${lang}${query ? '?' + query : ''}`, { waitUntil: 'load' });
const loadMs = Date.now() - t0;
await page.waitForSelector('canvas', { timeout: 30000 });
const canvasMs = Date.now() - t0;
await page.waitForTimeout(6000);
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0];
  const bytes = performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
  return { dcl: Math.round(n.domContentLoadedEventEnd), lcp: window.__perf.lcp, mb: (bytes / 1e6).toFixed(1), longBeforeScroll: window.__perf.long.length };
});

// scroll the whole page like a person: wheel steps, ~60 px per frame-ish
await page.mouse.move(720, 450);
await page.evaluate(() => (window.__perf.recording = true));
// until the bottom (the page grows as lazy sections load) or until the scroll stops moving
let stuck = 0;
let lastY = -1;
for (let i = 0; i < 4000 && stuck < 40; i++) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(40);
  const [y, h] = await page.evaluate(() => [scrollY, document.documentElement.scrollHeight - innerHeight]);
  if (y >= h - 2) break;
  stuck = y === lastY ? stuck + 1 : 0;
  lastY = y;
}
await page.waitForTimeout(1500);
const res = await page.evaluate(() => {
  const p = window.__perf;
  p.recording = false;
  return { long: p.long, frames: p.frames };
});
await browser.close();
await (server.close ? server.close() : server.httpServer.close());

const frames = res.frames.filter((f) => f.dt < 1000);
const bySection = {};
for (const f of frames) {
  const s = (bySection[f.at] ??= { n: 0, slow: 0, sum: 0 });
  s.n++;
  s.sum += f.dt;
  if (f.dt > 33) s.slow++;
}
console.log(`\n${dev ? 'DEV' : 'PRODUCTION'} · /${lang} · dpr ${dpr}${query ? ' · ' + query : ''}`);
console.log(`load ${loadMs} ms · first canvas ${canvasMs} ms · DOMContentLoaded ${nav.dcl} ms · LCP ${nav.lcp} ms · transferred ${nav.mb} MB · freezes during load ${nav.longBeforeScroll}`);
console.log('\nwhile scrolling, per section: avg fps · frames > 33 ms');
for (const [k, s] of Object.entries(bySection)) console.log(`  ${k.padEnd(14)} ${(1000 / (s.sum / s.n)).toFixed(0).padStart(4)} fps   ${String(s.slow).padStart(4)} slow / ${s.n}`);
const long = res.long.filter((l) => l.t > 0).sort((a, b) => b.d - a.d);
console.log(`\nmain-thread freezes ≥ 50 ms: ${long.length}, total ${long.reduce((s, l) => s + l.d, 0)} ms`);
for (const l of long.slice(0, 14)) console.log(`  ${String(l.d).padStart(5)} ms  in ${l.at}`);

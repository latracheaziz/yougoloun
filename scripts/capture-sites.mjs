// Screenshots of the client projects' live websites → portfolio card images.
// Usage: npm run capture-sites
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITES = {
  hajiss: 'https://www.hajiss.com/',
  ghalia: 'https://www.ghaliachocolate.com/',
};

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {}
  }
  throw new Error('No Edge or Chrome found for Playwright.');
}

const browser = await launch();
try {
  for (const [slug, url] of Object.entries(SITES)) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    // dismiss cookie banners without consenting (reject non-essential / close)
    for (const name of [/رفض/, /reject/i, /decline/i, /^×$/, /close/i, /إغلاق/]) {
      const button = page.getByRole('button', { name }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click().catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(2500); // intro animations, lazy images
    const png = await page.screenshot({ type: 'png' });
    const dir = path.join(ROOT, 'public', 'media', 'work', slug);
    await mkdir(dir, { recursive: true });
    const info = await sharp(png).resize(1600, 1000).webp({ quality: 84 }).toFile(path.join(dir, 'cover.webp'));
    console.log(`  ✓ ${slug}  ${url}  ${(info.size / 1024).toFixed(0)} KB`);
    await page.close();
  }
} finally {
  await browser.close();
}

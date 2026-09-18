// Renders og.html to ../../site/og.png (1200x630). Needs `npm i playwright@1.49.1` (Edge via channel 'msedge').
//   node render.mjs
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'og.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(here, '..', '..', 'site', 'og.png') });
await browser.close();
console.log('site/og.png written');

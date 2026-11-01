// Renders the share image and the Apple touch icon with headless Chromium:
//   web/og/og.html        -> web/public/og.png (1200x630)
//   web/public/favicon.svg -> web/public/apple-touch-icon.png (180x180)
// Run from the repo root: node web/og/render.mjs
import { chromium } from '@playwright/test'; // the repo's own dev dependency
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const browser = await chromium.launch();
try {
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await og.goto(new URL('./og.html', import.meta.url).href);
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: here('../public/og.png'), type: 'png' });

  const icon = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  const svg = readFileSync(here('../public/favicon.svg'), 'utf8');
  // iOS rounds the corners itself: fill the square, no transparent edges.
  await icon.setContent(`<html><body style="margin:0;background:#0b0d12">${svg.replace('<svg ', '<svg width="180" height="180" ')}</body></html>`);
  await icon.screenshot({ path: here('../public/apple-touch-icon.png'), type: 'png' });

  for (const f of ['../public/og.png', '../public/apple-touch-icon.png']) console.log(`${f.slice(3)} ${Math.round(statSync(here(f)).size / 1024)} KB`);
} finally {
  await browser.close();
}

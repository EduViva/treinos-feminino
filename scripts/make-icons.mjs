// Gera os PNGs dos ícones a partir dos SVGs (usa o Chromium do Playwright).
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../tests/e2e/pw.mjs';

const root = join(fileURLToPath(import.meta.url), '..', '..', 'icons');
const jobs = [['icon.svg', 'icon-192.png', 192], ['icon.svg', 'icon-512.png', 512], ['icon-maskable.svg', 'icon-maskable-512.png', 512], ['icon-maskable.svg', 'apple-touch-icon.png', 180]];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, size] of jobs) {
  const svg = await readFile(join(root, src), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await writeFile(join(root, out), await page.screenshot({ omitBackground: true, type: 'png' }));
  console.log('ok', out);
}
await browser.close();

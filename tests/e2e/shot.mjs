// uso: node tests/e2e/shot.mjs "<path?query>" out.png [width] [height]
import { chromium } from './pw.mjs';
import { start } from '../../scripts/serve.mjs';
const [,, url, out, w = '900', h = '900'] = process.argv;
const server = await start(8123);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto('http://localhost:8123' + url);
await p.waitForFunction('window.__done === true', null, { timeout: 8000 }).catch(() => console.log('not done'));
await p.screenshot({ path: out, fullPage: true });
await b.close(); server.close();

// Carrega o Playwright instalado globalmente (ou local, se existir), sem exigir npm install.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const tryRoots = [process.cwd() + '/', (() => { try { return execSync('npm root -g').toString().trim() + '/'; } catch { return ''; } })()];
let pw = null;
for (const r of tryRoots) {
  try { pw = createRequire(r || process.cwd() + '/')('playwright'); break; } catch { /* próximo */ }
}
if (!pw) throw new Error('Playwright não encontrado. Instale com: npm i -D playwright');
export const chromium = pw.chromium;

// Atualiza sw.js: lista de pré-cache (todos os arquivos do app) + versão (hash do conteúdo).
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const INCLUDE_DIRS = ['css', 'js', 'icons'];
const INCLUDE_FILES = ['index.html', 'manifest.webmanifest'];
const SKIP = /\.(svg)$/i; // os SVG de origem dos ícones não são necessários (exceto icon.svg)

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p);
  }
  return out;
}

const files = [...INCLUDE_FILES.map((f) => join(root, f))];
for (const d of INCLUDE_DIRS) files.push(...(await walk(join(root, d))));
const rel = files.map((f) => relative(root, f).split(sep).join('/')).filter((f) => !(SKIP.test(f) && f !== 'icons/icon.svg')).sort();
const hash = createHash('sha1');
for (const f of rel) { hash.update(f); hash.update(await readFile(join(root, f))); }
const version = hash.digest('hex').slice(0, 10);

let sw = await readFile(join(root, 'sw.js'), 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
sw = sw.replace(/\/\*PRECACHE_START\*\/[\s\S]*?\/\*PRECACHE_END\*\//, `/*PRECACHE_START*/'./', ${rel.map((f) => `'./${f}'`).join(', ')}/*PRECACHE_END*/`);
await writeFile(join(root, 'sw.js'), sw);
console.log(`sw.js atualizado: versão ${version}, ${rel.length + 1} arquivos em cache.`);

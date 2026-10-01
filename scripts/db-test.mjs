// Executa os testes SQL de segurança (supabase/tests/*.sql) e imprime o resultado.
//
//   node scripts/db-test.mjs                      → no projeto Supabase (Management API)
//   DATABASE_URL=postgres://… node scripts/db-test.mjs   → em qualquer Postgres (usa o psql)
//
// Credenciais do projeto: SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN (ou proxy já autenticado).
// Os testes rodam numa transação que SEMPRE é revertida — não deixam dados.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || join(ROOT, 'supabase/tests/rls_multiuser.sql');
const sql = readFileSync(file, 'utf8');
const REF = process.env.SUPABASE_PROJECT_REF || 'bdwrqpiwrrkbtxeuvaem';

async function run() {
  if (process.env.DATABASE_URL) {
    try {
      execFileSync('psql', [process.env.DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-q', '-f', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return 'sem resultado';
    } catch (e) { return String(e.stderr || e.message); }
  }
  const headers = { 'Content-Type': 'application/json', ...(process.env.SUPABASE_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } : {}) };
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers, body: JSON.stringify({ query: sql }) });
  return await r.text();
}

const out = await run();
const m = out.match(/RESULTS:(\[.*\])/s);
if (!m) { console.error('Não consegui ler o resultado dos testes:\n' + out.slice(0, 2000)); process.exit(2); }
const results = JSON.parse(m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
let fail = 0;
for (const r of results) { if (!r.ok) fail++; console.log(`${r.ok ? '  ✓' : '  ✗ FALHOU:'} ${r.t}${r.ok ? '' : `  (obtido: ${r.got})`}`); }
console.log(`\n${results.length - fail}/${results.length} verificações passaram.`);
process.exit(fail ? 1 : 0);

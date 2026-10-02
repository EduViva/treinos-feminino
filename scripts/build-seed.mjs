// Gera os arquivos SQL de dados de referência e o seed do catálogo a partir das FONTES em JS:
//   js/data/taxonomy.js        → supabase/migrations/20261001215400_reference_data.sql
//   supabase/catalog/*.mjs     → supabase/seed.sql   (catálogo global de exercícios, idempotente)
//
//   node scripts/build-seed.mjs          gera os arquivos
//   node scripts/build-seed.mjs --check  falha se os arquivos versionados estiverem desatualizados (CI)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as tx from '../js/data/taxonomy.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

export const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
export const sqlArr = (a, cast = 'text') => (a.length ? `array[${a.map(sqlStr).join(', ')}]::${cast}[]` : `'{}'::${cast}[]`);

// ---------------------------------------------------------------- referência
export function referenceSql() {
  const out = [];
  out.push('-- GERADO por scripts/build-seed.mjs a partir de js/data/taxonomy.js — não edite à mão.');
  out.push('-- Dados de referência: papéis/permissões e tabelas de apoio do catálogo. Idempotente.\n');

  out.push('insert into public.roles (id, name, description) values');
  out.push(tx.ROLES.map((r) => `  (${sqlStr(r.id)}, ${sqlStr(r.name)}, ${sqlStr(r.description)})`).join(',\n'));
  out.push('on conflict (id) do update set name = excluded.name, description = excluded.description;\n');

  out.push('insert into public.permissions (id, description) values');
  out.push(tx.PERMISSIONS.map(([id, d]) => `  (${sqlStr(id)}, ${sqlStr(d)})`).join(',\n'));
  out.push('on conflict (id) do update set description = excluded.description;\n');

  const rp = Object.entries(tx.ROLE_PERMISSIONS).flatMap(([role, perms]) => perms.map((p) => `  (${sqlStr(role)}, ${sqlStr(p)})`));
  out.push('insert into public.role_permissions (role_id, permission_id) values');
  out.push(rp.join(',\n'));
  out.push('on conflict do nothing;\n');

  const lookup = (table, list) => {
    out.push(`insert into public.${table} (id, name, sort_order) values`);
    out.push(list.map((x) => `  (${sqlStr(x.id)}, ${sqlStr(x.name)}, ${x.sort})`).join(',\n'));
    out.push('on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;\n');
  };
  lookup('muscle_groups', tx.MUSCLE_GROUPS);
  lookup('equipment_types', tx.EQUIPMENT_TYPES);
  lookup('exercise_types', tx.EXERCISE_TYPES);
  return out.join('\n');
}

async function main() {
const TARGETS = [[join(ROOT, 'supabase/migrations/20261001215400_reference_data.sql'), referenceSql]];
{
  const { seedSql, legacyMapJs } = await import('../supabase/catalog/build.mjs');
  TARGETS.push([join(ROOT, 'supabase/seed.sql'), seedSql]);
  TARGETS.push([join(ROOT, 'js/data/legacy-map.js'), legacyMapJs]);
}

let stale = 0;
for (const [file, gen] of TARGETS) {
  const next = await gen();
  const cur = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (CHECK) { if (cur !== next) { console.error(`✗ desatualizado: ${file}`); stale++; } else console.log(`✓ em dia: ${file}`); } else {
    if (cur !== next) { writeFileSync(file, next); console.log(`✎ gerado: ${file}`); } else console.log(`= sem mudanças: ${file}`);
  }
}
if (stale) { console.error('Rode: node scripts/build-seed.mjs'); process.exit(1); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();

// Gera supabase/seed.sql (catálogo global) a partir de supabase/catalog/*.mjs.
//  * IDs determinísticos (uuid v5 do slug): o mesmo exercício tem o mesmo id em qualquer ambiente.
//  * Idempotente: pode rodar quantas vezes quiser; só toca linhas que realmente mudaram
//    (assim o `updated_at` não muda à toa e os aparelhos não rebaixam o catálogo inteiro).
//  * Exercícios removidos do catálogo são DESATIVADOS (is_active = false), nunca apagados:
//    treinos e históricos que os usam continuam válidos.
import { CATALOG, LEGACY_IDS } from './index.mjs';
import { catalogId } from '../../js/sync/uuid.js';

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => (a.length ? `array[${a.map(q).join(', ')}]::text[]` : `'{}'::text[]`);
const num = (n) => String(Number(n));

const COLS = ['name', 'aliases', 'primary_group_id', 'equipment_id', 'exercise_type_id', 'level', 'instructions', 'tips', 'art_key',
  'default_sets', 'default_reps', 'default_rest_seconds', 'load_step', 'rep_unit', 'is_bodyweight'];

export async function seedSql() {
  const out = [];
  out.push('-- GERADO por scripts/build-seed.mjs a partir de supabase/catalog/*.mjs — não edite à mão.');
  out.push(`-- Catálogo global de exercícios (${CATALOG.length}). Idempotente: rode quando quiser (supabase db reset já executa este arquivo).\n`);
  out.push('begin;\n');

  const rows = [];
  for (const e of CATALOG) {
    const id = await catalogId(e.slug);
    rows.push(`  (${q(id)}, 'catalog', ${q(e.slug)}, ${q(e.name)}, ${arr(e.aliases)}, ${q(e.group)}, ${q(e.equipment)}, ${q(e.type)}, ${q(e.level)}, ` +
      `${arr(e.instructions)}, ${arr(e.tips)}, ${e.art ? q(e.art) : 'null'}, ${e.sets}, ${e.reps}, ${e.rest}, ${num(e.step)}, ${q(e.unit)}, ${e.bodyweight}, true, 'public')`);
  }
  const cols = ['id', 'origin', 'slug', ...COLS, 'is_active', 'visibility'];
  const changed = COLS.map((c) => `public.exercises.${c}`).join(', ') + ', public.exercises.is_active, public.exercises.deleted_at';
  const incoming = COLS.map((c) => `excluded.${c}`).join(', ') + ', true, null::timestamptz';
  out.push(`insert into public.exercises (${cols.join(', ')}) values`);
  out.push(rows.join(',\n'));
  out.push('on conflict (slug) where origin = \'catalog\' do update set');
  out.push('  ' + COLS.map((c) => `${c} = excluded.${c}`).join(', ') + ', is_active = true, deleted_at = null');
  out.push(`where (${changed}) is distinct from (${incoming});\n`);

  // Músculos secundários: converge para o conjunto desejado (insere o que falta, remove o que sobra)
  const pairs = [];
  for (const e of CATALOG) for (const s of e.secondary) pairs.push(`(${q(e.slug)}, ${q(s)})`);
  out.push('create temp table _catalog_secondary (slug text, muscle_group_id text) on commit drop;');
  out.push('insert into _catalog_secondary values');
  out.push(pairs.map((p) => '  ' + p).join(',\n') + ';\n');
  out.push(`insert into public.exercise_secondary_muscles (exercise_id, muscle_group_id)
select e.id, d.muscle_group_id
from _catalog_secondary d
join public.exercises e on e.slug = d.slug and e.origin = 'catalog'
on conflict do nothing;
`);
  out.push(`delete from public.exercise_secondary_muscles sm
using public.exercises e
where sm.exercise_id = e.id and e.origin = 'catalog'
  and not exists (select 1 from _catalog_secondary d where d.slug = e.slug and d.muscle_group_id = sm.muscle_group_id);
`);

  // Aposenta (não apaga) exercícios que saíram do catálogo
  out.push(`update public.exercises set is_active = false
where origin = 'catalog' and is_active
  and slug <> all (${arr(CATALOG.map((e) => e.slug))});
`);
  out.push('commit;');
  return out.join('\n') + '\n';
}

// Mapa "id da biblioteca original (ex-…)" → slug do catálogo. O app o usa para migrar dados antigos
// (treinos, históricos e backups) para os ids do catálogo no banco.
export function legacyMapJs() {
  const rows = Object.entries(LEGACY_IDS).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  return `// GERADO por scripts/build-seed.mjs a partir de supabase/catalog — não edite à mão.
// id da biblioteca original do app (antes do catálogo no Supabase) → slug do exercício no catálogo.
export const LEGACY_EXERCISE_SLUGS = {
${rows.join('\n')}
};
`;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATALOG, LEGACY_IDS } from '../../supabase/catalog/index.mjs';
import { validateCatalog } from '../../supabase/catalog/validate.mjs';
import { seedSql } from '../../supabase/catalog/build.mjs';
import { referenceSql } from '../../scripts/build-seed.mjs';
import { SEED_EXERCISES } from '../../js/data/seed.js';
import { ARTS } from '../../js/figure/arts.js';
import '../../js/figure/arts2.js';
import '../../js/figure/arts3.js';
import '../../js/figure/arts4.js';
import * as tx from '../../js/data/taxonomy.js';
import { uuidv5, catalogId, isUuid } from '../../js/sync/uuid.js';

test('uuid v5 confere com o vetor de teste padrão (RFC 4122)', async () => {
  assert.equal(await uuidv5('www.example.com', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'), '2ed6657d-e927-568b-95e1-2665a8aea6a2');
  const a = await catalogId('supino-reto-barra');
  assert.ok(isUuid(a));
  assert.equal(a, await catalogId('supino-reto-barra'), 'determinístico');
  assert.notEqual(a, await catalogId('supino-inclinado-barra'));
});

test('catálogo é válido: sem duplicatas, nomes/sinônimos padronizados, referências existentes', () => {
  const errors = validateCatalog(CATALOG, { artKeys: Object.keys(ARTS) });
  assert.deepEqual(errors, []);
});

test('catálogo é amplo e cobre todos os grupos, equipamentos e tipos principais', () => {
  assert.ok(CATALOG.length >= 300, `só ${CATALOG.length} exercícios`);
  for (const g of tx.MUSCLE_GROUPS) assert.ok(CATALOG.some((e) => e.group === g.id), `grupo sem exercícios: ${g.id}`);
  for (const eq of ['maquina', 'polia', 'barra', 'halteres', 'smith', 'banco', 'peso-corporal', 'kettlebell', 'elastico', 'cardio', 'suspensao', 'barra-fixa'])
    assert.ok(CATALOG.some((e) => e.equipment === eq), `equipamento sem exercícios: ${eq}`);
  for (const t of tx.EXERCISE_TYPES) assert.ok(CATALOG.some((e) => e.type === t.id), `tipo sem exercícios: ${t.id}`);
  for (const l of tx.LEVELS) assert.ok(CATALOG.some((e) => e.level === l.id), `nível sem exercícios: ${l.id}`);
  const named = (s) => CATALOG.some((e) => tx.fold(e.name).includes(tx.fold(s)) || e.aliases.some((a) => tx.fold(a).includes(tx.fold(s))));
  for (const s of ['supino reto', 'agachamento', 'leg press', 'puxada', 'remada', 'rosca', 'tríceps', 'elevação lateral', 'stiff', 'abdominal', 'prancha', 'esteira', 'burpee'])
    assert.ok(named(s), `faltou exercício básico: ${s}`);
});

test('os exercícios da biblioteca original estão no catálogo, com os MESMOS dados (nada se perde)', () => {
  assert.deepEqual(Object.keys(LEGACY_IDS).sort(), SEED_EXERCISES.map((e) => e.id).sort(), 'todo id legado tem correspondente');
  const bySlug = new Map(CATALOG.map((e) => [e.slug, e]));
  for (const old of SEED_EXERCISES) {
    const e = bySlug.get(LEGACY_IDS[old.id]);
    assert.ok(e, old.id);
    const at = `${old.id} → ${e.slug}`;
    assert.deepEqual(e.instructions, old.instructions, `${at}: instruções`);
    assert.equal(e.art, old.art, `${at}: animação`);
    assert.equal(e.sets, old.defaults.sets, `${at}: séries`);
    assert.equal(e.reps, old.defaults.reps, `${at}: reps`);
    assert.equal(e.rest, old.defaults.rest, `${at}: descanso`);
    assert.equal(e.step, old.defaults.loadStep, `${at}: passo de carga`);
    assert.equal(e.unit, old.repUnit, `${at}: unidade`);
    assert.equal(e.bodyweight, old.bodyweight, `${at}: peso corporal`);
    assert.equal(e.type, old.kind, `${at}: tipo`);
    assert.equal(e.equipment, tx.equipment.id(old.equipment), `${at}: equipamento`);
    const g = old.group === 'Corpo inteiro' ? (old.kind === 'cardio' ? 'cardio' : 'funcional') : tx.groups.id(old.group);
    assert.equal(e.group, g, `${at}: grupo`);
    assert.deepEqual([...e.secondary].sort(), old.secondary.map((s) => tx.groups.id(s)).sort(), `${at}: secundários`);
  }
});

test('o seed do catálogo e os dados de referência versionados estão em dia (rode: node scripts/build-seed.mjs)', async () => {
  assert.equal(readFileSync('supabase/seed.sql', 'utf8'), await seedSql());
  assert.equal(readFileSync('supabase/migrations/20261001215400_reference_data.sql', 'utf8'), referenceSql());
});

test('taxonomia: conversões rótulo ↔ id, inclusive rótulos antigos', () => {
  assert.equal(tx.groups.id('Peito'), 'peitoral');
  assert.equal(tx.groups.id('posteriores'), 'posterior-coxa');
  assert.equal(tx.groups.id('Abdômen'), 'abdomen-core');
  assert.equal(tx.groups.id('Bíceps'), 'biceps');
  assert.equal(tx.equipment.id('Polia / cabo'), 'polia');
  assert.equal(tx.equipment.id('Cardio'), 'cardio');
  assert.equal(tx.normGroupLabel('Corpo inteiro', 'cardio'), 'Cardio');
  assert.equal(tx.normGroupLabel('Corpo inteiro', 'forca'), 'Funcional');
  assert.equal(tx.normGroupLabel('Peito'), 'Peitoral');
  assert.equal(tx.normGroupLabel('???'), 'Outros');
});

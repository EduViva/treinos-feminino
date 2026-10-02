import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG } from '../../supabase/catalog/index.mjs';
import * as tx from '../../js/data/taxonomy.js';
import { searchExercises, editDistance, recentExerciseIds, facetCounts } from '../../js/search.js';

// catálogo no formato que o app usa em memória
const LIST = CATALOG.map((e, i) => ({ id: `id-${i}`, name: e.name, aliases: e.aliases, group: tx.groups.name(e.group), secondary: e.secondary.map((s) => tx.groups.name(s)),
  equipment: tx.equipment.name(e.equipment), kind: e.type, level: e.level, favorite: false }));
const names = (r) => r.map((e) => e.name);

test('"supino" encontra os supinos (e só eles) — ranking: nome começa com o termo', () => {
  const r = searchExercises(LIST, { q: 'supino' });
  assert.ok(r.length >= 12, `só ${r.length}`);
  assert.ok(r.every((e) => /supino/i.test(e.name) || e.aliases.some((a) => /supino/i.test(a))));
  assert.ok(/^Supino/.test(r[0].name));
});

test('ignora acentos, maiúsculas e espaços extras', () => {
  assert.deepEqual(names(searchExercises(LIST, { q: '  SUPÍNO   inclinado ' })), names(searchExercises(LIST, { q: 'supino inclinado' })));
  assert.ok(names(searchExercises(LIST, { q: 'triceps' })).some((n) => /Tríceps/.test(n)));
});

test('vários termos: todos precisam casar, em qualquer ordem', () => {
  const r = names(searchExercises(LIST, { q: 'halteres supino' }));
  assert.ok(r.length >= 3 && r.every((n) => /supino/i.test(n)));
  assert.ok(r.includes('Supino reto com halteres'));
  assert.ok(r.indexOf('Supino reto com halteres') < r.indexOf('Supino reto com barra') || !r.includes('Supino reto com barra'));
});

test('sinônimos e nomes populares em inglês', () => {
  assert.ok(names(searchExercises(LIST, { q: 'bench press' })).includes('Supino reto com barra'));
  assert.ok(names(searchExercises(LIST, { q: 'pulldown' })).includes('Puxada alta na polia'));
  assert.ok(names(searchExercises(LIST, { q: 'hip thrust' })).includes('Elevação pélvica com barra'));
  assert.ok(names(searchExercises(LIST, { q: 'peck deck' })).includes('Voador'));
  assert.ok(names(searchExercises(LIST, { q: 'leg press' })).includes('Leg press 45°'));
});

test('tolera erro de digitação em termos longos, sem inventar resultados', () => {
  assert.ok(names(searchExercises(LIST, { q: 'agachameto' })).some((n) => /Agachamento/.test(n)));
  assert.ok(names(searchExercises(LIST, { q: 'suppino' })).some((n) => /Supino/.test(n)));
  assert.deepEqual(searchExercises(LIST, { q: 'xyzqwk' }), []);
  assert.equal(editDistance('supino', 'suppino'), 1);
  assert.equal(editDistance('abc', 'xyzwv', 2), 3);
});

test('filtros: grupo, equipamento, tipo, nível e favoritos combinam (E entre filtros, OU dentro de cada um)', () => {
  const r = searchExercises(LIST, { groups: ['Peitoral'], equipment: ['Halteres'] });
  assert.ok(r.length >= 5 && r.every((e) => e.group === 'Peitoral' && e.equipment === 'Halteres'));
  const t = searchExercises(LIST, { types: ['alongamento'] });
  assert.ok(t.length >= 20 && t.every((e) => e.kind === 'alongamento'));
  const two = searchExercises(LIST, { groups: ['Bíceps', 'Tríceps'] });
  assert.ok(two.some((e) => e.group === 'Bíceps') && two.some((e) => e.group === 'Tríceps') && two.every((e) => ['Bíceps', 'Tríceps'].includes(e.group)));
  assert.ok(searchExercises(LIST, { levels: ['avancado'] }).every((e) => e.level === 'avancado'));
  const fav = LIST.map((e, i) => (i < 3 ? { ...e, favorite: true } : e));
  assert.equal(searchExercises(fav, { favoritesOnly: true }).length, 3);
  assert.equal(searchExercises(fav, { q: 'supino', favoritesOnly: true, groups: ['Costas'] }).length, 0);
});

test('busca + filtro juntos; contagem por faceta ignora o próprio filtro', () => {
  const r = searchExercises(LIST, { q: 'supino', equipment: ['Máquina'] });
  assert.ok(r.length >= 3 && r.every((e) => e.equipment === 'Máquina' && /supino/i.test(e.name)));
  const counts = facetCounts(LIST, { q: 'supino', equipment: ['Máquina'] }, 'equipment', (e) => e.equipment);
  assert.ok(counts.get('Barra') >= 3 && counts.get('Halteres') >= 3, 'mostra quantos haveria em outros equipamentos');
});

test('sem busca nem filtros: lista tudo em ordem alfabética estável', () => {
  const r = searchExercises(LIST, {});
  assert.equal(r.length, LIST.length);
  const sorted = [...r].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  assert.deepEqual(names(r), names(sorted));
});

test('desempenho: 334 exercícios × 200 buscas em poucos ms (celular)', () => {
  const t0 = performance.now();
  for (let i = 0; i < 200; i++) searchExercises(LIST, { q: ['sup', 'agach', 'puxada alta', 'rosca mart'][i % 4] });
  const ms = performance.now() - t0;
  assert.ok(ms < 800, `${ms.toFixed(0)} ms`);
});

test('recentes: últimas sessões primeiro, depois treinos, sem repetir', () => {
  const sessions = [
    { exercises: [{ exerciseId: 'a', sets: [1] }, { exerciseId: 'b', sets: [] }] },
    { exercises: [{ exerciseId: 'c', sets: [1] }, { exerciseId: 'a', sets: [1] }] },
  ];
  const workouts = [{ items: [{ exerciseId: 'd' }, { exerciseId: 'c' }] }];
  assert.deepEqual(recentExerciseIds(sessions, workouts, 5), ['c', 'a', 'd']);
  assert.deepEqual(recentExerciseIds(sessions, workouts, 2), ['c', 'a']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { convertLegacyData } from '../../js/legacy.js';
import { catalogId, isUuid } from '../../js/sync/uuid.js';
import { LEGACY_EXERCISE_SLUGS } from '../../js/data/legacy-map.js';
import { SEED_EXERCISES } from '../fixtures/legacy-library.mjs';

const U = '11111111-1111-4111-8111-111111111111';
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const data = () => ({
  profile: { name: 'Ana', createdAt: 1 }, settings: { theme: 'dark' },
  exercises: [
    { id: 'ex-supino-reto', name: 'Supino reto com barra', builtin: true, archived: false, createdAt: 10, updatedAt: 99, notes: 'banco 3', defaults: { sets: 4, reps: 10, load: 40, rest: 90, loadStep: 2.5 }, mediaPrimary: null },
    { id: 'ex-leg-press', name: 'Leg press horizontal', builtin: true, archived: true, createdAt: 10, updatedAt: 10, notes: '', defaults: { sets: 4, reps: 12, load: 0, rest: 90, loadStep: 5 } },
    { id: 'ex-agachamento', name: 'Agachamento (exemplo v1)', builtin: true, createdAt: 5, updatedAt: 5, group: 'Quadríceps', equipment: 'Barra' },        // exemplo antigo SEM uso → descarta
    { id: 'ex-stiff', name: 'Stiff (exemplo v1 usado)', builtin: true, createdAt: 5, updatedAt: 5, group: 'Posteriores', equipment: 'Halteres', kind: 'forca' }, // exemplo antigo COM histórico → mantém arquivado
    { id: uuid(1), name: 'Meu exercício', group: 'Peito', secondary: ['Tríceps'], equipment: 'Cardio', kind: 'forca', instructions: ['a'], defaults: { sets: 3, reps: 12, load: 0, rest: 60, loadStep: 1 }, repUnit: 'reps', bodyweight: false, builtin: false, createdAt: 20, updatedAt: 20, notes: 'minha obs' },
    { id: 'id-xyz-sem-uuid', name: 'Criado sem randomUUID', group: 'Corpo inteiro', kind: 'cardio', equipment: 'Máquina', defaults: {}, builtin: false },
  ],
  workouts: [
    { id: uuid(2), name: 'Segunda', items: [{ id: uuid(3), exerciseId: 'ex-supino-reto', sets: 4, reps: 10, load: 40, rest: 90 }, { id: uuid(4), exerciseId: uuid(1), sets: 3, reps: 12, load: 0, rest: 60 }] },
    { id: 'w-exemplo', name: 'Exemplo v1', example: true, items: [] },
  ],
  sessions: [{ id: uuid(5), workoutId: uuid(2), workoutName: 'Segunda', startedAt: 5, exercises: [
    { itemId: uuid(3), exerciseId: 'ex-supino-reto', name: 'Supino', sets: [] }, { itemId: 'x', exerciseId: 'ex-stiff', name: 'Stiff', sets: [{ n: 1 }] }, { exerciseId: uuid(1), name: 'Meu', sets: [] }] }],
  suggestions: [{ id: uuid(6), exerciseId: 'ex-supino-reto', workoutId: uuid(2) }],
  activities: [{ id: uuid(7), type: 'corrida', startedAt: 1, durationMin: 20 }],
  wellbeing: [{ date: '2026-03-01', mood: 4 }], weights: [{ id: uuid(8), date: '2026-03-01', kg: 62 }],
  media: [{ id: uuid(9), exerciseId: 'ex-supino-reto', kind: 'image', name: 'f.jpg' }],
});

test('exercícios da biblioteca original viram o id do CATÁLOGO (uuid v5 do slug) em treinos, histórico e sugestões', async () => {
  const cv = await convertLegacyData(data(), { userId: U });
  const supino = await catalogId('supino-reto-barra');
  assert.equal(cv.workouts.length, 1, 'treino-exemplo da v1 é descartado');
  assert.equal(cv.workouts[0].items[0].exerciseId, supino);
  assert.equal(cv.workouts[0].items[1].exerciseId, uuid(1), 'exercício próprio mantém o id');
  assert.equal(cv.sessions[0].exercises[0].exerciseId, supino);
  assert.equal(cv.suggestions[0].exerciseId, supino);
  assert.equal(cv.media[0].exerciseId, supino);
  assert.equal(cv.sessions[0].workoutId, uuid(2), 'ids que já são uuid não mudam');
  assert.ok(cv.sessions[0].exercises.every((x) => x.exerciseId == null || isUuid(x.exerciseId)), 'todo exerciseId do histórico vira uuid');
});

test('personalizações do exercício do catálogo viram PREFERÊNCIAS; o catálogo não é recriado localmente', async () => {
  const cv = await convertLegacyData(data(), { userId: U });
  const supino = cv.prefs.find((p) => p.exerciseId === cv.workouts[0].items[0].exerciseId);
  assert.ok(supino && supino.builtin && supino.edited && supino.notes === 'banco 3' && supino.defaults.load === 40);
  const leg = cv.prefs.find((p) => p.builtin && p.archived);
  assert.ok(leg, 'arquivado continua arquivado');
  assert.ok(!cv.bases.some((b) => b.id === supino.exerciseId), 'nenhuma cópia local do exercício do catálogo');
});

test('exercícios próprios e exemplos antigos: nada se perde, nada sobra', async () => {
  const cv = await convertLegacyData(data(), { userId: U });
  const mine = cv.bases.find((b) => b.id === uuid(1));
  assert.equal(mine.ownerId, U); assert.equal(mine.origin, 'custom'); assert.equal(mine.group, 'Peitoral'); assert.deepEqual(mine.secondary, ['Tríceps']); assert.equal(mine.equipment, 'Aparelho de cardio');
  const noUuid = cv.bases.find((b) => b.name === 'Criado sem randomUUID');
  assert.ok(noUuid && isUuid(noUuid.id) && noUuid.group === 'Cardio', 'id sem formato uuid vira uuid estável; "Corpo inteiro"+cardio → Cardio');
  assert.ok(!cv.bases.some((b) => /Agachamento \(exemplo/.test(b.name)), 'exemplo v1 sem uso é descartado');
  const stiff = cv.bases.find((b) => /Stiff/.test(b.name));
  assert.ok(stiff && stiff.group === 'Posterior de coxa', 'exemplo v1 USADO no histórico é mantido (histórico íntegro)…');
  assert.ok(cv.prefs.find((p) => p.exerciseId === stiff.id).archived, '…porém arquivado');
  assert.equal(cv.activities.length, 1); assert.equal(cv.wellbeing.length, 1); assert.equal(cv.weights.length, 1); assert.equal(cv.profile.name, 'Ana');
});

test('conversão é determinística (rodar duas vezes dá os mesmos ids → sem duplicar na nuvem)', async () => {
  const a = await convertLegacyData(data(), { userId: U }), b = await convertLegacyData(data(), { userId: U });
  assert.deepEqual(a.bases.map((x) => x.id), b.bases.map((x) => x.id));
  assert.deepEqual(a.prefs.map((x) => x.exerciseId), b.prefs.map((x) => x.exerciseId));
});

test('backup no formato NOVO (com catálogo e prefs) não duplica exercícios do catálogo', async () => {
  const id = await catalogId('supino-reto-barra');
  const cv = await convertLegacyData({ exercises: [{ id, origin: 'catalog', builtin: true, name: 'Supino reto com barra' }], prefs: [{ exerciseId: id, favorite: true, defaults: { sets: null, reps: null, load: 30, rest: null, loadStep: null } }],
    workouts: [{ id: uuid(2), name: 'A', items: [{ id: uuid(3), exerciseId: id }] }], sessions: [] }, { userId: U });
  assert.equal(cv.bases.length, 0);
  assert.equal(cv.prefs.length, 1); assert.ok(cv.prefs[0].final && cv.prefs[0].favorite && cv.prefs[0].defaults.load === 30);
  assert.equal(cv.workouts[0].items[0].exerciseId, id);
});

test('todos os ids da biblioteca original têm destino no catálogo', () => {
  for (const e of SEED_EXERCISES) assert.ok(LEGACY_EXERCISE_SLUGS[e.id], e.id);
});

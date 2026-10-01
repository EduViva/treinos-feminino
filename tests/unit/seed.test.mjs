import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_EXERCISES, SEED_WORKOUTS } from '../../js/data/seed.js';
import { ARTS } from '../../js/figure/arts.js';
import '../../js/figure/arts2.js';
import '../../js/figure/arts3.js';
import '../../js/figure/arts4.js';

const byId = new Map(SEED_EXERCISES.map((e) => [e.id, e]));

test('todo exercício do seed tem animação (modelo feminina) existente e poses válidas', () => {
  for (const e of SEED_EXERCISES) {
    assert.ok(ARTS[e.art], `${e.id} sem arte "${e.art}"`);
    assert.ok(ARTS[e.art].keys.length >= 2 && ARTS[e.art].cues.ini, `${e.art} incompleta`);
  }
});

test('ids únicos e treinos só referenciam exercícios existentes', () => {
  assert.equal(byId.size, SEED_EXERCISES.length);
  for (const w of SEED_WORKOUTS) for (const it of w.items) assert.ok(byId.has(it.exerciseId), `${w.name}: ${it.exerciseId}`);
});

test('5 treinos (segunda a sexta), cada um com 2 alongamentos + 2 mobilidades antes dos exercícios', () => {
  assert.deepEqual(SEED_WORKOUTS.map((w) => w.name), ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);
  assert.deepEqual(SEED_WORKOUTS.map((w) => w.weekday), [1, 2, 3, 4, 5]);
  for (const w of SEED_WORKOUTS) {
    const kinds = w.items.map((i) => byId.get(i.exerciseId).kind);
    assert.deepEqual(kinds.slice(0, 4), ['alongamento', 'alongamento', 'mobilidade', 'mobilidade'], w.name);
    assert.ok(!kinds.slice(4).some((k) => k === 'alongamento' || k === 'mobilidade'), w.name);
  }
});

test('séries × repetições conforme a lista da usuária', () => {
  const d = (id) => byId.get(id).defaults;
  const sr = (id) => [d(id).sets, d(id).reps];
  assert.deepEqual(sr('ex-voador-invertido'), [4, 12]);
  assert.deepEqual(sr('ex-supino-reto'), [4, 10]);
  assert.deepEqual(sr('ex-triceps-frances'), [3, 12]);
  assert.deepEqual(sr('ex-elev-frontal'), [3, 12]);
  assert.equal(d('ex-abdominal-infra').sets, 1);
  assert.equal(d('ex-abdominal-curto').sets, 1);
  assert.equal(d('ex-prancha').sets, 1);
  assert.equal(byId.get('ex-esteira').kind, 'cardio');
  assert.equal(byId.get('ex-escada').repUnit, 'min');
  const wd = (n) => SEED_WORKOUTS.find((w) => w.name === n).items.map((i) => i.exerciseId);
  assert.ok(wd('Segunda').includes('ex-face-pull') && wd('Quarta').includes('ex-supino-reto') && wd('Sexta').includes('ex-sumo-step'));
});

test('tudo que era da biblioteca antiga e não está na lista nova some do seed', () => {
  for (const old of ['ex-agachamento', 'ex-goblet', 'ex-stiff', 'ex-panturrilha', 'ex-remada', 'ex-puxada', 'ex-rosca', 'ex-flexora']) assert.ok(!byId.has(old), old);
});

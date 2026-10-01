import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkoutText, parseLine, matchExercise } from '../../js/importer.js';
import { SEED_EXERCISES } from '../fixtures/legacy-library.mjs';

const lib = SEED_EXERCISES;

test('linha: séries x reps, carga e descanso em formatos variados', () => {
  assert.deepEqual(pick(parseLine('Leg press 4x12 80kg 90s')), ['Leg press', 4, 12, 80, 90]);
  assert.deepEqual(pick(parseLine('Supino - 3 x 10 - 22,5 kg')), ['Supino', 3, 10, 22.5, null]);
  assert.deepEqual(pick(parseLine('Agachamento 3 séries de 15 repetições')), ['Agachamento', 3, 15, null, null]);
  assert.deepEqual(pick(parseLine('Remada 4×10 40kg descanso 2min')), ['Remada', 4, 10, 40, 120]);
  assert.equal(parseLine('Prancha 3x30s').secUnit, true);
});

test('treinos: detecta cabeçalhos (Treino A, A:, Dia 2) e itens', () => {
  const w = parseWorkoutText('Treino A - Pernas\nLeg press 4x12\n\nTreino B\n1) Puxada 3x12\n2) Remada 3x12');
  assert.equal(w.length, 2);
  assert.equal(w[0].name, 'Treino A');
  assert.equal(w[0].description, 'Pernas');
  assert.equal(w[1].items.length, 2);
  const w2 = parseWorkoutText('Inferiores:\nExtensora 3x15\nSuperiores:\nRosca 3x10');
  assert.deepEqual(w2.map((x) => x.name), ['Inferiores', 'Superiores']);
});

test('sem cabeçalho: cria um treino padrão e não inventa exercícios', () => {
  const w = parseWorkoutText('Leg press 3x12\nlinha aleatória sem números e sem sentido?');
  assert.equal(w.length, 1);
  assert.equal(w[0].items[0].name, 'Leg press');
});

test('associação com a biblioteca: nomes curtos, sem acento, e novo quando não existe', () => {
  assert.equal(matchExercise('Extensora', lib).id, 'ex-extensora');
  assert.equal(matchExercise('mesa flexora', lib).id, 'ex-flexora-deitada');
  assert.equal(matchExercise('Elevacao pelvica', lib).id, 'ex-pelvica');
  assert.equal(matchExercise('Leg press 45', lib).id, 'ex-leg-press-45');
  assert.equal(matchExercise('Rosca scott', lib), null);
  assert.equal(matchExercise('', lib), null);
});

const pick = (i) => [i.name, i.sets, i.reps, i.load, i.rest];

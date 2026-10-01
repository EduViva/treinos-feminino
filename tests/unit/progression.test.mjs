import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, entryLoad, defaultStep } from '../../js/progression.js';
import { exerciseEntries, sessionTotals, cycleDayOn, weekStreak } from '../../js/stats.js';

const DAY = 86400000;
const T0 = new Date('2026-09-01T10:00:00').getTime();
const EX = { id: 'ex-leg-press', name: 'Leg press', repUnit: 'reps', defaults: { loadStep: 2 } };

// sets: [[reps, load, effort?, rir?], ...]
function session(i, dayOffset, sets, { plannedSets = 3, plannedReps = 12, feel = null, exId = EX.id } = {}) {
  return {
    id: 's' + i, workoutName: 'Treino A', startedAt: T0 + dayOffset * DAY, feel,
    exercises: [{
      exerciseId: exId, repUnit: 'reps', status: 'done', planned: { sets: plannedSets, reps: plannedReps, load: sets[0][1] },
      sets: sets.map(([reps, load, effort, rir]) => ({ reps, load, effort: effort ?? null, rir: rir ?? null, targetReps: plannedReps, restActual: 60 })),
    }],
  };
}
const run = (sessions, nowOffset, wb = new Map()) => evaluate({
  entries: exerciseEntries(sessions, EX.id, wb), exercise: EX, now: T0 + nowOffset * DAY,
});
const full = (load, eff, rir) => [[12, load, eff, rir], [12, load, eff, rir], [12, load, eff, rir]];

test('sem histórico → dados insuficientes (não inventa nada)', () => {
  const r = run([], 5);
  assert.equal(r.status, 'insufficient');
  assert.match(r.headline, /Dados insuficientes/);
  assert.equal(r.suggestedLoad, undefined);
});

test('1 ou 2 sessões → dados insuficientes, e informa quantas existem', () => {
  const r = run([session(1, 0, full(20)), session(2, 3, full(20))], 4);
  assert.equal(r.status, 'insufficient');
  assert.match(r.explanation, /2 sessões registradas/);
  assert.equal(r.suggestedLoad, undefined);
});

test('3 sessões completas, esforço moderado → sugere +passo, com explicação baseada nos dados', () => {
  const ss = [session(1, 0, full(20, 3, 2)), session(2, 4, full(20, 3, 2)), session(3, 8, full(20, 3, 2))];
  const r = run(ss, 9);
  assert.equal(r.status, 'suggest');
  assert.equal(r.currentLoad, 20);
  assert.equal(r.suggestedLoad, 22);
  assert.equal(r.confidence, 'média'); // só 3 sessões
  assert.match(r.explanation, /3 × 12/);
  assert.match(r.explanation, /20 kg/);
  assert.match(r.explanation, /moderado/);
  assert.match(r.explanation, /22 kg/);
  assert.equal(r.considered.length, 3);
  assert.ok(r.checks.every((c) => c.ok !== false));
});

test('4+ sessões com esforço registrado → confiança alta', () => {
  const ss = [0, 3, 7, 10].map((d, i) => session(i, d, full(20, 3, 2)));
  assert.equal(run(ss, 11).confidence, 'alta');
});

test('sessões espalhadas em < 5 dias → mantém (consistência no tempo)', () => {
  const ss = [session(1, 0, full(20)), session(2, 1, full(20)), session(3, 2, full(20))];
  const r = run(ss, 3);
  assert.equal(r.status, 'hold');
  assert.match(r.explanation, /apenas 2 dias/);
});

test('queda de repetições + fadiga → "não recomendamos", cita fadiga e redução', () => {
  const ss = [
    session(1, 0, full(20, 3)), session(2, 4, full(20, 3)),
    session(3, 8, [[12, 20, 4], [10, 20, 4], [9, 20, 5]], { feel: 1 }),
  ];
  const r = run(ss, 9);
  assert.equal(r.status, 'hold');
  assert.match(r.headline, /não recomendamos/);
  assert.match(r.explanation, /redução nas repetições/);
  assert.match(r.explanation, /cansaço\/fadiga/);
  assert.match(r.explanation, /não apresenta evidências suficientes/);
});

test('esforço alto (difícil/muito difícil) impede progressão mesmo batendo as repetições', () => {
  const ss = [0, 4, 8].map((d, i) => session(i, d, full(20, 4, 0)));
  const r = run(ss, 9);
  assert.equal(r.status, 'hold');
  assert.ok(r.checks.find((c) => c.key === 'effort').ok === false);
});

test('série "muito difícil" na última sessão impede progressão', () => {
  const ss = [session(1, 0, full(20, 3)), session(2, 4, full(20, 3)), session(3, 8, [[12, 20, 3], [12, 20, 3], [12, 20, 5]])];
  assert.equal(run(ss, 9).status, 'hold');
});

test('fadiga do bem-estar (≥4) no dia do último treino impede progressão', () => {
  const ss = [0, 4, 8].map((d, i) => session(i, d, full(20, 3, 2)));
  const wb = new Map([['2026-09-09', { date: '2026-09-09', fatigue: 5 }]]);
  const r = run(ss, 9, wb);
  assert.equal(r.status, 'hold');
  assert.ok(r.checks.find((c) => c.key === 'fatigue').ok === false);
});

test('histórico antigo (> 21 dias) → mantém e recomenda retomar', () => {
  const ss = [0, 4, 8].map((d, i) => session(i, d, full(20, 3, 2)));
  const r = run(ss, 40);
  assert.equal(r.status, 'hold');
  assert.match(r.explanation, /Faz 32 dias/);
});

test('mudança de carga zera a contagem (só conta sessões consecutivas com a carga atual)', () => {
  const ss = [session(1, 0, full(20, 3)), session(2, 4, full(20, 3)), session(3, 8, full(20, 3)), session(4, 12, [[10, 22, 3], [10, 22, 3], [9, 22, 4]])];
  const r = run(ss, 13);
  assert.equal(r.status, 'insufficient');
  assert.equal(r.currentLoad, 22);
  assert.match(r.explanation, /1 sessão registrada com 22 kg/);
});

test('não bateu as repetições planejadas em alguma sessão → mantém', () => {
  const ss = [session(1, 0, full(20, 3)), session(2, 4, [[12, 20, 3], [11, 20, 3], [10, 20, 3]]), session(3, 8, full(20, 3))];
  const r = run(ss, 9);
  assert.equal(r.status, 'hold');
  assert.match(r.explanation, /2 das últimas 3 sessões/);
});

test('sem esforço/RIR registrados: ainda sugere, mas avisa que não houve registro', () => {
  const ss = [0, 4, 8].map((d, i) => session(i, d, full(20)));
  const r = run(ss, 9);
  assert.equal(r.status, 'suggest');
  assert.match(r.explanation, /não registrou esforço/);
  assert.equal(r.confidence, 'média');
});

test('exercício sem carga (peso corporal) → não se aplica', () => {
  const ss = [0, 4, 8].map((d, i) => session(i, d, full(0)));
  assert.equal(run(ss, 9).status, 'na');
});

test('exercício em segundos (prancha) → não se aplica', () => {
  const r = evaluate({ entries: [], exercise: { id: 'p', repUnit: 'seg', defaults: {} } });
  assert.equal(r.status, 'na');
});

test('passo de carga: usa loadStep do exercício; padrão conservador', () => {
  assert.equal(defaultStep(8), 1);
  assert.equal(defaultStep(20), 2);
  assert.equal(defaultStep(40), 2.5);
  assert.equal(defaultStep(80), 5);
  const ex5 = { ...EX, defaults: { loadStep: 5 } };
  const ss = [0, 4, 8].map((d, i) => session(i, d, full(40, 3, 2)));
  const r = evaluate({ entries: exerciseEntries(ss, EX.id), exercise: ex5, now: T0 + 9 * DAY });
  assert.equal(r.suggestedLoad, 45);
});

test('entryLoad: carga predominante da sessão', () => {
  assert.equal(entryLoad({ sets: [{ load: 20 }, { load: 20 }, { load: 18 }] }), 20);
  assert.equal(entryLoad({ sets: [{ load: 22 }, { load: 20 }] }), 22);
});

test('stats: totais da sessão, ciclo e sequência semanal', () => {
  const s = session(1, 0, [[12, 20], [10, 20], [10, 18]]);
  s.durationSec = 3600;
  const t = sessionTotals(s);
  assert.equal(t.sets, 3);
  assert.equal(t.reps, 32);
  assert.equal(t.volume, 12 * 20 + 10 * 20 + 10 * 18);
  assert.equal(t.rest, 180);
  assert.equal(cycleDayOn('2026-09-10', ['2026-09-01']), 10);
  assert.equal(cycleDayOn('2026-09-10', []), null);
  assert.equal(weekStreak([s], [], new Date(T0 + 2 * DAY)), 1);
});

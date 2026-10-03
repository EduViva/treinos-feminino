// Motor do treino: começo direto no 1º exercício e "há descanso depois desta série?" (sem navegador).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Session, createDraft, setClock, PHASE } from '../../js/session.js';

const item = (id, sets, extra = {}) => ({ id: `it-${id}`, exerciseId: `ex-${id}`, sets, reps: 10, load: 20, rest: 60, ...extra });
const workout = (...items) => ({ id: 'w1', name: 'Treino X', items });
const make = (...items) => new Session(createDraft(workout(...items)));

test('begin(): o 1º exercício já começa (pronto para a série 1) e os outros seguem pendentes', () => {
  const s = make(item(1, 3), item(2, 2));
  assert.equal(s.phase, PHASE.OVERVIEW, 'antes de começar o rascunho está na visão geral');
  s.begin();
  assert.equal(s.phase, PHASE.READY);
  assert.equal(s.d.cursor.ei, 0);
  assert.equal(s.d.exercises[0].status, 'active');
  assert.ok(s.d.exercises[0].startedAt, 'registra o início do exercício');
  assert.equal(s.d.exercises[0].introSkipped, true, 'avisa a tela que a apresentação não foi vista');
  assert.equal(s.d.exercises[1].status, 'pending');
  assert.equal(s.nextSetIndex, 0);
});

test('begin() + startSet(): vai direto para a série em andamento (série automática ligada)', () => {
  const s = make(item(1, 2));
  s.begin(); s.startSet();
  assert.equal(s.phase, PHASE.RUNNING);
  assert.ok(s.d.cursor.setStartedAt, 'o tempo da série começa a ser registrado');
});

test('finishesWorkout: só é verdadeiro na última série do último exercício aberto', () => {
  const s = make(item(1, 2), item(2, 1));
  s.begin();
  assert.equal(s.finishesWorkout, false, 'série 1 de 2');
  s.startSet(); s.finishSet();            // série 1 → descanso
  s.proceedFromRest();
  assert.equal(s.nextSetIndex, 1);
  assert.equal(s.finishesWorkout, false, 'última série do 1º exercício, mas o 2º ainda está pendente');
  s.startSet(); s.finishSet();            // série 2 → descanso → próximo exercício
  s.proceedFromRest();
  assert.equal(s.d.cursor.ei, 1);
  s.startExercise();
  assert.equal(s.finishesWorkout, true, 'única série do último exercício');
});

test('finishesWorkout leva em conta exercícios pulados e exercícios que ainda têm séries', () => {
  const s = make(item(1, 1), item(2, 1), item(3, 1));
  s.begin();
  assert.equal(s.finishesWorkout, false, 'há mais dois exercícios pela frente');
  s.d.exercises[1].status = 'skipped';
  assert.equal(s.finishesWorkout, false, 'o 3º ainda está pendente');
  s.d.exercises[2].status = 'skipped';
  assert.equal(s.finishesWorkout, true, 'o resto foi pulado: esta série encerra o treino');
});

test('séries do meio têm descanso com contagem; a última do treino vai direto para "finalizar"', () => {
  const s = make(item(1, 2));
  s.begin(); s.startSet();
  assert.equal(s.finishesWorkout, false);
  s.finishSet();
  assert.equal(s.phase, PHASE.REST);
  assert.ok(s.d.cursor.rest.endsAt, 'descanso cronometrado entre as séries');
  assert.equal(s.d.cursor.rest.next, 'set');
  s.proceedFromRest(); s.startSet();
  assert.equal(s.finishesWorkout, true);
  s.finishSet();
  assert.equal(s.d.cursor.rest.next, 'finish');
  assert.equal(s.d.cursor.rest.endsAt, null, 'sem descanso depois da última série do treino');
});

test('o tempo de cada série continua sendo registrado (mesmo sem cronômetro na tela)', () => {
  let now = 1_000_000;
  setClock(() => now);
  try {
    const s = make(item(1, 2));
    s.begin(); s.startSet();
    now += 42_000;
    const set = s.finishSet();
    assert.equal(set.durationSec, 42);
    assert.equal(set.restPlanned, 60);
  } finally { setClock(() => Date.now()); }
});

// Motor da sessão de treino (sem DOM). Baseado em carimbos de tempo, então sobrevive a
// tela bloqueada / app em segundo plano. O rascunho é salvo a cada evento.
//
// Separação fundamental:
//   planned  = o que o treino planejado dizia no início da sessão (nunca muda)
//   target   = o alvo de HOJE (pode ser ajustado: "usar somente hoje" ou "tornar novo padrão")
//   sets[]   = o que REALMENTE aconteceu (carga/reps realizadas, tempos, descanso)
import { uid, round1 } from './util.js';
import * as store from './store.js';
import { sessionTotals } from './stats.js';

export const PHASE = { OVERVIEW: 'overview', INTRO: 'intro', READY: 'ready', RUNNING: 'running', REST: 'rest', FINISH: 'finish', SUMMARY: 'summary' };

let clock = () => Date.now();
export const setClock = (fn) => { clock = fn; };

export function createDraft(workout) {
  const t = clock();
  return {
    id: uid(), workoutId: workout.id, workoutName: workout.name, workoutDescription: workout.description || '',
    startedAt: t, endedAt: null, feel: null, note: '', version: 1,
    exercises: workout.items.map((it) => {
      const ex = store.getExercise(it.exerciseId) || {};
      const planned = { sets: it.sets, reps: it.reps, load: it.load || 0, rest: it.rest ?? 90 };
      return {
        itemId: it.id, exerciseId: it.exerciseId, name: ex.name || 'Exercício', group: ex.group, secondary: ex.secondary || [], equipment: ex.equipment,
        art: ex.art || null, repUnit: ex.repUnit || 'reps', bodyweight: !!ex.bodyweight, notes: it.notes || '',
        planned, target: { ...planned }, changes: [],
        status: 'pending', startedAt: null, endedAt: null, durationSec: 0, sets: [],
      };
    }),
    cursor: { ei: 0, phase: PHASE.OVERVIEW, setStartedAt: null, rest: null },
  };
}

export class Session {
  constructor(draft, { onChange } = {}) {
    this.d = draft;
    this.onChange = onChange || (() => {});
  }
  get cur() { return this.d.exercises[this.d.cursor.ei]; }
  get phase() { return this.d.cursor.phase; }
  get nextSetIndex() { return this.cur ? this.cur.sets.length : 0; }
  get setsTotal() { return this.cur ? this.cur.target.sets : 0; }
  get isLastSetOfExercise() { return this.nextSetIndex >= this.setsTotal; }

  _save() { this.onChange(this.d); store.saveDraft(this.d).catch(() => {}); }
  elapsedSec() { return Math.max(0, (clock() - this.d.startedAt) / 1000); }

  // ----- navegação -----
  goTo(ei) {
    const c = this.d.cursor;
    this._closeRestIfAny();
    c.ei = ei; c.setStartedAt = null; c.rest = null;
    const ex = this.cur;
    c.phase = ex.status === 'active' && ex.sets.length ? (this.isLastSetOfExercise ? PHASE.INTRO : PHASE.READY) : PHASE.INTRO;
    this._save();
  }
  openOverview() { this.d.cursor.phase = PHASE.OVERVIEW; this._save(); }
  nextPendingIndex(from = this.d.cursor.ei) {
    const n = this.d.exercises.length;
    for (let k = 1; k <= n; k++) {
      const i = (from + k) % n;
      const e = this.d.exercises[i];
      if (e.status === 'pending' || (e.status === 'active' && e.sets.length < e.target.sets)) return i;
    }
    return -1;
  }

  openIndex() { // primeiro exercício ainda aberto, a partir do atual
    const n = this.d.exercises.length;
    for (let k = 0; k < n; k++) {
      const i = (this.d.cursor.ei + k) % n, e = this.d.exercises[i];
      if (e.status === 'pending' || (e.status === 'active' && e.sets.length < e.target.sets)) return i;
    }
    return -1;
  }
  // Reabre um exercício concluído/pulado para fazer uma série extra (ou fazê-lo agora).
  reopen() {
    const ex = this.cur, t = clock();
    if (ex.sets.length) { ex.changes.push({ at: t, scope: 'today', from: { ...ex.target }, to: { ...ex.target, sets: ex.sets.length + 1 } }); ex.target.sets = ex.sets.length + 1; }
    ex.status = 'active'; ex.startedAt = ex.startedAt || t; ex.endedAt = null;
    this.d.cursor.phase = PHASE.READY; this.d.cursor.setStartedAt = null;
    this._save();
  }

  // ----- exercício -----
  startExercise() {
    const ex = this.cur, t = clock();
    if (ex.status !== 'active') { ex.status = 'active'; ex.startedAt = ex.startedAt || t; }
    this.d.cursor.phase = PHASE.READY;
    this.d.cursor.setStartedAt = null;
    this._save();
  }
  skipExercise() {
    const ex = this.cur;
    this._closeRestIfAny();
    if (!ex.sets.length) { ex.status = 'skipped'; } else { this._endExercise(); }
    this._advanceAfterExercise();
  }
  _endExercise() {
    const ex = this.cur, t = clock();
    ex.status = 'done';
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.endedAt = lastSet ? lastSet.endedAt : t;
    ex.durationSec = Math.round((ex.endedAt - (ex.startedAt || ex.endedAt)) / 1000);
  }
  _advanceAfterExercise() {
    const i = this.nextPendingIndex();
    if (i < 0) { this.d.cursor.phase = PHASE.FINISH; this.d.cursor.rest = null; this._save(); return; }
    this.goTo(i);
  }

  // ----- série -----
  startSet() {
    this._closeRestIfAny();
    const c = this.d.cursor;
    c.phase = PHASE.RUNNING; c.setStartedAt = clock(); c.rest = null;
    this._save();
  }
  // Termina a série. Valores prefilled = alvo de hoje; a usuária pode corrigir depois (editLastSet).
  finishSet({ reps, load } = {}) {
    const ex = this.cur, c = this.d.cursor, t = clock();
    const n = ex.sets.length;
    const tgt = ex.target;
    const startedAt = c.setStartedAt || t;
    const set = {
      n: n + 1,
      plannedReps: ex.planned.reps, plannedLoad: ex.planned.load, plannedRest: ex.planned.rest,
      targetReps: tgt.reps, targetLoad: tgt.load, targetRest: tgt.rest,
      reps: reps ?? tgt.reps, load: load ?? tgt.load,
      startedAt, endedAt: t, durationSec: Math.round((t - startedAt) / 1000),
      restPlanned: tgt.rest, restStartedAt: null, restEndedAt: null, restActual: 0,
      effort: null, rir: null, touched: reps != null || load != null,
    };
    ex.sets.push(set);
    c.setStartedAt = null;
    const lastOfExercise = ex.sets.length >= tgt.sets;
    const lastExercise = this.nextPendingIndex() < 0;
    if (lastOfExercise) this._endExercise();
    if (lastOfExercise && lastExercise) {
      c.phase = PHASE.REST; c.rest = { endsAt: null, startedAt: t, plannedSec: 0, setIdx: ex.sets.length - 1, next: 'finish', ei: c.ei };
    } else {
      set.restStartedAt = t;
      c.phase = PHASE.REST;
      c.rest = { startedAt: t, plannedSec: tgt.rest, endsAt: t + tgt.rest * 1000, setIdx: ex.sets.length - 1, next: lastOfExercise ? 'exercise' : 'set', ei: c.ei, alerted: tgt.rest <= 0 };
    }
    this._save();
    return set;
  }
  editLastSet(patch) { // reps/load/effort/rir da última série concluída
    const ex = this.d.exercises[this.d.cursor.rest ? this.d.cursor.rest.ei : this.d.cursor.ei];
    const s = ex.sets[ex.sets.length - 1];
    if (!s) return;
    Object.assign(s, patch, { touched: true });
    this._save();
  }

  // ----- descanso -----
  restRemainingSec() {
    const r = this.d.cursor.rest;
    if (!r || !r.endsAt) return 0;
    return (r.endsAt - clock()) / 1000;
  }
  restElapsedSec() { const r = this.d.cursor.rest; return r ? (clock() - r.startedAt) / 1000 : 0; }
  addRest(sec) {
    const r = this.d.cursor.rest; if (!r || !r.endsAt) return;
    r.endsAt += sec * 1000; r.plannedSec += sec; r.alerted = r.endsAt <= clock();
    this._setPlannedRestOnSet(r);
    this._save();
  }
  setRest(sec) { // EDITAR: define o descanso total desta pausa
    const r = this.d.cursor.rest; if (!r) return;
    r.plannedSec = sec; r.endsAt = r.startedAt + sec * 1000; r.alerted = r.endsAt <= clock();
    this._setPlannedRestOnSet(r);
    this._save();
  }
  _setPlannedRestOnSet(r) {
    const ex = this.d.exercises[r.ei]; const s = ex.sets[r.setIdx]; if (s) s.restPlanned = r.plannedSec;
  }
  markRestAlerted() { const r = this.d.cursor.rest; if (r) { r.alerted = true; store.saveDraft(this.d).catch(() => {}); } }
  restDue() { const r = this.d.cursor.rest; return !!(r && r.endsAt && !r.alerted && clock() >= r.endsAt); }
  _closeRestIfAny() {
    const r = this.d.cursor.rest;
    if (!r) return;
    const ex = this.d.exercises[r.ei]; const s = ex && ex.sets[r.setIdx];
    if (s && s.restStartedAt && !s.restEndedAt) {
      s.restEndedAt = clock();
      s.restActual = Math.round((s.restEndedAt - s.restStartedAt) / 1000);
    }
    this.d.cursor.rest = null;
  }
  // Após o descanso (ou pulando): segue para a próxima série/exercício.
  proceedFromRest({ autoStart = false } = {}) {
    const r = this.d.cursor.rest;
    const next = r ? r.next : 'set';
    this._closeRestIfAny();
    if (next === 'finish') { this.d.cursor.phase = PHASE.FINISH; this._save(); return; }
    if (next === 'exercise') { this._advanceAfterExercise(); return; }
    if (autoStart) this.startSet(); else { this.d.cursor.phase = PHASE.READY; this._save(); }
  }

  // ----- ajustes do plano durante o treino -----
  // scope: 'today' (somente hoje) | 'default' (também altera o padrão do treino)
  async adjustTarget(patch, scope) {
    const ex = this.cur;
    const from = { ...ex.target };
    const to = { ...ex.target, ...patch };
    ex.target = to;
    ex.changes.push({ at: clock(), scope, from, to });
    if (scope === 'default') await this._applyDefault(ex, patch);
    this._save();
  }
  async _applyDefault(ex, patch) {
    const w = store.getWorkout(this.d.workoutId);
    if (!w) return;
    const items = w.items.map((it) => (it.id === ex.itemId ? { ...it, ...patch } : it));
    await store.saveWorkout({ ...w, items });
  }
  addExtraSet() { const ex = this.cur; ex.target.sets += 1; ex.changes.push({ at: clock(), scope: 'today', from: { ...ex.target, sets: ex.target.sets - 1 }, to: { ...ex.target } }); this._save(); }

  // ----- finalização -----
  finishWorkout() {
    this._closeRestIfAny();
    const t = clock();
    for (const ex of this.d.exercises) {
      if (ex.status === 'active') { ex.status = ex.sets.length ? 'done' : 'skipped'; if (ex.sets.length) { const l = ex.sets[ex.sets.length - 1]; ex.endedAt = l.endedAt; ex.durationSec = Math.round((ex.endedAt - ex.startedAt) / 1000); } }
      if (ex.status === 'pending') ex.status = 'skipped';
    }
    this.d.endedAt = t;
    this.d.durationSec = Math.round((t - this.d.startedAt) / 1000);
    this.d.cursor.phase = PHASE.SUMMARY; this.d.cursor.rest = null;
    this._save();
    return this.record();
  }
  // Registro imutável do que aconteceu (sem estado de navegação).
  record() {
    const { cursor, version, ...rec } = this.d;
    const out = JSON.parse(JSON.stringify(rec));
    out.totals = sessionTotals(out);
    out.restTotalSec = out.totals.rest;
    out.durationSec = this.d.durationSec ?? Math.round(((this.d.endedAt || clock()) - this.d.startedAt) / 1000);
    return out;
  }
  setFeel(feel, note) { this.d.feel = feel; this.d.note = note || ''; this._save(); }
}

// Helpers compartilhados entre telas.
import { h, fmtNum, fmtDur, fmtDate, fmtTime, sum, isTimed, unitShort, unitLong } from '../util.js';
import * as store from '../store.js';
import { segmented } from '../ui.js';
import { app } from '../app.js';
import { exerciseEntries } from '../stats.js';
import { effortLabel } from '../data/seed.js';

export function loadText(ex, load) {
  if (!load) return ex && ex.bodyweight ? 'Peso corporal' : 'A definir';
  return `${fmtNum(load, 1)} kg`;
}
export const repUnitText = (ex, n) => (ex && isTimed(ex.repUnit) ? `${n} ${unitShort(ex.repUnit)}` : `${n}`);
export function setsRepsText(ex, p) {
  return `${p.sets} × ${repUnitText(ex, p.reps)}`;
}
export const restText = (sec) => (sec >= 60 && sec % 60 === 0 ? `${sec / 60} min` : sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${sec} s`);

export function planFromItem(ex, item) {
  const d = ex?.defaults || {};
  return {
    sets: item?.sets ?? d.sets ?? 3, reps: item?.reps ?? d.reps ?? 12,
    load: item?.load ?? d.load ?? 0, rest: item?.rest ?? d.rest ?? store.state.settings.defaultRest,
  };
}

export function libraryTabs(active) {
  return segmented({
    options: [['treinos', 'Treinos'], ['exercicios', 'Exercícios']], value: active,
    onChange: (v) => app.navigate(v === 'treinos' ? '/treinos' : '/exercicios'),
  });
}

// Última vez que o exercício foi feito (para o modo treino e tela do exercício)
export function lastTime(exerciseId) {
  const e = exerciseEntries(store.state.sessions, exerciseId, store.state.wellbeing)[0];
  return e || null;
}
export function lastTimeNode(exerciseId, ex) {
  const e = lastTime(exerciseId);
  if (!e) return h('div', { class: 's-last' }, 'Primeira vez neste exercício — sem histórico ainda.');
  return h('div', { class: 's-last' },
    h('b', null, 'Última vez · '), fmtDate(e.startedAt), h('br'),
    e.sets.map((s, i) => h('span', null, i ? '  ·  ' : '', fmtSet(ex, s))));
}

// "22 kg × 10", "12 reps" (sem carga) ou "30 s" (exercício em tempo)
export function fmtSet(ex, s) {
  const unitSeg = ex && isTimed(ex.repUnit);
  const u = unitShort(ex && ex.repUnit);
  if (s.load) return `${fmtNum(s.load, 1)} kg × ${unitSeg ? s.reps + ' ' + u : s.reps}`;
  return unitSeg ? `${s.reps} ${u}` : `${s.reps} reps`;
}
export const setLineText = fmtSet;
export function setExtras(s) {
  const bits = [];
  if (s.effort) bits.push(effortLabel(s.effort).toLowerCase());
  if (s.rir != null) bits.push(`${s.rir === 3 ? '3+' : s.rir} sobrando`);
  return bits.join(' · ');
}

export function sessionTimeLabel(s) {
  return `${fmtDate(s.startedAt, { year: true })} · ${fmtTime(s.startedAt)}`;
}

export function groupMuscles(ex) {
  const prim = ex.group ? [ex.group] : [];
  return { prim, sec: (ex.secondary || []).filter((x) => x !== ex.group) };
}

export const totalVolume = (sets) => sum(sets, (s) => (s.load || 0) * (s.reps || 0));
export { fmtDur };

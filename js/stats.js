// Agregações puras sobre o histórico (sem acesso a DOM nem banco).
import { sum, startOfDay, startOfWeek, addDays, dateKey } from './util.js';

export const PERIODS = [
  { id: '7d', label: '7 dias', days: 7 },
  { id: '30d', label: '30 dias', days: 30 },
  { id: '3m', label: '3 meses', days: 91 },
  { id: '6m', label: '6 meses', days: 182 },
  { id: '1a', label: '1 ano', days: 365 },
  { id: 'tudo', label: 'Tudo', days: null },
];

export function periodRange(id, nowTs = Date.now()) {
  const p = PERIODS.find((x) => x.id === id) || PERIODS[1];
  const to = nowTs;
  const from = p.days == null ? 0 : startOfDay(addDays(new Date(nowTs), -(p.days - 1))).getTime();
  return { from, to, days: p.days, id: p.id };
}
export const inRange = (ts, r) => ts >= r.from && ts <= r.to;

// ----- Totais de um treino realizado -----
export function exerciseDone(ex) { return ex.status !== 'skipped' && ex.sets && ex.sets.length > 0; }

export function setVolume(set, ex) {
  if (ex && ex.repUnit === 'seg') return 0;
  return (set.load || 0) * (set.reps || 0);
}

export function sessionTotals(s) {
  const done = s.exercises.filter(exerciseDone);
  const sets = sum(done, (e) => e.sets.length);
  const reps = sum(done, (e) => (e.repUnit === 'seg' ? 0 : sum(e.sets, (x) => x.reps)));
  const volume = sum(done, (e) => sum(e.sets, (x) => setVolume(x, e)));
  const rest = sum(done, (e) => sum(e.sets, (x) => x.restActual));
  const duration = s.durationSec != null ? s.durationSec : Math.max(0, ((s.endedAt || s.startedAt) - s.startedAt) / 1000);
  return { exercises: done.length, sets, reps, volume, rest, duration };
}

export function aggregate(sessions) {
  const t = { count: sessions.length, duration: 0, exercises: 0, sets: 0, reps: 0, volume: 0, rest: 0 };
  for (const s of sessions) {
    const x = sessionTotals(s);
    t.duration += x.duration; t.exercises += x.exercises; t.sets += x.sets;
    t.reps += x.reps; t.volume += x.volume; t.rest += x.rest;
  }
  return t;
}

export function weekSessions(sessions, ref = new Date()) {
  const a = startOfWeek(ref).getTime();
  const b = addDays(startOfWeek(ref), 7).getTime();
  return sessions.filter((s) => s.startedAt >= a && s.startedAt < b);
}

// ----- Histórico por exercício (mais recente primeiro) -----
export function exerciseEntries(sessions, exerciseId, wellbeing) {
  const out = [];
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId || !exerciseDone(ex)) continue;
      const loads = ex.sets.map((x) => x.load || 0);
      const efforts = ex.sets.map((x) => x.effort).filter((v) => v != null);
      const rirs = ex.sets.map((x) => x.rir).filter((v) => v != null);
      const wb = wellbeing ? wellbeing.get(dateKey(s.startedAt)) : null;
      out.push({
        sessionId: s.id, startedAt: s.startedAt, workoutName: s.workoutName,
        repUnit: ex.repUnit || 'reps',
        plannedSets: ex.planned?.sets, plannedReps: ex.planned?.reps, plannedLoad: ex.planned?.load,
        sets: ex.sets,
        maxLoad: Math.max(0, ...loads),
        totalReps: sum(ex.sets, (x) => x.reps),
        volume: sum(ex.sets, (x) => setVolume(x, ex)),
        durationSec: ex.durationSec, restTotal: sum(ex.sets, (x) => x.restActual),
        avgEffort: efforts.length ? sum(efforts) / efforts.length : null,
        avgRir: rirs.length ? sum(rirs) / rirs.length : null,
        feel: s.feel ?? null,
        fatigue: wb && wb.fatigue != null ? wb.fatigue : null,
        changes: ex.changes || [],
      });
    }
  }
  return out.sort((a, b) => b.startedAt - a.startedAt);
}

// ----- Séries temporais -----
// Agrupa itens por semana (segunda a domingo) dentro do período.
export function weeklySeries(items, range, valueOf, tsOf = (x) => x.startedAt) {
  const first = range.from ? startOfWeek(new Date(range.from)) : (items.length ? startOfWeek(new Date(Math.min(...items.map(tsOf)))) : startOfWeek(new Date()));
  const last = startOfWeek(new Date(range.to));
  const weeks = [];
  for (let d = new Date(first); d <= last; d = addDays(d, 7)) weeks.push({ start: new Date(d), value: 0, n: 0 });
  for (const it of items) {
    const ts = tsOf(it);
    if (!inRange(ts, range)) continue;
    const w = weeks.find((x) => ts >= x.start.getTime() && ts < addDays(x.start, 7).getTime());
    if (w) { w.value += valueOf(it) || 0; w.n++; }
  }
  return weeks;
}

export function dailySeries(items, range, valueOf, tsOf = (x) => x.startedAt) {
  const map = new Map();
  for (const it of items) {
    const ts = tsOf(it);
    if (!inRange(ts, range)) continue;
    const k = dateKey(ts);
    map.set(k, (map.get(k) || 0) + (valueOf(it) || 0));
  }
  return map;
}

// Séries por grupo muscular (principal conta 1; secundários contam 0,5).
export function muscleLoad(sessions, exercisesMap, range) {
  const m = new Map();
  for (const s of sessions) {
    if (!inRange(s.startedAt, range)) continue;
    for (const ex of s.exercises) {
      if (!exerciseDone(ex)) continue;
      const lib = exercisesMap.get(ex.exerciseId);
      const group = ex.group || lib?.group || 'Outro';
      m.set(group, (m.get(group) || 0) + ex.sets.length);
      for (const sec of ex.secondary || lib?.secondary || []) m.set(sec, (m.get(sec) || 0) + ex.sets.length * 0.5);
    }
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// Sequência de semanas consecutivas (incluindo a atual, se já houve treino) com ao menos 1 treino.
export function weekStreak(sessions, activities = [], ref = new Date()) {
  const days = new Set([...sessions.map((s) => dateKey(s.startedAt)), ...activities.map((a) => dateKey(a.startedAt))]);
  let streak = 0;
  let wk = startOfWeek(ref);
  const hasWeek = (start) => { for (let i = 0; i < 7; i++) if (days.has(dateKey(addDays(start, i)))) return true; return false; };
  if (!hasWeek(wk)) wk = addDays(wk, -7); // semana atual ainda sem treino não quebra a sequência
  while (hasWeek(wk)) { streak++; wk = addDays(wk, -7); }
  return streak;
}

// ----- Atividades -----
export function paceFrom(durationMin, distanceKm) {
  if (!durationMin || !distanceKm) return null;
  return (durationMin * 60) / distanceKm; // seg/km
}
export function speedFrom(durationMin, distanceKm) {
  if (!durationMin || !distanceKm) return null;
  return distanceKm / (durationMin / 60);
}
export function fmtPace(secPerKm) {
  if (!secPerKm) return '—';
  const m = Math.floor(secPerKm / 60), s = Math.round(secPerKm % 60);
  return `${m}:${String(s === 60 ? 59 : s).padStart(2, '0')} /km`;
}

// ----- Ciclo menstrual (apenas descritivo, a partir dos registros) -----
export function cycleStarts(wellbeing) {
  return [...wellbeing.values()].filter((w) => w.cycleStart).map((w) => w.date).sort();
}
export function cycleDayOn(dateStr, starts) {
  let last = null;
  for (const s of starts) { if (s <= dateStr) last = s; else break; }
  if (!last) return null;
  const a = new Date(last + 'T12:00:00'), b = new Date(dateStr + 'T12:00:00');
  const n = Math.round((b - a) / 86400000) + 1;
  return n >= 1 && n <= 60 ? n : null; // acima de 60 dias, não assume ciclo
}
export function avgCycleLength(starts) {
  if (starts.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < starts.length; i++) {
    const g = Math.round((new Date(starts[i] + 'T12:00:00') - new Date(starts[i - 1] + 'T12:00:00')) / 86400000);
    if (g >= 15 && g <= 60) gaps.push(g);
  }
  return gaps.length ? sum(gaps) / gaps.length : null;
}

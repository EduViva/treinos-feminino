// Mapeamento PURO entre os registros do app (documentos locais) e as linhas das tabelas normalizadas
// do Supabase. Sem rede, sem IndexedDB, sem DOM: totalmente testável (tests/unit/mappers.test.mjs).
//
//   app (IndexedDB)                    Supabase
//   exercises  (catálogo + próprios)   exercises + exercise_secondary_muscles
//   prefs      (favorito, padrões…)    user_exercise_prefs
//   workouts   (itens embutidos)       workouts + workout_exercises
//   sessions   (planejado×realizado)   workout_sessions + session_exercises + session_sets
//   activities / wellbeing / weights / suggestions / media / profile
//
// Regra: o app guarda grupo/equipamento como RÓTULO ("Peitoral"); o banco usa o id ("peitoral").
import * as tx from '../data/taxonomy.js';
import { isUuid } from './uuid.js';
import { sessionTotals } from '../stats.js';

export const iso = (ms) => (ms == null || ms === '' ? null : new Date(ms).toISOString());
export const ms = (s) => (s == null ? null : new Date(s).getTime());
const num = (v) => (v == null || v === '' ? null : Number(v));
const clamp = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
const int = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)));
const scale5 = (v) => (v >= 1 && v <= 5 ? Math.round(v) : null);
const secToIso = (t) => iso(t);

// ================================================================= exercícios
const byGroupOrder = (a, b) => tx.MUSCLE_GROUPS.findIndex((g) => g.name === a) - tx.MUSCLE_GROUPS.findIndex((g) => g.name === b);

// Linha (com exercise_secondary_muscles embutido) → registro BASE do app (sem as preferências pessoais).
export function exerciseFromRow(row) {
  const secondary = (row.exercise_secondary_muscles || []).map((r) => tx.groups.name(r.muscle_group_id)).filter(Boolean).sort(byGroupOrder);
  return {
    id: row.id, slug: row.slug || null, origin: row.origin, builtin: row.origin === 'catalog',
    name: row.name, aliases: row.aliases || [],
    group: tx.groups.name(row.primary_group_id) || tx.groups.name('outros'),
    secondary, equipment: tx.equipment.name(row.equipment_id) || tx.equipment.name('outro'),
    kind: row.exercise_type_id || 'forca', level: row.level || null, art: row.art_key || null,
    instructions: row.instructions || [], tips: row.tips || [],
    defaults: { sets: row.default_sets, reps: row.default_reps, load: num(row.default_load) || 0, rest: row.default_rest_seconds, loadStep: num(row.load_step) || 1 },
    repUnit: row.rep_unit || 'reps', bodyweight: !!row.is_bodyweight,
    ownerId: row.owner_id || null, visibility: row.visibility || 'private', parentId: row.parent_exercise_id || null,
    inactive: row.is_active === false,
    createdAt: ms(row.created_at), updatedAt: ms(row.updated_at),
  };
}

// Exercício PRÓPRIO (custom) → { row, secondary[] } para gravar. Catálogo nunca é enviado.
export function exerciseToRows(ex, userId) {
  const d = ex.defaults || {};
  const group = tx.groups.id(ex.group) || 'outros';
  const row = {
    id: ex.id, origin: 'custom', name: String(ex.name || '').trim() || 'Exercício',
    aliases: ex.aliases || [], primary_group_id: group, equipment_id: tx.equipment.id(ex.equipment) || 'outro',
    exercise_type_id: tx.types.has(ex.kind) ? ex.kind : 'forca', level: tx.levels.has(ex.level) ? ex.level : null,
    instructions: ex.instructions || [], tips: ex.tips || [], art_key: ex.art || null,
    default_sets: clamp(d.sets, 1, 20, 3), default_reps: clamp(d.reps, 1, 3600, 12), default_rest_seconds: clamp(d.rest, 0, 900, 90),
    default_load: Math.max(0, Number(d.load) || 0), load_step: Number(d.loadStep) > 0 ? Number(d.loadStep) : 1,
    rep_unit: ['reps', 'seg', 'min'].includes(ex.repUnit) ? ex.repUnit : 'reps', is_bodyweight: !!ex.bodyweight, is_active: true,
    owner_id: userId, visibility: ex.visibility && ex.visibility !== 'public' ? ex.visibility : 'private',
    parent_exercise_id: isUuid(ex.parentId) ? ex.parentId : null, deleted_at: null,
  };
  const secondary = [...new Set((ex.secondary || []).map((l) => tx.groups.id(l)).filter(Boolean))].filter((id) => id !== group);
  return { row, secondary };
}

// ---------------------------------------------------------------- preferências pessoais
const PREF_KEYS = ['sets', 'reps', 'load', 'rest', 'loadStep'];

export function prefsToRow(p, userId) {
  const d = p.defaults || {};
  return {
    user_id: userId, exercise_id: p.exerciseId, is_favorite: !!p.favorite, is_archived: !!p.archived, notes: p.notes || '',
    default_sets: d.sets != null ? clamp(d.sets, 1, 20, null) : null, default_reps: d.reps != null ? clamp(d.reps, 1, 3600, null) : null,
    default_load: d.load != null ? Math.max(0, Number(d.load) || 0) : null, default_rest_seconds: d.rest != null ? clamp(d.rest, 0, 900, null) : null,
    load_step: d.loadStep > 0 ? Number(d.loadStep) : null,
    primary_media_id: isUuid(p.mediaPrimary) ? p.mediaPrimary : null,
  };
}
export function prefsFromRow(r) {
  return {
    exerciseId: r.exercise_id, favorite: !!r.is_favorite, archived: !!r.is_archived, notes: r.notes || '',
    defaults: { sets: r.default_sets ?? null, reps: r.default_reps ?? null, load: num(r.default_load), rest: r.default_rest_seconds ?? null, loadStep: num(r.load_step) },
    mediaPrimary: r.primary_media_id || null, updatedAt: ms(r.updated_at),
  };
}

// Junta o registro base com as preferências do usuário → o que as telas enxergam.
export function applyPrefs(base, prefs) {
  const p = prefs || {}, d = p.defaults || {}, bd = base.defaults || {};
  return {
    ...base, favorite: !!p.favorite, archived: !!p.archived, notes: p.notes || '', mediaPrimary: p.mediaPrimary || null,
    defaults: { sets: d.sets ?? bd.sets, reps: d.reps ?? bd.reps, load: d.load ?? bd.load ?? 0, rest: d.rest ?? bd.rest, loadStep: d.loadStep ?? bd.loadStep },
  };
}

// Divide o exercício editado em { base, prefs }.
//  • exercício PRÓPRIO (dono): os padrões fazem parte do exercício (base); prefs guarda favorito/arquivado/obs./mídia
//  • exercício do CATÁLOGO ou de outro dono: nada do exercício muda; os padrões ajustados viram preferência pessoal
export function splitExercise(merged, base, userId) {
  const isOwner = !merged.builtin && (!merged.ownerId || merged.ownerId === userId);
  const prefs = {
    exerciseId: merged.id, favorite: !!merged.favorite, archived: !!merged.archived, notes: merged.notes || '',
    mediaPrimary: merged.mediaPrimary || null, defaults: { sets: null, reps: null, load: null, rest: null, loadStep: null },
  };
  if (!isOwner) {
    const bd = base?.defaults || {};
    for (const k of PREF_KEYS) if (merged.defaults?.[k] != null && merged.defaults[k] !== bd[k]) prefs.defaults[k] = merged.defaults[k];
    return { base: null, prefs };
  }
  const { favorite, archived, notes, mediaPrimary, ...own } = merged;
  return { base: { ...own, builtin: false, origin: 'custom', ownerId: merged.ownerId || userId }, prefs };
}

// ================================================================= treinos
export function workoutToRows(w, userId) {
  const row = {
    id: w.id, user_id: userId, name: String(w.name || '').trim() || 'Treino', description: w.description || '',
    weekday: w.weekday >= 1 && w.weekday <= 7 ? w.weekday : null, position: int(w.order) ?? 0, is_archived: !!w.archived, deleted_at: null,
  };
  const items = (w.items || []).filter((it) => isUuid(it.exerciseId) && isUuid(it.id)).map((it, i) => ({
    id: it.id, workout_id: w.id, user_id: userId, exercise_id: it.exerciseId, position: i,
    sets: clamp(it.sets, 1, 20, 3), reps: clamp(it.reps, 1, 3600, 12), load: Math.max(0, Number(it.load) || 0),
    rest_seconds: clamp(it.rest, 0, 900, 90), notes: it.notes || '',
  }));
  return { row, items };
}
export function workoutFromRows(row, itemRows) {
  return {
    id: row.id, name: row.name, description: row.description || '', weekday: row.weekday ?? null, order: row.position ?? 0, archived: !!row.is_archived,
    items: [...(itemRows || [])].sort((a, b) => a.position - b.position).map((r) => ({
      id: r.id, exerciseId: r.exercise_id, sets: r.sets, reps: r.reps, load: num(r.load) || 0, rest: r.rest_seconds, notes: r.notes || '',
    })),
    createdAt: ms(row.created_at), updatedAt: ms(row.updated_at),
    createdBy: row.created_by || null,
  };
}

// ================================================================= sessões (planejado × realizado)
export function sessionToRows(s, userId) {
  const session = {
    id: s.id, user_id: userId, workout_id: isUuid(s.workoutId) ? s.workoutId : null,
    workout_name: s.workoutName || 'Treino', workout_description: s.workoutDescription || '',
    started_at: iso(s.startedAt), ended_at: iso(s.endedAt), duration_seconds: int(s.durationSec),
    feel: scale5(s.feel), note: s.note || '', deleted_at: null,
  };
  const exercises = [], sets = [];
  (s.exercises || []).forEach((x, pos) => {
    const p = x.planned || {}, t = x.target || {};
    exercises.push({
      session_id: s.id, position: pos, user_id: userId, plan_item_id: isUuid(x.itemId) ? x.itemId : null,
      exercise_id: isUuid(x.exerciseId) ? x.exerciseId : null,
      exercise_snapshot: { name: x.name, group: x.group ?? null, secondary: x.secondary || [], equipment: x.equipment ?? null, art: x.art ?? null, repUnit: x.repUnit || 'reps', bodyweight: !!x.bodyweight },
      status: ['pending', 'active', 'done', 'skipped'].includes(x.status) ? x.status : 'pending',
      planned_sets: int(p.sets), planned_reps: int(p.reps), planned_load: num(p.load), planned_rest_seconds: int(p.rest),
      target_sets: int(t.sets), target_reps: int(t.reps), target_load: num(t.load), target_rest_seconds: int(t.rest),
      changes: x.changes || [], notes: x.notes || '', started_at: iso(x.startedAt), ended_at: iso(x.endedAt), duration_seconds: int(x.durationSec),
    });
    (x.sets || []).forEach((st, i) => sets.push({
      session_id: s.id, exercise_position: pos, set_number: st.n ?? i + 1, user_id: userId,
      planned_reps: int(st.plannedReps), planned_load: num(st.plannedLoad), planned_rest_seconds: int(st.plannedRest),
      target_reps: int(st.targetReps), target_load: num(st.targetLoad), target_rest_seconds: int(st.targetRest),
      reps: Math.max(0, int(st.reps) ?? 0), load: Math.max(0, Number(st.load) || 0),
      started_at: iso(st.startedAt), ended_at: iso(st.endedAt), duration_seconds: int(st.durationSec),
      rest_planned_seconds: int(st.restPlanned), rest_started_at: secToIso(st.restStartedAt), rest_ended_at: secToIso(st.restEndedAt), rest_actual_seconds: int(st.restActual),
      effort: st.effort >= 1 && st.effort <= 5 ? st.effort : null, rir: st.rir >= 0 && st.rir <= 3 ? st.rir : null, touched: !!st.touched,
    }));
  });
  return { session, exercises, sets };
}

const planOf = (a, b, c, d) => ({ sets: a ?? undefined, reps: b ?? undefined, load: c == null ? undefined : Number(c), rest: d ?? undefined });
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

// `row` = workout_sessions com session_exercises(*, session_sets(*)) embutidos
export function sessionFromRows(row) {
  const exs = [...(row.session_exercises || [])].sort((a, b) => a.position - b.position).map((x) => {
    const snap = x.exercise_snapshot || {};
    const sets = [...(x.session_sets || [])].sort((a, b) => a.set_number - b.set_number).map((st) => ({
      n: st.set_number, plannedReps: st.planned_reps, plannedLoad: num(st.planned_load), plannedRest: st.planned_rest_seconds,
      targetReps: st.target_reps, targetLoad: num(st.target_load), targetRest: st.target_rest_seconds,
      reps: st.reps, load: num(st.load) || 0, startedAt: ms(st.started_at), endedAt: ms(st.ended_at), durationSec: st.duration_seconds ?? 0,
      restPlanned: st.rest_planned_seconds, restStartedAt: ms(st.rest_started_at), restEndedAt: ms(st.rest_ended_at), restActual: st.rest_actual_seconds ?? 0,
      effort: st.effort ?? null, rir: st.rir ?? null, touched: !!st.touched,
    }));
    return {
      itemId: x.plan_item_id, exerciseId: x.exercise_id, name: snap.name || 'Exercício', group: snap.group ?? undefined, secondary: snap.secondary || [],
      equipment: snap.equipment ?? undefined, art: snap.art ?? null, repUnit: snap.repUnit || 'reps', bodyweight: !!snap.bodyweight, notes: x.notes || '',
      planned: clean(planOf(x.planned_sets, x.planned_reps, x.planned_load, x.planned_rest_seconds)),
      target: clean(planOf(x.target_sets, x.target_reps, x.target_load, x.target_rest_seconds)),
      changes: x.changes || [], status: x.status, startedAt: ms(x.started_at), endedAt: ms(x.ended_at), durationSec: x.duration_seconds ?? 0, sets,
    };
  });
  const rec = {
    id: row.id, workoutId: row.workout_id, workoutName: row.workout_name, workoutDescription: row.workout_description || '',
    startedAt: ms(row.started_at), endedAt: ms(row.ended_at), feel: row.feel ?? null, note: row.note || '', exercises: exs,
    durationSec: row.duration_seconds ?? 0, createdAt: ms(row.created_at), updatedAt: ms(row.updated_at),
  };
  rec.totals = sessionTotals(rec);
  rec.restTotalSec = rec.totals.rest;
  return rec;
}

// ================================================================= atividades
export function activityToRow(a, userId) {
  return {
    id: a.id, user_id: userId, activity_type: /^[a-z][a-z0-9_]*$/.test(a.type || '') ? a.type : 'outro', custom_name: a.customName || null,
    started_at: iso(a.startedAt), duration_minutes: Math.max(0.01, Number(a.durationMin) || 0.01), distance_km: num(a.distanceKm), pace_sec_per_km: num(a.paceSecKm),
    speed_kmh: num(a.speedKmh), intensity: a.intensity >= 1 && a.intensity <= 3 ? a.intensity : null, calories: num(a.calories), note: a.note || '', deleted_at: null,
  };
}
export function activityFromRow(r) {
  return {
    id: r.id, type: r.activity_type, customName: r.custom_name || null, startedAt: ms(r.started_at), durationMin: num(r.duration_minutes),
    distanceKm: num(r.distance_km), paceSecKm: num(r.pace_sec_per_km), speedKmh: num(r.speed_kmh), intensity: r.intensity ?? null, calories: num(r.calories),
    note: r.note || '', createdAt: ms(r.created_at), updatedAt: ms(r.updated_at),
  };
}

// ================================================================= bem-estar (1 por dia)
export function wellbeingToRow(w, userId) {
  return {
    user_id: userId, entry_date: w.date, period: !!w.period, cycle_start: !!w.cycleStart, flow: ['leve', 'médio', 'intenso'].includes(w.flow) ? w.flow : null,
    mood: scale5(w.mood), energy: scale5(w.energy), tiredness: scale5(w.tiredness), fatigue: scale5(w.fatigue), recovery: scale5(w.recovery), note: w.note || '', deleted_at: null,
  };
}
export function wellbeingFromRow(r) {
  const o = { date: r.entry_date, createdAt: ms(r.created_at), updatedAt: ms(r.updated_at), note: r.note || '' };
  if (r.period) { o.period = true; if (r.flow) o.flow = r.flow; if (r.cycle_start) o.cycleStart = true; }
  for (const [k, c] of [['mood', 'mood'], ['energy', 'energy'], ['tiredness', 'tiredness'], ['fatigue', 'fatigue'], ['recovery', 'recovery']]) if (r[c] != null) o[k] = r[c];
  return o;
}

// ================================================================= peso corporal (1 por dia)
export function weightToRow(w, userId) {
  return { user_id: userId, measured_on: w.date, weight_kg: Number(w.kg), source: w.source || 'manual', deleted_at: null };
}
export function weightFromRow(r) {
  return { id: `w-${r.measured_on}`, date: r.measured_on, kg: num(r.weight_kg), source: r.source || 'manual', createdAt: ms(r.created_at) };
}

// ================================================================= sugestões de progressão
export function suggestionToRow(s, userId) {
  return {
    id: s.id, user_id: userId, exercise_id: isUuid(s.exerciseId) ? s.exerciseId : null, workout_id: isUuid(s.workoutId) ? s.workoutId : null,
    status: s.status || null, current_load: num(s.currentLoad), suggested_load: num(s.suggestedLoad),
    decision: ['accepted', 'altered', 'ignored'].includes(s.decision) ? s.decision : null, new_load: num(s.newLoad), decided_at: iso(s.decidedAt),
    evidence: { basis: s.basis ?? null, explanation: s.explanation ?? null, considered: s.considered || [], createdAt: s.createdAt ?? null },
    outcome: s.outcome ?? null,
  };
}
export function suggestionFromRow(r) {
  const ev = r.evidence || {};
  return {
    id: r.id, exerciseId: r.exercise_id, workoutId: r.workout_id, createdAt: ev.createdAt ?? ms(r.created_at), decidedAt: ms(r.decided_at),
    basis: ev.basis ?? null, status: r.status, currentLoad: num(r.current_load), suggestedLoad: num(r.suggested_load), explanation: ev.explanation ?? null,
    considered: ev.considered || [], decision: r.decision, newLoad: num(r.new_load), outcome: r.outcome ?? null,
  };
}

// ================================================================= mídia
export const mediaPath = (userId, m) => `${userId}/${m.exerciseId}/${m.id}${extFor(m.mime, m.name)}`;
function extFor(mime = '', name = '') {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(name)?.[1];
  const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/heic': '.heic', 'image/heif': '.heif', 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm' };
  return map[mime] || (fromName ? `.${fromName.toLowerCase()}` : '');
}
export function mediaToRow(m, userId, dims = {}) {
  return {
    id: m.id, exercise_id: m.exerciseId, owner_id: userId, kind: m.kind === 'video' ? 'video' : 'image', bucket: 'user-media',
    storage_path: m.path || mediaPath(userId, m), mime_type: m.mime || null, size_bytes: m.size ?? null, title: m.name || null,
    width: dims.width ?? null, height: dims.height ?? null, deleted_at: null,
  };
}
export function mediaFromRow(r) {
  return {
    id: r.id, exerciseId: r.exercise_id, kind: r.kind === 'video' ? 'video' : 'image', mime: r.mime_type || '', name: r.title || (r.kind === 'video' ? 'vídeo' : 'foto'),
    size: r.size_bytes ?? 0, createdAt: ms(r.created_at), path: r.storage_path, bucket: r.bucket, remote: true, owner: r.owner_id || null,
  };
}

// ================================================================= perfil
export function profileToRow(profile, settings, userId) {
  const p = profile || {};
  return {
    id: userId, display_name: p.name || '', age: p.age >= 5 && p.age <= 120 ? Math.round(p.age) : null, sex: p.sex || null,
    height_cm: p.height >= 50 && p.height <= 260 ? p.height : null, weight_kg: p.weight >= 20 && p.weight <= 500 ? p.weight : null,
    goal: p.goal || null, level: p.level || null, settings: settings || {}, onboarded_at: p.createdAt ? iso(p.createdAt) : null,
  };
}
export function profileFromRow(r) {
  if (!r || !r.onboarded_at) return { profile: null, settings: r?.settings || {} };
  return {
    profile: {
      name: r.display_name || '', age: r.age ?? undefined, sex: r.sex || '', height: num(r.height_cm) ?? undefined, weight: num(r.weight_kg) ?? undefined,
      goal: r.goal || '', level: r.level || '', createdAt: ms(r.onboarded_at), updatedAt: ms(r.updated_at),
    },
    settings: r.settings || {},
  };
}

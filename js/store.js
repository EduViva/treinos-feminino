// Estado do app + persistência. Memória espelha o IndexedDB (carregado no início).
import * as db from './db.js';
import { uid, dateKey, startOfDay } from './util.js';
import { SEED_EXERCISES, SEED_WORKOUTS, MEDIA_LIMITS } from './data/seed.js';

export const SCHEMA_VERSION = 1;
const SEED_VERSION = 1;

export const DEFAULT_SETTINGS = {
  sound: true, vibration: true, wakeLock: true,
  defaultRest: 90, autoStartSet: false, theme: 'auto',
};

export const state = {
  ready: false,
  profile: null,
  settings: { ...DEFAULT_SETTINGS },
  exercises: new Map(),
  workouts: [],
  sessions: [],       // ordem crescente por startedAt
  activities: [],
  wellbeing: new Map(),
  weights: [],
  suggestions: [],
  media: new Map(),   // exerciseId -> [meta]
  persisted: null,
  meta: {},
};

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(what) { for (const f of listeners) { try { f(what); } catch (e) { console.error(e); } } }

const now = () => Date.now();

export async function init() {
  await db.open();
  state.profile = await db.kvGet('profile', null);
  state.settings = { ...DEFAULT_SETTINGS, ...(await db.kvGet('settings', {})) };
  state.meta = await db.kvGet('meta', {});
  await maybeSeedLibrary();
  const [ex, wk, se, ac, wb, wt, su, me] = await Promise.all([
    db.getAll('exercises'), db.getAll('workouts'), db.getAll('sessions'), db.getAll('activities'),
    db.getAll('wellbeing'), db.getAll('weights'), db.getAll('suggestions'), db.getAll('media'),
  ]);
  state.exercises = new Map(ex.map((e) => [e.id, e]));
  state.workouts = wk.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  state.sessions = se.sort((a, b) => a.startedAt - b.startedAt);
  state.activities = ac.sort((a, b) => a.startedAt - b.startedAt);
  state.wellbeing = new Map(wb.map((w) => [w.date, w]));
  state.weights = wt.sort((a, b) => a.date.localeCompare(b.date));
  state.suggestions = su.sort((a, b) => a.createdAt - b.createdAt);
  state.media = new Map();
  for (const m of me) {
    if (!state.media.has(m.exerciseId)) state.media.set(m.exerciseId, []);
    state.media.get(m.exerciseId).push(stripBlob(m));
  }
  for (const list of state.media.values()) list.sort((a, b) => a.createdAt - b.createdAt);
  state.ready = true;
  try {
    if (navigator.storage && navigator.storage.persist) {
      state.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    }
  } catch { state.persisted = null; }
  return state;
}

const stripBlob = (m) => { const { blob, ...rest } = m; return rest; };

// Adiciona à biblioteca exercícios novos de versões futuras, sem nunca sobrescrever os existentes.
async function maybeSeedLibrary() {
  if ((state.meta.seedVersion || 0) >= SEED_VERSION) return;
  const existing = new Set((await db.getAll('exercises')).map((e) => e.id));
  const t = now();
  const fresh = SEED_EXERCISES.filter((e) => !existing.has(e.id)).map((e) => ({ ...clone(e), createdAt: t, updatedAt: t }));
  if (fresh.length) await db.putMany('exercises', fresh);
  state.meta = { ...state.meta, seedVersion: SEED_VERSION };
  await db.kvSet('meta', state.meta);
}

export const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

export async function setMeta(patch) {
  state.meta = { ...state.meta, ...patch };
  await db.kvSet('meta', state.meta);
}

// ---------- Perfil ----------
export async function saveProfile(p) {
  const prev = state.profile;
  state.profile = { ...(prev || {}), ...p, updatedAt: now(), createdAt: prev?.createdAt || now() };
  await db.kvSet('profile', state.profile);
  if (p.weight && (!prev || prev.weight !== p.weight)) {
    await addWeight({ date: dateKey(), kg: p.weight, source: 'perfil' });
  }
  emit('profile');
  return state.profile;
}

export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await db.kvSet('settings', state.settings);
  emit('settings');
}

// ---------- Exercícios ----------
export const getExercise = (id) => state.exercises.get(id);
export function listExercises({ archived = false } = {}) {
  return [...state.exercises.values()]
    .filter((e) => archived || !e.archived)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export function blankExercise() {
  return {
    id: uid(), name: '', group: 'Outro', secondary: [], equipment: 'Máquina', art: null,
    instructions: [], defaults: { sets: 3, reps: 12, load: 0, rest: state.settings.defaultRest, loadStep: 2 },
    repUnit: 'reps', bodyweight: false, notes: '', mediaPrimary: null, builtin: false, archived: false,
  };
}

export async function saveExercise(e) {
  const prev = state.exercises.get(e.id);
  const rec = { ...e, createdAt: prev?.createdAt || now(), updatedAt: now() };
  state.exercises.set(rec.id, rec);
  await db.put('exercises', rec);
  emit('exercises');
  return rec;
}

export function exerciseHasHistory(id) {
  return state.sessions.some((s) => s.exercises.some((x) => x.exerciseId === id));
}

// Exercícios com histórico nunca são apagados (apenas arquivados): o histórico antigo permanece íntegro.
export async function removeExercise(id) {
  const e = state.exercises.get(id);
  if (!e) return 'none';
  if (exerciseHasHistory(id)) {
    await saveExercise({ ...e, archived: true });
    return 'archived';
  }
  state.exercises.delete(id);
  await db.del('exercises', id);
  for (const m of [...(state.media.get(id) || [])]) await db.del('media', m.id);
  state.media.delete(id);
  emit('exercises');
  return 'deleted';
}

// ---------- Treinos ----------
export const getWorkout = (id) => state.workouts.find((w) => w.id === id);

export function newWorkoutItem(exerciseId, over = {}) {
  const e = state.exercises.get(exerciseId);
  const d = e?.defaults || { sets: 3, reps: 12, load: 0, rest: 90 };
  return { id: uid(), exerciseId, sets: d.sets, reps: d.reps, load: d.load || 0, rest: d.rest, notes: '', ...over };
}

export function blankWorkout() {
  const letter = String.fromCharCode(65 + (state.workouts.length % 26));
  return { id: uid(), name: `Treino ${letter}`, description: '', items: [], order: state.workouts.length, archived: false };
}

export async function saveWorkout(w) {
  const prev = getWorkout(w.id);
  const rec = { ...w, createdAt: prev?.createdAt || now(), updatedAt: now() };
  const i = state.workouts.findIndex((x) => x.id === rec.id);
  if (i >= 0) state.workouts[i] = rec; else state.workouts.push(rec);
  state.workouts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  await db.put('workouts', rec);
  emit('workouts');
  return rec;
}

export async function duplicateWorkout(id) {
  const w = getWorkout(id);
  if (!w) return null;
  const copy = clone(w);
  copy.id = uid();
  copy.name = `${w.name} (cópia)`;
  copy.order = state.workouts.length;
  copy.items = copy.items.map((it) => ({ ...it, id: uid() }));
  return saveWorkout(copy);
}

// O histórico guarda um snapshot do treino, então apagar o plano não afeta o realizado.
export async function deleteWorkout(id) {
  state.workouts = state.workouts.filter((w) => w.id !== id);
  await db.del('workouts', id);
  emit('workouts');
}

export async function reorderWorkouts(ids) {
  for (let i = 0; i < ids.length; i++) {
    const w = getWorkout(ids[i]);
    if (w && w.order !== i) await saveWorkout({ ...w, order: i });
  }
}

export async function loadSeedWorkouts() {
  for (const t of SEED_WORKOUTS) {
    const w = blankWorkout();
    w.name = t.name; w.description = t.description; w.example = true;
    w.items = t.items.filter((it) => state.exercises.has(it.exerciseId))
      .map((it) => newWorkoutItem(it.exerciseId, Object.fromEntries(Object.entries(it).filter(([k]) => k !== 'exerciseId'))));
    await saveWorkout(w);
  }
}

// Próximo treino: segue a ordem A → B → C a partir do último treino realizado.
export function nextWorkout() {
  const ws = state.workouts.filter((w) => !w.archived && w.items.length);
  if (!ws.length) return null;
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const idx = ws.findIndex((w) => w.id === state.sessions[i].workoutId);
    if (idx >= 0) return ws[(idx + 1) % ws.length];
  }
  return ws[0];
}

// ---------- Sessões (treino realizado) ----------
export async function addSession(s) {
  state.sessions.push(s);
  state.sessions.sort((a, b) => a.startedAt - b.startedAt);
  await db.put('sessions', s);
  emit('sessions');
}
export async function updateSession(s) {
  const i = state.sessions.findIndex((x) => x.id === s.id);
  if (i >= 0) state.sessions[i] = s; else state.sessions.push(s);
  await db.put('sessions', s);
  emit('sessions');
}
export async function deleteSession(id) {
  state.sessions = state.sessions.filter((s) => s.id !== id);
  await db.del('sessions', id);
  emit('sessions');
}

// ---------- Atividades ----------
export async function saveActivity(a) {
  const rec = { ...a, updatedAt: now(), createdAt: a.createdAt || now() };
  const i = state.activities.findIndex((x) => x.id === rec.id);
  if (i >= 0) state.activities[i] = rec; else state.activities.push(rec);
  state.activities.sort((x, y) => x.startedAt - y.startedAt);
  await db.put('activities', rec);
  emit('activities');
  return rec;
}
export async function deleteActivity(id) {
  state.activities = state.activities.filter((a) => a.id !== id);
  await db.del('activities', id);
  emit('activities');
}

// ---------- Bem-estar ----------
export async function saveWellbeing(entry) {
  const prev = state.wellbeing.get(entry.date);
  const rec = { ...(prev || {}), ...entry, updatedAt: now(), createdAt: prev?.createdAt || now() };
  state.wellbeing.set(rec.date, rec);
  await db.put('wellbeing', rec);
  emit('wellbeing');
  return rec;
}
export async function deleteWellbeing(date) {
  state.wellbeing.delete(date);
  await db.del('wellbeing', date);
  emit('wellbeing');
}

// ---------- Peso corporal ----------
export async function addWeight({ date, kg, source }) {
  // Um registro por dia: novo valor no mesmo dia substitui o anterior.
  const prev = state.weights.find((w) => w.date === date);
  const rec = { id: prev?.id || uid(), date, kg, source: source || 'manual', createdAt: prev?.createdAt || now() };
  state.weights = state.weights.filter((w) => w.id !== rec.id).concat(rec).sort((a, b) => a.date.localeCompare(b.date));
  await db.put('weights', rec);
  emit('weights');
  return rec;
}
export async function deleteWeight(id) {
  state.weights = state.weights.filter((w) => w.id !== id);
  await db.del('weights', id);
  emit('weights');
}

// ---------- Sugestões de progressão ----------
export async function saveSuggestion(rec) {
  const i = state.suggestions.findIndex((x) => x.id === rec.id);
  if (i >= 0) state.suggestions[i] = rec; else state.suggestions.push(rec);
  await db.put('suggestions', rec);
  emit('suggestions');
  return rec;
}

// ---------- Mídia própria ----------
async function prepareImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    const max = MEDIA_LIMITS.imageMaxPx;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (k >= 1 && file.size < 1.5e6) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
    return blob || file;
  } catch { return file; }
}

export function listMedia(exerciseId) { return state.media.get(exerciseId) || []; }

export async function addMedia(exerciseId, file, { replaceId } = {}) {
  const isVideo = (file.type || '').startsWith('video/');
  const blob = isVideo ? file : await prepareImage(file);
  const rec = {
    id: replaceId || uid(), exerciseId, kind: isVideo ? 'video' : 'image',
    mime: blob.type || file.type, name: file.name || (isVideo ? 'vídeo' : 'foto'), size: blob.size,
    createdAt: now(), blob,
  };
  await db.put('media', rec);
  const list = (state.media.get(exerciseId) || []).filter((m) => m.id !== rec.id);
  list.push(stripBlob(rec));
  list.sort((a, b) => a.createdAt - b.createdAt);
  state.media.set(exerciseId, list);
  emit('media');
  return stripBlob(rec);
}

export async function getMediaBlob(id) {
  const r = await db.get('media', id);
  return r ? r.blob : null;
}

export async function deleteMedia(exerciseId, id) {
  await db.del('media', id);
  state.media.set(exerciseId, (state.media.get(exerciseId) || []).filter((m) => m.id !== id));
  const e = state.exercises.get(exerciseId);
  if (e && e.mediaPrimary === id) await saveExercise({ ...e, mediaPrimary: null });
  emit('media');
}

// ---------- Rascunho do treino em andamento ----------
export const getDraft = () => db.kvGet('activeSession', null);
export const saveDraft = (d) => db.kvSet('activeSession', d);
export const clearDraft = () => db.kvDel('activeSession');

// ---------- Exportar / importar / backups ----------
const DATA_STORES = ['exercises', 'workouts', 'sessions', 'activities', 'wellbeing', 'weights', 'suggestions'];

function blobToDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
async function dataURLToBlob(url) { return (await fetch(url)).blob(); }

export async function exportAll({ includeMedia = true } = {}) {
  const data = {
    profile: state.profile, settings: state.settings, meta: state.meta,
  };
  for (const n of DATA_STORES) data[n] = await db.getAll(n);
  data.media = [];
  if (includeMedia) {
    for (const m of await db.getAll('media')) {
      const { blob, ...meta } = m;
      data.media.push({ ...meta, data: await blobToDataURL(blob) });
    }
  }
  return { app: 'treinos-feminino', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), includesMedia: includeMedia, data };
}

export function summarize(data) {
  return {
    treinos: data.workouts?.length || 0, exercicios: data.exercises?.length || 0, sessoes: data.sessions?.length || 0,
    atividades: data.activities?.length || 0, bemestar: data.wellbeing?.length || 0,
    pesos: data.weights?.length || 0, midias: data.media?.length || 0,
  };
}

export function validateBackup(obj) {
  if (!obj || obj.app !== 'treinos-feminino' || !obj.data) throw new Error('Este arquivo não parece ser um backup deste aplicativo.');
  if (obj.schema > SCHEMA_VERSION) throw new Error('Este backup foi criado por uma versão mais nova do aplicativo.');
  return summarize(obj.data);
}

// mode: 'replace' (substitui tudo) | 'merge' (acrescenta o que não existe)
export async function importAll(obj, mode = 'merge') {
  validateBackup(obj);
  await createSnapshot('Antes de importar', { auto: true });
  const d = obj.data;
  if (mode === 'replace') {
    for (const n of [...DATA_STORES, 'media']) await db.clearStore(n);
  }
  const keyOf = { exercises: 'id', workouts: 'id', sessions: 'id', activities: 'id', wellbeing: 'date', weights: 'id', suggestions: 'id', media: 'id' };
  for (const n of DATA_STORES) {
    const incoming = d[n] || [];
    if (mode === 'merge') {
      const have = new Set((await db.getAll(n)).map((r) => r[keyOf[n]]));
      await db.putMany(n, incoming.filter((r) => !have.has(r[keyOf[n]])));
    } else await db.putMany(n, incoming);
  }
  if (d.media?.length) {
    const have = mode === 'merge' ? new Set((await db.getAll('media')).map((r) => r.id)) : new Set();
    for (const m of d.media) {
      if (have.has(m.id)) continue;
      const { data, ...meta } = m;
      await db.put('media', { ...meta, blob: await dataURLToBlob(data) });
    }
  }
  if (mode === 'replace' || !state.profile) {
    if (d.profile) await db.kvSet('profile', d.profile);
    if (d.settings) await db.kvSet('settings', { ...DEFAULT_SETTINGS, ...d.settings });
    if (d.meta) await db.kvSet('meta', { ...d.meta, seedVersion: Math.max(d.meta.seedVersion || 0, SEED_VERSION) });
  }
  await db.kvDel('activeSession');
  await init();
  emit('import');
}

const MAX_SNAPSHOTS = 8;
export async function createSnapshot(label = 'Manual', { auto = false } = {}) {
  const data = (await exportAll({ includeMedia: false })).data;
  const rec = { id: uid(), createdAt: now(), label, auto, counts: summarize(data), data };
  await db.put('backups', rec);
  const all = (await db.getAll('backups')).sort((a, b) => b.createdAt - a.createdAt);
  for (const old of all.slice(MAX_SNAPSHOTS)) await db.del('backups', old.id);
  await setMeta({ lastSnapshotAt: rec.createdAt });
  return rec;
}
export async function listSnapshots() {
  return (await db.getAll('backups')).sort((a, b) => b.createdAt - a.createdAt).map(({ data, ...r }) => r);
}
export async function restoreSnapshot(id) {
  const rec = await db.get('backups', id);
  if (!rec) throw new Error('Backup não encontrado.');
  await createSnapshot('Antes de restaurar', { auto: true });
  // Restaurar não toca nas mídias (snapshots internos não carregam mídia).
  for (const n of DATA_STORES) await db.clearStore(n);
  for (const n of DATA_STORES) await db.putMany(n, rec.data[n] || []);
  if (rec.data.profile) await db.kvSet('profile', rec.data.profile);
  if (rec.data.settings) await db.kvSet('settings', rec.data.settings);
  await db.kvDel('activeSession');
  await init();
  emit('import');
}
export async function deleteSnapshot(id) { await db.del('backups', id); }

// Backup interno semanal automático (só se já existir algum dado).
export async function autoSnapshotIfDue() {
  const has = state.sessions.length || state.activities.length || state.wellbeing.size;
  if (!has) return;
  const last = state.meta.lastSnapshotAt || 0;
  if (now() - last > 7 * 86400000) await createSnapshot('Automático semanal', { auto: true });
}

export async function eraseEverything() {
  await db.wipeAll();
  await init();
  emit('import');
}

export async function storageEstimate() {
  try {
    if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); return { usage: e.usage, quota: e.quota }; }
  } catch { /* noop */ }
  return null;
}

// Perfil mínimo utilizável no contexto de personalização.
export const firstName = () => (state.profile?.name || '').trim().split(/\s+/)[0] || '';
export const today = () => startOfDay(new Date());

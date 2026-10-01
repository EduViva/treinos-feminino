// Estado do app + persistência. A memória espelha o IndexedDB (cache local, offline-first); toda alteração
// é gravada localmente NA HORA e enviada ao Supabase em segundo plano (js/sync/engine.js).
import * as db from './db.js';
import * as sync from './sync/engine.js';
import { uid, dateKey, startOfDay } from './util.js';
import { SEED_WORKOUTS, MEDIA_LIMITS } from './data/seed.js';
import { LEGACY_EXERCISE_SLUGS } from './data/legacy-map.js';
import { applyPrefs, splitExercise, mediaPath } from './sync/mappers.js';
import { catalogId } from './sync/uuid.js';
import { convertLegacyData, persistConverted } from './legacy.js';
import * as tx from './data/taxonomy.js';

export const SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS = {
  sound: true, vibration: true, wakeLock: true,
  defaultRest: 90, autoStartSet: false, theme: 'auto',
};

export const state = {
  ready: false,
  userId: null,
  profile: null,
  settings: { ...DEFAULT_SETTINGS },
  exercises: new Map(),   // catálogo + próprios, JÁ com as preferências pessoais aplicadas
  prefs: new Map(),       // exerciseId → preferências (cru)
  workouts: [],
  sessions: [],           // ordem crescente por startedAt
  activities: [],
  wellbeing: new Map(),
  weights: [],
  suggestions: [],
  media: new Map(),       // exerciseId -> [meta]
  persisted: null,
  meta: {},
};

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(what) { for (const f of listeners) { try { f(what); } catch (e) { console.error(e); } } }

const now = () => Date.now();
const queue = (entity, id, opts) => sync.queue(entity, id, opts).catch((e) => console.warn('[sync] fila', e));

export function setUser(userId) { state.userId = userId; }

export async function init() {
  await db.open();
  await loadState();
  state.ready = true;
  try {
    if (navigator.storage && navigator.storage.persist) {
      state.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    }
  } catch { state.persisted = null; }
  return state;
}

const stripBlob = (m) => { const { blob, ...rest } = m; return rest; };

async function loadState() {
  state.profile = await db.kvGet('profile', null);
  state.settings = { ...DEFAULT_SETTINGS, ...(await db.kvGet('settings', {})) };
  state.meta = await db.kvGet('meta', {});
  const [ex, pr, wk, se, ac, wb, wt, su, me] = await Promise.all([
    db.getAll('exercises'), db.getAll('prefs'), db.getAll('workouts'), db.getAll('sessions'), db.getAll('activities'),
    db.getAll('wellbeing'), db.getAll('weights'), db.getAll('suggestions'), db.getAll('media'),
  ]);
  state.prefs = new Map(pr.map((p) => [p.exerciseId, p]));
  state.exercises = new Map(ex.map((e) => [e.id, applyPrefs(e, state.prefs.get(e.id))]));
  state.workouts = wk.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  state.sessions = se.sort((a, b) => a.startedAt - b.startedAt);
  state.activities = ac.sort((a, b) => a.startedAt - b.startedAt);
  state.wellbeing = new Map(wb.map((w) => [w.date, w]));
  state.weights = wt.sort((a, b) => a.date.localeCompare(b.date));
  state.suggestions = su.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  state.media = new Map();
  for (const m of me) {
    if (!state.media.has(m.exerciseId)) state.media.set(m.exerciseId, []);
    state.media.get(m.exerciseId).push(stripBlob(m));
  }
  for (const list of state.media.values()) list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

// Relê o IndexedDB (depois de uma sincronização que trouxe novidades).
export async function reload() { await loadState(); emit('sync'); }

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
  await queue('profile', 'me');
  if (p.weight && (!prev || prev.weight !== p.weight)) {
    await addWeight({ date: dateKey(), kg: p.weight, source: 'perfil' });
  }
  emit('profile');
  return state.profile;
}

export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await db.kvSet('settings', state.settings);
  if (state.profile) await queue('profile', 'me');
  emit('settings');
}

// ---------- Exercícios ----------
export const getExercise = (id) => state.exercises.get(id);

// Lista para telas/seletores: sem arquivados (pessoais) nem exercícios aposentados do catálogo.
export function listExercises({ archived = false } = {}) {
  return [...state.exercises.values()]
    .filter((e) => archived || (!e.archived && !e.inactive))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
export const catalogSize = () => [...state.exercises.values()].filter((e) => e.builtin).length;

export function blankExercise() {
  return {
    id: uid(), name: '', group: tx.groups.name('outros'), secondary: [], equipment: tx.equipment.name('maquina'), art: null, aliases: [], tips: [], level: null,
    instructions: [], defaults: { sets: 3, reps: 12, load: 0, rest: state.settings.defaultRest, loadStep: 2 },
    repUnit: 'reps', kind: 'forca', bodyweight: false, notes: '', mediaPrimary: null, builtin: false, archived: false, favorite: false,
    origin: 'custom', ownerId: state.userId, visibility: 'private', parentId: null,
  };
}

function putPrefs(prefs) {
  state.prefs.set(prefs.exerciseId, prefs);
  return db.put('prefs', prefs).then(() => queue('prefs', prefs.exerciseId));
}

// Exercício PRÓPRIO: salva o exercício (+ preferências). Exercício do CATÁLOGO: o catálogo nunca muda —
// só as preferências pessoais (favorito, arquivado, observações, padrões de séries/carga) são gravadas.
export async function saveExercise(e) {
  const prev = state.exercises.get(e.id);
  const baseStored = prev ? await db.get('exercises', e.id) : null;
  const { base, prefs } = splitExercise({ ...e, builtin: e.builtin ?? prev?.builtin }, baseStored, state.userId);
  prefs.updatedAt = now();
  let merged;
  if (base) {
    const rec = { ...base, createdAt: prev?.createdAt || now(), updatedAt: now() };
    await db.put('exercises', rec);
    await queue('exercise', rec.id);
    merged = applyPrefs(rec, prefs);
  } else {
    merged = applyPrefs(baseStored || prev, prefs);
  }
  await putPrefs(prefs);
  state.exercises.set(merged.id, merged);
  emit('exercises');
  return merged;
}

export async function toggleFavorite(id) {
  const e = state.exercises.get(id);
  if (!e) return false;
  const cur = state.prefs.get(id) || { exerciseId: id, favorite: false, archived: false, notes: '', mediaPrimary: null, defaults: { sets: null, reps: null, load: null, rest: null, loadStep: null } };
  const prefs = { ...cur, favorite: !e.favorite, updatedAt: now() };
  await putPrefs(prefs);
  state.exercises.set(id, { ...e, favorite: prefs.favorite });
  emit('exercises');
  return prefs.favorite;
}

export function exerciseHasHistory(id) {
  return state.sessions.some((s) => s.exercises.some((x) => x.exerciseId === id));
}

// Exercícios do catálogo ou com histórico nunca são apagados (apenas arquivados para você): o histórico
// antigo permanece íntegro. Exercício próprio SEM histórico é excluído de verdade.
export async function removeExercise(id) {
  const e = state.exercises.get(id);
  if (!e) return 'none';
  if (e.builtin || exerciseHasHistory(id)) {
    await saveExercise({ ...e, archived: true });
    return 'archived';
  }
  state.exercises.delete(id);
  state.prefs.delete(id);
  await db.del('exercises', id);
  await db.del('prefs', id);
  await queue('exercise', id, { op: 'delete' });
  for (const m of [...(state.media.get(id) || [])]) await deleteMedia(id, m.id);
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
  await queue('workout', rec.id);
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
  delete copy.createdBy;
  return saveWorkout(copy);
}

// O histórico guarda um snapshot do treino, então apagar o plano não afeta o realizado.
export async function deleteWorkout(id) {
  state.workouts = state.workouts.filter((w) => w.id !== id);
  await db.del('workouts', id);
  await queue('workout', id, { op: 'delete' });
  emit('workouts');
}

export async function reorderWorkouts(ids) {
  for (let i = 0; i < ids.length; i++) {
    const w = getWorkout(ids[i]);
    if (w && w.order !== i) await saveWorkout({ ...w, order: i });
  }
}

// Treinos-modelo (Segunda–Sexta). Os exercícios vêm do catálogo; ids da biblioteca original são resolvidos pelo mapa.
export async function loadSeedWorkouts() {
  let made = 0;
  for (const t of SEED_WORKOUTS) {
    const w = blankWorkout();
    w.name = t.name; w.description = t.description; w.weekday = t.weekday || null;
    const items = [];
    for (const it of t.items) {
      const slug = LEGACY_EXERCISE_SLUGS[it.exerciseId];
      const exId = slug ? await catalogId(slug) : it.exerciseId;
      if (!state.exercises.has(exId)) continue;
      const { exerciseId, ...over } = it;
      items.push(newWorkoutItem(exId, over));
    }
    if (!items.length) continue;
    w.items = items;
    await saveWorkout(w);
    made++;
  }
  return made;
}

// Próximo treino. Com treinos por dia da semana: o de hoje (se ainda não feito) ou o próximo dia.
// Sem dia da semana: segue a ordem A → B → C a partir do último treino realizado.
export function nextWorkout() {
  const ws = state.workouts.filter((w) => !w.archived && w.items.length);
  if (!ws.length) return null;
  const byDay = ws.filter((w) => w.weekday);
  if (byDay.length) {
    const todayN = ((new Date().getDay() + 6) % 7) + 1; // 1 = segunda … 7 = domingo
    const todayKey = dateKey(new Date());
    const doneToday = (w) => state.sessions.some((s) => s.workoutId === w.id && dateKey(s.startedAt) === todayKey);
    const today = byDay.find((w) => w.weekday === todayN && !doneToday(w));
    if (today) return today;
    for (let k = 1; k <= 7; k++) {
      const c = byDay.find((w) => w.weekday === ((todayN - 1 + k) % 7) + 1);
      if (c) return c;
    }
  }
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
  await queue('session', s.id);
  emit('sessions');
}
export async function updateSession(s) {
  const i = state.sessions.findIndex((x) => x.id === s.id);
  if (i >= 0) state.sessions[i] = s; else state.sessions.push(s);
  await db.put('sessions', s);
  await queue('session', s.id);
  emit('sessions');
}
export async function deleteSession(id) {
  state.sessions = state.sessions.filter((s) => s.id !== id);
  await db.del('sessions', id);
  await queue('session', id, { op: 'delete' });
  emit('sessions');
}

// ---------- Atividades ----------
export async function saveActivity(a) {
  const rec = { ...a, updatedAt: now(), createdAt: a.createdAt || now() };
  const i = state.activities.findIndex((x) => x.id === rec.id);
  if (i >= 0) state.activities[i] = rec; else state.activities.push(rec);
  state.activities.sort((x, y) => x.startedAt - y.startedAt);
  await db.put('activities', rec);
  await queue('activity', rec.id);
  emit('activities');
  return rec;
}
export async function deleteActivity(id) {
  state.activities = state.activities.filter((a) => a.id !== id);
  await db.del('activities', id);
  await queue('activity', id, { op: 'delete' });
  emit('activities');
}

// ---------- Bem-estar ----------
export async function saveWellbeing(entry) {
  const prev = state.wellbeing.get(entry.date);
  const rec = { ...(prev || {}), ...entry, updatedAt: now(), createdAt: prev?.createdAt || now() };
  state.wellbeing.set(rec.date, rec);
  await db.put('wellbeing', rec);
  await queue('wellbeing', rec.date);
  emit('wellbeing');
  return rec;
}
export async function deleteWellbeing(date) {
  state.wellbeing.delete(date);
  await db.del('wellbeing', date);
  await queue('wellbeing', date, { op: 'delete' });
  emit('wellbeing');
}

// ---------- Peso corporal ----------
export async function addWeight({ date, kg, source }) {
  // Um registro por dia: novo valor no mesmo dia substitui o anterior.
  const prev = state.weights.find((w) => w.date === date);
  const rec = { id: prev?.id || uid(), date, kg, source: source || 'manual', createdAt: prev?.createdAt || now() };
  state.weights = state.weights.filter((w) => w.id !== rec.id).concat(rec).sort((a, b) => a.date.localeCompare(b.date));
  await db.put('weights', rec);
  await queue('weight', rec.id);
  emit('weights');
  return rec;
}
export async function deleteWeight(id) {
  const w = state.weights.find((x) => x.id === id);
  state.weights = state.weights.filter((x) => x.id !== id);
  await db.del('weights', id);
  if (w) await queue('weight', id, { op: 'delete', meta: { date: w.date } });
  emit('weights');
}

// ---------- Sugestões de progressão ----------
export async function saveSuggestion(rec) {
  const i = state.suggestions.findIndex((x) => x.id === rec.id);
  if (i >= 0) state.suggestions[i] = rec; else state.suggestions.push(rec);
  await db.put('suggestions', rec);
  await queue('suggestion', rec.id);
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
    createdAt: now(), blob, remote: false,
  };
  await db.put('media', rec);
  await queue('media', rec.id);
  const list = (state.media.get(exerciseId) || []).filter((m) => m.id !== rec.id);
  list.push(stripBlob(rec));
  list.sort((a, b) => a.createdAt - b.createdAt);
  state.media.set(exerciseId, list);
  emit('media');
  return stripBlob(rec);
}

// Foto/vídeo: do aparelho; se só existir na nuvem (outro aparelho), baixa sob demanda e guarda em cache.
export async function getMediaBlob(id) {
  const r = await db.get('media', id);
  if (!r) return null;
  if (r.blob) return r.blob;
  if (r.path && sync.isStarted()) {
    try {
      const blob = await sync.downloadMedia(r.path, r.bucket || 'user-media');
      if (blob) { await db.put('media', { ...r, blob }); return blob; }
    } catch (e) { console.warn('[mídia]', e.message); }
  }
  return null;
}

export async function deleteMedia(exerciseId, id) {
  const r = await db.get('media', id);
  await db.del('media', id);
  await queue('media', id, { op: 'delete', meta: { path: r?.path || (r && state.userId ? mediaPath(state.userId, r) : null) } });
  state.media.set(exerciseId, (state.media.get(exerciseId) || []).filter((m) => m.id !== id));
  const e = state.exercises.get(exerciseId);
  if (e && e.mediaPrimary === id) await saveExercise({ ...e, mediaPrimary: null });
  emit('media');
}

// ---------- Rascunho do treino em andamento (somente neste aparelho) ----------
export const getDraft = () => db.kvGet('activeSession', null);
export const saveDraft = (d) => db.kvSet('activeSession', d);
export const clearDraft = () => db.kvDel('activeSession');

// ---------- Exportar / importar / backups ----------
const DATA_STORES = ['exercises', 'prefs', 'workouts', 'sessions', 'activities', 'wellbeing', 'weights', 'suggestions'];
const ENTITY_OF = { exercises: 'exercise', prefs: 'prefs', workouts: 'workout', sessions: 'session', activities: 'activity', wellbeing: 'wellbeing', weights: 'weight', suggestions: 'suggestion' };
const keyOfStore = (n, r) => (n === 'wellbeing' ? r.date : n === 'prefs' ? r.exerciseId : r.id);

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
      const b = blob || (await getMediaBlob(m.id));
      if (b) data.media.push({ ...meta, data: await blobToDataURL(b) });
    }
  }
  return { app: 'treinos-feminino', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), includesMedia: includeMedia, data };
}

export function summarize(data) {
  return {
    treinos: data.workouts?.length || 0, exercicios: data.exercises?.filter((e) => !e.builtin && e.origin !== 'catalog').length || 0, sessoes: data.sessions?.length || 0,
    atividades: data.activities?.length || 0, bemestar: data.wellbeing?.length || 0,
    pesos: data.weights?.length || 0, midias: data.media?.length || 0,
  };
}

export function validateBackup(obj) {
  if (!obj || obj.app !== 'treinos-feminino' || !obj.data) throw new Error('Este arquivo não parece ser um backup deste aplicativo.');
  if (obj.schema > SCHEMA_VERSION) throw new Error('Este backup foi criado por uma versão mais nova do aplicativo.');
  return summarize(obj.data);
}

async function idsByEntity() {
  const o = {};
  for (const n of DATA_STORES) o[ENTITY_OF[n]] = new Set((await db.getAll(n)).filter((r) => !(n === 'exercises' && r.builtin)).map((r) => keyOfStore(n, r)));
  return o;
}
// Depois de SUBSTITUIR dados locais: o que sumiu é excluído na nuvem; o que ficou é reenviado.
async function reconcile(before) {
  const after = await idsByEntity();
  for (const [entity, ids] of Object.entries(before)) for (const id of ids) if (!after[entity].has(id)) await queue(entity, id, { op: 'delete', meta: entity === 'weight' ? { date: String(id).replace(/^w-/, '') } : undefined });
  for (const [entity, ids] of Object.entries(after)) for (const id of ids) await queue(entity, id);
}

// mode: 'replace' (substitui tudo) | 'merge' (acrescenta o que não existe)
export async function importAll(obj, mode = 'merge') {
  validateBackup(obj);
  await createSnapshot('Antes de importar', { auto: true });
  const d = obj.data;
  const before = mode === 'replace' ? await idsByEntity() : null;
  const media = [];
  for (const m of d.media || []) { const { data, ...meta } = m; media.push({ ...meta, ...(data ? { blob: await dataURLToBlob(data) } : {}) }); }
  const cv = await convertLegacyData({ ...d, media, prefs: d.prefs || [] }, { userId: state.userId });
  if (mode === 'replace') for (const n of [...DATA_STORES, 'media']) await db.clearStore(n);
  await persistConverted(cv, { userId: state.userId, queue, mode });
  if ((mode === 'replace' || !state.profile) && cv.profile) {
    await db.kvSet('profile', cv.profile);
    if (cv.settings) await db.kvSet('settings', { ...DEFAULT_SETTINGS, ...cv.settings });
    await queue('profile', 'me');
  }
  if (before) await reconcile(before);
  await db.kvDel('activeSession');
  await loadState();
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
  const before = await idsByEntity();
  // Restaurar não toca nas mídias (snapshots internos não carregam mídia) nem no catálogo.
  for (const n of DATA_STORES) {
    if (n === 'exercises') { for (const e of await db.getAll(n)) if (!e.builtin) await db.del(n, e.id); } else await db.clearStore(n);
  }
  for (const n of DATA_STORES) await db.putMany(n, (rec.data[n] || []).filter((r) => !(n === 'exercises' && (r.builtin || r.origin === 'catalog'))));
  if (rec.data.profile) await db.kvSet('profile', rec.data.profile);
  if (rec.data.settings) await db.kvSet('settings', rec.data.settings);
  await reconcile(before);
  if (rec.data.profile) await queue('profile', 'me');
  await db.kvDel('activeSession');
  await loadState();
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

// Apaga os dados LOCAIS deste aparelho (a nuvem é apagada antes, por sync.eraseRemoteData, quando o usuário confirma).
export async function eraseEverything() {
  await db.wipeAll();
  await loadState();
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

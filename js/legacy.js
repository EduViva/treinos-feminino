// Migração dos dados da versão LOCAL (sem conta) para a conta no Supabase — e também a conversão de
// backups .json antigos. O que muda: ids da biblioteca original ("ex-supino-reto") passam a ser os ids do
// catálogo global (uuid determinístico do slug); ids que não são uuid viram uuid estável. NADA é perdido:
// exercícios que só existiam no aparelho viram exercícios personalizados da usuária.
import * as db from './db.js';
import { LEGACY_EXERCISE_SLUGS } from './data/legacy-map.js';
import * as tx from './data/taxonomy.js';
import { isUuid, uuidv5, catalogId } from './sync/uuid.js';
import { splitExercise } from './sync/mappers.js';

const STORES = ['exercises', 'workouts', 'sessions', 'activities', 'wellbeing', 'weights', 'suggestions', 'media', 'kv'];

// ---------------------------------------------------------------- conversão PURA
export async function convertLegacyData(data, { userId }) {
  const idMap = new Map();
  const rid = async (old) => { // id (qualquer formato) → uuid
    if (old == null) return null;
    if (idMap.has(old)) return idMap.get(old);
    const v = isUuid(old) ? old : LEGACY_EXERCISE_SLUGS[old] ? await catalogId(LEGACY_EXERCISE_SLUGS[old]) : await uuidv5(`legacy:${old}`);
    idMap.set(old, v);
    return v;
  };
  const used = new Set();   // ids de exercício usados em treinos/históricos
  for (const w of data.workouts || []) for (const it of w.items || []) used.add(it.exerciseId);
  for (const s of data.sessions || []) for (const x of s.exercises || []) used.add(x.exerciseId);
  for (const s of data.suggestions || []) used.add(s.exerciseId);

  const bases = [], prefs = [];
  for (const e of data.exercises || []) {
    if (e.origin === 'catalog') continue; // formato novo: o catálogo vem do servidor
    const mapped = !!LEGACY_EXERCISE_SLUGS[e.id];
    const id = await rid(e.id);
    if (mapped) { // exercício do catálogo: guarda só o que é PESSOAL
      prefs.push({ exerciseId: id, builtin: true, favorite: false, archived: !!e.archived, notes: e.notes || '', mediaPrimary: e.mediaPrimary || null, defaults: e.defaults || null, edited: (e.updatedAt || 0) !== (e.createdAt || 0) });
      continue;
    }
    if (e.builtin && !used.has(e.id)) continue; // exemplo antigo da v1 que nunca foi usado: descarta
    const archived = !!e.archived || !!e.builtin; // exemplo antigo usado em histórico: mantém, arquivado
    const gid = tx.groups.id(e.group), g = e.group === 'Corpo inteiro' ? (e.kind === 'cardio' ? 'cardio' : 'funcional') : gid;
    bases.push({
      id, name: e.name, aliases: [], group: tx.groups.name(g) || tx.groups.name('outros'), secondary: (e.secondary || []).map((s) => tx.groups.name(tx.groups.id(s))).filter(Boolean),
      equipment: tx.equipment.name(tx.equipment.id(e.equipment)) || tx.equipment.name('outro'), kind: tx.types.has(e.kind) ? e.kind : 'forca', level: null, art: e.art || null,
      instructions: e.instructions || [], tips: [], defaults: { sets: 3, reps: 12, load: 0, rest: 90, loadStep: 2, ...(e.defaults || {}) }, repUnit: e.repUnit || 'reps', bodyweight: !!e.bodyweight,
      builtin: false, origin: 'custom', ownerId: userId, visibility: 'private', parentId: null, inactive: false, slug: null,
      createdAt: e.createdAt || Date.now(), updatedAt: e.updatedAt || Date.now(),
    });
    prefs.push({ exerciseId: id, builtin: false, favorite: false, archived, notes: e.notes || '', mediaPrimary: e.mediaPrimary || null, defaults: null, edited: false });
  }

  for (const p of data.prefs || []) { // formato novo: preferências já no formato final
    prefs.push({ exerciseId: await rid(p.exerciseId), final: true, builtin: false, favorite: !!p.favorite, archived: !!p.archived, notes: p.notes || '', mediaPrimary: p.mediaPrimary || null, defaults: p.defaults || null, edited: false });
  }

  const workouts = [];
  for (const w of data.workouts || []) {
    if (w.example) continue;
    workouts.push({ ...w, id: await rid(w.id), items: await Promise.all((w.items || []).map(async (it) => ({ ...it, id: await rid(it.id), exerciseId: await rid(it.exerciseId) }))) });
  }
  const sessions = [];
  for (const s of data.sessions || []) {
    sessions.push({ ...s, id: await rid(s.id), workoutId: s.workoutId ? await rid(s.workoutId) : null,
      exercises: await Promise.all((s.exercises || []).map(async (x) => ({ ...x, itemId: x.itemId ? await rid(x.itemId) : null, exerciseId: x.exerciseId ? await rid(x.exerciseId) : null }))) });
  }
  const activities = await Promise.all((data.activities || []).map(async (a) => ({ ...a, id: await rid(a.id) })));
  const suggestions = await Promise.all((data.suggestions || []).map(async (s) => ({ ...s, id: await rid(s.id), exerciseId: await rid(s.exerciseId), workoutId: s.workoutId ? await rid(s.workoutId) : null })));
  const media = await Promise.all((data.media || []).map(async (m) => ({ ...m, id: await rid(m.id), exerciseId: await rid(m.exerciseId) })));
  const mediaIds = new Map((data.media || []).map((m, i) => [m.id, media[i].id]));
  for (const p of prefs) if (p.mediaPrimary) p.mediaPrimary = mediaIds.get(p.mediaPrimary) || (isUuid(p.mediaPrimary) ? p.mediaPrimary : null);

  return {
    bases, prefs, workouts, sessions, activities, suggestions, media,
    wellbeing: data.wellbeing || [], weights: data.weights || [], profile: data.profile || null, settings: data.settings || null,
  };
}

// Reescreve ids no rascunho do treino em andamento (se existir).
export async function convertDraft(draft) {
  if (!draft) return null;
  const cv = await convertLegacyData({ workouts: [], sessions: [{ id: draft.id, workoutId: draft.workoutId, exercises: draft.exercises || [] }] }, { userId: null });
  const s = cv.sessions[0];
  return { ...draft, id: s.id, workoutId: s.workoutId, exercises: s.exercises };
}

// Grava o resultado da conversão no banco local ATIVO e agenda o envio. `catalogBase(id)` devolve o
// registro base do catálogo (para podar padrões iguais ao catálogo).
export async function persistConverted(cv, { userId, queue, mode = 'merge' }) {
  const put = async (store, arr, entity, keyOf = (r) => r.id) => {
    for (const r of arr) {
      if (mode === 'merge' && (await db.get(store, keyOf(r)))) continue;
      await db.put(store, r);
      if (entity) await queue(entity, keyOf(r));
    }
  };
  await put('exercises', cv.bases, 'exercise');
  for (const p of cv.prefs) {
    const base = p.builtin ? await db.get('exercises', p.exerciseId) : null;
    let rec = { exerciseId: p.exerciseId, favorite: p.favorite, archived: p.archived, notes: p.notes, mediaPrimary: p.mediaPrimary, defaults: { sets: null, reps: null, load: null, rest: null, loadStep: null } };
    if (p.final) rec = { ...rec, defaults: p.defaults || rec.defaults };
    else if (p.builtin && base && p.edited && p.defaults) rec = splitExercise({ ...base, favorite: p.favorite, archived: p.archived, notes: p.notes, mediaPrimary: p.mediaPrimary, defaults: { ...base.defaults, ...p.defaults } }, base, userId).prefs;
    const trivial = !rec.favorite && !rec.archived && !rec.notes && !rec.mediaPrimary && Object.values(rec.defaults).every((v) => v == null);
    if (trivial) continue;
    if (mode === 'merge' && (await db.get('prefs', rec.exerciseId))) continue;
    await db.put('prefs', { ...rec, updatedAt: Date.now() });
    await queue('prefs', rec.exerciseId);
  }
  await put('workouts', cv.workouts, 'workout');
  await put('sessions', cv.sessions, 'session');
  await put('activities', cv.activities, 'activity');
  await put('suggestions', cv.suggestions, 'suggestion');
  await put('wellbeing', cv.wellbeing, 'wellbeing', (r) => r.date);
  await put('weights', cv.weights, 'weight', (r) => r.id);
  await put('media', cv.media, 'media');
}

// ---------------------------------------------------------------- leitura do banco local ANTIGO
function openLegacy() {
  return new Promise((resolve) => {
    if (!('indexedDB' in globalThis)) return resolve(null);
    const req = indexedDB.open(db.LEGACY_DB_NAME);                      // sem versão: não força upgrade
    req.onupgradeneeded = () => { try { req.transaction.abort(); } catch { /* banco não existia */ } };
    req.onsuccess = () => resolve(req.result);
    req.onerror = req.onblocked = () => resolve(null);
  });
}
const getAll = (idb, name) => new Promise((resolve) => {
  if (!idb.objectStoreNames.contains(name)) return resolve([]);
  const r = idb.transaction(name).objectStore(name).getAll();
  r.onsuccess = () => resolve(r.result); r.onerror = () => resolve([]);
});

export async function readLegacy() {
  const idb = await openLegacy();
  if (!idb) return null;
  try {
    const out = {};
    for (const s of STORES) out[s] = await getAll(idb, s);
    const kv = Object.fromEntries(out.kv.map((r) => [r.key, r.value]));
    const data = {
      exercises: out.exercises, workouts: out.workouts, sessions: out.sessions, activities: out.activities, wellbeing: out.wellbeing,
      weights: out.weights, suggestions: out.suggestions, media: out.media, profile: kv.profile || null, settings: kv.settings || null, draft: kv.activeSession || null, meta: kv.meta || {},
    };
    const has = !!(data.profile || data.workouts.length || data.sessions.length || data.activities.length || data.wellbeing.length || data.weights.length);
    return { data, has, claimedBy: data.meta.claimedBy || null,
      counts: { treinos: data.workouts.length, sessoes: data.sessions.length, atividades: data.activities.length, bemestar: data.wellbeing.length, exercicios: data.exercises.filter((e) => !e.builtin).length, midias: data.media.length } };
  } finally { idb.close(); }
}

export async function legacySummary() {
  const l = await readLegacy();
  return l && l.has && !l.claimedBy ? { counts: l.counts } : null;
}

async function markLegacy(patch) {
  const idb = await openLegacy();
  if (!idb) return;
  await new Promise((resolve) => {
    const tx = idb.transaction('kv', 'readwrite'), os = tx.objectStore('kv'), g = os.get('meta');
    g.onsuccess = () => { os.put({ key: 'meta', value: { ...(g.result?.value || {}), ...patch } }); };
    tx.oncomplete = tx.onerror = tx.onabort = () => resolve();
  });
  idb.close();
}

// Importa os dados do banco antigo para a conta (o banco ATIVO já deve ser o do usuário).
export async function claimLegacy({ userId, queue, hasProfile }) {
  const l = await readLegacy();
  if (!l || !l.has) return null;
  const cv = await convertLegacyData(l.data, { userId });
  await persistConverted(cv, { userId, queue, mode: 'merge' });
  if (!hasProfile && cv.profile) { await db.kvSet('profile', cv.profile); if (cv.settings) await db.kvSet('settings', cv.settings); await queue('profile', 'me'); }
  if (l.data.draft && !(await db.kvGet('activeSession', null))) await db.kvSet('activeSession', await convertDraft(l.data.draft));
  await markLegacy({ claimedBy: userId, claimedAt: Date.now() });
  return l.counts;
}

// Depois que tudo foi enviado, apaga o banco antigo (privacidade em aparelho compartilhado).
export async function purgeLegacy() { await db.deleteDatabase(db.LEGACY_DB_NAME); }

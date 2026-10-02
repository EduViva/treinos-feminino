// Motor de sincronização OFFLINE-FIRST entre o IndexedDB (cache local + fila) e o Supabase (fonte de verdade).
//
//  ESCRITA   store.* grava no IndexedDB na hora (o app nunca espera a rede) e coloca uma entrada na OUTBOX
//            (uma por registro: 'workout:<id>'). Quando há conexão, a outbox é enviada em ordem de dependência
//            (exercício → mídia → prefs → treino → sessão …). Cada envio é IDEMPOTENTE (upsert por id), então
//            repetir após queda de rede é seguro. Falhas ficam na fila com backoff; nada é perdido.
//  LEITURA   pull incremental por tabela: `updated_at >= cursor` (o updated_at é do SERVIDOR, via trigger).
//            Registros com alteração local pendente NÃO são sobrescritos (o local vence até ser enviado).
//  EXCLUSÃO  soft delete (deleted_at) → propaga entre aparelhos; o pull remove o registro local.
//
// Este módulo não importa auth/DOM: recebe o cliente Supabase em start() (também roda em testes no Node).
import * as db from '../db.js';
import * as M from './mappers.js';

// Ordem de envio respeita as chaves estrangeiras.
const ORDER = ['profile', 'exercise', 'media', 'prefs', 'workout', 'session', 'activity', 'wellbeing', 'weight', 'suggestion'];
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // limite do bucket user-media
const OVERLAP_MS = 2 * 60 * 1000;          // reler um pouco antes do cursor (transações que commitam fora de ordem)
const PAGE = 500;

let client = null, userId = null, hooks = {};
let started = false, running = null, again = null, retryTimer = null, debounce = null;
const listeners = new Set();

export const status = { state: 'idle', pending: 0, failed: 0, lastSyncAt: null, lastError: null, online: true };
export const onStatus = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function setStatus(patch) { Object.assign(status, patch); for (const f of listeners) { try { f(status); } catch (e) { console.error(e); } } }
const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

// ---------------------------------------------------------------- erros
function must(res) {
  if (res && res.error) {
    const e = new Error(res.error.message || 'erro desconhecido');
    e.code = res.error.code || res.error.statusCode; e.status = res.status ?? res.error.status ?? Number(res.error.statusCode) ?? 0; e.details = res.error.details;
    throw e;
  }
  return res;
}
const NET_RE = /failed to fetch|fetch failed|network|load failed|timed? ?out|ECONN|ENOTFOUND|offline/i;
export function classify(e) {
  const msg = String(e?.message || e);
  if (e?.status === 0 || NET_RE.test(msg) || !isOnline()) return { kind: 'offline' };
  if (e?.status === 401 || e?.code === 'PGRST301' || /jwt|not authenticated|invalid.*token/i.test(msg)) return { kind: 'auth' };
  return { kind: 'client' };
}

// ---------------------------------------------------------------- fila (outbox)
export async function queue(entity, id, { op = 'upsert', meta } = {}) {
  const key = `${entity}:${id}`;
  const prev = await db.get('outbox', key);
  await db.put('outbox', { key, entity, id, op, meta: meta ?? (op === 'delete' ? prev?.meta ?? null : null), v: (prev?.v || 0) + 1, at: Date.now(), tries: 0, nextAt: 0, error: null });
  await refreshCounts();
  scheduleFlush();
}
export async function pendingKeys() { return new Set((await db.getAll('outbox')).map((o) => o.key)); }
async function refreshCounts() {
  try { const all = await db.getAll('outbox'); setStatus({ pending: all.length, failed: all.filter((o) => o.tries > 0).length }); } catch { /* banco fechado */ }
}
export const pendingCount = () => status.pending;

function scheduleFlush(delay = 500) {
  if (!started) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => { if (isOnline()) syncNow({ pull: false }); else setStatus({ state: 'offline', online: false }); }, delay);
}

async function ack(op) {
  const cur = await db.get('outbox', op.key);
  if (cur && cur.v === op.v) await db.del('outbox', op.key); // se mudou durante o envio, continua na fila
}
async function fail(op, e) {
  const cur = await db.get('outbox', op.key);
  if (!cur || cur.v !== op.v) return;
  const tries = (cur.tries || 0) + 1;
  await db.put('outbox', { ...cur, tries, nextAt: Date.now() + Math.min(2 ** tries * 5000, 30 * 60 * 1000), error: String(e?.message || e).slice(0, 300) });
  setStatus({ lastError: `${op.entity}: ${e?.message || e}` });
  console.warn('[sync] falhou', op.key, e);
}

// ---------------------------------------------------------------- envio (push)
const nowIso = () => new Date().toISOString();
const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

const PUSH = {
  async profile() {
    const profile = await db.kvGet('profile', null);
    if (!profile) return; // nunca sobrescreve o perfil do servidor com dados vazios
    must(await client.from('profiles').upsert(M.profileToRow(profile, await db.kvGet('settings', {}), userId), { onConflict: 'id' }));
  },

  async exercise(op) {
    if (op.op === 'delete') { must(await client.from('exercises').update({ deleted_at: nowIso(), is_active: false }).eq('id', op.id)); return; }
    const ex = await db.get('exercises', op.id);
    if (!ex || ex.builtin) return; // o catálogo global é somente leitura
    const { row, secondary } = M.exerciseToRows(ex, userId);
    must(await client.from('exercises').upsert(row, { onConflict: 'id' }));
    must(await client.from('exercise_secondary_muscles').delete().eq('exercise_id', ex.id));
    if (secondary.length) must(await client.from('exercise_secondary_muscles').insert(secondary.map((g) => ({ exercise_id: ex.id, muscle_group_id: g }))));
  },

  async prefs(op) {
    const p = await db.get('prefs', op.id);
    if (!p) return;
    const row = M.prefsToRow(p, userId);
    try { must(await client.from('user_exercise_prefs').upsert(row, { onConflict: 'user_id,exercise_id' })); } catch (e) {
      if (e.code !== '23503' || !row.primary_media_id) throw e;      // mídia principal ainda não existe no servidor
      must(await client.from('user_exercise_prefs').upsert({ ...row, primary_media_id: null }, { onConflict: 'user_id,exercise_id' }));
    }
  },

  async media(op) {
    if (op.op === 'delete') {
      const path = op.meta?.path;
      if (path) { const r = await client.storage.from('user-media').remove([path]); if (r.error && !/not.?found/i.test(r.error.message || '')) throw storageErr(r.error); }
      must(await client.from('exercise_media').update({ deleted_at: nowIso() }).eq('id', op.id));
      return;
    }
    const m = await db.get('media', op.id);
    if (!m || !m.blob) return; // só metadados remotos: nada a enviar
    if (m.blob.size > MAX_UPLOAD_BYTES) { await db.put('media', { ...m, localOnly: true }); return; }
    const path = m.path || M.mediaPath(userId, m);
    const up = await client.storage.from('user-media').upload(path, m.blob, { contentType: m.mime || m.blob.type || 'application/octet-stream', upsert: true });
    if (up.error) throw storageErr(up.error);
    must(await client.from('exercise_media').upsert(M.mediaToRow({ ...m, path }, userId), { onConflict: 'id' }));
    const cur = await db.get('media', op.id);
    if (cur) await db.put('media', { ...cur, path, remote: true, bucket: 'user-media' });
  },

  async workout(op) {
    if (op.op === 'delete') { must(await client.from('workouts').update({ deleted_at: nowIso() }).eq('id', op.id)); return; }
    const w = await db.get('workouts', op.id);
    if (!w) return;
    const { row, items: all } = M.workoutToRows(w, userId);
    const items = [];
    for (const it of all) if (await db.get('exercises', it.exercise_id)) items.push(it); // exercício desconhecido não trava o plano
    must(await client.from('workouts').upsert(row, { onConflict: 'id' }));
    if (items.length) must(await client.from('workout_exercises').upsert(items, { onConflict: 'id' }));
    let del = client.from('workout_exercises').delete().eq('workout_id', w.id);
    if (items.length) del = del.not('id', 'in', `(${items.map((i) => i.id).join(',')})`);
    must(await del);
  },

  async session(op) {
    if (op.op === 'delete') { must(await client.from('workout_sessions').update({ deleted_at: nowIso() }).eq('id', op.id)); return; }
    const s = await db.get('sessions', op.id);
    if (!s) return;
    const write = async ({ session, exercises, sets }) => {
      must(await client.from('workout_sessions').upsert(session, { onConflict: 'id' }));
      must(await client.from('session_exercises').delete().eq('session_id', session.id)); // cascata limpa as séries
      if (exercises.length) must(await client.from('session_exercises').insert(exercises));
      for (const part of chunks(sets, 400)) must(await client.from('session_sets').insert(part));
    };
    let rows = M.sessionToRows(s, userId);
    try { await write(rows); } catch (e) {
      if (e.code !== '23503') throw e; // referência a treino/exercício que não existe no servidor: o histórico guarda o snapshot
      rows = { ...rows, session: { ...rows.session, workout_id: null }, exercises: rows.exercises.map((x) => ({ ...x, exercise_id: null })) };
      await write(rows);
    }
  },

  async activity(op) {
    if (op.op === 'delete') { must(await client.from('activities').update({ deleted_at: nowIso() }).eq('id', op.id)); return; }
    const a = await db.get('activities', op.id);
    if (a) must(await client.from('activities').upsert(M.activityToRow(a, userId), { onConflict: 'id' }));
  },
  async wellbeing(op) {
    if (op.op === 'delete') { must(await client.from('wellbeing_entries').update({ deleted_at: nowIso() }).eq('user_id', userId).eq('entry_date', op.id)); return; }
    const w = await db.get('wellbeing', op.id);
    if (w) must(await client.from('wellbeing_entries').upsert(M.wellbeingToRow(w, userId), { onConflict: 'user_id,entry_date' }));
  },
  async weight(op) {
    if (op.op === 'delete') { must(await client.from('body_weights').update({ deleted_at: nowIso() }).eq('user_id', userId).eq('measured_on', op.meta?.date)); return; }
    const w = await db.get('weights', op.id);
    if (w) must(await client.from('body_weights').upsert(M.weightToRow(w, userId), { onConflict: 'user_id,measured_on' }));
  },
  async suggestion(op) {
    const s = await db.get('suggestions', op.id);
    if (!s) return;
    let row = M.suggestionToRow(s, userId);
    try { must(await client.from('progression_suggestions').upsert(row, { onConflict: 'id' })); } catch (e) {
      if (e.code !== '23503') throw e;
      row = { ...row, exercise_id: null, workout_id: null };
      must(await client.from('progression_suggestions').upsert(row, { onConflict: 'id' }));
    }
  },
};
function storageErr(e) { const err = new Error(e.message || 'erro no Storage'); err.status = NET_RE.test(e.message || '') ? 0 : Number(e.statusCode) || 400; err.code = e.statusCode; return err; }

async function flush() {
  if (!client || !userId) return { ok: false };
  const ops = (await db.getAll('outbox')).filter((o) => (o.nextAt || 0) <= Date.now())
    .sort((a, b) => ORDER.indexOf(a.entity) - ORDER.indexOf(b.entity) || a.at - b.at);
  for (const op of ops) {
    const run = async () => { await (PUSH[op.entity] || (async () => {}))(op); await ack(op); };
    try { await run(); } catch (e) {
      const c = classify(e);
      if (c.kind === 'offline') { setStatus({ state: 'offline', online: false }); return { ok: false, offline: true }; }
      if (c.kind === 'auth') {
        if (!(await refreshSession())) { setStatus({ state: 'signedout' }); return { ok: false, auth: true }; }
        try { await run(); continue; } catch (e2) { if (classify(e2).kind === 'offline') { setStatus({ state: 'offline', online: false }); return { ok: false, offline: true }; } await fail(op, e2); continue; }
      }
      await fail(op, e);
    }
  }
  await refreshCounts();
  return { ok: true };
}
async function refreshSession() {
  try { const r = await client.auth.refreshSession(); return !r.error && !!r.data?.session; } catch { return false; }
}

// ---------------------------------------------------------------- leitura (pull)
const cursorKey = 'syncCursors';
async function fetchSince(table, select, since, { order2, soft = true, page = PAGE } = {}) {
  const out = [];
  for (let from = 0; ; from += page) {
    let q = client.from(table).select(select).order('updated_at', { ascending: true });
    if (order2) q = q.order(order2, { ascending: true });
    if (since) q = q.gte('updated_at', since); else if (soft) q = q.is('deleted_at', null);
    const { data } = must(await q.range(from, from + page - 1));
    out.push(...(data || []));
    if (!data || data.length < page) break;
  }
  return out;
}
const maxUpdated = (rows, prev) => rows.reduce((m, r) => Math.max(m, new Date(r.updated_at).getTime() || 0), prev || 0);

// Cada puxada: { entity, table, select, store, order2, soft, key(row), apply(row, pending) → 'put'|'del'|null }
const PULL = [
  { name: 'exercises', table: 'exercises', select: '*, exercise_secondary_muscles(muscle_group_id)', order2: 'id',
    async apply(r, pend) {
      if (pend.has(`exercise:${r.id}`)) return;
      if (r.deleted_at) return db.del('exercises', r.id);
      await db.put('exercises', M.exerciseFromRow(r));
    } },
  { name: 'prefs', table: 'user_exercise_prefs', select: '*', order2: 'exercise_id', soft: false,
    async apply(r, pend) { if (!pend.has(`prefs:${r.exercise_id}`)) await db.put('prefs', M.prefsFromRow(r)); } },
  { name: 'media', table: 'exercise_media', select: '*', order2: 'id',
    async apply(r, pend) {
      if (pend.has(`media:${r.id}`)) return;
      if (r.deleted_at) return db.del('media', r.id);
      const local = await db.get('media', r.id);
      await db.put('media', { ...M.mediaFromRow(r), ...(local?.blob ? { blob: local.blob } : {}) });
    } },
  { name: 'workouts', table: 'workouts', select: '*, workout_exercises(*)', order2: 'id', page: 200,
    async apply(r, pend) {
      if (pend.has(`workout:${r.id}`)) return;
      if (r.deleted_at) return db.del('workouts', r.id);
      await db.put('workouts', M.workoutFromRows(r, r.workout_exercises));
    } },
  { name: 'sessions', table: 'workout_sessions', select: '*, session_exercises(*, session_sets(*))', order2: 'id', page: 100,
    async apply(r, pend) {
      if (pend.has(`session:${r.id}`)) return;
      if (r.deleted_at) return db.del('sessions', r.id);
      await db.put('sessions', M.sessionFromRows(r));
    } },
  { name: 'activities', table: 'activities', select: '*', order2: 'id',
    async apply(r, pend) {
      if (pend.has(`activity:${r.id}`)) return;
      if (r.deleted_at) return db.del('activities', r.id);
      await db.put('activities', M.activityFromRow(r));
    } },
  { name: 'wellbeing', table: 'wellbeing_entries', select: '*', order2: 'entry_date',
    async apply(r, pend) {
      if (pend.has(`wellbeing:${r.entry_date}`)) return;
      if (r.deleted_at) return db.del('wellbeing', r.entry_date);
      await db.put('wellbeing', M.wellbeingFromRow(r));
    } },
  { name: 'weights', table: 'body_weights', select: '*', order2: 'measured_on',
    async apply(r, pend) {
      const id = `w-${r.measured_on}`;
      // um registro por dia: remove cópias locais antigas (outro id) da mesma data, se não houver alteração pendente
      for (const w of await db.getAll('weights')) if (w.date === r.measured_on && w.id !== id && !pend.has(`weight:${w.id}`)) await db.del('weights', w.id);
      if (pend.has(`weight:${id}`)) return;
      if (r.deleted_at) return db.del('weights', id);
      await db.put('weights', M.weightFromRow(r));
    } },
  { name: 'suggestions', table: 'progression_suggestions', select: '*', order2: 'id', soft: false,
    async apply(r, pend) { if (!pend.has(`suggestion:${r.id}`)) await db.put('suggestions', M.suggestionFromRow(r)); } },
];

async function pullProfile(pend) {
  const { data } = must(await client.from('profiles').select('*').eq('id', userId).maybeSingle());
  if (!data || pend.has('profile:me')) return false;
  const { profile, settings } = M.profileFromRow(data);
  if (profile) {
    await db.kvSet('profile', { ...(await db.kvGet('profile', {})), ...profile });
    await db.kvSet('settings', { ...(await db.kvGet('settings', {})), ...settings });
    return true;
  }
  if (await db.kvGet('profile', null)) await queue('profile', 'me'); // servidor ainda sem perfil: envia o local
  return false;
}

export async function pullAll() {
  if (!client || !userId) return false;
  let changed = false;
  const cursors = await db.kvGet(cursorKey, {});
  changed = (await pullProfile(await pendingKeys())) || changed;
  for (const p of PULL) {
    const since = cursors[p.name] ? new Date(cursors[p.name] - OVERLAP_MS).toISOString() : null;
    const rows = await fetchSince(p.table, p.select, since, { order2: p.order2, soft: p.soft !== false, page: p.page });
    if (rows.length) {
      const pend = await pendingKeys();
      for (const r of rows) await p.apply(r, pend);
      changed = true;
    }
    // O cursor vem SOMENTE de timestamps do servidor (nunca do relógio do aparelho): sem linhas, continua vazio
    // e a próxima puxada relê a tabela inteira (barato quando está vazia).
    cursors[p.name] = maxUpdated(rows, cursors[p.name]) || cursors[p.name] || null;
  }
  await db.kvSet(cursorKey, cursors);
  const meta = await db.kvGet('meta', {});
  if (!meta.initialSyncDone) await db.kvSet('meta', { ...meta, initialSyncDone: true });
  if (changed && hooks.reload) await hooks.reload();
  return changed;
}

// ---------------------------------------------------------------- orquestração
export function syncNow({ pull = true } = {}) {
  if (!started) return Promise.resolve();
  if (running) { again = again === 'pull' || pull ? 'pull' : 'flush'; return running; }
  running = (async () => {
    try {
      let doPull = pull;
      do {
        again = null;
        if (!isOnline()) { setStatus({ state: 'offline', online: false }); break; }
        setStatus({ state: 'syncing', online: true });
        const r = await flush();
        if (!r.ok) break;
        if (doPull) await pullAll();
        const f = status.failed;
        setStatus({ state: f ? 'error' : 'idle', lastSyncAt: Date.now(), lastError: f ? status.lastError : null, online: true });
        doPull = again === 'pull';
      } while (again);
    } catch (e) {
      const c = classify(e);
      if (c.kind === 'offline') setStatus({ state: 'offline', online: false });
      else if (c.kind === 'auth') setStatus({ state: 'signedout' });
      else { setStatus({ state: 'error', lastError: e.message }); console.error('[sync]', e); }
    } finally {
      running = null;
      await refreshCounts();
      clearTimeout(retryTimer);
      if (started && status.pending > 0 && status.state !== 'signedout') retryTimer = setTimeout(() => syncNow({ pull: false }), status.state === 'offline' ? 30000 : 20000);
    }
  })();
  return running;
}

const onOnline = () => { setStatus({ online: true }); syncNow(); };
const onOffline = () => setStatus({ state: 'offline', online: false });
const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - (status.lastSyncAt || 0) > 60000) syncNow(); };

export function start({ client: c, userId: u, hooks: h = {} }) {
  stop();
  client = c; userId = u; hooks = h; started = true;
  if (typeof window !== 'undefined') {
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
  }
  refreshCounts();
  return syncNow();
}
export function stop() {
  started = false; clearTimeout(retryTimer); clearTimeout(debounce);
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisible);
  }
  client = null; userId = null; running = null; again = null;
  setStatus({ state: 'idle', pending: 0, failed: 0 });
}
export const isStarted = () => started;

// ---------------------------------------------------------------- mídia remota e LGPD
export async function downloadMedia(path, bucket = 'user-media') {
  if (!client) return null;
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error) throw storageErr(error);
  return data;
}

async function removeAllMediaFiles() {
  const { data } = must(await client.from('exercise_media').select('storage_path').eq('owner_id', userId).eq('bucket', 'user-media'));
  for (const part of chunks((data || []).map((r) => r.storage_path), 100)) {
    const r = await client.storage.from('user-media').remove(part);
    if (r.error) throw storageErr(r.error);
  }
}
// "Apagar todos os meus dados": arquivos do Storage + todas as linhas (RPC). Exige conexão.
export async function eraseRemoteData() {
  if (!client) throw new Error('Sem conta conectada.');
  await removeAllMediaFiles();
  must(await client.rpc('erase_my_data'));
}
// "Excluir minha conta": arquivos + conta (cascata apaga todo o resto).
export async function deleteRemoteAccount() {
  if (!client) throw new Error('Sem conta conectada.');
  await removeAllMediaFiles();
  must(await client.rpc('delete_my_account'));
}

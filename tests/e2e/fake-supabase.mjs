// Supabase SIMULADO para os testes E2E (o app fala com ele exatamente como falaria com o real).
// Implementa o subconjunto usado pelo app: Auth (GoTrue), REST (PostgREST: filtros, order, range, embeds, upsert,
// soft delete, RPC) e Storage — com "RLS" por usuário e algumas chaves estrangeiras (erro 23503).
// A segurança REAL (RLS no Postgres) é testada em supabase/tests/rls_multiuser.sql; aqui o foco é o CLIENTE.
import { randomUUID } from 'node:crypto';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.fake-signature`;
const json = (status, body, headers = {}) => ({ status, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

// tabela → { pk, owner (coluna do dono ou null), children, fks }
const TABLES = {
  profiles: { pk: ['id'], owner: 'id' },
  exercises: { pk: ['id'], owner: 'owner_id', catalog: true, children: { exercise_secondary_muscles: { table: 'exercise_secondary_muscles', fk: ['exercise_id'], ref: ['id'] } } },
  exercise_secondary_muscles: { pk: ['exercise_id', 'muscle_group_id'], via: 'exercises' },
  exercise_media: { pk: ['id'], owner: 'owner_id', fks: { exercise_id: 'exercises' } },
  user_exercise_prefs: { pk: ['user_id', 'exercise_id'], owner: 'user_id', fks: { exercise_id: 'exercises', primary_media_id: 'exercise_media' } },
  workouts: { pk: ['id'], owner: 'user_id', children: { workout_exercises: { table: 'workout_exercises', fk: ['workout_id'], ref: ['id'] } } },
  workout_exercises: { pk: ['id'], owner: 'user_id', fks: { exercise_id: 'exercises', workout_id: 'workouts' } },
  workout_sessions: { pk: ['id'], owner: 'user_id', fks: { workout_id: 'workouts' }, children: { session_exercises: { table: 'session_exercises', fk: ['session_id'], ref: ['id'] } } },
  session_exercises: { pk: ['session_id', 'position'], owner: 'user_id', fks: { exercise_id: 'exercises', session_id: 'workout_sessions' },
    children: { session_sets: { table: 'session_sets', fk: ['session_id', 'exercise_position'], ref: ['session_id', 'position'] } } },
  session_sets: { pk: ['session_id', 'exercise_position', 'set_number'], owner: 'user_id' },
  activities: { pk: ['id'], owner: 'user_id' },
  wellbeing_entries: { pk: ['user_id', 'entry_date'], owner: 'user_id' },
  body_weights: { pk: ['user_id', 'measured_on'], owner: 'user_id' },
  progression_suggestions: { pk: ['id'], owner: 'user_id', fks: { exercise_id: 'exercises', workout_id: 'workouts' } },
};
const CASCADE = { workouts: ['workout_exercises'], workout_sessions: ['session_exercises'], session_exercises: ['session_sets'], exercises: ['exercise_secondary_muscles'] };

export function createFake({ autoconfirm = true } = {}) {
  const db = Object.fromEntries(Object.keys(TABLES).map((t) => [t, []]));
  const users = new Map();           // id → { id, email, password, name, confirmed }
  const storage = new Map();         // "bucket/path" → { blob(Buffer), type }
  const codes = new Map();           // email → código (signup/recovery)
  const log = [];
  let tick = 0, offline = false;
  const now = () => new Date(Date.parse('2026-01-01T00:00:00Z') + (++tick) * 1000 + Date.now() % 1).toISOString();
  const state = { autoconfirm, failNext: [], delay: 0 };

  const userByToken = (req) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) return null;
    try { const p = JSON.parse(Buffer.from(m[1].split('.')[1], 'base64url').toString()); return users.get(p.sub) && p.exp * 1000 > Date.now() ? users.get(p.sub) : null; } catch { return null; }
  };
  const sessionFor = (u) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const user = { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: { name: u.name }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
    return { access_token: jwt({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp }), token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: `rt-${u.id}`, user };
  };
  const newUser = ({ email, password, name }) => {
    const id = randomUUID();
    const u = { id, email: email.toLowerCase(), password, name: name || email.split('@')[0], confirmed: state.autoconfirm };
    users.set(id, u);
    // gatilho handle_new_user: perfil + papel (aqui só o perfil)
    db.profiles.push({ id, display_name: u.name, age: null, sex: null, height_cm: null, weight_kg: null, goal: null, level: null, settings: {}, onboarded_at: null, created_at: now(), updated_at: now() });
    return u;
  };
  const byEmail = (e) => [...users.values()].find((u) => u.email === String(e).toLowerCase());

  // ---------------------------------------------------------------- Auth
  function auth(req, path, body, query) {
    if (path === '/auth/v1/signup') {
      if (byEmail(body.email)) return json(200, { id: randomUUID(), aud: 'authenticated', email: body.email, identities: [] });
      if ((body.password || '').length < 8) return json(422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 8 characters.' });
      const u = newUser({ email: body.email, password: body.password, name: body.data?.name });
      if (u.confirmed) return json(200, sessionFor(u));
      codes.set(u.email, '123456');
      return json(200, { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: { name: u.name } });
    }
    if (path === '/auth/v1/token' && query.get('grant_type') === 'password') {
      const u = byEmail(body.email);
      if (!u || u.password !== body.password) return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      if (!u.confirmed) return json(400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
      return json(200, sessionFor(u));
    }
    if (path === '/auth/v1/token' && query.get('grant_type') === 'refresh_token') {
      const u = users.get(String(body.refresh_token || '').replace('rt-', ''));
      return u && !state.revoked?.has(u.id) ? json(200, sessionFor(u)) : json(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
    }
    if (path === '/auth/v1/verify') {
      const u = byEmail(body.email);
      if (!u || codes.get(u.email) !== String(body.token)) return json(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
      if (body.type === 'signup') u.confirmed = true;
      codes.delete(u.email);
      return json(200, sessionFor(u));
    }
    if (path === '/auth/v1/recover') { const u = byEmail(body.email); if (u) codes.set(u.email, '654321'); return json(200, {}); }
    if (path === '/auth/v1/resend') { const u = byEmail(body.email); if (u) codes.set(u.email, '123456'); return json(200, {}); }
    if (path === '/auth/v1/logout') return { status: 204, headers: {}, body: '' };
    if (path === '/auth/v1/user') {
      const u = userByToken(req);
      if (!u) return json(401, { code: 401, msg: 'invalid JWT' });
      if (req.method === 'PUT') { if (body.password) u.password = body.password; }
      return json(200, { id: u.id, aud: 'authenticated', email: u.email, user_metadata: { name: u.name } });
    }
    return json(404, { msg: 'rota de auth desconhecida ' + path });
  }

  // ---------------------------------------------------------------- REST
  const pkOf = (t, row) => TABLES[t].pk.map((k) => row[k]).join('|');
  const visible = (t, row, uid) => {
    const T = TABLES[t];
    if (T.catalog && (row.origin === 'catalog' || row.owner_id === uid)) return true;
    if (T.via) { const parent = db[T.via].find((p) => p.id === row.exercise_id); return !!parent && visible(T.via, parent, uid); }
    if (t === 'exercise_media') return row.owner_id === uid || row.owner_id == null;
    return T.owner ? row[T.owner] === uid : true;
  };
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  function matchFilter(row, key, expr) {
    const v = row[key];
    const [op, ...rest] = expr.split('.');
    const val = rest.join('.');
    const coerce = (x) => (v === null || v === undefined ? x : typeof v === 'number' ? Number(x) : typeof v === 'boolean' ? x === 'true' : String(x));
    switch (op) {
      case 'eq': return String(v) === val;
      case 'neq': return String(v) !== val;
      case 'gte': return v != null && cmp(String(v), val) >= 0;
      case 'gt': return v != null && cmp(String(v), val) > 0;
      case 'lte': return v != null && cmp(String(v), val) <= 0;
      case 'is': return val === 'null' ? v == null : val === 'true' ? v === true : v === false;
      case 'in': return val.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '')).includes(String(v));
      case 'not': { const [op2, ...r2] = rest; return !matchFilter(row, key, `${op2}.${r2.join('.')}`); }
      case 'ilike': case 'like': return new RegExp(`^${val.replace(/%/g, '.*')}$`, 'i').test(String(v));
      default: return coerce(val) === v;
    }
  }

  // select: "*, exercise_secondary_muscles(muscle_group_id)" | "*, session_exercises(*, session_sets(*))" …
  function parseSelect(sel) {
    const parts = []; let depth = 0, cur = '';
    for (const ch of sel) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch; }
    if (cur.trim()) parts.push(cur.trim());
    return parts.map((p) => { const m = /^([a-z_]+)\((.*)\)$/s.exec(p); return m ? { embed: m[1], select: m[2] } : { col: p }; });
  }
  function project(t, row, sel, uid) {
    const items = parseSelect(sel);
    const out = {};
    for (const it of items) {
      if (it.col === '*') Object.assign(out, row);
      else if (it.col) out[it.col] = row[it.col];
    }
    for (const it of items) {
      if (!it.embed) continue;
      const rel = TABLES[t].children?.[it.embed];
      if (!rel) throw Object.assign(new Error(`relação desconhecida ${t}.${it.embed}`), { status: 400 });
      out[it.embed] = db[rel.table].filter((c) => rel.fk.every((k, i) => c[k] === row[rel.ref[i]]) && visible(rel.table, c, uid)).map((c) => project(rel.table, c, it.select, uid));
    }
    return out;
  }

  function rest(req, path, body, query) {
    const uid = userByToken(req)?.id;
    if (!uid) return json(401, { code: 'PGRST301', message: 'JWT expired or invalid' });
    const name = path.replace('/rest/v1/', '');
    if (name.startsWith('rpc/')) return rpc(name.slice(4), uid);
    const T = TABLES[name];
    if (!T) return json(404, { code: '42P01', message: `tabela ${name} não existe` });
    const filters = [...query.entries()].filter(([k]) => !['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k));
    const rows = () => db[name].filter((r) => visible(name, r, uid) && filters.every(([k, e]) => matchFilter(r, k, e)));
    const prefer = req.headers.prefer || '';

    if (req.method === 'GET') {
      let list = rows();
      for (const o of (query.get('order') || '').split(',').filter(Boolean).reverse()) { const [col, dir] = o.split('.'); list.sort((a, b) => (cmp(a[col] ?? '', b[col] ?? '') || 0) * (dir === 'desc' ? -1 : 1)); }
      const off = Number(query.get('offset') || 0), lim = Number(query.get('limit') || 1000);
      const total = list.length;
      list = list.slice(off, off + Math.min(lim, 1000));
      return json(200, list.map((r) => project(name, r, query.get('select') || '*', uid)), { 'content-range': `${off}-${off + list.length - 1}/${total}` });
    }

    const writeCheck = (row) => {
      const T2 = TABLES[name];
      if (T2.owner && name !== 'exercises') { if (row[T2.owner] !== uid && !(name === 'exercise_media' && row.owner_id == null)) return json(403, { code: '42501', message: 'new row violates row-level security policy' }); }
      if (name === 'exercises') { if (row.origin === 'catalog' || row.owner_id !== uid) return json(403, { code: '42501', message: 'new row violates row-level security policy' }); }
      if (T2.via) { const p = db[T2.via].find((x) => x.id === row.exercise_id); if (!p || p.owner_id !== uid) return json(403, { code: '42501', message: 'new row violates row-level security policy' }); }
      for (const [col, ref] of Object.entries(T2.fks || {})) {
        if (row[col] == null) continue;
        const refKey = ref === 'workout_sessions' ? 'id' : 'id';
        if (!db[ref].some((x) => x[refKey] === row[col])) return json(409, { code: '23503', message: `insert or update on table "${name}" violates foreign key constraint (${col})` });
      }
      return null;
    };

    if (req.method === 'POST') {
      const arr = Array.isArray(body) ? body : [body];
      const conflict = (query.get('on_conflict') || TABLES[name].pk.join(',')).split(',');
      const upsert = /resolution=merge-duplicates/.test(prefer);
      const staged = [];
      for (const raw of arr) {
        const row = { ...raw };
        if (TABLES[name].pk.includes('id') && !row.id) row.id = randomUUID();
        const bad = writeCheck(row); if (bad) return bad;
        const existing = db[name].find((r) => conflict.every((k) => r[k] === row[k]));
        if (existing && !upsert) return json(409, { code: '23505', message: `duplicate key value violates unique constraint on ${name}` });
        if (existing && !visible(name, existing, uid)) return json(403, { code: '42501', message: 'row-level security violation' });
        staged.push({ row, existing });
      }
      for (const { row, existing } of staged) {
        if (existing) Object.assign(existing, row, { updated_at: now() });
        else {
          const base = { created_at: now(), updated_at: now() };
          if ('deleted_at' in (row) === false && ['workouts', 'workout_sessions', 'activities', 'wellbeing_entries', 'body_weights', 'exercises', 'exercise_media'].includes(name)) base.deleted_at = null;
          if (name === 'workouts') base.created_by = uid;
          db[name].push({ ...base, ...row, updated_at: now() });
        }
        if (name === 'exercise_secondary_muscles') { const p = db.exercises.find((x) => x.id === row.exercise_id); if (p) p.updated_at = now(); }
      }
      return /return=representation/.test(prefer) ? json(201, staged.map((s) => s.existing || s.row)) : { status: 201, headers: {}, body: '' };
    }

    if (req.method === 'PATCH') {
      const list = rows();
      for (const r of list) Object.assign(r, body, { updated_at: now() });
      return { status: 204, headers: {}, body: '' };
    }

    if (req.method === 'DELETE') {
      const list = rows();
      const del = (t, r) => { db[t] = db[t].filter((x) => x !== r); for (const child of CASCADE[t] || []) { const rel = TABLES[t].children[child]; for (const c of db[child].filter((c) => rel.fk.every((k, i) => c[k] === r[rel.ref[i]]))) del(child, c); } };
      for (const r of list) del(name, r);
      if (name === 'exercise_secondary_muscles') for (const r of list) { const p = db.exercises.find((x) => x.id === r.exercise_id); if (p) p.updated_at = now(); }
      return { status: 204, headers: {}, body: '' };
    }
    return json(405, { message: 'método não suportado' });
  }

  function rpc(fn, uid) {
    if (fn === 'erase_my_data') {
      for (const t of ['progression_suggestions', 'session_sets', 'session_exercises', 'workout_sessions', 'workout_exercises', 'workouts', 'activities', 'wellbeing_entries', 'body_weights', 'user_exercise_prefs', 'exercise_media']) db[t] = db[t].filter((r) => (TABLES[t].owner ? r[TABLES[t].owner] !== uid : true));
      db.exercises = db.exercises.filter((e) => e.owner_id !== uid);
      const p = db.profiles.find((x) => x.id === uid); if (p) Object.assign(p, { display_name: '', age: null, sex: null, height_cm: null, weight_kg: null, goal: null, level: null, settings: {}, onboarded_at: null, updated_at: now() });
      return { status: 204, headers: {}, body: '' };
    }
    if (fn === 'delete_my_account') { rpc('erase_my_data', uid); db.profiles = db.profiles.filter((p) => p.id !== uid); users.delete(uid); return { status: 204, headers: {}, body: '' }; }
    return json(404, { message: `rpc ${fn} desconhecida` });
  }

  // ---------------------------------------------------------------- Storage
  function store(req, path) {
    const uid = userByToken(req)?.id;
    if (!uid) return json(401, { message: 'invalid JWT', statusCode: '401' });
    const m = /^\/storage\/v1\/object\/(?:authenticated\/|public\/)?([^/]+)(?:\/(.+))?$/.exec(path);
    if (!m) return json(404, { message: 'rota de storage desconhecida', statusCode: '404' });
    const [, bucket, objPath] = m;
    if (req.method === 'POST' || req.method === 'PUT') {
      if (bucket !== 'user-media' || !decodeURIComponent(objPath).startsWith(`${uid}/`)) return json(403, { message: 'new row violates row-level security policy', statusCode: '403', error: 'Unauthorized' });
      storage.set(`${bucket}/${decodeURIComponent(objPath)}`, { blob: req.rawBody, type: req.headers['content-type'] || 'application/octet-stream' });
      return json(200, { Id: randomUUID(), Key: `${bucket}/${objPath}` });
    }
    if (req.method === 'GET') {
      const o = storage.get(`${bucket}/${decodeURIComponent(objPath)}`);
      if (!o || (bucket === 'user-media' && !decodeURIComponent(objPath).startsWith(`${uid}/`))) return json(404, { message: 'Object not found', statusCode: '404', error: 'not_found' });
      return { status: 200, headers: { 'content-type': o.type }, body: o.blob, binary: true };
    }
    if (req.method === 'DELETE') {
      const prefixes = JSON.parse(req.rawBody?.toString() || '{}').prefixes || [];
      for (const p of prefixes) storage.delete(`${bucket}/${p}`);
      return json(200, prefixes.map((p) => ({ name: p })));
    }
    return json(405, {});
  }

  // ---------------------------------------------------------------- entrada
  function handle(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    log.push({ method: req.method, path, query: url.search });
    if (req.method === 'OPTIONS') return { status: 204, headers: {}, body: '' };
    const fail = state.failNext.findIndex((f) => f.test(`${req.method} ${path}`));
    if (fail >= 0) { const f = state.failNext[fail]; if (--f.times <= 0) state.failNext.splice(fail, 1); return json(f.status, f.body || { message: 'falha injetada' }); }
    let body = {};
    if (req.rawBody?.length && !path.startsWith('/storage/')) { try { body = JSON.parse(req.rawBody.toString()); } catch { body = {}; } }
    try {
      if (path.startsWith('/auth/v1/')) return auth(req, path, body, url.searchParams);
      if (path.startsWith('/rest/v1/')) return rest(req, path, body, url.searchParams);
      if (path.startsWith('/storage/v1/')) return store(req, path);
    } catch (e) { return json(e.status || 500, { message: e.message }); }
    return json(404, { message: 'não encontrado' });
  }

  return {
    handle, db, users, storage, log, state, codes,
    seedCatalog(rows, secondary = []) {
      for (const r of rows) db.exercises.push({ created_at: now(), updated_at: now(), deleted_at: null, is_active: true, owner_id: null, origin: 'catalog', visibility: 'public', ...r });
      for (const s2 of secondary) db.exercise_secondary_muscles.push(s2);
    },
    createUser: (a) => { const u = newUser(a); return { user: u, session: sessionFor(u) }; },
    sessionFor,
    countCalls: (re) => log.filter((l) => re.test(`${l.method} ${l.path}`)).length,
    offline: () => offline, setOffline: (v) => { offline = v; },
  };
}

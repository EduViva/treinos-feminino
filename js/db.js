// Camada fina sobre IndexedDB: cache LOCAL (offline-first) dos dados da conta + fila de sincronização.
// Cada usuário tem o seu próprio banco local (treinos-feminino-u-<id>): contas diferentes no mesmo
// aparelho nunca se misturam. O banco antigo "treinos-feminino" só é lido para importar dados legados.
// Esquema (versão 2):
//   kv           chave/valor: profile, settings, activeSession, meta
//   exercises    biblioteca de exercícios (inclui os criados pelo usuário)
//   workouts     treinos planejados (A, B, C...)
//   sessions     treinos REALIZADOS (imutáveis; guardam snapshot do planejado)
//   activities   corrida, caminhada, bike, vôlei...
//   wellbeing    um registro por dia (chave = AAAA-MM-DD)
//   weights      peso corporal ao longo do tempo
//   suggestions  sugestões de progressão + decisão + resultado
//   media        fotos/vídeos do usuário (Blob) ligados a exercícios
//   backups      instantâneos internos (restauráveis)
//   prefs        preferências pessoais por exercício (favorito, arquivado, observações, padrões)
//   outbox       alterações locais ainda não enviadas ao Supabase (uma por registro)

export const LEGACY_DB_NAME = 'treinos-feminino';
export const dbNameFor = (userId) => `${LEGACY_DB_NAME}-u-${userId}`;
let DB_NAME = LEGACY_DB_NAME;
const DB_VERSION = 2;
export const STORES = {
  kv: { keyPath: 'key' },
  exercises: { keyPath: 'id' },
  workouts: { keyPath: 'id' },
  sessions: { keyPath: 'id', indexes: [['startedAt', 'startedAt']] },
  activities: { keyPath: 'id', indexes: [['startedAt', 'startedAt']] },
  wellbeing: { keyPath: 'date' },
  weights: { keyPath: 'id', indexes: [['date', 'date']] },
  suggestions: { keyPath: 'id', indexes: [['exerciseId', 'exerciseId']] },
  media: { keyPath: 'id', indexes: [['exerciseId', 'exerciseId']] },
  backups: { keyPath: 'id' },
  prefs: { keyPath: 'exerciseId' },
  outbox: { keyPath: 'key' },
};

let dbp = null;

// Troca o banco local ativo (login/logout). Fecha o anterior.
export function setDatabase(name) {
  if (dbp) dbp.then((d) => d.close()).catch(() => {});
  dbp = null;
  DB_NAME = name;
}
export const currentDatabase = () => DB_NAME;
export function deleteDatabase(name) {
  if (name === DB_NAME) setDatabase(name);
  return new Promise((resolve) => {
    if (!('indexedDB' in globalThis)) return resolve();
    const r = indexedDB.deleteDatabase(name);
    r.onsuccess = r.onerror = r.onblocked = () => resolve();
  });
}

export function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('IndexedDB indisponível neste navegador.'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, def] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const os = db.createObjectStore(name, { keyPath: def.keyPath });
          for (const [iname, path] of def.indexes || []) os.createIndex(iname, path);
        }
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbp = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Banco bloqueado por outra aba.'));
  });
  return dbp;
}

function wrap(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

async function store(name, mode = 'readonly') {
  const db = await open();
  const tx = db.transaction(name, mode);
  return { os: tx.objectStore(name), tx };
}

function done(tx) {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error || new Error('Transação abortada'));
  });
}

export async function get(name, key) {
  const { os } = await store(name);
  return wrap(os.get(key));
}
export async function getAll(name) {
  const { os } = await store(name);
  return wrap(os.getAll());
}
export async function put(name, value) {
  const { os, tx } = await store(name, 'readwrite');
  os.put(value);
  await done(tx);
  return value;
}
export async function putMany(name, values) {
  const { os, tx } = await store(name, 'readwrite');
  for (const v of values) os.put(v);
  await done(tx);
}
export async function del(name, key) {
  const { os, tx } = await store(name, 'readwrite');
  os.delete(key);
  await done(tx);
}
export async function clearStore(name) {
  const { os, tx } = await store(name, 'readwrite');
  os.clear();
  await done(tx);
}
export async function getAllByIndex(name, index, key) {
  const { os } = await store(name);
  return wrap(os.index(index).getAll(key));
}
export async function count(name) {
  const { os } = await store(name);
  return wrap(os.count());
}

// kv helpers
export async function kvGet(key, fallback = null) {
  const r = await get('kv', key);
  return r ? r.value : fallback;
}
export function kvSet(key, value) { return put('kv', { key, value }); }
export function kvDel(key) { return del('kv', key); }

export async function wipeAll() {
  const db = await open();
  const names = [...db.objectStoreNames];
  const tx = db.transaction(names, 'readwrite');
  for (const n of names) tx.objectStore(n).clear();
  await done(tx);
}

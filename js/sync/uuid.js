// UUID v5 (determinístico, SHA-1) e utilidades de UUID. Sem DOM: roda no navegador e no Node.
// O catálogo usa ids determinísticos → o mesmo exercício tem o MESMO id em qualquer ambiente
// (produção, teste, banco recriado) e os treinos/históricos continuam apontando para ele.

export const NS_CATALOG = '6f1d3a9e-2b7c-5d4e-9a10-7c3e5b8d2f41';
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s) => typeof s === 'string' && UUID_RE.test(s);

const toBytes = (uuid) => Uint8Array.from(uuid.replace(/-/g, '').match(/../g).map((h) => parseInt(h, 16)));
const toUuid = (b) => {
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};

export async function uuidv5(name, namespace = NS_CATALOG) {
  const ns = toBytes(namespace), nm = new TextEncoder().encode(name);
  const buf = new Uint8Array(ns.length + nm.length);
  buf.set(ns); buf.set(nm, ns.length);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', buf)).slice(0, 16);
  h[6] = (h[6] & 0x0f) | 0x50; // versão 5
  h[8] = (h[8] & 0x3f) | 0x80; // variante RFC 4122
  return toUuid(h);
}

export const catalogId = (slug) => uuidv5(`catalog:${slug}`);

// UUID v4 aleatório (com fallback quando randomUUID não existe).
export function uuidv4() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  return toUuid(b);
}

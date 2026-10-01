// Ambiente dos testes E2E: servidor estático do app + Supabase simulado + Chromium em viewport de celular.
// O navegador "fala" com https://<ref>.supabase.co normalmente; a rede é interceptada e respondida pelo simulado.
import { chromium } from './pw.mjs';
import { start } from '../../scripts/serve.mjs';
import { createFake } from './fake-supabase.mjs';
import { CATALOG } from '../../supabase/catalog/index.mjs';
import { catalogId } from '../../js/sync/uuid.js';

export const REF = 'bdwrqpiwrrkbtxeuvaem';
export const AUTH_KEY = 'treinos-auth';
export { catalogId };

export async function catalogRows() {
  const rows = [], secondary = [];
  for (const e of CATALOG) {
    const id = await catalogId(e.slug);
    rows.push({
      id, slug: e.slug, name: e.name, aliases: e.aliases, primary_group_id: e.group, equipment_id: e.equipment, exercise_type_id: e.type, level: e.level,
      instructions: e.instructions, tips: e.tips, art_key: e.art, default_sets: e.sets, default_reps: e.reps, default_rest_seconds: e.rest, default_load: 0, load_step: e.step,
      rep_unit: e.unit, is_bodyweight: e.bodyweight,
    });
    for (const s of e.secondary) secondary.push({ exercise_id: id, muscle_group_id: s });
  }
  return { rows, secondary };
}

export async function makeEnv({ port = 8131, autoconfirm = true, headless = true } = {}) {
  const server = await start(port);
  const browser = await chromium.launch({ headless });
  const fake = createFake({ autoconfirm });
  const cat = await catalogRows();
  fake.seedCatalog(cat.rows, cat.secondary);
  const BASE = `http://localhost:${port}/`;
  const errors = [];
  const contexts = [];

  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, prefer, range, accept, accept-profile, content-profile, x-supabase-api-version, x-upsert, cache-control',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'access-control-expose-headers': 'content-range' };

  async function attach(ctx) {
    await ctx.route(new RegExp(`^https://${REF}\\.supabase\\.co/`), async (route) => {
      const r = route.request();
      if (fake.offline()) return route.abort('internetdisconnected');
      if (r.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      const res = fake.handle({ method: r.method(), url: r.url(), headers: r.headers(), rawBody: r.postDataBuffer() });
      if (fake.state.delay) await new Promise((x) => setTimeout(x, fake.state.delay));
      await route.fulfill({ status: res.status, headers: { ...CORS, ...res.headers }, body: res.body === '' ? undefined : res.body });
    });
  }

  // Novo "aparelho" (contexto isolado: IndexedDB/localStorage próprios). `session` = usuário já logado.
  async function device({ session = null, viewport = { width: 390, height: 844 }, name = 'dispositivo' } = {}) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR', acceptDownloads: true });
    await attach(ctx);
    if (session) await ctx.addInitScript(({ key, s }) => { try { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(s)); } catch { /* */ } }, { key: AUTH_KEY, s: session });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[${name}] PAGEERROR ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`[${name}] CONSOLE ${m.text()}`); });
    contexts.push(ctx);
    return { ctx, page, goto: (hash = '') => page.goto(BASE + hash), BASE };
  }

  async function close() { for (const c of contexts) await c.close().catch(() => {}); await browser.close(); server.close?.(); }
  return { fake, device, BASE, errors, close, browser, catalogRows: cat };
}

export function reporter() {
  let passed = 0, failed = 0;
  return {
    ok(cond, msg) { if (cond) { passed++; console.log('  ✓', msg); } else { failed++; console.log('  ✗ FALHOU:', msg); } },
    step: (t) => console.log('\n▶', t),
    done(errors = []) { if (errors.length) { console.log('\nErros de console/página:'); for (const e of errors) console.log('  !', e); } console.log(`\n${passed} ok, ${failed} falhas, ${errors.length} erros de console`); return failed === 0 && errors.length === 0; },
  };
}

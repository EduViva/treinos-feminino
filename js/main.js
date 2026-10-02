// Inicialização, roteamento e barra de navegação.
import { h, clear, $ } from './util.js';
import * as store from './store.js';
import * as db from './db.js';
import * as auth from './auth.js';
import * as sync from './sync/engine.js';
import * as legacy from './legacy.js';
import { app } from './app.js';
import { icon, toast, alertDialog, openSheet, btn, confirmDialog } from './ui.js';
import { authView, splashView } from './views/login.js';
import { destroyTree } from './visual.js';
import { homeView } from './views/home.js';
import { workoutsView, workoutEditorView } from './views/workouts.js';
import { libraryView, exerciseView, exerciseEditView } from './views/exercises.js';
import { evolutionView } from './views/evolution.js';
import { calendarView } from './views/calendar.js';
import { wellbeingView } from './views/wellbeing.js';
import { profileView, onboardingView } from './views/profile.js';
import { startSession, resumeSession, hasDraft } from './views/session.js';

const TABS = [
  ['inicio', 'Início', 'home', '#/'],
  ['treinos', 'Treinos', 'dumbbell', '#/treinos'],
  ['evolucao', 'Evolução', 'chart', '#/evolucao'],
  ['calendario', 'Calendário', 'calendar', '#/calendario'],
  ['bem-estar', 'Bem-estar', 'heart', '#/bem-estar'],
  ['perfil', 'Perfil', 'user', '#/perfil'],
];

const ROUTES = [
  [/^\/?$/, 'inicio', homeView],
  [/^\/treinos$/, 'treinos', workoutsView],
  [/^\/treino\/([^/]+)$/, 'treinos', workoutEditorView],
  [/^\/exercicios$/, 'treinos', libraryView],
  [/^\/exercicio\/novo$/, 'treinos', (p, q) => exerciseEditView(['novo'], q)],
  [/^\/exercicio\/([^/]+)\/editar$/, 'treinos', exerciseEditView],
  [/^\/exercicio\/([^/]+)$/, 'treinos', exerciseView],
  [/^\/evolucao$/, 'evolucao', evolutionView],
  [/^\/calendario$/, 'calendario', calendarView],
  [/^\/bem-estar$/, 'bem-estar', wellbeingView],
  [/^\/perfil$/, 'perfil', profileView],
  [/^\/boas-vindas$/, null, onboardingView],
];

let current = null;
let renderToken = 0;
let phase = 'boot'; // boot → auth (sem login) → app

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function renderTabs(active) {
  const tb = $('#tabbar');
  clear(tb);
  if (active === undefined || active === null) { tb.style.display = 'none'; return; }
  tb.style.display = '';
  tb.appendChild(h('nav', { class: 'tabs', 'aria-label': 'Navegação principal' }, TABS.map(([id, label, ic, href]) =>
    h('a', { class: `tab ${id === active ? 'on' : ''}`, href, 'aria-current': id === active ? 'page' : null },
      h('span', { class: 'ico', html: icon(ic, 22) }), h('span', null, label)))));
}

async function render() {
  if (phase !== 'app') return;
  const token = ++renderToken;
  const { path, query } = parseHash();
  if (!store.state.profile && path !== '/boas-vindas') { replacing = true; location.replace('#/boas-vindas'); return; }
  const view = $('#view');
  const scrollY = window.scrollY;
  let match = null;
  for (const [re, tab, fn] of ROUTES) {
    const m = path.match(re);
    if (m) { match = { tab, fn, params: m.slice(1).map(decodeURIComponent) }; break; }
  }
  if (!match) match = { tab: 'inicio', fn: homeView, params: [] };
  // o rascunho do treino em edição só vale na ida e volta "criar exercício / ver animação"
  if (app.stagedWorkout && !(match.fn === workoutEditorView || (path.startsWith('/exercicio/') && query.w))) app.stagedWorkout = null;
  try {
    const node = await match.fn(match.params, query);
    if (token !== renderToken) { destroyTree(node); return; }
    if (current) destroyTree(current);
    clear(view);
    view.appendChild(node);
    current = node;
    renderTabs(match.tab);
    if (app._keepScroll) { window.scrollTo(0, scrollY); app._keepScroll = false; } else window.scrollTo(0, 0);
  } catch (e) {
    console.error(e);
    app.guard = null;
    clear(view);
    view.appendChild(h('div', { class: 'card' }, h('h3', null, 'Algo deu errado'), h('p', { class: 'muted' }, String(e.message || e))));
  }
}

app.navigate = (p) => { if (location.hash === '#' + p) render(); else location.hash = p; };
app.rerender = ({ keepScroll = true } = {}) => { app._keepScroll = keepScroll; return render(); };
app.startSession = startSession;
app.resumeSession = resumeSession;

function applyTheme() {
  const t = store.state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else if (!window.claude) delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = dark ? '#0E0E0F' : '#F4F3F1';
}
app.applyTheme = applyTheme;

async function registerSW() {
  if (window.claude || !('serviceWorker' in navigator) || !/^https?:/.test(location.protocol)) return; // prévia (visualizador) não permite SW
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('Nova versão instalada. Será usada na próxima abertura.', 4200);
        }
      });
    });
  } catch (e) { console.warn('SW', e); }
}

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); app.installPrompt = e; });
window.addEventListener('appinstalled', () => { app.installPrompt = null; toast('App instalado!'); });
// ---------------------------------------------------------------- aviso ao sair com alterações não salvas
// Toda navegação do app é por hash (abas, setas de voltar, app.navigate e o botão voltar do aparelho), então um
// único ponto cobre tudo: se a tela atual tem alterações (app.guard), volta para ela com history.go() — sem
// bagunçar o histórico — e pergunta o que fazer. Cada entrada do histórico recebe um número (idx) para saber
// quantas posições andar.
let navIdx = 0, restoring = null, replacing = false, asking = false;
const idxOf = (st) => (st && Number.isInteger(st.idx) ? st.idx : null);
function stampHistory(i) { try { history.replaceState({ ...(history.state || {}), idx: i }, ''); } catch { /* sem history API */ } navIdx = i; }
stampHistory(idxOf(history.state) ?? 0);

function onHashChange() {
  if (restoring) { const r = restoring; restoring = null; r(); return; } // eco do history.go() que desfez a navegação
  if (replacing) { replacing = false; stampHistory(navIdx); render(); return; }
  const known = idxOf(history.state);
  const to = known ?? navIdx + 1; // sem idx = entrada nova (clique em link, app.navigate)
  const g = app.guard;
  if (g && g.dirty() && to !== navIdx) {
    if (asking) { restoring = () => {}; history.go(-(to - navIdx)); return; } // já há uma pergunta aberta: só volta para a tela
    askBeforeLeaving(g, to - navIdx); return;
  }
  if (known === null) stampHistory(to); else navIdx = known;
  render();
}
async function askBeforeLeaving(g, delta) {
  asking = true;
  try {
    const back = new Promise((resolve) => { restoring = resolve; setTimeout(() => { if (restoring === resolve) { restoring = null; resolve(); } }, 700); });
    history.go(-delta); // volta para a tela de edição
    await back;
    if (await g.beforeLeave()) { g.release(); history.go(delta); }
  } finally { asking = false; }
}
window.addEventListener('hashchange', onHashChange);
window.addEventListener('beforeunload', (e) => { if (app.guard && app.guard.dirty()) { e.preventDefault(); e.returnValue = ''; } });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
store.onChange((what) => {
  if (what === 'settings') applyTheme();
  if (what === 'sync') maybeRerender();
});

// Depois de uma sincronização que trouxe novidades: atualiza a tela, sem atrapalhar quem está digitando.
let dirty = false;
function maybeRerender() {
  if (phase !== 'app') return;
  const el = document.activeElement;
  const typing = el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
  if (typing || document.querySelector('#sheet-root .sheet') || app.sessionActive || (app.guard && app.guard.dirty())) { dirty = true; return; }
  dirty = false;
  app.rerender({ keepScroll: true });
}
document.addEventListener('focusout', () => { if (dirty) setTimeout(maybeRerender, 300); });

// ---------------------------------------------------------------- conta
function showView(node) {
  const view = $('#view');
  if (current) destroyTree(current);
  clear(view);
  view.appendChild(node);
  current = node;
  renderTabs(null);
  window.scrollTo(0, 0);
}

let unsubs = [];
function showAuth(opts = {}) {
  phase = 'auth';
  unsubs.forEach((u) => u()); unsubs = [];
  sync.stop();
  showView(authView({ ...opts, onDone: () => { const id = auth.cachedIdentity(); return id ? enter(id) : undefined; } }));
}

let entering = null;
function enter(ident) {
  if (phase === 'app' && store.state.userId === ident.id) return Promise.resolve();
  if (!entering) entering = doEnter(ident).finally(() => { entering = null; });
  return entering;
}

async function doEnter(ident) {
  db.setDatabase(db.dbNameFor(ident.id));
  store.setUser(ident.id);
  try {
    await store.init();
  } catch (e) {
    showView(h('div', { class: 'card', style: { marginTop: '24px' } }, h('h3', null, 'Não foi possível abrir o armazenamento'),
      h('p', { class: 'muted' }, 'Este navegador bloqueou o armazenamento local (modo privado?). Abra o app em uma janela normal. Detalhe: ' + e.message)));
    return;
  }
  phase = 'app';
  applyTheme();
  registerSW();
  unsubs.push(sync.onStatus((s) => {
    if (s.state === 'signedout' && phase === 'app') sessionExpired();
    if (s.state === 'idle' && s.pending === 0 && store.state.meta.legacyPurge) { store.setMeta({ legacyPurge: false }).then(() => legacy.purgeLegacy()).catch(() => {}); }
  }));
  const first = !store.state.meta.initialSyncDone;
  if (first) showView(splashView('Carregando sua conta…'));
  const syncing = sync.start({ client: auth.supabase, userId: ident.id, hooks: { reload: store.reload } });
  if (first) {
    await syncing;
    await store.reload();
    if (!store.state.meta.initialSyncDone) { // primeira vez neste aparelho e sem conexão: não dá para saber se a conta já tem dados
      showView(splashView('Sem conexão', h('div', { style: { display: 'grid', gap: '10px', marginTop: '18px', maxWidth: '320px', margin: '18px auto 0' } },
        h('p', { class: 'muted' }, 'Conecte-se à internet para carregar sua conta neste aparelho. Depois disso o app funciona offline.'),
        btn('Tentar de novo', { onClick: () => { phase = 'boot'; doEnterAgain(ident); } }), btn('Sair', { kind: 'ghost', onClick: () => app.signOut({ silent: true, purge: true }) }))));
      return;
    }
  }
  // quem já tem dados antigos neste aparelho e ainda não tem perfil na conta: oferece importar ANTES do onboarding
  if (!store.state.profile) { const l = await legacy.legacySummary().catch(() => null); if (l) await offerLegacy(l); }
  await render();
  store.autoSnapshotIfDue().catch(() => {});
  if (store.state.profile && (await hasDraft())) resumeSession();
  else if (store.state.profile) setTimeout(() => legacy.legacySummary().then((l) => { if (l && !offered) offerLegacy(l); }).catch(() => {}), 1200);
}
const doEnterAgain = (ident) => { entering = null; return enter({ ...ident }); };

function sessionExpired() {
  phase = 'auth';
  const email = auth.cachedIdentity()?.email || '';
  unsubs.forEach((u) => u()); unsubs = [];
  sync.stop();
  toast('Sua sessão expirou. Entre de novo para continuar sincronizando.', 4200);
  showAuth({ email });
}

app.signOut = async ({ silent = false, purge = false } = {}) => {
  const pending = sync.status.pending;
  if (!silent) {
    const ok = await confirmDialog({
      title: 'Sair da conta?',
      message: pending
        ? `Há ${pending} alteração(ões) que ainda não foram enviadas. Elas ficam guardadas neste aparelho e serão enviadas quando você entrar de novo.`
        : 'Seus dados continuam salvos na sua conta. Para voltar basta entrar de novo (é preciso internet).',
      confirmText: 'Sair', cancelText: 'Cancelar',
    });
    if (!ok) return;
  }
  const uid = store.state.userId;
  phase = 'auth'; // o SIGNED_OUT que vem a seguir não deve ser tratado como "sessão expirada"
  unsubs.forEach((u) => u()); unsubs = [];
  sync.stop();
  await auth.signOut();
  // com tudo enviado, o aparelho não precisa guardar nada (privacidade em aparelho compartilhado)
  if (purge || pending === 0) await db.deleteDatabase(db.dbNameFor(uid));
  Object.assign(store.state, { ready: false, userId: null, profile: null, exercises: new Map(), workouts: [], sessions: [], activities: [], wellbeing: new Map(), weights: [], suggestions: [], media: new Map(), meta: {} });
  showAuth();
};

// ---------------------------------------------------------------- dados da versão antiga (sem conta)
let offered = false;
function offerLegacy(l) {
  offered = true;
  return new Promise((resolve) => {
    const c = l.counts;
    const s = openSheet({
      title: 'Dados salvos neste aparelho', className: 'compact',
      body: [h('p', { class: 'muted' }, `Encontramos ${c.treinos} treino(s), ${c.sessoes} sessão(ões), ${c.atividades} atividade(s) e ${c.bemestar} registro(s) de bem-estar da versão anterior do app. Quer enviar tudo para a sua conta? Nada é apagado antes de ficar salvo na nuvem.`)],
      footer: [btn('Agora não', { kind: 'secondary', onClick: () => s.close() }), btn('Importar', { onClick: async () => { s.close(); await app.importLegacy(); } })],
      onClose: resolve,
    });
  });
}
app.importLegacy = async () => {
  if (navigator.onLine === false) return alertDialog('Sem internet', 'Conecte-se à internet para importar os dados para a sua conta.');
  toast('Importando seus dados…', 3000);
  try {
    await sync.pullAll();
    const counts = await legacy.claimLegacy({ userId: store.state.userId, queue: sync.queue, hasProfile: !!store.state.profile });
    await store.reload();
    await store.setMeta({ legacyPurge: true });
    sync.syncNow();
    toast(counts ? `Importado: ${counts.treinos} treinos, ${counts.sessoes} sessões, ${counts.atividades} atividades.` : 'Nada para importar.', 4200);
    app.applyTheme();
    app.navigate(store.state.profile ? '/' : '/boas-vindas');
  } catch (e) { console.error(e); alertDialog('Não foi possível importar', e.message || String(e)); }
};

// ---------------------------------------------------------------- abertura
async function boot() {
  auth.onAuthChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && phase !== 'app') { showAuth({ mode: 'newpass' }); return; }
    if (event === 'SIGNED_IN' && phase === 'auth' && session?.user) { enter({ id: session.user.id, email: session.user.email }); return; }
    if (event === 'SIGNED_OUT' && phase === 'app') sessionExpired();
  });
  const ident = auth.cachedIdentity();
  if (!ident) { showAuth(); return; }
  await enter(ident);
}

boot();

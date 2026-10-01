// Inicialização, roteamento e barra de navegação.
import { h, clear, $ } from './util.js';
import * as store from './store.js';
import { app } from './app.js';
import { icon, toast, alertDialog } from './ui.js';
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
  const token = ++renderToken;
  const { path, query } = parseHash();
  if (!store.state.profile && path !== '/boas-vindas') { location.replace('#/boas-vindas'); return; }
  const view = $('#view');
  const scrollY = window.scrollY;
  let match = null;
  for (const [re, tab, fn] of ROUTES) {
    const m = path.match(re);
    if (m) { match = { tab, fn, params: m.slice(1).map(decodeURIComponent) }; break; }
  }
  if (!match) match = { tab: 'inicio', fn: homeView, params: [] };
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
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = dark ? '#0E0C18' : '#6D4BD8';
}
app.applyTheme = applyTheme;

async function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https?:/.test(location.protocol)) return;
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
window.addEventListener('hashchange', render);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
store.onChange((what) => { if (what === 'settings') applyTheme(); });

async function boot() {
  try {
    await store.init();
  } catch (e) {
    $('#view').appendChild(h('div', { class: 'card' }, h('h3', null, 'Não foi possível abrir o armazenamento'),
      h('p', { class: 'muted' }, 'Este navegador bloqueou o armazenamento local (modo privado?). Abra o app em uma janela normal. Detalhe: ' + e.message)));
    return;
  }
  applyTheme();
  registerSW();
  await render();
  store.autoSnapshotIfDue().catch(() => {});
  if (store.state.profile && (await hasDraft())) resumeSession();
}

boot();

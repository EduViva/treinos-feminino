// Buscador de exercícios (compartilhado pela Biblioteca e pelo seletor "Adicionar exercício").
// Pensado para o celular: busca no topo, grupos em chips rolantes, filtros recolhidos num painel,
// resultados em lista com paginação, favoritos (★) e recentes.
import { h, clear } from '../util.js';
import * as store from '../store.js';
import { icon, empty } from '../ui.js';
import { exThumb } from '../visual.js';
import { searchExercises, facetCounts, recentExerciseIds } from '../search.js';
import { GROUPS, EQUIPMENT, KINDS, LEVEL_NAMES, LEVELS } from '../data/taxonomy.js';

const LEVEL_OPTIONS = LEVELS.map((l) => [l.id, l.name]);
const TYPE_OPTIONS = Object.entries(KINDS);

export const levelName = (id) => LEVEL_NAMES[id] || '';

// Texto secundário da linha do exercício.
export function exerciseMeta(ex, { media = false } = {}) {
  const parts = [ex.group, ex.equipment];
  if (ex.kind && ex.kind !== 'forca') parts.push(KINDS[ex.kind]);
  const base = parts.filter(Boolean).join(' · ');
  const extra = [];
  if (ex.level) extra.push(h('span', { class: 'tag lv' }, levelName(ex.level)));
  if (!ex.builtin) extra.push(h('span', { class: 'tag' }, 'meu'));
  if (media) {
    const own = store.listMedia(ex.id).length;
    if (own) extra.push(h('span', { class: 'tag' }, 'mídia própria'));
  }
  return h('div', { class: 's' }, base, extra);
}

export function starButton(ex, onToggle) {
  const b = h('button', { type: 'button', class: `icon-btn star ${ex.favorite ? 'on' : ''}`, 'aria-pressed': String(!!ex.favorite), 'aria-label': ex.favorite ? `Remover ${ex.name} dos favoritos` : `Favoritar ${ex.name}`, html: icon('star', 22) });
  b.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    await store.toggleFavorite(ex.id);
    onToggle && onToggle();
  });
  return b;
}

const load = (key) => { try { return JSON.parse(sessionStorage.getItem(`finder-${key}`) || 'null'); } catch { return null; } };
const save = (key, f) => { try { sessionStorage.setItem(`finder-${key}`, JSON.stringify({ ...f, equipment: [...f.equipment], types: [...f.types], levels: [...f.levels] })); } catch { /* sem sessionStorage */ } };

export function createFinder({ key, getList, renderRow, onCreate, grouped = true, sections = false, pageSize = 60, page = false, rememberQuery = true, placeholder = 'Buscar (ex.: supino, puxada)', persist = true }) {
  const saved = persist ? load(key) : null;
  const f = { q: rememberQuery ? (saved?.q || '') : '', group: saved?.group || 'Todos', equipment: new Set(saved?.equipment || []), types: new Set(saved?.types || []), levels: new Set(saved?.levels || []), fav: !!saved?.fav };
  let limit = pageSize, panelOpen = false, timer = null;

  const input = h('input', { type: 'text', value: f.q, placeholder, 'aria-label': 'Buscar exercício', enterkeyhint: 'search', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
  const clearBtn = h('button', { type: 'button', class: 'icon-btn clear', 'aria-label': 'Limpar busca', html: icon('x', 18), style: { display: f.q ? '' : 'none' } });
  const search = h('div', { class: 'search' }, h('span', { class: 'ico', html: icon('search', 20) }), input, clearBtn);
  const groupBar = h('div', { class: 'chips scroll', role: 'group', 'aria-label': 'Grupo muscular' });
  const bar = h('div', { class: 'finder-bar' });
  const panel = h('div', { class: 'finder-panel', hidden: true });
  const top = h('div', { class: 'finder-top' }, search, groupBar, bar, panel);
  const count = h('div', { class: 'finder-count' });
  const list = h('div', { class: 'finder-list' });
  const node = h('div', { class: `finder ${page ? 'page' : ''}` }, top, count, list);

  const facets = () => ({ q: f.q, groups: f.group === 'Todos' ? [] : [f.group], equipment: [...f.equipment], types: [...f.types], levels: [...f.levels], favoritesOnly: f.fav });
  const activeCount = () => f.equipment.size + f.types.size + f.levels.size;
  const isPlain = () => !f.q.trim() && f.group === 'Todos' && !activeCount() && !f.fav;

  function chip(label, on, onClick, extra) {
    return h('button', { type: 'button', class: `chip ${on ? 'on' : ''}`, 'aria-pressed': String(on), onClick }, label, extra || null);
  }

  function drawGroups() {
    clear(groupBar);
    const present = new Set(getList().map((e) => e.group));
    for (const g of ['Todos', ...GROUPS.filter((x) => present.has(x))]) groupBar.appendChild(chip(g, f.group === g, () => { f.group = g; limit = pageSize; draw(); }));
  }

  function drawBar() {
    clear(bar);
    bar.appendChild(h('button', { type: 'button', class: `chip ${f.fav ? 'on' : ''}`, 'aria-pressed': String(f.fav), onClick: () => { f.fav = !f.fav; limit = pageSize; draw(); }, html: `${icon('star', 16)}<span>Favoritos</span>` }));
    const n = activeCount();
    bar.appendChild(h('button', { type: 'button', class: `chip ${panelOpen || n ? 'on' : ''}`, 'aria-expanded': String(panelOpen), onClick: () => { panelOpen = !panelOpen; draw(); } },
      h('span', { html: icon('filter', 16) }), h('span', null, 'Filtros'), n ? h('span', { class: 'n' }, n) : null));
    if (!isPlain()) bar.appendChild(h('button', { type: 'button', class: 'link', style: { marginLeft: 'auto' }, onClick: reset }, 'Limpar'));
  }

  function facetRow(label, options, set, key, valueOf) {
    const counts = facetCounts(getList(), facets(), key, valueOf);
    const wrap = h('div', { class: 'chips', role: 'group', 'aria-label': label });
    for (const [v, name] of options) {
      const c = counts.get(v) || 0;
      if (!c && !set.has(v)) continue;
      wrap.appendChild(chip(name, set.has(v), () => { set.has(v) ? set.delete(v) : set.add(v); limit = pageSize; draw(); }, h('small', { style: { opacity: .6, marginLeft: '5px', fontWeight: 600 } }, c)));
    }
    return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), wrap);
  }

  function drawPanel() {
    panel.hidden = !panelOpen;
    clear(panel);
    if (!panelOpen) return;
    panel.append(
      facetRow('Equipamento', EQUIPMENT.map((n) => [n, n]), f.equipment, 'equipment', (e) => e.equipment),
      facetRow('Tipo', TYPE_OPTIONS, f.types, 'types', (e) => e.kind || 'forca'),
      facetRow('Nível', LEVEL_OPTIONS, f.levels, 'levels', (e) => e.level));
  }

  function reset() { f.q = ''; input.value = ''; clearBtn.style.display = 'none'; f.group = 'Todos'; f.equipment.clear(); f.types.clear(); f.levels.clear(); f.fav = false; limit = pageSize; draw(); }

  function rows(items) {
    const out = [];
    for (const ex of items) out.push(renderRow(ex, { redraw: drawList, star: () => starButton(ex, drawList) }));
    return out;
  }

  function drawList() {
    clear(list);
    const all = getList();
    const items = searchExercises(all, facets());
    count.textContent = '';
    count.append(h('span', null, f.fav && !items.length ? '' : `${items.length} exercício${items.length === 1 ? '' : 's'}${f.q.trim() ? ` para “${f.q.trim()}”` : ''}`));
    if (!items.length) {
      list.appendChild(empty({
        icon: 'search', title: f.fav && isPlainExceptFav() ? 'Nenhum favorito ainda' : 'Nenhum exercício encontrado',
        text: f.fav && isPlainExceptFav() ? 'Toque na estrela ★ de um exercício para guardá-lo aqui.' : 'Tente outro termo, remova filtros ou crie um exercício seu.',
        action: h('div', { style: { display: 'grid', gap: '10px', marginTop: '14px' } },
          !isPlain() ? h('button', { type: 'button', class: 'btn secondary', onClick: reset }, 'Limpar busca e filtros') : null,
          onCreate ? h('button', { type: 'button', class: 'btn ghost', onClick: () => onCreate(f.q.trim()) }, f.q.trim() ? `Criar “${f.q.trim()}”` : 'Criar novo exercício') : null),
      }));
      return;
    }
    let shown = 0;
    const take = (arr) => { const part = arr.slice(0, Math.max(0, limit - shown)); shown += part.length; return part; };
    const block = (title, arr) => { const part = take(arr); if (!part.length) return; if (title) list.appendChild(h('div', { class: 'group-h' }, title)); list.appendChild(h('div', { class: 'list' }, rows(part))); };

    if (isPlain()) {
      if (sections) {
        const favs = items.filter((e) => e.favorite);
        const recent = recentExerciseIds(store.state.sessions, store.state.workouts, 8).map((id) => store.getExercise(id)).filter((e) => e && !e.archived && !e.inactive && !e.favorite);
        if (favs.length) block('Favoritos', favs);
        if (recent.length) block('Usados recentemente', recent);
      }
      if (grouped) {
        const byGroup = new Map();
        for (const e of items) { if (!byGroup.has(e.group)) byGroup.set(e.group, []); byGroup.get(e.group).push(e); }
        for (const g of GROUPS) if (byGroup.has(g)) block(g, byGroup.get(g));
      } else block(sections ? 'Todos os exercícios' : '', items);
    } else block('', items);

    if (items.length > shown) {
      list.appendChild(h('button', { type: 'button', class: 'btn secondary block more-btn', onClick: () => { limit += pageSize; drawList(); } }, `Mostrar mais (${items.length - shown})`));
    }
    if (onCreate) list.appendChild(h('div', { style: { margin: '14px 0 6px' } }, h('button', { type: 'button', class: 'btn ghost block', onClick: () => onCreate(f.q.trim()), html: `${icon('plus', 20)}<span>${f.q.trim() ? `Criar “${f.q.trim()}”` : 'Criar novo exercício'}</span>` })));
  }
  const isPlainExceptFav = () => !f.q.trim() && f.group === 'Todos' && !activeCount();

  function draw() { drawGroups(); drawBar(); drawPanel(); drawList(); if (persist) save(key, rememberQuery ? f : { ...f, q: '' }); }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    clearBtn.style.display = input.value ? '' : 'none';
    timer = setTimeout(() => { f.q = input.value; limit = pageSize; draw(); }, 110);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
  clearBtn.addEventListener('click', () => { input.value = ''; f.q = ''; clearBtn.style.display = 'none'; limit = pageSize; draw(); input.focus(); });

  draw();
  return { node, redraw: draw, focus: () => input.focus(), filters: f, input };
}

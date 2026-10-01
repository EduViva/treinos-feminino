// Biblioteca de exercícios, tela do exercício (animação + histórico + mídia) e edição.
import { h, clear, fmtNum, fmtDur, fmtDate, fmtTime, norm, groupBy, isTimed, unitShort, unitLong } from '../util.js';
import * as store from '../store.js';
import { app } from '../app.js';
import {
  btn, icon, iconBtn, pageHead, chips, field, textInput, textArea, selectInput, stepper, openSheet, confirmDialog, menuSheet, toast, empty, segmented,
} from '../ui.js';
import { exerciseVisual, exThumb, destroyTree, artFor } from '../visual.js';
import { GROUPS, EQUIPMENT, KINDS, effortLabel } from '../data/seed.js';
import { artKeys, artLabel } from '../figure/arts.js';
import { thumbSvg } from '../figure/scene.js';
import { exerciseEntries } from '../stats.js';
import { timeChart } from '../charts.js';
import { libraryTabs, loadText, setsRepsText, restText, planFromItem, setLineText, setExtras } from './common.js';
import { suggestionCard, evaluateFor } from './suggestion.js';

// ================= Biblioteca =================
export function libraryView() {
  const root = h('div');
  root.appendChild(pageHead('Treinos', { sub: 'Planos e biblioteca de exercícios' }));
  root.appendChild(h('div', { style: { marginBottom: '14px' } }, libraryTabs('exercicios')));
  let q = '', group = 'Todos', showArchived = false;
  const search = h('div', { class: 'search' }, h('span', { class: 'ico', html: icon('search', 20) }),
    h('input', { type: 'text', placeholder: 'Buscar exercício…', 'aria-label': 'Buscar exercício', onInput: (e) => { q = e.target.value; draw(); } }));
  const present = [...new Set(store.listExercises().map((e) => e.group))];
  const chipBar = chips({ options: ['Todos', ...GROUPS.filter((g) => present.includes(g))], value: 'Todos', cls: 'scroll', onChange: (v) => { group = v; draw(); } });
  const list = h('div');
  root.append(search, chipBar, list);

  function draw() {
    clear(list);
    const items = store.listExercises({ archived: showArchived }).filter((e) => (group === 'Todos' || e.group === group) && (!q || norm(e.name).includes(norm(q)) || norm(e.equipment).includes(norm(q))));
    if (!items.length) { list.appendChild(empty({ icon: 'search', title: 'Nenhum exercício encontrado', text: 'Ajuste a busca ou crie um novo exercício.' })); return; }
    for (const [g, arr] of groupBy(items, (e) => e.group)) {
      list.appendChild(h('div', { class: 'group-h' }, g));
      list.appendChild(h('div', { class: 'list' }, arr.map((e) => h('a', { class: 'li', href: `#/exercicio/${e.id}` },
        exThumb(e), h('div', { class: 'grow' }, h('div', { class: 't' }, e.name), h('div', { class: 's' }, [e.kind && e.kind !== 'forca' ? KINDS[e.kind] : null, e.equipment, artFor(e) ? 'com animação' : (store.listMedia(e.id).length ? 'com mídia própria' : 'sem mídia')].filter(Boolean).join(' · '))),
        e.archived ? h('span', { class: 'badge warn' }, 'Arquivado') : null,
        h('span', { class: 'end', html: icon('right', 18) })))));
    }
  }
  draw();
  const archivedCount = store.listExercises({ archived: true }).filter((e) => e.archived).length;
  if (archivedCount) root.appendChild(h('button', { class: 'link', style: { marginTop: '14px' }, onClick: () => { showArchived = !showArchived; draw(); } }, `${showArchived ? 'Ocultar' : 'Mostrar'} arquivados (${archivedCount})`));
  root.appendChild(btn('Novo exercício', { ic: 'plus', cls: 'fab', onClick: () => app.navigate('/exercicio/novo') }));
  return root;
}

// ================= Tela do exercício =================
export function exerciseView([id], query) {
  const ex = store.getExercise(id);
  if (!ex) return h('div', null, pageHead('Exercício', { back: () => app.navigate('/exercicios') }), empty({ title: 'Exercício não encontrado' }));
  const item = query.w ? store.getWorkout(query.w)?.items.find((i) => i.id === query.i) : null;
  const plan = planFromItem(ex, item);
  const root = h('div');
  root.appendChild(pageHead(ex.name, {
    back: () => (history.length > 1 ? history.back() : app.navigate('/exercicios')),
    sub: [ex.group, ex.equipment].filter(Boolean).join(' · '),
    right: iconBtn('more', 'Mais ações', () => menuSheet(ex.name, [
      { icon: 'edit', label: 'Editar exercício', onClick: () => app.navigate(`/exercicio/${ex.id}/editar`) },
      { icon: 'copy', label: 'Duplicar exercício', onClick: () => duplicate(ex) },
      { icon: 'trash', label: store.exerciseHasHistory(ex.id) ? 'Arquivar (histórico é mantido)' : 'Excluir exercício', danger: true, onClick: () => removeEx(ex) },
    ])),
  }));

  // animação / mídia
  root.appendChild(exerciseVisual(ex));

  // músculos
  const art = artFor(ex);
  const mrow = h('div', { class: 'muscle-row' });
  const prim = new Set([ex.group, ...(art?.muscles?.primary ? [] : [])]);
  mrow.appendChild(h('span', { class: 'mchip' }, ex.group));
  for (const s of ex.secondary || []) if (s !== ex.group) mrow.appendChild(h('span', { class: 'mchip sec' }, s));
  root.appendChild(mrow);

  // planejado
  root.appendChild(h('div', { class: 'card', style: { marginTop: '14px' } },
    h('div', { class: 'card-title' }, item ? 'Planejado neste treino' : 'Padrão do exercício'),
    h('div', { class: 'row' }, h('span', { class: 'ico', html: icon('dumbbell', 20) }), h('span', null, h('b', null, 'Aparelho: '), ex.equipment || '—')),
    h('div', { class: 'plan-grid' },
      h('div', { class: 'cell' }, h('b', null, loadText(ex, plan.load)), h('span', null, 'Carga')),
      h('div', { class: 'cell' }, h('b', null, setsRepsText(ex, plan)), h('span', null, isTimed(ex.repUnit) ? 'Séries × tempo' : 'Séries × reps')),
      h('div', { class: 'cell' }, h('b', null, restText(plan.rest)), h('span', null, 'Descanso'))),
    ex.instructions?.length ? h('ol', { class: 'steps' }, ex.instructions.map((s) => h('li', null, s))) : null,
    ex.notes ? h('p', { class: 'muted', style: { marginTop: '10px' } }, h('b', null, 'Observações: '), ex.notes) : null));

  // progressão
  const sugHost = h('div', { style: { marginTop: '14px' } });
  const drawSug = () => { clear(sugHost); sugHost.appendChild(suggestionCard(evaluateFor(ex.id), { workoutId: query.w, onDecided: () => app.rerender() })); };
  drawSug();
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Progressão'), sugHost));

  // histórico
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Histórico'), historyBlock(ex)));

  // mídia
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Minha mídia'), mediaManager(ex)));
  return root;
}

async function duplicate(ex) {
  const copy = { ...store.clone(ex), id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name: `${ex.name} (cópia)`, builtin: false };
  const saved = await store.saveExercise(copy);
  toast('Exercício duplicado.');
  app.navigate(`/exercicio/${saved.id}/editar`);
}
async function removeEx(ex) {
  const hist = store.exerciseHasHistory(ex.id);
  const inWk = store.state.workouts.filter((w) => w.items.some((i) => i.exerciseId === ex.id));
  const ok = await confirmDialog({
    title: hist ? 'Arquivar exercício?' : 'Excluir exercício?',
    message: (hist ? 'Este exercício tem histórico. Ele será arquivado: some das listas novas, mas todo o histórico continua intacto.' : 'Esta ação não pode ser desfeita.') +
      (inWk.length ? `\n\nEle também está em: ${inWk.map((w) => w.name).join(', ')}. Os treinos mantêm o item até você editá-los.` : ''),
    confirmText: hist ? 'Arquivar' : 'Excluir', danger: true,
  });
  if (!ok) return;
  const r = await store.removeExercise(ex.id);
  toast(r === 'archived' ? 'Exercício arquivado.' : 'Exercício excluído.');
  app.navigate('/exercicios');
}

// ---- histórico: gráfico + linha do tempo ----
const METRICS = [
  ['load', 'Carga máx.'], ['reps', 'Repetições'], ['volume', 'Volume'], ['dur', 'Duração'], ['rest', 'Descanso'],
];
export function historyBlock(ex) {
  const entries = exerciseEntries(store.state.sessions, ex.id, store.state.wellbeing);
  const root = h('div');
  if (!entries.length) return h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Sem registros ainda. Depois do primeiro treino com este exercício, a linha do tempo e o gráfico aparecem aqui.'));
  const asc = [...entries].reverse();
  let metric = isTimed(ex.repUnit) ? 'reps' : 'load';
  const chartHost = h('div');
  const draw = () => {
    clear(chartHost);
    const defs = {
      load: { name: 'Carga máxima', unit: 'kg', get: (e) => e.maxLoad, fmt: (v) => `${fmtNum(v, 1)} kg` },
      reps: { name: isTimed(ex.repUnit) ? 'Tempo total' : 'Repetições totais', unit: isTimed(ex.repUnit) ? unitShort(ex.repUnit) : '', get: (e) => e.totalReps, fmt: (v) => fmtNum(v, 0) },
      volume: { name: 'Volume', unit: 'kg', get: (e) => e.volume, fmt: (v) => `${fmtNum(v, 0)} kg` },
      dur: { name: 'Duração do exercício', unit: 'min', get: (e) => (e.durationSec || 0) / 60, fmt: (v) => `${fmtNum(v, 1)} min` },
      rest: { name: 'Descanso total', unit: 'min', get: (e) => (e.restTotal || 0) / 60, fmt: (v) => `${fmtNum(v, 1)} min` },
    };
    const d = defs[metric];
    const data = asc.map((e) => ({ t: e.startedAt, v: d.get(e) })).filter((p) => p.v != null);
    chartHost.appendChild(timeChart({
      panels: [{ kind: 'line', name: d.name, color: 'var(--s1)', unit: d.unit, fmt: d.fmt, data }],
      from: data.length > 1 ? data[0].t - 86400000 : data[0].t - 3 * 86400000, to: data[data.length - 1].t + (data.length > 1 ? 86400000 : 3 * 86400000), ariaLabel: `${d.name} por sessão`,
    }));
  };
  const metricChips = chips({ options: METRICS.filter(([k]) => !(isTimed(ex.repUnit) && (k === 'load' || k === 'volume'))), value: metric, cls: 'scroll', onChange: (v) => { metric = v; draw(); } });
  root.appendChild(h('div', { class: 'card' }, metricChips, chartHost));
  draw();

  let shown = 6;
  const tl = h('div', { class: 'tl', style: { marginTop: '16px' } });
  const more = h('button', { class: 'link', onClick: () => { shown += 10; drawTl(); } }, 'Ver mais sessões');
  function drawTl() {
    clear(tl);
    for (const e of entries.slice(0, shown)) {
      tl.appendChild(h('div', { class: 'tl-item' },
        h('div', { class: 'tl-date' }, fmtDate(e.startedAt, { year: true }), h('span', { class: 'muted', style: { fontWeight: 600 } }, ` · ${e.workoutName || 'Treino'} · ${fmtTime(e.startedAt)}`)),
        h('div', { class: 'tl-sets' }, e.sets.map((s) => h('div', { class: 'setline' }, h('b', null, setLineText(ex, s)), setExtras(s) ? h('span', { class: 'eff' }, setExtras(s)) : null))),
        h('div', { class: 'tl-meta' }, [
          isTimed(e.repUnit) ? null : `Volume ${fmtNum(e.volume, 0)} kg`,
          e.durationSec ? `Duração ${fmtDur(e.durationSec)}` : null,
          e.restTotal ? `Descanso ${fmtDur(e.restTotal)}` : null,
          e.plannedLoad != null && e.sets.some((s) => (s.load || 0) !== (e.plannedLoad || 0)) ? `Planejado: ${loadText(ex, e.plannedLoad)}` : null,
        ].filter(Boolean).join(' · ')),
        e.changes?.length ? h('div', { class: 'tl-meta' }, e.changes.map((c) => `${c.scope === 'today' ? 'Só nesse dia' : 'Novo padrão'}: ${changeText(c)}`).join(' · ')) : null));
    }
    more.style.display = entries.length > shown ? '' : 'none';
  }
  drawTl();
  root.append(tl, more);
  return root;
}
export function changeText(c) {
  const bits = [];
  for (const k of ['load', 'reps', 'sets', 'rest']) {
    if (c.to && c.from && c.to[k] !== c.from[k]) bits.push(`${{ load: 'carga', reps: 'reps', sets: 'séries', rest: 'descanso' }[k]} ${fmtNum(c.from[k], 1)} → ${fmtNum(c.to[k], 1)}${k === 'load' ? ' kg' : k === 'rest' ? ' s' : ''}`);
  }
  return bits.join(', ');
}

// ---- mídia própria ----
function mediaManager(ex) {
  const root = h('div', { class: 'card' });
  const urls = [];
  const grid = h('div', { class: 'media-grid' });
  const pick = (opts = {}) => new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept: opts.accept || 'image/*,video/*', ...(opts.capture ? { capture: opts.capture } : {}), ...(opts.multiple ? { multiple: true } : {}), style: { display: 'none' } });
    inp.addEventListener('change', () => { resolve([...inp.files]); inp.remove(); });
    inp.addEventListener('cancel', () => { resolve([]); inp.remove(); });
    document.body.appendChild(inp); inp.click();
  });
  async function add(files) {
    for (const f of files) {
      if (f.type.startsWith('video/') && f.size > 60e6) {
        const ok = await confirmDialog({ title: 'Vídeo grande', message: `O vídeo tem ${(f.size / 1e6).toFixed(0)} MB e ocupa bastante espaço no aparelho. Adicionar mesmo assim?`, confirmText: 'Adicionar' });
        if (!ok) continue;
      }
      try { await store.addMedia(ex.id, f); } catch (e) { toast('Não foi possível salvar: ' + e.message); }
    }
    app.rerender();
  }
  async function draw() {
    clear(grid);
    const list = store.listMedia(ex.id);
    for (const m of list) {
      const tile = h('button', { type: 'button', class: `media-tile ${ex.mediaPrimary === m.id ? 'prim' : ''}`, 'aria-label': `Mídia ${m.name}`, onClick: () => tileMenu(m) });
      grid.appendChild(tile);
      store.getMediaBlob(m.id).then((b) => {
        if (!b) return;
        const url = URL.createObjectURL(b); urls.push(url);
        tile.appendChild(m.kind === 'video' ? h('video', { src: url, muted: true, preload: 'metadata', playsinline: true }) : h('img', { src: url, alt: '' }));
        if (m.kind === 'video') tile.appendChild(h('span', { class: 'vid' }, 'vídeo'));
      });
    }
    if (!list.length) grid.appendChild(h('p', { class: 'muted', style: { gridColumn: '1 / -1' } }, 'Adicione fotos ou vídeos do aparelho/execução. Eles ficam só neste aparelho e podem ser trocados sem afetar o histórico.'));
  }
  function tileMenu(m) {
    menuSheet('Minha mídia', [
      { icon: m.kind === 'video' ? 'video' : 'image', label: 'Ver em tela cheia', onClick: () => viewMedia(m) },
      { icon: 'check', label: ex.mediaPrimary === m.id ? 'Remover como principal' : 'Mostrar como principal', onClick: async () => { await store.saveExercise({ ...store.getExercise(ex.id), mediaPrimary: ex.mediaPrimary === m.id ? null : m.id }); app.rerender(); } },
      { icon: 'swap', label: 'Substituir arquivo', onClick: async () => { const [f] = await pick({}); if (f) { await store.addMedia(ex.id, f, { replaceId: m.id }); toast('Mídia substituída.'); app.rerender(); } } },
      { icon: 'trash', label: 'Excluir', danger: true, onClick: async () => { if (await confirmDialog({ title: 'Excluir mídia?', message: 'O histórico de treinos não é afetado.', confirmText: 'Excluir', danger: true })) { await store.deleteMedia(ex.id, m.id); app.rerender(); } } },
    ]);
  }
  async function viewMedia(m) {
    const b = await store.getMediaBlob(m.id); if (!b) return;
    const url = URL.createObjectURL(b);
    const el = m.kind === 'video' ? h('video', { src: url, controls: true, autoplay: true, loop: true, playsinline: true, style: { width: '100%', borderRadius: '14px' } }) : h('img', { src: url, alt: m.name, style: { width: '100%', borderRadius: '14px' } });
    openSheet({ title: ex.name, body: el, onClose: () => URL.revokeObjectURL(url) });
  }
  draw();
  root.append(grid, h('div', { class: 'row wrap', style: { marginTop: '12px' } },
    btn('Foto ou vídeo', { kind: 'secondary', ic: 'upload', size: 'sm', onClick: async () => add(await pick({ multiple: true })) }),
    btn('Tirar foto', { kind: 'ghost', ic: 'image', size: 'sm', onClick: async () => add(await pick({ accept: 'image/*', capture: 'environment' })) }),
    btn('Gravar vídeo', { kind: 'ghost', ic: 'video', size: 'sm', onClick: async () => add(await pick({ accept: 'video/*', capture: 'environment' })) })));
  root._destroy = () => urls.forEach((u) => URL.revokeObjectURL(u));
  return root;
}

// ================= Criar / editar =================
export function exerciseEditView([id], query) {
  const isNew = id === 'novo';
  const base = isNew ? store.blankExercise() : store.clone(store.getExercise(id));
  if (!base) return h('div', null, pageHead('Exercício', { back: () => app.navigate('/exercicios') }), empty({ title: 'Exercício não encontrado' }));
  const root = h('div');
  root.appendChild(pageHead(isNew ? 'Novo exercício' : 'Editar exercício', { back: () => (history.length > 1 ? history.back() : app.navigate('/exercicios')) }));
  const name = textInput(base.name, { placeholder: 'Ex.: Leg press 45°', 'aria-label': 'Nome' });
  const group = selectInput(GROUPS, base.group);
  const secondary = chips({ options: GROUPS.filter((g) => g !== 'Outro'), value: base.secondary, multi: true });
  const equip = selectInput(EQUIPMENT, base.equipment);
  const kindSel = selectInput(Object.entries(KINDS), base.kind || 'forca');
  let art = base.art || '';
  const artSel = selectInput([['', 'Nenhum (usar minha foto/vídeo)'], ...artKeys().map((k) => [k, artLabel(k)])], art);
  const artPrev = h('div', { class: 'thumb lg', style: { width: '100%', height: 'auto', aspectRatio: '4/3', borderRadius: '16px' } });
  const showArt = () => { art = artSel.value; artPrev.innerHTML = art ? thumbSvg(art, 0.62) : ''; artPrev.style.display = art ? '' : 'none'; };
  artSel.addEventListener('change', showArt); showArt();
  const instr = textArea((base.instructions || []).join('\n'), { placeholder: 'Uma instrução por linha', rows: 5 });
  const d = base.defaults;
  const sSets = stepper({ value: d.sets, min: 1, max: 20, decimals: 0 });
  const sReps = stepper({ value: d.reps, min: 1, max: 300, decimals: 0 });
  const sLoad = stepper({ value: d.load, min: 0, max: 999, step: 1, unit: 'kg' });
  const sRest = stepper({ value: d.rest, min: 0, max: 900, step: 15, decimals: 0, unit: 's' });
  const sStep = stepper({ value: d.loadStep ?? 2, min: 0.5, max: 20, step: 0.5, unit: 'kg' });
  const bw = h('input', { type: 'checkbox', checked: base.bodyweight });
  const unit = selectInput([['reps', 'Repetições'], ['seg', 'Tempo (segundos)'], ['min', 'Tempo (minutos)']], base.repUnit || 'reps');
  const notes = textArea(base.notes || '', { placeholder: 'Ajustes de banco, regulagem do aparelho, cuidados…' });

  root.append(
    h('div', { class: 'card' },
      field('Nome', name), field('Grupo muscular principal', group), field('Músculos secundários', secondary), field('Aparelho / equipamento', equip), field('Tipo', kindSel)),
    h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Representação visual'),
      field('Modelo de animação', artSel, 'Escolha a animação (modelo feminina) que mais se parece com o seu exercício. Você também pode adicionar fotos e vídeos próprios depois de salvar.'), artPrev),
    h('div', { class: 'card' }, h('div', { class: 'card-title' }, 'Padrões'),
      h('div', { class: 'two' }, field('Séries', sSets), field(isTimed(unit.value) ? `Tempo (${unitShort(unit.value)})` : 'Repetições', sReps)),
      h('div', { class: 'two' }, field('Carga', sLoad), field('Descanso', sRest)),
      field('Medido em', unit),
      h('label', { class: 'switch' }, h('span', null, 'Sem carga externa', h('small', null, 'Peso corporal (agachamento livre, prancha…)')), bw),
      field('Menor ajuste de carga', sStep, 'Usado nas sugestões de progressão (ex.: 2 kg em halteres, 5 kg em máquinas).')),
    h('div', { class: 'card' }, field('Instruções rápidas', instr), field('Observações', notes)),
    h('div', { class: 'row', style: { marginTop: '16px' } },
      btn('Cancelar', { kind: 'ghost', onClick: () => history.back() }),
      btn('Salvar', { onClick: save, cls: 'grow' })));

  async function save() {
    if (!name.value.trim()) { toast('Dê um nome ao exercício.'); name.focus(); return; }
    const rec = {
      ...base, name: name.value.trim(), group: group.value, secondary: secondary.get(), equipment: equip.value, kind: kindSel.value, art: artSel.value || null,
      instructions: instr.value.split('\n').map((s) => s.trim()).filter(Boolean),
      defaults: { sets: sSets.get(), reps: sReps.get(), load: sLoad.get(), rest: sRest.get(), loadStep: sStep.get() },
      repUnit: unit.value, bodyweight: bw.checked, notes: notes.value.trim(),
    };
    const saved = await store.saveExercise(rec);
    toast('Exercício salvo.');
    if (query && query.w) app.navigate(`/treino/${query.w}`); else app.navigate(`/exercicio/${saved.id}`);
  }
  return root;
}

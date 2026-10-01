// Lista de treinos, editor de treino (itens, ordem, substituição) e importação de lista de texto.
import { h, clear, fmtNum, norm, uid, groupBy, isTimed, unitShort, unitLong } from '../util.js';
import * as store from '../store.js';
import { app } from '../app.js';
import {
  btn, icon, iconBtn, pageHead, chips, field, textInput, textArea, stepper, openSheet, confirmDialog, menuSheet, toast, empty,
} from '../ui.js';
import { exThumb } from '../visual.js';
import { createFinder, exerciseMeta } from './finder.js';
import * as tx from '../data/taxonomy.js';
import { parseWorkoutText, matchExercise } from '../importer.js';
import { libraryTabs, loadText, setsRepsText, restText } from './common.js';

function estMinutes(w) {
  let sec = 0;
  for (const it of w.items) sec += it.sets * (40 + (it.rest || 60));
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

// ================= Lista =================
export function workoutsView() {
  const root = h('div');
  root.appendChild(pageHead('Treinos', {
    sub: 'Seus planos de treino', right: iconBtn('more', 'Mais opções', () => menuSheet('Treinos', [
      { icon: 'download', label: 'Importar lista de texto', onClick: importSheet },
      { icon: 'sparkle', label: 'Adicionar treinos de exemplo', onClick: async () => { await store.loadSeedWorkouts(); toast('Treinos de exemplo adicionados.'); app.rerender(); } },
    ])),
  }));
  root.appendChild(h('div', { style: { marginBottom: '14px' } }, libraryTabs('treinos')));
  const ws = store.state.workouts.filter((w) => !w.archived);
  if (!ws.length) {
    root.appendChild(empty({
      icon: 'dumbbell', title: 'Nenhum treino ainda',
      text: 'Crie seu primeiro treino, importe sua lista em texto ou comece com treinos de exemplo (todos editáveis).',
      action: h('div', { class: 'stack', style: { display: 'grid', gap: '10px', marginTop: '14px' } },
        btn('Criar treino', { ic: 'plus', onClick: () => app.navigate('/treino/novo') }),
        btn('Importar minha lista', { kind: 'secondary', ic: 'download', onClick: importSheet }),
        btn('Usar treinos de exemplo', { kind: 'ghost', onClick: async () => { await store.loadSeedWorkouts(); app.rerender(); } })),
    }));
  }
  ws.forEach((w, idx) => {
    const exs = w.items.map((i) => store.getExercise(i.exerciseId)).filter(Boolean);
    root.appendChild(h('div', { class: 'card wk-card', style: { marginBottom: '12px' } },
      h('div', { class: 'wk-top' },
        h('div', { class: 'grow' }, h('h3', null, w.name), h('p', { class: 'muted' }, [w.description, `${w.items.length} exercícios`, `~${estMinutes(w)} min`].filter(Boolean).join(' · '))),
        iconBtn('more', `Ações de ${w.name}`, () => menuSheet(w.name, [
          { icon: 'edit', label: 'Editar treino', onClick: () => app.navigate(`/treino/${w.id}`) },
          { icon: 'copy', label: 'Duplicar', onClick: async () => { await store.duplicateWorkout(w.id); toast('Treino duplicado.'); app.rerender(); } },
          idx > 0 ? { icon: 'up', label: 'Mover para cima', onClick: () => move(ws, idx, -1) } : null,
          idx < ws.length - 1 ? { icon: 'down', label: 'Mover para baixo', onClick: () => move(ws, idx, 1) } : null,
          { icon: 'trash', label: 'Excluir', danger: true, onClick: () => delWorkout(w) },
        ]))),
      h('div', { class: 'wk-thumbs' }, exs.slice(0, 6).map((e) => exThumb(e))),
      h('div', { class: 'row' },
        btn('Iniciar treino', { ic: 'play', cls: 'grow', disabled: !w.items.length, onClick: () => app.startSession(w.id) }),
        btn('Editar', { kind: 'secondary', onClick: () => app.navigate(`/treino/${w.id}`) }))));
  });
  if (ws.length) root.appendChild(btn('Novo treino', { ic: 'plus', cls: 'fab', onClick: () => app.navigate('/treino/novo') }));
  return root;
}
async function move(ws, idx, d) {
  const ids = ws.map((w) => w.id);
  [ids[idx], ids[idx + d]] = [ids[idx + d], ids[idx]];
  await store.reorderWorkouts(ids);
  app.rerender();
}
async function delWorkout(w) {
  const ok = await confirmDialog({ title: `Excluir ${w.name}?`, message: 'O plano será removido, mas todo o histórico de treinos já realizados continua intacto.', confirmText: 'Excluir', danger: true });
  if (!ok) return;
  await store.deleteWorkout(w.id); toast('Treino excluído.'); app.rerender();
}

// ================= Seletor de exercícios =================
// "Adicionar exercício": busca, filtros (grupo, equipamento, tipo, nível), favoritos e recentes.
// Resolve com os ids escolhidos, ou ['__new__'] (com .query = texto buscado) para criar um exercício novo.
export function pickExercises({ multi = true, title = 'Escolher exercício', exclude = [] } = {}) {
  return new Promise((resolve) => {
    const sel = new Set(); let done = false, finder = null;
    const footBtn = btn('Adicionar', { onClick: () => finish([...sel]) });
    const updateFoot = () => { footBtn.querySelector('span:last-child').textContent = sel.size ? `Adicionar (${sel.size})` : 'Adicionar'; footBtn.disabled = !sel.size; };
    const s = openSheet({ title, body: [], footer: multi ? [footBtn] : null, className: 'tall', onClose: () => { if (!done) resolve([]); } });
    function finish(ids) { done = true; s.close(); resolve(ids); }
    const create = (q) => { const r = ['__new__']; r.query = q; finish(r); };
    finder = createFinder({
      key: 'pick', sections: true, grouped: true, rememberQuery: false, onCreate: create,
      getList: () => store.listExercises().filter((e) => !exclude.includes(e.id)),
      renderRow: (e, { star }) => {
        const row = h('div', { class: `li ${sel.has(e.id) ? 'sel' : ''}`, role: 'button', tabindex: '0', 'aria-pressed': multi ? String(sel.has(e.id)) : null });
        const act = () => {
          if (!multi) return finish([e.id]);
          sel.has(e.id) ? sel.delete(e.id) : sel.add(e.id);
          row.classList.toggle('sel', sel.has(e.id)); row.setAttribute('aria-pressed', String(sel.has(e.id))); updateFoot();
        };
        row.addEventListener('click', act);
        row.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); act(); } });
        row.append(exThumb(e), h('div', { class: 'grow' }, h('div', { class: 't' }, e.name), exerciseMeta(e)), star(), multi ? h('span', { class: 'pick', html: icon('check', 14) }) : null);
        return row;
      },
    });
    s.body.appendChild(finder.node);
    if (multi) updateFoot();
  });
}

// ================= Editor =================
export function workoutEditorView([id]) {
  const isNew = id === 'novo';
  let w = isNew ? store.blankWorkout() : store.clone(store.getWorkout(id));
  if (!w) return h('div', null, pageHead('Treino', { back: () => app.navigate('/treinos') }), empty({ title: 'Treino não encontrado' }));
  let saved = !isNew;
  const root = h('div');
  const persist = async () => { w = await store.saveWorkout(w); saved = true; };

  root.appendChild(pageHead(isNew ? 'Novo treino' : 'Editar treino', { back: () => app.navigate('/treinos') }));
  const name = textInput(w.name, { 'aria-label': 'Nome do treino', onChange: async () => { w.name = name.value.trim() || w.name; await persist(); } });
  const desc = textInput(w.description || '', { placeholder: 'Ex.: pernas e glúteos', 'aria-label': 'Descrição', onChange: async () => { w.description = desc.value.trim(); await persist(); } });
  root.appendChild(h('div', { class: 'card' }, field('Nome', name), field('Descrição', desc)));

  const list = h('div', { style: { marginTop: '16px' } });
  root.appendChild(list);
  function draw() {
    clear(list);
    list.appendChild(h('div', { class: 'row sb', style: { margin: '0 4px 10px' } }, h('h2', { style: { fontSize: '13px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' } }, `Exercícios (${w.items.length})`)));
    if (!w.items.length) list.appendChild(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Nenhum exercício ainda. Adicione exercícios da biblioteca.')));
    w.items.forEach((it, i) => {
      const ex = store.getExercise(it.exerciseId);
      if (!ex) return;
      list.appendChild(h('div', { class: 'ex-row' },
        exThumb(ex),
        h('button', { type: 'button', class: 'meta', onClick: () => editItem(it), 'aria-label': `Editar ${ex.name}` },
          h('b', null, `${i + 1}. ${ex.name}`),
          h('span', null, `${setsRepsText(ex, it)} · ${loadText(ex, it.load)} · ${restText(it.rest)}`)),
        h('div', { class: 'mv' },
          h('button', { type: 'button', class: 'icon-btn', disabled: i === 0, 'aria-label': 'Mover para cima', html: icon('up', 18), onClick: () => moveItem(i, -1) }),
          h('button', { type: 'button', class: 'icon-btn', disabled: i === w.items.length - 1, 'aria-label': 'Mover para baixo', html: icon('down', 18), onClick: () => moveItem(i, 1) }))));
    });
    list.appendChild(h('div', { style: { marginTop: '12px', display: 'grid', gap: '10px' } },
      btn('Adicionar exercícios', { kind: 'secondary', ic: 'plus', block: true, onClick: addExercises })));
  }
  async function moveItem(i, d) { [w.items[i], w.items[i + d]] = [w.items[i + d], w.items[i]]; await persist(); draw(); }
  async function addExercises() {
    const ids = await pickExercises({ multi: true, title: 'Adicionar exercícios' });
    if (ids[0] === '__new__') { await persist(); return app.navigate(`/exercicio/novo?w=${w.id}${ids.query ? `&nome=${encodeURIComponent(ids.query)}` : ''}`); }
    for (const id2 of ids) w.items.push(store.newWorkoutItem(id2));
    if (ids.length) { await persist(); draw(); }
  }
  function editItem(it) {
    const ex = store.getExercise(it.exerciseId);
    const sSets = stepper({ value: it.sets, min: 1, max: 20, decimals: 0 });
    const sReps = stepper({ value: it.reps, min: 1, max: 300, decimals: 0 });
    const sLoad = stepper({ value: it.load || 0, min: 0, max: 999, step: ex?.defaults?.loadStep || 1, unit: 'kg' });
    const sRest = stepper({ value: it.rest, min: 0, max: 900, step: 15, decimals: 0, unit: 's' });
    const notes = textArea(it.notes || '', { placeholder: 'Observação deste exercício neste treino' });
    const s = openSheet({
      title: ex?.name || 'Exercício', className: 'tall',
      body: [
        h('div', { class: 'two' }, field('Séries', sSets), field(isTimed(ex?.repUnit) ? `Tempo (${unitShort(ex.repUnit)})` : 'Repetições', sReps)),
        h('div', { class: 'two' }, field('Carga', sLoad, ex?.bodyweight ? 'Peso corporal: deixe 0.' : null), field('Descanso', sRest)),
        field('Observações', notes),
        h('p', { class: 'muted', style: { fontSize: '13px' } }, 'Alterar aqui muda o padrão deste treino daqui para frente. O histórico já realizado não é alterado.'),
        h('div', { class: 'menu', style: { marginTop: '8px' } },
          h('button', { class: 'menu-item', type: 'button', onClick: async () => { s.close(); const [nid] = await pickExercises({ multi: false, title: 'Substituir por…' }); if (!nid) return; if (nid === '__new__') { await persist(); return app.navigate(`/exercicio/novo?w=${w.id}`); } const n = store.newWorkoutItem(nid); Object.assign(it, { exerciseId: nid, sets: n.sets, reps: n.reps, load: n.load, rest: n.rest }); await persist(); draw(); toast('Exercício substituído. Ajuste séries e carga se precisar.'); } }, h('span', { class: 'ico', html: icon('swap', 20) }), 'Substituir por outro exercício'),
          h('a', { class: 'menu-item', href: `#/exercicio/${it.exerciseId}?w=${w.id}&i=${it.id}`, onClick: () => s.close() }, h('span', { class: 'ico', html: icon('film', 20) }), 'Ver animação e histórico'),
          h('button', { class: 'menu-item danger', type: 'button', onClick: async () => { s.close(); w.items = w.items.filter((x) => x.id !== it.id); await persist(); draw(); } }, h('span', { class: 'ico', html: icon('trash', 20) }), 'Remover do treino')),
      ],
      footer: [btn('Cancelar', { kind: 'secondary', onClick: () => s.close() }), btn('Salvar', { onClick: async () => { Object.assign(it, { sets: sSets.get(), reps: sReps.get(), load: sLoad.get(), rest: sRest.get(), notes: notes.value.trim() }); s.close(); await persist(); draw(); } })],
    });
  }
  draw();

  root.appendChild(h('div', { class: 'row', style: { marginTop: '22px' } },
    btn('Iniciar treino', { ic: 'play', cls: 'grow', onClick: async () => { if (!w.items.length) return toast('Adicione exercícios primeiro.'); await persist(); app.startSession(w.id); } }),
    btn('', { kind: 'secondary', ic: 'copy', aria: 'Duplicar treino', onClick: async () => { await persist(); await store.duplicateWorkout(w.id); toast('Treino duplicado.'); app.navigate('/treinos'); } }),
    btn('', { kind: 'danger', ic: 'trash', aria: 'Excluir treino', onClick: async () => { if (!saved) return app.navigate('/treinos'); await delWorkout(w); app.navigate('/treinos'); } })));
  return root;
}

// ================= Importar lista de texto =================
export function importSheet() {
  const ta = textArea('', { rows: 9, placeholder: 'Treino A - Pernas\nLeg press 4x12 80kg 90s\nCadeira extensora 3x15 30kg\n\nTreino B\nSupino na máquina 3x10 25kg\nPuxada alta 3x12' });
  const s = openSheet({
    title: 'Importar lista de texto', className: 'tall',
    body: [h('p', { class: 'muted', style: { marginBottom: '10px' } }, 'Cole sua lista atual. O app identifica treinos (Treino A, B…), séries × repetições, carga (kg) e descanso (s ou min) e associa aos exercícios da biblioteca. Você revisa tudo antes de importar e pode editar depois.'), ta],
    footer: [btn('Cancelar', { kind: 'secondary', onClick: () => s.close() }), btn('Revisar', { onClick: () => { const parsed = parseWorkoutText(ta.value); if (!parsed.length) return toast('Não encontrei exercícios no texto.'); s.close(); previewImport(parsed); } })],
  });
}

function previewImport(parsed) {
  const lib = store.listExercises();
  const plan = parsed.map((w) => ({ ...w, items: w.items.map((it) => ({ ...it, match: matchExercise(it.name, lib) })) }));
  const total = plan.reduce((a, w) => a + w.items.length, 0), fresh = plan.reduce((a, w) => a + w.items.filter((i) => !i.match).length, 0);
  const itemRow = (it) => {
    const bits = [it.sets && it.reps ? `${it.sets}×${it.reps}` : null, it.load ? `${fmtNum(it.load, 1)} kg` : null, it.rest ? `${it.rest}s` : null].filter(Boolean).join(' · ');
    return h('div', { class: 'setline', style: { padding: '4px 0', alignItems: 'center' } },
      h('span', { class: `badge ${it.match ? 'ok' : 'warn'}` }, it.match ? '✓' : '+ novo'),
      h('span', null, h('b', null, it.match ? it.match.name : it.name), h('span', { class: 'muted' }, ` ${bits}`)));
  };
  const card = (w) => h('div', { class: 'card', style: { marginBottom: '10px' } },
    h('h3', null, w.name), w.description ? h('p', { class: 'muted' }, w.description) : null,
    h('div', { style: { marginTop: '8px' } }, w.items.map(itemRow)));
  const intro = `${plan.length} treino(s), ${total} exercícios. ${fresh ? `${fresh} não existem na biblioteca e serão criados (você poderá completar depois).` : 'Todos foram encontrados na biblioteca.'}`;
  const body = h('div', null, h('p', { class: 'muted', style: { marginBottom: '10px' } }, intro), plan.map(card));
  const s = openSheet({
    title: 'Revisar importação', className: 'tall', body,
    footer: [btn('Voltar', { kind: 'secondary', onClick: () => { s.close(); importSheet(); } }), btn('Importar', { onClick: async () => { s.close(); await doImport(plan); } })],
  });
}

async function doImport(plan) {
  for (const w of plan) {
    const wk = store.blankWorkout();
    wk.name = w.name; wk.description = w.description || ''; wk.imported = true;
    for (const it of w.items) {
      let exId = it.match?.id;
      if (!exId) {
        const e = store.blankExercise();
        e.name = it.name.replace(/\b\w/g, (c) => c.toUpperCase()); e.group = tx.groups.name('outros'); e.equipment = tx.equipment.name('outro'); e.repUnit = it.secUnit ? 'seg' : 'reps';
        e.defaults = { sets: it.sets || 3, reps: it.reps || 12, load: it.load || 0, rest: it.rest || store.state.settings.defaultRest, loadStep: 2 };
        await store.saveExercise(e); exId = e.id;
      }
      wk.items.push(store.newWorkoutItem(exId, { ...(it.sets ? { sets: it.sets } : {}), ...(it.reps ? { reps: it.reps } : {}), ...(it.load != null ? { load: it.load } : {}), ...(it.rest ? { rest: it.rest } : {}) }));
    }
    wk.order = store.state.workouts.length;
    await store.saveWorkout(wk);
  }
  toast('Treinos importados. Revise e ajuste quando quiser.');
  app.navigate('/treinos');
}

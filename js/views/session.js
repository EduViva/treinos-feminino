// MODO TREINO — interface de tela cheia, otimizada para uma mão, alto contraste e poucos toques.
import { h, clear, fmtClock, fmtDur, fmtNum, unlockAudio, beep, vibrate, keepAwake } from '../util.js';
import * as store from '../store.js';
import { app } from '../app.js';
import { Session, createDraft, PHASE } from '../session.js';
import { icon, openSheet, confirmDialog, menuSheet, toast, stepper, scale, textArea, details } from '../ui.js';
import { exerciseVisual, exThumb, destroyTree } from '../visual.js';
import { EFFORT, RIR, FEEL } from '../data/seed.js';
import { sessionTotals } from '../stats.js';
import { loadText, repUnitText, restText, lastTimeNode, fmtSet } from './common.js';
import { suggestionCard, evaluateFor, recordOutcomes } from './suggestion.js';
import { pendingSuggestions } from '../progression.js';

let S = null;          // Session ativa
let ui = null;         // estado da UI (refs dinâmicas, timers)

export async function hasDraft() {
  const d = await store.getDraft();
  return !!(d && d.cursor && d.cursor.phase !== PHASE.SUMMARY);
}
export async function discardDraft() { await store.clearDraft(); }

export async function startSession(workoutId) {
  const w = store.getWorkout(workoutId);
  if (!w || !w.items.length) { toast('Este treino não tem exercícios.'); return; }
  const existing = await store.getDraft();
  if (existing) {
    const keep = await confirmDialog({
      title: 'Há um treino em andamento', message: `“${existing.workoutName}” ainda não foi finalizado. Deseja continuar nele ou descartá-lo e começar este?`,
      confirmText: 'Continuar o anterior', cancelText: 'Descartar e começar novo',
    });
    if (keep) return resumeSession();
    await store.clearDraft();
  }
  unlockAudio();
  const d = createDraft(w);
  d.cursor.phase = PHASE.INTRO;
  mount(new Session(d));
  S._save();
}

export async function resumeSession() {
  const d = await store.getDraft();
  if (!d) return;
  unlockAudio();
  mount(new Session(d));
}

// ------------------------------------------------------------------ montagem
function mount(session) {
  S = session;
  const root = document.getElementById('session-root');
  root.classList.add('on');
  document.body.classList.add('noscroll');
  app.sessionActive = true; document.body.classList.add('in-session');
  ui = { root, live: {}, visuals: [], timer: null, over: false, expandResult: false };
  root.addEventListener('pointerdown', unlockAudio, { passive: true });
  if (store.state.settings.wakeLock) keepAwake(true);
  ui.timer = setInterval(tick, 250);
  ui.onVis = () => { if (document.visibilityState === 'visible') { tick(); if (store.state.settings.wakeLock) keepAwake(true); } };
  document.addEventListener('visibilitychange', ui.onVis);
  render();
}

function unmount() {
  if (!ui) return;
  clearInterval(ui.timer);
  document.removeEventListener('visibilitychange', ui.onVis);
  destroyVisuals();
  const root = ui.root;
  clear(root); root.classList.remove('on');
  document.body.classList.remove('noscroll');
  keepAwake(false);
  app.sessionActive = false; document.body.classList.remove('in-session');
  ui = null; S = null;
}

function destroyVisuals() { ui.visuals.forEach((v) => destroyTree(v)); ui.visuals = []; }

function exFor(sx) {
  return store.getExercise(sx.exerciseId) || { id: sx.exerciseId, name: sx.name, group: sx.group, equipment: sx.equipment, art: sx.art, secondary: sx.secondary, repUnit: sx.repUnit, bodyweight: sx.bodyweight, instructions: [], defaults: {} };
}
const settings = () => store.state.settings;

// ------------------------------------------------------------------ tick (cronômetros)
function tick() {
  if (!S || !ui) return;
  const L = ui.live, ph = S.phase;
  if (L.clock) L.clock.textContent = fmtClock(S.elapsedSec());
  if (ph === PHASE.RUNNING && L.timer && S.d.cursor.setStartedAt) L.timer.textContent = fmtClock((Date.now() - S.d.cursor.setStartedAt) / 1000);
  if (ph === PHASE.REST && S.d.cursor.rest && S.d.cursor.rest.endsAt) {
    const rem = S.restRemainingSec();
    const r = S.d.cursor.rest;
    if (L.timer) L.timer.textContent = rem > 0 ? fmtClock(Math.ceil(rem)) : `+${fmtClock(Math.ceil(-rem))}`;
    if (L.timer) L.timer.classList.toggle('over', rem <= 0);
    if (L.ring) {
      const total = Math.max(1, r.plannedSec);
      const frac = Math.max(0, Math.min(1, rem / total));
      L.ring.querySelector('.bar').style.strokeDashoffset = String(L.circ * (1 - frac));
      L.ring.classList.toggle('over', rem <= 0);
    }
    if (L.label) L.label.textContent = rem > 0 ? 'DESCANSO' : 'PRONTA PARA A PRÓXIMA';
    const over = rem <= 0;
    if (over !== ui.over) { ui.over = over; renderBottom(); }
    if (S.restDue()) alertRestEnd();
  }
  if (ph === PHASE.REST && L.restElapsed && S.d.cursor.rest && !S.d.cursor.rest.endsAt) L.restElapsed.textContent = '';
}

function alertRestEnd() {
  S.markRestAlerted();
  const el = ui.root.querySelector('.sess');
  if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  if (settings().sound) beep(3);
  if (settings().vibration) vibrate([220, 110, 220, 110, 420]);
}

// ------------------------------------------------------------------ render geral
function render() {
  if (!S || !ui) return;
  destroyVisuals();
  const { root } = ui;
  ui.live = {}; ui.over = S.phase === PHASE.REST && S.d.cursor.rest && S.d.cursor.rest.endsAt ? S.restRemainingSec() <= 0 : false;
  const ph = S.phase;
  const view = ph === PHASE.OVERVIEW ? vOverview() : ph === PHASE.INTRO ? vIntro() : ph === PHASE.READY ? vReady() : ph === PHASE.RUNNING ? vRunning() : ph === PHASE.REST ? vRest() : ph === PHASE.FINISH ? vFinish() : vSummary();
  ui.view = view;
  const frame = h('div', { class: 'sess', role: 'application', 'aria-label': 'Modo treino' },
    ph === PHASE.SUMMARY ? null : topBar(),
    ph === PHASE.SUMMARY ? null : progressBar(),
    ui.body = h('div', { class: 's-body' }, view.body),
    ui.bottom = h('div', { class: 's-bottom' }, view.bottom));
  clear(root); root.appendChild(frame);
  tick();
  const sc = ui.body; sc.scrollTop = 0;
}
function renderBottom() { if (!ui || !ui.view) return; const b = ui.view.bottomFn ? ui.view.bottomFn() : ui.view.bottom; clear(ui.bottom); b.forEach((n) => ui.bottom.appendChild(n)); }

function topBar() {
  const c = S.d.cursor, ex = S.cur;
  const total = S.d.exercises.length;
  let where = '';
  if (S.phase === PHASE.OVERVIEW) where = 'Seu treino';
  else if (S.phase === PHASE.FINISH) where = 'Fim do treino';
  else where = `Exercício ${c.ei + 1}/${total}${ex && (S.phase === PHASE.READY || S.phase === PHASE.RUNNING || S.phase === PHASE.REST) ? ` · Série ${Math.min(S.phase === PHASE.REST ? ex.sets.length : ex.sets.length + 1, ex.target.sets)}/${ex.target.sets}` : ''}`;
  const clockEl = h('div', { class: 'clock num', 'aria-label': 'Tempo total de treino' }, fmtClock(S.elapsedSec()));
  ui.live.clock = clockEl;
  return h('div', { class: 's-top' },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Lista de exercícios', html: icon('list', 24), onClick: () => { S.openOverview(); render(); } }),
    h('div', { class: 'mid' }, clockEl, h('div', { class: 'where' }, where)),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Menu do treino', html: icon('more', 24), onClick: menu }));
}
function progressBar() {
  return h('div', { class: 's-prog', 'aria-hidden': 'true' }, S.d.exercises.map((e, i) => h('i', { class: e.status === 'done' || e.status === 'skipped' ? 'done' : i === S.d.cursor.ei ? 'cur' : '' })));
}

function menu() {
  menuSheet('Treino', [
    { icon: 'list', label: 'Ver todos os exercícios', onClick: () => { S.openOverview(); render(); } },
    { icon: 'check', label: 'Finalizar treino agora', onClick: finishEarly },
    { icon: 'left', label: 'Sair daqui (continuar depois)', onClick: () => { unmount(); app.rerender(); } },
    { icon: 'trash', label: 'Descartar este treino', danger: true, onClick: discard },
  ]);
}
async function discard() {
  if (!(await confirmDialog({ title: 'Descartar treino?', message: 'Tudo o que foi registrado neste treino será perdido.', confirmText: 'Descartar', danger: true, className: 'dark' }))) return;
  await store.clearDraft(); unmount(); app.rerender();
}
async function finishEarly() {
  const pending = S.d.exercises.filter((e) => e.status === 'pending').length;
  const msg = pending ? `${pending} exercício(s) não feitos serão marcados como pulados.` : 'Os resultados registrados serão salvos no histórico.';
  if (!(await confirmDialog({ title: 'Finalizar treino agora?', message: msg, confirmText: 'Finalizar' }))) return;
  doFinish();
}

// ------------------------------------------------------------------ blocos reutilizáveis
function visual(sx, { big = false, phaseText = false } = {}) {
  const v = exerciseVisual(exFor(sx), { compact: true, controls: big, phaseText, startOn: undefined });
  v.classList.add(big ? 'sv-big' : 'sv-small');
  ui.visuals.push(v);
  return v;
}
const bigBtn = (label, cls, onClick, ic) => h('button', { type: 'button', class: `bigbtn ${cls || ''}`, onClick }, ic ? h('span', { html: icon(ic, 26) }) : null, h('span', null, label));

function setCells(sx, { editable = true } = {}) {
  const t = sx.target, p = sx.planned;
  const ex = exFor(sx);
  const cell = (val, lab, changed, onClick) => h(editable ? 'button' : 'div', { type: 'button', class: `cell ${changed ? 'edited' : ''}`, onClick, 'aria-label': `${lab}: ${val}. Toque para ajustar` }, h('b', null, val), h('span', null, lab));
  const open = () => adjustSheet();
  return h('div', { class: 's-set' },
    cell(sx.bodyweight && !t.load ? 'Corpo' : fmtNum(t.load, 1), sx.bodyweight && !t.load ? 'peso' : 'kg', t.load !== p.load, open),
    cell(repUnitText(ex, t.reps), sx.repUnit === 'seg' ? 'segundos' : 'repetições', t.reps !== p.reps, open),
    cell(restText(t.rest), 'descanso', t.rest !== p.rest, open));
}
function infoPills(sx) {
  const ex = exFor(sx);
  return h('div', { class: 's-info' },
    h('span', { class: 'pill', html: `${icon('dumbbell', 16)}<span>${ex.equipment || '—'}</span>` }),
    h('span', { class: 'pill' }, ex.group || ''),
    sx.target.sets !== sx.planned.sets ? h('span', { class: 'pill' }, `${sx.target.sets} séries hoje`) : null);
}

// ------------------------------------------------------------------ INTRO
function vIntro() {
  const sx = S.cur, ex = exFor(sx);
  const done = sx.status === 'done' || sx.status === 'skipped';
  const sugRes = !done && (!sx.suggestionHandled) ? evaluateFor(sx.exerciseId) : null;
  const showSug = sugRes && sugRes.status === 'suggest' && !sugRes.decided;
  const body = [
    h('div', null, h('div', { class: 's-title' }, sx.name),
      h('div', { class: 's-sub' }, `${sx.target.sets} séries × ${repUnitText(ex, sx.target.reps)}${sx.repUnit === 'seg' ? '' : ' repetições'}`,
        showSug ? h('span', { class: 'badge', style: { marginLeft: '8px' } }, 'sugestão de progressão') : null)),
    visual(sx, { big: true, phaseText: true }),
    setCells(sx),
    showSug ? suggestionCard(sugRes, {
      workoutId: S.d.workoutId, compact: false,
      onDecided: async (rec) => { if (rec.decision !== 'ignored') await S.adjustTarget({ load: rec.newLoad }, 'suggestion'); sx.suggestionHandled = true; S._save(); render(); },
    }) : null,
    infoPills(sx),
    sx.notes ? h('div', { class: 's-last' }, h('b', null, 'Observação: '), sx.notes) : null,
    lastTimeNode(sx.exerciseId, ex),
    ex.instructions?.length ? details('Como fazer', h('ol', { class: 'steps' }, ex.instructions.map((s2) => h('li', null, s2)))) : null,
  ];
  const bottom = done
    ? [bigBtn(sx.status === 'skipped' ? 'Fazer este exercício' : 'Série extra', 'primary', () => { S.reopen(); if (settings().autoStartSet) S.startSet(); render(); }, 'plus'),
      bigBtn('Voltar à lista', 'sec', () => { S.openOverview(); render(); })]
    : [bigBtn('Iniciar exercício', 'primary', () => { S.startExercise(); if (settings().autoStartSet) S.startSet(); render(); }, 'play'),
      h('div', { class: 'btnrow' }, bigBtn('Ajustar', 'sec', adjustSheet), bigBtn('Pular', 'sec', skipEx))];
  return { body, bottom };
}
async function skipEx() {
  if (!(await confirmDialog({ title: 'Pular este exercício?', message: 'Ele ficará marcado como pulado neste treino.', confirmText: 'Pular' }))) return;
  S.skipExercise(); render();
}

// ------------------------------------------------------------------ READY (antes de cada série)
function vReady() {
  const sx = S.cur, ex = exFor(sx);
  const n = S.nextSetIndex + 1;
  const prev = sx.sets[sx.sets.length - 1];
  const sugg = prev && Math.abs((prev.load || 0) - sx.target.load) > 0.01 ? prev : null;
  const body = [
    h('div', null, h('div', { class: 's-title' }, sx.name), h('div', { class: 's-sub' }, `Série ${n} de ${sx.target.sets}`)),
    visual(sx),
    setCells(sx),
    sugg ? h('button', { type: 'button', class: 'bigbtn sec', style: { minHeight: '46px', fontSize: '15px' }, onClick: async () => { await S.adjustTarget({ load: sugg.load }, 'today'); render(); } }, `Usar ${fmtNum(sugg.load, 1)} kg como na série anterior`) : null,
    prev ? h('div', { class: 's-last' }, h('b', null, `Série ${prev.n}: `), fmtSet(ex, prev)) : lastTimeNode(sx.exerciseId, ex),
  ];
  const bottom = [
    bigBtn('Iniciar série', 'primary', () => { S.startSet(); render(); }, 'play'),
    h('div', { class: 'btnrow' }, bigBtn('Ajustar', 'sec', adjustSheet), bigBtn(sx.sets.length ? 'Encerrar exercício' : 'Pular', 'sec', endEx)),
  ];
  return { body, bottom };
}
async function endEx() {
  const sx = S.cur;
  const msg = sx.sets.length ? `Você fez ${sx.sets.length} de ${sx.target.sets} séries. Encerrar este exercício e seguir?` : 'Ele ficará marcado como pulado.';
  if (!(await confirmDialog({ title: sx.sets.length ? 'Encerrar exercício?' : 'Pular exercício?', message: msg, confirmText: sx.sets.length ? 'Encerrar' : 'Pular' }))) return;
  S.skipExercise(); render();
}

// ------------------------------------------------------------------ RUNNING
function vRunning() {
  const sx = S.cur, ex = exFor(sx);
  const n = S.nextSetIndex + 1;
  const timer = h('div', { class: 'timer-big num', 'aria-live': 'off' }, '00:00');
  ui.live.timer = timer;
  const body = [
    h('div', null, h('div', { class: 's-title' }, sx.name), h('div', { class: 's-sub' }, `Série ${n} de ${sx.target.sets} · em andamento`)),
    visual(sx),
    h('div', { class: 'timer-wrap' }, h('div', { class: 'timer-label', style: { color: 'var(--s-go)' } }, 'SÉRIE'), timer),
    h('div', { class: 's-set' },
      h('div', { class: 'cell' }, h('b', null, sx.bodyweight && !sx.target.load ? 'Corpo' : fmtNum(sx.target.load, 1)), h('span', null, sx.bodyweight && !sx.target.load ? 'peso' : 'kg')),
      h('div', { class: 'cell' }, h('b', null, repUnitText(ex, sx.target.reps)), h('span', null, sx.repUnit === 'seg' ? 'segundos' : 'repetições')),
      h('div', { class: 'cell' }, h('b', null, `${n}/${sx.target.sets}`), h('span', null, 'série'))),
  ];
  const bottom = [
    bigBtn('Terminei', 'go', () => { S.finishSet(); ui.expandResult = false; render(); }, 'check'),
    bigBtn('Cancelar início', 'sec', () => { S.d.cursor.phase = PHASE.READY; S.d.cursor.setStartedAt = null; S._save(); render(); }),
  ];
  return { body, bottom };
}

// ------------------------------------------------------------------ REST (descanso + registrar resultado)
function vRest() {
  const c = S.d.cursor, r = c.rest;
  const sx = S.d.exercises[r.ei], ex = exFor(sx);
  const set = sx.sets[r.setIdx];
  const isFinish = r.next === 'finish';
  const body = [];

  if (!isFinish && ui.expandResult) {
    const timer = h('div', { class: 'timer-big num', style: { fontSize: '44px' }, 'aria-live': 'off' }, fmtClock(r.plannedSec));
    const label = h('div', { class: 'timer-label' }, 'DESCANSO');
    ui.live.timer = timer; ui.live.label = label;
    body.push(h('div', { class: 'timer-sticky' }, label, timer, h('div', { class: 'btnrow', style: { flex: 'none', width: '168px' } }, bigBtn('+15s', 'sec', () => { S.addRest(15); render(); }), bigBtn('Editar', 'sec', editRest))));
  } else if (!isFinish) {
    const R = 100, circ = 2 * Math.PI * R;
    const timer = h('div', { class: 'timer-big num', 'aria-live': 'off' }, fmtClock(r.plannedSec));
    const label = h('div', { class: 'timer-label' }, 'DESCANSO');
    const ring = h('div', { class: 'ring', style: { width: 'min(58vw, 230px)', height: 'min(58vw, 230px)' } });
    ring.innerHTML = `<svg viewBox="0 0 240 240"><circle class="track" cx="120" cy="120" r="${R}" fill="none" stroke-width="14"/><circle class="bar" cx="120" cy="120" r="${R}" fill="none" stroke-width="14" stroke-dasharray="${circ}" stroke-dashoffset="0"/></svg>`;
    ring.appendChild(h('div', { style: { position: 'relative', textAlign: 'center' } }, label, timer));
    ui.live.timer = timer; ui.live.ring = ring; ui.live.circ = circ; ui.live.label = label;
    body.push(h('div', { class: 'timer-wrap' }, ring));
    body.push(h('div', { class: 'btnrow' },
      bigBtn('+15s', 'sec', () => { S.addRest(15); render(); }), bigBtn('+30s', 'sec', () => { S.addRest(30); render(); }), bigBtn('Editar', 'sec', editRest)));
  } else {
    body.push(h('div', null, h('div', { class: 's-title' }, 'Última série registrada'), h('div', { class: 's-sub' }, 'Confira o resultado e finalize o treino.')));
  }
  body.push(resultCard(sx, ex, set, isFinish));

  // próxima etapa
  if (r.next === 'set') {
    body.push(h('div', { class: 's-last' }, h('b', null, 'Próxima: '), `Série ${sx.sets.length + 1} de ${sx.target.sets} · ${fmtSet(ex, { load: sx.target.load, reps: sx.target.reps })}`));
  } else if (r.next === 'exercise') {
    const i = S.nextPendingIndex(r.ei);
    const nx = i >= 0 ? S.d.exercises[i] : null;
    if (nx) body.push(h('div', { class: 's-last', style: { display: 'flex', alignItems: 'center', gap: '12px' } }, exThumb(exFor(nx)), h('div', null, h('b', null, 'Próximo exercício'), h('br'), nx.name)));
  }

  const bottomFn = () => {
    const rem = r.endsAt ? S.restRemainingSec() : 0;
    const autoStart = settings().autoStartSet;
    if (r.next === 'finish') return [bigBtn('Finalizar treino', 'go', () => doFinish(), 'check')];
    const lab = r.next === 'exercise' ? 'Próximo exercício' : 'Próxima série';
    return rem > 0
      ? [bigBtn('Pular descanso', 'rest', () => { S.proceedFromRest({ autoStart }); render(); }, 'skip')]
      : [bigBtn(lab, 'go', () => { S.proceedFromRest({ autoStart }); render(); }, 'play')];
  };
  return { body, bottom: bottomFn(), bottomFn };
}

function resultCard(sx, ex, set, expanded) {
  const open = expanded || ui.expandResult;
  const card = h('div', { class: 's-edit' });
  const summary = () => fmtSet(ex, set);
  const head = h('div', { class: 'row sb' }, h('div', null, h('h4', { style: { margin: 0 } }, `Série ${set.n} · o que você fez`), h('b', { style: { fontSize: '20px' } }, summary())),
    expanded ? null : h('button', { type: 'button', class: 'btn sm secondary', onClick: () => { ui.expandResult = !ui.expandResult; render(); } }, open ? 'Fechar' : 'Ajustar'));
  card.appendChild(head);
  if (open) {
    const sReps = stepper({ value: set.reps, min: 0, max: 300, decimals: 0, big: true, label: 'Repetições', onChange: (v) => { S.editLastSet({ reps: v }); } });
    const sLoad = stepper({ value: set.load, min: 0, max: 999, step: ex.defaults?.loadStep && ex.defaults.loadStep <= 2.5 ? ex.defaults.loadStep : 1, unit: 'kg', big: true, label: 'Carga', onChange: (v) => { S.editLastSet({ load: v }); } });
    card.appendChild(h('div', { style: { display: 'grid', gap: '10px', marginTop: '12px' } },
      h('div', null, h('div', { class: 's-sub', style: { margin: '0 0 6px' } }, sx.repUnit === 'seg' ? 'Segundos realizados' : 'Repetições realizadas'), sReps),
      h('div', null, h('div', { class: 's-sub', style: { margin: '0 0 6px' } }, 'Carga usada'), sLoad)));
    card.appendChild(h('div', { style: { marginTop: '14px' } },
      h('div', { class: 's-sub', style: { margin: '0 0 6px' } }, 'Como foi? (opcional)'),
      scale({ options: EFFORT, value: set.effort, cls: 'effort', onChange: (v) => S.editLastSet({ effort: v }) }),
      h('div', { class: 's-sub', style: { margin: '12px 0 6px' } }, 'Quantas repetições você acha que conseguiria fazer além das realizadas? (opcional)'),
      scale({ options: RIR, value: set.rir, cls: 'nums', onChange: (v) => S.editLastSet({ rir: v }) })));
  }
  return card;
}

function editRest() {
  const r = S.d.cursor.rest; if (!r) return;
  const st = stepper({ value: r.plannedSec, min: 5, max: 900, step: 15, decimals: 0, unit: 's', big: true, label: 'Descanso' });
  const s = openSheet({
    title: 'Editar descanso', className: 'compact dark', body: [h('p', { class: 'muted', style: { marginBottom: '12px' } }, 'Tempo total deste descanso (o tempo realmente descansado também é registrado).'), st],
    footer: [btn2('Cancelar', 'secondary', () => s.close()), btn2('Aplicar', 'primary', () => { S.setRest(st.get()); s.close(); render(); })],
  });
}
const btn2 = (label, kind, onClick) => h('button', { type: 'button', class: `btn ${kind} lg`, onClick }, label);

// ------------------------------------------------------------------ Ajustar (somente hoje × novo padrão)
function adjustSheet() {
  const sx = S.cur, ex = exFor(sx);
  const t = sx.target;
  const sLoad = stepper({ value: t.load, min: 0, max: 999, step: ex.defaults?.loadStep && ex.defaults.loadStep <= 2.5 ? ex.defaults.loadStep : 1, unit: 'kg', label: 'Carga' });
  const sReps = stepper({ value: t.reps, min: 1, max: 300, decimals: 0, label: 'Repetições' });
  const sSets = stepper({ value: t.sets, min: Math.max(1, sx.sets.length || 1), max: 20, decimals: 0, label: 'Séries' });
  const sRest = stepper({ value: t.rest, min: 0, max: 900, step: 15, decimals: 0, unit: 's', label: 'Descanso' });
  const apply = async (scope) => {
    const patch = { load: sLoad.get(), reps: sReps.get(), sets: sSets.get(), rest: sRest.get() };
    const changed = Object.keys(patch).some((k) => patch[k] !== t[k]);
    s.close();
    if (!changed) return;
    await S.adjustTarget(patch, scope);
    toast(scope === 'default' ? 'Novo padrão salvo no treino.' : 'Ajustado somente para hoje.');
    render();
  };
  const s = openSheet({
    title: `Ajustar — ${sx.name}`, className: 'tall dark',
    body: [
      h('div', { class: 'two', style: { marginBottom: '6px' } }, h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Carga'), sLoad), h('div', { class: 'field' }, h('span', { class: 'field-label' }, sx.repUnit === 'seg' ? 'Segundos' : 'Repetições'), sReps)),
      h('div', { class: 'two' }, h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Séries'), sSets), h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Descanso'), sRest)),
      h('p', { class: 'muted', style: { fontSize: '13px' } }, `Planejado: ${t.load === sx.planned.load ? '' : ''}${sx.planned.sets}× ${repUnitText(ex, sx.planned.reps)} · ${loadText(ex, sx.planned.load)} · ${restText(sx.planned.rest)}. O que for realizado hoje fica registrado separadamente do plano.`),
    ],
    footer: h('div', { style: { display: 'grid', gap: '10px', width: '100%' } },
      h('button', { type: 'button', class: 'btn primary lg', onClick: () => apply('today') }, 'Usar somente hoje'),
      h('button', { type: 'button', class: 'btn secondary lg', onClick: () => apply('default') }, 'Tornar novo padrão'),
      h('p', { class: 'muted', style: { fontSize: '12.5px', textAlign: 'center' } }, '“Somente hoje” não altera o treino planejado. “Novo padrão” também atualiza o plano para os próximos treinos.')),
  });
}

// ------------------------------------------------------------------ OVERVIEW
function vOverview() {
  const items = S.d.exercises.map((sx, i) => {
    const mark = sx.status === 'done' ? h('span', { class: 'tick', html: icon('check', 16) }) : sx.status === 'skipped' ? h('span', { class: 'tick skip', html: icon('skip', 14) }) : null;
    return h('button', { type: 'button', class: `it ${i === S.d.cursor.ei ? 'cur' : ''}`, onClick: () => { S.goTo(i); render(); } },
      exThumb(exFor(sx)),
      h('div', { class: 'grow' }, h('b', null, `${i + 1}. ${sx.name}`), h('small', null, `${sx.sets.length}/${sx.target.sets} séries${sx.status === 'skipped' ? ' · pulado' : sx.status === 'done' ? ' · concluído' : ''}`)),
      mark);
  });
  const body = [h('div', null, h('div', { class: 's-title' }, S.d.workoutName), h('div', { class: 's-sub' }, 'Toque em um exercício para ir até ele (útil quando o aparelho está ocupado).')), h('div', { class: 's-list' }, items)];
  const nx = S.openIndex();
  const bottom = [
    nx >= 0 ? bigBtn('Continuar', 'primary', () => { S.goTo(nx); render(); }, 'play') : null,
    bigBtn('Finalizar treino', nx >= 0 ? 'sec' : 'go', finishEarly, 'check'),
  ].filter(Boolean);
  return { body, bottom };
}

// ------------------------------------------------------------------ FINISH (todos concluídos)
function vFinish() {
  const t = sessionTotals({ ...S.d, endedAt: Date.now(), durationSec: S.elapsedSec() });
  const body = [
    h('div', null, h('div', { class: 's-title' }, 'Tudo feito!'), h('div', { class: 's-sub' }, 'Todos os exercícios foram concluídos ou pulados.')),
    h('div', { class: 's-sum' },
      sumCell(fmtDur(S.elapsedSec()), 'Duração'), sumCell(t.exercises, 'Exercícios'), sumCell(t.sets, 'Séries'), sumCell(fmtNum(t.volume, 0) + ' kg', 'Volume')),
  ];
  return { body, bottom: [bigBtn('Finalizar treino', 'go', () => doFinish(), 'check'), bigBtn('Voltar à lista', 'sec', () => { S.openOverview(); render(); })] };
}
const sumCell = (v, l) => h('div', { class: 'cell' }, h('b', null, v), h('span', null, l));

// ------------------------------------------------------------------ SUMMARY
async function doFinish() {
  const rec = S.finishWorkout();
  await store.addSession(rec);
  await recordOutcomes(rec);
  await store.clearDraft();
  ui.saved = rec;
  render();
}

function vSummary() {
  const rec = ui.saved || S.record();
  const t = rec.totals || sessionTotals(rec);
  ui.fd = ui.fd || { feel: rec.feel ?? null, note: rec.note || '' };
  const note = textArea(ui.fd.note, { placeholder: 'Observação livre (opcional)', rows: 3 });
  note.addEventListener('input', () => { ui.fd.note = note.value; });
  const feelScale = scale({ options: FEEL, value: ui.fd.feel, onChange: (v) => { ui.fd.feel = v; } });
  const done = rec.exercises.filter((e) => e.sets?.length);
  const doneExIds = done.map((e) => e.exerciseId);
  const sugs = pendingSuggestions(store.state, doneExIds);
  const body = [
    h('div', { style: { textAlign: 'center', padding: 'calc(18px + var(--safe-t)) 0 0' } },
      h('div', { class: 'tick', style: { width: '56px', height: '56px', margin: '0 auto 10px', background: 'var(--s-go)', color: '#04210F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }, html: icon('check', 30) }),
      h('div', { class: 's-title' }, 'TREINO CONCLUÍDO'), h('div', { class: 's-sub' }, rec.workoutName)),
    h('div', { class: 's-sum' },
      sumCell(fmtDur(rec.durationSec), 'Duração'), sumCell(t.exercises, 'Exercícios'), sumCell(t.sets, 'Séries'), sumCell(fmtNum(t.reps, 0), 'Repetições'),
      sumCell(`${fmtNum(t.volume, 0)} kg`, 'Volume'), sumCell(fmtDur(t.rest), 'Descanso total')),
    h('div', { class: 's-edit' }, h('h4', null, 'Como você se sentiu?'), feelScale, h('div', { style: { marginTop: '12px' } }, note)),
    sugs.length ? h('div', null, h('div', { class: 's-sub', style: { margin: '4px 0 8px' } }, 'Insights de progressão'), sugs.slice(0, 3).map((r) => h('div', { style: { marginBottom: '10px' } }, h('div', { class: 's-sub', style: { margin: '0 0 6px', color: '#fff' } }, store.getExercise(r.exerciseId)?.name || ''), suggestionCard(r, { workoutId: rec.workoutId, onDecided: () => render() })))) : null,
  ];
  const bottom = [
    bigBtn('Salvar e fechar', 'primary', async () => {
      const f = feelScale.get();
      await store.updateSession({ ...rec, feel: f ?? null, note: note.value.trim() });
      unmount(); toast('Treino salvo no histórico.'); app.navigate('/');
    }, 'check'),
    bigBtn('Ver evolução', 'sec', async () => {
      const f = feelScale.get();
      await store.updateSession({ ...rec, feel: f ?? null, note: note.value.trim() });
      unmount(); app.navigate('/evolucao');
    }),
  ];
  return { body, bottom };
}

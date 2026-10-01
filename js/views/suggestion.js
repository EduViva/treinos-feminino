// Cartão de sugestão de progressão: o que, por quê, quais dados, posso ignorar? + Aceitar/Alterar/Ignorar.
import { h, uid, fmtDate, fmtNum } from '../util.js';
import * as store from '../store.js';
import { btn, icon, openSheet, stepper, toast, details } from '../ui.js';
import { progressionFor } from '../progression.js';

export function evaluateFor(exerciseId) { return progressionFor(store.state, exerciseId); }

function checksList(res) {
  if (!res.checks?.length) return null;
  return h('ul', { class: 'checks' }, res.checks.map((c) => h('li', { class: c.ok === true ? 'ok' : c.ok === false ? 'no' : 'na' },
    h('span', { class: 'm' }, c.ok === true ? '✓' : c.ok === false ? '✗' : '•'), h('span', null, c.text))));
}
function consideredList(res) {
  if (!res.considered?.length) return null;
  return h('div', { style: { marginTop: '10px' } },
    res.considered.slice().reverse().map((c) => h('div', { class: 'setline' },
      h('b', null, fmtDate(c.startedAt)), h('span', null, c.text),
      c.effort ? h('span', { class: 'eff' }, `· esforço ${c.effort.toLowerCase()}`) : null)));
}

export function suggestionCard(res, { workoutId, onDecided, compact = false } = {}) {
  if (!res) return h('div');
  const wrap = h('div', { class: `sug ${res.status}` });

  if (res.decided) {
    const d = res.decided;
    const txt = d.decision === 'ignored' ? 'Você optou por manter a carga atual por enquanto.' : `Você ${d.decision === 'altered' ? 'ajustou' : 'aceitou'} a sugestão: ${fmtNum(d.currentLoad, 1)} → ${fmtNum(d.newLoad, 1)} kg (${fmtDate(d.decidedAt)}).`;
    wrap.appendChild(h('div', { class: 'sug-head' }, h('span', { html: icon('check', 20) }), h('b', null, 'Sugestão já decidida')));
    wrap.appendChild(h('p', { class: 'why muted' }, txt, ' Uma nova sugestão só aparece depois de mais sessões deste exercício.'));
    return wrap;
  }

  const head = h('div', { class: 'sug-head' },
    h('span', { html: icon(res.status === 'suggest' ? 'sparkle' : res.status === 'hold' ? 'info' : 'info', 22) }),
    h('div', { class: 'grow' }, h('div', { class: 'big' }, res.headline),
      res.status === 'suggest' ? h('span', { class: 'badge' }, `Confiança ${res.confidence}`) : null));
  wrap.appendChild(head);
  wrap.appendChild(h('div', { class: 'qh' }, res.status === 'suggest' ? 'Por que esta sugestão?' : 'Por que não sugerimos agora?'));
  wrap.appendChild(h('p', { class: 'why' }, res.explanation));

  if (res.status === 'suggest' && !compact) {
    wrap.appendChild(details('Quais dados foram considerados?', consideredList(res), checksList(res)));
  } else if (res.checks?.length && !compact) {
    wrap.appendChild(details('Quais dados foram considerados?', consideredList(res), checksList(res)));
  }
  if (res.status === 'suggest') {
    wrap.appendChild(h('div', { class: 'qa' }, h('b', null, 'Posso ignorar? '), 'Sim. Nada muda sozinho: a carga só muda se você aceitar ou alterar. Isto é uma ferramenta de acompanhamento, não uma prescrição.'));
    wrap.appendChild(h('div', { class: 'acts' },
      btn('Aceitar', { kind: 'primary', onClick: () => decide(res, 'accepted', res.suggestedLoad, { workoutId, onDecided }) }),
      btn('Alterar', { kind: 'secondary', onClick: () => alterSheet(res, { workoutId, onDecided }) }),
      btn('Ignorar', { kind: 'ghost', onClick: () => decide(res, 'ignored', res.currentLoad, { workoutId, onDecided }) })));
  }
  return wrap;
}

function alterSheet(res, ctx) {
  const st = stepper({ value: res.suggestedLoad, step: res.step || 1, min: 0, max: 999, unit: 'kg', big: true, label: 'Nova carga' });
  const s = openSheet({
    title: 'Alterar sugestão', className: 'compact',
    body: [h('p', { class: 'muted', style: { marginBottom: '14px' } }, `O sistema sugeriu ${fmtNum(res.suggestedLoad, 1)} kg (carga atual: ${fmtNum(res.currentLoad, 1)} kg). Escolha a carga que você quer testar:`), st],
    footer: [btn('Cancelar', { kind: 'secondary', onClick: () => s.close() }), btn('Usar esta carga', { onClick: () => { s.close(); decide(res, 'altered', st.get(), ctx); } })],
  });
}

// Registra a decisão (recomendação, decisão, nova carga, data) e, se aceita/alterada, atualiza o padrão do treino.
export async function decide(res, decision, newLoad, { workoutId, onDecided } = {}) {
  const rec = {
    id: uid(), exerciseId: res.exerciseId, createdAt: Date.now(), decidedAt: Date.now(), basis: res.basis,
    status: res.status, currentLoad: res.currentLoad, suggestedLoad: res.suggestedLoad, explanation: res.explanation,
    considered: (res.considered || []).map((c) => ({ sessionId: c.sessionId, startedAt: c.startedAt, text: c.text })),
    decision, newLoad, workoutId: workoutId || null, outcome: null,
  };
  await store.saveSuggestion(rec);
  let applied = [];
  if (decision !== 'ignored') {
    for (const w of store.state.workouts) {
      let changed = false;
      const items = w.items.map((it) => {
        if (it.exerciseId !== res.exerciseId) return it;
        const inCtx = workoutId ? w.id === workoutId : Math.abs((it.load || 0) - res.currentLoad) < 0.01;
        if (!inCtx) return it;
        changed = true; return { ...it, load: newLoad };
      });
      if (changed) { await store.saveWorkout({ ...w, items }); applied.push(w.name); }
    }
  }
  toast(decision === 'ignored' ? 'Ok, mantendo a carga atual.' : `Novo padrão: ${fmtNum(newLoad, 1)} kg${applied.length ? ` em ${applied.join(', ')}` : ''}.`);
  onDecided && onDecided(rec);
}

// Quando um treino termina: liga sugestões aceitas ao resultado real do exercício.
export async function recordOutcomes(session) {
  for (const ex of session.exercises) {
    if (!ex.sets?.length) continue;
    const pending = store.state.suggestions.filter((s) => s.exerciseId === ex.exerciseId && s.decision !== 'ignored' && !s.outcome && s.decidedAt < session.startedAt);
    for (const s of pending) {
      const loads = ex.sets.map((x) => x.load);
      const used = loads.some((l) => Math.abs(l - s.newLoad) < 0.01);
      if (!used) continue; // ainda não testou a nova carga
      await store.saveSuggestion({ ...s, outcome: { sessionId: session.id, date: session.startedAt, sets: ex.sets.map((x) => ({ reps: x.reps, load: x.load })), plannedReps: ex.planned?.reps } });
    }
  }
}

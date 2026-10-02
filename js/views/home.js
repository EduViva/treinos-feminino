// Tela inicial: próximo treino, semana, sugestões, últimas atividades.
import { h, fmtDur, fmtNum, fmtDate, relativeDay, fmtDateLong, startOfWeek, addDays, daysBetween } from '../util.js';
import * as store from '../store.js';
import { app } from '../app.js';
import { btn, icon, menuSheet, empty } from '../ui.js';
import { exThumb } from '../visual.js';
import { aggregate, weekSessions, weeklySeries, periodRange, sessionTotals, weekStreak, fmtPace } from '../stats.js';
import { pendingSuggestions } from '../progression.js';
import { catById, MUSCULACAO } from '../data/seed.js';
import { sparkline } from '../charts.js';
import { hasDraft, resumeSession, discardDraft } from './session.js';
import { activitySheet } from './activities.js';
import { sessionDetail } from './calendar.js';
import { syncPill } from './common.js';
import * as sync from '../sync/engine.js';

export function homeView() {
  const st = store.state;
  const root = h('div');
  const name = store.firstName();
  root.appendChild(h('header', { class: 'page-head' }, h('div', { class: 'ph-text' },
    h('h1', null, name ? `Olá, ${name}` : 'Olá'), h('p', { class: 'muted' }, fmtDateLong(Date.now()))), h('div', { class: 'ph-right' }, syncPill())));

  // treino em andamento (assíncrono)
  const draftHost = h('div');
  root.appendChild(draftHost);
  hasDraft().then(async (d) => {
    if (!d) return;
    const draft = await store.getDraft();
    draftHost.appendChild(h('div', { class: 'banner info', style: { marginBottom: '14px' } },
      h('span', { class: 'ico', html: icon('timer', 22) }),
      h('div', { class: 'grow' }, h('b', null, 'Treino em andamento'), h('p', { class: 'muted' }, `${draft.workoutName} · iniciado às ${new Date(draft.startedAt).toTimeString().slice(0, 5)}`),
        h('div', { class: 'row', style: { marginTop: '10px' } }, btn('Continuar', { size: 'sm', onClick: () => resumeSession() }), btn('Descartar', { size: 'sm', kind: 'ghost', onClick: async () => { await discardDraft(); app.rerender(); } })))));
  });

  // próximo treino
  const next = store.nextWorkout();
  if (next) {
    const exs = next.items.map((i) => store.getExercise(i.exerciseId)).filter(Boolean);
    const others = st.workouts.filter((w) => !w.archived && w.items.length && w.id !== next.id);
    root.appendChild(h('div', { class: 'next-card' },
      h('div', { class: 'eyebrow' }, next.weekday && next.weekday === ((new Date().getDay() + 6) % 7) + 1 ? 'TREINO DE HOJE' : 'PRÓXIMO TREINO'),
      h('h2', null, next.name),
      h('p', null, [next.description, `${next.items.length} exercícios`].filter(Boolean).join(' · ')),
      h('div', { class: 'thumbs' }, exs.slice(0, 5).map((e) => exThumb(e)), exs.length > 5 ? h('div', { class: 'more' }, `+${exs.length - 5}`) : null),
      h('button', { class: 'btn start', type: 'button', onClick: () => app.startSession(next.id), html: `${icon('play', 22)}<span>Iniciar treino</span>` }),
      others.length ? h('button', { class: 'alt', type: 'button', onClick: () => menuSheet('Escolher outro treino', others.map((w) => ({ icon: 'play', label: `${w.name}${w.description ? ' — ' + w.description : ''}`, onClick: () => app.startSession(w.id) }))) }, 'Escolher outro treino') : null));
  } else {
    root.appendChild(h('div', { class: 'card' }, empty({
      icon: 'dumbbell', title: 'Monte seu primeiro treino', text: 'Crie um treino, importe sua lista em texto ou use treinos de exemplo.',
      action: btn('Ir para Treinos', { onClick: () => app.navigate('/treinos') }),
    })));
  }

  // semana
  const wk = weekSessions(st.sessions);
  const agg = aggregate(wk);
  const actsWeek = st.activities.filter((a) => a.startedAt >= startOfWeek(new Date()).getTime() && a.startedAt < addDays(startOfWeek(new Date()), 7).getTime());
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Esta semana'),
    h('div', { class: 'grid2' },
      h('div', { class: 'stat big' }, h('b', null, `${agg.count}`), h('span', null, agg.count === 1 ? 'treino' : 'treinos')),
      h('div', { class: 'stat big' }, h('b', null, fmtDur(agg.duration)), h('span', null, 'treinadas'))),
    h('div', { class: 'grid2', style: { marginTop: '10px' } },
      h('div', { class: 'stat' }, h('b', null, `${agg.exercises}`), h('span', null, 'exercícios')),
      h('div', { class: 'stat' }, h('b', null, `${fmtNum(agg.volume, 0)} kg`), h('span', null, 'de volume'))),
    actsWeek.length ? h('p', { class: 'muted', style: { margin: '8px 4px 0', fontSize: '13.5px' } }, `Além disso: ${actsWeek.length} atividade(s) fora da musculação (${fmtDur(actsWeek.reduce((a, x) => a + (x.durationMin || 0) * 60, 0))}).`) : null));

  // sugestões de progressão (para os exercícios dos seus treinos)
  const exIds = st.workouts.filter((w) => !w.archived).flatMap((w) => w.items.map((i) => i.exerciseId));
  const sugs = pendingSuggestions(st, exIds).slice(0, 3);
  if (sugs.length) {
    root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Sugestões de progressão'),
      h('div', { class: 'list' }, sugs.map((s) => {
        const ex = store.getExercise(s.exerciseId);
        return h('a', { class: 'li', href: `#/exercicio/${s.exerciseId}` }, exThumb(ex),
          h('div', { class: 'grow' }, h('div', { class: 't' }, ex.name), h('div', { class: 's' }, `${fmtNum(s.currentLoad, 1)} → ${fmtNum(s.suggestedLoad, 1)} kg · toque para ver o porquê`)),
          h('span', { class: 'end', html: icon('right', 18) }));
      })),
      h('p', { class: 'muted', style: { fontSize: '12.5px', margin: '6px 4px 0' } }, 'Sugestões baseadas só no seu histórico. Você decide se aceita.')));
  }

  // ações rápidas
  root.appendChild(h('div', { class: 'section' },
    h('div', { class: 'grid2' },
      btn('Registrar atividade', { kind: 'secondary', ic: 'flame', onClick: () => activitySheet({ onSaved: () => app.rerender() }) }),
      btn('Bem‑estar de hoje', { kind: 'secondary', ic: 'heart', onClick: () => app.navigate('/bem-estar') }))));

  // últimas atividades
  const recent = [
    ...st.sessions.map((s) => ({ kind: 'sess', ts: s.startedAt, s })),
    ...st.activities.map((a) => ({ kind: 'act', ts: a.startedAt, a })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 5);
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Últimas atividades'),
    recent.length ? h('div', { class: 'list' }, recent.map((r) => {
      if (r.kind === 'sess') {
        const t = sessionTotals(r.s);
        return h('button', { class: 'act-item', type: 'button', onClick: () => sessionDetail(r.s) },
          h('span', { class: 'act-dot', style: { background: MUSCULACAO.color }, html: icon('dumbbell', 20) }),
          h('div', { class: 'grow' }, h('div', { class: 't', style: { fontWeight: 800 } }, r.s.workoutName), h('div', { class: 'muted', style: { fontSize: '13.5px' } }, `${relativeDay(r.ts)} · ${fmtDur(t.duration)} · ${fmtNum(t.volume, 0)} kg`)),
          h('span', { class: 'muted', html: icon('right', 18) }));
      }
      const c = catById(r.a.type);
      return h('button', { class: 'act-item', type: 'button', onClick: () => activitySheet({ activity: r.a, onSaved: () => app.rerender() }) },
        h('span', { class: 'act-dot', style: { background: c.color }, html: icon('flame', 20) }),
        h('div', { class: 'grow' }, h('div', { class: 't', style: { fontWeight: 800 } }, r.a.customName || c.label), h('div', { class: 'muted', style: { fontSize: '13.5px' } }, `${relativeDay(r.ts)} · ${r.a.durationMin} min${r.a.distanceKm ? ` · ${fmtNum(r.a.distanceKm, 1)} km` : ''}`)),
        h('span', { class: 'muted', html: icon('right', 18) }));
    })) : h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Nada registrado ainda. Seus treinos e atividades aparecem aqui.'))));

  // evolução em resumo (somente com dados reais)
  const insights = [];
  const streak = weekStreak(st.sessions, st.activities);
  if (streak >= 2) insights.push(`Você treinou em ${streak} semanas seguidas.`);
  const nowTs = Date.now(), D7 = 7 * 86400000;
  const v7 = aggregate(st.sessions.filter((s) => s.startedAt > nowTs - D7)).volume;
  const vPrev = aggregate(st.sessions.filter((s) => s.startedAt <= nowTs - D7 && s.startedAt > nowTs - 2 * D7)).volume;
  if (vPrev > 0 && v7 > 0) insights.push(`Volume dos últimos 7 dias: ${v7 >= vPrev ? '+' : ''}${Math.round(((v7 - vPrev) / vPrev) * 100)}% em relação aos 7 dias anteriores.`);
  const w8 = weeklySeries(st.sessions, periodRange('3m'), (s) => sessionTotals(s).volume).slice(-8);
  if (st.sessions.length >= 3 || insights.length) {
    root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Evolução'),
      h('div', { class: 'card' },
        w8.length >= 3 ? h('div', { class: 'row sb' }, h('div', null, h('b', null, 'Volume semanal'), h('div', { class: 'muted', style: { fontSize: '13px' } }, 'últimas 8 semanas')), sparkline(w8.map((x) => x.value), { width: 130, height: 38 })) : null,
        insights.map((t) => h('p', { style: { marginTop: '8px' } }, t)),
        h('a', { class: 'link', href: '#/evolucao', style: { display: 'inline-block', marginTop: '8px' } }, 'Ver evolução completa'))));
  }

  // Os dados já ficam na conta (nuvem). O aviso só aparece se há alterações que não conseguiram ser enviadas.
  if (sync.status.failed > 0) {
    root.appendChild(h('div', { class: 'banner', style: { marginTop: '18px' } }, h('span', { class: 'ico', html: icon('cloudoff', 22) }),
      h('div', null, h('b', null, 'Algumas alterações não foram enviadas'), h('p', { class: 'muted' }, 'Elas estão guardadas neste aparelho e o app tenta de novo sozinho. Você pode forçar o envio no Perfil.'),
        h('a', { class: 'link', href: '#/perfil' }, 'Abrir Perfil'))));
  }
  return root;
}

// Calendário mensal + detalhe do treino realizado (planejado × realizado).
import { h, clear, dateKey, parseKey, addDays, startOfDay, MESES, DIAS_SEMANA, fmtNum, fmtDur, fmtTime, fmtDateLong, fmtDate } from '../util.js';
import * as store from '../store.js';
import { app } from '../app.js';
import { btn, icon, iconBtn, openSheet, confirmDialog, toast, empty } from '../ui.js';
import { CATEGORIES, catById, MUSCULACAO, feelLabel } from '../data/seed.js';
import { sessionTotals, exerciseDone, cycleStarts, cycleDayOn, avgCycleLength, fmtPace } from '../stats.js';
import { activitySheet, intensityLabel } from './activities.js';
import { loadText, repUnitText, restText, setExtras, fmtSet } from './common.js';
import { changeText } from './exercises.js';

let viewMonth = null, selected = null;

export function calendarView() {
  const now = new Date();
  if (!viewMonth) viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (!selected) selected = dateKey(now);
  const root = h('div');
  root.appendChild(h('header', { class: 'page-head' }, h('div', { class: 'ph-text' }, h('h1', null, 'Calendário'), h('p', { class: 'muted' }, 'Seus dias de treino e atividades'))));

  const st = store.state;
  const byDay = new Map();
  const put = (k, kind, item) => { if (!byDay.has(k)) byDay.set(k, { cats: new Set(), sess: [], acts: [] }); const d = byDay.get(k); if (kind === 'sess') { d.cats.add('musculacao'); d.sess.push(item); } else { d.cats.add(item.type); d.acts.push(item); } };
  st.sessions.forEach((s) => put(dateKey(s.startedAt), 'sess', s));
  st.activities.forEach((a) => put(dateKey(a.startedAt), 'act', a));
  const periodDays = new Set([...st.wellbeing.values()].filter((w) => w.period).map((w) => w.date));

  const head = h('div', { class: 'cal-head' });
  const grid = h('div', { class: 'cal-grid' });
  const detail = h('div', { class: 'section' });
  const monthStats = h('p', { class: 'muted', style: { fontSize: '13.5px', margin: '10px 4px 0' } });
  root.append(h('div', { class: 'card' }, head, grid, legend(), monthStats), detail);

  function draw() {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    clear(head);
    head.append(iconBtn('left', 'Mês anterior', () => { viewMonth = new Date(y, m - 1, 1); draw(); }),
      h('div', { style: { textAlign: 'center' } }, h('h2', null, `${MESES[m]} ${y}`), h('button', { class: 'link', type: 'button', onClick: () => { viewMonth = new Date(now.getFullYear(), now.getMonth(), 1); selected = dateKey(now); draw(); } }, 'Hoje')),
      iconBtn('right', 'Próximo mês', () => { viewMonth = new Date(y, m + 1, 1); draw(); }));
    clear(grid);
    ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].forEach((d) => grid.appendChild(h('div', { class: 'cal-dow' }, d)));
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < lead; i++) grid.appendChild(h('div'));
    let nSess = 0, nAct = 0;
    for (let d = 1; d <= days; d++) {
      const key = dateKey(new Date(y, m, d));
      const info = byDay.get(key);
      if (info) { nSess += info.sess.length; nAct += info.acts.length; }
      const lab = [`${d} de ${MESES[m]}`, info ? [...info.cats].map((c) => catById(c).label).join(', ') : 'sem atividades', periodDays.has(key) ? 'menstruação registrada' : ''].filter(Boolean).join(', ');
      grid.appendChild(h('button', {
        type: 'button', class: `cal-day ${key === dateKey(now) ? 'today' : ''} ${key === selected ? 'sel' : ''}`, 'aria-label': lab, 'aria-pressed': String(key === selected),
        onClick: () => { selected = key; draw(); },
      }, String(d), info ? h('div', { class: 'dots' }, [...info.cats].map((c) => h('i', { class: 'dot', style: { background: catById(c).color } }))) : null, periodDays.has(key) ? h('i', { class: 'per' }) : null));
    }
    monthStats.textContent = `Neste mês: ${nSess} treino(s) de musculação e ${nAct} outra(s) atividade(s).`;
    drawDetail();
  }

  function drawDetail() {
    clear(detail);
    const info = byDay.get(selected);
    const date = parseKey(selected);
    detail.appendChild(h('h2', null, fmtDateLong(date)));
    const wb = st.wellbeing.get(selected);
    const list = h('div', { class: 'list' });
    if (info) {
      for (const s of info.sess) {
        const t = sessionTotals(s);
        list.appendChild(h('button', { class: 'act-item', type: 'button', onClick: () => sessionDetail(s) },
          h('span', { class: 'act-dot', style: { background: MUSCULACAO.color }, html: icon('dumbbell', 20) }),
          h('div', { class: 'grow' }, h('div', { style: { fontWeight: 800 } }, s.workoutName), h('div', { class: 'muted', style: { fontSize: '13.5px' } }, `${fmtTime(s.startedAt)} · ${fmtDur(t.duration)} · ${t.exercises} exercícios · ${fmtNum(t.volume, 0)} kg`)),
          h('span', { class: 'muted', html: icon('right', 18) })));
      }
      for (const a of info.acts) {
        const c = catById(a.type);
        const bits = [fmtTime(a.startedAt), `${a.durationMin} min`, a.distanceKm ? `${fmtNum(a.distanceKm, 1)} km` : null, a.paceSecKm ? fmtPace(a.paceSecKm) : null, a.speedKmh ? `${fmtNum(a.speedKmh, 1)} km/h` : null, a.intensity ? intensityLabel(a.intensity) : null, a.calories ? `${a.calories} kcal` : null].filter(Boolean);
        list.appendChild(h('button', { class: 'act-item', type: 'button', onClick: () => activitySheet({ activity: a, onSaved: () => app.rerender() }) },
          h('span', { class: 'act-dot', style: { background: c.color }, html: icon('flame', 20) }),
          h('div', { class: 'grow' }, h('div', { style: { fontWeight: 800 } }, a.customName || c.label), h('div', { class: 'muted', style: { fontSize: '13.5px' } }, bits.join(' · ')), a.note ? h('div', { class: 'muted', style: { fontSize: '13px' } }, a.note) : null),
          h('span', { class: 'muted', html: icon('right', 18) })));
      }
    }
    if (info) detail.appendChild(list); else detail.appendChild(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Nenhuma atividade neste dia.')));
    if (wb) detail.appendChild(h('div', { class: 'card', style: { marginTop: '10px' } }, h('div', { class: 'card-title' }, 'Bem-estar do dia'),
      h('p', null, [wb.period ? 'Menstruação' + (wb.flow ? ` (${wb.flow})` : '') : null, wb.mood ? `humor ${wb.mood}/5` : null, wb.energy ? `energia ${wb.energy}/5` : null, wb.tiredness ? `cansaço ${wb.tiredness}/5` : null, wb.fatigue ? `fadiga ${wb.fatigue}/5` : null].filter(Boolean).join(' · ') || 'Registro sem valores.'),
      wb.note ? h('p', { class: 'muted' }, wb.note) : null));
    detail.appendChild(h('div', { class: 'grid2', style: { marginTop: '12px' } },
      btn('Adicionar atividade', { kind: 'secondary', ic: 'plus', onClick: () => activitySheet({ date: selected, onSaved: () => app.rerender() }) }),
      btn('Bem-estar do dia', { kind: 'secondary', ic: 'heart', onClick: () => { sessionStorage.setItem('wb-date', selected); app.navigate('/bem-estar'); } })));
  }
  draw();
  return root;
}

function legend() {
  return h('div', { class: 'legend-cal' }, CATEGORIES.map((c) => h('span', null, h('i', { style: { background: c.color } }), c.label)), h('span', null, h('i', { style: { background: '#FF7A8A', borderRadius: '2px', height: '4px', width: '12px' } }), 'Menstruação'));
}

// ---------- Detalhe do treino realizado: planejado × realizado ----------
export function sessionDetail(s) {
  const t = sessionTotals(s);
  const body = h('div');
  body.appendChild(h('p', { class: 'muted' }, `${fmtDateLong(s.startedAt)} · ${fmtTime(s.startedAt)}${s.endedAt ? ' – ' + fmtTime(s.endedAt) : ''}`));
  body.appendChild(h('div', { class: 'grid3', style: { margin: '12px 0' } },
    [[fmtDur(t.duration), 'duração'], [t.sets, 'séries'], [`${fmtNum(t.volume, 0)} kg`, 'volume'], [t.exercises, 'exercícios'], [fmtNum(t.reps, 0), 'repetições'], [fmtDur(t.rest), 'descanso total']].map(([v, l]) => h('div', { class: 'stat' }, h('b', { style: { fontSize: '18px' } }, v), h('span', null, l)))));
  if (s.feel) body.appendChild(h('p', null, h('b', null, 'Como se sentiu: '), feelLabel(s.feel)));
  if (s.note) body.appendChild(h('p', { class: 'muted' }, s.note));
  for (const ex of s.exercises) {
    const unit = ex.repUnit;
    const p = ex.planned || {};
    const card = h('div', { class: 'card', style: { marginTop: '10px', padding: '12px' } },
      h('div', { class: 'row sb' }, h('b', null, ex.name), ex.status === 'skipped' ? h('span', { class: 'badge warn' }, 'pulado') : null),
      h('p', { class: 'muted', style: { fontSize: '13.5px' } }, `Planejado: ${p.sets} × ${repUnitText({ repUnit: unit }, p.reps)} · ${loadText(ex, p.load)} · descanso ${restText(p.rest ?? 0)}`));
    if (exerciseDone(ex)) {
      card.appendChild(h('div', { style: { marginTop: '6px' } }, h('div', { class: 'muted', style: { fontSize: '12px', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase' } }, 'Realizado'),
        ex.sets.map((x) => h('div', { class: 'setline' }, h('b', null, fmtSet({ repUnit: unit }, x)), setExtras(x) ? h('span', { class: 'eff' }, setExtras(x)) : null, x.restActual ? h('span', { class: 'eff' }, `· descansou ${fmtDur(x.restActual)}`) : null))));
      card.appendChild(h('p', { class: 'muted', style: { fontSize: '12.5px', marginTop: '4px' } }, `${ex.sets.length}/${ex.target?.sets ?? p.sets} séries · exercício ${fmtDur(ex.durationSec || 0)}`));
      if (ex.changes?.length) card.appendChild(h('p', { class: 'muted', style: { fontSize: '12.5px' } }, ex.changes.map((c) => `${c.scope === 'today' ? 'Só neste dia' : c.scope === 'suggestion' ? 'Sugestão aceita' : 'Novo padrão'}: ${changeText(c)}`).join(' · ')));
    }
    body.appendChild(card);
  }
  const sh = openSheet({
    title: s.workoutName, className: 'tall', body,
    footer: [btn('Excluir', { kind: 'danger', onClick: async () => { if (await confirmDialog({ title: 'Excluir este treino do histórico?', message: 'O registro será removido definitivamente (sem afetar seu plano).', confirmText: 'Excluir', danger: true })) { await store.deleteSession(s.id); sh.close(); toast('Treino removido do histórico.'); app.rerender(); } } }), btn('Fechar', { onClick: () => sh.close() })],
  });
}

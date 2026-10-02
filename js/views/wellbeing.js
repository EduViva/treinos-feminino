// Bem-estar: registro diário (ciclo, humor, energia, cansaço, fadiga, recuperação) e comparação com treinos.
// Mostra padrões observados nos PRÓPRIOS dados. Não afirma causa nem faz diagnóstico.
import { h, clear, dateKey, parseKey, addDays, fmtNum, fmtDate, fmtDateLong, sum, avg, startOfDay, DIAS_SEMANA } from '../util.js';
import * as store from '../store.js';
import { app } from '../app.js';
import { btn, icon, iconBtn, chips, iconScale, registerIcons, textArea, toast, pageHead } from '../ui.js';
import { timeChart } from '../charts.js';
import { PERIODS, periodRange, inRange, sessionTotals, cycleStarts, cycleDayOn, avgCycleLength } from '../stats.js';
import { WB_ICONS, WB_SCALES, WB_PERIOD, WB_NOTE } from '../data/wellbeing.js';

registerIcons(WB_ICONS);

let cmpMetric = 'energy', cmpPeriod = '30d';

export function wellbeingView() {
  const root = h('div');
  root.appendChild(pageHead('Bem-estar', { sub: 'Como você está e como isso se relaciona com seus treinos' }));
  let date = sessionStorage.getItem('wb-date') || dateKey();
  sessionStorage.removeItem('wb-date');
  const formHost = h('div');
  const compareHost = h('div', { class: 'section' });
  root.append(formHost, compareHost);

  // Cada pergunta é um painel com a sua cor pastel (css: .wq[data-hue]); as respostas são ícones.
  const panel = (def, ...body) => h('div', { class: 'q wq', 'data-hue': def.hue, 'data-q': def.key },
    h('div', { class: 'wq-head' },
      h('span', { class: 'wq-badge', html: icon(def.badge, 22) }),
      h('div', { class: 'wq-title' }, h('h4', { id: `wq-${def.key}` }, def.title), def.hint ? h('p', { class: 'wq-hint' }, def.hint) : null)),
    body);
  const switchRow = (ic, text, hint, input) => h('label', { class: 'switch wq-sw' },
    h('span', { class: 'wq-sw-main' }, h('span', { class: 'wq-sw-ico', html: icon(ic, 20) }), h('span', null, text, hint ? h('small', null, hint) : null)), input);

  function periodPanel(draft) {
    const flow = iconScale({ options: WB_PERIOD.flow, value: draft.flow, label: 'Fluxo', onChange: (v) => { draft.flow = v; } });
    const sub = h('div', { class: 'wq-sub', hidden: !draft.period }, h('div', { class: 'wq-subtitle' }, 'Fluxo'), flow);
    const sw2 = h('input', { type: 'checkbox', checked: !!draft.cycleStart, onChange: () => { draft.cycleStart = sw2.checked; } });
    const startRow = switchRow('wb-flag', 'Primeiro dia deste ciclo', 'Marca o início do ciclo', sw2);
    startRow.hidden = !draft.period;
    const sw = h('input', { type: 'checkbox', checked: !!draft.period, onChange: () => {
      draft.period = sw.checked;
      sub.hidden = startRow.hidden = !sw.checked;
      first.classList.toggle('split', sw.checked);
      if (!sw.checked) { draft.cycleStart = false; sw2.checked = false; }
    } });
    const first = switchRow('wb-drop', 'Menstruada neste dia', null, sw);
    first.classList.toggle('split', !!draft.period); // o divisor só existe quando há uma segunda linha embaixo
    return panel(WB_PERIOD, first, startRow, sub);
  }

  function drawForm() {
    clear(formHost);
    const st = store.state;
    const cur = st.wellbeing.get(date) || { date };
    const draft = { ...cur };
    const isToday = date === dateKey();
    const note = textArea(draft.note || '', { placeholder: 'Observações (sono, alimentação, dor, estresse…)', 'aria-labelledby': `wq-${WB_NOTE.key}` });
    note.addEventListener('input', () => { draft.note = note.value; });
    formHost.appendChild(h('div', { class: 'wq-list' },
      h('div', { class: 'card' },
        h('div', { class: 'cal-head', style: { marginBottom: 0 } },
          iconBtn('left', 'Dia anterior', () => { date = dateKey(addDays(parseKey(date), -1)); drawForm(); }),
          h('div', { style: { textAlign: 'center' } }, h('b', null, isToday ? 'Hoje' : fmtDateLong(parseKey(date))), isToday ? h('div', { class: 'muted', style: { fontSize: '13px' } }, fmtDateLong(parseKey(date))) : h('button', { class: 'link', type: 'button', onClick: () => { date = dateKey(); drawForm(); } }, 'Ir para hoje')),
          iconBtn('right', 'Próximo dia', () => { if (date < dateKey()) { date = dateKey(addDays(parseKey(date), 1)); drawForm(); } }))),
      periodPanel(draft),
      WB_SCALES.map((def) => panel(def, iconScale({ options: def.options, value: draft[def.key], labelledBy: `wq-${def.key}`, onChange: (v) => { draft[def.key] = v; } }))),
      panel(WB_NOTE, note),
      h('div', { class: 'row wq-actions' }, btn('Salvar', { cls: 'grow', onClick: async () => {
        const rec = { ...draft, date };
        const has = rec.period || rec.mood || rec.energy || rec.tiredness || rec.fatigue || rec.recovery || (rec.note || '').trim();
        if (!has) { if (store.state.wellbeing.has(date)) await store.deleteWellbeing(date); toast('Nada para salvar.'); return; }
        await store.saveWellbeing(rec); toast('Bem-estar salvo.'); drawCompare();
      } }),
        store.state.wellbeing.has(date) ? btn('', { kind: 'danger', ic: 'trash', aria: 'Apagar registro do dia', onClick: async () => { await store.deleteWellbeing(date); toast('Registro apagado.'); drawForm(); drawCompare(); } }) : null),
      h('p', { class: 'disclaimer', style: { marginTop: 0 } }, 'Registros pessoais, guardados só na sua conta. Isto não é um diagnóstico nem uma orientação médica.')));
  }

  function drawCompare() {
    clear(compareHost);
    const st = store.state;
    compareHost.appendChild(h('h2', null, 'Treinos × bem-estar'));
    const wbs = [...st.wellbeing.values()];
    if (!wbs.length) { compareHost.appendChild(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Registre como você está por alguns dias. Aqui aparecem gráficos lado a lado e padrões observados nos seus próprios dados.'))); return; }
    const mc = chips({ options: [['energy', 'Energia'], ['fatigue', 'Fadiga'], ['mood', 'Humor'], ['cycle', 'Ciclo']], value: cmpMetric, onChange: (v) => { cmpMetric = v; drawCompare(); } });
    const pc = chips({ options: PERIODS.filter((p) => ['30d', '3m', '6m', '1a', 'tudo'].includes(p.id)).map((p) => [p.id, p.label]), value: cmpPeriod, cls: 'scroll', onChange: (v) => { cmpPeriod = v; drawCompare(); } });
    const range = periodRange(cmpPeriod);
    const first = Math.min(...[...st.sessions.map((s) => s.startedAt), ...wbs.map((w) => parseKey(w.date).getTime())], Date.now());
    const eff = range.from ? range : { ...range, from: first };
    compareHost.appendChild(h('div', { class: 'card' }, mc, h('div', { style: { height: '8px' } }), pc));
    if (cmpMetric === 'cycle') { compareHost.appendChild(cycleSection(eff)); return; }

    const minutesByDay = new Map();
    st.sessions.filter((s) => inRange(s.startedAt, eff)).forEach((s) => { const k = dateKey(s.startedAt); minutesByDay.set(k, (minutesByDay.get(k) || 0) + sessionTotals(s).duration / 60); });
    const metricDef = { energy: ['Energia (1–5)', 'energy'], fatigue: ['Fadiga muscular (1–5)', 'fatigue'], mood: ['Humor (1–5)', 'mood'] }[cmpMetric];
    const bars = [...minutesByDay.entries()].map(([k, v]) => ({ t: parseKey(k).getTime() - 12 * 3600000, v: Math.round(v) }));
    const line = wbs.filter((w) => w[metricDef[1]] && inRange(parseKey(w.date).getTime(), eff)).map((w) => ({ t: parseKey(w.date).getTime() - 12 * 3600000, v: w[metricDef[1]] })).sort((a, b) => a.t - b.t);
    compareHost.appendChild(h('div', { class: 'card', style: { marginTop: '12px' } },
      timeChart({
        panels: [
          { kind: 'bar', name: 'Treino (min por dia)', color: 'var(--s1)', unit: 'min', fmt: (v) => `${fmtNum(v, 0)} min`, data: bars, slotMs: 86400000, height: 80 },
          { kind: 'line', name: metricDef[0], color: 'var(--s2)', domain: [1, 5], ticks: [1, 3, 5], fmt: (v) => `${fmtNum(v, 0)}/5`, data: line, height: 90 },
        ],
        from: eff.from, to: eff.to, ariaLabel: `Treinos e ${metricDef[0]}`,
      }),
      h('p', { class: 'disclaimer' }, 'Os dois gráficos usam o mesmo eixo de datas, cada um com a sua escala.')));
    compareHost.appendChild(patternsCard(eff, cmpMetric));
  }
  drawForm(); drawCompare();
  return root;
}

// ---- padrões observados (descritivos; sem causalidade) ----
function patternsCard(eff, metric) {
  const st = store.state;
  const key = { energy: 'energy', fatigue: 'fatigue', mood: 'mood' }[metric];
  const name = { energy: 'energia', fatigue: 'fadiga', mood: 'humor' }[metric];
  const sessByDay = new Map();
  st.sessions.forEach((s) => { const k = dateKey(s.startedAt); if (!sessByDay.has(k)) sessByDay.set(k, []); sessByDay.get(k).push(s); });
  const days = [...st.wellbeing.values()].filter((w) => w[key] && inRange(parseKey(w.date).getTime(), eff));
  const train = days.filter((d) => sessByDay.has(d.date)), rest = days.filter((d) => !sessByDay.has(d.date));
  const out = [];
  if (train.length >= 3 && rest.length >= 3) {
    out.push(`Nos dias de treino, sua ${name} média registrada foi ${fmtNum(avg(train, (d) => d[key]), 1)}/5 (${train.length} dias); nos dias sem treino, ${fmtNum(avg(rest, (d) => d[key]), 1)}/5 (${rest.length} dias).`);
  }
  const hi = days.filter((d) => d[key] >= 4 && sessByDay.has(d.date)), lo = days.filter((d) => d[key] <= 2 && sessByDay.has(d.date));
  const dur = (arr) => avg(arr.flatMap((d) => sessByDay.get(d.date)), (s) => sessionTotals(s).duration / 60);
  const vol = (arr) => avg(arr.flatMap((d) => sessByDay.get(d.date)), (s) => sessionTotals(s).volume);
  if (hi.length >= 3 && lo.length >= 3) {
    out.push(`Em dias com ${name} alta (4–5) o treino durou em média ${fmtNum(dur(hi), 0)} min e teve ${fmtNum(vol(hi), 0)} kg de volume (${hi.length} treinos); com ${name} baixa (1–2): ${fmtNum(dur(lo), 0)} min e ${fmtNum(vol(lo), 0)} kg (${lo.length} treinos).`);
  }
  const card = h('div', { class: 'card', style: { marginTop: '12px' } }, h('div', { class: 'card-title' }, 'Padrões nos seus dados'));
  if (!out.length) card.appendChild(h('p', { class: 'muted' }, 'Dados insuficientes para observar padrões com confiança (preciso de pelo menos 3 dias de treino e 3 sem treino com registro, ou 3 treinos em dias de cada nível).'));
  else out.forEach((t) => card.appendChild(h('div', { class: 'pat' }, t)));
  card.appendChild(h('p', { class: 'disclaimer' }, 'São apenas comparações descritivas dos seus próprios registros. Não indicam causa e não são diagnóstico.'));
  return card;
}

// ---- ciclo × treinos ----
function cycleSection(eff) {
  const st = store.state;
  const starts = cycleStarts(st.wellbeing);
  const wrap = h('div');
  const card = h('div', { class: 'card', style: { marginTop: '12px' } });
  if (!starts.length) {
    card.appendChild(h('p', { class: 'muted' }, 'Marque “Primeiro dia deste ciclo” no registro da menstruação para comparar seus treinos com os dias do ciclo.'));
    wrap.appendChild(card); return wrap;
  }
  const len = avgCycleLength(starts);
  card.appendChild(h('p', null, h('b', null, `${starts.length} início(s) de ciclo registrados. `), len ? `Duração média entre inícios: ${fmtNum(len, 0)} dias.` : 'Com 2 ou mais inícios, mostro a duração média.'));
  const buckets = [['Dias 1–5', 1, 5], ['Dias 6–12', 6, 12], ['Dias 13–16', 13, 16], ['Dias 17 em diante', 17, 60]];
  const rows = buckets.map(([label, a, b]) => ({ label, sess: [], energy: [], fatigue: [], mood: [], days: 0 }));
  const sessionsInRange = st.sessions.filter((s) => inRange(s.startedAt, eff));
  for (const s of sessionsInRange) { const cd = cycleDayOn(dateKey(s.startedAt), starts); if (!cd) continue; const i = buckets.findIndex(([, a, b]) => cd >= a && cd <= b); if (i >= 0) rows[i].sess.push(s); }
  for (const w of st.wellbeing.values()) { if (!inRange(parseKey(w.date).getTime(), eff)) continue; const cd = cycleDayOn(w.date, starts); if (!cd) continue; const i = buckets.findIndex(([, a, b]) => cd >= a && cd <= b); if (i < 0) continue; rows[i].days++; ['energy', 'fatigue', 'mood'].forEach((k) => { if (w[k]) rows[i][k].push(w[k]); }); }
  const f = (arr) => (arr.length ? fmtNum(avg(arr), 1) : '—');
  card.appendChild(h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'cyc-table' },
    h('thead', null, h('tr', null, ['Fase do ciclo*', 'Treinos', 'Duração média', 'Volume médio', 'Energia', 'Fadiga', 'Humor'].map((t) => h('th', null, t)))),
    h('tbody', null, rows.map((r) => h('tr', null, h('td', null, r.label), h('td', null, String(r.sess.length)), h('td', null, r.sess.length ? `${fmtNum(avg(r.sess, (s) => sessionTotals(s).duration / 60), 0)} min` : '—'), h('td', null, r.sess.length ? `${fmtNum(avg(r.sess, (s) => sessionTotals(s).volume), 0)} kg` : '—'), h('td', null, f(r.energy)), h('td', null, f(r.fatigue)), h('td', null, f(r.mood))))))));
  card.appendChild(h('p', { class: 'disclaimer' }, '*Faixas de dias contados a partir do primeiro dia registrado de cada ciclo; são só agrupamentos para comparar. Médias com poucos dias variam muito. Isto não indica causa nem é diagnóstico.'));
  wrap.appendChild(card);
  return wrap;
}

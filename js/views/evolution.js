// Evolução: cargas, repetições, volume, frequência, duração, descanso, peso, músculos, atividades, progressões.
import { h, clear, fmtNum, fmtDur, fmtDate, dateKey, parseKey, parseNum, startOfDay, sum, avg, DIAS_SEMANA, isTimed, unitShort, unitLong } from '../util.js';
import * as store from '../store.js';
import { app } from '../app.js';
import { btn, icon, chips, field, numInput, readNum, openSheet, toast, empty, selectInput, pageHead } from '../ui.js';
import { timeChart, hBars } from '../charts.js';
import { PERIODS, periodRange, inRange, aggregate, sessionTotals, weeklySeries, exerciseEntries, muscleLoad, exerciseDone } from '../stats.js';
import { ACTIVITY_TYPES, catById } from '../data/seed.js';
import { activitySheet } from './activities.js';

let period = '3m';

export function evolutionView() {
  const root = h('div');
  root.appendChild(pageHead('Evolução', { sub: 'O que os seus registros mostram' }));
  const bar = chips({ options: PERIODS.map((p) => [p.id, p.label]), value: period, cls: 'scroll', onChange: (v) => { period = v; draw(); } });
  const host = h('div');
  root.append(bar, host);
  const st = store.state;

  function draw() {
    clear(host);
    const range = periodRange(period);
    const sess = st.sessions.filter((s) => inRange(s.startedAt, range));
    const acts = st.activities.filter((a) => inRange(a.startedAt, range));
    const eff = range.from ? range : { ...range, from: Math.min(...[...st.sessions, ...st.activities].map((x) => x.startedAt), Date.now()) };
    const a = aggregate(sess);

    if (!st.sessions.length && !st.activities.length && !st.weights.length) {
      host.appendChild(empty({ icon: 'chart', title: 'Ainda não há o que mostrar', text: 'Depois do primeiro treino ou atividade registrada, os gráficos de evolução aparecem aqui — sempre com os seus dados reais.' }));
      host.appendChild(weightSection(eff)); return;
    }

    // resumo
    const weeks = Math.max(1, (range.to - eff.from) / (7 * 86400000));
    host.appendChild(h('div', { class: 'section' }, h('h2', null, 'Resumo do período'),
      h('div', { class: 'grid2' },
        stat(a.count, 'treinos'), stat(fmtNum(a.count / weeks, 1), 'treinos por semana'),
        stat(fmtDur(a.duration), 'tempo treinado'), stat(a.count ? fmtDur(a.duration / a.count) : '—', 'duração média'),
        stat(`${fmtNum(a.volume, 0)} kg`, 'volume total'), stat(fmtDur(a.rest), 'descanso total')),
      acts.length ? h('p', { class: 'muted', style: { margin: '8px 4px 0', fontSize: '13.5px' } }, `Fora da musculação: ${acts.length} atividade(s) · ${fmtDur(sum(acts, (x) => x.durationMin) * 60)}.`) : null));

    // frequência e volume
    const wkCount = weeklySeries(sess, eff, () => 1).map((w) => ({ t: w.start.getTime(), v: w.value }));
    const wkVol = weeklySeries(sess, eff, (s) => sessionTotals(s).volume).map((w) => ({ t: w.start.getTime(), v: w.value }));
    host.appendChild(h('div', { class: 'section' }, h('h2', null, 'Frequência'),
      h('div', { class: 'card' }, timeChart({ panels: [{ kind: 'bar', name: 'Treinos por semana', color: 'var(--s1)', slotMs: 7 * 86400000, data: wkCount, unit: 'treinos', integer: true, fmt: (v) => `${fmtNum(v, 0)} treinos`, tickFmt: (v) => fmtNum(v, 0) }], from: eff.from, to: eff.to, ariaLabel: 'Treinos por semana' }))));
    host.appendChild(h('div', { class: 'section' }, h('h2', null, 'Volume (kg × repetições)'),
      h('div', { class: 'card' }, timeChart({ panels: [{ kind: 'bar', name: 'Volume por semana', color: 'var(--s1)', slotMs: 7 * 86400000, data: wkVol, unit: 'kg', fmt: (v) => `${fmtNum(v, 0)} kg` }], from: eff.from, to: eff.to, ariaLabel: 'Volume semanal' }))));

    // duração e descanso por treino
    const sAsc = sess.slice().sort((x, y) => x.startedAt - y.startedAt);
    if (sAsc.length) {
      host.appendChild(h('div', { class: 'section' }, h('h2', null, 'Duração e descanso por treino'),
        h('div', { class: 'card' }, timeChart({
          panels: [
            { kind: 'line', name: 'Duração do treino', color: 'var(--s1)', unit: 'min', fmt: (v) => `${fmtNum(v, 0)} min`, data: sAsc.map((s) => ({ t: s.startedAt, v: sessionTotals(s).duration / 60 })), height: 90 },
            { kind: 'line', name: 'Tempo total de descanso', color: 'var(--s2)', unit: 'min', fmt: (v) => `${fmtNum(v, 0)} min`, data: sAsc.map((s) => ({ t: s.startedAt, v: sessionTotals(s).rest / 60 })), height: 90 },
          ], from: sAsc[0].startedAt - 86400000, to: Math.max(range.to, sAsc[sAsc.length - 1].startedAt) + 86400000, ariaLabel: 'Duração e descanso',
        }))));
    }

    host.appendChild(exerciseSection(eff, range));

    // grupos musculares
    const ml = muscleLoad(sess, st.exercises, range).slice(0, 10);
    host.appendChild(h('div', { class: 'section' }, h('h2', null, 'Grupos musculares (séries)'),
      h('div', { class: 'card' }, hBars({ items: ml.map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 })), unit: 'séries', digits: 0 }),
        h('p', { class: 'muted', style: { fontSize: '12.5px', marginTop: '6px' } }, 'Cada série conta 1 para o grupo principal e 0,5 para os secundários.'))));

    host.appendChild(weightSection(eff));
    host.appendChild(activitiesSection(acts, eff));
    host.appendChild(suggestionsSection());
  }
  draw();
  return root;
}

const stat = (v, l) => h('div', { class: 'stat' }, h('b', null, v), h('span', null, l));

// ----- exercício específico -----
let exSel = null, exMetric = 'load';
function exerciseSection(eff, range) {
  const st = store.state;
  const done = [...new Set(st.sessions.flatMap((s) => s.exercises.filter(exerciseDone).map((e) => e.exerciseId)))];
  const box = h('div', { class: 'section' }, h('h2', null, 'Por exercício'));
  if (!done.length) { box.appendChild(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Registre treinos para ver a evolução de cada exercício.'))); return box; }
  const names = done.map((id) => [id, (st.exercises.get(id) || {}).name || id]).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  if (!exSel || !done.includes(exSel)) {
    const cnt = (id) => st.sessions.filter((s) => s.exercises.some((e) => e.exerciseId === id && exerciseDone(e))).length;
    exSel = [...done].sort((a, b) => cnt(b) - cnt(a) || (st.exercises.get(a)?.name || '').localeCompare(st.exercises.get(b)?.name || '', 'pt-BR'))[0];
  }
  const sel = selectInput(names, exSel, { 'aria-label': 'Exercício' });
  const host = h('div');
  const metrics = [['load', 'Carga máx.'], ['reps', 'Repetições'], ['volume', 'Volume']];
  const mc = chips({ options: metrics, value: exMetric, cls: 'scroll', onChange: (v) => { exMetric = v; drawEx(); } });
  sel.addEventListener('change', () => { exSel = sel.value; drawEx(); });
  box.appendChild(h('div', { class: 'card' }, sel, h('div', { style: { height: '10px' } }), mc, host,
    h('a', { class: 'link', href: `#/exercicio/${exSel}`, id: 'ex-link', style: { display: 'inline-block', marginTop: '6px' } }, 'Abrir histórico completo')));
  function drawEx() {
    clear(host);
    box.querySelector('#ex-link').setAttribute('href', `#/exercicio/${exSel}`);
    const ex = st.exercises.get(exSel);
    if (exMetric === 'load' && ex && (ex.bodyweight || isTimed(ex.repUnit))) exMetric = 'reps';
    const entries = exerciseEntries(st.sessions, exSel, st.wellbeing).filter((e) => inRange(e.startedAt, range)).reverse();
    if (!entries.length) { host.appendChild(h('p', { class: 'muted', style: { padding: '12px 0' } }, 'Sem registros deste exercício no período.')); return; }
    const defs = {
      load: { name: 'Carga máxima', unit: 'kg', get: (e) => e.maxLoad, fmt: (v) => `${fmtNum(v, 1)} kg` },
      reps: { name: 'Repetições totais', unit: '', get: (e) => e.totalReps, fmt: (v) => fmtNum(v, 0) },
      volume: { name: 'Volume', unit: 'kg', get: (e) => e.volume, fmt: (v) => `${fmtNum(v, 0)} kg` },
    }[exMetric];
    const data = entries.map((e) => ({ t: e.startedAt, v: defs.get(e) }));
    host.appendChild(timeChart({ panels: [{ kind: 'line', name: defs.name, color: 'var(--s1)', unit: defs.unit, fmt: defs.fmt, data }], from: data.length > 1 ? data[0].t - 86400000 : data[0].t - 3 * 86400000, to: data[data.length - 1].t + (data.length > 1 ? 86400000 : 3 * 86400000), ariaLabel: `${defs.name} — ${ex?.name}` }));
  }
  drawEx();
  return box;
}

// ----- peso corporal -----
function weightSection(eff) {
  const st = store.state;
  const box = h('div', { class: 'section' }, h('h2', null, 'Peso corporal'));
  const data = st.weights.filter((w) => parseKey(w.date).getTime() >= (eff.from || 0) - 86400000).map((w) => ({ t: parseKey(w.date).getTime(), v: w.kg }));
  const card = h('div', { class: 'card' });
  if (data.length) card.appendChild(timeChart({ panels: [{ kind: 'line', name: 'Peso', color: 'var(--s1)', unit: 'kg', fmt: (v) => `${fmtNum(v, 1)} kg`, data }], from: data.length > 1 ? data[0].t - 86400000 : data[0].t - 3 * 86400000, to: Math.max(eff.to, data[data.length - 1].t) + 86400000, ariaLabel: 'Peso corporal' }));
  else card.appendChild(h('p', { class: 'muted' }, 'Nenhum peso registrado no período.'));
  card.appendChild(h('div', { style: { marginTop: '10px' } }, btn('Registrar peso', { kind: 'secondary', ic: 'plus', size: 'sm', onClick: weightSheet })));
  box.appendChild(card);
  return box;
}
function weightSheet() {
  const kg = numInput(store.state.weights.at(-1)?.kg ?? store.state.profile?.weight, { placeholder: 'kg' });
  const date = h('input', { type: 'date', value: dateKey() });
  const form = () => JSON.stringify([readNum(kg), date.value]);
  const initial = form();
  const s = openSheet({
    title: 'Registrar peso', className: 'compact', guard: () => form() !== initial,
    body: [field('Peso (kg)', kg), field('Data', date)],
    footer: [btn('Descartar', { kind: 'secondary', onClick: () => s.close() }), btn('Salvar', { onClick: async () => {
      const v = readNum(kg); if (!v || v < 20 || v > 400) return toast('Informe um peso válido.');
      await store.addWeight({ date: date.value, kg: v, source: 'manual' });
      if (date.value === dateKey()) await store.saveProfile({ weight: v });
      s.close(); toast('Peso registrado.'); app.rerender();
    } })],
  });
}

// ----- atividades -----
function activitiesSection(acts, eff) {
  const box = h('div', { class: 'section' }, h('h2', null, 'Cardio e atividades recreativas'));
  if (!acts.length) { box.appendChild(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Sem atividades registradas no período.'), btn('Registrar atividade', { kind: 'secondary', size: 'sm', ic: 'plus', onClick: () => activitySheet({ onSaved: () => app.rerender() }) }))); return box; }
  const types = [...new Set(acts.map((a) => a.type))];
  const parts = types.map((t) => ({ key: t, name: catById(t).label, color: catById(t).color }));
  const weekStart = (ts) => { const d = startOfDay(new Date(ts)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  const byWeek = new Map();
  for (const a of acts) { const k = weekStart(a.startedAt); if (!byWeek.has(k)) byWeek.set(k, {}); byWeek.get(k)[a.type] = (byWeek.get(k)[a.type] || 0) + a.durationMin; }
  const data = [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([t, p]) => ({ t, parts: p }));
  const card = h('div', { class: 'card' });
  card.appendChild(timeChart({ panels: [{ kind: 'stack', name: 'Minutos por semana', unit: 'min', parts, data, slotMs: 7 * 86400000 }], from: eff.from, to: eff.to, ariaLabel: 'Minutos por semana e atividade' }));
  card.appendChild(h('div', { class: 'hr' }));
  for (const t of types) {
    const arr = acts.filter((a) => a.type === t);
    const km = sum(arr, (a) => a.distanceKm || 0);
    card.appendChild(h('div', { class: 'row sb', style: { padding: '4px 0' } }, h('span', null, h('i', { class: 'cat-dot', style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: catById(t).color, marginRight: '8px' } }), catById(t).label),
      h('span', { class: 'muted' }, `${arr.length}× · ${fmtDur(sum(arr, (a) => a.durationMin) * 60)}${km ? ` · ${fmtNum(km, 1)} km` : ''}`)));
  }
  box.appendChild(card);
  return box;
}

// ----- sugestões e resultados -----
function suggestionsSection() {
  const st = store.state;
  const recs = st.suggestions.filter((s) => s.decision).slice().reverse().slice(0, 8);
  const box = h('div', { class: 'section' }, h('h2', null, 'Sugestões de progressão e resultados'));
  if (!recs.length) { box.appendChild(h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Quando você aceitar, alterar ou ignorar uma sugestão, ela aparece aqui — junto com o que aconteceu depois.'))); return box; }
  box.appendChild(h('div', { class: 'list' }, recs.map((r) => {
    const ex = st.exercises.get(r.exerciseId);
    const dec = r.decision === 'accepted' ? 'Aceita' : r.decision === 'altered' ? 'Alterada' : 'Ignorada';
    let res;
    if (r.decision === 'ignored') res = 'Você manteve a carga atual.';
    else if (r.outcome) res = `Resultado em ${fmtDate(r.outcome.date)}: ${r.outcome.sets.map((x) => `${fmtNum(x.load, 1)}×${x.reps}`).join(', ')}.`;
    else res = 'Ainda não testada nos treinos.';
    return h('a', { class: 'li', href: `#/exercicio/${r.exerciseId}` }, h('div', { class: 'grow' },
      h('div', { class: 't' }, ex?.name || 'Exercício', ' ', h('span', { class: `badge ${r.decision === 'ignored' ? '' : 'ok'}` }, dec)),
      h('div', { class: 's' }, `${fmtDate(r.decidedAt, { year: true })} · ${fmtNum(r.currentLoad, 1)} → ${fmtNum(r.newLoad, 1)} kg`), h('div', { class: 's' }, res)));
  })));
  return box;
}

// Motor de progressão CONSERVADOR e EXPLICÁVEL.
//
// Princípios:
//  - Só sugere aumento com evidência suficiente no histórico REAL.
//  - Nunca inventa dado: toda frase da explicação sai de números registrados.
//  - Nunca aplica nada sozinho: devolve uma sugestão para a usuária decidir.
//
// Resultado de evaluate():
//   status: 'suggest' | 'hold' | 'insufficient' | 'na'
//   headline, explanation (texto simples), checks[] (✓/✗ com os dados considerados),
//   considered[] (sessões usadas), currentLoad, suggestedLoad, confidence, basis.

import { fmtDate, fmtNum, round1, sum, median } from './util.js';
import { exerciseEntries } from './stats.js';
import { effortLabel } from './data/seed.js';

export const CONFIG = {
  minSessions: 3,      // sessões consecutivas com a mesma carga
  minSpanDays: 5,      // as sessões precisam estar espalhadas no tempo
  staleDays: 21,       // histórico antigo demais → manter a carga
  maxAvgEffort: 3,     // até "Moderado"
  minAvgRir: 1,        // sobrando ao menos ~1 repetição
  fatigueHigh: 4,      // bem-estar: fadiga ≥ 4 (de 5)
  feelTired: 2,        // como se sentiu ≤ 2 (cansada / muito cansada)
};

export function defaultStep(load) {
  if (load < 10) return 1;
  if (load < 30) return 2;
  if (load < 60) return 2.5;
  return 5;
}

// Carga predominante nas séries de uma sessão (empate → a maior).
export function entryLoad(e) {
  const m = new Map();
  for (const s of e.sets) m.set(s.load || 0, (m.get(s.load || 0) || 0) + 1);
  let best = 0, bestN = -1;
  for (const [l, n] of m) if (n > bestN || (n === bestN && l > best)) { best = l; bestN = n; }
  return best;
}

const same = (a, b) => Math.abs(a - b) < 0.01;
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const repsWord = (n) => `${fmtNum(n, 1)} ${Math.abs(n - 1) < 0.05 ? 'repetição' : 'repetições'}`;
const joinPt = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} e ${a[a.length - 1]}`);

function metTarget(e) {
  const need = e.plannedReps ?? e.sets[0]?.targetReps;
  const needSets = e.plannedSets ?? e.sets.length;
  if (!need) return false;
  return e.sets.length >= needSets && e.sets.every((s) => (s.reps || 0) >= need);
}

function describeEntry(e) {
  const L = entryLoad(e);
  const reps = e.sets.map((s) => s.reps);
  const allSame = reps.every((r) => r === reps[0]);
  const desc = allSame ? `${e.sets.length} × ${reps[0]}` : reps.join(' / ');
  return `${desc} com ${fmtNum(L, 1)} kg`;
}

export function evaluate({ entries, exercise, now = Date.now(), cfg = CONFIG }) {
  const base = { exerciseId: exercise?.id, config: cfg, canIgnore: true };
  const used = (entries || []).filter((e) => e.repUnit !== 'seg' && e.sets.length);

  if (exercise?.repUnit === 'seg') {
    return { ...base, status: 'na', headline: 'Sem sugestão de carga para este exercício',
      explanation: 'Este exercício é medido em tempo (segundos). A progressão por carga não se aplica; acompanhe o tempo na Evolução.', checks: [], considered: [] };
  }
  if (!used.length) {
    return { ...base, status: 'insufficient', headline: 'Dados insuficientes para sugerir uma progressão com confiança.',
      explanation: 'Você ainda não registrou este exercício em nenhum treino. Depois de algumas sessões, o histórico passará a orientar as sugestões.', checks: [], considered: [] };
  }

  const last = used[0];
  const L = entryLoad(last);
  if (L <= 0) {
    return { ...base, status: 'na', headline: 'Sem carga externa registrada',
      explanation: 'As últimas sessões foram feitas sem carga (peso corporal). Para este tipo de exercício, o mais útil é acompanhar as repetições e a técnica na Evolução. Se começar a usar peso, o sistema passa a avaliar a carga.', checks: [], considered: [] };
  }

  // Sessões consecutivas (mais recentes) com a mesma carga.
  const run = [];
  for (const e of used) { if (same(entryLoad(e), L)) run.push(e); else break; }
  const n = run.length;
  const dates = (arr) => joinPt(arr.map((e) => fmtDate(e.startedAt)));
  const basis = `${exercise.id}|${L}|${last.sessionId}`;
  const daysSince = Math.floor((now - last.startedAt) / 86400000);

  if (n < cfg.minSessions) {
    return { ...base, status: 'insufficient', currentLoad: L, basis,
      headline: 'Dados insuficientes para sugerir uma progressão com confiança.',
      explanation: `Você tem ${plural(n, 'sessão registrada', 'sessões registradas')} com ${fmtNum(L, 1)} kg (${dates(run)}). Para sugerir um aumento com segurança, o sistema precisa de pelo menos ${cfg.minSessions} sessões seguidas com a mesma carga.`,
      checks: [{ ok: false, text: `${n} de ${cfg.minSessions} sessões necessárias com ${fmtNum(L, 1)} kg` }],
      considered: run.map((e) => considered(e)) };
  }

  const win = run.slice(0, cfg.minSessions);
  const metCount = win.filter(metTarget).length;
  const spanDays = Math.round((win[0].startedAt - win[win.length - 1].startedAt) / 86400000);
  const efforts = win.flatMap((e) => e.sets.map((s) => s.effort)).filter((v) => v != null);
  const rirs = win.flatMap((e) => e.sets.map((s) => s.rir)).filter((v) => v != null);
  const avgEffort = efforts.length ? sum(efforts) / efforts.length : null;
  const avgRir = rirs.length ? sum(rirs) / rirs.length : null;
  const lastEfforts = win[0].sets.map((s) => s.effort).filter((v) => v != null);
  const lastVeryHard = lastEfforts.some((v) => v >= 5);
  const tiredSessions = win.filter((e) => e.feel != null && e.feel <= cfg.feelTired).length;
  const fatigueDays = win.filter((e) => e.fatigue != null && e.fatigue >= cfg.fatigueHigh).length;
  const lastTired = win[0].feel != null && win[0].feel <= cfg.feelTired;
  const lastFatigued = win[0].fatigue != null && win[0].fatigue >= cfg.fatigueHigh;
  const fatigueFlag = lastTired || lastFatigued || tiredSessions >= 2 || fatigueDays >= 2;
  // Queda: a última sessão rendeu menos que a anterior E não bateu o planejado.
  const repsDrop = win[0].totalReps < win[1].totalReps && !metTarget(win[0]);

  const effortOk = efforts.length ? (avgEffort <= cfg.maxAvgEffort && !lastVeryHard) : null;
  const rirOk = rirs.length ? avgRir >= cfg.minAvgRir : null;

  const checks = [
    { key: 'met', ok: metCount === win.length,
      text: `Completou todas as séries nas repetições planejadas em ${metCount} de ${win.length} sessões com ${fmtNum(L, 1)} kg` },
    { key: 'span', ok: spanDays >= cfg.minSpanDays,
      text: `Sessões distribuídas em ${plural(spanDays, 'dia', 'dias')} (mínimo ${cfg.minSpanDays})` },
    { key: 'effort', ok: effortOk,
      text: efforts.length ? `Esforço registrado: média ${fmtNum(avgEffort, 1)} de 5 (${effortLabel(Math.round(avgEffort)).toLowerCase()})${lastVeryHard ? '; houve série "muito difícil" na última sessão' : ''}` : 'Esforço não registrado nessas sessões' },
    { key: 'rir', ok: rirOk,
      text: rirs.length ? `Repetições sobrando (RIR): média ${fmtNum(avgRir, 1)}` : 'Repetições sobrando (RIR) não registradas' },
    { key: 'fatigue', ok: !fatigueFlag,
      text: fatigueFlag ? 'Há sinais de cansaço/fadiga elevada nas últimas sessões' : 'Sem sinais de fadiga elevada registrados' },
    { key: 'trend', ok: !repsDrop,
      text: repsDrop ? `Repetições totais caíram (${win[1].totalReps} → ${win[0].totalReps})` : 'Repetições estáveis ou crescendo' },
    { key: 'recent', ok: daysSince <= cfg.staleDays,
      text: daysSince === 0 ? 'Última sessão: hoje' : `Última sessão há ${plural(daysSince, 'dia', 'dias')}` },
  ];

  const considered_ = win.map((e) => considered(e));
  const failed = checks.filter((c) => c.ok === false);
  const step = exercise.defaults?.loadStep || defaultStep(L);
  const suggestedLoad = round1(L + step);

  if (!failed.length) {
    const d = describeEntry(win[0]);
    let txt = `Nas últimas ${win.length} sessões (${dates(win.slice().reverse())}) você fez ${d.replace(/ com .*/, '')} com ${fmtNum(L, 1)} kg e completou todas as séries nas repetições planejadas.`;
    if (efforts.length) txt += ` O esforço registrado foi ${effortLabel(Math.round(avgEffort)).toLowerCase()} (média ${fmtNum(avgEffort, 1)} de 5)`;
    if (rirs.length) txt += `${efforts.length ? ' e você' : ' Você'} terminou com cerca de ${repsWord(avgRir)} sobrando.`;
    else if (efforts.length) txt += '.';
    if (!efforts.length && !rirs.length) txt += ' Você não registrou esforço nesses treinos, então vale confirmar se a carga realmente está confortável.';
    txt += ` Por isso, o sistema considera razoável testar uma pequena progressão para ${fmtNum(suggestedLoad, 1)} kg. Se preferir manter, tudo bem: a decisão é sua.`;
    const confidence = n >= 4 && (efforts.length || rirs.length) ? 'alta' : 'média';
    return { ...base, status: 'suggest', currentLoad: L, suggestedLoad, step, confidence, basis, checks,
      headline: `Testar ${fmtNum(suggestedLoad, 1)} kg`, explanation: txt, considered: considered_ };
  }

  // Manter: explicar cada motivo com dados reais.
  const reasons = [];
  for (const c of failed) {
    if (c.key === 'met') reasons.push(`Em ${metCount} das últimas ${win.length} sessões com ${fmtNum(L, 1)} kg você completou todas as séries nas repetições planejadas.`);
    if (c.key === 'trend') reasons.push(`Houve redução nas repetições (${win[1].totalReps} → ${win[0].totalReps} no total).`);
    if (c.key === 'effort') {
      reasons.push(avgEffort > cfg.maxAvgEffort
        ? `O esforço registrado ficou acima do moderado (média ${fmtNum(avgEffort, 1)} de 5).`
        : `Na última sessão você registrou uma série "muito difícil".`);
    }
    if (c.key === 'rir') reasons.push(`Você terminou com poucas repetições sobrando (média ${fmtNum(avgRir, 1)}).`);
    if (c.key === 'fatigue') reasons.push('Você registrou cansaço/fadiga elevada recentemente.');
    if (c.key === 'span') reasons.push(`As últimas ${win.length} sessões ocorreram em apenas ${plural(spanDays, 'dia', 'dias')}; é melhor ver consistência ao longo de pelo menos ${cfg.minSpanDays} dias.`);
    if (c.key === 'recent') reasons.push(`Faz ${daysSince} dias desde a última sessão; ao retomar, vale manter a carga atual por algumas sessões.`);
  }
  return { ...base, status: 'hold', currentLoad: L, basis, checks, considered: considered_,
    headline: 'Por enquanto, não recomendamos uma progressão.',
    explanation: `${reasons.join(' ')} O histórico atual não apresenta evidências suficientes para sugerir aumento. Manter ${fmtNum(L, 1)} kg e observar as próximas sessões é uma boa escolha.` };
}

function considered(e) {
  const efforts = e.sets.map((s) => s.effort).filter((v) => v != null);
  return {
    sessionId: e.sessionId, startedAt: e.startedAt,
    text: describeEntry(e),
    effort: efforts.length ? effortLabel(Math.round(sum(efforts) / efforts.length)) : null,
    rir: e.avgRir != null ? round1(e.avgRir) : null,
    met: metTarget(e),
  };
}

// Avalia a partir do estado da aplicação.
export function progressionFor(state, exerciseId, now = Date.now()) {
  const exercise = state.exercises.get(exerciseId);
  if (!exercise) return null;
  const entries = exerciseEntries(state.sessions, exerciseId, state.wellbeing);
  const res = evaluate({ entries, exercise, now });
  // Já decidida? (mesma base = mesmo último treino e mesma carga)
  const decided = res.basis ? state.suggestions.find((s) => s.basis === res.basis && s.decision) : null;
  return { ...res, decided: decided || null };
}

// Lista de sugestões ativas ("suggest" ainda não decididas) para um conjunto de exercícios.
export function pendingSuggestions(state, exerciseIds) {
  const out = [];
  for (const id of new Set(exerciseIds)) {
    const r = progressionFor(state, id);
    if (r && r.status === 'suggest' && !r.decided) out.push(r);
  }
  return out;
}

export { median };

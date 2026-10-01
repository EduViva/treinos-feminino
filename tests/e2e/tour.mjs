// Tour visual com dados realistas (12 semanas). Gera screenshots para revisão.
// uso: node tests/e2e/tour.mjs <pasta-saida> [largura]
import { chromium } from './pw.mjs';
import { start } from '../../scripts/serve.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'tests/e2e/out/tour';
const W = Number(process.argv[3] || 390);
mkdirSync(OUT, { recursive: true });
const server = await start(8128);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await p.goto('http://localhost:8128/');
await p.waitForSelector('.hero');

await p.evaluate(async () => {
  const s = await import('/js/store.js');
  await s.saveProfile({ name: 'Ana Souza', age: 34, sex: 'Feminino', height: 165, weight: 63, goal: 'Hipertrofia (ganhar massa)', level: 'Intermediário' });
  await s.loadSeedWorkouts();
  const DAY = 86400000, now = Date.now();
  const W = s.state.workouts;
  const loads = { 'ex-leg-press': 40, 'ex-extensora': 25, 'ex-flexora': 20, 'ex-abdutora': 30, 'ex-pelvica': 30, 'ex-panturrilha': 8 };
  let k = 0;
  for (let wk = 11; wk >= 0; wk--) {
    for (const [dow, wi] of [[1, 0], [3, 1], [5, 2]]) {
      if (wk === 11 && dow < 3) continue;
      if ((wk + dow) % 7 === 0) continue; // faltas
      const t0 = new Date(now - wk * 7 * DAY); t0.setDate(t0.getDate() - ((t0.getDay() + 6) % 7) + (dow - 1)); t0.setHours(18, 10, 0, 0);
      if (t0.getTime() > now) continue;
      const w = W[wi];
      const progress = Math.floor((11 - wk) / 3) * 2.5;
      const exs = w.items.map((it, i) => {
        const ex = s.getExercise(it.exerciseId);
        const base = (wi === 0 ? loads[it.exerciseId] : ex.bodyweight ? 0 : 12 + i * 3) || 10;
        const load = ex.bodyweight ? 0 : base + progress;
        const sets = [0, 1, 2].map((n) => ({
          n: n + 1, plannedReps: it.reps, plannedLoad: load, plannedRest: it.rest, targetReps: it.reps, targetLoad: load, targetRest: it.rest,
          reps: it.reps - (n === 2 && k % 3 === 0 ? 2 : 0), load, startedAt: t0.getTime() + i * 420000 + n * 120000, endedAt: t0.getTime() + i * 420000 + n * 120000 + 40000, durationSec: 40,
          restPlanned: it.rest, restActual: it.rest + (k % 4) * 6, effort: 2 + ((k + n) % 3), rir: n === 2 ? 1 : 2,
        }));
        return { itemId: it.id, exerciseId: it.exerciseId, name: ex.name, group: ex.group, secondary: ex.secondary, equipment: ex.equipment, art: ex.art, repUnit: ex.repUnit, bodyweight: ex.bodyweight, notes: '',
          planned: { sets: 3, reps: it.reps, load, rest: it.rest }, target: { sets: 3, reps: it.reps, load, rest: it.rest }, changes: [], status: 'done',
          startedAt: t0.getTime() + i * 420000, endedAt: t0.getTime() + i * 420000 + 380000, durationSec: 380, sets };
      });
      const rec = { id: 'tour-' + k, workoutId: w.id, workoutName: w.name, startedAt: t0.getTime(), endedAt: t0.getTime() + 3300000, durationSec: 3300 + (k % 5) * 120, feel: 3 + (k % 3), note: '', exercises: exs };
      const { sessionTotals } = await import('/js/stats.js');
      rec.totals = sessionTotals(rec);
      await s.addSession(rec);
      k++;
    }
  }
  const types = ['corrida', 'caminhada', 'bike', 'volei', 'pingpong'];
  for (let i = 0; i < 16; i++) {
    const t = now - (i * 5 + 1) * DAY; const type = types[i % 5];
    await s.saveActivity({ id: 'act-' + i, type, startedAt: t, durationMin: 30 + (i % 4) * 10, distanceKm: ['corrida', 'caminhada', 'bike'].includes(type) ? 4 + (i % 5) : null, paceSecKm: type === 'corrida' ? 330 + (i % 4) * 12 : null, speedKmh: type === 'bike' ? 16 + i % 4 : null, intensity: 1 + (i % 3), calories: 250 + i * 10, note: '' });
  }
  const pd = (n) => { const d = new Date(now - n * DAY); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  for (let n = 0; n < 60; n++) {
    const cd = (n + 10) % 28;
    await s.saveWellbeing({ date: pd(n), mood: 3 + ((n * 7) % 3), energy: 2 + ((n * 5) % 4), tiredness: 1 + ((n * 3) % 4), fatigue: 1 + ((n * 11) % 4), recovery: 2 + ((n * 2) % 4), period: cd < 5, flow: cd < 5 ? 'médio' : undefined, cycleStart: cd === 0 });
  }
  for (let n = 0; n < 9; n++) await s.addWeight({ date: pd(n * 9), kg: 64.5 - n * 0.2 + (n % 2) * 0.3 });
});

const shot = async (name, o = {}) => { await p.waitForTimeout(o.wait ?? 450); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!o.full }); };
const go = async (hash, sel) => { await p.goto('http://localhost:8128/' + hash); await p.waitForSelector(sel, { timeout: 5000 }); };

await go('#/', '.next-card'); await shot('01-home', { full: true });
await go('#/treinos', '.wk-card'); await shot('02-treinos', { full: true });
await p.locator('.wk-card').first().getByRole('button', { name: 'Editar' }).click(); await p.waitForSelector('.ex-row'); await shot('03-editor-treino', { full: true });
await go('#/exercicios', '.group-h'); await shot('04-biblioteca', { full: true });
await go('#/exercicio/ex-abdutora', '.visual'); await shot('05-exercicio-abdutora', { wait: 900 });
await p.getByRole('button', { name: 'Ver em quadros' }).click(); await shot('06-exercicio-quadros', { wait: 500 });
await go('#/evolucao', '.chart svg'); await shot('07-evolucao', { full: true });
await go('#/calendario', '.cal-grid'); await p.locator('.cal-day.today').click(); await shot('08-calendario', { full: true });
await go('#/bem-estar', '.q'); await shot('09-bem-estar', { full: true });
await p.getByRole('button', { name: 'Ciclo', exact: true }).click(); await shot('10-bem-estar-ciclo', { full: true });
await go('#/perfil', '.card'); await shot('11-perfil', { full: true });
// modo treino
await go('#/', '.next-card');
await p.getByRole('button', { name: 'Iniciar treino' }).click(); await p.waitForSelector('.sess'); await shot('12-intro', { wait: 900 });
await p.getByRole('button', { name: 'Iniciar exercício' }).click(); await shot('13-ready', { wait: 700 });
await p.getByRole('button', { name: 'Iniciar série' }).click(); await shot('14-running', { wait: 1200 });
await p.getByRole('button', { name: 'Terminei' }).click(); await shot('15-rest', { wait: 700 });
await p.getByRole('button', { name: 'Menu do treino' }).click(); await p.getByRole('button', { name: /Ver todos/ }).click(); await shot('16-lista-exercicios', { wait: 500 });
console.log(errs.length ? errs.join('\n') : 'sem erros');
await b.close(); server.close();

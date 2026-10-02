// Tour visual com dados realistas (12 semanas). Gera screenshots para revisão.
// uso: node tests/e2e/tour.mjs <pasta-saida> [largura]
import { makeEnv, catalogId } from './harness.mjs';
import { LEGACY_EXERCISE_SLUGS } from '../../js/data/legacy-map.js';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'tests/e2e/out/tour';
const W = Number(process.argv[3] || 390);
mkdirSync(OUT, { recursive: true });
const env = await makeEnv({ port: 8128 });
const { session } = env.fake.createUser({ email: 'ana@teste.com', password: 'senha-forte-1', name: 'Ana' });
const dev = await env.device({ session, viewport: { width: W, height: 800 }, name: 'tour' });
const p = dev.page, errs = env.errors, BASE = env.BASE;
const ID = Object.fromEntries(await Promise.all(Object.entries(LEGACY_EXERCISE_SLUGS).map(async ([k, v]) => [k, await catalogId(v)])));
await p.goto(BASE);
await p.waitForSelector('.hero');

await p.evaluate(async (ID) => {
  const s = await import('/js/store.js');
  await s.saveProfile({ name: 'Ana Souza', age: 34, sex: 'Feminino', height: 165, weight: 63, goal: 'Hipertrofia (ganhar massa)', level: 'Intermediário' });
  await s.loadSeedWorkouts();
  const DAY = 86400000, now = Date.now();
  const W = s.state.workouts;
  const loads = { [ID['ex-leg-press']]: 40, [ID['ex-extensora']]: 25, [ID['ex-flexora-deitada']]: 20, [ID['ex-abdutora']]: 30, [ID['ex-pelvica']]: 30 };
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
      const rec = { id: crypto.randomUUID(), workoutId: w.id, workoutName: w.name, startedAt: t0.getTime(), endedAt: t0.getTime() + 3300000, durationSec: 3300 + (k % 5) * 120, feel: 3 + (k % 3), note: '', exercises: exs };
      const { sessionTotals } = await import('/js/stats.js');
      rec.totals = sessionTotals(rec);
      await s.addSession(rec);
      k++;
    }
  }
  const types = ['corrida', 'caminhada', 'bike', 'volei', 'pingpong'];
  for (let i = 0; i < 16; i++) {
    const t = now - (i * 5 + 1) * DAY; const type = types[i % 5];
    await s.saveActivity({ id: crypto.randomUUID(), type, startedAt: t, durationMin: 30 + (i % 4) * 10, distanceKm: ['corrida', 'caminhada', 'bike'].includes(type) ? 4 + (i % 5) : null, paceSecKm: type === 'corrida' ? 330 + (i % 4) * 12 : null, speedKmh: type === 'bike' ? 16 + i % 4 : null, intensity: 1 + (i % 3), calories: 250 + i * 10, note: '' });
  }
  const pd = (n) => { const d = new Date(now - n * DAY); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  for (let n = 0; n < 60; n++) {
    const cd = (n + 10) % 28;
    await s.saveWellbeing({ date: pd(n), mood: 3 + ((n * 7) % 3), energy: 2 + ((n * 5) % 4), tiredness: 1 + ((n * 3) % 4), fatigue: 1 + ((n * 11) % 4), recovery: 2 + ((n * 2) % 4), period: cd < 5, flow: cd < 5 ? 'médio' : undefined, cycleStart: cd === 0 });
  }
  for (let n = 0; n < 9; n++) await s.addWeight({ date: pd(n * 9), kg: 64.5 - n * 0.2 + (n % 2) * 0.3 });
}, ID);

const shot = async (name, o = {}) => { await p.waitForTimeout(o.wait ?? 450); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!o.full }); };
const go = async (hash, sel) => { await p.goto(BASE + hash); await p.waitForSelector(sel, { timeout: 5000 }); };

await go('#/', '.next-card'); await shot('01-home', { full: true });
await go('#/treinos', '.wk-card'); await shot('02-treinos', { full: true });
await p.locator('.wk-card').first().getByRole('button', { name: 'Editar' }).click(); await p.waitForSelector('.ex-row'); await shot('03-editor-treino', { full: true });
await p.getByRole('button', { name: 'Adicionar exercícios' }).click(); await p.waitForSelector('.sheet .finder'); await shot('03b-seletor-exercicios', { wait: 600 });
await p.locator('.sheet input[aria-label="Buscar exercício"]').fill('puxada'); await shot('03c-seletor-busca-puxada', { wait: 500 });
await p.keyboard.press('Escape');
await go('#/exercicios', '.group-h'); await shot('04-biblioteca', { full: true });
await p.getByLabel('Buscar exercício').fill('supino'); await shot('04b-biblioteca-busca-supino', { wait: 500 });
await p.getByRole('button', { name: 'Filtros' }).click(); await shot('04c-biblioteca-filtros', { wait: 400 });
await go(`#/exercicio/${ID['ex-abdutora']}`, '.visual'); await shot('05-exercicio-abdutora', { wait: 900 });
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
await env.close();

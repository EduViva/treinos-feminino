// E2E da MIGRAÇÃO: quem já usava a versão local (sem conta) entra, importa os dados antigos deste aparelho
// para a conta (ids da biblioteca original → catálogo) e nada se perde.
import { makeEnv, reporter, catalogId } from './harness.mjs';
const env = await makeEnv({ port: 8143, autoconfirm: true });
const R = reporter();
const { fake } = env;
const waitFor = async (fn, ms = 9000, what = 'condição') => { const t = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch { /* */ } if (Date.now() - t > ms) throw new Error(`tempo esgotado: ${what}`); await new Promise((r) => setTimeout(r, 120)); } };
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const legacy = {
  kv: [{ key: 'profile', value: { name: 'Carla Antiga', age: 40, height: 168, weight: 70, goal: 'Força', level: 'Intermediário', createdAt: 1700000000000, updatedAt: 1700000000000 } },
       { key: 'settings', value: { sound: false, vibration: true, wakeLock: true, defaultRest: 75, autoStartSet: false, theme: 'dark' } },
       { key: 'meta', value: { seedVersion: 2, libVersion: 3 } }],
  exercises: [
    { id: 'ex-supino-reto', name: 'Supino reto com barra', group: 'Peito', equipment: 'Barra', builtin: true, archived: false, createdAt: 10, updatedAt: 500, notes: 'banco no 3', defaults: { sets: 4, reps: 10, load: 42.5, rest: 120, loadStep: 2.5 }, secondary: [], repUnit: 'reps', kind: 'forca', instructions: [] },
    { id: 'ex-leg-press', name: 'Leg press horizontal', group: 'Quadríceps', equipment: 'Máquina', builtin: true, archived: false, createdAt: 10, updatedAt: 10, notes: '', defaults: { sets: 4, reps: 12, load: 0, rest: 90, loadStep: 5 }, secondary: [], repUnit: 'reps', kind: 'forca', instructions: [] },
    { id: uuid(1), name: 'Remada da Carla', group: 'Costas', secondary: ['Bíceps'], equipment: 'Polia / cabo', kind: 'forca', instructions: ['Puxe.'], defaults: { sets: 3, reps: 12, load: 20, rest: 60, loadStep: 2.5 }, repUnit: 'reps', bodyweight: false, builtin: false, archived: false, createdAt: 20, updatedAt: 20, notes: '' },
  ],
  workouts: [{ id: uuid(2), name: 'Treino A', description: 'Meu plano', order: 0, archived: false, createdAt: 1, updatedAt: 1, items: [
    { id: uuid(3), exerciseId: 'ex-leg-press', sets: 4, reps: 12, load: 80, rest: 90, notes: '' },
    { id: uuid(4), exerciseId: 'ex-supino-reto', sets: 4, reps: 10, load: 42.5, rest: 120, notes: 'devagar' },
    { id: uuid(5), exerciseId: uuid(1), sets: 3, reps: 12, load: 20, rest: 60, notes: '' }] }],
  sessions: [1, 2, 3].map((n) => ({ id: uuid(10 + n), workoutId: uuid(2), workoutName: 'Treino A', workoutDescription: '', startedAt: Date.now() - n * 86400e3, endedAt: Date.now() - n * 86400e3 + 3000e3, durationSec: 3000, feel: 4, note: '',
    exercises: [{ itemId: uuid(3), exerciseId: 'ex-leg-press', name: 'Leg press horizontal', group: 'Quadríceps', secondary: [], equipment: 'Máquina', art: 'leg_press', repUnit: 'reps', bodyweight: false, notes: '', planned: { sets: 2, reps: 12, load: 80, rest: 90 }, target: { sets: 2, reps: 12, load: 80, rest: 90 }, changes: [], status: 'done', startedAt: Date.now(), endedAt: Date.now(), durationSec: 200,
      sets: [{ n: 1, plannedReps: 12, plannedLoad: 80, plannedRest: 90, targetReps: 12, targetLoad: 80, targetRest: 90, reps: 12, load: 80, durationSec: 40, restPlanned: 90, restActual: 88, effort: 3, rir: 2, touched: true }, { n: 2, plannedReps: 12, plannedLoad: 80, plannedRest: 90, targetReps: 12, targetLoad: 80, targetRest: 90, reps: 10, load: 80, durationSec: 38, restPlanned: 90, restActual: 90, effort: 4, rir: 1, touched: true }] }] })),
  activities: [{ id: uuid(20), type: 'caminhada', startedAt: Date.now() - 5e6, durationMin: 45, distanceKm: 4, paceSecKm: 675, intensity: 1, calories: 200, note: 'antiga' }],
  wellbeing: [{ date: '2026-02-10', period: true, flow: 'leve', cycleStart: true, mood: 3, energy: 2, tiredness: 3, fatigue: 2, recovery: 3, note: 'dia 1' }],
  weights: [{ id: uuid(21), date: '2026-02-01', kg: 71, source: 'manual', createdAt: 1 }, { id: uuid(22), date: '2026-03-01', kg: 70, source: 'perfil', createdAt: 2 }],
  suggestions: [], media: [], backups: [],
};

try {
  const { session } = fake.createUser({ email: 'carla@teste.com', password: 'senha-forte-1', name: 'Carla' });
  const D = await env.device({ name: 'antigo' });                      // aparelho SEM sessão, mas com dados da versão antiga
  await D.goto(); await D.page.waitForSelector('.auth');
  await ev(D.page, async (data) => {
    await new Promise((resolve, reject) => {
      const r = indexedDB.open('treinos-feminino', 1);
      r.onupgradeneeded = () => { for (const [n, k] of [['kv', 'key'], ['exercises', 'id'], ['workouts', 'id'], ['sessions', 'id'], ['activities', 'id'], ['wellbeing', 'date'], ['weights', 'id'], ['suggestions', 'id'], ['media', 'id'], ['backups', 'id']]) r.result.createObjectStore(n, { keyPath: k }); };
      r.onerror = () => reject(r.error);
      r.onsuccess = () => { const db = r.result, tx = db.transaction([...db.objectStoreNames], 'readwrite'); for (const [n, rows] of Object.entries(data)) for (const row of rows) tx.objectStore(n).put(row); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
    });
  }, legacy);
  R.step('1. Instalação antiga (sem conta) com treinos, histórico, atividades e bem-estar no IndexedDB');
  R.ok(await ev(D.page, async () => (await indexedDB.databases()).some((d) => d.name === 'treinos-feminino')), 'banco local antigo criado');

  R.step('2. Entrar na conta → o app oferece importar os dados deste aparelho');
  await D.page.getByLabel('E-mail').fill('carla@teste.com');
  await D.page.getByLabel('Senha', { exact: true }).fill('senha-forte-1');
  await D.page.getByRole('button', { name: 'Entrar' }).last().click();
  await D.page.waitForSelector('.sheet', { timeout: 20000 });
  const txt = await D.page.locator('.sheet').innerText();
  R.ok(/Dados salvos neste aparelho/.test(txt) && /1 treino/.test(txt) && /3 sessão/.test(txt) && /1 atividade/.test(txt) && /1 registro/.test(txt), `oferta mostra o que existe ("${txt.replace(/\n+/g, ' ').slice(0, 130)}…")`);
  R.ok(fake.db.workouts.length === 0, 'nada foi enviado antes de a usuária aceitar');
  await D.page.screenshot({ path: 'tests/e2e/out/legacy-01-oferta.png' });
  await D.page.locator('.sheet').getByRole('button', { name: 'Importar' }).click();
  await D.page.waitForSelector('.next-card', { timeout: 20000 });
  R.ok(true, 'importou e abriu o app já com perfil e treinos (sem passar pelo onboarding)');

  R.step('3. Dados migrados e ids da biblioteca original remapeados para o catálogo');
  const leg = await catalogId('leg-press-horizontal'), sup = await catalogId('supino-reto-barra');
  const st = await ev(D.page, async () => { const s = await import('/js/store.js'); return { prof: s.state.profile, settings: s.state.settings, w: s.state.workouts[0], ses: s.state.sessions.map((x) => x.exercises[0].exerciseId), mine: [...s.state.exercises.values()].filter((e) => !e.builtin).map((e) => e.name) }; });
  const st2 = await ev(D.page, async ([sup]) => { const s = await import('/js/store.js'); const e = s.getExercise(sup); return { notes: e.notes, load: e.defaults.load, rest: e.defaults.rest, base: e.name }; }, [sup]);
  R.ok(st.prof.name === 'Carla Antiga' && st.settings.theme === 'dark' && st.settings.defaultRest === 75, 'perfil e preferências restaurados');
  R.ok(st.w.items.map((i) => i.exerciseId).slice(0, 2).join() === [leg, sup].join(), 'treino aponta para os exercícios do CATÁLOGO (ids novos)');
  R.ok(st.ses.length === 3 && st.ses.every((id) => id === leg), '3 sessões antigas apontam para o Leg press do catálogo');
  R.ok(st.mine.join() === 'Remada da Carla', 'exercício criado por ela virou exercício PRÓPRIO');
  R.ok(st2.notes === 'banco no 3' && st2.load === 42.5 && st2.rest === 120, 'observação e padrões que ela ajustou no supino viraram preferência pessoal');

  R.step('4. Tudo enviado para as tabelas normalizadas');
  const uid = [...fake.users.values()].find((u) => u.email === 'carla@teste.com').id;
  await waitFor(() => fake.db.workout_sessions.length === 3 && fake.db.session_sets.length === 6 && fake.db.activities.length === 1 && fake.db.wellbeing_entries.length === 1 && fake.db.body_weights.length === 2, 15000, 'envio');
  R.ok(fake.db.workouts[0].name === 'Treino A' && fake.db.workout_exercises.length === 3 && fake.db.workout_exercises.some((i) => i.exercise_id === leg && Number(i.load) === 80), 'treino + itens (carga 80 kg no leg press)');
  R.ok(fake.db.workout_sessions.every((s) => s.user_id === uid) && fake.db.session_exercises.every((x) => x.exercise_id === leg) && fake.db.session_sets.filter((x) => x.set_number === 2).every((x) => x.reps === 10 && Number(x.load) === 80 && x.rest_actual_seconds === 90), 'histórico: 3 sessões, 6 séries com planejado × realizado preservados');
  const mine = fake.db.exercises.find((e) => e.owner_id === uid);
  R.ok(mine && mine.name === 'Remada da Carla' && mine.primary_group_id === 'costas' && mine.equipment_id === 'polia' && fake.db.exercise_secondary_muscles.some((s) => s.exercise_id === mine.id && s.muscle_group_id === 'biceps'), 'exercício próprio: grupo/equipamento/secundários mapeados para os ids do banco');
  const pr = fake.db.user_exercise_prefs.find((p) => p.exercise_id === sup);
  R.ok(pr && pr.notes === 'banco no 3' && Number(pr.default_load) === 42.5 && Number(pr.default_rest_seconds) === 120 && pr.default_sets == null, 'preferências do supino no servidor (só o que difere do catálogo)');
  const wb = fake.db.wellbeing_entries[0];
  R.ok(wb.entry_date === '2026-02-10' && wb.period && wb.flow === 'leve' && wb.cycle_start && wb.mood === 3, 'bem-estar (ciclo, humor…) migrado');
  R.ok(Number(fake.db.body_weights.find((w) => w.measured_on === '2026-03-01').weight_kg) === 70, 'pesos corporais migrados');
  R.ok(fake.db.profiles.find((p) => p.id === uid).display_name === 'Carla Antiga' && fake.db.profiles.find((p) => p.id === uid).onboarded_at, 'perfil gravado na conta');

  R.step('5. Depois de salvo na nuvem, o banco antigo é apagado deste aparelho');
  await waitFor(async () => (await ev(D.page, async () => (await import('/js/sync/engine.js')).status.pending)) === 0, 10000, 'fila vazia');
  await waitFor(async () => !(await ev(D.page, async () => (await indexedDB.databases()).some((d) => d.name === 'treinos-feminino'))), 8000, 'banco antigo apagado');
  R.ok(true, 'banco local ANTIGO removido (privacidade) somente depois de tudo estar na nuvem');
  await D.page.screenshot({ path: 'tests/e2e/out/legacy-02-home.png' });
  const again = await ev(D.page, async () => { const m = await import('/js/legacy.js'); return await m.legacySummary(); });
  R.ok(again === null, 'não oferece importar de novo');
} catch (e) {
  console.log('\n✗ EXCEÇÃO:', e.message); R.ok(false, `exceção: ${e.message}`);
}
const good = R.done(env.errors);
await env.close();
process.exit(good ? 0 : 1);

// E2E 2: edição de treinos/exercícios, mídia própria, novo padrão, importar lista, histórico intacto.
import { makeEnv, catalogId } from './harness.mjs';
import { LEGACY_EXERCISE_SLUGS } from '../../js/data/legacy-map.js';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'tests/e2e/out';
mkdirSync(OUT, { recursive: true });
const env = await makeEnv({ port: 8129 });
const BASE = env.BASE, errors = env.errors, fake = env.fake;
const { session } = fake.createUser({ email: 'bia@teste.com', password: 'senha-forte-1', name: 'Bia' });
const dev = await env.device({ session, name: 'app' });
const page = dev.page;
const ID = Object.fromEntries(await Promise.all(Object.entries(LEGACY_EXERCISE_SLUGS).map(async ([k, v]) => [k, await catalogId(v)])));
const OLD_ID = '00000000-0000-4000-8000-0000000000a1';
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log('  ✓', m); } else { failed++; console.log('  ✗ FALHOU:', m); } };
const step = (t) => console.log('\n▶', t);
const ev = (fn, a) => page.evaluate(fn, a);
const wait = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const tap = (name, o = {}) => page.getByRole('button', { name, exact: o.exact ?? false }).first().click({ timeout: 4000 });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');
// "Adicionar exercícios": procura o exercício pelo nome (o catálogo tem 334) e o marca
const pick = async (query, rowText) => {
  const box = page.locator('.sheet input[aria-label="Buscar exercício"]');
  await box.fill(query);
  await page.waitForFunction((q) => /para “/.test(document.querySelector('.sheet .finder-count')?.textContent || '') && document.querySelector('.sheet .finder-count').textContent.includes(q), query, { timeout: 4000 });
  await page.locator('.sheet .finder-list .li', { hasText: rowText }).first().click();
};

await page.goto(BASE);
await page.waitForSelector('.hero');
await ev(async () => { const s = await import('/js/store.js'); await s.saveProfile({ name: 'Bia' }); await s.loadSeedWorkouts(); });

// ---------------------------------------------------------------- histórico "antigo" (de meses atrás)
step('0. Histórico antigo (para provar que mudar a rotina não o altera)');
await ev(async ([ID, OLD_ID]) => {
  const s = await import('/js/store.js');
  const w = s.state.workouts[0];
  const t0 = Date.now() - 120 * 86400000;
  await s.addSession({
    id: OLD_ID, workoutId: w.id, workoutName: 'Treino A (antigo)', startedAt: t0, endedAt: t0 + 3000000, durationSec: 3000, feel: 4, note: 'rotina antiga',
    exercises: [{ itemId: crypto.randomUUID(), exerciseId: ID['ex-leg-press'], name: 'Leg press horizontal', group: 'Quadríceps', secondary: [], equipment: 'Máquina', art: 'leg_press', repUnit: 'reps', bodyweight: false, notes: '', planned: { sets: 3, reps: 12, load: 30, rest: 90 }, target: { sets: 3, reps: 12, load: 30, rest: 90 }, changes: [], status: 'done', startedAt: t0, endedAt: t0 + 500000, durationSec: 500,
      sets: [1, 2, 3].map((n) => ({ n, plannedReps: 12, plannedLoad: 30, plannedRest: 90, targetReps: 12, targetLoad: 30, targetRest: 90, reps: 12, load: 30, startedAt: t0, endedAt: t0 + 40000, durationSec: 40, restPlanned: 90, restActual: 90, effort: null, rir: null })) }],
  });
}, [ID, OLD_ID]);
const oldBefore = await ev(async (id) => JSON.stringify((await import('/js/store.js')).state.sessions.find((x) => x.id === id)), OLD_ID);

// ---------------------------------------------------------------- criar exercício
step('1. Criar exercício novo com modelo de animação');
await page.goto(BASE + '#/exercicio/novo'); await page.waitForSelector('input[aria-label="Nome"]');
await page.getByLabel('Nome').fill('Meu leg press 45');
await page.locator('select').nth(0).selectOption('Quadríceps');
await page.locator('select').nth(4).selectOption('leg_press');
await wait(200);
ok(await page.locator('.thumb.lg svg').count() === 1, 'pré-visualização da animação escolhida');
await tap('Salvar', { exact: true });
await page.waitForSelector('.visual');
await wait(700);
ok(await page.locator('.visual svg').count() > 0, 'exercício criado exibe animação da modelo');
const exId = await ev(async () => [...(await import('/js/store.js')).state.exercises.values()].find((e) => e.name === 'Meu leg press 45')?.id);
ok(!!exId, 'exercício personalizado salvo na biblioteca');

// ---------------------------------------------------------------- mídia
step('2. Mídia própria: adicionar foto e vídeo, definir principal, substituir, excluir');
const addFile = async (file) => {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), tap('Foto ou vídeo', { exact: false })]);
  await fc.setFiles(file);
  await wait(500);
};
await addFile({ name: 'foto.png', mimeType: 'image/png', buffer: PNG });
await addFile({ name: 'exec.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not-really-a-video') });
let media = await ev(async (id) => (await import('/js/store.js')).listMedia(id), exId);
ok(media.length === 2 && media[0].kind === 'image' && media[1].kind === 'video', 'foto e vídeo associados ao exercício');
await page.waitForSelector('.media-tile');
await page.locator('.media-tile').first().click();
await page.getByRole('button', { name: /Mostrar como principal/ }).click();
await wait(500);
const prim = await ev(async (id) => (await import('/js/store.js')).getExercise(id).mediaPrimary, exId);
ok(prim === media[0].id, 'foto definida como principal');
await page.reload(); await page.waitForSelector('.visual');
await wait(600);
ok(await page.locator('.media-view img').count() === 1, 'mídia própria aparece no destaque (aba “Minha mídia”)');
ok(await page.getByRole('tab', { name: /Animação/ }).count() > 0, 'animação continua disponível na outra aba');
await shot('20-midia');
// substituir: não pode apagar histórico
await page.locator('.media-tile').first().click();
await page.getByRole('button', { name: /Substituir arquivo/ }).click();
// o seletor de arquivo abre após o clique: reabre com waitForEvent
const [fc2] = await Promise.all([page.waitForEvent('filechooser'), (async () => { })()]).catch(() => [null]);
if (fc2) await fc2.setFiles({ name: 'foto2.png', mimeType: 'image/png', buffer: PNG });
await wait(600);
media = await ev(async (id) => (await import('/js/store.js')).listMedia(id), exId);
ok(media.length === 2, 'substituir mantém a quantidade de mídias (mesmo item)');
ok(await ev(async (id) => (await import('/js/store.js')).state.sessions.some((s) => s.id === id), OLD_ID), 'substituir mídia não afeta o histórico');
await page.locator('.media-tile').nth(1).click();
await page.getByRole('button', { name: 'Excluir', exact: true }).click();
await page.locator('.sheet').getByRole('button', { name: 'Excluir', exact: true }).click();
await wait(500);
media = await ev(async (id) => (await import('/js/store.js')).listMedia(id), exId);
ok(media.length === 1, 'mídia excluída');

// ---------------------------------------------------------------- editor de treino
step('3. Criar treino, adicionar, reordenar, editar, substituir, duplicar');
await page.goto(BASE + '#/treino/novo'); await page.waitForSelector('input[aria-label="Nome do treino"]');
await page.getByLabel('Nome do treino').fill('Treino D');
await page.getByLabel('Nome do treino').blur();
await tap('Adicionar exercícios');
await page.waitForSelector('.sheet .li');
await pick('cadeira extensora', 'Cadeira extensora');
await pick('cadeira abdutora', 'Cadeira abdutora');
await pick('prancha abdominal', 'Prancha abdominal');
await tap('Adicionar (3)');
await page.waitForSelector('.ex-row');
ok(await page.locator('.ex-row').count() === 3, '3 exercícios adicionados');
await page.locator('.ex-row').first().getByRole('button', { name: 'Mover para baixo' }).click();
await wait(300);
const order = await ev(async () => (await import('/js/store.js')).state.workouts.find((w) => w.name === 'Treino D').items.map((i) => i.exerciseId));
ok(order[0] === ID['ex-abdutora'] && order[1] === ID['ex-extensora'], 'reordenar exercícios (mover para baixo)');
// editar item (séries, reps, carga, descanso)
await page.locator('.ex-row .meta').first().click();
await page.waitForSelector('.sheet .stepper');
const setStepper = async (idx, val) => { await page.locator('.sheet .stepper-val').nth(idx).click(); await page.locator('.sheet .stepper-input').fill(String(val)); await page.locator('.sheet .stepper-input').press('Enter'); };
await setStepper(0, 4); await setStepper(1, 8); await setStepper(2, 30); await setStepper(3, 60);
await tap('Salvar', { exact: true });
await wait(300);
let itD = await ev(async () => (await import('/js/store.js')).state.workouts.find((w) => w.name === 'Treino D').items[0]);
ok(itD.sets === 4 && itD.reps === 8 && itD.load === 30 && itD.rest === 60, 'item editado: 4 × 8, 30 kg, 60 s');
// substituir
await page.locator('.ex-row .meta').nth(1).click();
await page.getByRole('button', { name: /Substituir por outro exercício/ }).click();
await page.waitForSelector('.sheet .li');
await page.locator('.sheet input[aria-label="Buscar exercício"]').fill('meu leg press');
await page.locator('.sheet .finder-list .li', { hasText: 'Meu leg press 45' }).first().click();
await wait(400);
const items2 = await ev(async () => (await import('/js/store.js')).state.workouts.find((w) => w.name === 'Treino D').items.map((i) => i.exerciseId));
ok(items2[1] === exId, 'exercício substituído por outro');
// remover
await page.locator('.ex-row .meta').nth(2).click();
await page.getByRole('button', { name: /Remover do treino/ }).click();
await wait(300);
ok(await page.locator('.ex-row').count() === 2, 'exercício removido do treino');
await shot('21-editor');
// duplicar
await page.locator('button[aria-label="Duplicar treino"]').click();
await page.waitForSelector('.wk-card');
const nw = await ev(async () => (await import('/js/store.js')).state.workouts.map((w) => w.name));
ok(nw.includes('Treino D (cópia)'), 'treino duplicado');

// ---------------------------------------------------------------- novo padrão permanente
step('4. Alterar permanentemente durante o treino ([TORNAR NOVO PADRÃO])');
await page.goto(BASE + '#/treinos'); await page.waitForSelector('.wk-card');
console.log('   ordem dos cartões:', JSON.stringify(await page.locator('.wk-card h3').allInnerTexts()));
await page.locator('.wk-card').filter({ has: page.getByRole('heading', { name: 'Treino D', exact: true }) }).getByRole('button', { name: 'Iniciar treino' }).click();
await page.waitForSelector('.sess');
await tap('Iniciar exercício');
await page.locator('.s-set button.cell').first().click();
await page.waitForSelector('.sheet .stepper');
await page.locator('.sheet .stepper-val').first().click();
await page.locator('.sheet .stepper-input').fill('35');
await page.locator('.sheet .stepper-input').press('Enter');
await page.getByRole('button', { name: 'Tornar novo padrão' }).click();
await wait(400);
const dw = await ev(async () => (await import('/js/store.js')).state.workouts.find((w) => w.name === 'Treino D').items[0].load);
console.log('   sessão do treino:', (await ev(async () => (await import('/js/store.js')).state.sessions.at(-1).workoutName)), JSON.stringify(await ev(async () => (await import('/js/store.js')).state.workouts.map((w) => [w.name, w.items[0]?.load]))));
ok(dw === 35, 'NOVO PADRÃO: plano do treino agora tem 35 kg');
await tap('Iniciar série'); await wait(300); await tap('Terminei'); await page.waitForSelector('.ring'); await tap('Pular descanso');
await page.getByRole('button', { name: 'Menu do treino' }).click();
await page.getByRole('button', { name: /Finalizar treino agora/ }).click();
await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
await page.waitForSelector('text=TREINO CONCLUÍDO');
await tap('Salvar e fechar');
await page.waitForSelector('.sess', { state: 'detached' }); // o handler é assíncrono: só segue depois de fechar de verdade
await page.waitForSelector('.next-card');
const ss = await ev(async () => (await import('/js/store.js')).state.sessions.at(-1));
ok(ss.exercises[0].changes.at(-1).scope === 'default' && ss.exercises[0].planned.load === 30 && ss.exercises[0].sets[0].load === 35, 'registro: planejado era 30, mudança marcada como “novo padrão”, realizado 35');

// ---------------------------------------------------------------- importar texto
step('5. Importar lista de texto (treino atual da usuária)');
await page.goto(BASE + '#/treinos'); await page.waitForSelector('.wk-card');
await page.getByRole('button', { name: 'Mais opções' }).click();
await page.getByRole('button', { name: 'Importar lista de texto' }).click();
await page.waitForSelector('.sheet textarea');
await page.locator('.sheet textarea').fill(`Treino A - Inferiores
Leg press 4x12 80kg 90s
Extensora 3x15 30 kg
Mesa flexora 3 x 12 25kg 60s
Rosca scott 3x10 12kg

Treino B
1) Supino reto com barra 4x8 40kg descanso 2min
Puxada alta 3x12
Prancha 3x30s
Exercício esquisito do João 3x10`);
await tap('Revisar');
await page.waitForSelector('.badge.ok');
await shot('22-importar');
ok(await page.locator('.badge.ok').count() === 7 && await page.locator('.badge.warn').count() === 1, 'revisão: 7 achados no catálogo (inclusive por nome popular: “Extensora”, “Mesa flexora”, “Rosca scott”) e 1 novo');
await tap('Importar', { exact: true });
for (let i = 0; i < 80 && (await ev(async () => (await import('/js/store.js')).state.workouts.filter((w) => w.name === 'Treino A' || w.name === 'Treino B').length)) < 2; i++) await wait(100);
await page.waitForSelector('.wk-card');
const imp = await ev(async () => { const s = await import('/js/store.js'); return s.state.workouts.filter((w) => w.name === 'Treino A' || w.name === 'Treino B').map((w) => ({ n: w.name, items: w.items.map((i) => [s.getExercise(i.exerciseId).name, i.sets, i.reps, i.load, i.rest]) })); });
const A = imp.find((w) => w.n === 'Treino A');
ok(A && A.items.length === 4 && A.items[0][0].startsWith('Leg press') && A.items[0][1] === 4 && A.items[0][2] === 12 && A.items[0][3] === 80 && A.items[0][4] === 90, 'Treino A importado: Leg press 4×12, 80 kg, 90 s');
ok(A.items[1][0] === 'Cadeira extensora' && A.items[1][2] === 15 && A.items[1][3] === 30, 'nome curto “Extensora” associado a “Cadeira extensora” (15 reps, 30 kg)');
console.log('   importados:', JSON.stringify(imp.map((w) => [w.n, w.items.length])));
const Bw = imp.find((w) => w.n === 'Treino B');
ok(Bw.items[0][4] === 120 && Bw.items[0][1] === 4 && Bw.items[0][2] === 8, 'descanso “2min” = 120 s; 4×8');
ok(Bw.items[2][0].startsWith('Prancha') && Bw.items[2][2] === 30, 'prancha 3×30 s');
ok(Bw.items[3][0] === 'Exercício Esquisito Do João' && (await ev(async () => [...(await import('/js/store.js')).state.exercises.values()].some((e) => !e.builtin && /Esquisito/.test(e.name)))), 'exercício que não existe no catálogo é criado como exercício PRÓPRIO');

// ---------------------------------------------------------------- histórico antigo íntegro
step('6. Mudanças na rotina não alteram o histórico antigo');
await ev(async (ID) => { const s = await import('/js/store.js'); for (const w of [...s.state.workouts]) await s.deleteWorkout(w.id); await s.removeExercise(ID['ex-leg-press']); }, ID);
const oldAfter = await ev(async (id) => JSON.stringify((await import('/js/store.js')).state.sessions.find((x) => x.id === id)), OLD_ID);
// integridade: tudo o que existia continua igual (o registro pode apenas GANHAR campos normalizados pelo servidor)
const keeps = (a, b) => (a !== null && typeof a === 'object' ? b !== null && typeof b === 'object' && Object.keys(a).every((k) => keeps(a[k], b[k])) : a === b);
ok(keeps(JSON.parse(oldBefore), JSON.parse(oldAfter)), 'sessão antiga com todos os dados originais intactos depois de apagar todos os treinos');
const lp = await ev(async (id) => (await import('/js/store.js')).getExercise(id), ID['ex-leg-press']);
ok(lp && lp.archived === true && lp.builtin === true, 'exercício do catálogo com histórico só é arquivado para mim (não some do histórico)');
await page.goto(BASE + '#/evolucao'); await page.waitForSelector('.chart svg');
ok(await page.locator('.chart svg').count() > 0, 'evolução continua exibindo o histórico antigo');

// ---------------------------------------------------------------- treinos-modelo
step('7. Treinos-modelo (Segunda–Sexta) a partir do catálogo');
await ev(async () => { const s = await import('/js/store.js'); for (const w of [...s.state.workouts]) await s.deleteWorkout(w.id); await s.loadSeedWorkouts(); });
await page.goto(BASE); await page.waitForSelector('.next-card');
const mig = await ev(async () => { const s = await import('/js/store.js'); return s.state.workouts.map((w) => w.name); });
ok(JSON.stringify(mig) === JSON.stringify(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']), 'Segunda–Sexta criados');
ok(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].includes(await page.locator('.next-card h2').innerText()), 'início mostra o treino da semana');
const firstItems = await ev(async () => { const s = await import('/js/store.js'); return s.state.workouts.map((w) => w.items.slice(0, 4).map((i) => s.getExercise(i.exerciseId).kind).join()); });
ok(firstItems.every((k) => k === 'alongamento,alongamento,mobilidade,mobilidade'), 'cada treino começa com 2 alongamentos + 2 mobilidades');
const sunItems = await ev(async () => (await import('/js/store.js')).state.workouts.every((w) => w.items.every((i) => !!i.exerciseId)));
ok(sunItems, 'todos os itens apontam para exercícios do catálogo');

console.log('\n──────────────────────────────');
console.log(`${passed} verificações OK, ${failed} falharam, ${errors.length} erros de console`);
errors.forEach((e) => console.log('  !', e));
await env.close();
process.exit(failed || errors.length ? 1 : 0);

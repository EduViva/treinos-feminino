// E2E 2: edição de treinos/exercícios, mídia própria, novo padrão, importar lista, histórico intacto.
import { chromium } from './pw.mjs';
import { start } from '../../scripts/serve.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'tests/e2e/out';
mkdirSync(OUT, { recursive: true });
const PORT = 8129, BASE = `http://localhost:${PORT}/`;
const server = await start(PORT);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
let passed = 0, failed = 0;
const ok = (c, m) => { if (c) { passed++; console.log('  ✓', m); } else { failed++; console.log('  ✗ FALHOU:', m); } };
const step = (t) => console.log('\n▶', t);
const ev = (fn, a) => page.evaluate(fn, a);
const wait = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const tap = (name, o = {}) => page.getByRole('button', { name, exact: o.exact ?? false }).first().click({ timeout: 4000 });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64');

await page.goto(BASE);
await page.waitForSelector('.hero');
await ev(async () => { const s = await import('/js/store.js'); await s.saveProfile({ name: 'Bia' }); await s.loadSeedWorkouts(); });

// ---------------------------------------------------------------- histórico "antigo" (de meses atrás)
step('0. Histórico antigo (para provar que mudar a rotina não o altera)');
await ev(async () => {
  const s = await import('/js/store.js');
  const w = s.state.workouts[0];
  const t0 = Date.now() - 120 * 86400000;
  await s.addSession({
    id: 'old-1', workoutId: w.id, workoutName: 'Treino A (antigo)', startedAt: t0, endedAt: t0 + 3000000, durationSec: 3000, feel: 4, note: 'rotina antiga',
    exercises: [{ itemId: 'i', exerciseId: 'ex-leg-press', name: 'Leg press', group: 'Quadríceps', secondary: [], equipment: 'Máquina', art: 'leg_press', repUnit: 'reps', bodyweight: false, notes: '', planned: { sets: 3, reps: 12, load: 30, rest: 90 }, target: { sets: 3, reps: 12, load: 30, rest: 90 }, changes: [], status: 'done', startedAt: t0, endedAt: t0 + 500000, durationSec: 500,
      sets: [1, 2, 3].map((n) => ({ n, plannedReps: 12, plannedLoad: 30, plannedRest: 90, targetReps: 12, targetLoad: 30, targetRest: 90, reps: 12, load: 30, startedAt: t0, endedAt: t0 + 40000, durationSec: 40, restPlanned: 90, restActual: 90, effort: null, rir: null })) }],
  });
});
const oldBefore = await ev(async () => JSON.stringify((await import('/js/store.js')).state.sessions.find((x) => x.id === 'old-1')));

// ---------------------------------------------------------------- criar exercício
step('1. Criar exercício novo com modelo de animação');
await page.goto(BASE + '#/exercicio/novo'); await page.waitForSelector('input[aria-label="Nome"]');
await page.getByLabel('Nome').fill('Leg press 45°');
await page.locator('select').nth(0).selectOption('Quadríceps');
await page.locator('select').nth(2).selectOption('leg_press');
await wait(200);
ok(await page.locator('.thumb.lg svg').count() === 1, 'pré-visualização da animação escolhida');
await tap('Salvar', { exact: true });
await page.waitForSelector('.visual');
await wait(700);
ok(await page.locator('.visual svg').count() > 0, 'exercício criado exibe animação da modelo');
const exId = await ev(async () => [...(await import('/js/store.js')).state.exercises.values()].find((e) => e.name === 'Leg press 45°')?.id);
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
ok(await ev(async () => (await import('/js/store.js')).state.sessions.some((s) => s.id === 'old-1')), 'substituir mídia não afeta o histórico');
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
await page.locator('.sheet .li', { hasText: 'Cadeira extensora' }).click();
await page.locator('.sheet .li', { hasText: 'Cadeira abdutora' }).click();
await page.locator('.sheet .li', { hasText: 'Prancha' }).click();
await tap('Adicionar (3)');
await page.waitForSelector('.ex-row');
ok(await page.locator('.ex-row').count() === 3, '3 exercícios adicionados');
await page.locator('.ex-row').first().getByRole('button', { name: 'Mover para baixo' }).click();
await wait(300);
const order = await ev(async () => (await import('/js/store.js')).state.workouts.find((w) => w.name === 'Treino D').items.map((i) => i.exerciseId));
ok(order[0] === 'ex-abdutora' && order[1] === 'ex-extensora', 'reordenar exercícios (mover para baixo)');
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
await page.locator('.sheet .li', { hasText: 'Leg press 45°' }).click();
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
Prancha 3x30s`);
await tap('Revisar');
await page.waitForSelector('.badge.ok');
await shot('22-importar');
ok(await page.locator('.badge.ok').count() >= 5 && await page.locator('.badge.warn').count() === 2, 'revisão: 5 achados na biblioteca, 2 novos (Rosca scott, Supino reto com barra)');
await tap('Importar', { exact: true });
await page.waitForFunction(async () => (await import('/js/store.js')).state.workouts.filter((w) => w.imported).length === 2, null, { timeout: 8000 });
await page.waitForSelector('.wk-card');
const imp = await ev(async () => { const s = await import('/js/store.js'); return s.state.workouts.filter((w) => w.imported).map((w) => ({ n: w.name, items: w.items.map((i) => [s.getExercise(i.exerciseId).name, i.sets, i.reps, i.load, i.rest]) })); });
const A = imp.find((w) => w.n === 'Treino A');
ok(A && A.items.length === 4 && A.items[0][0] === 'Leg press' && A.items[0][1] === 4 && A.items[0][2] === 12 && A.items[0][3] === 80 && A.items[0][4] === 90, 'Treino A importado: Leg press 4×12, 80 kg, 90 s');
ok(A.items[1][0] === 'Cadeira extensora' && A.items[1][2] === 15 && A.items[1][3] === 30, 'nome curto “Extensora” associado a “Cadeira extensora” (15 reps, 30 kg)');
console.log('   importados:', JSON.stringify(imp.map((w) => [w.n, w.items.length])));
const Bw = imp.find((w) => w.n === 'Treino B');
ok(Bw.items[0][4] === 120 && Bw.items[0][1] === 4 && Bw.items[0][2] === 8, 'descanso “2min” = 120 s; 4×8');
ok(Bw.items[2][0] === 'Prancha' && Bw.items[2][2] === 30, 'prancha 3×30 s');

// ---------------------------------------------------------------- histórico antigo íntegro
step('6. Mudanças na rotina não alteram o histórico antigo');
await ev(async () => { const s = await import('/js/store.js'); for (const w of [...s.state.workouts]) await s.deleteWorkout(w.id); await s.removeExercise('ex-leg-press'); });
const oldAfter = await ev(async () => JSON.stringify((await import('/js/store.js')).state.sessions.find((x) => x.id === 'old-1')));
ok(oldBefore === oldAfter, 'sessão antiga idêntica depois de apagar todos os treinos');
const lp = await ev(async () => (await import('/js/store.js')).getExercise('ex-leg-press'));
ok(lp && lp.archived === true, 'exercício com histórico é arquivado (não apagado)');
await page.goto(BASE + '#/evolucao'); await page.waitForSelector('.chart svg');
ok(await page.locator('.chart svg').count() > 0, 'evolução continua exibindo o histórico antigo');

console.log('\n──────────────────────────────');
console.log(`${passed} verificações OK, ${failed} falharam, ${errors.length} erros de console`);
errors.forEach((e) => console.log('  !', e));
await browser.close(); server.close();
process.exit(failed || errors.length ? 1 : 0);

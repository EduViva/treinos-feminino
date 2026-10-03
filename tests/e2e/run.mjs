// E2E: simula o uso real do app em um celular (Chromium, viewport mobile) — fluxo completo + offline + persistência.
// uso: node tests/e2e/run.mjs [pasta-de-screenshots]
import { makeEnv, catalogId } from './harness.mjs';
import { LEGACY_EXERCISE_SLUGS } from '../../js/data/legacy-map.js';
import { mkdirSync, statSync } from 'node:fs';

const OUT = process.argv[2] || 'tests/e2e/out';
mkdirSync(OUT, { recursive: true });
const env = await makeEnv({ port: 8125 });
const BASE = env.BASE, errors = env.errors, fake = env.fake;
const { session } = fake.createUser({ email: 'ana@teste.com', password: 'senha-forte-1', name: 'Ana' });
const dev = await env.device({ session, name: 'app' });
const ctx = dev.ctx;
let page = dev.page;
// ids do catálogo no lugar dos ids da biblioteca original ("ex-leg-press" → uuid do "Leg press horizontal")
const ID = Object.fromEntries(await Promise.all(Object.entries(LEGACY_EXERCISE_SLUGS).map(async ([k, v]) => [k, await catalogId(v)])));
const wire = (p) => { p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('CONSOLE ' + m.text()); }); };

let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) { passed++; console.log('  ✓', msg); } else { failed++; console.log('  ✗ FALHOU:', msg); } };
const step = (t) => console.log('\n▶', t);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
const shotFull = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const wait = (ms) => page.waitForTimeout(ms);
const tap = async (name, opts = {}) => { const l = page.getByRole('button', { name, exact: opts.exact ?? false }).first(); await l.click({ timeout: 4000 }); };
const text = (sel) => page.locator(sel).first().innerText();
const hasText = async (t, timeout = 3000) => page.getByText(t, { exact: false }).first().waitFor({ timeout }).then(() => true).catch(() => false);
const sessEval = (fn, arg) => page.evaluate(fn, arg);

// ================================================================= 1. PERFIL
step('1. Primeira abertura: perfil e treinos de exemplo');
await page.goto(BASE);
await page.waitForSelector('.hero');
ok(await hasText('Meus Treinos'), 'tela de boas-vindas aparece');
await page.getByLabel('Nome').fill('Ana Souza');
const inputs = page.locator('.hero ~ .card input[type=text]');
await inputs.nth(1).fill('34');              // idade
await page.locator('select').nth(0).selectOption('Feminino');
await inputs.nth(2).fill('165');             // altura
await inputs.nth(3).fill('62,5');            // peso
await page.locator('select').nth(1).selectOption({ index: 3 });
await page.locator('select').nth(2).selectOption('Intermediário');
await tap('Começar');
await page.waitForSelector('.next-card');
ok((await text('h1')).includes('Olá, Ana'), 'saudação com o nome');
ok(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].includes(await text('.next-card h2')), 'próximo treino = treino da semana (Segunda–Sexta)');
await shot('02-home');
const prof = await sessEval(async () => (await import('/js/store.js')).state.profile);
ok(prof.name === 'Ana Souza' && prof.age === 34 && prof.height === 165 && prof.weight === 62.5, 'perfil salvo (nome, idade, altura, peso)');
const wk0 = await sessEval(async () => (await import('/js/store.js')).state.workouts.length);
ok(wk0 === 5, '5 treinos padrão criados (segunda a sexta)');

// ================================================================= 2. HISTÓRICO (para a progressão)
step('2. Prepara plano real + 3 sessões antigas de Leg press (20 kg, 3×12, esforço moderado)');
await sessEval(async (ID) => {
  const s = await import('/js/store.js');
  // fixtures do teste: 3 treinos próprios (rotação A→B→C) montados com exercícios da biblioteca padrão
  for (const w of [...s.state.workouts]) await s.deleteWorkout(w.id);
  const mkw = async (name, ids) => { const w = s.blankWorkout(); w.name = name; w.items = ids.map((id) => s.newWorkoutItem(id, { sets: 3 })); await s.saveWorkout(w); };
  await mkw('Treino A', ['ex-leg-press', 'ex-extensora', 'ex-flexora-deitada', 'ex-abdutora', 'ex-pelvica', 'ex-prancha'].map((k) => ID[k]));
  await mkw('Treino B', ['ex-supino-inclinado', 'ex-puxada-supinada', 'ex-rosca-w', 'ex-triceps-corda', 'ex-elev-lateral', 'ex-desenv-maq'].map((k) => ID[k]));
  await mkw('Treino C', ['ex-smith', 'ex-adutora', 'ex-sumo-step', 'ex-extensora'].map((k) => ID[k]));
  const w = s.state.workouts[0];
  const items = w.items.map((it) => (it.exerciseId === ID['ex-leg-press'] ? { ...it, load: 20 } : it));
  await s.saveWorkout({ ...w, items });
  const DAY = 86400000, now = Date.now();
  const mk = (i, daysAgo) => {
    const t0 = now - daysAgo * DAY;
    return {
      id: crypto.randomUUID(), workoutId: s.state.workouts[2].id, workoutName: 'Treino C', startedAt: t0, endedAt: t0 + 3600000, durationSec: 3600, feel: 4, note: '',
      exercises: [{
        itemId: crypto.randomUUID(), exerciseId: ID['ex-leg-press'], name: 'Leg press horizontal', group: 'Quadríceps', secondary: [], equipment: 'Máquina', art: 'leg_press', repUnit: 'reps', bodyweight: false, notes: '',
        planned: { sets: 3, reps: 12, load: 20, rest: 90 }, target: { sets: 3, reps: 12, load: 20, rest: 90 }, changes: [], status: 'done', startedAt: t0, endedAt: t0 + 600000, durationSec: 600,
        sets: [1, 2, 3].map((n) => ({ n, plannedReps: 12, plannedLoad: 20, plannedRest: 90, targetReps: 12, targetLoad: 20, targetRest: 90, reps: 12, load: 20, startedAt: t0, endedAt: t0 + 40000, durationSec: 40, restPlanned: 90, restActual: 95, effort: 3, rir: 2 })),
      }],
    };
  };
  for (const [i, d] of [[1, 17], [2, 10], [3, 4]]) await s.addSession(mk(i, d));
}, ID);
const nSess0 = await sessEval(async () => (await import('/js/store.js')).state.sessions.length);
ok(nSess0 === 3, '3 sessões históricas gravadas');
await page.reload(); await page.waitForSelector('.next-card');
ok(await hasText('Sugestões de progressão'), 'início mostra sugestão de progressão baseada no histórico');

// ================================================================= 2b. MENU INFERIOR
step('2b. Menu inferior com cor própria e item ativo evidente (claro e escuro)');
const measureTabs = () => page.evaluate(() => {
  const px = (c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#000'; x.clearRect(0, 0, 1, 1); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const cr = (a, b) => { const [hi, lo] = [L(px(a)), L(px(b))].sort((m, n) => n - m); return (hi + 0.05) / (lo + 0.05); };
  const bar = document.querySelector('#tabbar'), cs = (n) => getComputedStyle(n);
  const on = bar.querySelector('.tab.on'), off = bar.querySelector('.tab:not(.on)'), pill = on.querySelector('.ico');
  const barBg = cs(bar).backgroundColor, pageBg = cs(document.body).backgroundColor;
  return { barBg, pageBg, h: bar.getBoundingClientRect().height, fixed: cs(bar).position === 'fixed',
    off: cr(cs(off).color, barBg), on: cr(cs(on).color, barBg), pill: cr(cs(pill).backgroundColor, barBg), pillIcon: cr(cs(pill).color, cs(pill).backgroundColor) };
});
const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
for (const theme of ['light', 'dark']) {
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await wait(350);
  const t = await measureTabs();
  ok(t.fixed && t.h >= 56 && t.barBg !== t.pageBg, `tema ${theme}: o menu inferior fica fixo e tem cor própria (${t.barBg} sobre ${t.pageBg})`);
  ok(t.off >= 4.5 && t.on >= 4.5 && t.pill >= 3 && t.pillIcon >= 4.5, `tema ${theme}: rótulos ${t.off.toFixed(1)}:1 e ${t.on.toFixed(1)}:1, pílula do item ativo ${t.pill.toFixed(1)}:1, ícone ${t.pillIcon.toFixed(1)}:1`);
}
await page.evaluate((t) => { if (t == null) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }, themeBefore);

// ================================================================= 3. TREINO
step('3. Modo treino: iniciar → exercício → sugestão explicada');
await tap('Iniciar treino');
await page.waitForSelector('.sess');
ok(await hasText('Leg press'), 'abre direto no 1º exercício (Leg press)');
ok(await page.getByRole('button', { name: 'Iniciar exercício' }).count() === 0 && await page.getByRole('button', { name: 'Iniciar série' }).count() === 1, '“Iniciar treino” já inicia o 1º exercício (não pede “Iniciar exercício”)');
ok(await hasText('Série 1 de 3') && await hasText('Como fazer'), 'a 1ª série já mostra o que a apresentação mostrava (instruções, sugestão)');
await wait(500);
await shot('03-intro-leg-press');
ok(await hasText('Por que'), 'sugestão mostra “Por que esta sugestão” — explicação visível') || ok(await hasText('Testar 25 kg'), 'sugestão: testar 25 kg');
const sugTxt = await page.locator('.sug').first().innerText();
ok(/Testar 25 kg/.test(sugTxt), 'sugestão = 25 kg (20 + passo 5 do leg press)');
ok(/3 × 12/.test(sugTxt) && /20 kg/.test(sugTxt) && /moderado/.test(sugTxt), 'explicação cita dados reais: 3 × 12, 20 kg, esforço moderado');
ok(/Posso ignorar\?/.test(sugTxt) && /Sim\./.test(sugTxt), 'responde “Posso ignorar?”');
await page.locator('.sug summary').first().click();
ok(await hasText('Quais dados foram considerados?'), 'seção “Quais dados foram considerados?”');
await shot('04-sugestao-dados');
const wBefore = await sessEval(async () => (await import('/js/store.js')).state.workouts[0].items[0].load);
ok(wBefore === 20, 'sugestão NÃO foi aplicada automaticamente (plano continua 20 kg)');
await tap('Aceitar');
await wait(400);
const wAfter = await sessEval(async () => (await import('/js/store.js')).state.workouts[0].items[0].load);
ok(wAfter === 25, 'após ACEITAR o novo padrão do treino é 25 kg');
const sg = await sessEval(async () => (await import('/js/store.js')).state.suggestions.at(-1));
ok(sg && sg.decision === 'accepted' && sg.currentLoad === 20 && sg.newLoad === 25 && sg.decidedAt, 'decisão registrada (recomendação, decisão, nova carga, data)');

step('4. Série 1: alterar carga SOMENTE HOJE');
await page.waitForSelector('.s-set');
ok(await hasText('Série 1 de 3'), 'série 1 de 3');
ok((await page.locator('.s-set .cell b').first().innerText()) === '25', 'carga alvo hoje = 25 (após aceitar)');
await page.locator('.s-set button.cell').first().click();
await page.waitForSelector('.sheet');
await page.locator('.sheet .stepper-btn[aria-label="Diminuir"]').first().click();
await page.locator('.sheet .stepper-btn[aria-label="Diminuir"]').first().click();
await page.locator('.sheet .stepper-btn[aria-label="Diminuir"]').first().click();
await shot('05-ajustar');
ok(await hasText('Usar somente hoje') && await hasText('Tornar novo padrão'), 'ajuste oferece [USAR SOMENTE HOJE] e [TORNAR NOVO PADRÃO]');
await page.getByRole('button', { name: 'Usar somente hoje' }).click();
await wait(300);
ok((await page.locator('.s-set .cell b').first().innerText()) === '22', 'carga de hoje = 22');
const wToday = await sessEval(async () => (await import('/js/store.js')).state.workouts[0].items[0].load);
ok(wToday === 25, 'plano permanece 25 (alteração só hoje não mexeu no padrão)');
await shot('06-ready');

step('5. Série 1: iniciar, terminar, descanso (+15s, editar), resultado real');
await tap('Iniciar série');
await page.getByRole('button', { name: 'Descansar', exact: true }).waitFor();
await wait(1300);
ok(await page.locator('.timer-big').count() === 0, 'exercício por repetição: o contador de tempo da série não aparece');
ok(await page.getByRole('button', { name: 'Terminei', exact: true }).count() === 0, 'o botão “Terminei” virou “Descansar”');
ok(/^\d\d:\d\d/.test(await text('.s-top .clock')), 'o tempo total do treino continua no topo');
await shot('07-running');
await tap('Descansar');
await page.waitForSelector('.ring');
ok(await hasText('DESCANSO'), 'descanso inicia ao terminar a série');
const r0 = await text('.ring .timer-big');
ok(/^01:(2|3)\d$/.test(r0) || r0 === '01:30', `descanso planejado ~01:30 (${r0})`);
await tap('+15s');
await wait(300);
ok(/^01:4\d$/.test(await text('.ring .timer-big')), '+15s estende o descanso');
// editar para 4 s para esperar o fim
await tap('Editar', { exact: true });
await page.waitForSelector('.sheet .stepper-val');
await page.locator('.sheet .stepper-val').click();
await page.locator('.sheet .stepper-input').fill('5');
await page.locator('.sheet .stepper-input').press('Enter');
await page.getByRole('button', { name: 'Aplicar' }).click();
await wait(300);
// registrar resultado real: 10 reps, esforço Moderado, RIR 2
await page.getByRole('button', { name: 'Ajustar', exact: true }).first().click();
await page.waitForSelector('.s-edit .stepper');
await page.locator('.s-edit .stepper').first().locator('.stepper-btn[aria-label="Diminuir"]').click();
await page.locator('.s-edit .stepper').first().locator('.stepper-btn[aria-label="Diminuir"]').click();
await page.locator('.s-edit .scale-btn', { hasText: 'Moderado' }).click();
await page.locator('.s-edit .scale-btn', { hasText: /^2$/ }).click();
await shot('08-rest-result');
await page.waitForFunction(() => document.querySelector('.bigbtn.go'), null, { timeout: 9000 });
ok(await page.locator('.sess.flash').count() > 0, 'alerta visual ao fim do descanso (flash)');
ok(/Próxima série/i.test(await page.locator('.bigbtn.go').innerText()), 'botão vira “Próxima série” quando o descanso termina');
await shot('09-rest-over');
await tap('Próxima série');
await page.waitForSelector('.s-set');
ok(await hasText('Série 2 de 3'), 'passa para a série 2 de 3');

step('6. Séries 2 e 3 (pulando descanso) e próximo exercício');
for (let i = 0; i < 2; i++) {
  await tap('Iniciar série'); await wait(400); await tap('Descansar');
  await page.waitForSelector('.ring');
  await tap('Pular descanso');
  await wait(200);
}
await page.waitForSelector('.s-s-nothing', { timeout: 500 }).catch(() => {});
ok(await hasText('Extensora', 4000) || await hasText('extensora'), 'depois da 3ª série vai para o próximo exercício (Cadeira extensora)');
await shot('10-next-exercise');
// pular o 2º exercício, depois finalizar mais cedo
await tap('Pular');
await page.getByRole('button', { name: 'Pular', exact: true }).last().click().catch(() => {});
await wait(300);

step('7. Finalizar treino → resumo → como se sentiu');
await page.getByRole('button', { name: 'Menu do treino' }).click();
await page.getByRole('button', { name: /Finalizar treino agora/ }).click();
await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
await page.waitForSelector('text=TREINO CONCLUÍDO');
await shot('11-resumo');
const sumTxt = await page.locator('.s-sum').innerText();
ok(/Exercícios/i.test(sumTxt) && /Séries/i.test(sumTxt) && /Volume/i.test(sumTxt) && /Descanso total/i.test(sumTxt), 'resumo com duração, exercícios, séries, repetições, volume, descanso total');
await page.locator('.scale-btn', { hasText: /^Bem$/ }).click();
await page.locator('.sess textarea').fill('Joelho ok. Aumentei no leg press.');
await tap('Salvar e fechar');
await page.waitForSelector('.sess', { state: 'detached' }); // o handler é assíncrono: só segue depois de fechar de verdade
await page.waitForSelector('.next-card');
const last = await sessEval(async () => (await import('/js/store.js')).state.sessions.at(-1));
ok(last.workoutName === 'Treino A' && last.exercises[0].sets.length === 3, 'treino salvo no histórico (3 séries do leg press)');
const ex0 = last.exercises[0];
ok(ex0.planned.load === 20 && ex0.target.load === 22, 'REGISTRO: planejado 20 kg × alvo de hoje 22 kg (planejado nunca é sobrescrito)');
ok(ex0.sets[0].load === 22 && ex0.sets[0].reps === 10 && ex0.sets[0].plannedReps === 12 && ex0.sets[0].plannedLoad === 20, 'série 1: realizado 22 kg × 10 | planejado 20 kg × 12');
ok(ex0.sets[0].effort === 3 && ex0.sets[0].rir === 2, 'esforço (Moderado) e RIR registrados');
ok(ex0.sets[0].restActual >= 4 && ex0.sets[0].restPlanned === 5, `descanso planejado 5 s × realizado ${ex0.sets[0].restActual} s`);
ok(ex0.sets[0].durationSec >= 1 && last.exercises[1].status === 'skipped', 'duração da série registrada; exercício pulado marcado');
ok(last.feel === 4 && /Aumentei/.test(last.note), 'como se sentiu + observação salvos');
ok(last.durationSec > 0 && last.totals.rest > 0, 'duração total e descanso total registrados');

// ================================================================= 4. TELAS DE ANÁLISE
step('8. Exercício, evolução e calendário refletem o treino');
await page.goto(BASE + '#/exercicios'); await page.waitForSelector('.list');
await page.getByLabel('Buscar exercício').fill('leg press horizontal');
await page.locator('.li', { hasText: 'Leg press horizontal' }).first().click();
await page.waitForSelector('.visual');
await wait(900);
await shot('12-exercicio');
ok(await page.locator('.visual svg').count() > 0, 'tela do exercício mostra a animação (SVG) da modelo');
ok(await hasText('Dados insuficientes'), 'depois de mudar de carga, o sistema não insiste: “dados insuficientes” (só 1 sessão com 22 kg)');
ok((await page.locator('.sug').first().innerText()).includes('1 sessão registrada com 22 kg'), 'explicação cita a contagem real de sessões (1 com 22 kg)');
ok(await page.locator('.tl-item').count() === 4, 'linha do tempo com 4 sessões');
const tl = await page.locator('.tl-item').first().innerText();
ok(/22 kg × 10/.test(tl), 'linha do tempo mostra “22 kg × 10” da última sessão');
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await shotFull('13-exercicio-full');

await page.goto(BASE + '#/evolucao'); await page.waitForSelector('.chart svg');
await wait(300);
ok(await page.locator('.chart svg').count() >= 3, 'evolução: gráficos renderizados');
for (const p of ['7 dias', '30 dias', '3 meses', '6 meses', '1 ano', 'Tudo']) ok(await page.getByRole('button', { name: p, exact: true }).count() > 0, `período “${p}” disponível`);
await tap('30 dias'); await wait(200);
await shotFull('14-evolucao');
await page.getByText('Ver como tabela').first().click();
ok(await page.locator('.chart table').count() > 0, 'visão de tabela (acessível) disponível');

await page.goto(BASE + '#/calendario'); await page.waitForSelector('.cal-grid');
await wait(200);
ok(await page.locator('.cal-day .dot').count() >= 1, 'calendário marca o dia com atividade (treino de hoje)');
await page.locator('.cal-day.today').click();
await shot('15-calendario');
ok(await hasText('Treino A'), 'toque no dia lista o Treino A');
await page.locator('.act-item', { hasText: 'Treino A' }).first().click();
await page.waitForSelector('.sheet');
ok(await hasText('Planejado:') && await hasText('Realizado'), 'detalhe mostra PLANEJADO × REALIZADO');
await shot('16-detalhe-sessao');
await page.keyboard.press('Escape');

// ================================================================= 5. ATIVIDADES E BEM-ESTAR
step('9. Atividade (corrida) e bem-estar');
await wait(300);
await page.getByRole('button', { name: 'Adicionar atividade' }).click();
await page.waitForSelector('.sheet');
await page.locator('.sheet input[placeholder="min"]').fill('30');
await page.locator('.sheet input[placeholder="km"]').fill('5');
ok(await hasText('Ritmo: 6:00 /km'), 'ritmo calculado automaticamente (30 min / 5 km = 6:00 /km)');
await shot('17-atividade');
await page.getByRole('button', { name: 'Salvar', exact: true }).click();
await wait(400);
const act = await sessEval(async () => (await import('/js/store.js')).state.activities.at(-1));
ok(act && act.type === 'corrida' && act.durationMin === 30 && act.distanceKm === 5 && Math.round(act.paceSecKm) === 360, 'atividade salva com duração, distância e ritmo');
// vôlei não exige distância
await page.getByRole('button', { name: 'Adicionar atividade' }).click();
await page.waitForSelector('.sheet');
await page.getByRole('button', { name: 'Vôlei', exact: true }).click();
ok(await page.locator('.sheet input[placeholder="km"]').count() === 0, 'vôlei não pede distância (campos adaptáveis)');
await page.keyboard.press('Escape');
await page.waitForSelector('.sheet >> nth=1');
ok(/Descartar alterações/.test(await page.locator('.sheet').last().innerText()), 'fechar a folha com alteração (Esc) pede confirmação em vez de perder o que foi mudado');
await page.locator('.sheet').last().getByRole('button', { name: 'Descartar', exact: true }).click();
await page.waitForFunction(() => !document.querySelector('.sheet'), null, { timeout: 4000 });

await page.goto(BASE + '#/bem-estar'); await page.waitForSelector('.q');
await page.locator('.q', { hasText: 'Energia' }).locator('.wq-opt', { hasText: 'Alta' }).first().click();
await page.locator('.q', { hasText: 'Fadiga muscular' }).locator('.wq-opt', { hasText: 'Leve' }).click();
await page.locator('.q', { hasText: 'Humor' }).locator('.wq-opt', { hasText: 'Bom' }).click();
await page.locator('.q', { hasText: 'Menstruação' }).locator('.switch').first().click();
await page.locator('.q', { hasText: 'Menstruação' }).getByText('Primeiro dia deste ciclo').click();
// ---- Bem-estar: respostas com ÍCONE e uma cor pastel por PERGUNTA (claro e escuro) ----
const humorBom = page.locator('.q', { hasText: 'Humor' }).locator('.wq-opt', { hasText: 'Bom' });
ok(await humorBom.getAttribute('aria-pressed') === 'true', 'resposta escolhida fica marcada (aria-pressed)');
await humorBom.click();
ok(await page.locator('.wq[data-q="mood"] .wq-opt[aria-pressed="true"]').count() === 0, 'tocar de novo na resposta escolhida limpa a escolha');
await humorBom.click();
ok(await humorBom.getAttribute('aria-pressed') === 'true', 'e dá para escolher outra vez');
await page.locator('.q', { hasText: 'Menstruação' }).locator('.wq-opt', { hasText: 'Médio' }).click();
await page.locator('.q', { hasText: 'Cansaço geral' }).locator('.wq-opt', { hasText: 'Moderado' }).click();
await page.locator('.q', { hasText: 'Recuperação' }).locator('.wq-opt', { hasText: 'Boa' }).click();
const wbUi = await page.evaluate(() => {
  const panels = [...document.querySelectorAll('.wq')];
  const bg = new Set(panels.map((p) => getComputedStyle(p).backgroundColor));
  const opts = [...document.querySelectorAll('.wq-opt')];
  const groupsDistinct = [...document.querySelectorAll('.wq-scale')].every((g) => { const svgs = [...g.querySelectorAll('.wq-opt svg')].map((s) => s.innerHTML); return svgs.length === g.children.length && new Set(svgs).size === svgs.length; });
  return {
    panels: panels.length, colors: bg.size, opts: opts.length,
    withIcon: opts.filter((o) => o.querySelector('svg path, svg circle, svg rect') && o.querySelector('svg').getAttribute('aria-hidden') === 'true').length,
    withLabel: opts.filter((o) => (o.querySelector('.wq-lab')?.textContent || '').trim().length > 0).length,
    groupsDistinct,
  };
});
ok(wbUi.panels === 7 && wbUi.colors === 7, `cada pergunta tem a sua cor pastel (${wbUi.colors} fundos diferentes em ${wbUi.panels} painéis)`);
ok(wbUi.opts === 28 && wbUi.withIcon === 28 && wbUi.withLabel === 28, `todas as ${wbUi.opts} respostas têm ícone (decorativo, aria-hidden) e rótulo`);
ok(wbUi.groupsDistinct, 'dentro de cada pergunta, cada resposta tem um ícone diferente');
const groupsNamed = await Promise.all(['Humor', 'Energia', 'Cansaço geral', 'Fadiga muscular', 'Recuperação', 'Fluxo'].map((n) => page.getByRole('group', { name: n, exact: true }).count()));
ok(groupsNamed.every((c) => c === 1), 'cada grupo de respostas tem nome acessível (o título da pergunta)');

// contraste real (renderizado) nos dois temas: botão escolhido, não escolhido, ícone e título
const measureContrast = () => page.evaluate(() => {
  const px = (c) => { const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#000'; x.clearRect(0, 0, 1, 1); x.fillStyle = c; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const cr = (a, b) => { const [hi, lo] = [L(px(a)), L(px(b))].sort((m, n) => n - m); return (hi + 0.05) / (lo + 0.05); };
  const min = { selText: 99, selIcon: 99, text: 99, icon: 99, title: 99 }, worst = {};
  const note = (k, v, who) => { if (v < min[k]) { min[k] = v; worst[k] = who; } };
  for (const panel of document.querySelectorAll('.wq')) {
    const who = panel.dataset.q, pbg = getComputedStyle(panel).backgroundColor;
    note('title', cr(getComputedStyle(panel.querySelector('h4')).color, pbg), who);
    for (const o of panel.querySelectorAll('.wq-opt')) {
      if (!o.offsetParent) continue;
      const ob = getComputedStyle(o).backgroundColor, on = o.getAttribute('aria-pressed') === 'true';
      note(on ? 'selText' : 'text', cr(getComputedStyle(o.querySelector('.wq-lab')).color, ob), who);
      note(on ? 'selIcon' : 'icon', cr(getComputedStyle(o.querySelector('.wq-ico')).color, ob), who);
    }
  }
  return { min, worst };
});
const origTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
for (const theme of ['light', 'dark']) {
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await wait(450); // deixa a transição de cor terminar
  const { min } = await measureContrast();
  ok(min.selText >= 4.5 && min.selIcon >= 4.5, `tema ${theme}: resposta escolhida legível (texto ${min.selText.toFixed(1)}:1, ícone ${min.selIcon.toFixed(1)}:1)`);
  ok(min.text >= 4.5 && min.icon >= 3 && min.title >= 4.5, `tema ${theme}: rótulos ${min.text.toFixed(1)}:1, ícones ${min.icon.toFixed(1)}:1 e títulos ${min.title.toFixed(1)}:1 acima do mínimo (4,5 / 3 / 4,5)`);
  const distinct = await page.evaluate(() => new Set([...document.querySelectorAll('.wq')].map((p) => getComputedStyle(p).backgroundColor)).size);
  ok(distinct === 7, `tema ${theme}: as 7 perguntas continuam com cores diferentes`);
}
await page.evaluate((t) => { if (t == null) document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }, origTheme);
await page.getByRole('button', { name: 'Salvar', exact: true }).click();
await wait(400);
const wb = await sessEval(async () => [...(await import('/js/store.js')).state.wellbeing.values()][0]);
ok(wb && wb.energy === 4 && wb.fatigue === 2 && wb.mood === 4 && wb.period === true && wb.cycleStart === true, 'bem-estar salvo (energia, fadiga, humor, menstruação, início do ciclo)');
ok(await hasText('Treinos × bem-estar'), 'comparação treinos × bem-estar disponível');
await page.getByRole('button', { name: 'Ciclo', exact: true }).click();
await wait(200);
ok(await hasText('Não indicam causa') || await hasText('não indica causa'), 'aviso: sem causalidade médica/diagnóstico');
await shotFull('18-bem-estar');

// ================================================================= 6. PERSISTÊNCIA
step('10. Fechar e reabrir: persistência');
await page.close();
page = await ctx.newPage(); wire(page);
await page.goto(BASE); await page.waitForSelector('.next-card');
const counts = await sessEval(async () => { const s = (await import('/js/store.js')).state; return [s.sessions.length, s.activities.length, s.wellbeing.size, s.workouts.length, s.profile.name]; });
ok(counts[0] === 4 && counts[1] === 1 && counts[2] === 1 && counts[3] === 3 && counts[4] === 'Ana Souza', `dados mantidos após reabrir (${counts.join(', ')})`);
ok((await text('.next-card h2')) === 'Treino B', 'próximo treino avançou para Treino B');

step('11. Treino em andamento sobrevive a fechar o app');
await tap('Iniciar treino');
await page.waitForSelector('.sess');
await tap('Iniciar série'); await wait(500);
await page.close();
page = await ctx.newPage(); wire(page);
await page.goto(BASE);
await page.waitForSelector('.sess', { timeout: 6000 });
ok(await hasText('Série 1 de 3') && await page.getByRole('button', { name: /^(Descansar|Terminei)$/ }).count() === 1, 'sessão retomada automaticamente no ponto em que estava');
const clockResumed = await text('.s-top .clock');
ok(/^\d\d:\d\d$/.test(clockResumed) && clockResumed !== '00:00', `o tempo do treino continua contando por carimbo de tempo (${clockResumed})`);
await page.getByRole('button', { name: 'Menu do treino' }).click();
await page.getByRole('button', { name: /Descartar este treino/ }).click();
await page.locator('.sheet').getByRole('button', { name: 'Descartar', exact: true }).click();
await wait(500);
ok(await page.locator('.sess').count() === 0, 'treino descartado pelo menu');

// ================================================================= 7. OFFLINE
step('12. Offline (service worker + cache)');
await page.reload();
await page.evaluate(async () => { await navigator.serviceWorker.ready; });
await wait(800);
await page.reload(); await page.waitForSelector('.next-card');
const swState = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { active: !!r?.active, controlled: !!navigator.serviceWorker.controller }; });
ok(swState.active && swState.controlled, 'service worker ativo e controlando a página');
await ctx.setOffline(true); fake.setOffline(true);
await page.reload(); await page.waitForSelector('.next-card', { timeout: 6000 });
ok(await hasText('Treino B'), 'app abre sem internet');
await page.goto(BASE + '#/exercicios'); await page.waitForSelector('.list');
ok(await page.locator('.thumb svg').count() > 3, 'biblioteca com animações funciona offline');
await page.goto(BASE + '#/'); await page.waitForSelector('.next-card');
await tap('Iniciar treino'); await page.waitForSelector('.sess');
await tap('Iniciar série'); await wait(400); await page.getByRole('button', { name: /^(Descansar|Terminei)$/ }).click();
await page.waitForSelector('.ring');
ok(true, 'treino (série + descanso) funciona offline');
await page.getByRole('button', { name: 'Menu do treino' }).click();
await page.getByRole('button', { name: /Finalizar treino agora/ }).click();
await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
await page.waitForSelector('text=TREINO CONCLUÍDO');
await tap('Salvar e fechar');
await page.waitForSelector('.sess', { state: 'detached' }); // o handler é assíncrono: só segue depois de fechar de verdade
await page.waitForSelector('.next-card');
const n5 = await sessEval(async () => (await import('/js/store.js')).state.sessions.length);
ok(n5 === 5, 'sessão registrada offline e salva (5 sessões)');
await ctx.setOffline(false); fake.setOffline(false);

// ================================================================= 8. EXPORTAR / IMPORTAR
step('13. Exportar, apagar tudo e importar de volta');
await page.goto(BASE + '#/perfil'); await page.waitForSelector('.card');
await tap('Exportar dados', { exact: true });
await page.waitForSelector('.sheet');
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 6000 }), page.getByRole('button', { name: 'Exportar', exact: true }).click()]);
const file = `${OUT}/backup.json`;
await dl.saveAs(file);
ok(statSync(file).size > 1000 && /^treinos-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), `arquivo de backup gerado (${dl.suggestedFilename()}, ${statSync(file).size} bytes)`);
await page.evaluate(async () => { const s = await import('/js/store.js'); await s.eraseEverything(); });
ok(await page.evaluate(async () => (await import('/js/store.js')).state.sessions.length) === 0, 'dados apagados');
await page.goto(BASE + '#/boas-vindas'); await page.waitForSelector('.hero');
await page.evaluate(async () => { const s = await import('/js/store.js'); await s.saveProfile({ name: 'Temp' }); });
await page.goto(BASE + '#/perfil'); await page.waitForSelector('.card');
const [fc] = await Promise.all([page.waitForEvent('filechooser'), tap('Importar dados', { exact: true })]);
await fc.setFiles(file);
await page.waitForSelector('.sheet');
await page.getByRole('button', { name: 'Substituir tudo' }).click();
await page.getByRole('button', { name: 'Substituir', exact: true }).click();
await page.waitForSelector('.next-card', { timeout: 6000 });
const after = await sessEval(async () => { const s = (await import('/js/store.js')).state; return [s.sessions.length, s.activities.length, s.profile.name]; });
ok(after[0] === 5 && after[1] === 1 && after[2] === 'Ana Souza', `importação restaurou tudo (${after.join(', ')})`);

// ================================================================= RESULTADO
console.log('\n──────────────────────────────');
const realErrors = errors.filter((e) => !/Failed to load resource.*503|net::ERR_INTERNET_DISCONNECTED/.test(e));
if (realErrors.length) { console.log('Erros de console/página:'); realErrors.forEach((e) => console.log('  !', e)); }
console.log(`${passed} verificações OK, ${failed} falharam, ${realErrors.length} erros de console`);
await env.close();
process.exit(failed || realErrors.length ? 1 : 0);

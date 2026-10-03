// E2E das telas de EDIÇÃO: toda tela onde se muda algo tem "Salvar" e "Descartar"; nada é gravado antes de salvar;
// sair com alterações (aba, seta de voltar, botão voltar do aparelho) pergunta o que fazer.
import { makeEnv, reporter } from './harness.mjs';
const env = await makeEnv({ port: 8145 });
const R = reporter();
const { session } = env.fake.createUser({ email: 'edu@teste.com', password: 'senha-forte-1', name: 'Edu' });
const dev = await env.device({ session, name: 'edit' });
const p = dev.page, BASE = env.BASE;
const ev = (fn, a) => p.evaluate(fn, a);
const wait = (ms) => p.waitForTimeout(ms);
const top = () => p.locator('.sheet').last();                                     // folha de cima (diálogos)
const dlg = (name) => top().getByRole('button', { name, exact: true });
const bar = () => p.locator('.editbar').first();
const barBtn = (name) => bar().getByRole('button', { name, exact: true });
const noSheets = () => p.waitForFunction(() => !document.querySelector('.sheet'), null, { timeout: 4000 });
const title = async () => (await top().locator('.sheet-head h2').innerText()).trim();
const hash = () => ev(() => location.hash);
const wName = (id) => ev(async (i) => (await import('/js/store.js')).getWorkout(i)?.name, id);
const note = () => p.locator('.editbar .eb-note').first().innerText();
const rows = (tab) => p.locator('#tabbar a', { hasText: tab });

try {
  await p.goto(BASE); await p.waitForSelector('.hero');
  await ev(async () => { const s = await import('/js/store.js'); await s.saveProfile({ name: 'Edu', age: 30 }); await s.loadSeedWorkouts(); });
  const W = await ev(async () => { const w = (await import('/js/store.js')).state.workouts[0]; return { id: w.id, name: w.name, n: w.items.length }; });
  const openEditor = async () => { await p.goto(BASE + '#/treinos'); await p.waitForSelector('.wk-card'); await p.locator('.wk-card').first().getByRole('button', { name: 'Editar', exact: true }).click(); await p.waitForSelector('.editbar'); };
  const nameIn = () => p.getByLabel('Nome do treino');

  // ============================================================ A. editor de treino: descartar
  R.step('A. Editor de treino: “Descartar” e “Salvar” sempre à vista; nada é gravado antes de salvar');
  await openEditor();
  R.ok(await barBtn('Descartar').isVisible() && await barBtn('Salvar').isVisible(), 'o editor mostra “Descartar” e “Salvar” (barra fixa)');
  await nameIn().fill('Segunda alterada');
  R.ok((await note()) === 'Alterações não salvas', 'ao mudar algo a barra avisa “Alterações não salvas”');
  R.ok((await wName(W.id)) === W.name, 'nada foi gravado ainda: as mudanças ficam só na tela');
  await barBtn('Descartar').click(); await p.waitForSelector('.sheet');
  R.ok((await title()) === 'Descartar alterações?', 'Descartar com alterações pede confirmação');
  await dlg('Continuar editando').click(); await noSheets();
  R.ok((await nameIn().inputValue()) === 'Segunda alterada', 'continuar editando mantém o que foi digitado');
  await barBtn('Descartar').click(); await dlg('Descartar').click(); await noSheets();
  await p.waitForSelector('.wk-card');
  R.ok((await hash()) === '#/treinos' && (await wName(W.id)) === W.name, 'descartar volta para a lista e não grava nada');

  // ============================================================ B. salvar
  R.step('B. Salvar grava e volta para a lista');
  await openEditor();
  await nameIn().fill('Segunda forte');
  await barBtn('Salvar').click();
  await p.waitForSelector('.wk-card');
  R.ok((await wName(W.id)) === 'Segunda forte' && (await p.locator('.wk-card h3').first().innerText()) === 'Segunda forte', 'salvar grava o nome e a lista já mostra o novo nome');
  await openEditor();
  await nameIn().fill('   ');
  await barBtn('Salvar').click(); await wait(300);
  R.ok((await hash()).startsWith('#/treino/') && (await wName(W.id)) === 'Segunda forte', 'sem nome o treino não salva (continua na tela)');
  await barBtn('Descartar').click(); await dlg('Descartar').click(); await noSheets();

  // ============================================================ C. aviso ao sair pela aba
  R.step('C. Sair com alterações pela barra de abas: pergunta (salvar / descartar / continuar editando)');
  await openEditor();
  const editorHash = await hash();
  await nameIn().fill('Segunda via aba');
  await rows('Início').click(); await p.waitForSelector('.sheet');
  R.ok((await title()) === 'Alterações não salvas' && await dlg('Salvar').isVisible() && await dlg('Descartar').isVisible() && await dlg('Continuar editando').isVisible(), 'aparece “Alterações não salvas” com Salvar / Descartar / Continuar editando');
  await dlg('Continuar editando').click(); await noSheets();
  R.ok((await hash()) === editorHash && (await nameIn().inputValue()) === 'Segunda via aba', 'continuar editando: fica na mesma tela com o texto digitado');
  await rows('Início').click(); await p.waitForSelector('.sheet'); await dlg('Descartar').click(); await noSheets();
  await p.waitForSelector('.next-card');
  R.ok((await wName(W.id)) === 'Segunda forte', 'descartar: vai para a outra tela sem gravar');
  await openEditor();
  await nameIn().fill('Segunda salva pela aba');
  await rows('Início').click(); await p.waitForSelector('.sheet'); await dlg('Salvar').click(); await noSheets();
  await p.waitForSelector('.next-card');
  R.ok((await wName(W.id)) === 'Segunda salva pela aba', 'salvar: grava e segue para a outra tela');

  // ============================================================ D. botão voltar do aparelho
  R.step('D. Botão voltar do aparelho com alterações');
  await p.goto(BASE + '#/treinos'); await p.waitForSelector('.wk-card');
  await p.locator('.wk-card').first().getByRole('button', { name: 'Editar', exact: true }).click(); await p.waitForSelector('.editbar');
  const h1 = await hash();
  await nameIn().fill('Segunda voltar');
  await p.goBack(); await p.waitForSelector('.sheet');
  R.ok((await title()) === 'Alterações não salvas', 'voltar do aparelho também pergunta');
  await dlg('Continuar editando').click(); await noSheets(); await wait(200);
  R.ok((await hash()) === h1 && (await nameIn().inputValue()) === 'Segunda voltar', 'continuar editando: o histórico não se perde e o texto continua');
  await p.goBack(); await p.waitForSelector('.sheet');
  await p.goBack(); await wait(500);
  R.ok((await p.locator('.sheet').count()) === 1 && (await hash()) === h1, 'apertar voltar de novo com a pergunta aberta não empilha outra pergunta');
  await dlg('Continuar editando').click(); await noSheets();
  await p.goBack(); await p.waitForSelector('.sheet'); await dlg('Descartar').click(); await noSheets();
  await p.waitForSelector('.wk-card');
  R.ok((await hash()) === '#/treinos' && (await wName(W.id)) === 'Segunda salva pela aba', 'descartar: volta para a lista sem gravar');
  const arrow = await p.locator('.wk-card').first().getByRole('button', { name: 'Editar', exact: true }).click().then(() => p.waitForSelector('.editbar'));
  await nameIn().fill('x');
  await p.getByRole('button', { name: 'Voltar', exact: true }).click(); await p.waitForSelector('.sheet');
  R.ok((await title()) === 'Alterações não salvas', 'a seta de voltar do cabeçalho também pergunta');
  await dlg('Descartar').click(); await noSheets(); await p.waitForSelector('.wk-card');

  // ============================================================ E. exercício
  R.step('E. Editor de exercício: Descartar | Salvar');
  const exists = (nm) => ev(async (n) => [...(await import('/js/store.js')).state.exercises.values()].some((e) => e.name === n), nm);
  await p.goto(BASE + '#/treinos'); await p.goto(BASE + '#/exercicio/novo'); await p.waitForSelector('input[aria-label="Nome"]');
  R.ok(await barBtn('Descartar').isVisible() && await barBtn('Salvar').isVisible(), 'o editor de exercício mostra “Descartar” e “Salvar”');
  await p.getByLabel('Nome', { exact: true }).fill('Exercício de teste E');
  await barBtn('Descartar').click(); await dlg('Descartar').click(); await noSheets(); await wait(300);
  R.ok(!(await exists('Exercício de teste E')) && !(await hash()).includes('novo'), 'descartar: o exercício não é criado e a tela fecha');
  await p.goto(BASE + '#/exercicio/novo'); await p.waitForSelector('input[aria-label="Nome"]');
  await p.getByLabel('Nome', { exact: true }).fill('Exercício de teste E');
  await barBtn('Salvar').click(); await p.waitForSelector('.visual');
  R.ok(await exists('Exercício de teste E'), 'salvar: o exercício é criado');
  const exId = await ev(async () => [...(await import('/js/store.js')).state.exercises.values()].find((e) => e.name === 'Exercício de teste E').id);
  await p.goto(BASE + `#/exercicio/${exId}/editar`); await p.waitForSelector('input[aria-label="Nome"]');
  await p.getByLabel('Nome', { exact: true }).fill('Nome mudado');
  await rows('Evolução').click(); await p.waitForSelector('.sheet'); R.ok((await title()) === 'Alterações não salvas', 'sair do exercício editado pela aba pergunta');
  await dlg('Continuar editando').click(); await noSheets();
  await barBtn('Salvar').click(); await p.waitForSelector('.visual');
  R.ok(await exists('Nome mudado') && !(await exists('Exercício de teste E')), 'salvar altera o nome');

  // ============================================================ F. perfil
  R.step('F. Perfil: Descartar | Salvar perfil só ficam ativos quando há alterações');
  await p.goto(BASE + '#/perfil'); await p.waitForSelector('.editbar');
  R.ok(await barBtn('Salvar perfil').isDisabled() && await barBtn('Descartar').isDisabled(), 'sem alterações os dois botões ficam desativados');
  await p.getByLabel('Nome', { exact: true }).fill('Edu Mudou');
  R.ok(!(await barBtn('Salvar perfil').isDisabled()) && !(await barBtn('Descartar').isDisabled()) && (await note()) === 'Alterações não salvas', 'ao editar, ativam e avisam');
  await barBtn('Descartar').click(); await dlg('Descartar').click(); await noSheets(); await wait(400);
  R.ok((await p.getByLabel('Nome', { exact: true }).inputValue()) === 'Edu', 'descartar volta ao que estava salvo');
  await p.getByLabel('Nome', { exact: true }).fill('Edu Salvo');
  await rows('Início').click(); await p.waitForSelector('.sheet'); R.ok((await title()) === 'Alterações não salvas', 'sair do perfil com alterações pergunta');
  await dlg('Continuar editando').click(); await noSheets();
  await barBtn('Salvar perfil').click(); await wait(400);
  R.ok((await ev(async () => (await import('/js/store.js')).state.profile.name)) === 'Edu Salvo' && await barBtn('Salvar perfil').isDisabled(), 'salvar grava e volta a desativar os botões');
  await p.getByLabel('Nome', { exact: true }).fill('Edu'); await barBtn('Salvar perfil').click(); await wait(300);

  // ============================================================ G. bem-estar
  R.step('G. Bem-estar: Descartar | Salvar; trocar de dia com alterações pergunta');
  await p.goto(BASE + '#/bem-estar'); await p.waitForSelector('.editbar');
  R.ok(await barBtn('Salvar').isDisabled() && await barBtn('Descartar').isDisabled(), 'sem respostas os botões ficam desativados');
  const mood = (label) => p.locator('.wq[data-q="mood"] .wq-opt', { hasText: label });
  await mood('Bom').click();
  R.ok(!(await barBtn('Salvar').isDisabled()) && (await note()) === 'Alterações não salvas', 'ao responder, Salvar ativa e avisa');
  await barBtn('Descartar').click(); await dlg('Descartar').click(); await noSheets(); await wait(300);
  R.ok((await p.locator('.wq[data-q="mood"] .wq-opt[aria-pressed="true"]').count()) === 0, 'descartar limpa as respostas');
  await mood('Bom').click();
  await p.getByRole('button', { name: 'Dia anterior' }).click(); await p.waitForSelector('.sheet');
  R.ok((await title()) === 'Alterações não salvas', 'trocar de dia com respostas não salvas pergunta');
  await dlg('Continuar editando').click(); await noSheets();
  R.ok(await mood('Bom').getAttribute('aria-pressed') === 'true' && !(await p.getByText('Ir para hoje').count()), 'continuar editando: continua no mesmo dia');
  await barBtn('Salvar').click(); await wait(400);
  R.ok((await ev(async () => (await import('/js/store.js')).state.wellbeing.size)) === 1 && await barBtn('Salvar').isDisabled() && await p.locator('.editbar button[aria-label="Apagar registro do dia"]').isVisible(), 'salvar grava, desativa os botões e mostra “apagar registro”');
  await p.getByRole('button', { name: 'Dia anterior' }).click(); await p.waitForSelector('.cal-head .link');
  R.ok(await p.getByText('Ir para hoje').count() === 1, 'sem alterações trocar de dia não pergunta nada');

  // ============================================================ H. atividade (folha)
  R.step('H. Atividade: Descartar | Salvar; fechar com dados digitados confirma');
  const nActs = () => ev(async () => (await import('/js/store.js')).state.activities.length);
  await p.goto(BASE + '#/'); await p.waitForSelector('.next-card');
  await p.getByRole('button', { name: 'Registrar atividade' }).click(); await p.waitForSelector('.sheet input[placeholder="min"]');
  R.ok(await dlg('Descartar').isVisible() && await dlg('Salvar').isVisible(), 'a folha tem “Descartar” e “Salvar”');
  await p.locator('.sheet input[placeholder="min"]').fill('20');
  await top().getByRole('button', { name: 'Fechar' }).click(); await p.waitForSelector('.sheet >> nth=1');
  R.ok((await title()) === 'Descartar alterações?', 'fechar no X com dados digitados pede confirmação');
  await dlg('Continuar editando').click(); await wait(350);
  R.ok(await p.locator('.sheet input[placeholder="min"]').inputValue() === '20', 'continuar editando mantém os dados');
  await dlg('Descartar').click(); await noSheets();
  R.ok((await nActs()) === 0, 'Descartar fecha sem gravar');
  await p.getByRole('button', { name: 'Registrar atividade' }).click(); await p.waitForSelector('.sheet input[placeholder="min"]');
  await p.locator('.sheet input[placeholder="min"]').fill('25'); await dlg('Salvar').click(); await noSheets();
  R.ok((await nActs()) === 1, 'Salvar grava a atividade');

  // ============================================================ J. criar exercício no meio da edição do treino
  R.step('J. “Criar exercício” no meio da edição do treino não perde o que foi digitado');
  await openEditor();
  await nameIn().fill('Segunda com desvio');
  await p.getByRole('button', { name: 'Adicionar exercícios' }).click(); await p.waitForSelector('.sheet .finder');
  await p.locator('.sheet input[aria-label="Buscar exercício"]').fill('zzxxyy');
  await p.locator('.sheet .finder-list').getByRole('button', { name: /Criar/ }).first().click();
  await p.waitForSelector('input[aria-label="Nome"]');
  R.ok((await p.getByLabel('Nome', { exact: true }).inputValue()) === 'zzxxyy', 'o novo exercício já vem com o nome buscado');
  await barBtn('Salvar').click(); await p.waitForSelector('.ex-row');
  R.ok((await nameIn().inputValue()) === 'Segunda com desvio' && (await p.locator('.ex-row').count()) === W.n + 1 && (await note()) === 'Alterações não salvas', 'voltou ao treino com o texto digitado, o exercício novo na lista e ainda sem salvar');
  R.ok((await wName(W.id)) === 'Segunda salva pela aba' && (await ev(async (id) => (await import('/js/store.js')).getWorkout(id).items.length, W.id)) === W.n, 'o treino salvo continua igual (nada foi gravado)');
  await barBtn('Descartar').click(); await dlg('Descartar').click(); await noSheets(); await p.waitForSelector('.wk-card');
  R.ok((await wName(W.id)) === 'Segunda salva pela aba', 'descartar o treino não desfaz o exercício criado (ele já estava salvo na biblioteca)');
  R.ok(await exists('zzxxyy'), 'o exercício criado continua na biblioteca');

  // ============================================================ K. treino em andamento
  R.step('K. Treino em andamento: resultado da série e resumo com Descartar | Salvar');
  await ev(async () => {
    const s = await import('/js/store.js');
    const ex = [...s.state.exercises.values()].find((e) => /Leg press/i.test(e.name) && e.repUnit === 'reps');
    const w = s.blankWorkout(); w.name = 'Teste sessão'; w.items = [s.newWorkoutItem(ex.id, { sets: 3, reps: 12, load: 40, rest: 90 })]; await s.saveWorkout(w);
  });
  await p.goto(BASE + '#/'); await p.waitForSelector('.next-card'); await p.goto(BASE + '#/treinos'); await p.waitForSelector('.wk-card');
  await p.locator('.wk-card').filter({ has: p.getByRole('heading', { name: 'Teste sessão', exact: true }) }).getByRole('button', { name: 'Iniciar treino' }).click(); await p.waitForSelector('.sess');
  // folha "Ajustar" (carga/reps de hoje)
  await p.locator('.s-set button.cell').first().click(); await p.waitForSelector('.sheet .stepper');
  R.ok(await top().getByRole('button', { name: 'Descartar', exact: true }).isVisible() && await top().getByRole('button', { name: 'Usar somente hoje' }).isVisible(), 'a folha “Ajustar” tem “Descartar” além de “Usar somente hoje” e “Tornar novo padrão”');
  await top().getByRole('button', { name: 'Descartar', exact: true }).click(); await noSheets();
  await p.getByRole('button', { name: 'Iniciar série' }).click(); await wait(300);
  await p.getByRole('button', { name: 'Descansar', exact: true }).click(); await p.waitForSelector('.ring');
  const summary = () => p.locator('.s-edit .row b').first().innerText();
  const before = await summary();
  await p.getByRole('button', { name: 'Ajustar', exact: true }).first().click(); await p.waitForSelector('.s-edit .stepper');
  R.ok(await p.locator('.s-edit').getByRole('button', { name: 'Descartar', exact: true }).isVisible() && await p.locator('.s-edit').getByRole('button', { name: 'Salvar', exact: true }).isVisible(), 'o resultado da série tem “Descartar” e “Salvar”');
  await p.locator('.s-edit .stepper').first().locator('.stepper-btn[aria-label="Diminuir"]').click();
  R.ok((await summary()) === before, 'enquanto edita, o resultado salvo não muda');
  await p.locator('.s-edit').getByRole('button', { name: 'Descartar', exact: true }).click(); await wait(200);
  R.ok((await summary()) === before && !(await p.locator('.s-edit .stepper').count()), 'descartar fecha sem mudar o resultado');
  await p.getByRole('button', { name: 'Ajustar', exact: true }).first().click(); await p.waitForSelector('.s-edit .stepper');
  await p.locator('.s-edit .stepper').first().locator('.stepper-btn[aria-label="Diminuir"]').click();
  await p.locator('.s-edit').getByRole('button', { name: 'Salvar', exact: true }).click(); await wait(200);
  R.ok((await summary()) !== before, 'salvar aplica o resultado editado');
  const saved1 = await summary();
  await p.getByRole('button', { name: 'Ajustar', exact: true }).first().click(); await p.waitForSelector('.s-edit .stepper');
  await p.locator('.s-edit .stepper').first().locator('.stepper-btn[aria-label="Diminuir"]').click();
  await p.getByRole('button', { name: 'Pular descanso' }).click(); await p.waitForSelector('.s-set');
  const reps = await ev(async () => (await (await import('/js/store.js')).getDraft()).exercises[0].sets[0].reps);
  R.ok(reps === 10, `seguir em frente com a edição aberta aplica o que foi digitado (reps = ${reps}, sem perder o ajuste)`);
  // resumo
  await p.getByRole('button', { name: 'Menu do treino' }).click(); await p.getByRole('button', { name: /Finalizar treino agora/ }).click(); await dlg('Finalizar').click();
  await p.waitForSelector('text=TREINO CONCLUÍDO');
  R.ok(await p.getByRole('button', { name: 'Descartar alterações' }).count() === 0, 'resumo sem alterações: só “Salvar e fechar” e “Ver evolução”');
  await p.locator('.scale-btn', { hasText: /^Bem$/ }).click();
  R.ok(await p.getByRole('button', { name: 'Descartar alterações' }).count() === 1, 'ao marcar “como se sentiu” aparece “Descartar alterações”');
  await p.getByRole('button', { name: 'Descartar alterações' }).click(); await p.waitForSelector('.next-card');
  const feel = await ev(async () => (await import('/js/store.js')).state.sessions.at(-1).feel ?? null);
  R.ok(feel === null && (await ev(async () => (await import('/js/store.js')).state.sessions.length)) === 1, 'descartar não grava a sensação e o treino continua no histórico');
} catch (e) {
  console.log('\n✗ EXCEÇÃO:', e.message.split('\n').slice(0, 4).join(' | ')); R.ok(false, `exceção: ${e.message.split('\n')[0]}`);
  try { await p.screenshot({ path: 'tests/e2e/out/edit-falha.png' }); } catch { /* */ }
}
const good = R.done(env.errors);
await env.close();
process.exit(good ? 0 : 1);

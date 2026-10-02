// E2E da NUVEM: cadastro, catálogo, busca, offline → online, 2 aparelhos, 2 usuários, mídia, migração, apagar dados.
// O Supabase é simulado (tests/e2e/fake-supabase.mjs); a segurança REAL (RLS) está em supabase/tests/rls_multiuser.sql.
import { makeEnv, reporter, catalogId } from './harness.mjs';
import { mkdirSync } from 'node:fs';

mkdirSync('tests/e2e/out', { recursive: true });
const env = await makeEnv({ port: 8142, autoconfirm: false });
const R = reporter();
const { fake } = env;
const waitFor = async (fn, ms = 9000, what = 'condição') => { const t = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch { /* tenta de novo */ } if (Date.now() - t > ms) throw new Error(`tempo esgotado: ${what}`); await new Promise((r) => setTimeout(r, 120)); } };
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const tap = (page, name, o = {}) => page.getByRole('button', { name, exact: o.exact ?? false }).first().click({ timeout: 4000 });
const hasText = (page, t, ms = 4000) => page.getByText(t, { exact: false }).first().waitFor({ timeout: ms }).then(() => true).catch(() => false);
const slugId = (slug) => catalogId(slug);

try {
  // ============================================================ 1. CADASTRO COM CONFIRMAÇÃO POR CÓDIGO
  R.step('1. Sem conta: tela de entrar / criar conta; cadastro exige confirmar o e-mail (código)');
  const A = await env.device({ name: 'A1' });
  await A.goto();
  await A.page.waitForSelector('.auth');
  R.ok(await hasText(A.page, 'Entrar') && await hasText(A.page, 'Criar conta'), 'sem sessão → tela de login (não abre o app)');
  await A.page.getByRole('tab', { name: 'Criar conta' }).click();
  await A.page.getByLabel('Nome').fill('Ana Souza');
  await A.page.getByLabel('E-mail').fill('ana@teste.com');
  await A.page.getByLabel('Senha', { exact: true }).fill('curta');
  await A.page.getByRole('button', { name: 'Criar conta' }).last().click();
  R.ok(await hasText(A.page, 'pelo menos 8 caracteres'), 'senha curta é recusada com mensagem em português');
  await A.page.getByLabel('Senha', { exact: true }).fill('senha-forte-1');
  await A.page.getByRole('button', { name: 'Criar conta' }).last().click();
  R.ok(await hasText(A.page, 'Confirme seu e-mail'), 'cadastro criado → pede confirmação do e-mail');
  await A.page.getByLabel('Código de confirmação').fill('000000');
  await tap(A.page, 'Confirmar');
  R.ok(await hasText(A.page, 'Código inválido ou expirado'), 'código errado é recusado');
  await A.page.getByLabel('Código de confirmação').fill('123456');
  await tap(A.page, 'Confirmar');
  await A.page.waitForSelector('.hero input[aria-label="Nome"], input[aria-label="Nome"]', { timeout: 15000 });
  R.ok(true, 'código certo → entra no app (onboarding da conta nova)');
  const uA = [...fake.users.values()].find((u) => u.email === 'ana@teste.com');
  R.ok(!!uA && uA.confirmed, 'usuário criado e confirmado no Auth');
  const cat = await ev(A.page, async () => (await import('/js/store.js')).state.exercises.size);
  R.ok(cat >= 330, `catálogo global sincronizado na 1ª abertura (${cat} exercícios)`);

  // onboarding
  await A.page.getByLabel('Nome').fill('Ana Souza');
  const inputs = A.page.locator('.hero ~ .card input[type=text]');
  await inputs.nth(1).fill('34'); await inputs.nth(2).fill('165'); await inputs.nth(3).fill('62,5');
  await tap(A.page, 'Começar');
  await A.page.waitForSelector('.next-card');
  R.ok(true, 'onboarding concluído com treinos de exemplo (Segunda–Sexta a partir do catálogo)');
  await waitFor(() => fake.db.profiles.find((p) => p.id === uA.id)?.onboarded_at, 9000, 'perfil no servidor');
  const prof = fake.db.profiles.find((p) => p.id === uA.id);
  R.ok(prof.display_name === 'Ana Souza' && prof.age === 34 && Number(prof.height_cm) === 165 && Number(prof.weight_kg) === 62.5, 'perfil gravado na tabela profiles (nome, idade, altura, peso)');
  await waitFor(() => fake.db.workouts.length === 5, 9000, '5 treinos no servidor');
  const wk = fake.db.workouts.filter((w) => w.user_id === uA.id);
  R.ok(wk.length === 5 && wk.every((w) => w.created_by === uA.id), '5 treinos (Segunda–Sexta) em workouts, com autoria');
  await waitFor(() => fake.db.workout_exercises.filter((i) => i.user_id === uA.id).length >= 45, 9000, 'itens dos treinos no servidor');
  const items = fake.db.workout_exercises.filter((i) => i.user_id === uA.id);
  R.ok(items.length >= 45 && items.every((i) => fake.db.exercises.some((e) => e.id === i.exercise_id)), `itens em workout_exercises (${items.length}) apontam para exercícios do catálogo`);
  await waitFor(() => fake.db.body_weights.some((w) => w.user_id === uA.id), 9000, 'peso no servidor'); // o envio segue a ordem das FKs: o peso vai depois dos treinos
  R.ok(fake.db.body_weights.some((w) => w.user_id === uA.id && Number(w.weight_kg) === 62.5), 'peso do perfil registrado em body_weights');
  await A.page.screenshot({ path: 'tests/e2e/out/cloud-01-home.png' });

  // ============================================================ 2. BUSCA E FILTROS NO "ADICIONAR EXERCÍCIO"
  R.step('2. Criar treino → Adicionar exercício → pesquisar "supino" → filtros → favoritos');
  await A.goto('#/treino/novo');
  await A.page.waitForSelector('input[aria-label="Nome do treino"]');
  await tap(A.page, 'Adicionar exercícios');
  await A.page.waitForSelector('.sheet input[aria-label="Buscar exercício"]');
  const total0 = await A.page.locator('.sheet .finder-count').innerText();
  R.ok(/33\d exercício/.test(total0), `sem busca: lista o catálogo todo (${total0})`);
  await A.page.locator('.sheet input[aria-label="Buscar exercício"]').fill('supino');
  await waitFor(async () => /para “supino”/.test(await A.page.locator('.sheet .finder-count').innerText()), 4000, 'resultados de supino');
  const names = await A.page.locator('.sheet .finder-list .li .t').allInnerTexts();
  R.ok(names.length >= 12 && names.every((n) => /supino/i.test(n)), `"supino" → ${names.length} resultados, todos supinos`);
  await A.page.locator('.sheet input[aria-label="Buscar exercício"]').fill('benc press');
  await waitFor(async () => /para “benc press”/.test(await A.page.locator('.sheet .finder-count').innerText()), 4000, 'typo');
  R.ok((await A.page.locator('.sheet .finder-list .li .t').allInnerTexts()).some((n) => n === 'Supino reto com barra'), 'sinônimo em inglês com erro de digitação ("benc press") acha o supino reto');
  await A.page.locator('.sheet input[aria-label="Buscar exercício"]').fill('supino');
  await waitFor(async () => /para “supino”/.test(await A.page.locator('.sheet .finder-count').innerText()), 4000, 'supino de novo');
  await tap(A.page, 'Filtros');
  await A.page.locator('.finder-panel .chip', { hasText: 'Halteres' }).first().click();
  await waitFor(async () => (await A.page.locator('.sheet .finder-list .li').count()) >= 3, 4000, 'filtro');
  const filtered = await A.page.locator('.sheet .finder-list .li .s').allInnerTexts();
  R.ok(filtered.length >= 3 && filtered.every((s) => /Halteres/.test(s)), `filtro de equipamento (Halteres) combinado com a busca: ${filtered.length} resultados`);
  await A.page.locator('.sheet .finder-list .li').first().locator('.star').click();
  await waitFor(() => fake.db.user_exercise_prefs.some((p) => p.user_id === uA.id && p.is_favorite), 9000, 'favorito no servidor');
  R.ok(true, 'favoritar (★) grava user_exercise_prefs no servidor');
  await A.page.locator('.finder-bar .chip', { hasText: 'Favoritos' }).click();
  R.ok((await A.page.locator('.sheet .finder-list .li').count()) === 1, 'filtro "Favoritos" mostra só o favorito');
  await A.page.locator('.finder-bar .chip', { hasText: 'Favoritos' }).click();
  await A.page.locator('.sheet .finder-list .li').nth(1).click();
  await A.page.locator('.sheet .finder-list .li').nth(2).click();
  await A.page.screenshot({ path: 'tests/e2e/out/cloud-02-picker.png' });
  await tap(A.page, 'Adicionar (2)');
  await A.page.waitForSelector('.ex-row');
  R.ok((await A.page.locator('.ex-row').count()) === 2, 'selecionou 2 exercícios → entram no treino');
  await A.page.locator('.ex-row .meta').first().click();
  await A.page.waitForSelector('.sheet .stepper');
  await tap(A.page, 'Salvar');
  await waitFor(() => fake.db.workouts.length === 6, 9000, 'novo treino no servidor');
  const nw = fake.db.workouts.find((w) => w.name === 'Treino F' || /Treino/.test(w.name) && !['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].includes(w.name));
  await waitFor(() => fake.db.workout_exercises.filter((i) => i.workout_id === nw.id).length === 2, 9000, 'itens do novo treino');
  R.ok(true, 'treino novo + 2 itens gravados em workouts / workout_exercises');

  // ============================================================ 3. EXERCÍCIO DO CATÁLOGO × PERSONALIZADO
  R.step('3. Catálogo é somente leitura: ajustar padrões vira preferência; "minha versão" cria exercício próprio');
  const supinoId = await slugId('supino-reto-barra');
  await A.goto(`#/exercicio/${supinoId}/editar`);
  await A.page.waitForSelector('.catalog-note');
  R.ok(!(await A.page.locator('input[aria-label="Nome"]').count()), 'exercício do catálogo: nome/aparelho/instruções ficam travados');
  await A.page.locator('.stepper-btn[aria-label="Aumentar"]').nth(2).click(); // carga
  await tap(A.page, 'Salvar');
  await waitFor(() => fake.db.user_exercise_prefs.some((p) => p.exercise_id === supinoId && p.default_load != null), 9000, 'prefs do supino');
  const cRow = fake.db.exercises.find((e) => e.id === supinoId);
  R.ok(Number(fake.db.user_exercise_prefs.find((p) => p.exercise_id === supinoId).default_load) > 0 && cRow.name === 'Supino reto com barra' && cRow.default_load === 0, 'carga padrão virou PREFERÊNCIA pessoal; a linha do catálogo não mudou');
  await A.goto(`#/exercicio/${supinoId}`);
  await A.page.waitForSelector('.tips');
  R.ok(await hasText(A.page, 'Dicas de execução') && await hasText(A.page, 'Também conhecido como'), 'tela do exercício mostra dicas e nomes alternativos');
  await A.page.getByRole('button', { name: 'Mais ações' }).click();
  await A.page.getByRole('button', { name: /Criar minha versão/ }).click();
  await A.page.waitForSelector('input[aria-label="Nome"]');
  await A.page.getByLabel('Nome').fill('Supino reto máquina — Academia X');
  await tap(A.page, 'Salvar');
  await waitFor(() => fake.db.exercises.some((e) => e.origin === 'custom'), 9000, 'exercício custom no servidor');
  const mine = fake.db.exercises.find((e) => e.origin === 'custom');
  R.ok(mine.owner_id === uA.id && mine.parent_exercise_id === supinoId && mine.visibility === 'private' && mine.slug == null, 'minha versão: origin=custom, dono = eu, derivado do global, privado');
  R.ok(fake.db.exercises.find((e) => e.id === supinoId).name === 'Supino reto com barra', 'exercício global intacto');
  await A.goto('#/exercicio/novo?nome=Remada%20do%20Jo%C3%A3o');
  await A.page.waitForSelector('input[aria-label="Nome"]');
  R.ok((await A.page.getByLabel('Nome').inputValue()) === 'Remada do João', 'criar a partir da busca já vem com o nome digitado');

  // ============================================================ 4. SESSÃO REALIZADA (planejado × realizado) NORMALIZADA
  R.step('4. Treino realizado → sessions / session_exercises / session_sets');
  const legId = await slugId('leg-press-horizontal'), extId = await slugId('cadeira-extensora');
  await ev(A.page, async ([leg, ext]) => {
    const s = await import('/js/store.js');
    const t = Date.now() - 3600e3;
    const set = (n, reps, load, off) => ({ n, plannedReps: 12, plannedLoad: 20, plannedRest: 60, targetReps: 12, targetLoad: 20, targetRest: 60, reps, load, startedAt: t + off, endedAt: t + off + 30000, durationSec: 30, restPlanned: 60, restStartedAt: t + off + 30000, restEndedAt: t + off + 90000, restActual: 60, effort: 3, rir: 2, touched: true });
    await s.addSession({ id: crypto.randomUUID(), workoutId: s.state.workouts[0].id, workoutName: 'Segunda', workoutDescription: '', startedAt: t, endedAt: t + 1800e3, feel: 4, note: 'boa', durationSec: 1800, restTotalSec: 120,
      exercises: [
        { itemId: crypto.randomUUID(), exerciseId: leg, name: 'Leg press horizontal', group: 'Quadríceps', secondary: [], equipment: 'Máquina', art: 'leg_press', repUnit: 'reps', bodyweight: false, notes: '', planned: { sets: 2, reps: 12, load: 20, rest: 60 }, target: { sets: 2, reps: 12, load: 20, rest: 60 }, changes: [], status: 'done', startedAt: t, endedAt: t + 300e3, durationSec: 300, sets: [set(1, 12, 20, 0), set(2, 10, 22.5, 120000)] },
        { itemId: crypto.randomUUID(), exerciseId: ext, name: 'Cadeira extensora', group: 'Quadríceps', secondary: [], equipment: 'Máquina', art: 'leg_extension', repUnit: 'reps', bodyweight: false, notes: '', planned: { sets: 2, reps: 12, load: 30, rest: 60 }, target: { sets: 2, reps: 12, load: 30, rest: 60 }, changes: [], status: 'skipped', startedAt: null, endedAt: null, durationSec: 0, sets: [] },
      ] });
  }, [legId, extId]);
  await waitFor(() => fake.db.workout_sessions.length === 1 && fake.db.session_sets.length === 2, 9000, 'sessão no servidor');
  R.ok(fake.db.session_exercises.length === 2 && fake.db.session_sets.every((x) => x.user_id === uA.id), 'sessão normalizada: 1 sessão, 2 exercícios, 2 séries (todas com user_id)');
  const ss = fake.db.session_sets.find((x) => x.set_number === 2);
  R.ok(ss.planned_load == 20 && ss.load == 22.5 && ss.reps === 10 && ss.rest_actual_seconds === 60, 'série guarda planejado × realizado × descanso real');

  // ============================================================ 5. OFFLINE → ONLINE
  R.step('5. Sem internet: tudo funciona e fica na fila; ao voltar, sincroniza');
  await A.ctx.setOffline(true); fake.setOffline(true);
  await A.page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await A.goto('#/'); await A.page.waitForSelector('.next-card');
  R.ok(true, 'app reabre OFFLINE com os dados locais (service worker + IndexedDB)');
  const before = fake.db.activities.length;
  await ev(A.page, async () => {
    const s = await import('/js/store.js');
    await s.saveActivity({ id: crypto.randomUUID(), type: 'corrida', startedAt: Date.now() - 7200e3, durationMin: 30, distanceKm: 4.5, paceSecKm: 400, intensity: 2, calories: 280, note: 'offline' });
    await s.saveWellbeing({ date: new Date().toISOString().slice(0, 10), mood: 4, energy: 3, note: 'feita offline' });
    const w = s.state.workouts[1]; await s.saveWorkout({ ...w, description: 'editado offline' });
  });
  await A.page.waitForTimeout(700);
  const pend = await ev(A.page, async () => (await import('/js/sync/engine.js')).status.pending);
  R.ok(pend >= 3, `alterações feitas offline ficam na fila (${pend} pendentes)`);
  R.ok(fake.db.activities.length === before, 'nada foi enviado enquanto offline');
  const pill = await A.page.locator('.sync-pill').first().innerText();
  R.ok(/Offline/.test(pill), `indicador mostra "${pill}"`);
  await A.page.screenshot({ path: 'tests/e2e/out/cloud-03-offline.png' });
  fake.setOffline(false); await A.ctx.setOffline(false);
  await A.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await waitFor(() => fake.db.activities.length === before + 1 && fake.db.wellbeing_entries.length === 1, 12000, 'sincronização ao voltar');
  R.ok(true, 'conexão volta → atividade e bem-estar são enviados automaticamente');
  R.ok(fake.db.workouts.some((w) => w.description === 'editado offline'), 'edição de treino feita offline também chegou');
  await waitFor(async () => (await ev(A.page, async () => (await import('/js/sync/engine.js')).status.pending)) === 0, 8000, 'fila vazia');
  await waitFor(async () => /Sincronizado/.test(await A.page.locator('.sync-pill').first().innerText()), 8000, 'indicador Sincronizado').catch(() => {});
  const pill2 = await A.page.locator('.sync-pill').first().innerText();
  R.ok(/Sincronizado/.test(pill2), `indicador volta para "Sincronizado" (está: "${pill2}", status ${JSON.stringify(await ev(A.page, async () => (await import('/js/sync/engine.js')).status))})`);

  // ============================================================ 6. FALHA DO SERVIDOR NÃO PERDE DADOS
  R.step('6. Erro do servidor: a alteração fica na fila e é reenviada');
  fake.state.failNext.push({ test: (s) => /POST \/rest\/v1\/activities/.test(s), times: 1, status: 500, body: { code: 'XX000', message: 'erro interno simulado' } });
  const a0 = fake.db.activities.length;
  await ev(A.page, async () => { const s = await import('/js/store.js'); await s.saveActivity({ id: crypto.randomUUID(), type: 'bike', startedAt: Date.now() - 100000, durationMin: 20, note: 'vai falhar uma vez' }); });
  await A.page.waitForTimeout(1500);
  const st1 = await ev(A.page, async () => { const e = await import('/js/sync/engine.js'); return { ...e.status }; });
  R.ok(fake.db.activities.length === a0 && st1.failed >= 1, `a 1ª tentativa falhou: item continua na fila (${st1.failed} com erro) — nada foi perdido`);
  await ev(A.page, async () => { const db = await import('/js/db.js'); for (const o of await db.getAll('outbox')) await db.put('outbox', { ...o, nextAt: 0 }); (await import('/js/sync/engine.js')).syncNow({ pull: false }); });
  await waitFor(() => fake.db.activities.length === a0 + 1, 9000, 'reenvio após erro');
  R.ok(true, 'reenvio automático conclui a sincronização');

  // ============================================================ 7. SEGUNDO APARELHO (mesma conta)
  R.step('7. Segundo aparelho, mesma conta: baixa tudo; edições e exclusões se propagam');
  const sessionA = fake.sessionFor(uA);
  const B = await env.device({ session: sessionA, name: 'A2' });
  await B.goto();
  await B.page.waitForSelector('.next-card', { timeout: 20000 });
  const snap = await ev(B.page, async () => { const s = await import('/js/store.js'); return { w: s.state.workouts.length, s: s.state.sessions.length, a: s.state.activities.length, wb: s.state.wellbeing.size, fav: [...s.state.exercises.values()].filter((e) => e.favorite).length, prof: s.state.profile?.name, ex: s.state.exercises.size, mine: [...s.state.exercises.values()].filter((e) => !e.builtin).length };});
  R.ok(snap.w === 6 && snap.s === 1 && snap.a === 2 && snap.wb === 1 && snap.fav === 1 && snap.prof === 'Ana Souza' && snap.mine === 1, `2º aparelho recebeu tudo: ${snap.w} treinos, ${snap.s} sessão, ${snap.a} atividades, favorito, perfil, exercício próprio`);
  const sessB = await ev(B.page, async () => (await import('/js/store.js')).state.sessions[0]);
  R.ok(sessB.exercises[0].sets.length === 2 && sessB.exercises[0].sets[1].load === 22.5 && sessB.totals.sets === 2 && sessB.workoutName === 'Segunda', 'sessão reconstruída das tabelas normalizadas (séries, cargas, totais)');
  // edita no aparelho B → A recebe
  await ev(B.page, async () => { const s = await import('/js/store.js'); const w = s.state.workouts[0]; await s.saveWorkout({ ...w, name: 'Segunda (editada no B)' }); await s.deleteWellbeing(s.state.wellbeing.keys().next().value); });
  await waitFor(() => fake.db.workouts.some((w) => w.name === 'Segunda (editada no B)') && fake.db.wellbeing_entries[0]?.deleted_at, 9000, 'B envia');
  await ev(A.page, async () => (await import('/js/sync/engine.js')).syncNow());
  await waitFor(async () => (await ev(A.page, async () => (await import('/js/store.js')).state.workouts.some((w) => w.name === 'Segunda (editada no B)'))), 9000, 'A recebe edição').catch(async (e) => {
    console.log('   diag A:', JSON.stringify(await ev(A.page, async () => { const en = await import('/js/sync/engine.js'); const db = await import('/js/db.js'); return { status: en.status, started: en.isStarted(), cursors: await db.kvGet('syncCursors'), names: (await db.getAll('workouts')).map((w) => w.name), outbox: (await db.getAll('outbox')).map((o) => o.key) }; })));
    console.log('   diag servidor:', JSON.stringify(fake.db.workouts.map((w) => [w.name, w.updated_at])));
    throw e;
  });
  R.ok(true, 'edição feita no aparelho B aparece no aparelho A');
  R.ok((await ev(A.page, async () => (await import('/js/store.js')).state.wellbeing.size)) === 0, 'exclusão (soft delete) no B some também no A');

  // ============================================================ 8. SEGUNDO USUÁRIO
  R.step('8. Outra pessoa no mesmo "servidor" não enxerga nada da Ana');
  const { session: sessionC } = fake.createUser({ email: 'bia@teste.com', password: 'outra-senha-1', name: 'Bia' });
  fake.users.forEach((u) => { u.confirmed = true; });
  const C = await env.device({ session: sessionC, name: 'B1' });
  await C.goto();
  await C.page.waitForSelector('input[aria-label="Nome"]', { timeout: 15000 });
  const bi = await ev(C.page, async () => { const s = await import('/js/store.js'); return { w: s.state.workouts.length, se: s.state.sessions.length, a: s.state.activities.length, mine: [...s.state.exercises.values()].filter((e) => !e.builtin).length, fav: [...s.state.exercises.values()].filter((e) => e.favorite).length, profile: !!s.state.profile, ex: s.state.exercises.size }; });
  R.ok(bi.w === 0 && bi.se === 0 && bi.a === 0 && bi.mine === 0 && bi.fav === 0 && !bi.profile && bi.ex >= 330, `usuária B: catálogo (${bi.ex}) mas NENHUM dado da Ana (treinos/sessões/atividades/exercícios próprios/favoritos)`);
  await C.page.getByLabel('Nome').fill('Bia');
  await tap(C.page, 'Começar');
  await C.page.waitForSelector('.next-card');
  await waitFor(() => fake.db.workouts.filter((w) => w.user_id !== uA.id).length === 5, 9000, 'treinos da Bia');
  R.ok(fake.db.workouts.filter((w) => w.user_id === uA.id).length === 6, 'a Bia criou os dela; os 6 treinos da Ana continuam só da Ana');
  await C.page.screenshot({ path: 'tests/e2e/out/cloud-04-outra-usuaria.png' });

  // ============================================================ 9. MÍDIA NO STORAGE
  R.step('9. Foto do exercício: arquivo no Storage, metadados na tabela, download no outro aparelho');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
  await A.goto(`#/exercicio/${legId}`);
  await A.page.waitForSelector('.media-grid');
  const fileIn = A.page.locator('input[type=file]');
  const [chooser] = await Promise.all([A.page.waitForEvent('filechooser'), tap(A.page, 'Foto ou vídeo')]);
  await chooser.setFiles({ name: 'minha-foto.png', mimeType: 'image/png', buffer: png });
  await waitFor(() => fake.db.exercise_media.some((m) => !m.deleted_at) && fake.storage.size === 1, 9000, 'upload');
  const mrow = fake.db.exercise_media[0];
  R.ok(mrow.bucket === 'user-media' && mrow.storage_path.startsWith(`${uA.id}/${legId}/`) && mrow.kind === 'image' && mrow.owner_id === uA.id, `metadados em exercise_media (bucket user-media, caminho ${mrow.storage_path.slice(0, 20)}…)`);
  R.ok([...fake.storage.keys()][0] === `user-media/${mrow.storage_path}`, 'arquivo no Storage na pasta do usuário (nada de arquivo dentro de tabela)');
  await ev(B.page, async () => (await import('/js/sync/engine.js')).syncNow());
  const mid = mrow.id;
  await waitFor(async () => (await ev(B.page, async (id) => !!(await (await import('/js/db.js')).get('media', id)), mid)), 9000, 'metadado no B');
  const dl = await ev(B.page, async (id) => { const s = await import('/js/store.js'); const b = await s.getMediaBlob(id); return b ? { size: b.size, type: b.type } : null; }, mid);
  R.ok(dl && dl.size === png.length, 'outro aparelho baixa a foto do Storage sob demanda (e guarda em cache)');
  await ev(A.page, async ([ex, id]) => { const s = await import('/js/store.js'); await s.deleteMedia(ex, id); }, [legId, mid]);
  await waitFor(() => fake.storage.size === 0 && fake.db.exercise_media[0].deleted_at, 9000, 'remoção');
  R.ok(true, 'excluir a foto remove o arquivo do Storage e marca a linha como excluída');

  // ============================================================ 10. SAIR E ENTRAR DE NOVO
  R.step('10. Sair (sem pendências) apaga o cache do aparelho; entrar de novo restaura tudo da nuvem');
  await A.goto('#/perfil'); await A.page.waitForSelector('.avatar');
  await waitFor(async () => (await ev(A.page, async () => (await import('/js/sync/engine.js')).status.pending)) === 0, 8000, 'fila vazia');
  const dbNames = await ev(A.page, async () => (await indexedDB.databases()).map((d) => d.name));
  R.ok(dbNames.some((n) => n.startsWith('treinos-feminino-u-')), 'cada usuário tem o próprio banco local');
  await tap(A.page, 'Sair'); await A.page.locator('.sheet').getByRole('button', { name: 'Sair', exact: true }).click();
  await A.page.waitForSelector('.auth');
  R.ok(true, 'sair → volta à tela de login');
  const dbNames2 = await ev(A.page, async () => (await indexedDB.databases()).map((d) => d.name));
  R.ok(!dbNames2.some((n) => n.startsWith('treinos-feminino-u-')), 'sem pendências: o banco local do usuário foi apagado (privacidade)');
  await A.page.getByLabel('E-mail').fill('ana@teste.com');
  await A.page.getByLabel('Senha', { exact: true }).fill('senha-errada');
  await A.page.getByRole('button', { name: 'Entrar' }).last().click();
  R.ok(await hasText(A.page, 'E-mail ou senha incorretos'), 'senha errada → mensagem clara');
  await A.page.getByLabel('Senha', { exact: true }).fill('senha-forte-1');
  await A.page.getByRole('button', { name: 'Entrar' }).last().click();
  await A.page.waitForSelector('.avatar', { timeout: 12000 }).catch(async (e) => {
    console.log('   diag tela:', (await A.page.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n+/g, ' | '));
    console.log('   diag url:', A.page.url(), JSON.stringify(await ev(A.page, async () => { const s = await import('/js/store.js'); const e = await import('/js/sync/engine.js'); return { user: s.state.userId, ready: s.state.ready, profile: !!s.state.profile, w: s.state.workouts.length, st: e.status, meta: s.state.meta }; })));
    await A.page.screenshot({ path: 'tests/e2e/out/cloud-diag.png' });
    throw e;
  });
  const back = await ev(A.page, async () => { const s = await import('/js/store.js'); return { w: s.state.workouts.length, s: s.state.sessions.length, p: s.state.profile?.name }; });
  R.ok(back.w === 6 && back.s === 1 && back.p === 'Ana Souza', `entrar de novo restaura tudo da nuvem (${back.w} treinos, ${back.s} sessão)`);

  // ============================================================ 11. APAGAR TODOS OS DADOS
  R.step('11. "Apagar todos os meus dados" limpa nuvem + aparelho');
  await A.goto('#/perfil'); await A.page.waitForSelector('.avatar');
  await tap(A.page, 'Apagar todos os meus dados');
  await A.page.locator('.sheet').getByRole('button', { name: 'Continuar' }).click();
  await A.page.locator('.sheet').getByRole('button', { name: 'Apagar tudo' }).click();
  await A.page.waitForSelector('.hero', { timeout: 15000 });
  R.ok(fake.db.workouts.filter((w) => w.user_id === uA.id).length === 0 && fake.db.workout_sessions.length === 0 && fake.db.activities.length === 0, 'servidor: treinos, sessões e atividades da Ana apagados');
  R.ok(fake.db.workouts.filter((w) => w.user_id !== uA.id).length === 5, 'os dados da Bia continuam intactos');
  R.ok(fake.db.profiles.find((p) => p.id === uA.id).onboarded_at === null, 'perfil volta ao estado inicial → onboarding');
} catch (e) {
  console.log('\n✗ EXCEÇÃO NO TESTE:', e.message);
  R.ok(false, `exceção: ${e.message}`);
}
const good = R.done(env.errors);
await env.close();
process.exit(good ? 0 : 1);

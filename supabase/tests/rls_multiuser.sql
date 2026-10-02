-- ============================================================================
-- Teste de segurança multiusuário (RLS, RBAC, vínculos, Storage).
-- Roda dentro de UMA transação que é sempre revertida: não deixa nenhum dado para trás.
-- O resultado volta como mensagem de erro "RESULTS:<json>" (é o jeito de devolver dados e
-- garantir o rollback ao mesmo tempo). Execute com:  node scripts/db-test.mjs
-- ============================================================================
do $test$
declare
  A uuid := 'aaaaaaaa-0000-4000-8000-00000000000a';   -- aluna A
  B uuid := 'bbbbbbbb-0000-4000-8000-00000000000b';   -- aluna B
  I uuid := 'cccccccc-0000-4000-8000-00000000000c';   -- instrutor
  D uuid := 'dddddddd-0000-4000-8000-00000000000d';   -- admin
  cat uuid := 'eeeeeeee-0000-4000-8000-0000000000e1'; -- exercício do catálogo
  exA uuid := 'eeeeeeee-0000-4000-8000-0000000000e2'; -- exercício personalizado da A
  wA  uuid := 'ffffffff-0000-4000-8000-0000000000f1'; -- treino da A
  sA  uuid := 'ffffffff-0000-4000-8000-0000000000f2'; -- sessão da A
  res jsonb := '[]'::jsonb;
  n bigint;
  v text;
  denied boolean;
begin
  -- ------------------------------------------------------------ preparação (como dono do banco)
  insert into auth.users (id, email, aud, role, raw_user_meta_data) values
    (A, 'a@teste.local', 'authenticated', 'authenticated', '{"name":"Aluna A"}'),
    (B, 'b@teste.local', 'authenticated', 'authenticated', '{"name":"Aluna B"}'),
    (I, 'i@teste.local', 'authenticated', 'authenticated', '{"name":"Instrutor"}'),
    (D, 'd@teste.local', 'authenticated', 'authenticated', '{"name":"Admin"}');
  insert into public.user_roles (user_id, role_id) values (I, 'instructor'), (D, 'admin');
  insert into public.exercises (id, origin, slug, name, aliases, primary_group_id, equipment_id, visibility)
    values (cat, 'catalog', 'teste-supino', 'Supíno Inclinado', array['Incline Press'], 'peitoral', 'halteres', 'public');

  res := res || jsonb_build_object('t', 'cadastro cria perfil + papel student automaticamente',
    'ok', (select count(*) from public.profiles where id in (A, B, I, D)) = 4
      and exists (select 1 from public.user_roles where user_id = A and role_id = 'student'),
    'got', (select count(*) from public.profiles where id in (A, B, I, D))::text);
  res := res || jsonb_build_object('t', 'nome do cadastro vira display_name',
    'ok', (select display_name from public.profiles where id = A) = 'Aluna A', 'got', (select display_name from public.profiles where id = A));
  res := res || jsonb_build_object('t', 'search_text sem acento e com sinônimos',
    'ok', (select search_text from public.exercises where id = cat) = 'supino inclinado incline press',
    'got', (select search_text from public.exercises where id = cat));

  -- ============================================================ ALUNA A
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  res := res || jsonb_build_object('t', 'A vê o catálogo global', 'ok', exists (select 1 from public.exercises where id = cat), 'got', '');
  res := res || jsonb_build_object('t', 'A vê só o próprio perfil', 'ok', (select count(*) from public.profiles) = 1, 'got', (select count(*) from public.profiles)::text);

  insert into public.exercises (id, origin, name, primary_group_id, equipment_id, owner_id, visibility)
    values (exA, 'custom', 'Supino reto máquina — Academia X', 'peitoral', 'maquina', A, 'private');
  insert into public.exercise_secondary_muscles values (exA, 'triceps'), (exA, 'ombros');
  res := res || jsonb_build_object('t', 'A cria exercício personalizado privado', 'ok', exists (select 1 from public.exercises where id = exA), 'got', '');

  denied := false;
  begin insert into public.exercises (origin, name, primary_group_id, equipment_id, owner_id, visibility)
          values ('custom', 'Compartilhado', 'costas', 'barra', A, 'students');
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'aluno NÃO compartilha exercício com alunos (sem exercises.share)', 'ok', denied, 'got', '');

  denied := false;
  begin insert into public.exercises (origin, slug, name, primary_group_id, equipment_id, visibility)
          values ('catalog', 'hack-catalogo', 'Hack no catálogo', 'costas', 'barra', 'public');
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'aluno NÃO insere no catálogo global', 'ok', denied, 'got', '');

  update public.exercises set name = 'Hackeado' where id = cat;
  get diagnostics n = row_count;
  res := res || jsonb_build_object('t', 'aluno NÃO altera exercício do catálogo (0 linhas)', 'ok', n = 0, 'got', n::text);
  delete from public.exercises where id = cat;
  get diagnostics n = row_count;
  res := res || jsonb_build_object('t', 'aluno NÃO apaga exercício do catálogo (0 linhas)', 'ok', n = 0, 'got', n::text);

  denied := false;
  begin insert into public.user_roles (user_id, role_id) values (A, 'admin');
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'aluno NÃO se promove a admin', 'ok', denied, 'got', '');
  denied := false;
  begin insert into public.user_roles (user_id, role_id) values (A, 'instructor');
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'aluno NÃO se torna instrutor sozinho', 'ok', denied, 'got', '');

  insert into public.user_exercise_prefs (user_id, exercise_id, is_favorite, default_load) values (A, cat, true, 12.5);
  res := res || jsonb_build_object('t', 'A favorita exercício do catálogo (prefs pessoais)', 'ok', (select is_favorite from public.user_exercise_prefs where exercise_id = cat), 'got', '');

  insert into public.workouts (id, user_id, name, weekday) values (wA, A, 'Segunda', 1);
  insert into public.workout_exercises (workout_id, user_id, exercise_id, position, sets, reps, load, rest_seconds)
    values (wA, A, cat, 0, 4, 10, 20, 90), (wA, A, exA, 1, 3, 12, 0, 60);
  res := res || jsonb_build_object('t', 'A cria treino com 2 exercícios', 'ok', (select count(*) from public.workout_exercises where workout_id = wA) = 2, 'got', '');
  res := res || jsonb_build_object('t', 'created_by carimbado pelo servidor', 'ok', (select created_by from public.workouts where id = wA) = A, 'got', '');

  insert into public.workout_sessions (id, user_id, workout_id, workout_name, started_at, ended_at, duration_seconds)
    values (sA, A, wA, 'Segunda', now() - interval '1 hour', now(), 3600);
  insert into public.session_exercises (session_id, position, user_id, exercise_id, status, planned_sets, planned_reps, planned_load)
    values (sA, 0, A, cat, 'done', 4, 10, 20);
  insert into public.session_sets (session_id, exercise_position, set_number, user_id, reps, load, effort, rir)
    values (sA, 0, 1, A, 10, 20, 3, 2), (sA, 0, 2, A, 9, 20, 4, 1);
  res := res || jsonb_build_object('t', 'A registra sessão + exercícios + séries', 'ok', (select count(*) from public.session_sets where session_id = sA) = 2, 'got', '');

  insert into public.activities (user_id, activity_type, started_at, duration_minutes) values (A, 'corrida', now(), 30);
  insert into public.wellbeing_entries (user_id, entry_date, period, mood, energy) values (A, current_date, true, 3, 4);
  insert into public.body_weights (user_id, measured_on, weight_kg) values (A, current_date, 62.5);
  insert into public.progression_suggestions (user_id, exercise_id, status, current_load, suggested_load, decision)
    values (A, cat, 'suggest', 20, 22.5, 'accepted');

  denied := false;   -- filho com user_id de OUTRO dono do pai
  begin insert into public.session_sets (session_id, exercise_position, set_number, user_id, reps, load) values (sA, 0, 3, B, 8, 20);
  exception when sqlstate '42501' or sqlstate '23503' then denied := true; end;
  res := res || jsonb_build_object('t', 'série com user_id diferente do pai é rejeitada', 'ok', denied, 'got', '');

  -- ============================================================ ALUNA B (outro usuário)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.workouts;            res := res || jsonb_build_object('t', 'B NÃO vê treinos da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.workout_exercises;   res := res || jsonb_build_object('t', 'B NÃO vê itens de treino da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.workout_sessions;    res := res || jsonb_build_object('t', 'B NÃO vê sessões da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.session_exercises;   res := res || jsonb_build_object('t', 'B NÃO vê exercícios de sessão da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.session_sets;        res := res || jsonb_build_object('t', 'B NÃO vê séries da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.activities;          res := res || jsonb_build_object('t', 'B NÃO vê atividades da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.wellbeing_entries;   res := res || jsonb_build_object('t', 'B NÃO vê bem-estar da A (ciclo/humor)', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.body_weights;        res := res || jsonb_build_object('t', 'B NÃO vê peso da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.progression_suggestions; res := res || jsonb_build_object('t', 'B NÃO vê sugestões da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.user_exercise_prefs; res := res || jsonb_build_object('t', 'B NÃO vê favoritos/prefs da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.exercises where id = exA;
  res := res || jsonb_build_object('t', 'B NÃO vê exercício personalizado privado da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.exercise_secondary_muscles where exercise_id = exA;
  res := res || jsonb_build_object('t', 'B NÃO vê músculos secundários do exercício privado da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.profiles where id = A;
  res := res || jsonb_build_object('t', 'B NÃO vê o perfil da A', 'ok', n = 0, 'got', n::text);
  res := res || jsonb_build_object('t', 'B vê o catálogo global', 'ok', exists (select 1 from public.exercises where id = cat), 'got', '');

  update public.workouts set name = 'invadido' where id = wA;           get diagnostics n = row_count;
  res := res || jsonb_build_object('t', 'B NÃO altera treino da A (0 linhas)', 'ok', n = 0, 'got', n::text);
  delete from public.workouts where id = wA;                            get diagnostics n = row_count;
  res := res || jsonb_build_object('t', 'B NÃO apaga treino da A (0 linhas)', 'ok', n = 0, 'got', n::text);
  update public.workout_sessions set note = 'invadido' where id = sA;   get diagnostics n = row_count;
  res := res || jsonb_build_object('t', 'B NÃO altera sessão da A (0 linhas)', 'ok', n = 0, 'got', n::text);

  denied := false;
  begin insert into public.workouts (user_id, name) values (A, 'treino plantado na A');
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'B NÃO cria treino em nome da A', 'ok', denied, 'got', '');
  denied := false;
  begin insert into public.workout_sessions (user_id, workout_name, started_at) values (A, 'plantada', now());
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'B NÃO cria sessão em nome da A', 'ok', denied, 'got', '');
  denied := false;
  begin insert into public.workout_exercises (workout_id, user_id, exercise_id, position, sets, reps) values (wA, B, cat, 9, 3, 10);
  exception when sqlstate '42501' or sqlstate '23503' then denied := true; end;
  res := res || jsonb_build_object('t', 'B NÃO anexa item ao treino da A', 'ok', denied, 'got', '');
  denied := false;
  begin insert into public.workout_exercises (workout_id, user_id, exercise_id, position, sets, reps) values (wA, A, cat, 9, 3, 10);
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'B NÃO anexa item (user_id=A) ao treino da A', 'ok', denied, 'got', '');
  denied := false;
  begin insert into public.user_exercise_prefs (user_id, exercise_id) values (B, exA);
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'B NÃO cria prefs sobre exercício privado da A', 'ok', denied, 'got', '');
  denied := false;
  begin insert into public.instructor_students (instructor_id, student_id, status, invited_by) values (I, A, 'active', B);
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'B NÃO vincula a A a um instrutor', 'ok', denied, 'got', '');
  denied := false;
  begin insert into public.instructor_students (instructor_id, student_id, status, invited_by) values (A, B, 'active', B);
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'aluno NÃO escolhe outro aluno como "instrutor"', 'ok', denied, 'got', '');

  insert into public.workouts (id, user_id, name) values ('ffffffff-0000-4000-8000-0000000000f9', B, 'Treino da B');
  res := res || jsonb_build_object('t', 'B cria o próprio treino e só vê o dele', 'ok', (select count(*) from public.workouts) = 1, 'got', (select count(*) from public.workouts)::text);

  -- ============================================================ INSTRUTOR (sem vínculo)
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', I, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.workouts;
  res := res || jsonb_build_object('t', 'instrutor SEM vínculo não vê treinos de ninguém', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.workout_sessions;
  res := res || jsonb_build_object('t', 'instrutor SEM vínculo não vê sessões de ninguém', 'ok', n = 0, 'got', n::text);

  insert into public.instructor_students (instructor_id, student_id, status, invited_by) values (I, A, 'pending', I);
  select count(*) into n from public.workouts;
  res := res || jsonb_build_object('t', 'convite PENDENTE não dá acesso aos dados', 'ok', n = 0, 'got', n::text);
  denied := false;
  begin insert into public.instructor_students (instructor_id, student_id, status, invited_by) values (I, B, 'active', I);
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'instrutor NÃO se auto-aprova (vínculo nasce pendente)', 'ok', denied, 'got', '');
  update public.instructor_students set status = 'active' where instructor_id = I and student_id = A;
  get diagnostics n = row_count;
  res := res || jsonb_build_object('t', 'instrutor NÃO ativa o próprio vínculo (0 linhas)', 'ok', n = 0, 'got', n::text);

  -- ============================================================ A aceita o vínculo
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.instructor_students set status = 'active' where instructor_id = I and student_id = A;
  get diagnostics n = row_count;
  res := res || jsonb_build_object('t', 'A aceita o convite do instrutor', 'ok', n = 1, 'got', n::text);
  denied := false;
  begin update public.instructor_students set student_id = B where instructor_id = I;
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'partes do vínculo são imutáveis', 'ok', denied, 'got', '');

  -- ============================================================ INSTRUTOR com vínculo ativo
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', I, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.workouts;
  res := res || jsonb_build_object('t', 'instrutor vinculado vê SÓ o treino da A (não o da B)', 'ok', n = 1 and exists (select 1 from public.workouts where user_id = A), 'got', n::text);
  select count(*) into n from public.workout_sessions;
  res := res || jsonb_build_object('t', 'instrutor vinculado vê a sessão da A', 'ok', n = 1, 'got', n::text);
  select count(*) into n from public.session_sets;
  res := res || jsonb_build_object('t', 'instrutor vinculado vê as séries da A', 'ok', n = 2, 'got', n::text);
  select count(*) into n from public.activities;
  res := res || jsonb_build_object('t', 'instrutor vê atividades da A (escopo padrão)', 'ok', n = 1, 'got', n::text);
  select count(*) into n from public.wellbeing_entries;
  res := res || jsonb_build_object('t', 'instrutor NÃO vê bem-estar/ciclo sem opt-in da aluna', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.body_weights;
  res := res || jsonb_build_object('t', 'instrutor NÃO vê peso sem opt-in da aluna', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.user_exercise_prefs;
  res := res || jsonb_build_object('t', 'instrutor NÃO vê prefs pessoais da aluna', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.exercises where id = exA;
  res := res || jsonb_build_object('t', 'instrutor NÃO vê exercício PRIVADO da aluna', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.profiles where id = A;
  res := res || jsonb_build_object('t', 'instrutor vê o perfil da aluna vinculada', 'ok', n = 1, 'got', n::text);
  select count(*) into n from public.profiles where id = B;
  res := res || jsonb_build_object('t', 'instrutor NÃO vê o perfil de aluna não vinculada', 'ok', n = 0, 'got', n::text);

  update public.workout_sessions set note = 'editado pelo instrutor' where id = sA; get diagnostics n = row_count;
  res := res || jsonb_build_object('t', 'instrutor NÃO edita sessão da aluna (histórico é dela)', 'ok', n = 0, 'got', n::text);

  insert into public.workouts (id, user_id, name) values ('ffffffff-0000-4000-8000-0000000000f3', A, 'Treino do instrutor');
  res := res || jsonb_build_object('t', 'instrutor monta treino para a aluna vinculada (workouts:write)', 'ok', true, 'got', '');
  res := res || jsonb_build_object('t', 'autoria do treino = instrutor (created_by)', 'ok', (select created_by from public.workouts where id = 'ffffffff-0000-4000-8000-0000000000f3') = I, 'got', '');
  denied := false;
  begin insert into public.workouts (user_id, name) values (B, 'plantado na B');
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'instrutor NÃO monta treino para aluna NÃO vinculada', 'ok', denied, 'got', '');

  insert into public.exercises (id, origin, name, primary_group_id, equipment_id, owner_id, visibility)
    values ('eeeeeeee-0000-4000-8000-0000000000e3', 'custom', 'Supino reto máquina — Academia X (instrutor)', 'peitoral', 'maquina', I, 'students');
  res := res || jsonb_build_object('t', 'instrutor cria exercício compartilhado com alunos', 'ok', true, 'got', '');

  -- aluna A passa a ver o exercício do instrutor (vínculo ativo); B não
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  res := res || jsonb_build_object('t', 'aluna vinculada vê exercício compartilhado pelo instrutor',
    'ok', exists (select 1 from public.exercises where id = 'eeeeeeee-0000-4000-8000-0000000000e3'), 'got', '');
  -- aluna libera bem-estar
  update public.instructor_students set scopes = array['workouts:read', 'sessions:read', 'wellbeing:read'] where instructor_id = I and student_id = A;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  res := res || jsonb_build_object('t', 'aluna NÃO vinculada NÃO vê exercício do instrutor',
    'ok', not exists (select 1 from public.exercises where id = 'eeeeeeee-0000-4000-8000-0000000000e3'), 'got', '');

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', I, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.wellbeing_entries;
  res := res || jsonb_build_object('t', 'com opt-in (wellbeing:read) o instrutor passa a ver bem-estar', 'ok', n = 1, 'got', n::text);
  select count(*) into n from public.activities;
  res := res || jsonb_build_object('t', 'escopo removido → instrutor deixa de ver atividades', 'ok', n = 0, 'got', n::text);
  denied := false;
  begin insert into public.workouts (user_id, name) values (A, 'sem escopo write');
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'escopo workouts:write removido → instrutor NÃO monta mais treino', 'ok', denied, 'got', '');

  -- ============================================================ anon, storage, erase, delete
  execute 'reset role';
  execute 'set local role anon';
  denied := false;
  begin perform count(*) from public.workouts;
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'anon NÃO acessa nenhuma tabela privada', 'ok', denied, 'got', '');
  denied := false;
  begin perform count(*) from public.exercises;
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'anon NÃO lê o catálogo (login obrigatório)', 'ok', denied, 'got', '');

  -- Storage: cada usuário só escreve/lê a própria pasta
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into storage.objects (bucket_id, name, owner, owner_id) values ('user-media', A::text || '/ex/foto.jpg', A, A::text);
  res := res || jsonb_build_object('t', 'A grava na própria pasta do Storage', 'ok', true, 'got', '');
  denied := false;
  begin insert into storage.objects (bucket_id, name, owner, owner_id) values ('user-media', B::text || '/ex/invasao.jpg', A, A::text);
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'A NÃO grava na pasta da B no Storage', 'ok', denied, 'got', '');
  denied := false;
  begin insert into storage.objects (bucket_id, name, owner, owner_id) values ('catalog-media', 'x/hack.png', A, A::text);
  exception when sqlstate '42501' then denied := true; end;
  res := res || jsonb_build_object('t', 'aluno NÃO grava no bucket do catálogo', 'ok', denied, 'got', '');

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from storage.objects where bucket_id = 'user-media';
  res := res || jsonb_build_object('t', 'B NÃO enxerga arquivos da A no Storage', 'ok', n = 0, 'got', n::text);

  -- Admin gerencia o catálogo
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', D, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.exercises set name = 'Supíno Inclinado (revisado)' where id = cat; get diagnostics n = row_count;
  res := res || jsonb_build_object('t', 'admin edita exercício do catálogo', 'ok', n = 1, 'got', n::text);
  insert into storage.objects (bucket_id, name, owner, owner_id) values ('catalog-media', 'supino/inclinado.gif', D, D::text);
  res := res || jsonb_build_object('t', 'admin grava mídia no bucket do catálogo', 'ok', true, 'got', '');
  select count(*) into n from public.workouts;
  res := res || jsonb_build_object('t', 'admin NÃO vê treinos de alunos só por ser admin', 'ok', n = 0, 'got', n::text);

  -- Apagar meus dados (LGPD): só os da A
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', A, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.erase_my_data();
  select count(*) into n from public.workouts where user_id = A;
  res := res || jsonb_build_object('t', 'erase_my_data apaga treinos da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.workout_sessions where user_id = A;
  res := res || jsonb_build_object('t', 'erase_my_data apaga histórico da A (cascata)', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.exercises where owner_id = A;
  res := res || jsonb_build_object('t', 'erase_my_data apaga exercícios personalizados da A', 'ok', n = 0, 'got', n::text);
  select count(*) into n from public.exercises where origin = 'catalog';
  res := res || jsonb_build_object('t', 'erase_my_data NÃO toca o catálogo', 'ok', n >= 1, 'got', n::text);

  execute 'reset role';
  select count(*) into n from public.workouts where user_id = B;
  res := res || jsonb_build_object('t', 'dados da B intactos após erase da A', 'ok', n = 1, 'got', n::text);

  -- Excluir conta: cascata completa
  perform set_config('request.jwt.claims', json_build_object('sub', B, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.delete_my_account();
  execute 'reset role';
  select count(*) into n from public.workouts where user_id = B;
  res := res || jsonb_build_object('t', 'delete_my_account remove a conta e os dados da B', 'ok', n = 0 and not exists (select 1 from auth.users where id = B), 'got', n::text);
  res := res || jsonb_build_object('t', 'delete_my_account não afeta a aluna A', 'ok', exists (select 1 from auth.users where id = A), 'got', '');

  raise exception 'RESULTS:%', res::text;
end;
$test$;

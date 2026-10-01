-- ============================================================================
-- 3) Dados de treino do usuário: planos, sessões (planejado × realizado), séries,
--    atividades, bem-estar, peso corporal e sugestões de progressão.
--
-- Convenções
--   * Toda tabela privada tem `user_id` (dono) → RLS simples e rápida; tabelas-filhas repetem o
--     user_id e uma FK composta garante que ele é igual ao do pai (nunca há filho de outro dono).
--   * `updated_at` é do servidor (trigger) → cursor confiável de sincronização incremental.
--   * `deleted_at` (soft delete) onde o app precisa propagar exclusões entre aparelhos.
--   * Instrutores (futuro) leem/escrevem apenas via vínculo ativo + escopo liberado pelo aluno.
-- ============================================================================

-- ---------------------------------------------------------------- planos de treino
create table public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,      -- dono (aluno)
  created_by  uuid references auth.users (id) on delete set null default auth.uid(),  -- quem montou (aluno ou instrutor)
  name        text not null check (length(btrim(name)) between 1 and 120),
  description text not null default '',
  weekday     smallint check (weekday between 1 and 7),                         -- 1 = segunda … 7 = domingo
  position    integer not null default 0,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (id, user_id)
);
create index workouts_sync_idx on public.workouts (user_id, updated_at);

create table public.workout_exercises (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null,
  user_id      uuid not null,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  position     integer not null,
  sets         smallint not null check (sets between 1 and 20),
  reps         smallint not null check (reps between 1 and 3600),               -- repetições ou segundos/minutos (rep_unit do exercício)
  load         numeric(7, 2) not null default 0 check (load >= 0),
  rest_seconds smallint not null default 90 check (rest_seconds between 0 and 900),
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (workout_id, user_id) references public.workouts (id, user_id) on delete cascade
);
create index workout_exercises_workout_idx on public.workout_exercises (workout_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

-- ---------------------------------------------------------------- sessões realizadas (histórico)
create table public.workout_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  workout_id         uuid references public.workouts (id) on delete set null,
  workout_name       text not null,                                              -- snapshot: o plano pode mudar/sumir
  workout_description text not null default '',
  started_at         timestamptz not null,
  ended_at           timestamptz,
  duration_seconds   integer check (duration_seconds >= 0),
  feel               smallint check (feel between 1 and 5),
  note               text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  unique (id, user_id)
);
create index workout_sessions_user_started_idx on public.workout_sessions (user_id, started_at desc);
create index workout_sessions_sync_idx on public.workout_sessions (user_id, updated_at);

-- Cada exercício DENTRO da sessão: planejado (imutável) × alvo do dia × o que aconteceu (séries).
create table public.session_exercises (
  session_id     uuid not null,
  position       smallint not null,
  user_id        uuid not null,
  plan_item_id   uuid,                                                           -- item do plano de origem (sem FK: o plano pode mudar)
  exercise_id    uuid references public.exercises (id) on delete set null,
  exercise_snapshot jsonb not null default '{}'::jsonb,                          -- nome, grupo, equipamento, animação… no dia do treino
  status         text not null default 'pending' check (status in ('pending', 'active', 'done', 'skipped')),
  planned_sets   smallint, planned_reps smallint, planned_load numeric(7, 2), planned_rest_seconds smallint,
  target_sets    smallint, target_reps smallint, target_load numeric(7, 2), target_rest_seconds smallint,
  changes        jsonb not null default '[]'::jsonb,                             -- ajustes feitos no treino (somente hoje / novo padrão)
  notes          text not null default '',
  started_at     timestamptz,
  ended_at       timestamptz,
  duration_seconds integer,
  primary key (session_id, position),
  unique (session_id, position, user_id),
  foreign key (session_id, user_id) references public.workout_sessions (id, user_id) on delete cascade
);
create index session_exercises_exercise_idx on public.session_exercises (exercise_id) where exercise_id is not null;

-- Séries realizadas.
create table public.session_sets (
  session_id        uuid not null,
  exercise_position smallint not null,
  set_number        smallint not null,
  user_id           uuid not null,
  planned_reps smallint, planned_load numeric(7, 2), planned_rest_seconds smallint,
  target_reps  smallint, target_load  numeric(7, 2), target_rest_seconds  smallint,
  reps         smallint not null default 0 check (reps >= 0),
  load         numeric(7, 2) not null default 0 check (load >= 0),
  started_at   timestamptz,
  ended_at     timestamptz,
  duration_seconds integer,
  rest_planned_seconds integer,
  rest_started_at timestamptz,
  rest_ended_at   timestamptz,
  rest_actual_seconds integer,
  effort smallint check (effort between 1 and 5),
  rir    smallint check (rir between 0 and 3),
  touched boolean not null default false,
  primary key (session_id, exercise_position, set_number),
  foreign key (session_id, exercise_position, user_id)
    references public.session_exercises (session_id, position, user_id) on delete cascade
);
create index session_sets_user_idx on public.session_sets (user_id);

-- ---------------------------------------------------------------- atividades
create table public.activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  activity_type    text not null check (activity_type ~ '^[a-z][a-z0-9_]*$'),   -- corrida, caminhada, bike, volei, pingpong, outro…
  custom_name      text,
  started_at       timestamptz not null,
  duration_minutes numeric(8, 2) not null check (duration_minutes > 0),
  distance_km      numeric(8, 2) check (distance_km >= 0),
  pace_sec_per_km  numeric(8, 2),
  speed_kmh        numeric(7, 2),
  intensity        smallint check (intensity between 1 and 3),
  calories         numeric(8, 1) check (calories >= 0),
  note             text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index activities_user_started_idx on public.activities (user_id, started_at desc);
create index activities_sync_idx on public.activities (user_id, updated_at);

-- ---------------------------------------------------------------- bem-estar (um registro por dia)
create table public.wellbeing_entries (
  user_id     uuid not null references auth.users (id) on delete cascade,
  entry_date  date not null,
  period      boolean not null default false,
  cycle_start boolean not null default false,
  flow        text check (flow in ('leve', 'médio', 'intenso')),
  mood        smallint check (mood between 1 and 5),
  energy      smallint check (energy between 1 and 5),
  tiredness   smallint check (tiredness between 1 and 5),
  fatigue     smallint check (fatigue between 1 and 5),
  recovery    smallint check (recovery between 1 and 5),
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (user_id, entry_date)
);
create index wellbeing_sync_idx on public.wellbeing_entries (user_id, updated_at);

-- ---------------------------------------------------------------- peso corporal (um por dia)
create table public.body_weights (
  user_id     uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  weight_kg   numeric(5, 2) not null check (weight_kg between 20 and 500),
  source      text not null default 'manual',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (user_id, measured_on)
);
create index body_weights_sync_idx on public.body_weights (user_id, updated_at);

-- ---------------------------------------------------------------- sugestões de progressão
create table public.progression_suggestions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  exercise_id     uuid references public.exercises (id) on delete set null,
  workout_id      uuid references public.workouts (id) on delete set null,
  status          text,                                                          -- suggest | hold | insufficient | na
  current_load    numeric(7, 2),
  suggested_load  numeric(7, 2),
  decision        text check (decision in ('accepted', 'altered', 'ignored')),
  new_load        numeric(7, 2),
  decided_at      timestamptz,
  evidence        jsonb not null default '{}'::jsonb,                            -- base, explicação e sessões consideradas (auditável)
  outcome         jsonb,                                                         -- resultado real depois de aplicada
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index progression_suggestions_sync_idx on public.progression_suggestions (user_id, updated_at);
create index progression_suggestions_exercise_idx on public.progression_suggestions (user_id, exercise_id);

-- Autoria do plano: quem criou (aluno ou instrutor) é carimbado pelo servidor e nunca muda.
create function private.stamp_created_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.created_by := (select auth.uid()); else new.created_by := old.created_by; end if;
  return new;
end $$;
create trigger workouts_created_by before insert or update on public.workouts
  for each row execute function private.stamp_created_by();
revoke all on function private.stamp_created_by() from public, anon;
grant execute on function private.stamp_created_by() to authenticated, service_role;

-- ---------------------------------------------------------------- triggers de updated_at
do $$
declare t text;
begin
  foreach t in array array['workouts', 'workout_exercises', 'workout_sessions', 'activities',
                           'wellbeing_entries', 'body_weights', 'progression_suggestions']
  loop
    execute format('create trigger %I before insert or update on public.%I for each row execute function private.touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- RLS
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.session_sets enable row level security;
alter table public.activities enable row level security;
alter table public.wellbeing_entries enable row level security;
alter table public.body_weights enable row level security;
alter table public.progression_suggestions enable row level security;

-- Planos: o aluno (dono) tudo; instrutor vinculado lê (workouts:read) e monta (workouts:write + workouts.assign).
create policy workouts_read on public.workouts for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_student(user_id, 'workouts:read'));
create policy workouts_insert on public.workouts for insert to authenticated
  with check (private.can_write_student_workouts(user_id));
create policy workouts_update on public.workouts for update to authenticated
  using (private.can_write_student_workouts(user_id)) with check (private.can_write_student_workouts(user_id));
create policy workouts_delete on public.workouts for delete to authenticated
  using (private.can_write_student_workouts(user_id));

create policy workout_exercises_read on public.workout_exercises for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_student(user_id, 'workouts:read'));
create policy workout_exercises_insert on public.workout_exercises for insert to authenticated
  with check (private.can_write_student_workouts(user_id) and private.can_read_exercise(exercise_id));
create policy workout_exercises_update on public.workout_exercises for update to authenticated
  using (private.can_write_student_workouts(user_id))
  with check (private.can_write_student_workouts(user_id) and private.can_read_exercise(exercise_id));
create policy workout_exercises_delete on public.workout_exercises for delete to authenticated
  using (private.can_write_student_workouts(user_id));

-- Sessões e séries: histórico do aluno. Instrutor só LÊ (sessions:read).
create policy sessions_read on public.workout_sessions for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_student(user_id, 'sessions:read'));
create policy sessions_insert on public.workout_sessions for insert to authenticated with check (user_id = (select auth.uid()));
create policy sessions_update on public.workout_sessions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy sessions_delete on public.workout_sessions for delete to authenticated using (user_id = (select auth.uid()));

create policy session_exercises_read on public.session_exercises for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_student(user_id, 'sessions:read'));
create policy session_exercises_insert on public.session_exercises for insert to authenticated with check (user_id = (select auth.uid()));
create policy session_exercises_update on public.session_exercises for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy session_exercises_delete on public.session_exercises for delete to authenticated using (user_id = (select auth.uid()));

create policy session_sets_read on public.session_sets for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_student(user_id, 'sessions:read'));
create policy session_sets_insert on public.session_sets for insert to authenticated with check (user_id = (select auth.uid()));
create policy session_sets_update on public.session_sets for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy session_sets_delete on public.session_sets for delete to authenticated using (user_id = (select auth.uid()));

create policy activities_read on public.activities for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_student(user_id, 'activities:read'));
create policy activities_insert on public.activities for insert to authenticated with check (user_id = (select auth.uid()));
create policy activities_update on public.activities for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy activities_delete on public.activities for delete to authenticated using (user_id = (select auth.uid()));

-- Dados sensíveis (ciclo, humor, peso): instrutor só com opt-in explícito (wellbeing:read / body:read).
create policy wellbeing_read on public.wellbeing_entries for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_student(user_id, 'wellbeing:read'));
create policy wellbeing_insert on public.wellbeing_entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy wellbeing_update on public.wellbeing_entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy wellbeing_delete on public.wellbeing_entries for delete to authenticated using (user_id = (select auth.uid()));

create policy body_weights_read on public.body_weights for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_student(user_id, 'body:read'));
create policy body_weights_insert on public.body_weights for insert to authenticated with check (user_id = (select auth.uid()));
create policy body_weights_update on public.body_weights for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy body_weights_delete on public.body_weights for delete to authenticated using (user_id = (select auth.uid()));

create policy suggestions_read on public.progression_suggestions for select to authenticated
  using (user_id = (select auth.uid()) or private.can_read_student(user_id, 'sessions:read'));
create policy suggestions_insert on public.progression_suggestions for insert to authenticated with check (user_id = (select auth.uid()));
create policy suggestions_update on public.progression_suggestions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy suggestions_delete on public.progression_suggestions for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- RPCs do usuário (LGPD)
-- Apaga TODOS os dados pessoais do usuário atual (mantém a conta). Os arquivos do Storage são removidos pelo app.
create function public.erase_my_data() returns void
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'não autenticado' using errcode = '28000'; end if;
  delete from public.progression_suggestions where user_id = uid;
  delete from public.workout_sessions where user_id = uid;       -- cascata: exercícios e séries
  delete from public.workouts where user_id = uid;               -- cascata: itens
  delete from public.activities where user_id = uid;
  delete from public.wellbeing_entries where user_id = uid;
  delete from public.body_weights where user_id = uid;
  delete from public.user_exercise_prefs where user_id = uid;
  delete from public.exercise_media where owner_id = uid;
  delete from public.exercises where owner_id = uid and origin = 'custom';
  update public.profiles set display_name = '', age = null, sex = null, height_cm = null, weight_kg = null,
         goal = null, level = null, settings = '{}'::jsonb, onboarded_at = null where id = uid;
end $$;

-- Exclui a conta e, por cascata, todos os dados do usuário.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'não autenticado' using errcode = '28000'; end if;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.erase_my_data() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.erase_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;

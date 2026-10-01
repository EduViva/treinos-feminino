-- ============================================================================
-- 1) Identidade, papéis (RBAC), organizações e vínculos instrutor ↔ aluno
--
-- Modelo:  Aluno → Instrutor → Academia (organizations)
--   * profiles            1:1 com auth.users (dados do perfil + preferências)
--   * roles/permissions   papéis são DADOS (adicionar um perfil novo = inserir linhas)
--   * user_roles          papel de um usuário, global ou dentro de uma organização
--   * organizations       academias / grupos
--   * instructor_students vínculo instrutor ↔ aluno; o ALUNO decide o que compartilha (scopes)
--
-- Funções auxiliares ficam no schema `private` (não exposto pela API REST).
-- ============================================================================

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Ninguém além do dono/serviço lê tabelas "por padrão": anon não recebe privilégios em novas tabelas.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- updated_at é SEMPRE definido pelo servidor (cursor confiável da sincronização; o cliente não consegue forjar).
create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- papéis e permissões
create table public.roles (
  id          text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create table public.permissions (
  id          text primary key check (id ~ '^[a-z][a-z0-9_.]*$'),
  description text not null default ''
);

create table public.role_permissions (
  role_id       text not null references public.roles (id) on delete cascade,
  permission_id text not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---------------------------------------------------------------- organizações (academias)
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 2 and 120),
  slug       text unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  owner_id   uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- perfis
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 120),
  age          smallint check (age between 5 and 120),
  sex          text,
  height_cm    numeric(5, 1) check (height_cm between 50 and 260),
  weight_kg    numeric(5, 2) check (weight_kg between 20 and 500),
  goal         text,
  level        text,
  settings     jsonb not null default '{}'::jsonb,   -- preferências do app (som, vibração, tema, descanso padrão…)
  onboarded_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- papéis por usuário
create table public.user_roles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  role_id         text not null references public.roles (id) on delete restrict,
  organization_id uuid references public.organizations (id) on delete cascade,  -- null = papel global
  created_at      timestamptz not null default now(),
  unique nulls not distinct (user_id, role_id, organization_id)
);
create index user_roles_user_idx on public.user_roles (user_id);
create index user_roles_org_idx on public.user_roles (organization_id) where organization_id is not null;

-- ---------------------------------------------------------------- vínculo instrutor ↔ aluno
create table public.instructor_students (
  id              uuid primary key default gen_random_uuid(),
  instructor_id   uuid not null references auth.users (id) on delete cascade,
  student_id      uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  -- O que o instrutor pode ver/fazer. Bem-estar e corpo (ciclo, peso) só com opt-in explícito do aluno.
  scopes          text[] not null default array['workouts:read', 'workouts:write', 'sessions:read', 'activities:read']
                  check (scopes <@ array['workouts:read', 'workouts:write', 'sessions:read', 'activities:read', 'wellbeing:read', 'body:read']),
  invited_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  ended_at        timestamptz,
  check (instructor_id <> student_id),
  unique (instructor_id, student_id)
);
create index instructor_students_student_idx on public.instructor_students (student_id, status);
create index instructor_students_instructor_idx on public.instructor_students (instructor_id, status);

create trigger organizations_touch before insert or update on public.organizations for each row execute function private.touch_updated_at();
create trigger profiles_touch before insert or update on public.profiles for each row execute function private.touch_updated_at();
create trigger links_touch before insert or update on public.instructor_students for each row execute function private.touch_updated_at();

-- O vínculo não pode ser "redirecionado": partes são imutáveis (muda só status/escopos).
create function private.guard_link_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.instructor_id <> old.instructor_id or new.student_id <> old.student_id then
    raise exception 'instructor_id e student_id não podem ser alterados' using errcode = '42501';
  end if;
  if new.status = 'ended' and old.status <> 'ended' then new.ended_at := now(); end if;
  return new;
end $$;
create trigger links_guard before update on public.instructor_students for each row execute function private.guard_link_update();

-- ---------------------------------------------------------------- funções de autorização (private)
-- Permissão GLOBAL (papel sem organização) ou da organização informada.
create function private.has_permission(p_permission text, p_org uuid default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = (select auth.uid())
      and rp.permission_id = p_permission
      and (ur.organization_id is null or ur.organization_id = p_org)
  );
$$;

-- Permissão em QUALQUER contexto (global ou de alguma organização).
create function private.has_permission_any(p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = (select auth.uid()) and rp.permission_id = p_permission
  );
$$;

create function private.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_org is not null and exists (
    select 1 from public.user_roles ur where ur.user_id = (select auth.uid()) and ur.organization_id = p_org
  );
$$;

create function private.user_is_instructor(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = p_user and rp.permission_id = 'students.view'
  );
$$;

-- O aluno atual é vinculado (ativo) ao instrutor informado?
create function private.is_my_instructor(p_instructor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.instructor_students l
    where l.student_id = (select auth.uid()) and l.instructor_id = p_instructor and l.status = 'active'
  );
$$;

-- Há vínculo (pendente ou ativo) entre o usuário atual e o outro, em qualquer direção?
create function private.is_linked_with(p_other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.instructor_students l
    where l.status in ('pending', 'active')
      and ((l.instructor_id = (select auth.uid()) and l.student_id = p_other)
        or (l.student_id = (select auth.uid()) and l.instructor_id = p_other))
  );
$$;

-- Leitura dos dados de um aluno: o próprio aluno OU um instrutor com vínculo ativo, escopo liberado e permissão.
create function private.can_read_student(p_student uuid, p_scope text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_student = (select auth.uid())
    or (
      exists (
        select 1 from public.instructor_students l
        where l.instructor_id = (select auth.uid()) and l.student_id = p_student
          and l.status = 'active' and p_scope = any (l.scopes)
      )
      and private.has_permission_any('students.view')
    );
$$;

-- Escrita de treinos de um aluno: o próprio aluno OU instrutor com vínculo ativo + escopo workouts:write + permissão.
create function private.can_write_student_workouts(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_student = (select auth.uid())
    or (
      exists (
        select 1 from public.instructor_students l
        where l.instructor_id = (select auth.uid()) and l.student_id = p_student
          and l.status = 'active' and 'workouts:write' = any (l.scopes)
      )
      and private.has_permission_any('workouts.assign')
    );
$$;

-- Novo usuário → perfil + papel padrão "student". Ninguém escolhe o próprio papel.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1)));
  insert into public.user_roles (user_id, role_id) values (new.id, 'student');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------- RLS
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.instructor_students enable row level security;

create policy roles_read on public.roles for select to authenticated using (true);
create policy roles_admin on public.roles for all to authenticated
  using ((select private.has_permission('roles.manage'))) with check ((select private.has_permission('roles.manage')));
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy permissions_admin on public.permissions for all to authenticated
  using ((select private.has_permission('roles.manage'))) with check ((select private.has_permission('roles.manage')));
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
create policy role_permissions_admin on public.role_permissions for all to authenticated
  using ((select private.has_permission('roles.manage'))) with check ((select private.has_permission('roles.manage')));

create policy organizations_read on public.organizations for select to authenticated
  using (owner_id = (select auth.uid()) or (select private.is_org_member(id)) or (select private.has_permission('organizations.manage')));
create policy organizations_admin on public.organizations for all to authenticated
  using ((select private.has_permission('organizations.manage'))) with check ((select private.has_permission('organizations.manage')));

-- profiles: o próprio; a contraparte de um vínculo; administradores.
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.is_linked_with(id) or (select private.has_permission('roles.manage')));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- user_roles: leitura do próprio; escrita só por administradores (usuário NÃO se promove).
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('roles.manage')));
create policy user_roles_admin on public.user_roles for all to authenticated
  using ((select private.has_permission('roles.manage'))) with check ((select private.has_permission('roles.manage')));

-- instructor_students
create policy links_read on public.instructor_students for select to authenticated
  using (student_id = (select auth.uid()) or instructor_id = (select auth.uid()) or (select private.has_permission('roles.manage')));
-- Instrutor convida (fica "pending" até o aluno aceitar).
create policy links_invite_by_instructor on public.instructor_students for insert to authenticated
  with check (instructor_id = (select auth.uid()) and status = 'pending' and invited_by = (select auth.uid())
              and (select private.has_permission_any('students.view')));
-- Aluno escolhe um instrutor (ele mesmo consente → já nasce ativo).
create policy links_create_by_student on public.instructor_students for insert to authenticated
  with check (student_id = (select auth.uid()) and status = 'active' and invited_by = (select auth.uid())
              and private.user_is_instructor(instructor_id));
-- Só o aluno aceita/encerra/ajusta escopos; o instrutor pode apenas desfazer o vínculo.
create policy links_update_by_student on public.instructor_students for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));
create policy links_delete on public.instructor_students for delete to authenticated
  using (student_id = (select auth.uid()) or instructor_id = (select auth.uid()));

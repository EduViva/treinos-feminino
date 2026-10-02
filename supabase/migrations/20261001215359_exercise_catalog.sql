-- ============================================================================
-- 2) Catálogo de exercícios (global) + exercícios personalizados + mídia + preferências
--
--   exercises                    UMA tabela para os dois mundos:
--                                  origin = 'catalog'  → catálogo global (somente admin escreve)
--                                  origin = 'custom'   → criado por um usuário/instrutor (owner_id)
--                                Um exercício personalizado NUNCA altera o global; pode "derivar" dele
--                                (parent_exercise_id).
--   exercise_secondary_muscles   músculos secundários (N:N, normalizado)
--   exercise_media               metadados de imagens/animações/vídeos (arquivos ficam no Storage)
--   user_exercise_prefs          o que é PESSOAL de cada usuário sobre qualquer exercício
--                                (favorito, arquivado, observações, padrões de séries/carga)
--   muscle_groups / equipment_types / exercise_types   tabelas de referência
-- ============================================================================

-- ---------------------------------------------------------------- referência
create table public.muscle_groups (
  id         text primary key check (id ~ '^[a-z][a-z0-9-]*$'),
  name       text not null,
  sort_order smallint not null default 0
);
create table public.equipment_types (
  id         text primary key check (id ~ '^[a-z][a-z0-9-]*$'),
  name       text not null,
  sort_order smallint not null default 0
);
create table public.exercise_types (
  id         text primary key check (id ~ '^[a-z][a-z0-9-]*$'),
  name       text not null,
  sort_order smallint not null default 0
);

-- ---------------------------------------------------------------- exercícios
create table public.exercises (
  id                   uuid primary key default gen_random_uuid(),
  origin               text not null default 'custom' check (origin in ('catalog', 'custom')),
  slug                 text check (slug ~ '^[a-z0-9][a-z0-9-]*$'),              -- chave estável do catálogo (seed idempotente)
  name                 text not null check (length(btrim(name)) between 2 and 120),
  aliases              text[] not null default '{}',                           -- nomes alternativos / sinônimos (busca)
  primary_group_id     text not null references public.muscle_groups (id),
  equipment_id         text not null references public.equipment_types (id),
  exercise_type_id     text not null default 'forca' references public.exercise_types (id),
  level                text check (level in ('iniciante', 'intermediario', 'avancado')),
  instructions         text[] not null default '{}',
  tips                 text[] not null default '{}',
  art_key              text,                                                   -- animação embutida no app (SVG procedural)
  default_sets         smallint not null default 3 check (default_sets between 1 and 20),
  default_reps         smallint not null default 12 check (default_reps between 1 and 3600),
  default_rest_seconds smallint not null default 90 check (default_rest_seconds between 0 and 900),
  default_load         numeric(7, 2) not null default 0 check (default_load >= 0),
  load_step            numeric(5, 2) not null default 2 check (load_step > 0),
  rep_unit             text not null default 'reps' check (rep_unit in ('reps', 'seg', 'min')),
  is_bodyweight        boolean not null default false,
  is_active            boolean not null default true,
  owner_id             uuid references auth.users (id) on delete cascade,
  organization_id      uuid references public.organizations (id) on delete cascade,
  visibility           text not null default 'private' check (visibility in ('public', 'organization', 'students', 'private')),
  parent_exercise_id   uuid references public.exercises (id) on delete set null,
  search_text          text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  constraint exercises_origin_shape check (
    (origin = 'catalog' and owner_id is null and organization_id is null and visibility = 'public' and slug is not null)
    or (origin = 'custom' and owner_id is not null and visibility <> 'public')
  ),
  constraint exercises_org_visibility check (visibility <> 'organization' or organization_id is not null)
);
create unique index exercises_catalog_slug_uq on public.exercises (slug) where origin = 'catalog';
create index exercises_owner_idx on public.exercises (owner_id, updated_at) where owner_id is not null;
create index exercises_catalog_updated_idx on public.exercises (updated_at) where origin = 'catalog';
create index exercises_group_idx on public.exercises (primary_group_id);
create index exercises_equipment_idx on public.exercises (equipment_id);
create index exercises_search_trgm_idx on public.exercises using gin (search_text extensions.gin_trgm_ops);

-- search_text = nome + sinônimos, minúsculo e sem acento ("supino" encontra "Supíno", "bench press" etc.)
create function private.exercises_search_text() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.search_text := lower(extensions.unaccent('extensions.unaccent'::regdictionary,
                     btrim(new.name || ' ' || coalesce(array_to_string(new.aliases, ' '), ''))));
  return new;
end $$;
create trigger exercises_search before insert or update of name, aliases on public.exercises
  for each row execute function private.exercises_search_text();
create trigger exercises_touch before insert or update on public.exercises
  for each row execute function private.touch_updated_at();

create table public.exercise_secondary_muscles (
  exercise_id     uuid not null references public.exercises (id) on delete cascade,
  muscle_group_id text not null references public.muscle_groups (id),
  primary key (exercise_id, muscle_group_id)
);

-- Mexer em músculos secundários "toca" o exercício: clientes que sincronizam por updated_at percebem.
create function private.touch_parent_exercise() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.exercises set updated_at = now() where id = coalesce(new.exercise_id, old.exercise_id);
  return null;
end $$;
create trigger exercise_secondary_touch after insert or delete on public.exercise_secondary_muscles
  for each row execute function private.touch_parent_exercise();

-- ---------------------------------------------------------------- mídia (metadados; arquivos no Storage)
create table public.exercise_media (
  id           uuid primary key default gen_random_uuid(),
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  owner_id     uuid references auth.users (id) on delete cascade,          -- null = mídia do catálogo
  kind         text not null check (kind in ('image', 'video', 'gif', 'animation', 'illustration')),
  bucket       text not null check (bucket in ('catalog-media', 'user-media')),
  storage_path text not null,
  mime_type    text,
  size_bytes   bigint check (size_bytes >= 0),
  width        integer,
  height       integer,
  duration_ms  integer,
  title        text,
  alt_text     text,
  position     smallint not null default 0,
  is_primary   boolean not null default false,
  source       text,                                                        -- origem/autoria (atribuição)
  license      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  unique (bucket, storage_path),
  constraint exercise_media_owner_bucket check (
    (owner_id is null and bucket = 'catalog-media') or (owner_id is not null and bucket = 'user-media')
  )
);
create index exercise_media_exercise_idx on public.exercise_media (exercise_id);
create index exercise_media_owner_idx on public.exercise_media (owner_id, updated_at) where owner_id is not null;
create trigger exercise_media_touch before insert or update on public.exercise_media
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------- preferências pessoais por exercício
create table public.user_exercise_prefs (
  user_id              uuid not null references auth.users (id) on delete cascade,
  exercise_id          uuid not null references public.exercises (id) on delete cascade,
  is_favorite          boolean not null default false,
  is_archived          boolean not null default false,
  notes                text not null default '',
  default_sets         smallint check (default_sets between 1 and 20),
  default_reps         smallint check (default_reps between 1 and 3600),
  default_load         numeric(7, 2) check (default_load >= 0),
  default_rest_seconds smallint check (default_rest_seconds between 0 and 900),
  load_step            numeric(5, 2) check (load_step > 0),
  primary_media_id     uuid references public.exercise_media (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
create index user_exercise_prefs_sync_idx on public.user_exercise_prefs (user_id, updated_at);
create trigger user_exercise_prefs_touch before insert or update on public.user_exercise_prefs
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------- autorização
-- O exercício é legível por quem?
--   catálogo           → todos os autenticados
--   próprio            → dono
--   'students'         → alunos com vínculo ativo com o dono (instrutor)
--   'organization'     → membros da organização
create function private.can_read_exercise(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.exercises e
    where e.id = p_id
      and (e.origin = 'catalog'
        or e.owner_id = (select auth.uid())
        or (e.visibility = 'students' and private.is_my_instructor(e.owner_id))
        or (e.visibility = 'organization' and private.is_org_member(e.organization_id)))
  );
$$;

create function private.can_write_exercise(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.exercises e
    where e.id = p_id
      and ((e.origin = 'custom' and e.owner_id = (select auth.uid()))
        or (e.origin = 'catalog' and private.has_permission('catalog.manage')))
  );
$$;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- ---------------------------------------------------------------- RLS
alter table public.muscle_groups enable row level security;
alter table public.equipment_types enable row level security;
alter table public.exercise_types enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_secondary_muscles enable row level security;
alter table public.exercise_media enable row level security;
alter table public.user_exercise_prefs enable row level security;

create policy muscle_groups_read on public.muscle_groups for select to authenticated using (true);
create policy muscle_groups_admin on public.muscle_groups for all to authenticated
  using ((select private.has_permission('catalog.manage'))) with check ((select private.has_permission('catalog.manage')));
create policy equipment_types_read on public.equipment_types for select to authenticated using (true);
create policy equipment_types_admin on public.equipment_types for all to authenticated
  using ((select private.has_permission('catalog.manage'))) with check ((select private.has_permission('catalog.manage')));
create policy exercise_types_read on public.exercise_types for select to authenticated using (true);
create policy exercise_types_admin on public.exercise_types for all to authenticated
  using ((select private.has_permission('catalog.manage'))) with check ((select private.has_permission('catalog.manage')));

-- exercises
create policy exercises_read on public.exercises for select to authenticated
  using (origin = 'catalog'
         or owner_id = (select auth.uid())
         or (visibility = 'students' and private.is_my_instructor(owner_id))
         or (visibility = 'organization' and private.is_org_member(organization_id)));

create policy exercises_insert on public.exercises for insert to authenticated
  with check (
    (origin = 'custom' and owner_id = (select auth.uid()) and (
        (visibility = 'private' and organization_id is null and (select private.has_permission_any('exercises.create_custom')))
     or (visibility = 'students' and organization_id is null and (select private.has_permission_any('exercises.share')))
     or (visibility = 'organization' and (select private.has_permission('exercises.share', organization_id)))
    ))
    or (origin = 'catalog' and (select private.has_permission('catalog.manage')))
  );

create policy exercises_update on public.exercises for update to authenticated
  using ((origin = 'custom' and owner_id = (select auth.uid()))
         or (origin = 'catalog' and (select private.has_permission('catalog.manage'))))
  with check (
    (origin = 'custom' and owner_id = (select auth.uid()) and (
        (visibility = 'private' and organization_id is null and (select private.has_permission_any('exercises.create_custom')))
     or (visibility = 'students' and organization_id is null and (select private.has_permission_any('exercises.share')))
     or (visibility = 'organization' and (select private.has_permission('exercises.share', organization_id)))
    ))
    or (origin = 'catalog' and (select private.has_permission('catalog.manage')))
  );

create policy exercises_delete on public.exercises for delete to authenticated
  using ((origin = 'custom' and owner_id = (select auth.uid()))
         or (origin = 'catalog' and (select private.has_permission('catalog.manage'))));

-- exercise_secondary_muscles: herda a visibilidade/escrita do exercício
create policy secondary_read on public.exercise_secondary_muscles for select to authenticated
  using (private.can_read_exercise(exercise_id));
create policy secondary_write on public.exercise_secondary_muscles for all to authenticated
  using (private.can_write_exercise(exercise_id)) with check (private.can_write_exercise(exercise_id));

-- exercise_media: mídia do catálogo (owner null) é pública p/ autenticados; a pessoal só do dono
create policy media_read on public.exercise_media for select to authenticated
  using ((owner_id is null and private.can_read_exercise(exercise_id)) or owner_id = (select auth.uid()));
create policy media_insert on public.exercise_media for insert to authenticated
  with check (
    (owner_id = (select auth.uid()) and bucket = 'user-media' and storage_path like (select auth.uid())::text || '/%'
      and private.can_read_exercise(exercise_id))
    or (owner_id is null and bucket = 'catalog-media' and (select private.has_permission('catalog.manage')))
  );
create policy media_update on public.exercise_media for update to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and (select private.has_permission('catalog.manage'))))
  with check (
    (owner_id = (select auth.uid()) and bucket = 'user-media' and storage_path like (select auth.uid())::text || '/%')
    or (owner_id is null and bucket = 'catalog-media' and (select private.has_permission('catalog.manage')))
  );
create policy media_delete on public.exercise_media for delete to authenticated
  using (owner_id = (select auth.uid()) or (owner_id is null and (select private.has_permission('catalog.manage'))));

-- user_exercise_prefs: estritamente do próprio usuário
create policy prefs_read on public.user_exercise_prefs for select to authenticated using (user_id = (select auth.uid()));
create policy prefs_insert on public.user_exercise_prefs for insert to authenticated
  with check (user_id = (select auth.uid()) and private.can_read_exercise(exercise_id));
create policy prefs_update on public.user_exercise_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy prefs_delete on public.user_exercise_prefs for delete to authenticated using (user_id = (select auth.uid()));

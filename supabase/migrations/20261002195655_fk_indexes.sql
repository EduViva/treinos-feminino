-- Índices de cobertura para FKs de tabelas pequenas/de referência (apontados pelo advisor de performance).
-- As FKs compostas (id, user_id) de filhas de treino/sessão já são atendidas pelo prefixo do índice/PK existente
-- (a busca é por id do pai), então não ganham índice extra — evita custo de escrita nas tabelas mais quentes.
create index if not exists progression_suggestions_exercise_idx on public.progression_suggestions (exercise_id);
create index if not exists exercises_exercise_type_idx on public.exercises (exercise_type_id);
create index if not exists exercise_secondary_muscles_group_idx on public.exercise_secondary_muscles (muscle_group_id);
create index if not exists instructor_students_invited_by_idx on public.instructor_students (invited_by) where invited_by is not null;
create index if not exists organizations_owner_idx on public.organizations (owner_id);
create index if not exists role_permissions_permission_idx on public.role_permissions (permission_id);
create index if not exists user_roles_role_idx on public.user_roles (role_id);

-- ============================================================================
-- 5) Refinos apontados pelo linter do Supabase
--    * uma única política PERMISSIVA por ação (SELECT não é mais coberto por duas políticas)
--    * índices cobrindo FKs que participam de cascatas / consultas frequentes
-- ============================================================================

-- Políticas de administração: "for all" → insert/update/delete (SELECT fica só na política de leitura)
do $$
declare
  r record;
begin
  for r in select * from (values
      ('roles', 'roles.manage'), ('permissions', 'roles.manage'), ('role_permissions', 'roles.manage'),
      ('user_roles', 'roles.manage'), ('organizations', 'organizations.manage'),
      ('muscle_groups', 'catalog.manage'), ('equipment_types', 'catalog.manage'), ('exercise_types', 'catalog.manage')
    ) as v(tbl, perm)
  loop
    execute format('drop policy %I on public.%I', r.tbl || '_admin', r.tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.has_permission(%L)))',
                   r.tbl || '_admin_insert', r.tbl, r.perm);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.has_permission(%L))) with check ((select private.has_permission(%L)))',
                   r.tbl || '_admin_update', r.tbl, r.perm, r.perm);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.has_permission(%L)))',
                   r.tbl || '_admin_delete', r.tbl, r.perm);
  end loop;
end $$;

drop policy secondary_write on public.exercise_secondary_muscles;
create policy secondary_insert on public.exercise_secondary_muscles for insert to authenticated
  with check (private.can_write_exercise(exercise_id));
create policy secondary_update on public.exercise_secondary_muscles for update to authenticated
  using (private.can_write_exercise(exercise_id)) with check (private.can_write_exercise(exercise_id));
create policy secondary_delete on public.exercise_secondary_muscles for delete to authenticated
  using (private.can_write_exercise(exercise_id));

-- Convite do instrutor OU escolha do aluno: uma política só (mesma regra, expressa com OR)
drop policy links_invite_by_instructor on public.instructor_students;
drop policy links_create_by_student on public.instructor_students;
create policy links_insert on public.instructor_students for insert to authenticated
  with check (
    (instructor_id = (select auth.uid()) and status = 'pending' and invited_by = (select auth.uid())
      and (select private.has_permission_any('students.view')))
    or
    (student_id = (select auth.uid()) and status = 'active' and invited_by = (select auth.uid())
      and private.user_is_instructor(instructor_id))
  );

-- Índices de FK (apagar exercício/treino/mídia varre estas colunas)
create index user_exercise_prefs_exercise_idx on public.user_exercise_prefs (exercise_id);
create index user_exercise_prefs_media_idx on public.user_exercise_prefs (primary_media_id) where primary_media_id is not null;
create index workout_sessions_workout_idx on public.workout_sessions (workout_id) where workout_id is not null;
create index progression_suggestions_workout_idx on public.progression_suggestions (workout_id) where workout_id is not null;
create index workouts_created_by_idx on public.workouts (created_by) where created_by is not null;
create index exercises_parent_idx on public.exercises (parent_exercise_id) where parent_exercise_id is not null;
create index exercises_organization_idx on public.exercises (organization_id) where organization_id is not null;
create index instructor_students_org_idx on public.instructor_students (organization_id) where organization_id is not null;

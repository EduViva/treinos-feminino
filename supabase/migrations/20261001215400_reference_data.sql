-- GERADO por scripts/build-seed.mjs a partir de js/data/taxonomy.js — não edite à mão.
-- Dados de referência: papéis/permissões e tabelas de apoio do catálogo. Idempotente.

insert into public.roles (id, name, description) values
  ('student', 'Aluno', 'Usa o app para treinar e acompanhar a própria evolução.'),
  ('instructor', 'Instrutor', 'Acompanha alunos vinculados, cadastra exercícios e monta treinos para eles.'),
  ('admin', 'Administrador', 'Gerencia catálogo global, papéis e organizações.')
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.permissions (id, description) values
  ('exercises.create_custom', 'Criar exercícios personalizados privados'),
  ('exercises.share', 'Compartilhar exercícios personalizados com alunos/organização'),
  ('workouts.assign', 'Montar treinos para alunos vinculados'),
  ('students.view', 'Ver dados de alunos vinculados (conforme autorização do aluno)'),
  ('catalog.manage', 'Editar o catálogo global de exercícios e mídias'),
  ('roles.manage', 'Atribuir e revogar papéis'),
  ('organizations.manage', 'Gerenciar organizações (academias)')
on conflict (id) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id) values
  ('student', 'exercises.create_custom'),
  ('instructor', 'exercises.create_custom'),
  ('instructor', 'exercises.share'),
  ('instructor', 'workouts.assign'),
  ('instructor', 'students.view'),
  ('admin', 'exercises.create_custom'),
  ('admin', 'exercises.share'),
  ('admin', 'workouts.assign'),
  ('admin', 'students.view'),
  ('admin', 'catalog.manage'),
  ('admin', 'roles.manage'),
  ('admin', 'organizations.manage')
on conflict do nothing;

insert into public.muscle_groups (id, name, sort_order) values
  ('peitoral', 'Peitoral', 10),
  ('costas', 'Costas', 20),
  ('ombros', 'Ombros', 30),
  ('biceps', 'Bíceps', 40),
  ('triceps', 'Tríceps', 50),
  ('antebraco', 'Antebraço', 60),
  ('quadriceps', 'Quadríceps', 70),
  ('posterior-coxa', 'Posterior de coxa', 80),
  ('gluteos', 'Glúteos', 90),
  ('adutores', 'Adutores', 100),
  ('abdutores', 'Abdutores', 110),
  ('panturrilhas', 'Panturrilhas', 120),
  ('abdomen-core', 'Abdômen/Core', 130),
  ('lombar', 'Lombar', 140),
  ('cardio', 'Cardio', 150),
  ('funcional', 'Funcional', 160),
  ('outros', 'Outros', 170)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.equipment_types (id, name, sort_order) values
  ('maquina', 'Máquina', 10),
  ('polia', 'Polia / cabo', 20),
  ('barra', 'Barra', 30),
  ('halteres', 'Halteres', 40),
  ('smith', 'Smith', 50),
  ('banco', 'Banco', 60),
  ('peso-corporal', 'Peso corporal', 70),
  ('barra-fixa', 'Barra fixa / paralelas', 80),
  ('kettlebell', 'Kettlebell', 90),
  ('elastico', 'Elástico', 100),
  ('anilha', 'Anilha / peso livre', 110),
  ('bola-suica', 'Bola suíça', 120),
  ('medicine-ball', 'Medicine ball', 130),
  ('suspensao', 'TRX / suspensão', 140),
  ('corda-naval', 'Corda naval', 150),
  ('step', 'Step / caixa', 160),
  ('cardio', 'Aparelho de cardio', 170),
  ('outro', 'Outro', 180)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.exercise_types (id, name, sort_order) values
  ('forca', 'Musculação', 10),
  ('cardio', 'Cardio', 20),
  ('funcional', 'Funcional', 30),
  ('alongamento', 'Alongamento', 40),
  ('mobilidade', 'Mobilidade', 50)
on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;

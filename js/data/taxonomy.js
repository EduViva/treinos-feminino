// Taxonomia do catálogo: grupos musculares, equipamentos, tipos de exercício e níveis.
// FONTE ÚNICA: este arquivo gera as tabelas de referência do Supabase (scripts/build-seed.mjs) e é
// usado pelo app para rótulos/filtros (funciona offline). Sem DOM — também roda em Node.
//
// Nos registros do app, grupo/equipamento ficam como RÓTULO (como sempre foi) e são convertidos para
// id (slug) apenas na camada de sincronização (js/sync/mappers.js).

export const MUSCLE_GROUPS = [
  { id: 'peitoral', name: 'Peitoral', legacy: ['Peito'] },
  { id: 'costas', name: 'Costas' },
  { id: 'ombros', name: 'Ombros' },
  { id: 'biceps', name: 'Bíceps' },
  { id: 'triceps', name: 'Tríceps' },
  { id: 'antebraco', name: 'Antebraço' },
  { id: 'quadriceps', name: 'Quadríceps' },
  { id: 'posterior-coxa', name: 'Posterior de coxa', legacy: ['Posteriores'] },
  { id: 'gluteos', name: 'Glúteos' },
  { id: 'adutores', name: 'Adutores' },
  { id: 'abdutores', name: 'Abdutores' },
  { id: 'panturrilhas', name: 'Panturrilhas' },
  { id: 'abdomen-core', name: 'Abdômen/Core', legacy: ['Abdômen'] },
  { id: 'lombar', name: 'Lombar' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'funcional', name: 'Funcional', legacy: ['Exercícios funcionais'] },
  { id: 'outros', name: 'Outros', legacy: ['Outro', 'Corpo inteiro'] },
].map((g, i) => ({ ...g, sort: (i + 1) * 10 }));

export const EQUIPMENT_TYPES = [
  { id: 'maquina', name: 'Máquina' },
  { id: 'polia', name: 'Polia / cabo' },
  { id: 'barra', name: 'Barra' },
  { id: 'halteres', name: 'Halteres' },
  { id: 'smith', name: 'Smith' },
  { id: 'banco', name: 'Banco' },
  { id: 'peso-corporal', name: 'Peso corporal' },
  { id: 'barra-fixa', name: 'Barra fixa / paralelas' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'elastico', name: 'Elástico' },
  { id: 'anilha', name: 'Anilha / peso livre' },
  { id: 'bola-suica', name: 'Bola suíça' },
  { id: 'medicine-ball', name: 'Medicine ball' },
  { id: 'suspensao', name: 'TRX / suspensão' },
  { id: 'corda-naval', name: 'Corda naval' },
  { id: 'step', name: 'Step / caixa' },
  { id: 'cardio', name: 'Aparelho de cardio', legacy: ['Cardio'] },
  { id: 'outro', name: 'Outro' },
].map((e, i) => ({ ...e, sort: (i + 1) * 10 }));

export const EXERCISE_TYPES = [
  { id: 'forca', name: 'Musculação' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'funcional', name: 'Funcional' },
  { id: 'alongamento', name: 'Alongamento' },
  { id: 'mobilidade', name: 'Mobilidade' },
].map((t, i) => ({ ...t, sort: (i + 1) * 10 }));

export const LEVELS = [
  { id: 'iniciante', name: 'Iniciante' },
  { id: 'intermediario', name: 'Intermediário' },
  { id: 'avancado', name: 'Avançado' },
];

// ---------- Papéis e permissões (RBAC) ----------
// Novos perfis = novas linhas aqui/na tabela `roles`; nenhuma mudança de esquema.
export const ROLES = [
  { id: 'student', name: 'Aluno', description: 'Usa o app para treinar e acompanhar a própria evolução.' },
  { id: 'instructor', name: 'Instrutor', description: 'Acompanha alunos vinculados, cadastra exercícios e monta treinos para eles.' },
  { id: 'admin', name: 'Administrador', description: 'Gerencia catálogo global, papéis e organizações.' },
];
export const PERMISSIONS = [
  ['exercises.create_custom', 'Criar exercícios personalizados privados'],
  ['exercises.share', 'Compartilhar exercícios personalizados com alunos/organização'],
  ['workouts.assign', 'Montar treinos para alunos vinculados'],
  ['students.view', 'Ver dados de alunos vinculados (conforme autorização do aluno)'],
  ['catalog.manage', 'Editar o catálogo global de exercícios e mídias'],
  ['roles.manage', 'Atribuir e revogar papéis'],
  ['organizations.manage', 'Gerenciar organizações (academias)'],
];
export const ROLE_PERMISSIONS = {
  student: ['exercises.create_custom'],
  instructor: ['exercises.create_custom', 'exercises.share', 'workouts.assign', 'students.view'],
  admin: ['exercises.create_custom', 'exercises.share', 'workouts.assign', 'students.view', 'catalog.manage', 'roles.manage', 'organizations.manage'],
};

// Escopos que o ALUNO pode liberar a um instrutor (instructor_students.scopes).
export const LINK_SCOPES = ['workouts:read', 'workouts:write', 'sessions:read', 'activities:read', 'wellbeing:read', 'body:read'];
export const DEFAULT_LINK_SCOPES = ['workouts:read', 'workouts:write', 'sessions:read', 'activities:read'];

// ---------- Conversões rótulo ↔ id ----------
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function indexOf(list) {
  const byLabel = new Map(), byId = new Map(list.map((x) => [x.id, x]));
  for (const x of list) { byLabel.set(fold(x.name), x.id); for (const l of x.legacy || []) byLabel.set(fold(l), x.id); byLabel.set(fold(x.id), x.id); }
  return {
    list,
    ids: list.map((x) => x.id),
    names: list.map((x) => x.name),
    id: (label) => byLabel.get(fold(label)) || null,
    name: (id) => byId.get(id)?.name ?? null,
    has: (id) => byId.has(id),
  };
}

export const groups = indexOf(MUSCLE_GROUPS);
export const equipment = indexOf(EQUIPMENT_TYPES);
export const types = indexOf(EXERCISE_TYPES);
export const levels = indexOf(LEVELS);

// Rótulos usados pela interface (a ordem é a ordem de exibição).
export const GROUPS = groups.names;
export const EQUIPMENT = equipment.names;
export const KINDS = Object.fromEntries(EXERCISE_TYPES.map((t) => [t.id, t.name]));
export const LEVEL_NAMES = Object.fromEntries(LEVELS.map((l) => [l.id, l.name]));

// Normaliza um rótulo de grupo antigo ("Peito", "Posteriores"…) para o rótulo atual.
// `kind` resolve "Corpo inteiro" (cardio × funcional). Usado em estatísticas sobre histórico antigo.
export function normGroupLabel(label, kind) {
  if (fold(label) === 'corpo inteiro') return kind === 'cardio' ? groups.name('cardio') : groups.name('funcional');
  return groups.name(groups.id(label)) || groups.name('outros');
}
export function normEquipmentLabel(label) { return equipment.name(equipment.id(label)) || equipment.name('outro'); }

export { fold };

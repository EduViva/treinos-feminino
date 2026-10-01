// Constantes do app e treinos-modelo da semana (Segunda–Sexta).
// A BIBLIOTECA de exercícios agora vem do catálogo no Supabase (supabase/catalog → seed.sql);
// os ids "ex-…" abaixo são os da biblioteca original e são resolvidos pelo catálogo via js/data/legacy-map.js.
// load: 0 = sem carga definida / peso corporal (a usuária define a sua; nada é inventado).

// Rótulos de grupo/equipamento/tipo vêm da taxonomia (a mesma que gera as tabelas do banco).
export { GROUPS, EQUIPMENT, KINDS } from './taxonomy.js';

export const MEDIA_LIMITS = { imageMaxPx: 1600, videoWarnMB: 60 };

// Treinos da semana (segunda a sexta). weekday: 1 = segunda … 5 = sexta.
const I = (exerciseId, over = {}) => ({ exerciseId, ...over });
export const SEED_WORKOUTS = [
  { name: 'Segunda', weekday: 1, description: 'Costas, bíceps e ombro', items: [
    I('ex-al-dorsais'), I('ex-al-biceps-ombro'), I('ex-mob-gato-camelo'), I('ex-mob-circulos-ombro'),
    I('ex-voador-invertido'), I('ex-puxada-supinada'), I('ex-serrote-maq'), I('ex-face-pull'), I('ex-remada-alta'), I('ex-rosca-w'), I('ex-desenv-maq'), I('ex-esteira'),
  ] },
  { name: 'Terça', weekday: 2, description: 'Glúteo e posterior', items: [
    I('ex-al-gluteo-4'), I('ex-al-posterior-tronco'), I('ex-mob-ponte'), I('ex-mob-balanco-perna'),
    I('ex-afundo-step'), I('ex-ext-quadril-polia'), I('ex-pelvica'), I('ex-flexora-deitada'), I('ex-abdominal-infra'),
  ] },
  { name: 'Quarta', weekday: 3, description: 'Peito, tríceps e ombro', items: [
    I('ex-al-peitoral'), I('ex-al-triceps'), I('ex-mob-rot-externa'), I('ex-mob-abertura'),
    I('ex-voador'), I('ex-supino-reto'), I('ex-supino-inclinado'), I('ex-triceps-corda'), I('ex-triceps-frances'), I('ex-elev-lateral'), I('ex-elev-frontal'), I('ex-escada'),
  ] },
  { name: 'Quinta', weekday: 4, description: 'Quadríceps e posterior', items: [
    I('ex-al-quadriceps'), I('ex-al-posterior-step'), I('ex-mob-agach-profundo'), I('ex-mob-balanco-perna'),
    I('ex-smith'), I('ex-hack'), I('ex-leg-press-45'), I('ex-adutora'), I('ex-flexora-em-pe'), I('ex-abdominal-curto'),
  ] },
  { name: 'Sexta', weekday: 5, description: 'Glúteos e quadríceps', items: [
    I('ex-al-gluteo-joelho'), I('ex-al-quadriceps'), I('ex-mob-ponte'), I('ex-mob-agach-profundo'),
    I('ex-quatro-apoios'), I('ex-afundo-smith'), I('ex-extensora'), I('ex-leg-press'), I('ex-sumo-step'), I('ex-abdutora'), I('ex-prancha'),
  ] },
];

export const ACTIVITY_TYPES = [
  { id: 'corrida', label: 'Corrida', color: 'var(--c-corrida)', fields: ['duration', 'distance', 'pace', 'intensity', 'calories'] },
  { id: 'caminhada', label: 'Caminhada', color: 'var(--c-caminhada)', fields: ['duration', 'distance', 'pace', 'intensity', 'calories'] },
  { id: 'bike', label: 'Bike', color: 'var(--c-bike)', fields: ['duration', 'distance', 'speed', 'intensity', 'calories'] },
  { id: 'volei', label: 'Vôlei', color: 'var(--c-volei)', fields: ['duration', 'intensity', 'calories'] },
  { id: 'pingpong', label: 'Ping-pong', color: 'var(--c-pingpong)', fields: ['duration', 'intensity', 'calories'] },
  { id: 'outro', label: 'Outros', color: 'var(--c-outro)', fields: ['duration', 'distance', 'intensity', 'calories'] },
];
export const MUSCULACAO = { id: 'musculacao', label: 'Musculação', color: 'var(--c-musculacao)' };
export const CATEGORIES = [MUSCULACAO, ...ACTIVITY_TYPES];
export const catById = (id) => CATEGORIES.find((c) => c.id === id) || ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];

export const EFFORT = [
  { v: 1, label: 'Muito fácil' }, { v: 2, label: 'Fácil' }, { v: 3, label: 'Moderado' },
  { v: 4, label: 'Difícil' }, { v: 5, label: 'Muito difícil' },
];
export const RIR = [
  { v: 0, label: '0' }, { v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3+' },
];
export const FEEL = [
  { v: 5, label: 'Muito bem' }, { v: 4, label: 'Bem' }, { v: 3, label: 'Normal' },
  { v: 2, label: 'Cansada' }, { v: 1, label: 'Muito cansada' },
];
export const effortLabel = (v) => (EFFORT.find((e) => e.v === v) || {}).label || '';
export const feelLabel = (v) => (FEEL.find((e) => e.v === v) || {}).label || '';

// Biblioteca inicial. Tudo aqui pode ser editado pelo usuário depois.
// `art` aponta para uma animação instrucional (js/figure/arts.js).
// load: 0 = sem carga definida / peso corporal (a usuária define a sua; nada é inventado).

export const GROUPS = [
  'Quadríceps', 'Posteriores', 'Glúteos', 'Adutores', 'Abdutores', 'Panturrilhas',
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Lombar', 'Corpo inteiro', 'Outro',
];

export const EQUIPMENT = [
  'Máquina', 'Polia / cabo', 'Halteres', 'Barra', 'Banco', 'Peso corporal', 'Kettlebell', 'Elástico', 'Outro',
];

export const MEDIA_LIMITS = { imageMaxPx: 1600, videoWarnMB: 60 };

const ex = (id, name, group, secondary, equipment, art, instructions, d = {}) => ({
  id, name, group, secondary, equipment, art,
  instructions,
  defaults: { sets: 3, reps: 12, load: 0, rest: 90, loadStep: 2, ...d },
  repUnit: d.repUnit || 'reps',
  bodyweight: !!d.bodyweight,
  notes: '', mediaPrimary: null,
  builtin: true, archived: false,
});

export const SEED_EXERCISES = [
  ex('ex-leg-press', 'Leg press', 'Quadríceps', ['Glúteos', 'Posteriores'], 'Máquina', 'leg_press', [
    'Sente com a lombar e o quadril bem apoiados no encosto.',
    'Pés na largura dos ombros, centralizados na plataforma.',
    'Empurre a plataforma até quase estender os joelhos, sem travá-los.',
    'Volte devagar até os joelhos formarem cerca de 90°, sem tirar o quadril do banco.',
  ], { loadStep: 5 }),
  ex('ex-extensora', 'Cadeira extensora', 'Quadríceps', [], 'Máquina', 'leg_extension', [
    'Ajuste o encosto: o joelho deve ficar alinhado com o eixo da máquina.',
    'O apoio fica logo acima do tornozelo.',
    'Estenda os joelhos até quase retos e segure 1 segundo.',
    'Desça devagar, controlando o peso.',
  ], { loadStep: 5 }),
  ex('ex-flexora', 'Cadeira flexora', 'Posteriores', ['Panturrilhas'], 'Máquina', 'leg_curl', [
    'Ajuste o encosto e o apoio das coxas para o joelho ficar no eixo.',
    'O rolo fica na parte de trás do tornozelo.',
    'Flexione os joelhos puxando os calcanhares para baixo do assento.',
    'Volte devagar até quase estender as pernas.',
  ], { loadStep: 5 }),
  ex('ex-abdutora', 'Cadeira abdutora', 'Abdutores', ['Glúteos'], 'Máquina', 'hip_abduction', [
    'Sente com as costas apoiadas; os apoios ficam na parte externa dos joelhos.',
    'Abra as pernas empurrando os apoios para fora, sem balançar o tronco.',
    'Segure 1 segundo com as pernas abertas.',
    'Volte devagar, sem deixar o peso bater.',
  ], { loadStep: 5 }),
  ex('ex-adutora', 'Cadeira adutora', 'Adutores', [], 'Máquina', 'hip_adduction', [
    'Sente com as costas apoiadas; os apoios ficam na parte interna dos joelhos.',
    'Feche as pernas levando os apoios para o centro, sem balançar o tronco.',
    'Segure 1 segundo com as pernas fechadas.',
    'Abra devagar, controlando o peso.',
  ], { loadStep: 5 }),
  ex('ex-pelvica', 'Elevação pélvica', 'Glúteos', ['Posteriores'], 'Barra', 'hip_thrust', [
    'Apoie a parte de cima das costas no banco; barra (ou anilha) sobre o quadril.',
    'Pés no chão, joelhos dobrados em cerca de 90° no alto.',
    'Eleve o quadril contraindo os glúteos até o corpo formar uma linha do ombro ao joelho.',
    'Desça devagar sem apoiar totalmente o peso no chão.',
  ], { loadStep: 5 }),
  ex('ex-panturrilha', 'Elevação de panturrilha em pé', 'Panturrilhas', [], 'Halteres', 'calf_raise', [
    'Em pé, com a ponta dos pés apoiada (no chão ou em um degrau).',
    'Suba o máximo que conseguir, sobre a ponta dos pés.',
    'Segure 1 segundo no alto.',
    'Desça devagar, alongando a panturrilha.',
  ], { reps: 15, rest: 60, loadStep: 2 }),
  ex('ex-agachamento', 'Agachamento livre', 'Quadríceps', ['Glúteos', 'Posteriores'], 'Peso corporal', 'squat', [
    'Pés na largura dos ombros, pontas levemente para fora.',
    'Leve o quadril para trás e para baixo, joelhos na direção dos pés.',
    'Desça até as coxas ficarem paralelas ao chão (ou o máximo que conseguir com boa postura).',
    'Suba empurrando o chão com os pés, mantendo o tronco firme.',
  ], { bodyweight: true }),
  ex('ex-goblet', 'Agachamento com halter (goblet)', 'Quadríceps', ['Glúteos', 'Abdômen'], 'Halteres', 'goblet_squat', [
    'Segure o halter junto ao peito, cotovelos apontando para baixo.',
    'Desça o quadril para trás e para baixo, com o tronco ereto.',
    'Desça até as coxas ficarem paralelas ao chão.',
    'Suba empurrando o chão com os pés.',
  ], { loadStep: 2 }),
  ex('ex-afundo', 'Afundo (avanço)', 'Quadríceps', ['Glúteos', 'Posteriores'], 'Peso corporal', 'lunge', [
    'Dê um passo largo à frente, com o tronco ereto.',
    'Desça até o joelho da frente formar cerca de 90°; o de trás aproxima-se do chão.',
    'O joelho da frente não passa muito da ponta do pé.',
    'Empurre o chão com o pé da frente para voltar à posição inicial.',
  ], { bodyweight: true }),
  ex('ex-stiff', 'Stiff com halteres', 'Posteriores', ['Glúteos', 'Lombar'], 'Halteres', 'rdl', [
    'Em pé, joelhos levemente flexionados, halteres à frente das coxas.',
    'Leve o quadril para trás, inclinando o tronco com a coluna reta.',
    'Desça os halteres rente às pernas até sentir o alongamento atrás das coxas.',
    'Volte empurrando o quadril para frente, contraindo os glúteos.',
  ], { loadStep: 2 }),
  ex('ex-gluteo-polia', 'Glúteo na polia (coice)', 'Glúteos', ['Posteriores'], 'Polia / cabo', 'cable_kickback', [
    'Prenda a tornozeleira no tornozelo e segure a torre com as duas mãos.',
    'Incline levemente o tronco para frente, abdômen firme.',
    'Leve a perna para trás e para cima contraindo o glúteo, sem arquear a lombar.',
    'Volte devagar sem deixar o peso encostar.',
  ], { reps: 12, rest: 60, loadStep: 2 }),
  ex('ex-supino-maq', 'Supino na máquina', 'Peito', ['Ombros', 'Tríceps'], 'Máquina', 'chest_press', [
    'Ajuste o banco: as pegadas ficam na altura do meio do peito.',
    'Costas apoiadas; ombros para baixo e para trás.',
    'Empurre até quase estender os cotovelos, sem travar.',
    'Volte devagar até sentir o peito alongar.',
  ], { loadStep: 5 }),
  ex('ex-puxada', 'Puxada alta', 'Costas', ['Bíceps', 'Ombros'], 'Polia / cabo', 'lat_pulldown', [
    'Ajuste o apoio das coxas; pegada um pouco mais larga que os ombros.',
    'Puxe a barra até a altura do peito, levando os cotovelos para baixo.',
    'Aperte as escápulas no final.',
    'Suba devagar até os braços quase esticados.',
  ], { loadStep: 5 }),
  ex('ex-remada', 'Remada sentada', 'Costas', ['Bíceps', 'Ombros'], 'Polia / cabo', 'seated_row', [
    'Pés apoiados, joelhos levemente flexionados, tronco ereto.',
    'Puxe o triângulo em direção ao abdômen, cotovelos junto ao corpo.',
    'Aperte as escápulas no final, sem jogar o tronco para trás.',
    'Volte devagar, alongando as costas sem arredondar a coluna.',
  ], { loadStep: 5 }),
  ex('ex-desenvolvimento', 'Desenvolvimento com halteres', 'Ombros', ['Tríceps'], 'Halteres', 'shoulder_press', [
    'Sentada com as costas apoiadas, halteres na altura dos ombros.',
    'Empurre os halteres para cima até quase estender os cotovelos.',
    'Não arqueie a lombar e mantenha o abdômen firme.',
    'Desça devagar até a altura das orelhas.',
  ], { loadStep: 1 }),
  ex('ex-elev-lateral', 'Elevação lateral', 'Ombros', [], 'Halteres', 'lateral_raise', [
    'Em pé, halteres ao lado do corpo, cotovelos levemente flexionados.',
    'Eleve os braços para os lados até a altura dos ombros.',
    'Não balance o tronco nem encolha os ombros.',
    'Desça devagar.',
  ], { reps: 12, rest: 60, loadStep: 1 }),
  ex('ex-rosca', 'Rosca direta com halteres', 'Bíceps', [], 'Halteres', 'biceps_curl', [
    'Em pé, halteres ao lado do corpo, palmas para frente.',
    'Flexione os cotovelos levando os halteres aos ombros, com os cotovelos fixos junto ao corpo.',
    'Aperte o bíceps em cima.',
    'Desça devagar até estender os braços.',
  ], { rest: 60, loadStep: 1 }),
  ex('ex-triceps-polia', 'Tríceps na polia', 'Tríceps', [], 'Polia / cabo', 'triceps_pushdown', [
    'Em pé, perto da polia alta, cotovelos junto ao corpo.',
    'Estenda os cotovelos empurrando a barra (ou corda) para baixo.',
    'Só os antebraços se movem; os cotovelos ficam parados.',
    'Volte devagar até os antebraços ficarem na horizontal.',
  ], { rest: 60, loadStep: 2.5 }),
  ex('ex-abdominal', 'Abdominal (crunch)', 'Abdômen', [], 'Peso corporal', 'crunch', [
    'Deitada, joelhos dobrados, pés no chão; mãos leves atrás da cabeça.',
    'Contraia o abdômen e eleve as escápulas do chão; o pescoço não puxa.',
    'Segure 1 segundo no alto.',
    'Desça devagar sem relaxar totalmente.',
  ], { reps: 15, rest: 45, bodyweight: true }),
  ex('ex-prancha', 'Prancha', 'Abdômen', ['Ombros', 'Glúteos'], 'Peso corporal', 'plank', [
    'Antebraços no chão, cotovelos sob os ombros.',
    'Corpo em linha reta da cabeça aos calcanhares.',
    'Contraia abdômen e glúteos; não deixe o quadril cair nem subir.',
    'Respire normalmente e segure o tempo planejado.',
  ], { sets: 3, reps: 30, rest: 45, bodyweight: true, repUnit: 'seg' }),
];

// Treinos de exemplo (opcionais, 100% editáveis). Cargas ficam em branco de propósito.
const item = (exerciseId, over = {}) => ({ exerciseId, ...over });
export const SEED_WORKOUTS = [
  {
    name: 'Treino A', description: 'Exemplo: pernas e glúteos',
    items: [
      item('ex-leg-press'), item('ex-extensora'), item('ex-flexora'),
      item('ex-abdutora', { reps: 15 }), item('ex-pelvica', { reps: 10 }), item('ex-panturrilha'),
    ],
  },
  {
    name: 'Treino B', description: 'Exemplo: superiores',
    items: [
      item('ex-supino-maq'), item('ex-puxada'), item('ex-remada'),
      item('ex-desenvolvimento', { reps: 10 }), item('ex-rosca'), item('ex-triceps-polia'),
    ],
  },
  {
    name: 'Treino C', description: 'Exemplo: glúteos e core',
    items: [
      item('ex-agachamento'), item('ex-afundo', { reps: 10 }), item('ex-stiff'),
      item('ex-gluteo-polia'), item('ex-adutora', { reps: 15 }), item('ex-abdominal'), item('ex-prancha'),
    ],
  },
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

// FIXTURE de testes: a biblioteca original do app (antes do catálogo no Supabase).
// Serve para garantir que NADA do que existia se perde na migração (ver tests/unit/catalog.test.mjs).

export const MEDIA_LIMITS = { imageMaxPx: 1600, videoWarnMB: 60 };
// ex(id, nome, grupo, secundários, aparelho, animação, instruções, padrões)
const ex = (id, name, group, secondary, equipment, art, instructions, d = {}) => {
  const kind = d.kind || 'forca';
  const timed = d.repUnit && d.repUnit !== 'reps';
  return {
    id, name, group, secondary, equipment, art, instructions, kind,
    defaults: { sets: 4, reps: 12, load: 0, rest: 90, loadStep: 2, ...d.defaults },
    repUnit: d.repUnit || 'reps',
    bodyweight: !!d.bodyweight || kind !== 'forca' || equipment === 'Peso corporal',
    notes: '', mediaPrimary: null, builtin: true, archived: false,
    ...(timed ? {} : {}),
  };
};
const M = (id, n, g, sec, art, ins, extra = {}) => ex(id, n, g, sec, extra.eq || 'Máquina', art, ins, extra);
const STRETCH = { kind: 'alongamento', repUnit: 'seg', defaults: { sets: 2, reps: 30, rest: 10 } };
const MOB = { kind: 'mobilidade', defaults: { sets: 2, reps: 10, rest: 15 } };

export const SEED_EXERCISES = [
  // ---------------- Alongamentos (segundos) ----------------
  ex('ex-al-dorsais', 'Alongamento de dorsais', 'Costas', ['Ombros'], 'Peso corporal', 'stretch_lats', [
    'Em pé, mãos entrelaçadas à frente.', 'Empurre as mãos para frente e arredonde as costas.', 'Sinta o alongamento entre as escápulas e respire fundo.',
  ], STRETCH),
  ex('ex-al-biceps-ombro', 'Alongamento de bíceps e ombros', 'Bíceps', ['Ombros', 'Peito'], 'Peso corporal', 'stretch_biceps', [
    'Em pé, braços estendidos ao lado do corpo.', 'Leve os braços para trás, com as palmas viradas para baixo.', 'Mantenha o peito aberto e sinta a frente do braço e do ombro.',
  ], STRETCH),
  ex('ex-al-peitoral', 'Alongamento de peitoral no batente', 'Peito', ['Ombros', 'Bíceps'], 'Peso corporal', 'stretch_chest', [
    'Apoie os antebraços no batente, cotovelos na altura dos ombros.', 'Dê um passo à frente, deixando o peito passar pelo batente.', 'Sinta abrir o peito; mantenha o abdômen firme.',
  ], STRETCH),
  ex('ex-al-triceps', 'Alongamento de tríceps', 'Tríceps', ['Ombros'], 'Peso corporal', 'stretch_triceps', [
    'Dobre um braço atrás da cabeça.', 'Com a outra mão, empurre suavemente o cotovelo para trás.', 'Sinta o alongamento no tríceps; depois troque de lado.',
  ], STRETCH),
  ex('ex-al-gluteo-4', 'Alongamento de glúteo (figura 4)', 'Glúteos', ['Posteriores'], 'Peso corporal', 'stretch_glute_fig4', [
    'Deitada, joelhos dobrados e pés no chão.', 'Cruze um tornozelo sobre o joelho oposto.', 'Puxe a coxa de baixo em direção ao peito até sentir o glúteo alongar; troque de lado.',
  ], STRETCH),
  ex('ex-al-gluteo-joelho', 'Alongamento de glúteo (joelho ao peito)', 'Glúteos', ['Lombar', 'Posteriores'], 'Peso corporal', 'stretch_glute_knee', [
    'Deitada de barriga para cima.', 'Abrace um joelho e traga-o em direção ao peito.', 'Mantenha a lombar apoiada no chão; troque de perna.',
  ], STRETCH),
  ex('ex-al-posterior-tronco', 'Alongamento de posterior (inclinação de tronco)', 'Posteriores', ['Lombar', 'Panturrilhas'], 'Peso corporal', 'stretch_fold', [
    'Em pé, pernas estendidas.', 'Incline o tronco à frente, quadril para trás, mãos em direção aos pés.', 'Sinta atrás das coxas, sem forçar a lombar.',
  ], STRETCH),
  ex('ex-al-posterior-step', 'Alongamento de posterior com perna no step', 'Posteriores', ['Panturrilhas'], 'Peso corporal', 'stretch_hamstring_step', [
    'Apoie um calcanhar no step, joelho quase estendido.', 'Incline o tronco com a coluna reta em direção ao pé apoiado.', 'Sinta atrás da coxa; troque de perna.',
  ], STRETCH),
  ex('ex-al-quadriceps', 'Alongamento de quadríceps em pé', 'Quadríceps', ['Abdômen'], 'Peso corporal', 'stretch_quad', [
    'Em pé, apoie-se se precisar.', 'Dobre o joelho e segure o pé, levando o calcanhar ao glúteo.', 'Joelhos juntos e quadril para frente; troque de perna.',
  ], STRETCH),

  // ---------------- Mobilidade ----------------
  ex('ex-mob-circulos-ombro', 'Círculos de ombro', 'Ombros', [], 'Peso corporal', 'mob_shoulder_circles', [
    'Em pé, braços ao lado do corpo.', 'Faça círculos amplos com os braços, pelos lados e acima da cabeça.', 'Movimento controlado, sem encolher o pescoço.',
  ], MOB),
  ex('ex-mob-gato-camelo', 'Gato-camelo', 'Costas', ['Lombar', 'Abdômen'], 'Peso corporal', 'mob_cat_camel', [
    'Quatro apoios: mãos sob os ombros e joelhos sob o quadril.', 'Arredonde a coluna e olhe para o umbigo.', 'Depois estenda a coluna olhando à frente; alterne devagar.',
  ], MOB),
  ex('ex-mob-rot-externa', 'Rotação externa de ombro', 'Ombros', ['Costas'], 'Peso corporal', 'mob_ext_rotation', [
    'Cotovelos junto ao corpo, dobrados a 90°.', 'Gire os antebraços para fora sem afastar os cotovelos.', 'Volte devagar.',
  ], MOB),
  ex('ex-mob-abertura', 'Abertura de braços (mobilidade de tórax)', 'Peito', ['Ombros', 'Costas'], 'Peso corporal', 'mob_open_arms', [
    'Em pé, braços cruzados à frente do peito.', 'Abra os braços para os lados levando as escápulas para trás.', 'Volte abraçando o corpo.',
  ], MOB),
  ex('ex-mob-ponte', 'Ponte de quadril (mobilidade)', 'Glúteos', ['Posteriores', 'Lombar'], 'Peso corporal', 'mob_glute_bridge', [
    'Deitada, joelhos dobrados e pés no chão.', 'Eleve o quadril contraindo os glúteos.', 'Desça devagar, vértebra por vértebra.',
  ], MOB),
  ex('ex-mob-balanco-perna', 'Balanço de perna', 'Glúteos', ['Posteriores', 'Quadríceps'], 'Peso corporal', 'mob_leg_swing', [
    'Em pé, uma mão apoiada na parede.', 'Balance a perna estendida para frente e para trás.', 'Aumente a amplitude aos poucos; tronco firme; troque de perna.',
  ], MOB),
  ex('ex-mob-agach-profundo', 'Agachamento profundo (mobilidade)', 'Quadríceps', ['Glúteos', 'Adutores'], 'Peso corporal', 'deep_squat', [
    'Pés um pouco mais afastados que os ombros.', 'Desça o quadril o máximo que a postura permitir, cotovelos empurrando os joelhos para fora.', 'Suba empurrando o chão.',
  ], MOB),

  // ---------------- Segunda: costas, bíceps e ombro ----------------
  M('ex-voador-invertido', 'Voador invertido', 'Costas', ['Ombros', 'Tríceps'], 'reverse_fly', [
    'Peito apoiado no encosto, braços à frente.', 'Abra os braços para trás levando os cotovelos para fora.', 'Aperte as escápulas e volte devagar.',
  ], { defaults: { loadStep: 5 } }),
  M('ex-puxada-supinada', 'Puxada fechada pegada supinada', 'Costas', ['Bíceps', 'Ombros'], 'lat_pulldown_supine', [
    'Pegada fechada com as palmas voltadas para você.', 'Puxe a barra até o peito levando os cotovelos para baixo.', 'Aperte as escápulas e volte devagar.',
  ], { eq: 'Polia / cabo', defaults: { loadStep: 5 } }),
  M('ex-serrote-maq', 'Serrote na máquina', 'Costas', ['Bíceps', 'Ombros'], 'one_arm_row', [
    'Peito apoiado, um braço de cada vez.', 'Puxe o cotovelo para trás rente ao corpo.', 'Aperte a escápula e volte devagar.',
  ], { defaults: { loadStep: 5 } }),
  M('ex-face-pull', 'Face pull com corda', 'Ombros', ['Costas', 'Bíceps'], 'face_pull', [
    'Corda na altura do rosto, braços estendidos.', 'Puxe em direção ao rosto abrindo os cotovelos.', 'Cotovelos altos, escápulas juntas; volte devagar.',
  ], { eq: 'Polia / cabo', defaults: { loadStep: 2.5 } }),
  M('ex-remada-alta', 'Remada alta na polia', 'Ombros', ['Costas', 'Bíceps'], 'upright_row', [
    'Em pé, barra à frente das coxas.', 'Suba a barra rente ao corpo, cotovelos para cima.', 'Até a altura dos ombros, sem encolher o pescoço; desça devagar.',
  ], { eq: 'Polia / cabo', defaults: { loadStep: 2.5 } }),
  M('ex-rosca-w', 'Rosca direta com barra W', 'Bíceps', [], 'ez_curl', [
    'Em pé, barra W com pegada na largura dos ombros.', 'Flexione os cotovelos levando a barra aos ombros, sem balançar.', 'Desça devagar até estender os braços.',
  ], { eq: 'Barra', defaults: { loadStep: 2 } }),
  M('ex-desenv-maq', 'Desenvolvimento na máquina', 'Ombros', ['Tríceps'], 'shoulder_press_machine', [
    'Costas apoiadas, pegadas na altura dos ombros.', 'Empurre para cima até quase estender os cotovelos.', 'Desça devagar até a altura das orelhas.',
  ], { defaults: { loadStep: 5 } }),
  ex('ex-esteira', 'Esteira', 'Corpo inteiro', ['Quadríceps', 'Panturrilhas'], 'Cardio', 'treadmill', [
    'Comece devagar e aumente a velocidade aos poucos.', 'Postura ereta, olhar à frente, braços acompanhando o passo.', 'Termine reduzindo o ritmo para recuperar a respiração.',
  ], { kind: 'cardio', repUnit: 'min', bodyweight: true, defaults: { sets: 1, reps: 20, rest: 0 } }),

  // ---------------- Terça: glúteo e posterior ----------------
  M('ex-afundo-step', 'Afundo com pé da frente no step', 'Quadríceps', ['Glúteos', 'Posteriores'], 'step_lunge', [
    'Pé da frente apoiado no step, tronco ereto.', 'Desça até o joelho de trás se aproximar do chão.', 'Empurre o step com o pé da frente para subir.',
  ], { eq: 'Halteres', defaults: { loadStep: 1 } }),
  M('ex-ext-quadril-polia', 'Extensão de quadril na polia', 'Glúteos', ['Posteriores'], 'cable_kickback', [
    'Tornozeleira presa, mãos apoiadas na torre.', 'Leve a perna para trás e para cima contraindo o glúteo, sem arquear a lombar.', 'Volte devagar sem deixar o peso encostar.',
  ], { eq: 'Polia / cabo', defaults: { loadStep: 2.5 } }),
  M('ex-pelvica', 'Elevação pélvica', 'Glúteos', ['Posteriores', 'Quadríceps'], 'hip_thrust', [
    'Parte alta das costas no banco, barra sobre o quadril.', 'Empurre o chão elevando o quadril até alinhar ombro e joelho.', 'Segure 1 segundo e desça devagar.',
  ], { eq: 'Barra', defaults: { loadStep: 5 } }),
  M('ex-flexora-deitada', 'Flexora deitada', 'Posteriores', ['Panturrilhas'], 'lying_leg_curl', [
    'Deitada de bruços, rolo sobre os calcanhares.', 'Flexione os joelhos levando os calcanhares ao glúteo.', 'Volte devagar sem tirar o quadril do banco.',
  ], { defaults: { loadStep: 5 } }),
  ex('ex-abdominal-infra', 'Abdominal infra no solo', 'Abdômen', [], 'Peso corporal', 'reverse_crunch', [
    'Deitada, joelhos dobrados sobre o quadril.', 'Contraia o abdômen e eleve o quadril do chão.', 'Desça devagar sem relaxar a barriga.',
  ], { bodyweight: true, defaults: { sets: 1, reps: 20, rest: 45 } }),

  // ---------------- Quarta: peito, tríceps e ombro ----------------
  M('ex-voador', 'Voador', 'Peito', ['Ombros'], 'pec_fly', [
    'Costas apoiadas, antebraços nos apoios.', 'Feche os braços à frente como num abraço.', 'Contraia o peito e volte devagar.',
  ], { defaults: { loadStep: 5 } }),
  M('ex-supino-reto', 'Supino reto com barra', 'Peito', ['Ombros', 'Tríceps'], 'bench_press', [
    'Deitada no banco, pés firmes no chão.', 'Empurre a barra até estender os braços.', 'Desça devagar até tocar de leve o peito.',
  ], { eq: 'Barra', defaults: { sets: 4, reps: 10, loadStep: 2.5 } }),
  M('ex-supino-inclinado', 'Supino inclinado articulado', 'Peito', ['Ombros', 'Tríceps'], 'incline_press', [
    'Banco inclinado, costas apoiadas.', 'Empurre até quase estender os cotovelos.', 'Volte devagar sentindo o peito alongar.',
  ], { defaults: { loadStep: 5 } }),
  M('ex-triceps-corda', 'Tríceps com corda na polia', 'Tríceps', [], 'triceps_rope', [
    'Cotovelos junto ao corpo.', 'Estenda os cotovelos abrindo a corda no final.', 'Só os antebraços se movem; volte devagar.',
  ], { eq: 'Polia / cabo', defaults: { loadStep: 2.5 } }),
  M('ex-triceps-frances', 'Tríceps francês unilateral', 'Tríceps', ['Ombros'], 'overhead_triceps', [
    'Halter acima da cabeça, braço estendido.', 'Dobre o cotovelo levando o halter atrás da cabeça.', 'Cotovelo parado apontando para cima; estenda de volta.',
  ], { eq: 'Halteres', defaults: { sets: 3, loadStep: 1 } }),
  M('ex-elev-lateral', 'Elevação lateral com halteres', 'Ombros', [], 'lateral_raise', [
    'Halteres ao lado do corpo, cotovelos levemente flexionados.', 'Eleve os braços até a altura dos ombros.', 'Sem balançar o tronco; desça devagar.',
  ], { eq: 'Halteres', defaults: { loadStep: 1 } }),
  M('ex-elev-frontal', 'Elevação frontal com barra', 'Ombros', ['Peito'], 'front_raise', [
    'Barra à frente das coxas, braços estendidos.', 'Eleve a barra à frente até a altura dos ombros.', 'Tronco firme; desça devagar.',
  ], { eq: 'Barra', defaults: { sets: 3, loadStep: 2 } }),
  ex('ex-escada', 'Escada', 'Corpo inteiro', ['Quadríceps', 'Glúteos'], 'Cardio', 'stairs', [
    'Suba nos degraus com postura ereta, mãos leves no apoio.', 'Alterne os passos em ritmo constante.', 'Termine reduzindo o ritmo aos poucos.',
  ], { kind: 'cardio', repUnit: 'min', bodyweight: true, defaults: { sets: 1, reps: 20, rest: 0 } }),

  // ---------------- Quinta: quadríceps e posterior ----------------
  M('ex-smith', 'Agachamento no Smith', 'Quadríceps', ['Glúteos', 'Posteriores'], 'smith_squat', [
    'Barra apoiada nos ombros, pés um pouco à frente.', 'Desça flexionando joelhos e quadril até as coxas ficarem paralelas ao chão.', 'Suba empurrando o chão, sem travar os joelhos.',
  ], { eq: 'Smith', defaults: { loadStep: 5 } }),
  M('ex-hack', 'Agachamento hack', 'Quadríceps', ['Glúteos'], 'hack_squat', [
    'Costas apoiadas, pés na plataforma.', 'Desça o carrinho até os joelhos formarem ~90°.', 'Empurre a plataforma para subir, sem travar os joelhos.',
  ], { defaults: { loadStep: 5 } }),
  M('ex-leg-press-45', 'Leg press 45°', 'Quadríceps', ['Glúteos', 'Posteriores'], 'leg_press_45', [
    'Costas e quadril apoiados, pés na plataforma.', 'Empurre até quase estender os joelhos, sem travar.', 'Volte devagar sem tirar o quadril do banco.',
  ], { defaults: { loadStep: 5 } }),
  M('ex-adutora', 'Cadeira adutora', 'Adutores', [], 'hip_adduction', [
    'Costas apoiadas, apoios na parte interna dos joelhos.', 'Feche as pernas sem balançar o tronco.', 'Abra devagar, controlando o peso.',
  ], { defaults: { loadStep: 5 } }),
  M('ex-flexora-em-pe', 'Flexora em pé unilateral', 'Posteriores', ['Panturrilhas'], 'standing_leg_curl', [
    'Em pé, apoiada na máquina, rolo atrás do calcanhar.', 'Flexione o joelho levando o calcanhar ao glúteo.', 'Quadril parado; volte devagar; troque de perna.',
  ], { defaults: { loadStep: 2.5 } }),
  ex('ex-abdominal-curto', 'Abdominal curto no solo', 'Abdômen', [], 'Peso corporal', 'crunch', [
    'Deitada, joelhos dobrados, mãos leves atrás da cabeça.', 'Contraia o abdômen e eleve as escápulas do chão.', 'Desça devagar sem relaxar totalmente.',
  ], { bodyweight: true, defaults: { sets: 1, reps: 20, rest: 45 } }),

  // ---------------- Sexta: glúteos e quadríceps ----------------
  ex('ex-quatro-apoios', 'Glúteo em quatro apoios', 'Glúteos', ['Posteriores', 'Lombar'], 'Peso corporal', 'quadruped_kickback', [
    'Quatro apoios: mãos sob os ombros, abdômen firme.', 'Eleve uma perna dobrada empurrando o calcanhar para o teto.', 'Coxa na altura do quadril, sem arquear a lombar; volte devagar.',
  ], { eq: 'Peso corporal', bodyweight: false, defaults: { loadStep: 1 } }),
  M('ex-afundo-smith', 'Afundo no Smith', 'Quadríceps', ['Glúteos', 'Posteriores'], 'smith_lunge', [
    'Barra apoiada nos ombros, uma perna à frente.', 'Desça até o joelho da frente formar ~90°.', 'Empurre o chão com o pé da frente para subir.',
  ], { eq: 'Smith', defaults: { loadStep: 5 } }),
  M('ex-extensora', 'Cadeira extensora', 'Quadríceps', [], 'leg_extension', [
    'Joelho alinhado com o eixo; apoio logo acima do tornozelo.', 'Estenda os joelhos até quase retos e segure 1 segundo.', 'Desça devagar.',
  ], { defaults: { loadStep: 5 } }),
  M('ex-leg-press', 'Leg press horizontal', 'Quadríceps', ['Glúteos', 'Posteriores'], 'leg_press', [
    'Lombar e quadril apoiados, pés na largura dos ombros.', 'Empurre a plataforma até quase estender os joelhos.', 'Volte devagar até ~90° sem tirar o quadril do banco.',
  ], { defaults: { loadStep: 5 } }),
  M('ex-sumo-step', 'Agachamento sumô no step', 'Adutores', ['Glúteos', 'Quadríceps'], 'sumo_squat', [
    'Pés afastados sobre o step, pontas para fora, halter ao centro.', 'Desça o quadril com os joelhos abertos na direção dos pés.', 'Suba empurrando o chão e contraindo os glúteos.',
  ], { eq: 'Halteres', defaults: { loadStep: 2 } }),
  M('ex-abdutora', 'Cadeira abdutora', 'Abdutores', ['Glúteos'], 'hip_abduction', [
    'Costas apoiadas, apoios na parte externa dos joelhos.', 'Abra as pernas sem balançar o tronco.', 'Segure 1 segundo e feche devagar.',
  ], { defaults: { loadStep: 5 } }),
  ex('ex-prancha', 'Prancha abdominal', 'Abdômen', ['Ombros', 'Glúteos'], 'Peso corporal', 'plank', [
    'Antebraços no chão, cotovelos sob os ombros.', 'Corpo em linha reta da cabeça aos calcanhares.', 'Contraia abdômen e glúteos e respire normalmente.',
  ], { bodyweight: true, repUnit: 'seg', defaults: { sets: 1, reps: 30, rest: 45 } }),
];


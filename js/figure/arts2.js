// Cenas adicionais (1/2): ALONGAMENTOS e MOBILIDADE. Mesma modelo feminina, mesma convenção de poses.
import { dir, add, sub, mul, angleOf } from './rig.js';
import { C, rrect, bar } from './kit.js';
import { ARTS, fpose, fArmsFK, fLegsFK } from './arts.js';

const mat = (cx = 200, w = 220) => rrect([cx, 267], w, 6, 0, 3, C.mat);
const stand = { ankle: [203, 260], bend: -1 };
const base = { hip: [200, 172], torso: -90, head: -90, ft: 0 };
const T = (a, b) => ({ ini: a[0], mov: a[1], fim: a[2], ret: a[3] });

// ---------------------------------------------------------------- ALONGAMENTO DE DORSAIS
ARTS.stretch_lats = {
  label: 'Alongamento de dorsais', view: 'side', face: 1, vb: '70 84 260 195', isometric: true, dur: 2.6,
  keys: [
    { ...base, arm: { ua: -8, fa: -8 }, leg: stand },
    { hip: [176, 178], torso: -52, head: -40, arm: { ua: -2, fa: -2 }, leg: stand, ft: 0 },
  ],
  track: ['wrist'], muscles: { primary: ['costas'], secondary: ['ombros'] },
  cues: T(['Em pé, mãos entrelaçadas à frente.', 'Empurre as mãos para frente e arredonde as costas.', 'Sinta alongar entre as escápulas; respire fundo.', 'Volte devagar à posição inicial.']),
  machine: () => ({ back: mat(), front: '' }),
};

// ---------------------------------------------------------------- ALONGAMENTO DE BÍCEPS E OMBROS (braços atrás)
ARTS.stretch_biceps = {
  label: 'Alongamento de bíceps e ombros', view: 'side', face: 1, vb: '70 84 260 195', isometric: true, dur: 2.6,
  keys: [
    { ...base, torso: -88, arm: { ua: 92, fa: 92 }, leg: stand },
    { ...base, torso: -84, arm: { ua: 152, fa: 156 }, leg: stand },
  ],
  track: ['wrist'], muscles: { primary: ['biceps'], secondary: ['ombros', 'peito'] },
  cues: T(['Em pé, braços estendidos ao lado do corpo.', 'Leve os braços para trás, palmas viradas para baixo.', 'Peito aberto; sinta a frente do braço e do ombro.', 'Volte devagar.']),
  machine: () => ({ back: mat(), front: '' }),
};

// ---------------------------------------------------------------- ALONGAMENTO DE PEITORAL NO BATENTE
{
  const arm = { ua: 0, fa: -90 };
  ARTS.stretch_chest = {
    label: 'Alongamento de peitoral no batente', view: 'side', face: 1, vb: '70 70 260 195', isometric: true, dur: 2.6,
    keys: [
      { hip: [180, 172], torso: -90, head: -90, arm, leg: { ankle: [190, 260], bend: -1 }, farLeg: { ankle: [170, 260], bend: -1 }, ft: 0 },
      { hip: [196, 172], torso: -78, head: -82, arm, leg: { ankle: [232, 260], bend: -1 }, farLeg: { ankle: [168, 260], bend: -1 }, ft: 0 },
    ],
    track: [], muscles: { primary: ['peito'], secondary: ['ombros', 'biceps'] },
    cues: T(['Antebraços apoiados no batente, cotovelos na altura dos ombros.', 'Dê um passo à frente, deixando o peito passar pelo batente.', 'Sinta abrir o peito; mantenha o abdômen firme.', 'Volte devagar.']),
    machine: () => ({ back: `<rect x="241" y="40" width="200" height="230" fill="#E4E0D8"/>` + bar([237, 50], [237, 268], 9, C.frameDark), front: '' }),
  };
}

// ---------------------------------------------------------------- ALONGAMENTO DE TRÍCEPS (cotovelo atrás da cabeça) — vista frontal
{
  const legs = { l: { ankle: [186, 260], bend: 1 }, r: { ankle: [214, 260], bend: -1 } };
  const A = fpose({ hip: [200, 172], legs, arms: { l: { wrist: [172, 178], bend: 1 }, r: { wrist: [228, 178], bend: -1 } } });
  const B = fpose({ hip: [200, 172], legs, arms: { l: { wrist: [196, 100], bend: -1 }, r: { wrist: [172, 100], bend: 1 } } });
  ARTS.stretch_triceps = {
    label: 'Alongamento de tríceps', view: 'front', vb: '70 84 260 195', isometric: true, dur: 2.6, keys: [A, B],
    track: [], muscles: { primary: ['triceps'], secondary: ['ombros'] },
    cues: T(['Em pé, coluna ereta.', 'Dobre um braço atrás da cabeça e segure o cotovelo com a outra mão.', 'Empurre o cotovelo suavemente para trás; sinta o tríceps.', 'Solte e troque de lado.']),
    machine: () => ({ back: mat(), front: '' }),
  };
}

// ---------------------------------------------------------------- GLÚTEO: FIGURA 4 (deitada)
{
  const common = { hip: [215, 255], torso: 180, head: 180, tail: 180, ft: 0 };
  ARTS.stretch_glute_fig4 = {
    label: 'Alongamento de glúteo (figura 4)', view: 'side', face: 1, vb: '90 130 240 180', isometric: true, dur: 2.6,
    keys: [
      { ...common, arm: { wrist: [200, 258], bend: 1 }, leg: { ankle: [243, 253], bend: -1 }, farLeg: { ankle: [245, 254], bend: -1 } },
      { ...common, arm: { wrist: [212, 216], bend: 1 }, leg: { ankle: [209, 206], bend: -1 }, farLeg: { ankle: [248, 195], bend: -1 } },
    ],
    track: [], muscles: { primary: ['gluteos'], secondary: ['posteriores'] },
    cues: T(['Deitada, joelhos dobrados e pés no chão.', 'Cruze um tornozelo sobre o joelho oposto e puxe a coxa em direção ao peito.', 'Sinta o alongamento no glúteo; respire.', 'Solte devagar e troque de lado.']),
    machine: () => ({ back: rrect([190, 266], 230, 8, 0, 4, C.mat), front: '' }),
  };
}

// ---------------------------------------------------------------- GLÚTEO: JOELHO AO PEITO (deitada)
{
  const common = { hip: [215, 255], torso: 180, head: 180, tail: 180, ft: 0, farLeg: { ankle: [243, 253], bend: -1 } };
  ARTS.stretch_glute_knee = {
    label: 'Alongamento de glúteo (joelho ao peito)', view: 'side', face: 1, vb: '90 130 240 180', isometric: true, dur: 2.6,
    keys: [
      { ...common, arm: { wrist: [200, 258], bend: 1 }, leg: { th: -72, sh: 72 } },
      { ...common, arm: { wrist: [178, 226], bend: 1 }, leg: { th: -160, sh: -20 } },
    ],
    track: [], muscles: { primary: ['gluteos'], secondary: ['lombar', 'posteriores'] },
    cues: T(['Deitada de barriga para cima, pernas dobradas.', 'Abrace um joelho e traga-o em direção ao peito.', 'Mantenha a lombar no chão; sinta o glúteo alongar.', 'Solte devagar e troque de perna.']),
    machine: () => ({ back: rrect([190, 266], 230, 8, 0, 4, C.mat), front: '' }),
  };
}

// ---------------------------------------------------------------- POSTERIOR: INCLINAÇÃO DE TRONCO
ARTS.stretch_fold = {
  label: 'Alongamento de posterior (inclinação de tronco)', view: 'side', face: 1, vb: '70 84 260 195', isometric: true, dur: 2.8,
  keys: [
    { ...base, arm: { ua: 92, fa: 92 }, leg: { ankle: [200, 260], bend: -1 } },
    { hip: [182, 172], torso: 52, head: 55, arm: { ua: 100, fa: 100 }, leg: { ankle: [200, 260], bend: -1 }, ft: 0 },
  ],
  track: ['wrist'], muscles: { primary: ['posteriores'], secondary: ['lombar', 'panturrilhas'] },
  cues: T(['Em pé, pernas estendidas.', 'Incline o tronco para frente, quadril para trás, mãos em direção aos pés.', 'Sinta o alongamento atrás das coxas; sem forçar a lombar.', 'Volte devagar, vértebra por vértebra.']),
  machine: () => ({ back: mat(), front: '' }),
};

// ---------------------------------------------------------------- POSTERIOR: PERNA NO STEP
ARTS.stretch_hamstring_step = {
  label: 'Alongamento de posterior (perna no step)', view: 'side', face: 1, vb: '70 84 260 195', isometric: true, dur: 2.8,
  keys: [
    { hip: [200, 172], torso: -90, head: -90, arm: { wrist: [205, 215], bend: -1 }, leg: { ankle: [203, 260], bend: -1 }, farLeg: { ankle: [188, 260], bend: -1 }, ft: 0 },
    { hip: [186, 172], torso: -35, head: -25, arm: { wrist: [250, 200], bend: -1 }, leg: { ankle: [248, 247], bend: -1 }, farLeg: { ankle: [186, 260], bend: -1 }, ft: -40 },
  ],
  track: [], muscles: { primary: ['posteriores'], secondary: ['panturrilhas'] },
  cues: T(['Em pé, um calcanhar apoiado no step.', 'Incline o tronco com a coluna reta, em direção ao pé apoiado.', 'Sinta atrás da coxa; joelho quase estendido.', 'Volte devagar e troque de perna.']),
  machine: () => ({ back: mat(), front: rrect([254, 259], 56, 18, 0, 4, C.padDark) }),
};

// ---------------------------------------------------------------- QUADRÍCEPS EM PÉ
ARTS.stretch_quad = {
  label: 'Alongamento de quadríceps em pé', view: 'side', face: 1, vb: '70 84 260 195', isometric: true, dur: 2.6,
  keys: [
    { ...base, torso: -90, arm: { ua: 92, fa: 92 }, leg: { th: 92, sh: 92 }, farLeg: { ankle: [203, 260], bend: -1 } },
    { ...base, torso: -88, arm: { ua: 114, fa: 114 }, leg: { th: 95, sh: -120 }, farLeg: { ankle: [203, 260], bend: -1 }, ft: -150 },
  ],
  track: ['ankle'], muscles: { primary: ['quadriceps'], secondary: ['abdomen'] },
  cues: T(['Em pé, apoiada em uma perna.', 'Dobre o joelho e segure o pé, levando o calcanhar ao glúteo.', 'Joelhos juntos, quadril para frente; sinta a frente da coxa.', 'Solte devagar e troque de perna.']),
  machine: () => ({ back: mat(), front: '' }),
};

// ================================================================= MOBILIDADE

// ---------------------------------------------------------------- CÍRCULOS DE OMBRO (frontal)
{
  const legs = { l: { ankle: [186, 260], bend: 1 }, r: { ankle: [214, 260], bend: -1 } };
  const k = (a1, a2) => fpose({ hip: [200, 172], legs, arms: fArmsFK(a1, a2) });
  ARTS.mob_shoulder_circles = {
    label: 'Círculos de ombro', view: 'front', vb: '70 60 260 195', dur: 1.7,
    keys: [k([98, 94]), k([184, 170]), k([250, 255])],
    track: ['wristL', 'wristR'], muscles: { primary: ['ombros'], secondary: [] },
    cues: T(['Em pé, braços ao lado do corpo.', 'Eleve os braços pelos lados em círculos amplos.', 'Passe pela altura dos ombros até acima da cabeça.', 'Desça pelos lados, controlando o movimento.']),
    machine: () => ({ back: mat(), front: '' }),
  };
}

// ---------------------------------------------------------------- ABERTURA DE BRAÇOS (tórax)
{
  const legs = { l: { ankle: [186, 260], bend: 1 }, r: { ankle: [214, 260], bend: -1 } };
  ARTS.mob_open_arms = {
    label: 'Abertura de braços (mobilidade de tórax)', view: 'front', vb: '70 84 260 195', dur: 1.8,
    keys: [
      fpose({ hip: [200, 172], legs, arms: { l: { wrist: [206, 134], bend: 1 }, r: { wrist: [194, 134], bend: -1 } } }),
      fpose({ hip: [200, 172], legs, arms: { l: { wrist: [134, 126], bend: 1 }, r: { wrist: [266, 126], bend: -1 } } }),
    ],
    track: ['wristL', 'wristR'], muscles: { primary: ['peito'], secondary: ['ombros', 'costas'] },
    cues: T(['Em pé, braços cruzados à frente do peito.', 'Abra os braços para os lados, levando as escápulas para trás.', 'Peito aberto, olhar à frente.', 'Volte abraçando o corpo.']),
    machine: () => ({ back: mat(), front: '' }),
  };
}

// ---------------------------------------------------------------- ROTAÇÃO EXTERNA DE OMBRO (frontal)
{
  const legs = { l: { ankle: [186, 260], bend: 1 }, r: { ankle: [214, 260], bend: -1 } };
  ARTS.mob_ext_rotation = {
    label: 'Rotação externa de ombro', view: 'front', vb: '70 84 260 195', dur: 1.8,
    keys: [
      fpose({ hip: [200, 172], legs, arms: { l: { wrist: [212, 152], bend: 1 }, r: { wrist: [188, 152], bend: -1 } } }),
      fpose({ hip: [200, 172], legs, arms: { l: { wrist: [150, 150], bend: 1 }, r: { wrist: [250, 150], bend: -1 } } }),
    ],
    track: ['wristL', 'wristR'], muscles: { primary: ['ombros'], secondary: ['costas'] },
    cues: T(['Cotovelos junto ao corpo, dobrados a 90°.', 'Gire os antebraços para fora, mantendo os cotovelos colados.', 'Escápulas juntas; sem mover o tronco.', 'Volte devagar.']),
    machine: () => ({ back: mat(), front: '' }),
  };
}

// ---------------------------------------------------------------- GATO-CAMELO (quatro apoios)
ARTS.mob_cat_camel = {
  label: 'Gato-camelo', view: 'side', face: -1, vb: '90 120 260 195', dur: 2.2,
  keys: [176, 186].map((t, i) => ({
    hip: [250, 210], torso: t, head: i ? 150 : 205, arm: { wrist: [200, 262], bend: 1 }, leg: { th: 90, sh: 0 }, ft: 0,
  })),
  track: ['head'], muscles: { primary: ['costas', 'abdomen'], secondary: ['lombar'] },
  cues: T(['Quatro apoios: mãos sob os ombros, joelhos sob o quadril.', 'Arredonde a coluna, empurrando o chão e olhando para o umbigo.', 'Coluna bem arredondada; contraia o abdômen.', 'Volte devagar, estendendo a coluna e olhando à frente.']),
  machine: () => ({ back: rrect([240, 267], 260, 6, 0, 3, C.mat), front: '' }),
};

// ---------------------------------------------------------------- BALANÇO DE PERNA (apoiada na parede)
ARTS.mob_leg_swing = {
  label: 'Balanço de perna', view: 'side', face: 1, vb: '70 84 260 195', dur: 1.5,
  keys: [
    { hip: [210, 172], torso: -90, head: -90, arm: { wrist: [258, 128], bend: -1 }, leg: { th: 55, sh: 55 }, farLeg: { ankle: [212, 260], bend: -1 }, ft: -30 },
    { hip: [210, 172], torso: -90, head: -90, arm: { wrist: [258, 128], bend: -1 }, leg: { th: 125, sh: 125 }, farLeg: { ankle: [212, 260], bend: -1 }, ft: 40 },
  ],
  track: ['ankle'], muscles: { primary: ['gluteos', 'posteriores'], secondary: ['quadriceps'] },
  cues: T(['Em pé, uma mão na parede.', 'Balance a perna estendida para frente.', 'Alcance a amplitude sem forçar; tronco firme.', 'Balance para trás, controlando o movimento.']),
  machine: () => ({ back: `<rect x="270" y="40" width="200" height="230" fill="#E4E0D8"/>` + bar([270, 50], [270, 268], 4, C.steelDark) + mat(), front: '' }),
};

// ---------------------------------------------------------------- PONTE DE QUADRIL (mobilidade)
{
  const sh = [150, 252];
  const common = { head: 180, tail: 180, ft: 0, arm: { wrist: [195, 258], bend: 1 }, leg: { ankle: [240, 260], bend: -1 } };
  ARTS.mob_glute_bridge = {
    label: 'Ponte de quadril', view: 'side', face: 1, vb: '90 130 240 180', dur: 1.9,
    keys: [{ ...common, hip: [200, 252], torso: 180 }, { ...common, hip: [191, 223], torso: 215 }],
    track: ['hip'], muscles: { primary: ['gluteos'], secondary: ['posteriores', 'lombar'] },
    cues: T(['Deitada, joelhos dobrados e pés no chão.', 'Empurre os pés e eleve o quadril.', 'Corpo em linha do ombro ao joelho; contraia os glúteos.', 'Desça devagar, vértebra por vértebra.']),
    machine: () => ({ back: rrect([190, 266], 240, 8, 0, 4, C.mat), front: '' }),
  };
}

// Cenas adicionais (2/2): exercícios principais que não existiam na primeira biblioteca.
import { dir, add, sub, mul, angleOf, sideNormal, circle } from './rig.js';
import { C, rrect, bar, rod, pulley, plate, dbHead, stack, pad, seat } from './kit.js';
import { ARTS, fpose, fLegsFK, seatedFrameFront, seatedBaseFront } from './arts.js';

const T = (a) => ({ ini: a[0], mov: a[1], fim: a[2], ret: a[3] });
const mat = (cx = 200, w = 220) => rrect([cx, 267], w, 6, 0, 3, C.mat);
const stand = { ankle: [203, 260], bend: -1 };
const base = { hip: [200, 172], torso: -90, head: -90, ft: 0 };

// ---------------------------------------------------------------- VOADOR / VOADOR INVERTIDO (frontal, sentada, máquina)
{
  const hip = [200, 176], legs = fLegsFK([97, 85]);
  const closed = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [193, 128], bend: 1 }, r: { wrist: [207, 128], bend: -1 } } });
  const open = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [130, 126], bend: 1 }, r: { wrist: [270, 126], bend: -1 } } });
  const machine = (j) => ({
    back: seatedFrameFront(j.hip) + seatedBaseFront(j.hip) + bar([200, 112], [200, 90], 10, C.frameDark),
    front: bar(j.wristL, [200, 112], 5, C.frameDark) + bar(j.wristR, [200, 112], 5, C.frameDark) +
      rrect(add(j.wristL, [-2, 0]), 10, 36, 0, 5, C.frame) + rrect(add(j.wristR, [2, 0]), 10, 36, 0, 5, C.frame),
  });
  ARTS.pec_fly = {
    label: 'Voador', view: 'front', vb: '50 46 300 225', keys: [open, closed], track: ['wristL', 'wristR'],
    muscles: { primary: ['peito'], secondary: ['ombros'] },
    cues: T(['Costas apoiadas, antebraços nos apoios, braços abertos.', 'Feche os braços à frente, como num abraço.', 'Contraia o peito e segure 1 segundo.', 'Abra devagar até sentir o peito alongar.']), machine,
  };
  ARTS.reverse_fly = {
    label: 'Voador invertido', view: 'front', vb: '50 46 300 225', keys: [closed, open], track: ['wristL', 'wristR'],
    muscles: { primary: ['costas', 'ombros'], secondary: ['triceps'] },
    cues: T(['Peito apoiado no encosto, braços à frente.', 'Abra os braços para trás, levando os cotovelos para fora.', 'Aperte as escápulas e segure 1 segundo.', 'Volte devagar, sem deixar o peso bater.']), machine,
  };
}

// ---------------------------------------------------------------- FACE PULL COM CORDA
ARTS.face_pull = {
  label: 'Face pull com corda', view: 'side', face: 1, vb: '110 58 288 216',
  keys: [
    { ...base, torso: -95, head: -92, arm: { wrist: [262, 120], bend: -1 }, leg: stand },
    { ...base, torso: -95, head: -92, arm: { wrist: [216, 112], bend: -1 }, leg: stand },
  ],
  track: ['wrist'], muscles: { primary: ['ombros', 'costas'], secondary: ['biceps'] },
  cues: T(['Em pé, braços estendidos segurando a corda na altura do rosto.', 'Puxe a corda em direção ao rosto, abrindo os cotovelos.', 'Cotovelos altos e escápulas juntas.', 'Volte devagar até os braços quase estendidos.']),
  machine(j, t) { return { back: stack(346, 60, 58, 208, t * 22) + pulley([312, 112], 6), front: rod(add(j.wrist, [4, 0]), [312, 112], 2) + rrect(j.wrist, 8, 20, 0, 4, C.black) }; },
};

// ---------------------------------------------------------------- REMADA ALTA NA POLIA
ARTS.upright_row = {
  label: 'Remada alta na polia', view: 'side', face: 1, vb: '110 58 288 216',
  keys: [
    { ...base, arm: { wrist: [228, 192], bend: -1 }, leg: stand },
    { ...base, arm: { wrist: [222, 140], bend: -1 }, leg: stand },
  ],
  track: ['wrist'], muscles: { primary: ['ombros'], secondary: ['biceps', 'costas'] },
  cues: T(['Em pé, barra à frente das coxas, pegada na largura dos ombros.', 'Suba a barra rente ao corpo, cotovelos para cima.', 'Cotovelos na altura dos ombros; sem encolher o pescoço.', 'Desça devagar.']),
  machine(j, t) { return { back: stack(346, 60, 58, 208, t * 22) + pulley([310, 252], 6), front: rod(add(j.wrist, [4, 4]), [310, 252], 2) + dbHead(add(j.wrist, [3, 0]), 8) }; },
};

// ---------------------------------------------------------------- FLEXORA DEITADA
{
  const hip = [230, 227];
  const common = { hip, torso: 180, head: 178, tail: 0, arm: { wrist: [172, 246], bend: 1 }, ft: 0 };
  ARTS.lying_leg_curl = {
    label: 'Flexora deitada', view: 'side', face: -1, vb: '90 100 290 217',
    keys: [{ ...common, leg: { th: 0, sh: 0 } }, { ...common, leg: { th: 0, sh: -100 } }],
    track: ['ankle'], muscles: { primary: ['posteriores'], secondary: ['panturrilhas'] },
    cues: T(['Deitada de bruços, joelhos alinhados com o eixo, rolo sobre os calcanhares.', 'Flexione os joelhos levando os calcanhares em direção ao glúteo.', 'Contraia atrás da coxa sem tirar o quadril do banco.', 'Volte devagar até quase estender as pernas.']),
    machine(j, t) {
      return { back: stack(360, 96, 56, 172, t * 22) + rrect([205, 248], 190, 16, 0, 7, C.pad) + bar([120, 255], [120, 267], 8, C.frameDark) + bar([290, 255], [290, 267], 8, C.frameDark),
        front: bar(j.ankle, [292, 236], 6, C.frameDark) + circle([292, 236], 5, C.steelDark) + rrect(add(j.ankle, [0, -6]), 12, 20, angleOf(j.knee, j.ankle), 6, C.frame) };
    },
  };
}

// ---------------------------------------------------------------- ABDOMINAL INFRA NO SOLO
{
  const common = { head: 180, tail: 180, ft: 0, arm: { wrist: [198, 258], bend: 1 } };
  ARTS.reverse_crunch = {
    label: 'Abdominal infra no solo', view: 'side', face: 1, vb: '90 130 240 180',
    keys: [
      { ...common, hip: [215, 255], torso: 180, leg: { th: -95, sh: -5 } },
      { ...common, hip: [212, 238], torso: 200, leg: { th: -100, sh: -88 } },
    ],
    track: ['ankle'], muscles: { primary: ['abdomen'], secondary: [] },
    cues: T(['Deitada, joelhos dobrados sobre o quadril, mãos ao lado do corpo.', 'Contraia o abdômen e eleve o quadril do chão.', 'Leve os joelhos em direção ao peito, sem balançar.', 'Desça devagar sem relaxar a barriga.']),
    machine: () => ({ back: rrect([190, 266], 230, 8, 0, 4, C.mat), front: '' }),
  };
}

// ---------------------------------------------------------------- SUPINO RETO COM BARRA
{
  const hip = [230, 226];
  const common = { hip, torso: 180, head: 178, tail: 180, leg: { ankle: [262, 260], bend: -1 }, ft: 0 };
  ARTS.bench_press = {
    label: 'Supino reto com barra', view: 'side', face: 1, vb: '90 100 290 217',
    keys: [{ ...common, arm: { wrist: [182, 204], bend: 1 } }, { ...common, arm: { wrist: [182, 176], bend: 1 } }],
    track: ['wrist'], muscles: { primary: ['peito'], secondary: ['ombros', 'triceps'] },
    cues: T(['Deitada no banco, pés firmes no chão, barra sobre o peito.', 'Empurre a barra para cima até estender os braços.', 'Braços quase estendidos; escápulas fixas no banco.', 'Desça devagar até tocar de leve o peito.']),
    machine(j) {
      return { back: rrect([205, 246], 200, 16, 0, 7, C.bench) + rrect([205, 238], 190, 8, 0, 4, C.pad) + bar([135, 252], [135, 267], 8, C.frameDark) + bar([275, 252], [275, 267], 8, C.frameDark) + bar([140, 160], [140, 238], 7, C.frameDark),
        front: plate(add(j.wrist, [0, -2]), 14) };
    },
  };
}

// ---------------------------------------------------------------- TRÍCEPS FRANCÊS UNILATERAL
ARTS.overhead_triceps = {
  label: 'Tríceps francês unilateral', view: 'side', face: 1, vb: '70 62 260 195',
  keys: [
    { ...base, head: -94, arm: { ua: -90, fa: -90 }, leg: stand },
    { ...base, head: -94, arm: { ua: -90, fa: -240 }, leg: stand },
  ],
  track: ['wrist'], muscles: { primary: ['triceps'], secondary: ['ombros'] },
  cues: T(['Em pé, halter acima da cabeça, braço estendido.', 'Dobre o cotovelo levando o halter para trás da cabeça.', 'Cotovelo fixo apontando para cima; sinta o tríceps alongar.', 'Estenda o braço de volta, sem mover o ombro.']),
  machine: () => ({ back: mat(), front: '' }),
  overlay: (j) => dbHead(add(j.wrist, mul(dir(angleOf(j.elbow, j.wrist)), 6)), 8),
};

// ---------------------------------------------------------------- ELEVAÇÃO FRONTAL COM BARRA
ARTS.front_raise = {
  label: 'Elevação frontal com barra', view: 'side', face: 1, vb: '70 84 260 195',
  keys: [{ ...base, arm: { ua: 92, fa: 90 }, leg: stand }, { ...base, arm: { ua: -8, fa: -6 }, leg: stand }],
  track: ['wrist'], muscles: { primary: ['ombros'], secondary: ['peito'] },
  cues: T(['Em pé, barra à frente das coxas, braços estendidos.', 'Eleve a barra à frente até a altura dos ombros.', 'Braços quase estendidos; tronco firme, sem balançar.', 'Desça devagar.']),
  machine: () => ({ back: mat(), front: '' }),
  overlay: (j) => dbHead(add(j.wrist, [2, 3]), 8.5),
};

// ---------------------------------------------------------------- AGACHAMENTO NO SMITH
ARTS.smith_squat = {
  label: 'Agachamento no Smith', view: 'side', face: 1, vb: '60 40 290 217',
  keys: [
    { hip: [202, 172], torso: -90, head: -90, arm: { wrist: [193, 118], bend: 1 }, leg: { ankle: [214, 260], bend: -1 }, ft: 0 },
    { hip: [170, 217], torso: -64, head: -70, arm: { wrist: [183, 170], bend: 1 }, leg: { ankle: [214, 260], bend: -1 }, ft: 0 },
  ],
  track: ['hip'], muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['posteriores'] },
  cues: T(['Barra no Smith apoiada nos ombros, pés um pouco à frente.', 'Flexione joelhos e quadril, descendo de forma controlada.', 'Coxas paralelas ao chão, tronco firme.', 'Empurre o chão e suba sem travar os joelhos.']),
  machine(j) {
    const barC = add(j.wrist, [-2, -2]);
    return { back: bar([180, 40], [180, 268], 7, C.frameDark) + bar([240, 40], [240, 268], 7, C.frameDark) + mat(), front: rrect(barC, 54, 5, 0, 2.5, C.steelDark) + plate(add(barC, [26, 0]), 8) };
  },
};

// ---------------------------------------------------------------- AGACHAMENTO HACK
{
  const u = dir(-108), foot = [226, 260];
  const hipA = [186, 186];
  const mk = (d) => { const hip = add(hipA, mul(u, -d)); return { hip, torso: -108, head: -112, arm: { wrist: add(hip, [14, 4]), bend: 1 }, leg: { ankle: foot, bend: -1 }, ft: 0 }; };
  ARTS.hack_squat = {
    label: 'Agachamento hack', view: 'side', face: 1, vb: '60 40 290 235',
    keys: [mk(0), mk(44)],
    track: ['hip'], muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['posteriores'] },
    cues: T(['Costas apoiadas no encosto inclinado, pés na plataforma.', 'Flexione os joelhos descendo o carrinho de forma controlada.', 'Joelhos a ~90°, quadril encostado no apoio.', 'Empurre a plataforma e suba sem travar os joelhos.']),
    machine(j) {
      const n = sideNormal(sub(j.shoulder, j.hip), 1, false);
      const c = add(add(j.hip, mul(u, 30)), mul(n, 16));
      return { back: bar([208, 258], [138, 56], 6, C.frameDark) + bar([150, 266], [250, 266], 8, C.frame) + rrect([248, 264], 90, 8, 0, 4, C.padDark),
        front: rrect(c, 16, 100, -108 + 90, 8, C.pad) + rrect(add(j.hip, [2, 10]), 22, 10, 0, 4, C.frame) };
    },
  };
}

// ---------------------------------------------------------------- LEG PRESS 45°
{
  const hip = [188, 190], s = -45;
  const mk = (d) => ({ hip, torso: 135, head: 135, arm: { wrist: [hip[0] + 6, hip[1] + 20], bend: 1 }, leg: { ankle: add(hip, mul(dir(s), d)), bend: -1 }, ft: s - 90 });
  ARTS.leg_press_45 = {
    label: 'Leg press 45°', view: 'side', face: 1, vb: '90 60 290 217',
    keys: [mk(62), mk(88)], track: ['ankle'],
    muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['posteriores'] },
    cues: T(['Costas e quadril apoiados, pés na plataforma, joelhos a ~90°.', 'Empurre a plataforma até quase estender os joelhos.', 'Sem travar os joelhos e sem tirar o quadril do banco.', 'Volte devagar, controlando o peso.']),
    machine(j) {
      const d = dir(s), n = dir(45);
      const r0 = add(add(j.hip, mul(n, 36)), mul(d, -95)), r1 = add(add(j.hip, mul(n, 36)), mul(d, 190));
      const C0 = add(j.ankle, mul(d, 9));
      return {
        back: bar(r0, r1, 8, C.frameDark) + bar(r0, [r0[0], 267], 8, C.frameDark) + bar(add(r0, mul(d, 150)), [add(r0, mul(d, 150))[0], 267], 8, C.frameDark) +
          rrect(add(add(j.hip, mul(dir(135), 22)), mul(n, 17)), 15, 86, 135 + 90, 7, C.pad) + seat(add(j.hip, mul(n, 17)), 46, 14, 45),
        front: rrect(C0, 10, 76, s, 4, C.frame) + rrect(add(C0, mul(d, -3)), 4, 66, s, 2, C.pad) + plate(add(add(C0, mul(n, 30)), mul(d, 6)), 11),
      };
    },
  };
}

// ---------------------------------------------------------------- FLEXORA EM PÉ UNILATERAL
ARTS.standing_leg_curl = {
  label: 'Flexora em pé unilateral', view: 'side', face: 1, vb: '110 58 288 216',
  keys: [
    { hip: [200, 172], torso: -82, head: -84, arm: { wrist: [236, 150], bend: 1 }, leg: { th: 92, sh: 92 }, farLeg: { ankle: [203, 260], bend: -1 }, ft: 0 },
    { hip: [200, 172], torso: -82, head: -84, arm: { wrist: [236, 150], bend: 1 }, leg: { th: 96, sh: 172 }, farLeg: { ankle: [203, 260], bend: -1 }, ft: 30 },
  ],
  track: ['ankle'], muscles: { primary: ['posteriores'], secondary: ['panturrilhas'] },
  cues: T(['Em pé, apoiada na máquina, rolo atrás do calcanhar.', 'Flexione o joelho levando o calcanhar em direção ao glúteo.', 'Contraia atrás da coxa; quadril parado.', 'Volte devagar sem deixar o peso bater.']),
  machine(j, t) {
    return { back: stack(330, 90, 54, 178, t * 22) + bar([240, 90], [240, 262], 10, C.frame) + rrect([232, 140], 14, 56, 0, 7, C.pad) + bar([240, 262], [300, 262], 8, C.frame),
      front: bar(add(j.ankle, [4, -4]), [240, 214], 6, C.frameDark) + rrect(add(j.ankle, [4, -6]), 12, 22, angleOf(j.knee, j.ankle) + 90, 6, C.frame) };
  },
};

// ---------------------------------------------------------------- QUATRO APOIOS (coice de glúteo)
{
  const common = { hip: [250, 210], torso: 180, head: 192, arm: { wrist: [200, 262], bend: 1 }, farLeg: { th: 90, sh: 0 }, ft: 0 };
  ARTS.quadruped_kickback = {
    label: 'Glúteo em quatro apoios', view: 'side', face: -1, vb: '90 120 280 210',
    keys: [{ ...common, leg: { th: 90, sh: 0 } }, { ...common, leg: { th: -5, sh: -85 } }],
    track: ['ankle'], muscles: { primary: ['gluteos'], secondary: ['posteriores', 'lombar'] },
    cues: T(['Quatro apoios: mãos sob os ombros, abdômen firme.', 'Eleve uma perna dobrada, empurrando o calcanhar para o teto.', 'Coxa na altura do quadril; sem arquear a lombar.', 'Volte devagar sem apoiar o joelho no chão.']),
    machine: () => ({ back: rrect([240, 267], 260, 6, 0, 3, C.mat), front: '' }),
  };
}

// ---------------------------------------------------------------- AGACHAMENTO SUMÔ NO STEP (frontal)
{
  const mk = (hy, ny) => fpose({ hip: [200, hy], legs: { l: { ankle: [158, 252], bend: 1 }, r: { ankle: [242, 252], bend: -1 } },
    arms: { l: { wrist: [196, ny], bend: 1 }, r: { wrist: [204, ny], bend: -1 } } });
  ARTS.sumo_squat = {
    label: 'Agachamento sumô no step', view: 'front', vb: '70 80 260 195',
    keys: [mk(166, 160), mk(208, 200)], track: ['hip'],
    muscles: { primary: ['adutores', 'gluteos'], secondary: ['quadriceps'] },
    cues: T(['Pés bem afastados sobre o step, pontas para fora.', 'Dobre os joelhos na direção dos pés, descendo o quadril.', 'Tronco ereto, joelhos abertos; segure o halter ao centro.', 'Empurre o chão e suba contraindo os glúteos.']),
    machine: () => ({ back: rrect([200, 264], 190, 8, 0, 4, C.padDark), front: '' }),
    overlay: (j) => dbHead(add(j.wristL, [4, 4]), 9),
  };
}

// ---------------------------------------------------------------- ESTEIRA (caminhada/corrida)
{
  const arms = (a, b) => ({ arm: { ua: a[0], fa: a[1] }, farArm: { ua: b[0], fa: b[1] } });
  const A = { hip: [200, 172], torso: -86, head: -88, ...arms([120, 100], [60, 20]), leg: { ankle: [226, 258], bend: -1 }, farLeg: { ankle: [172, 248], bend: -1 }, ft: -15, farFt: 50 };
  const B = { hip: [200, 172], torso: -86, head: -88, ...arms([60, 20], [120, 100]), leg: { ankle: [172, 248], bend: -1 }, farLeg: { ankle: [226, 258], bend: -1 }, ft: 50, farFt: -15 };
  ARTS.treadmill = {
    label: 'Esteira', view: 'side', face: 1, vb: '60 62 300 225', keys: [A, B], track: [],
    muscles: { primary: ['quadriceps', 'panturrilhas'], secondary: ['gluteos', 'posteriores'] }, dur: 1.1,
    cues: T(['Em pé na esteira, postura ereta, olhar à frente.', 'Comece a caminhar, braços acompanhando o passo.', 'Passos regulares e respiração tranquila.', 'Mantenha o ritmo; ajuste velocidade e inclinação aos poucos.']),
    machine: () => ({ back: rrect([200, 266], 250, 12, 3, 6, C.frame) + rrect([200, 263], 240, 5, 2, 2.5, C.black) + bar([296, 266], [286, 150], 8, C.frame) + rrect([278, 138], 58, 26, -10, 8, C.frameDark) + bar([270, 168], [225, 168], 5, C.steelDark), front: '' }),
  };
}

// ---------------------------------------------------------------- ESCADA (simulador de degraus)
{
  const A = { hip: [200, 166], torso: -88, head: -90, arm: { wrist: [248, 150], bend: 1 }, leg: { ankle: [214, 236], bend: -1 }, farLeg: { ankle: [186, 260], bend: -1 }, ft: 0, farFt: 0 };
  const B = { hip: [200, 166], torso: -88, head: -90, arm: { wrist: [248, 150], bend: 1 }, leg: { ankle: [214, 260], bend: -1 }, farLeg: { ankle: [186, 236], bend: -1 }, ft: 0, farFt: 0 };
  ARTS.stairs = {
    label: 'Escada', view: 'side', face: 1, vb: '60 62 300 225', keys: [A, B], track: [], dur: 1.2,
    muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['panturrilhas', 'posteriores'] },
    cues: T(['Em pé nos degraus, mãos leves no apoio, postura ereta.', 'Alterne os passos subindo um degrau de cada vez.', 'Passos completos, pés inteiros nos degraus.', 'Mantenha o ritmo constante e a respiração tranquila.']),
    machine: (j) => ({ back: bar([270, 266], [270, 150], 10, C.frame) + rrect([262, 140], 56, 26, 0, 8, C.frameDark) + bar([270, 160], [240, 150], 6, C.steelDark) + bar([150, 266], [250, 266], 8, C.frame),
      front: rrect(add(j.ankle, [4, 12]), 46, 8, 0, 3, C.padDark) + rrect(add(j.farAnkle, [4, 12]), 46, 8, 0, 3, C.padDark) }),
  };
}

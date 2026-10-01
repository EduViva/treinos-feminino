// Cenas dedicadas (3/3): variações que precisam de aparelho/pegada/posição específicos para serem fiéis ao exercício.
import { dir, add, sub, mul, angleOf, circle } from './rig.js';
import { C, rrect, bar, rod, pulley, plate, stack, seat } from './kit.js';
import { ARTS, fpose, fLegsFK, seatedFrameFront, seatedBaseFront } from './arts.js';

const T = (a) => ({ ini: a[0], mov: a[1], fim: a[2], ret: a[3] });
const mat = (cx = 200, w = 220) => rrect([cx, 267], w, 6, 0, 3, C.mat);
const stand = { ankle: [203, 260], bend: -1 };
const base = { hip: [200, 172], torso: -90, head: -90, ft: 0 };

// ---------------------------------------------------------------- PUXADA FECHADA, PEGADA SUPINADA (frontal)
{
  const hip = [200, 176], legs = fLegsFK([97, 85]);
  const A = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [186, 78], bend: -1 }, r: { wrist: [214, 78], bend: 1 } } });
  const B = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [183, 136], bend: -1 }, r: { wrist: [217, 136], bend: 1 } } });
  ARTS.lat_pulldown_supine = {
    label: 'Puxada fechada supinada', view: 'front', vb: '28 14 345 258', keys: [A, B], track: ['wristL', 'wristR'],
    muscles: { primary: ['costas'], secondary: ['biceps', 'ombros'] },
    cues: T(['Pegada fechada, palmas das mãos voltadas para você (supinada).', 'Puxe a barra ao peito, cotovelos junto ao corpo.', 'Escápulas juntas; bíceps e dorsais contraídos.', 'Suba devagar até os braços quase esticados.']),
    machine(j, t) {
      const lb = add(j.wristL, [-6, 0]), rb = add(j.wristR, [6, 0]);
      const arch = 'M116 266V84Q116 22 200 22Q284 22 284 84V266';
      return {
        back: `<path d="${arch}" fill="${C.panel}" stroke="${C.frame}" stroke-width="11" stroke-linejoin="round"/>` +
          stack(200, 40, 36, 74, (1 - t) * 10).replace(/<rect[^>]*fill="#2F5E9E"\/>/, '') + seatedFrameFront(j.hip) + seatedBaseFront(j.hip),
        front: rod([200, 42], lb, 1.8) + rod([200, 42], rb, 1.8) + pulley([200, 42], 7) + bar(lb, rb, 6, C.steelDark) +
          // palmas para cima: pequena curva sob cada mão
          `<path d="M${lb[0] + 9} ${lb[1] + 8}q-9 6-18 0M${rb[0] - 9} ${rb[1] + 8}q9 6 18 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/>` +
          rrect(add(j.hip, [-24, 12]), 16, 40, -8, 6, C.pad) + rrect(add(j.hip, [24, 12]), 16, 40, 8, 6, C.pad),
      };
    },
  };
}

// ---------------------------------------------------------------- SERROTE NA MÁQUINA (remada unilateral com apoio de peito)
{
  const legs = { ankle: [228, 244], bend: -1 };
  const common = { hip: [150, 230], torso: -78, head: -82, leg: legs, ft: -88, farArm: { wrist: [186, 196], bend: 1 } };
  const A = { ...common, arm: { wrist: [216, 192], bend: -1 } };
  const B = { ...common, arm: { wrist: [166, 214], bend: -1 } };
  ARTS.one_arm_row = {
    label: 'Serrote na máquina', view: 'side', face: 1, vb: '90 82 290 218', keys: [A, B], track: ['wrist'],
    muscles: { primary: ['costas'], secondary: ['biceps', 'ombros'] },
    cues: T(['Sentada com o peito no apoio, uma mão na pegada, braço esticado.', 'Puxe a pegada em direção ao quadril, cotovelo rente ao corpo.', 'Escápula aproximada da coluna; tronco parado.', 'Volte devagar, alongando o dorsal.']),
    machine(j, t) {
      const h = j.wrist;
      return {
        back: stack(346, 120, 56, 148, (1 - t) * 20) + seat([140, 246], 80, 14, 0) + bar([100, 266], [262, 266], 9) + bar([120, 250], [120, 266], 8, C.frameDark) +
          bar([204, 266], [204, 150], 9, C.frameDark) + rrect([188, 178], 15, 64, 8, 7, C.pad) +
          rod(h, [320, 196], 2) + pulley([320, 196], 6),
        front: rrect(h, 8, 18, 0, 3, C.black),
      };
    },
  };
}

// ---------------------------------------------------------------- ROSCA DIRETA COM BARRA W
{
  const b = { ...base, leg: { ankle: [203, 260], bend: -1 } };
  const A = { ...b, arm: { ua: 92, fa: 94 } };
  const B = { ...b, arm: { ua: 86, fa: -52 } };
  const wbar = (c, a) => {
    const p = (x, y) => { const r = a * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r); return `${(c[0] + x * cs - y * sn).toFixed(1)} ${(c[1] + x * sn + y * cs).toFixed(1)}`; };
    return `<path d="M${p(-22, 0)}L${p(-14, 0)}L${p(-8, -5)}L${p(-3, 0)}L${p(3, 0)}L${p(8, -5)}L${p(14, 0)}L${p(22, 0)}" stroke="${C.steelDark}" stroke-width="3.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<path d="M${p(-22, 0)}L${p(-14, 0)}M${p(14, 0)}L${p(22, 0)}" stroke="${C.black}" stroke-width="6" stroke-linecap="round"/>`;
  };
  ARTS.ez_curl = {
    label: 'Rosca direta com barra W', view: 'side', face: 1, vb: '70 84 260 195', keys: [A, B], track: ['wrist'],
    muscles: { primary: ['biceps'], secondary: [] },
    cues: T(['Em pé, barra W com pegada supinada, braços estendidos.', 'Flexione os cotovelos levando a barra aos ombros.', 'Bíceps contraído; cotovelos parados junto ao corpo.', 'Desça devagar até estender os braços.']),
    machine: () => ({ back: mat(203, 140), front: '' }),
    overlay: (j) => wbar(add(j.wrist, [1, 1]), 14),
  };
}

// ---------------------------------------------------------------- DESENVOLVIMENTO NA MÁQUINA (frontal, pegadas articuladas)
{
  const hip = [200, 176], legs = fLegsFK([97, 85]);
  const A = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [158, 100], bend: -1 }, r: { wrist: [242, 100], bend: 1 } } });
  const B = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [176, 64], bend: -1 }, r: { wrist: [224, 64], bend: 1 } } });
  ARTS.shoulder_press_machine = {
    label: 'Desenvolvimento na máquina', view: 'front', vb: '50 30 300 245', keys: [A, B], track: ['wristL', 'wristR'],
    muscles: { primary: ['ombros'], secondary: ['triceps'] },
    cues: T(['Costas apoiadas, pegadas na altura dos ombros, cotovelos abertos.', 'Empurre as pegadas para cima, estendendo os braços.', 'Braços quase estendidos, sem arquear a lombar.', 'Desça devagar até a altura das orelhas.']),
    machine(j, t) {
      const L = j.wristL, R = j.wristR;
      return {
        back: bar([108, 266], [108, 40], 10, C.frameDark) + bar([292, 266], [292, 40], 10, C.frameDark) + bar([108, 40], [292, 40], 10, C.frameDark) +
          bar([108, 96], L, 7, C.frame) + bar([292, 96], R, 7, C.frame) + circle([108, 96], 6, C.steelDark) + circle([292, 96], 6, C.steelDark) +
          seatedFrameFront(j.hip) + seatedBaseFront(j.hip),
        front: rrect(L, 22, 7, 0, 3.5, C.black) + rrect(R, 22, 7, 0, 3.5, C.black),
      };
    },
  };
}

// ---------------------------------------------------------------- AFUNDO COM O PÉ DA FRENTE NO STEP
{
  const hands = { ua: 94, fa: 94 };
  const A = { hip: [198, 168], torso: -90, head: -90, arm: hands, leg: { ankle: [236, 244], bend: -1 }, ft: 0, farLeg: { ankle: [190, 257], bend: -1 }, farFt: 0 };
  const B = { hip: [202, 204], torso: -90, head: -90, arm: hands, leg: { ankle: [246, 244], bend: -1 }, ft: 0, farLeg: { ankle: [156, 248], bend: -1 }, farFt: 62 };
  ARTS.step_lunge = {
    label: 'Afundo com pé da frente no step', view: 'side', face: 1, vb: '70 84 260 195', keys: [A, B], track: ['hip'],
    muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['posteriores'] },
    cues: T(['Pé da frente apoiado inteiro sobre o step; pé de trás no chão.', 'Dobre os dois joelhos descendo com o tronco reto.', 'Joelho da frente a ~90°, sobre o pé; joelho de trás quase no chão.', 'Empurre o step com o pé da frente e suba.']),
    machine: () => ({ back: mat(200, 240) + rrect([246, 258], 58, 17, 0, 4, C.padDark) + rrect([246, 251], 58, 4, 0, 2, C.pad), front: '' }),
  };
}

// ---------------------------------------------------------------- AFUNDO NO SMITH
{
  const A = { hip: [200, 170], torso: -90, head: -90, arm: { wrist: [191, 116], bend: 1 }, leg: { ankle: [230, 260], bend: -1 }, ft: 0, farLeg: { ankle: [174, 256], bend: -1 }, farFt: 0 };
  const B = { hip: [200, 208], torso: -90, head: -90, arm: { wrist: [191, 154], bend: 1 }, leg: { ankle: [246, 260], bend: -1 }, ft: 0, farLeg: { ankle: [154, 247], bend: -1 }, farFt: 62 };
  ARTS.smith_lunge = {
    label: 'Afundo no Smith', view: 'side', face: 1, vb: '60 40 290 235', keys: [A, B], track: ['hip'],
    muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['posteriores'] },
    cues: T(['Barra do Smith nos ombros, um pé à frente e o outro atrás.', 'Dobre os joelhos descendo na vertical, tronco reto.', 'Joelho da frente a ~90°; o de trás perto do chão.', 'Empurre o chão com o pé da frente e suba.']),
    machine(j) {
      const barC = add(j.wrist, [-2, -2]);
      return { back: bar([180, 40], [180, 268], 7, C.frameDark) + bar([250, 40], [250, 268], 7, C.frameDark) + mat(200, 240), front: rrect(barC, 58, 5, 0, 2.5, C.steelDark) + plate(add(barC, [28, 0]), 8) };
    },
  };
}

// ---------------------------------------------------------------- SUPINO INCLINADO ARTICULADO (máquina com encosto inclinado)
{
  const hip = [160, 224];
  const legs = { ankle: [214, 262], bend: -1 };
  const A = { hip, torso: -125, head: -128, arm: { wrist: [150, 176], bend: 1 }, leg: legs, ft: 0 };
  const B = { hip, torso: -125, head: -128, arm: { wrist: [176, 148], bend: 1 }, leg: legs, ft: 0 };
  ARTS.incline_press = {
    label: 'Supino inclinado articulado', view: 'side', face: 1, vb: '40 70 280 210', keys: [A, B], track: ['wrist'],
    muscles: { primary: ['peito'], secondary: ['ombros', 'triceps'] },
    cues: T(['Encosto inclinado, costas apoiadas, pegadas na altura da parte alta do peito.', 'Empurre as pegadas para frente e para cima, estendendo os braços.', 'Braços quase estendidos; ombros para baixo e para trás.', 'Volte devagar sentindo o peito alongar.']),
    machine(j, t) {
      const bc = add(add(j.hip, mul(dir(j.torsoAng), 38)), mul(dir(j.torsoAng - 90), 17));
      return {
        back: stack(80, 100, 58, 164, t * 24) + rrect(bc, 17, 92, j.torsoAng + 90, 8, C.pad) + seat(add(j.hip, [4, 16]), 70, 15, 0) +
          bar([160, 232], [160, 264], 12, C.frameDark) + bar([116, 266], [250, 266], 9) + bar([112, 150], j.wrist, 6, C.frameDark) + circle([112, 150], 5, C.steelDark),
        front: bar(add(j.wrist, [0, -9]), add(j.wrist, [0, 9]), 7, C.black),
      };
    },
  };
}

// ---------------------------------------------------------------- AGACHAMENTO PROFUNDO (mobilidade, peso corporal)
{
  const ankle = [205, 260];
  const A = { hip: [200, 172], torso: -90, head: -90, arm: { wrist: [226, 150], bend: 1 }, leg: { ankle, bend: -1 }, ft: 0 };
  const B = { hip: [170, 236], torso: -72, head: -74, arm: { wrist: [208, 222], bend: 1 }, leg: { ankle, bend: -1 }, ft: 0 };
  ARTS.deep_squat = {
    label: 'Agachamento profundo', view: 'side', face: 1, vb: '70 84 260 195', keys: [A, B], track: ['hip'], dur: 2.4,
    muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['adutores'] },
    cues: T(['Em pé, pés um pouco mais abertos que os ombros, mãos juntas ao peito.', 'Desça o quadril entre os pés, mantendo os calcanhares no chão.', 'Na posição mais baixa, cotovelos empurram os joelhos para fora; peito aberto.', 'Suba devagar empurrando o chão.']),
    machine: () => ({ back: mat(205, 150), front: '' }),
  };
}

// ---------------------------------------------------------------- TRÍCEPS COM CORDA NA POLIA
{
  const b = { hip: [194, 172], torso: -86, head: -88, leg: { ankle: [205, 260], bend: -1 }, ft: 0 };
  const A = { ...b, arm: { ua: 96, fa: -10 } };
  const B = { ...b, arm: { ua: 96, fa: 84 } };
  ARTS.triceps_rope = {
    label: 'Tríceps com corda na polia', view: 'side', face: 1, vb: '110 58 288 216', keys: [A, B], track: ['wrist'],
    muscles: { primary: ['triceps'], secondary: [] },
    cues: T(['Cotovelos junto ao corpo, mãos segurando as pontas da corda.', 'Estenda os cotovelos e abra as pontas da corda no final.', 'Braços estendidos; só os antebraços se movem.', 'Volte devagar até os antebraços na horizontal.']),
    machine(j, t) {
      const w = j.wrist, u = dir(angleOf(j.elbow, j.wrist));
      const tip = add(w, mul(u, 10));
      return {
        back: stack(318, 60, 62, 208, t * 22) + pulley([280, 62], 7) + bar([280, 62], [318, 62], 7, C.frame),
        front: rod(add(w, [-2, -2]), [280, 62], 2) +
          `<path d="M${(w[0] - 3).toFixed(1)} ${(w[1] - 2).toFixed(1)}q${(6 + t * 5).toFixed(1)} 4 ${(tip[0] - w[0] + 5).toFixed(1)} ${(tip[1] - w[1] + 8).toFixed(1)}M${(w[0] - 3).toFixed(1)} ${(w[1] - 2).toFixed(1)}q${(-3 - t * 6).toFixed(1)} 6 ${(tip[0] - w[0] - 3).toFixed(1)} ${(tip[1] - w[1] + 12).toFixed(1)}" stroke="${C.black}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
          circle(add(tip, [5, 8]), 3.2, C.steelDark) + circle(add(tip, [-3, 12]), 3.2, C.steelDark),
      };
    },
  };
}

// correção de enquadramento do tríceps francês (mão acima da cabeça saía do quadro)
if (ARTS.overhead_triceps) ARTS.overhead_triceps.vb = '70 40 260 195';

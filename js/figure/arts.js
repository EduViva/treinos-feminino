// Cenas instrucionais: pose inicial → final (e volta), aparelho correto e dicas por fase.
// Todas usam a MESMA modelo (mulher adulta, esportiva, neutra) definida em rig.js.
import { dir, add, sub, mul, lerp2, angleOf, sideNormal, circle } from './rig.js';
import { C, rrect, bar, rod, pulley, plate, dbHead, dumbbellH, stack, pad, seat } from './kit.js';

export const mirrorA = (a) => 180 - a;

// helpers de pose frontal
export function fpose({ hip, tilt = 0, legK = 1, arms, legs, hipW }) { return { hip, tilt, legK, arms, legs, hipW }; }
export const fArmsFK = (l, r) => ({ l: { ua: l[0], fa: l[1] }, r: { ua: r ? r[0] : mirrorA(l[0]), fa: r ? r[1] : mirrorA(l[1]) } });
export const fLegsFK = (l, r) => ({ l: { th: l[0], sh: l[1] }, r: { th: r ? r[0] : mirrorA(l[0]), sh: r ? r[1] : mirrorA(l[1]) } });

// Encosto + assento visto de frente (aparelhos sentados)
export function seatedFrameFront(hip) {
  return rrect([hip[0], hip[1] - 44], 74, 108, 0, 24, C.pad) + rrect([hip[0], hip[1] - 44], 66, 100, 0, 20, C.padDark, 'opacity="0.3"');
}
export function seatedBaseFront(hip) {
  return rrect([hip[0], hip[1] + 6], 82, 16, 0, 7, C.pad) + bar([hip[0], hip[1] + 12], [hip[0], 262], 14, C.frameDark) + bar([hip[0] - 62, 265], [hip[0] + 62, 265], 9, C.frame);
}

export const ARTS = {};

// ---------------------------------------------------------------- 1. LEG PRESS (lateral, como a referência)
{
  const hip = [262, 208];
  const s = -160, ft = s + 90;
  const A = { hip, torso: -66, head: -72, arm: { wrist: [273, 205] }, leg: { ankle: add(hip, mul(dir(s), 64)), bend: 1 }, ft };
  const B = { ...A, leg: { ankle: add(hip, mul(dir(s), 88)), bend: 1 } };
  ARTS.leg_press = {
    label: 'Leg press', view: 'side', face: -1, keys: [A, B], track: ['ankle'],
    muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['posteriores'] },
    cues: { ini: 'Joelhos dobrados (~90°), costas e quadril apoiados.', mov: 'Empurre a plataforma com os pés inteiros no apoio.', fim: 'Pernas quase estendidas, sem travar os joelhos.', ret: 'Volte devagar sem tirar o quadril do banco.' },
    machine(j, t, face) {
      const ang = angleOf(j.hip, j.ankle);
      const C0 = add(j.ankle, mul(dir(ang), 9));
      const down = dir(ang + 90 * face);
      const back = sideNormal(sub(j.shoulder, j.hip), face, false);
      const bc = add(add(j.hip, mul(dir(j.torsoAng), 32)), mul(back, 17));
      const lift = t * 26;
      const back_ = stack(332, 84, 58, 184, lift) +
        bar([268, 232], [268, 264], 12, C.frameDark) + bar([226, 266], [330, 266], 9) +
        rrect(bc, 17, 74, j.torsoAng + 90, 8, C.pad) +
        seat(add(j.hip, [2, 15]), 64, 15, 8) +
        bar(add(C0, mul(down, 36)), [286, 250], 6, C.frameDark) + bar([226, 266], [286, 250], 6, C.frameDark);
      const front = rrect(C0, 11, 76, ang, 4, C.frame) + rrect(add(C0, mul(dir(ang), -3)), 4, 66, ang, 2, C.pad) +
        bar(add(j.wrist, [-2, -5]), add(j.wrist, [-2, 7]), 6, C.black);
      return { back: back_, front };
    },
  };
}

// ---------------------------------------------------------------- 2. CADEIRA EXTENSORA
{
  const hip = [172, 208];
  const arm = { wrist: [194, 205] };
  const A = { hip, torso: -82, head: -86, arm, leg: { th: 4, sh: 100 }, ft: 8 };
  const B = { ...A, leg: { th: 4, sh: -8 }, ft: -48 };
  ARTS.leg_extension = {
    label: 'Cadeira extensora', view: 'side', face: 1, keys: [A, B], track: ['ankle'],
    muscles: { primary: ['quadriceps'], secondary: [] },
    cues: { ini: 'Joelhos a 90°, apoio logo acima do tornozelo.', mov: 'Estenda os joelhos até quase retos.', fim: 'Segure 1 segundo contraindo a coxa.', ret: 'Desça devagar, controlando o peso.' },
    machine(j, t, face) {
      const v = sub(j.ankle, j.knee);
      const padC = add(add(j.knee, mul(v, 0.86)), mul(sideNormal(v, face, true), 8));
      const back = sideNormal(sub(j.shoulder, j.hip), face, false);
      const bc = add(add(j.hip, mul(dir(j.torsoAng), 30)), mul(back, 17));
      const piv = [j.hip[0] + 36, j.hip[1] + 32];
      return {
        back: stack(78, 92, 58, 176, t * 22) + bar([120, 266], [270, 266], 9) + bar([172, 228], [172, 264], 12, C.frameDark) +
          rrect(bc, 17, 70, j.torsoAng + 90, 8, C.pad) + seat(add(j.hip, [8, 15]), 84, 15, 0),
        front: bar(padC, piv, 6, C.frameDark) + circle(piv, 5, C.steelDark) + rrect(padC, 10, 24, angleOf(j.knee, j.ankle), 5, C.frame) +
          bar(add(j.wrist, [-1, -5]), add(j.wrist, [-1, 6]), 6, C.black),
      };
    },
  };
}

// ---------------------------------------------------------------- 3. CADEIRA FLEXORA
{
  const hip = [160, 206];
  const arm = { wrist: [182, 204] };
  const A = { hip, torso: -82, head: -86, arm, leg: { th: 2, sh: -10 }, ft: -40 };
  const B = { ...A, leg: { th: 2, sh: 98 }, ft: 10 };
  ARTS.leg_curl = {
    label: 'Cadeira flexora', view: 'side', face: 1, keys: [A, B], track: ['ankle'],
    muscles: { primary: ['posteriores'], secondary: ['panturrilhas'] },
    cues: { ini: 'Pernas esticadas sobre o apoio, coxas presas.', mov: 'Flexione os joelhos levando os calcanhares para baixo.', fim: 'Calcanhares sob o assento; contraia atrás da coxa.', ret: 'Volte devagar até quase estender as pernas.' },
    machine(j, t, face) {
      const v = sub(j.ankle, j.knee);
      const padC = add(add(j.knee, mul(v, 0.86)), mul(sideNormal(v, face, false), 8));
      const back = sideNormal(sub(j.shoulder, j.hip), face, false);
      const bc = add(add(j.hip, mul(dir(j.torsoAng), 30)), mul(back, 17));
      const thighC = add(add(j.hip, mul(sub(j.knee, j.hip), 0.62)), mul(sideNormal(sub(j.knee, j.hip), face, true), 10));
      const piv = [j.knee[0] + 14, j.knee[1] + 36];
      return {
        back: stack(78, 92, 58, 176, t * 22) + bar([112, 266], [262, 266], 9) + bar([160, 226], [160, 264], 12, C.frameDark) +
          rrect(bc, 17, 70, j.torsoAng + 90, 8, C.pad) + seat(add(j.hip, [14, 15]), 96, 15, 0),
        front: bar(padC, piv, 6, C.frameDark) + circle(piv, 5, C.steelDark) + rrect(padC, 11, 24, angleOf(j.knee, j.ankle), 5, C.frame) +
          rrect(thighC, 44, 9, angleOf(j.hip, j.knee), 4, C.pad) + bar(add(j.wrist, [-1, -5]), add(j.wrist, [-1, 6]), 6, C.black),
      };
    },
  };
}

// ---------------------------------------------------------------- 4. AGACHAMENTO LIVRE
{
  const ankle = [205, 260];
  const A = { hip: [200, 172], torso: -90, head: -90, arm: { ua: -8, fa: -8 }, leg: { ankle, bend: -1 }, ft: 0 };
  const B = { hip: [166, 217], torso: -62, head: -66, arm: { ua: -8, fa: -8 }, leg: { ankle, bend: -1 }, ft: 0 };
  ARTS.squat = {
    label: 'Agachamento livre', view: 'side', face: 1, keys: [A, B], track: ['hip'],
    muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['posteriores'] },
    cues: { ini: 'Em pé, pés na largura dos ombros, braços à frente.', mov: 'Quadril para trás e para baixo, joelhos na direção dos pés.', fim: 'Coxas paralelas ao chão, tronco firme.', ret: 'Suba empurrando o chão com os pés.' },
    machine() {
      return { back: rrect([205, 267], 150, 6, 0, 3, C.mat), front: '' };
    },
  };
}

// ---------------------------------------------------------------- 5. AGACHAMENTO COM HALTER (goblet)
{
  const ankle = [205, 260];
  const A = { hip: [200, 172], torso: -90, head: -90, arm: { wrist: [216, 137], bend: 1 }, leg: { ankle, bend: -1 }, ft: 0 };
  const B = { hip: [166, 217], torso: -64, head: -68, arm: { wrist: [204, 186], bend: 1 }, leg: { ankle, bend: -1 }, ft: 0 };
  ARTS.goblet_squat = {
    label: 'Agachamento com halter', view: 'side', face: 1, keys: [A, B], track: ['hip'],
    muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['abdomen'] },
    cues: { ini: 'Halter junto ao peito, cotovelos para baixo.', mov: 'Quadril para trás e para baixo, tronco ereto.', fim: 'Coxas paralelas ao chão.', ret: 'Empurre o chão e volte à posição inicial.' },
    machine() { return { back: rrect([205, 267], 150, 6, 0, 3, C.mat), front: '' }; },
    overlay(j) { return dbHead(add(j.wrist, [5, -1]), 8.5); },
  };
}

// ---------------------------------------------------------------- 6. AFUNDO
{
  const A = { hip: [200, 172], torso: -90, head: -90, arm: { ua: 94, fa: 94 }, leg: { ankle: [203, 260], bend: -1 }, ft: 0, farLeg: { ankle: [197, 260], bend: -1 }, farFt: 0 };
  const B = { hip: [196, 208], torso: -90, head: -90, arm: { ua: 94, fa: 94 }, leg: { ankle: [244, 260], bend: -1 }, ft: 0, farLeg: { ankle: [152, 245], bend: -1 }, farFt: 62 };
  ARTS.lunge = {
    label: 'Afundo', view: 'side', face: 1, keys: [A, B], track: ['hip'],
    muscles: { primary: ['quadriceps', 'gluteos'], secondary: ['posteriores'] },
    cues: { ini: 'Em pé, pés juntos, tronco ereto.', mov: 'Passo largo à frente e desça com o tronco reto.', fim: 'Joelho da frente a ~90°, o de trás perto do chão.', ret: 'Empurre com o pé da frente e volte.' },
    machine() { return { back: rrect([200, 267], 220, 6, 0, 3, C.mat), front: '' }; },
  };
}

// ---------------------------------------------------------------- 7. ELEVAÇÃO PÉLVICA
{
  const sh = [118, 207];
  const ankle = [213, 260];
  const A = { tail: 180, hip: [157.4, 237.8], torso: 218, head: -172, arm: { wrist: [152, 232], bend: -1 }, leg: { ankle, bend: -1 }, ft: 0 };
  const B = { tail: 180, hip: [168, 207], torso: 180, head: -176, arm: { wrist: [163, 201], bend: -1 }, leg: { ankle, bend: -1 }, ft: 0 };
  ARTS.hip_thrust = {
    label: 'Elevação pélvica', view: 'side', face: 1, keys: [A, B], track: ['hip'],
    muscles: { primary: ['gluteos'], secondary: ['posteriores', 'quadriceps'] },
    cues: { ini: 'Parte alta das costas no banco, barra sobre o quadril.', mov: 'Empurre o chão e eleve o quadril contraindo o glúteo.', fim: 'Corpo em linha do ombro ao joelho; segure 1 segundo.', ret: 'Desça devagar, sem encostar totalmente no chão.' },
    machine(j) {
      const barC = add(j.wrist, [9, -7]);
      return {
        back: rrect([92, 236], 112, 28, 0, 7, C.bench) + rrect([92, 227], 104, 12, 0, 6, C.pad) + bar([62, 248], [62, 267], 9, C.frameDark) + bar([128, 248], [128, 267], 9, C.frameDark),
        front: plate(barC, 17) + rrect(add(j.hip, [6, -4]), 22, 8, 12, 4, C.pad, 'opacity="0.0"'),
      };
    },
  };
}

// ---------------------------------------------------------------- 8. STIFF
{
  const A = { hip: [198, 172], torso: -90, head: -90, arm: { ua: 92, fa: 92 }, leg: { ankle: [200, 260], bend: -1 }, ft: 0 };
  const B = { hip: [158, 180], torso: -24, head: -44, arm: { ua: 92, fa: 92 }, leg: { ankle: [190, 260], bend: -1 }, ft: 0 };
  ARTS.rdl = {
    label: 'Stiff com halteres', view: 'side', face: 1, keys: [A, B], track: ['wrist'],
    muscles: { primary: ['posteriores', 'gluteos'], secondary: ['lombar'] },
    cues: { ini: 'Em pé, joelhos levemente flexionados, halteres à frente das coxas.', mov: 'Quadril para trás, coluna reta, halteres rente às pernas.', fim: 'Alongamento atrás das coxas; costas retas.', ret: 'Empurre o quadril para frente e suba.' },
    machine() { return { back: rrect([200, 267], 150, 6, 0, 3, C.mat), front: '' }; },
    overlay(j) { return dbHead(add(j.wrist, [0, 5]), 8); },
  };
}

// ---------------------------------------------------------------- 9. PANTURRILHA EM PÉ
{
  const A = { hip: [200, 172], torso: -90, head: -90, arm: { ua: 92, fa: 92 }, leg: { ankle: [200, 260], bend: -1 }, ft: 0 };
  const B = { hip: [204, 160], torso: -90, head: -90, arm: { ua: 92, fa: 92 }, leg: { ankle: [204, 248], bend: -1 }, ft: 38 };
  ARTS.calf_raise = {
    label: 'Elevação de panturrilha', view: 'side', face: 1, keys: [A, B], track: ['ankle'],
    muscles: { primary: ['panturrilhas'], secondary: [] },
    cues: { ini: 'Em pé, apoiada na ponta dos pés, joelhos estendidos.', mov: 'Suba o máximo que conseguir sobre a ponta dos pés.', fim: 'Segure 1 segundo no alto.', ret: 'Desça devagar, alongando a panturrilha.' },
    machine() { return { back: rrect([222, 266], 70, 5, 0, 2.5, C.padDark), front: '' }; },
    overlay(j) { return dbHead(add(j.wrist, [0, 5]), 7.5); },
  };
}

// ---------------------------------------------------------------- 10. GLÚTEO NA POLIA (coice)
{
  const stand = { ankle: [205, 260], bend: -1 };
  const A = { hip: [196, 172], torso: -62, head: -68, arm: { wrist: [256, 142], bend: 1 }, leg: { ankle: [190, 246], bend: -1 }, ft: 25, farLeg: stand, farFt: 0 };
  const B = { ...A, leg: { ankle: [126, 226], bend: -1 }, ft: 58 };
  ARTS.cable_kickback = {
    label: 'Glúteo na polia', view: 'side', face: 1, keys: [A, B], track: ['ankle'],
    muscles: { primary: ['gluteos'], secondary: ['posteriores'] },
    cues: { ini: 'Tornozeleira presa, mãos na torre, tronco levemente inclinado.', mov: 'Leve a perna para trás e para cima, sem arquear a lombar.', fim: 'Glúteo contraído; segure 1 segundo.', ret: 'Volte devagar sem deixar o peso encostar.' },
    machine(j, t) {
      return {
        back: stack(318, 70, 60, 198, t * 24) + bar([282, 140], [262, 140], 6, C.frameDark),
        front: rod(add(j.ankle, [0, 2]), [290, 252], 1.8) + pulley([290, 252], 6) + rrect(j.ankle, 14, 10, angleOf(j.knee, j.ankle) + 90, 4, C.black) + bar(add(j.wrist, [0, -6]), add(j.wrist, [0, 6]), 6, C.black),
      };
    },
  };
}

// ---------------------------------------------------------------- 11. SUPINO NA MÁQUINA
{
  const hip = [150, 214];
  const legs = { ankle: [202, 260], bend: -1 };
  const A = { hip, torso: -88, head: -90, arm: { wrist: [172, 170], bend: 1 }, leg: legs, ft: 0 };
  const B = { ...A, arm: { wrist: [204, 168], bend: 1 } };
  ARTS.chest_press = {
    label: 'Supino na máquina', view: 'side', face: 1, keys: [A, B], track: ['wrist'],
    muscles: { primary: ['peito'], secondary: ['ombros', 'triceps'] },
    cues: { ini: 'Costas apoiadas, pegadas na altura do peito.', mov: 'Empurre os cotovelos à frente, sem travar.', fim: 'Braços quase estendidos; ombros para baixo.', ret: 'Volte devagar sentindo o peito alongar.' },
    machine(j, t, face) {
      const bc = add(add(j.hip, mul(dir(j.torsoAng), 30)), [-16, 0]);
      return {
        back: stack(86, 96, 58, 172, t * 24) + rrect(bc, 17, 86, j.torsoAng + 90, 8, C.pad) + seat(add(j.hip, [6, 16]), 70, 15, 0) +
          bar([150, 230], [150, 264], 12, C.frameDark) + bar([112, 266], [250, 266], 9) + bar([122, 164], j.wrist, 6, C.frameDark),
        front: bar(add(j.wrist, [0, -9]), add(j.wrist, [0, 9]), 7, C.black),
      };
    },
  };
}

// ---------------------------------------------------------------- 12. REMADA SENTADA
{
  const legs = { ankle: [238, 238], bend: -1 };
  const A = { hip: [150, 230], torso: -74, head: -78, arm: { wrist: [213, 187], bend: -1 }, leg: legs, ft: -88 };
  const B = { hip: [150, 230], torso: -90, head: -90, arm: { wrist: [177, 222], bend: -1 }, leg: legs, ft: -88 };
  ARTS.seated_row = {
    label: 'Remada sentada', view: 'side', face: 1, keys: [A, B], track: ['wrist'],
    muscles: { primary: ['costas'], secondary: ['biceps', 'ombros'] },
    cues: { ini: 'Pés apoiados, braços estendidos, tronco ereto.', mov: 'Puxe o triângulo ao abdômen, cotovelos junto ao corpo.', fim: 'Escápulas juntas; sem jogar o tronco para trás.', ret: 'Volte devagar alongando as costas.' },
    machine(j, t) {
      const handle = j.wrist;
      return {
        back: stack(346, 120, 56, 148, (1 - t) * 20) + seat([140, 244], 80, 14, 0) + bar([100, 266], [262, 266], 9) + bar([120, 250], [120, 266], 8, C.frameDark) +
          rrect([252, 238], 8, 54, 0, 4, C.frame) + rod(handle, [320, 196], 2) + pulley([320, 196], 6),
        front: rrect(handle, 8, 20, 0, 3, C.black),
      };
    },
  };
}

// ---------------------------------------------------------------- 13. ROSCA DIRETA
{
  const base = { hip: [200, 172], torso: -90, head: -90, leg: { ankle: [203, 260], bend: -1 }, ft: 0 };
  const A = { ...base, arm: { ua: 92, fa: 94 } };
  const B = { ...base, arm: { ua: 86, fa: -52 } };
  ARTS.biceps_curl = {
    label: 'Rosca direta', view: 'side', face: 1, keys: [A, B], track: ['wrist'],
    muscles: { primary: ['biceps'], secondary: [] },
    cues: { ini: 'Braços estendidos ao lado do corpo, palmas para frente.', mov: 'Flexione os cotovelos sem balançar o tronco.', fim: 'Bíceps contraído; cotovelos parados.', ret: 'Desça devagar até estender os braços.' },
    machine() { return { back: rrect([203, 267], 140, 6, 0, 3, C.mat), front: '' }; },
    overlay(j) { return dbHead(add(j.wrist, mul(dir(angleOf(j.elbow, j.wrist)), 3)), 8); },
  };
}

// ---------------------------------------------------------------- 14. TRÍCEPS NA POLIA
{
  const base = { hip: [194, 172], torso: -86, head: -88, leg: { ankle: [205, 260], bend: -1 }, ft: 0 };
  const A = { ...base, arm: { ua: 96, fa: -10 } };
  const B = { ...base, arm: { ua: 96, fa: 84 } };
  ARTS.triceps_pushdown = {
    label: 'Tríceps na polia', view: 'side', face: 1, keys: [A, B], track: ['wrist'],
    muscles: { primary: ['triceps'], secondary: [] },
    cues: { ini: 'Cotovelos junto ao corpo, antebraços na horizontal.', mov: 'Estenda os cotovelos empurrando a barra para baixo.', fim: 'Braços estendidos; só os antebraços se movem.', ret: 'Volte devagar até a horizontal.' },
    machine(j, t) {
      return {
        back: stack(318, 60, 62, 208, t * 22) + pulley([280, 62], 7) + bar([280, 62], [318, 62], 7, C.frame),
        front: rod(add(j.wrist, [0, -2]), [280, 62], 2) + rrect(j.wrist, 24, 6, angleOf(j.elbow, j.wrist), 3, C.black),
      };
    },
  };
}

// ---------------------------------------------------------------- 15. ABDOMINAL
{
  const legs = { ankle: [255, 260], bend: -1 };
  const hip = [215, 255];
  const A = { tail: 180, hip, torso: 180, head: 180, arm: { wrist: [150, 248], bend: 1 }, leg: legs, ft: 0 };
  const B = { tail: 180, hip, torso: 212, head: 200, arm: { wrist: [158, 214], bend: 1 }, leg: legs, ft: 0 };
  ARTS.crunch = {
    label: 'Abdominal', view: 'side', face: 1, keys: [A, B], track: ['head'],
    muscles: { primary: ['abdomen'], secondary: [] },
    cues: { ini: 'Deitada, joelhos dobrados, mãos leves atrás da cabeça.', mov: 'Contraia o abdômen e eleve as escápulas do chão.', fim: 'Abdômen contraído; pescoço relaxado.', ret: 'Desça devagar sem relaxar totalmente.' },
    machine() { return { back: rrect([190, 266], 230, 8, 0, 4, C.mat), front: '' }; },
  };
}

// ---------------------------------------------------------------- 16. PRANCHA (isométrico)
{
  const A = { hip: [170, 240], torso: 183, head: 182, arm: { ua: 90, fa: 180 }, leg: { ankle: [259, 246], bend: 1 }, ft: 75 };
  const B = { hip: [170, 236], torso: 181, head: 180, arm: { ua: 90, fa: 180 }, leg: { ankle: [259, 246], bend: 1 }, ft: 75 };
  ARTS.plank = {
    label: 'Prancha', view: 'side', face: -1, keys: [A, B], track: [], isometric: true,
    muscles: { primary: ['abdomen'], secondary: ['ombros', 'gluteos'] },
    cues: { ini: 'Antebraços no chão, cotovelos sob os ombros.', mov: 'Contraia abdômen e glúteos, corpo em linha reta.', fim: 'Mantenha o alinhamento e respire.', ret: 'Não deixe o quadril cair nem subir.' },
    machine() { return { back: rrect([190, 267], 230, 6, 0, 3, C.mat), front: '' }; },
  };
}

// ================================================================= VISTA FRONTAL

// ---------------------------------------------------------------- 17/18. ABDUTORA e ADUTORA
{
  const hip = [200, 176];
  const arms = { l: { wrist: [170, 176], bend: 1 }, r: { wrist: [230, 176], bend: -1 } };
  const closed = fpose({ hip, legK: 0.9, arms, legs: fLegsFK([97, 85]) });
  const open = fpose({ hip, legK: 0.9, arms, legs: fLegsFK([152, 99]) });
  const machine = (padSide) => (j, t) => {
    const mk = (kn, s) => rrect(add(kn, [s * padSide, 0]), 13, 40, s * -10, 6, C.frame) + rrect(add(kn, [s * padSide, 0]), 7, 32, s * -10, 3, C.pad);
    return {
      back: seatedFrameFront(j.hip) + seatedBaseFront(j.hip),
      front: mk(j.kneeL, -1) + mk(j.kneeR, 1) + bar(add(j.wristL, [0, -6]), add(j.wristL, [0, 6]), 6, C.black) + bar(add(j.wristR, [0, -6]), add(j.wristR, [0, 6]), 6, C.black),
    };
  };
  ARTS.hip_abduction = {
    label: 'Cadeira abdutora', view: 'front', keys: [closed, open], track: ['kneeL', 'kneeR'],
    muscles: { primary: ['abdutores'], secondary: ['gluteos'] },
    cues: { ini: 'Costas apoiadas, apoios na parte externa dos joelhos.', mov: 'Abra as pernas empurrando os apoios para fora.', fim: 'Segure 1 segundo com as pernas abertas.', ret: 'Feche devagar, sem deixar o peso bater.' },
    machine: machine(13),
  };
  ARTS.hip_adduction = {
    label: 'Cadeira adutora', view: 'front', keys: [open, closed], track: ['kneeL', 'kneeR'],
    muscles: { primary: ['adutores'], secondary: [] },
    cues: { ini: 'Costas apoiadas, apoios na parte interna dos joelhos.', mov: 'Feche as pernas levando os apoios ao centro.', fim: 'Segure 1 segundo com as pernas fechadas.', ret: 'Abra devagar, controlando o peso.' },
    machine: machine(-13),
  };
}

// ---------------------------------------------------------------- 19. ELEVAÇÃO LATERAL
{
  const legs = { l: { ankle: [186, 260], bend: 1 }, r: { ankle: [214, 260], bend: -1 } };
  const A = fpose({ hip: [200, 172], arms: fArmsFK([98, 94]), legs });
  const B = fpose({ hip: [200, 172], arms: fArmsFK([184, 168]), legs });
  ARTS.lateral_raise = {
    label: 'Elevação lateral', view: 'front', keys: [A, B], track: ['wristL', 'wristR'],
    muscles: { primary: ['ombros'], secondary: [] },
    cues: { ini: 'Em pé, halteres ao lado do corpo, cotovelos levemente flexionados.', mov: 'Eleve os braços para os lados.', fim: 'Altura dos ombros; sem encolher.', ret: 'Desça devagar.' },
    machine() { return { back: rrect([200, 267], 150, 6, 0, 3, C.mat), front: '' }; },
    overlay(j) { return dbHead(add(j.wristL, [-1, 6]), 7.5) + dbHead(add(j.wristR, [1, 6]), 7.5); },
  };
}

// ---------------------------------------------------------------- 20. DESENVOLVIMENTO
{
  const hip = [200, 176];
  const legs = fLegsFK([97, 85]);
  const A = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [160, 98], bend: -1 }, r: { wrist: [240, 98], bend: 1 } } });
  const B = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [183, 70], bend: -1 }, r: { wrist: [217, 70], bend: 1 } } });
  ARTS.shoulder_press = {
    label: 'Desenvolvimento', view: 'front', keys: [A, B], track: ['wristL', 'wristR'],
    muscles: { primary: ['ombros'], secondary: ['triceps'] },
    cues: { ini: 'Costas apoiadas, halteres na altura dos ombros.', mov: 'Empurre os halteres para cima.', fim: 'Braços quase estendidos, sem arquear a lombar.', ret: 'Desça devagar até a altura das orelhas.' },
    machine(j) { return { back: seatedFrameFront(j.hip) + seatedBaseFront(j.hip), front: '' }; },
    overlay(j) { return dumbbellH(add(j.wristL, [0, -3]), 22, 6) + dumbbellH(add(j.wristR, [0, -3]), 22, 6); },
  };
}

// ---------------------------------------------------------------- 21. PUXADA ALTA
{
  const hip = [200, 176];
  const legs = fLegsFK([97, 85]);
  const A = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [160, 76], bend: -1 }, r: { wrist: [240, 76], bend: 1 } } });
  const B = fpose({ hip, legK: 0.9, legs, arms: { l: { wrist: [166, 134], bend: -1 }, r: { wrist: [234, 134], bend: 1 } } });
  ARTS.lat_pulldown = {
    label: 'Puxada alta', view: 'front', keys: [A, B], track: ['wristL', 'wristR'],
    muscles: { primary: ['costas'], secondary: ['biceps', 'ombros'] },
    cues: { ini: 'Braços estendidos, pegada um pouco mais larga que os ombros.', mov: 'Puxe a barra até o peito, cotovelos para baixo.', fim: 'Escápulas juntas; peito aberto.', ret: 'Suba devagar até os braços quase esticados.' },
    machine(j, t) {
      const lb = add(j.wristL, [-9, 0]), rb = add(j.wristR, [9, 0]);
      const arch = 'M116 266V84Q116 22 200 22Q284 22 284 84V266';
      return {
        back: `<path d="${arch}" fill="${C.panel}" stroke="${C.frame}" stroke-width="11" stroke-linejoin="round"/>` +
          stack(200, 40, 36, 74, (1 - t) * 10).replace(/<rect[^>]*fill="#2F5E9E"\/>/, '') +
          seatedFrameFront(j.hip) + seatedBaseFront(j.hip),
        front: rod([200, 42], lb, 1.8) + rod([200, 42], rb, 1.8) + pulley([200, 42], 7) + bar(lb, rb, 6, C.steelDark) +
          rrect(add(j.hip, [-24, 12]), 16, 40, -8, 6, C.pad) + rrect(add(j.hip, [24, 12]), 16, 40, 8, 6, C.pad),
      };
    },
  };
}

// Músculos e dicas padrão para exercícios personalizados que reutilizam uma animação
export const artKeys = () => Object.keys(ARTS);
export const artLabel = (k) => ARTS[k]?.label || k;

const VB = {
  leg_press: '105 62 285 214', leg_extension: '30 70 270 203', leg_curl: '30 70 270 203',
  squat: '70 84 260 195', goblet_squat: '70 84 260 195', lunge: '70 84 260 195', rdl: '70 84 260 195', calf_raise: '70 84 260 195',
  biceps_curl: '70 84 260 195', lateral_raise: '70 84 260 195',
  hip_thrust: '30 105 260 195', cable_kickback: '100 64 270 203', chest_press: '40 80 260 195',
  seated_row: '90 82 290 218', triceps_pushdown: '110 58 288 216', crunch: '90 130 240 180', plank: '70 125 250 188',
  hip_abduction: '70 80 260 195', hip_adduction: '70 80 260 195', shoulder_press: '50 46 300 225', lat_pulldown: '28 14 345 258',
};
for (const [k, v] of Object.entries(VB)) if (ARTS[k]) ARTS[k].vb = v;

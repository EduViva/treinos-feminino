// Figura feminina adulta, esportiva e neutra, desenhada em SVG a partir de um esqueleto
// cinemático (comprimentos de membros constantes => o movimento sempre parece correto).
// Duas vistas: lateral (side) e frontal (front). Mesma identidade visual em todo o app.
//
// Convenção de ângulos (tela): 0° = direita, 90° = baixo, -90° = cima, 180° = esquerda.
// Poses podem usar ângulos (FK: ua/fa, th/sh) ou alvos de mão/pé (IK: wrist/ankle).

const R = Math.PI / 180;
export const dir = (a) => [Math.cos(a * R), Math.sin(a * R)];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, k) => [a[0] * k, a[1] * k];
export const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const angleOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / R;
const f = (n) => Math.round(n * 10) / 10;
export const P = (p) => `${f(p[0])} ${f(p[1])}`;

export const PAL = {
  skin: '#F2C7A5', skinFar: '#DDAA84', hair: '#3A2622', hairFar: '#2B1B18',
  top: '#959BA5', topFar: '#7C828C', band: '#FF6B2C',
  legs: '#26282E', legsFar: '#1B1D22', shoe: '#F8F6F2', shoeFar: '#DCD8D1', sole: '#FF6B2C',
  hi1: '#FF6B2C', hi2: '#FFB23E',
};

export const LEN = { torso: 50, neck: 5, headR: 11, ua: 27, fa: 25, hand: 6, th: 46, sh: 44, ft: 19 };

// ---------- geometria ----------
export function capsule(p, q, r1, r2, fill, extra = '') {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const d = Math.hypot(dx, dy) || 0.001;
  const ang = Math.atan2(dy, dx);
  const phi = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
  const pt = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  const a1 = pt(p, r1, ang + phi), a2 = pt(q, r2, ang + phi), b2 = pt(q, r2, ang - phi), b1 = pt(p, r1, ang - phi);
  const largeQ = 2 * phi > Math.PI ? 1 : 0;
  const dd = `M${P(a1)}L${P(a2)}A${f(r2)} ${f(r2)} 0 ${largeQ} 0 ${P(b2)}L${P(b1)}A${f(r1)} ${f(r1)} 0 ${1 - largeQ} 0 ${P(a1)}Z`;
  return `<path d="${dd}" fill="${fill}" ${extra}/>`;
}
export const circle = (c, r, fill, extra = '') => `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(r)}" fill="${fill}" ${extra}/>`;

// Cinemática inversa de dois ossos. bend = ±1 escolhe o lado da articulação.
export function ik(O, T, l1, l2, bend) {
  const dx = T[0] - O[0], dy = T[1] - O[1];
  const d = Math.hypot(dx, dy);
  const dd = Math.min(l1 + l2 - 0.05, Math.max(Math.abs(l1 - l2) + 0.05, d));
  const a = Math.atan2(dy, dx);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd))));
  return {
    joint: [O[0] + l1 * Math.cos(a + bend * A), O[1] + l1 * Math.sin(a + bend * A)],
    end: [O[0] + dd * Math.cos(a), O[1] + dd * Math.sin(a)],
  };
}
function limb(O, spec, l1, l2, defBend) {
  const T = spec.wrist || spec.ankle;
  if (T) return ik(O, T, l1, l2, spec.bend ?? defBend);
  const a1 = spec.ua ?? spec.th, a2 = spec.fa ?? spec.sh;
  const j = add(O, mul(dir(a1), l1));
  return { joint: j, end: add(j, mul(dir(a2), l2)) };
}

export function lerpPose(a, b, t) {
  if (typeof a === 'number') return a + ((b ?? a) - a) * t;
  if (Array.isArray(a)) return a.map((x, i) => lerpPose(x, b ? b[i] : x, t));
  if (a && typeof a === 'object') {
    const o = {};
    for (const k of Object.keys(a)) o[k] = b && k in b ? lerpPose(a[k], b[k], t) : a[k];
    return o;
  }
  return a;
}
export function poseAt(keys, t) {
  if (keys.length === 1) return keys[0];
  const seg = keys.length - 1, s = Math.min(Math.max(t, 0), 1) * seg;
  const i = Math.min(Math.floor(s), seg - 1);
  return lerpPose(keys[i], keys[i + 1], s - i);
}

// ---------- destaque dos músculos ----------
function hl(level, shape) { // level: 1 principal, 2 secundário
  const c = level === 1 ? PAL.hi1 : PAL.hi2;
  return shape.replace('fill="HL"', `fill="${c}" opacity="${level === 1 ? 0.72 : 0.52}"`);
}
function levelOf(m, name) {
  if (!m) return 0;
  if (m.primary?.includes(name)) return 1;
  if (m.secondary?.includes(name)) return 2;
  return 0;
}
const seg = (p, q, a, b) => [lerp2(p, q, a), lerp2(p, q, b)];
function offset(p, v, k) { return [p[0] + v[0] * k, p[1] + v[1] * k]; }
export function sideNormal(v, face, wantFront) {
  const l = Math.hypot(v[0], v[1]) || 1;
  const n1 = [-v[1] / l, v[0] / l], n2 = [v[1] / l, -v[0] / l];
  const ref = [face * 0.7, -1];
  const d1 = n1[0] * ref[0] + n1[1] * ref[1], d2 = n2[0] * ref[0] + n2[1] * ref[1];
  const front = d1 > d2 ? n1 : n2;
  return wantFront ? front : [-front[0], -front[1]];
}

// ================= VISTA LATERAL =================
// pose: { hip:[x,y], torso:°, head:°, arm:{ua,fa}|{wrist,bend}, leg:{th,sh}|{ankle,bend}, ft:°,
//         farArm?, farLeg?, farFt? }
export function solveSide(p, face = 1) {
  const hip = p.hip;
  const shoulder = add(hip, mul(dir(p.torso), LEN.torso));
  const headDir = p.head ?? p.torso;
  const neck = add(shoulder, mul(dir(headDir), LEN.neck));
  const headC = add(shoulder, mul(dir(headDir), LEN.neck + LEN.headR));
  const armBend = -face; // cotovelo para trás por padrão
  const legBend = -face; // joelho para frente
  const arm = limb(shoulder, p.arm, LEN.ua, LEN.fa, p.arm.bend ?? armBend);
  const leg = limb(hip, p.leg, LEN.th, LEN.sh, p.leg.bend ?? legBend);
  const farOff = [-face * 5, -2];
  let farArm, farLeg, farFt;
  if (p.farArm) farArm = limb(shoulder, p.farArm, LEN.ua, LEN.fa, p.farArm.bend ?? armBend);
  else farArm = { joint: add(arm.joint, farOff), end: add(arm.end, farOff) };
  if (p.farLeg) { farLeg = limb(hip, p.farLeg, LEN.th, LEN.sh, p.farLeg.bend ?? legBend); farFt = p.farFt ?? p.ft; } else {
    farLeg = { joint: add(leg.joint, farOff), end: add(leg.end, farOff) }; farFt = p.ft;
  }
  const toe = add(leg.end, mul(dir(p.ft), LEN.ft));
  return {
    face, hip, shoulder, neck, headC, headDir, torsoAng: p.torso, tail: p.tail,
    elbow: arm.joint, wrist: arm.end, knee: leg.joint, ankle: leg.end, toe, ft: p.ft,
    farElbow: farArm.joint, farWrist: farArm.end, farKnee: farLeg.joint, farAnkle: farLeg.end, farFt,
  };
}

function shoeSvg(ankle, ft, face, far) {
  const body = far ? PAL.shoeFar : PAL.shoe;
  return `<g transform="translate(${P(ankle)}) rotate(${f(ft)}) scale(1 ${face})">` +
    `<path d="M-8 -3L-8 8L17 8Q22 8 22 4Q22 1 17 0L8 -2Q6 -8 1 -8L-4 -8Q-8 -8 -8 -3Z" fill="${body}"/>` +
    `<path d="M-8 6.2L21.5 6.2" stroke="${PAL.sole}" stroke-width="3.2" stroke-linecap="round" fill="none"/></g>`;
}

function headSvg(j, far = false) {
  const { headC, headDir, face } = j;
  const up = dir(headDir);
  const fwd = face === 1 ? [-up[1], up[0]] : [up[1], -up[0]];
  const L = (a, b) => [headC[0] + fwd[0] * a + up[0] * b, headC[1] + fwd[1] * a + up[1] * b];
  const r = PAL.headR || LEN.headR;
  const tie = L(-9.5, 3.5);
  // rabo de cavalo: cai por gravidade (mundo), não pela cabeça
  let t1 = [tie[0] - face * 7, tie[1] + 1], t2 = [tie[0] - face * 9, tie[1] + 12], t3 = [tie[0] - face * 8, tie[1] + 22];
  if (j.tail != null) { // deitada: o cabelo repousa na direção indicada
    const droop = (Math.cos(j.tail * R) < 0 ? -1 : 1) * 25;
    t1 = add(tie, mul(dir(j.tail), 8)); t2 = add(t1, mul(dir(j.tail + droop), 9)); t3 = add(t2, mul(dir(j.tail + droop * 1.8), 9));
  }
  return [
    capsule(tie, t1, 3.6, 4.6, PAL.hair), capsule(t1, t2, 4.6, 3.8, PAL.hair), capsule(t2, t3, 3.8, 1.6, PAL.hair),
    circle(L(-2.6, 1.6), r + 0.4, PAL.hair),
    circle(L(1, -0.6), r - 1.2, PAL.skin),
    circle(L(10, -1.8), 1.9, PAL.skin),            // nariz
    circle(L(5.6, 1.4), 1.05, '#3A2622'),           // olho
    `<path d="M${P(L(-9, 2))}Q${P(L(-2, 13))} ${P(L(9, 6))}Q${P(L(3, 6))} ${P(L(-3, 1))}Z" fill="${PAL.hair}"/>`, // franja/topo
    circle(tie, 2.4, PAL.band),
  ].join('');
}

export function renderSide(p, o = {}) {
  const face = o.face ?? 1;
  const j = solveSide(p, face);
  const m = o.muscles;
  const out = { far: '', body: '', near: '', hl: '' };

  // membros do lado de trás
  out.far += capsule(j.shoulder, j.farElbow, 5, 4.4, PAL.skinFar) + capsule(j.farElbow, j.farWrist, 4.4, 3.6, PAL.skinFar) +
    circle(add(j.farWrist, mul(dir(angleOf(j.farElbow, j.farWrist)), 4)), 4, PAL.skinFar);
  out.far += capsule(j.hip, j.farKnee, 11, 8, PAL.legsFar) + capsule(j.farKnee, j.farAnkle, 8, 5.4, PAL.legsFar) +
    shoeSvg(j.farAnkle, j.farFt, face, true);

  // tronco
  const base = add(j.hip, mul(dir(p.torso), 5));
  const band = lerp2(j.hip, j.shoulder, 0.2);
  const bn = sideNormal(sub(j.shoulder, j.hip), face, true);
  out.body += circle(j.hip, 13, PAL.legs);
  out.body += capsule(base, j.shoulder, 12.2, 10.4, PAL.top);
  out.body += `<path d="M${P(offset(band, bn, 12.4))}L${P(offset(band, bn, -12.4))}" stroke="${PAL.band}" stroke-width="4" fill="none"/>`;
  out.body += capsule(j.shoulder, j.neck, 4.2, 3.8, PAL.skin);
  out.body += headSvg(j);

  // membros do lado da frente
  out.near += capsule(j.hip, j.knee, 11.6, 8.2, PAL.legs) + capsule(j.knee, j.ankle, 8.2, 5.6, PAL.legs) + shoeSvg(j.ankle, j.ft, face, false);
  out.near += circle(j.shoulder, 6.4, PAL.top);
  out.near += capsule(j.shoulder, j.elbow, 5.2, 4.5, PAL.skin) + capsule(j.elbow, j.wrist, 4.5, 3.7, PAL.skin) +
    circle(add(j.wrist, mul(dir(angleOf(j.elbow, j.wrist)), 4)), 4.2, PAL.skin);

  // destaque dos músculos (coral)
  if (m) {
    const addHL = (lv, shape) => { if (lv) out.hl += hl(lv, shape); };
    const th = sub(j.knee, j.hip), sh = sub(j.ankle, j.knee), ua = sub(j.elbow, j.shoulder), fa = sub(j.wrist, j.elbow), tr = sub(j.shoulder, j.hip);
    const thF = sideNormal(th, face, true), shF = sideNormal(sh, face, true), uaF = sideNormal(ua, face, true), trF = sideNormal(tr, face, true);
    for (const name of ['quadriceps', 'posteriores', 'adutores', 'abdutores']) {
      const lv = levelOf(m, name); if (!lv) continue;
      const k = name === 'quadriceps' ? 2.4 : name === 'posteriores' ? -2.4 : 0;
      const [a, b] = seg(j.hip, j.knee, 0.18, 0.92);
      addHL(lv, capsule(offset(a, thF, k), offset(b, thF, k), 6, 4.6, 'HL'));
    }
    const lvG = levelOf(m, 'gluteos');
    if (lvG) {
      const back = [-thF[0], -thF[1]];
      addHL(lvG, circle(offset(j.hip, back, 3.5), 11, 'HL'));
      const [a, b] = seg(j.hip, j.knee, 0.1, 0.45);
      addHL(lvG, capsule(offset(a, back, 2), offset(b, back, 2), 8, 6.5, 'HL'));
    }
    const lvC = levelOf(m, 'panturrilhas');
    if (lvC) { const [a, b] = seg(j.knee, j.ankle, 0.08, 0.7); const back = [-shF[0], -shF[1]]; addHL(lvC, capsule(offset(a, back, 2.4), offset(b, back, 1.6), 6, 4.2, 'HL')); }
    const lvB = levelOf(m, 'biceps'); if (lvB) { const [a, b] = seg(j.shoulder, j.elbow, 0.12, 0.92); addHL(lvB, capsule(offset(a, uaF, 1.6), offset(b, uaF, 1.6), 3.8, 3.4, 'HL')); }
    const lvT = levelOf(m, 'triceps'); if (lvT) { const [a, b] = seg(j.shoulder, j.elbow, 0.12, 0.92); addHL(lvT, capsule(offset(a, uaF, -1.6), offset(b, uaF, -1.6), 3.8, 3.4, 'HL')); }
    const lvS = levelOf(m, 'ombros'); if (lvS) { addHL(lvS, circle(j.shoulder, 8, 'HL')); }
    const lvP = levelOf(m, 'peito'); if (lvP) { const [a, b] = seg(j.hip, j.shoulder, 0.55, 0.98); addHL(lvP, capsule(offset(a, trF, 3), offset(b, trF, 3), 7, 6, 'HL')); }
    const lvD = levelOf(m, 'costas'); if (lvD) { const [a, b] = seg(j.hip, j.shoulder, 0.3, 0.95); addHL(lvD, capsule(offset(a, trF, -4), offset(b, trF, -4), 7, 6, 'HL')); }
    const lvA = levelOf(m, 'abdomen'); if (lvA) { const [a, b] = seg(j.hip, j.shoulder, 0.08, 0.58); addHL(lvA, capsule(offset(a, trF, 3.5), offset(b, trF, 3.5), 7.5, 7, 'HL')); }
    const lvL = levelOf(m, 'lombar'); if (lvL) { const [a, b] = seg(j.hip, j.shoulder, 0.0, 0.4); addHL(lvL, capsule(offset(a, trF, -4), offset(b, trF, -4), 7, 6.5, 'HL')); }
  }
  return { j, ...out, svg: out.far + out.body + out.near + out.hl };
}

// ================= VISTA FRONTAL =================
// pose: { hip:[x,y], tilt:°, head?:[dx,dy], arms:{l:{...},r:{...}}, legs:{l:{...},r:{...}}, legK?:1, hipW?:11 }
// "l" = lado esquerdo da TELA.
export function solveFront(p) {
  const tilt = p.tilt || 0;
  const hip = p.hip;
  const up = dir(-90 + tilt), right = dir(tilt);
  const neck = add(hip, mul(up, LEN.torso));
  const SW = 20, HW = p.hipW ?? 11.5;
  const sl = add(neck, mul(right, -SW)), sr = add(neck, mul(right, SW));
  const hl_ = add(hip, mul(right, -HW)), hr_ = add(hip, mul(right, HW));
  const headC = add(add(neck, mul(up, LEN.neck + LEN.headR)), p.head || [0, 0]);
  const K = p.legK ?? 1;
  const L = (spec, O, l1, l2, bend) => {
    const T = spec.wrist || spec.ankle;
    if (T) return ik(O, T, l1, l2, spec.bend ?? bend);
    const a1 = spec.ua ?? spec.th, a2 = spec.fa ?? spec.sh;
    const jn = add(O, mul(dir(a1), l1));
    return { joint: jn, end: add(jn, mul(dir(a2), l2)) };
  };
  const al = L(p.arms.l, sl, LEN.ua, LEN.fa, 1), ar = L(p.arms.r, sr, LEN.ua, LEN.fa, -1);
  const ll = L(p.legs.l, hl_, LEN.th * K, LEN.sh, 1), lr = L(p.legs.r, hr_, LEN.th * K, LEN.sh, -1);
  return {
    hip, neck, headC, tilt, up, right, sl, sr, hl: hl_, hr: hr_,
    elbowL: al.joint, wristL: al.end, elbowR: ar.joint, wristR: ar.end,
    kneeL: ll.joint, ankleL: ll.end, kneeR: lr.joint, ankleR: lr.end,
  };
}

function shoeFront(a, side) {
  const s = side === 'l' ? -1 : 1;
  return `<g transform="translate(${P(a)}) rotate(${s * 8})">` +
    `<path d="M-8 -3Q-8 -8 -3 -8L3 -8Q8 -8 8 -3L9 7L-9 7Z" fill="${PAL.shoe}"/>` +
    `<path d="M-9 6L9 6" stroke="${PAL.sole}" stroke-width="3.4" stroke-linecap="round"/></g>`;
}

export function renderFront(p, o = {}) {
  const j = solveFront(p);
  const m = o.muscles;
  const out = { far: '', body: '', near: '', hl: '' };
  const { neck, headC } = j;
  // rabo de cavalo atrás (sobre o ombro direito da tela)
  const tieP = add(headC, [5, -8]);
  out.far += capsule(tieP, add(headC, [17, 4]), 3.6, 4.6, PAL.hair) + capsule(add(headC, [17, 4]), add(neck, [24, 14]), 4.6, 3.2, PAL.hair);
  // pernas
  out.far += capsule(j.hl, j.kneeL, 11, 8, PAL.legs) + capsule(j.kneeL, j.ankleL, 8, 5.6, PAL.legs) + shoeFront(add(j.ankleL, [0, 2]), 'l');
  out.far += capsule(j.hr, j.kneeR, 11, 8, PAL.legs) + capsule(j.kneeR, j.ankleR, 8, 5.6, PAL.legs) + shoeFront(add(j.ankleR, [0, 2]), 'r');
  // tronco (polígono suavizado)
  const wL = add(lerp2(j.hip, neck, 0.55), mul(j.right, -14.5)), wR = add(lerp2(j.hip, neck, 0.55), mul(j.right, 14.5));
  const bL = add(j.hip, mul(j.right, -14)), bR = add(j.hip, mul(j.right, 14));
  out.body += `<path d="M${P(j.hl)}L${P(j.hr)}L${P(add(j.hip, mul(j.up, 6)))}Z" fill="${PAL.legs}"/>`;
  out.body += `<path d="M${P(j.sl)}L${P(j.sr)}L${P(wR)}L${P(bR)}L${P(bL)}L${P(wL)}Z" fill="${PAL.top}" stroke="${PAL.top}" stroke-width="9" stroke-linejoin="round"/>`;
  out.body += `<path d="M${P(add(j.hip, mul(j.right, -17.5)))}L${P(add(j.hip, mul(j.right, 17.5)))}" stroke="${PAL.band}" stroke-width="5" stroke-linecap="round" transform="translate(0 -9)"/>`;
  out.body += capsule(j.neck, add(neck, mul(j.up, 8)), 4.4, 4, PAL.skin);
  // cabeça
  const r = LEN.headR;
  out.body += circle(add(headC, [0, 0.5]), r, PAL.skin);
  out.body += `<path d="M${P(add(headC, [-r - 0.6, 1.5]))}A${r + 0.6} ${r + 0.6} 0 0 1 ${P(add(headC, [r + 0.6, 1.5]))}Q${P(add(headC, [r * 0.2, -r * 0.2]))} ${P(add(headC, [-r - 0.6, 1.5]))}Z" fill="${PAL.hair}"/>`;
  out.body += circle(add(headC, [7, -9]), 3, PAL.band);
  // braços
  out.near += circle(j.sl, 6.6, PAL.top) + circle(j.sr, 6.6, PAL.top);
  const arm = (s, e, w) => capsule(s, e, 5.2, 4.5, PAL.skin) + capsule(e, w, 4.5, 3.7, PAL.skin) + circle(add(w, mul(dir(angleOf(e, w)), 4)), 4.2, PAL.skin);
  out.near += arm(j.sl, j.elbowL, j.wristL) + arm(j.sr, j.elbowR, j.wristR);

  if (m) {
    const add2 = (lv, shape) => { if (lv) out.hl += hl(lv, shape); };
    for (const name of ['quadriceps', 'posteriores', 'adutores', 'abdutores']) {
      const lv = levelOf(m, name); if (!lv) continue;
      const inner = name === 'adutores', outer = name === 'abdutores';
      for (const side of ['l', 'r']) {
        const hp = side === 'l' ? j.hl : j.hr, kn = side === 'l' ? j.kneeL : j.kneeR;
        const s = side === 'l' ? -1 : 1;
        const k = inner ? -s * 3 : outer ? s * 3 : 0;
        const [a, b] = seg(hp, kn, 0.15, 0.95);
        add2(lv, capsule(add(a, [k, 0]), add(b, [k, 0]), 6.2, 5, 'HL'));
        if (outer) add2(lv, circle(add(hp, [s * 6, -2]), 8.5, 'HL'));
      }
    }
    const lvG = levelOf(m, 'gluteos'); if (lvG) { add2(lvG, circle(add(j.hl, [-3, 0]), 8, 'HL')); add2(lvG, circle(add(j.hr, [3, 0]), 8, 'HL')); }
    const lvS = levelOf(m, 'ombros'); if (lvS) { add2(lvS, circle(j.sl, 9, 'HL')); add2(lvS, circle(j.sr, 9, 'HL')); }
    const lvB = levelOf(m, 'biceps'); if (lvB) { for (const [s, e] of [[j.sl, j.elbowL], [j.sr, j.elbowR]]) { const [a, b] = seg(s, e, 0.15, 0.9); add2(lvB, capsule(a, b, 4, 3.6, 'HL')); } }
    const lvT = levelOf(m, 'triceps'); if (lvT) { for (const [s, e] of [[j.sl, j.elbowL], [j.sr, j.elbowR]]) { const [a, b] = seg(s, e, 0.15, 0.9); add2(lvT, capsule(a, b, 4, 3.6, 'HL')); } }
    const lvD = levelOf(m, 'costas'); if (lvD) { const [a, b] = seg(j.hip, neck, 0.35, 0.95); add2(lvD, capsule(add(a, [-9, 0]), add(b, [-9, 0]), 6, 5.5, 'HL')); add2(lvD, capsule(add(a, [9, 0]), add(b, [9, 0]), 6, 5.5, 'HL')); }
    const lvP = levelOf(m, 'peito'); if (lvP) { const c = lerp2(j.hip, neck, 0.8); add2(lvP, circle(add(c, [-7, 0]), 7, 'HL')); add2(lvP, circle(add(c, [7, 0]), 7, 'HL')); }
    const lvA = levelOf(m, 'abdomen'); if (lvA) { const [a, b] = seg(j.hip, neck, 0.1, 0.55); add2(lvA, capsule(a, b, 8, 8, 'HL')); }
  }
  return { j, ...out, svg: out.far + out.body + out.near + out.hl };
}

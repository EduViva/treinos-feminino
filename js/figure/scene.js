// Renderização de cenas e player de animação instrucional.
import { poseAt, renderSide, renderFront, solveSide, solveFront } from './rig.js';
import { floor, C } from './kit.js';
import { ARTS } from './arts.js';

const f = (n) => Math.round(n * 10) / 10;
export const hasArt = (k) => !!ARTS[k];

function joints(art, pose) {
  return art.view === 'side' ? solveSide(pose, art.face) : solveFront(pose);
}
function jointPoint(j, name) {
  if (name === 'head') return j.headC;
  return j[name];
}

// Trajetória (pontilhada) do(s) ponto(s) que mais se movem, com seta no sentido do movimento.
const trajCache = new Map();
function trajectory(key, art) {
  if (trajCache.has(key)) return trajCache.get(key);
  let svg = '';
  for (const name of art.track || []) {
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(jointPoint(joints(art, poseAt(art.keys, i / 24)), name));
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (len < 14) continue;
    const d = 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L');
    const a = pts[pts.length - 1];
    // direção de chegada: usa um ponto um pouco antes do fim
    let b = pts[pts.length - 2];
    for (let k = pts.length - 2; k >= 0; k--) { b = pts[k]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 7) break; }
    const ang = Math.atan2(a[1] - b[1], a[0] - b[0]) * 180 / Math.PI;
    svg += `<path d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>`;
    svg += `<path d="${d}" fill="none" stroke="#5B3FD0" stroke-width="2.4" stroke-dasharray="1 5.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg += `<g transform="translate(${f(a[0])} ${f(a[1])}) rotate(${f(ang)})"><path d="M-9 -7L5 0L-9 7Z" fill="#5B3FD0" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></g>`;
    svg += `<circle cx="${f(pts[0][0])}" cy="${f(pts[0][1])}" r="4.2" fill="#fff" stroke="#5B3FD0" stroke-width="2.2"/>`;
  }
  trajCache.set(key, svg);
  return svg;
}

export function sceneInner(key, t, { arrows = true, pulse = 1 } = {}) {
  const art = ARTS[key];
  if (!art) return '';
  const pose = poseAt(art.keys, t);
  const fig = art.view === 'side' ? renderSide(pose, { face: art.face, muscles: art.muscles }) : renderFront(pose, { muscles: art.muscles });
  const m = art.machine(fig.j, t, art.face) || {};
  const ov = art.overlay ? art.overlay(fig.j) : '';
  return floor() + (m.back || '') + fig.far + fig.body + fig.near +
    `<g opacity="${f(0.55 + 0.45 * pulse)}">${fig.hl}</g>` + (m.front || '') + ov + (arrows ? trajectory(key, art) : '');
}

export function sceneSvg(key, t, o = {}) {
  const view = o.view || ARTS[key]?.vb || '0 0 400 300';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" preserveAspectRatio="${o.slice ? 'xMidYMid slice' : 'xMidYMid meet'}" role="img" aria-label="${(ARTS[key]?.label || key)}">${sceneInner(key, t, o)}</svg>`;
}

// Miniatura estática (para listas)
export function thumbSvg(key, t = 0.6) {
  return sceneSvg(key, t, { arrows: false, slice: true });
}

// ---- Player ----
const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);
export const PHASES = ['ini', 'mov', 'fim', 'ret'];
export const PHASE_LABEL = { ini: 'Posição inicial', mov: 'Movimento', fim: 'Posição final', ret: 'Retorno' };

export function mountPlayer(host, key, opts = {}) {
  const art = ARTS[key];
  host.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'fig-stage';
  host.appendChild(wrap);
  let speed = opts.speed || 1, playing = opts.autoplay !== false, raf = 0, last = 0, clock = 0, phase = -1, dead = false;
  const D = (art.dur || 1.9), HOLD = 0.75;
  const cycle = 2 * (D + HOLD);
  const svgHost = document.createElement('div');
  svgHost.className = 'fig-svg';
  wrap.appendChild(svgHost);

  function at(timeSec) {
    const c = ((timeSec % cycle) + cycle) % cycle;
    if (c < HOLD) return { t: 0, phase: 0 };
    if (c < HOLD + D) return { t: ease((c - HOLD) / D), phase: 1 };
    if (c < 2 * HOLD + D) return { t: 1, phase: 2 };
    return { t: 1 - ease((c - 2 * HOLD - D) / D), phase: 3 };
  }
  function draw() {
    const { t, phase: ph } = at(clock);
    const pulse = 0.5 + 0.5 * Math.sin(clock * 3.2);
    svgHost.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.vb || '0 0 400 300'}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Animação: ${art.label}">${sceneInner(key, art.isometric ? 0.5 + 0.5 * t * 0 : t, { pulse })}</svg>`;
    if (ph !== phase) { phase = ph; opts.onPhase && opts.onPhase(PHASES[ph], ph); }
  }
  function loop(ts) {
    if (dead) return;
    if (!host.isConnected) { dead = true; return; }
    if (!last) last = ts;
    const dt = Math.min(0.1, (ts - last) / 1000);
    last = ts;
    if (playing) { clock += dt * speed; if (ts - (loop.lastDraw || 0) > 30) { loop.lastDraw = ts; draw(); } }
    raf = requestAnimationFrame(loop);
  }
  draw();
  raf = requestAnimationFrame(loop);
  return {
    play() { playing = true; },
    pause() { playing = false; },
    toggle() { playing = !playing; return playing; },
    isPlaying: () => playing,
    setSpeed(s) { speed = s; },
    seek(timeSec) { clock = timeSec; draw(); },
    destroy() { dead = true; cancelAnimationFrame(raf); },
  };
}

// Sequência de quadros (alternativa a animação): início → início do movimento → meio → fim
export function framesHtml(key) {
  const art = ARTS[key];
  const steps = art.isometric ? [[0, 'Posição'], [1, 'Alinhado']] : [[0, 'Início'], [0.28, 'Começo do movimento'], [0.62, 'Meio'], [1, 'Final']];
  return `<div class="fig-frames">${steps.map(([t, label], i) =>
    `<figure><div class="fig-svg">${sceneSvg(key, t, { arrows: false })}</div><figcaption><b>${i + 1}</b> ${label}</figcaption></figure>`).join('')}</div>`;
}

export { ARTS, C };

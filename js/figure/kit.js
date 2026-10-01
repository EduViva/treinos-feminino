// Peças reutilizáveis para desenhar aparelhos (azul, como na referência) em SVG.
import { P, dir, add, sub, mul, circle } from './rig.js';

export const C = {
  frame: '#2F5E9E', frameDark: '#234A80', pad: '#8FB2D8', padDark: '#6C93C3', panel: '#E9EEF5',
  steel: '#C4CBD6', steelDark: '#98A1AF', black: '#3A3E4B', bench: '#5C6B88', mat: '#B8E3DC',
  cable: '#4A4F5E', floor: '#E7E2F3', bg1: '#F7F5FC', bg2: '#ECE7F8', accent: '#FF4D5E',
};
const f = (n) => Math.round(n * 10) / 10;

export function rrect(c, w, h, rot, r, fill, extra = '') {
  return `<rect x="${f(-w / 2)}" y="${f(-h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}" transform="translate(${P(c)}) rotate(${f(rot)})" ${extra}/>`;
}
export function bar(p, q, w, color = C.frame) {
  return `<path d="M${P(p)}L${P(q)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
}
export function rod(p, q, w, color = C.cable) {
  return `<path d="M${P(p)}L${P(q)}" stroke="${color}" stroke-width="${w}" stroke-linecap="butt" fill="none"/>`;
}
export const pulley = (c, r = 6) => circle(c, r, C.steelDark) + circle(c, r * 0.45, C.black);
export const plate = (c, r) => circle(c, r, C.black) + circle(c, r * 0.72, '#555B6C') + circle(c, r * 0.22, C.steel);
export const dbHead = (c, r = 7) => circle(c, r, '#454B5E', 'stroke="#fff" stroke-width="1.6"') + circle(c, r * 0.5, '#9AA3B6');

// Peso (halter) visto "de topo": barra horizontal com duas cabeças.
export function dumbbellH(c, len = 26, r = 6.5) {
  const a = [c[0] - len / 2, c[1]], b = [c[0] + len / 2, c[1]];
  return bar(a, b, 4, C.steelDark) + dbHead(a, r) + dbHead(b, r);
}

// Coluna de pesos (pilha) com carcaça azul, como na referência. lift = deslocamento (px) da parte móvel.
export function stack(cx, top, w, h, lift = 0) {
  const x = cx - w / 2, innerW = w - 18, innerX = cx - innerW / 2;
  const rows = Math.floor((h - 38) / 7);
  let s = `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h)}" rx="14" fill="${C.frame}"/>`;
  s += `<rect x="${f(x + 4)}" y="${f(top - 3)}" width="${f(w - 8)}" height="14" rx="7" fill="${C.pad}"/>`;
  s += `<rect x="${f(innerX)}" y="${f(top + 22)}" width="${f(innerW)}" height="${f(h - 34)}" rx="4" fill="${C.panel}"/>`;
  for (let i = 0; i < rows; i++) {
    const y = top + 26 + i * 7;
    const moved = i < 4 ? lift : 0;
    s += `<rect x="${f(innerX + 3)}" y="${f(y - moved)}" width="${f(innerW - 6)}" height="5" rx="1.5" fill="${i < 4 ? C.steelDark : C.steel}"/>`;
  }
  s += `<rect x="${f(cx - 2)}" y="${f(top + 22 - lift)}" width="4" height="${f(h - 34)}" fill="${C.steelDark}" opacity="0.55"/>`;
  return s;
}

export function floor() {
  return `<rect x="-800" y="-800" width="2000" height="2200" fill="${C.bg1}"/><ellipse cx="200" cy="306" rx="300" ry="52" fill="${C.bg2}"/>` +
    `<rect x="-800" y="268" width="2000" height="600" fill="${C.floor}"/><rect x="-800" y="268" width="2000" height="2" fill="#D8D1EA"/>`;
}

export function pad(c, w, h, rot, r = 7) {
  return rrect(c, w, h, rot, r, C.pad) + rrect(c, w - 4, h - 4, rot, Math.max(r - 2, 2), C.padDark, 'opacity="0.35"');
}

// Banco/assento com pé central
export function seat(c, w = 64, h = 14, rot = 0) { return pad(c, w, h, rot, 6); }

export const dirv = dir;
export { add, sub, mul };

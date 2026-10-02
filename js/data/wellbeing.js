// Tela "Bem-estar": perguntas, respostas e os ícones que representam cada resposta.
// Ícones 24×24, traço 2px (mesmo estilo de js/ui.js). Sem DOM: pode ser importado nos testes.
//
// Convenção: cada pergunta tem a sua cor pastel (data-hue → css/app.css) e a RESPOSTA é dada pela FORMA do
// ícone (rosto, bateria, olho, medidor, anel, gotas), nunca pela cor — a cor só identifica a pergunta.

const n2 = (n) => Math.round(n * 100) / 100;
const FILL = 'fill="currentColor" stroke="none"';

// ---- humor: rostos (mesmo contorno; mudam olhos e boca) ----
const FACE = '<circle cx="12" cy="12" r="9.2"/>';
const EYES = (y = 10) => `<path d="M9 ${y}h.01M15 ${y}h.01"/>`;
const MOOD = [
  // 1 muito baixo: sobrancelhas preocupadas + boca bem curvada para baixo
  `${FACE}${EYES(10.8)}<path d="M7.7 8.6l2.8-1.3M16.3 8.6l-2.8-1.3"/><path d="M8.7 17.4c.9-2 2.1-3 3.3-3s2.4 1 3.3 3"/>`,
  // 2 baixo: boca levemente para baixo
  `${FACE}${EYES()}<path d="M9.2 16.3c.8-1 1.8-1.5 2.8-1.5s2 .5 2.8 1.5"/>`,
  // 3 neutro
  `${FACE}${EYES()}<path d="M9 15.4h6"/>`,
  // 4 bom: sorriso
  `${FACE}${EYES()}<path d="M8.8 14.1c.8 1.7 1.9 2.5 3.2 2.5s2.4-.8 3.2-2.5"/>`,
  // 5 ótimo: olhos felizes + boca aberta
  `${FACE}<path d="M7.6 10.7c.7-1.6 2.1-1.6 2.8 0M13.6 10.7c.7-1.6 2.1-1.6 2.8 0"/><path d="M7.9 13.7h8.2a4.1 4.1 0 0 1-8.2 0z" fill="currentColor" stroke-width="1.6"/>`,
];

// ---- energia: bateria que enche (20% … 100%) ----
const battery = (n) => `<rect x="2.5" y="6.5" width="17" height="11" rx="3"/><path d="M22 10.4v3.2"/>`
  + `<rect x="5" y="9" width="${n2((12 * n) / 5)}" height="6" rx="1" ${FILL}/>`;

// ---- cansaço geral: olho que vai fechando até dormir (z) ----
// lente do olho: `up`/`down` = quanto sobe/desce o contorno a partir da linha central (y=12)
const lens = (up, down) => `<path d="M2.5 12C6.5 ${n2(12 - up * 1.333)} 17.5 ${n2(12 - up * 1.333)} 21.5 12C17.5 ${n2(12 + down * 1.333)} 6.5 ${n2(12 + down * 1.333)} 2.5 12z"/>`;
const EYE = [
  // 1 nenhum: olho bem aberto
  `${lens(7.2, 7.2)}<circle cx="12" cy="12" r="3" ${FILL}/>`,
  // 2 leve: pálpebra já desceu um pouco
  `${lens(3.2, 4.8)}<circle cx="12" cy="12.4" r="2.1" ${FILL}/>`,
  // 3 moderado: pálpebra reta, meio fechado
  `<path d="M3 10.6h18c-2 3.8-5.4 5.8-9 5.8s-7-2-9-5.8z"/><path d="M9.8 10.6a2.2 2.2 0 0 0 4.4 0z" ${FILL}/>`,
  // 4 alto: quase fechado
  '<path d="M3 13.2h18c-2 2.4-5.4 3.6-9 3.6S5 15.6 3 13.2z"/>',
  // 5 muito alto: fechado, cílios e "z"
  '<path d="M3 11.2c2.2 3.6 5.4 5.4 9 5.4s6.8-1.8 9-5.4"/><path d="M6.2 14.6l-1.6 2M12 16.7v2.6M17.8 14.6l1.6 2"/><path d="M15.8 4.2h4l-4 4h4" stroke-width="1.8"/>',
];

// ---- fadiga muscular: medidor de 270° (ponteiro + arco preenchido) ----
const gauge = (level) => {
  const cx = 12, cy = 12.6, R = 8.6;
  const at = (f, rad) => { const th = ((225 - 270 * f) * Math.PI) / 180; return `${n2(cx + rad * Math.cos(th))} ${n2(cy - rad * Math.sin(th))}`; };
  const f = (level * 2 - 1) / 10;                             // 0,1 · 0,3 · 0,5 · 0,7 · 0,9 do giro
  return `<path d="M${at(0, R)}A${R} ${R} 0 1 1 ${at(1, R)}" stroke-opacity=".32"/>`
    + `<path d="M${at(0, R)}A${R} ${R} 0 ${270 * f > 180 ? 1 : 0} 1 ${at(f, R)}"/>`
    + `<path d="M${cx} ${cy}L${at(f, 5.6)}"/><circle cx="${cx}" cy="${cy}" r="1.8" ${FILL}/>`;
};

// ---- recuperação: anel que enche (20% … 100%) com coração no centro ----
const RING_LEN = 2 * Math.PI * 8.5;
const ring = (level) => {
  const part = n2((RING_LEN * level) / 5);
  return `<circle cx="12" cy="12" r="8.5" stroke-opacity=".32"/>`
    + `<circle cx="12" cy="12" r="8.5" stroke-dasharray="${part} ${n2(RING_LEN)}" transform="rotate(-90 12 12)"/>`
    + `<path d="M12 15.5s-3.3-2.1-3.3-4.5a1.9 1.9 0 0 1 3.3-1.2 1.9 1.9 0 0 1 3.3 1.2c0 2.4-3.3 4.5-3.3 4.5z" ${FILL}/>`;
};

// ---- fluxo menstrual: 1, 2 ou 3 gotas ----
const dropPath = (cx, cy, s) => {
  const p = (x, y) => `${n2(cx + x * s)} ${n2(cy + y * s)}`;
  return `M${p(0, -5.2)}C${p(2.5, -2.5)} ${p(4, -.8)} ${p(4, 1.5)}A${n2(4 * s)} ${n2(4 * s)} 0 0 1 ${p(-4, 1.5)}C${p(-4, -.8)} ${p(-2.5, -2.5)} ${p(0, -5.2)}z`;
};
const dropG = (cx, cy, s) => `<path d="${dropPath(cx, cy, s)}" fill="currentColor" fill-opacity=".22" stroke-width="1.8"/>`;
const DROPS = [
  dropG(12, 12.4, 1.3),
  dropG(8, 14, .95) + dropG(16.4, 10.2, .78),
  dropG(6.4, 15.6, .66) + dropG(17.6, 15.6, .66) + dropG(12, 9.2, .78),
];

// ---- ícones de apoio (cabeçalhos e linhas) ----
const EXTRA = {
  'wb-drop': dropG(12, 12.4, 1.3),
  'wb-moon': '<path d="M20 14.6A8.5 8.5 0 1 1 9.4 4a6.8 6.8 0 0 0 10.6 10.6z"/>',
  'wb-flag': '<path d="M5 21V4"/><path d="M5 4.6h12l-2.4 4 2.4 4H5"/>',
};

export const WB_ICONS = {
  ...EXTRA,
  ...Object.fromEntries(MOOD.map((m, i) => [`wb-mood-${i + 1}`, m])),
  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`wb-battery-${n}`, battery(n)])),
  ...Object.fromEntries(EYE.map((m, i) => [`wb-eye-${i + 1}`, m])),
  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`wb-gauge-${n}`, gauge(n)])),
  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`wb-ring-${n}`, ring(n)])),
  ...Object.fromEntries(DROPS.map((m, i) => [`wb-drops-${i + 1}`, m])),
};

const L5 = (prefix, labels) => labels.map((label, i) => ({ v: i + 1, label, icon: `${prefix}-${i + 1}` }));

// `key` é o campo do registro diário (store.saveWellbeing); `hue` escolhe a cor pastel da pergunta.
export const WB_SCALES = [
  { key: 'mood', title: 'Humor', hue: 'sun', badge: 'wb-mood-4', options: L5('wb-mood', ['Muito baixo', 'Baixo', 'Neutro', 'Bom', 'Ótimo']) },
  { key: 'energy', title: 'Energia', hue: 'mint', badge: 'bolt', options: L5('wb-battery', ['Muito baixa', 'Baixa', 'Média', 'Alta', 'Muito alta']) },
  { key: 'tiredness', title: 'Cansaço geral', hue: 'lilac', badge: 'wb-moon', hint: 'Corpo todo, sono, disposição', options: L5('wb-eye', ['Nenhum', 'Leve', 'Moderado', 'Alto', 'Muito alto']) },
  { key: 'fatigue', title: 'Fadiga muscular', hue: 'peach', badge: 'dumbbell', hint: 'Músculos pesados ou doloridos', options: L5('wb-gauge', ['Nenhum', 'Leve', 'Moderado', 'Alto', 'Muito alto']) },
  { key: 'recovery', title: 'Recuperação', hue: 'sky', badge: 'wb-ring-3', options: L5('wb-ring', ['Péssima', 'Ruim', 'Ok', 'Boa', 'Ótima']) },
];

export const WB_PERIOD = {
  key: 'period', title: 'Menstruação', hue: 'rose', badge: 'wb-drop',
  flow: [{ v: 'leve', label: 'Leve', icon: 'wb-drops-1' }, { v: 'médio', label: 'Médio', icon: 'wb-drops-2' }, { v: 'intenso', label: 'Intenso', icon: 'wb-drops-3' }],
};
export const WB_NOTE = { key: 'note', title: 'Observações', hue: 'sand', badge: 'edit' };

// Ordem em que as perguntas aparecem (e portanto a ordem das cores).
export const WB_HUES = [WB_PERIOD, ...WB_SCALES, WB_NOTE].map((q) => q.hue);

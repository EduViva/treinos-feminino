// Componentes de interface reutilizáveis.
import { h, clear, parseNum, fmtNum } from './util.js';
import { app } from './app.js';

// ---------- Ícones (traço 2px, 24x24) ----------
const I = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  dumbbell: '<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20v-7M2 20h20"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5"/>',
  skip: '<path d="M5 5l9 7-9 7zM18 5v14"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3z"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 16V5M7 9l5-5 5 5M4 20h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  bell: '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4"/>',
  sparkle: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 15h18M8 4v16M16 4v16"/>',
  frames: '<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>',
  turtle: '<path d="M4 17c0-5 3.5-9 8-9s8 4 8 9zM3 17h18M7 20h2M15 20h2"/>',
  star: '<path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.7l1-5.8L3.5 9.8l5.9-.8z"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  cloud: '<path d="M7 18a4 4 0 010-8 5.5 5.5 0 0110.6 1.5A3.3 3.3 0 0117 18z"/>',
  cloudoff: '<path d="M3 3l18 18"/><path d="M7 18a4 4 0 01-.9-7.9M10.5 6.2a5.5 5.5 0 017.1 5.3A3.3 3.3 0 0117 18H9"/>',
  logout: '<path d="M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4M15 8l5 4-5 4M20 12H9"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 6a9.8 9.8 0 011.4-.1c6.4 0 10 6.1 10 6.1a17 17 0 01-3.2 3.9M6.3 7.4A16.5 16.5 0 002 12s3.6 6.1 10 6.1a9.7 9.7 0 003.4-.6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/>',
};
export function icon(name, size = 22) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`;
}
export const ico = (name, size) => h('span', { class: 'ico', html: icon(name, size) });
// Conjuntos de ícones extras (ex.: js/data/wellbeing.js) entram no mesmo `icon()`.
export const registerIcons = (set) => { Object.assign(I, set); };

// ---------- Botões ----------
export function btn(label, opts = {}) {
  const { kind = 'primary', size, ic, onClick, block, type = 'button', disabled, cls = '', aria } = opts;
  return h('button', {
    type, class: `btn ${kind} ${size || ''} ${block ? 'block' : ''} ${cls}`, onClick, disabled, 'aria-label': aria,
  }, ic ? h('span', { class: 'ico', html: icon(ic, size === 'lg' ? 24 : 20) }) : null, label ? h('span', null, label) : null);
}
export function iconBtn(name, label, onClick, cls = '') {
  return h('button', { type: 'button', class: `icon-btn ${cls}`, onClick, 'aria-label': label, title: label, html: icon(name) });
}

// ---------- Folha inferior (modal) ----------
let sheetCount = 0;
export function openSheet({ title, body, footer, onClose, className = '' } = {}) {
  const root = document.getElementById('sheet-root');
  const backdrop = h('div', { class: 'backdrop' });
  const content = h('div', { class: 'sheet-body' }, body);
  const sheet = h('div', { class: `sheet ${className} ${app.sessionActive ? 'dark' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Janela' },
    h('div', { class: 'sheet-grab' }),
    h('div', { class: 'sheet-head' }, h('h2', null, title || ''), iconBtn('x', 'Fechar', () => close())),
    content,
    footer ? h('div', { class: 'sheet-foot' }, footer) : null);
  backdrop.appendChild(sheet);
  root.appendChild(backdrop);
  sheetCount++;
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => backdrop.classList.add('open'));
  let closed = false;
  function close(result) {
    if (closed) return;
    closed = true;
    backdrop.classList.remove('open');
    setTimeout(() => { backdrop.remove(); }, 200);
    sheetCount = Math.max(0, sheetCount - 1);
    if (!sheetCount) document.body.classList.remove('noscroll');
    document.removeEventListener('keydown', onKey);
    onClose && onClose(result);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop) close(); });
  return { close, el: sheet, body: content };
}

export function confirmDialog({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, className = '' }) {
  return new Promise((resolve) => {
    let answered = false;
    const done = (v) => { answered = true; s.close(); resolve(v); };
    const s = openSheet({
      title, className: `compact ${className}`,
      body: h('p', { class: 'muted pre' }, message),
      footer: [btn(cancelText, { kind: 'secondary', onClick: () => done(false) }), btn(confirmText, { kind: danger ? 'danger' : 'primary', onClick: () => done(true) })],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

export function alertDialog(title, message) {
  const s = openSheet({ title, className: 'compact', body: h('p', { class: 'muted pre' }, message), footer: btn('Entendi', { onClick: () => s.close() }) });
  return s;
}

// ---------- Toast ----------
export function toast(msg, ms = 2600) {
  const root = document.getElementById('toast-root');
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  root.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, ms);
}

// ---------- Campos ----------
export function field(label, input, hint) {
  // <label> só para controles de formulário; grupos de botões (chips/escalas) usam <div>,
  // senão o clique é reencaminhado ao primeiro botão do grupo.
  const native = input && ['INPUT', 'SELECT', 'TEXTAREA'].includes(input.tagName);
  return h(native ? 'label' : 'div', { class: 'field', ...(native ? {} : { role: 'group', 'aria-label': label }) },
    h('span', { class: 'field-label' }, label), input, hint ? h('span', { class: 'field-hint' }, hint) : null);
}
export function textInput(value = '', attrs = {}) { return h('input', { type: 'text', value, autocomplete: 'off', ...attrs }); }
export function textArea(value = '', attrs = {}) { const t = h('textarea', { rows: 3, ...attrs }); t.value = value; return t; }
export function selectInput(options, value, attrs = {}) {
  const s = h('select', attrs, options.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return h('option', { value: v, selected: String(v) === String(value) }, l);
  }));
  s.value = value ?? '';
  return s;
}
export function numInput(value, { step = 1, min = 0, max, placeholder = '' } = {}) {
  return h('input', { type: 'text', inputmode: 'decimal', value: value == null || value === '' ? '' : String(value).replace('.', ','), placeholder, 'data-step': step, 'data-min': min, ...(max != null ? { 'data-max': max } : {}) });
}
export const readNum = (input) => parseNum(input.value);

// Passo numérico grande (−  valor  +) para uso durante o treino e nos formulários
export function stepper({ value, step = 1, min = 0, max = 9999, unit = '', decimals = 1, onChange, big = false, label }) {
  let v = value ?? 0;
  const out = h('button', { type: 'button', class: 'stepper-val', 'aria-label': `${label || 'Valor'}: toque para digitar` });
  const render = () => { out.innerHTML = `<b>${fmtNum(v, decimals)}</b>${unit ? `<small>${unit}</small>` : ''}`; };
  const set = (n, silent) => {
    n = Math.min(max, Math.max(min, Math.round(n * 100) / 100));
    v = n; render();
    if (!silent && onChange) onChange(v);
  };
  const minus = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': 'Diminuir', html: icon('minus', big ? 28 : 22), onClick: () => set(v - step) });
  const plus = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': 'Aumentar', html: icon('plus', big ? 28 : 22), onClick: () => set(v + step) });
  out.addEventListener('click', () => {
    const inp = h('input', { type: 'text', inputmode: 'decimal', class: 'stepper-input', value: String(v).replace('.', ',') });
    out.replaceWith(inp);
    inp.focus(); inp.select();
    const fin = () => { const n = parseNum(inp.value); if (n != null) set(n); inp.replaceWith(out); render(); };
    inp.addEventListener('blur', fin);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
  });
  render();
  const el = h('div', { class: `stepper ${big ? 'big' : ''}` }, minus, out, plus);
  el.get = () => v;
  el.set = (n) => set(n, true);
  return el;
}

// Escala de 1–5 (humor, energia...) ou lista de opções com rótulo
export function scale({ options, value, onChange, cls = '', allowClear = true }) {
  const wrap = h('div', { class: `scale ${options.length === 5 ? 'five' : ''} ${cls}`, role: 'radiogroup' });
  let cur = value ?? null;
  const render = () => {
    clear(wrap);
    for (const o of options) {
      wrap.appendChild(h('button', {
        type: 'button', role: 'radio', 'aria-checked': String(cur === o.v), class: `scale-btn ${cur === o.v ? 'on' : ''}`,
        onClick: () => { cur = (allowClear && cur === o.v) ? null : o.v; render(); onChange && onChange(cur); },
      }, o.label));
    }
  };
  render();
  wrap.get = () => cur;
  wrap.set = (v) => { cur = v; render(); };
  return wrap;
}

// Escala de respostas representadas por ÍCONE (+ rótulo curto). Cada botão alterna (toque de novo para limpar),
// então o grupo usa aria-pressed. Atualiza os botões no lugar (não recria) para o foco não se perder.
// A cor do painel vem do CSS (.wq[data-hue]); a escolha é marcada por preenchimento + peso, não só por cor.
export function iconScale({ options, value, onChange, label, labelledBy, allowClear = true }) {
  const wrap = h('div', { class: `wq-scale n${options.length}`, role: 'group', 'aria-label': label, 'aria-labelledby': labelledBy });
  let cur = value ?? null;
  const buttons = options.map((o) => h('button', {
    type: 'button', class: 'wq-opt', 'aria-pressed': 'false', 'data-v': String(o.v),
    onClick: () => { cur = (allowClear && cur === o.v) ? null : o.v; paint(); onChange && onChange(cur); },
  }, h('span', { class: 'wq-ico', html: icon(o.icon, 28) }), h('span', { class: 'wq-lab' }, o.label)));
  const paint = () => buttons.forEach((b, i) => { const on = cur === options[i].v; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); });
  wrap.append(...buttons);
  paint();
  wrap.get = () => cur;
  wrap.set = (v) => { cur = v; paint(); };
  return wrap;
}

export function chips({ options, value, onChange, multi = false, cls = '' }) {
  const wrap = h('div', { class: `chips ${cls}` });
  let cur = multi ? new Set(value || []) : value;
  const render = () => {
    clear(wrap);
    for (const o of options) {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      const on = multi ? cur.has(v) : cur === v;
      wrap.appendChild(h('button', {
        type: 'button', class: `chip ${on ? 'on' : ''}`, 'aria-pressed': String(on),
        onClick: () => {
          if (multi) { cur.has(v) ? cur.delete(v) : cur.add(v); } else cur = v;
          render(); onChange && onChange(multi ? [...cur] : cur);
        },
      }, l));
    }
  };
  render();
  wrap.get = () => (multi ? [...cur] : cur);
  return wrap;
}

export function segmented({ options, value, onChange }) {
  const wrap = h('div', { class: 'seg', role: 'tablist' });
  const render = (cur) => {
    clear(wrap);
    for (const [v, l] of options) {
      wrap.appendChild(h('button', { type: 'button', role: 'tab', 'aria-selected': String(v === cur), class: v === cur ? 'on' : '', onClick: () => { render(v); onChange && onChange(v); } }, l));
    }
  };
  render(value);
  return wrap;
}

export function empty({ icon: ic = 'sparkle', title, text, action }) {
  return h('div', { class: 'empty' }, h('div', { class: 'empty-ic', html: icon(ic, 32) }), h('h3', null, title), text ? h('p', { class: 'muted' }, text) : null, action || null);
}

export function pageHead(title, { sub, right, back } = {}) {
  return h('header', { class: 'page-head' },
    back ? iconBtn('left', 'Voltar', () => (typeof back === 'function' ? back() : history.back()), 'back') : null,
    h('div', { class: 'ph-text' }, h('h1', null, title), sub ? h('p', { class: 'muted' }, sub) : null),
    right ? h('div', { class: 'ph-right' }, right) : null);
}

export function menuSheet(title, items) {
  const s = openSheet({
    title, className: 'compact',
    body: h('div', { class: 'menu' }, items.filter(Boolean).map((it) => h('button', {
      type: 'button', class: `menu-item ${it.danger ? 'danger' : ''}`,
      onClick: () => { s.close(); setTimeout(() => it.onClick && it.onClick(), 120); },
    }, h('span', { class: 'ico', html: icon(it.icon || 'right', 20) }), h('span', null, it.label)))),
  });
  return s;
}

// Colapsável simples (<details>)
export function details(summary, ...children) {
  return h('details', { class: 'details' }, h('summary', null, summary), h('div', { class: 'details-body' }, children));
}

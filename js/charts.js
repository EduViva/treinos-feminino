// Gráficos SVG sem dependências. Segue as regras de dataviz: marcas finas (linha 2px,
// barras ≤ 24px com topo arredondado), marcadores ≥ 8px com anel da cor da superfície,
// grade hairline, legenda para ≥ 2 séries, tooltip com crosshair e visão de tabela.
// Texto nunca usa a cor da série (usa tokens de texto).
import { h, clear, fmtDate, fmtNum, MESES_CURTOS } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f1 = (n) => Math.round(n * 10) / 10;
const DAY = 86400000;

export function niceTicks(min, max, count = 4, integer = false) {
  if (min === max) { max = min + 1; }
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  if (integer) step = Math.max(1, Math.ceil(step));
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

function xTicks(from, to, n = 4) {
  const span = to - from, out = [];
  for (let i = 0; i <= n; i++) out.push(from + (span * i) / n);
  return out;
}
function fmtTick(ts, span) {
  const d = new Date(ts);
  if (span > 200 * DAY) return `${MESES_CURTOS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
  return fmtDate(ts);
}

// ---- Gráfico temporal com painéis empilhados (um eixo y por painel; nunca eixo duplo) ----
// panels: [{ kind:'line'|'bar'|'stack', name, color, unit, fmt, domain?:[min,max], ticks?, area?,
//            data:[{t, v}] | (stack) [{t, parts:{key:value}}], parts?:[{key,name,color}], slotMs?, height? }]
export function timeChart({ panels, from, to, width = 360, table, ariaLabel = 'Gráfico', emptyText = 'Sem dados neste período.' }) {
  const L = 38, R = 12, T = 12, B = 22, GAP = 24;
  const multi = panels.length > 1;
  const hasData = panels.some((p) => p.data.length);
  const root = h('div', { class: 'chart' });
  if (!hasData) { root.appendChild(h('p', { class: 'muted', style: { padding: '14px 0' } }, emptyText)); return root; }

  const maxSlot = Math.max(...panels.filter((p) => p.kind !== 'line').map((p) => p.slotMs || DAY), 0);
  const x0 = from, x1 = to + (maxSlot || 0);
  const span = Math.max(DAY, x1 - x0);
  const plotW = width - L - R;
  const X = (t) => L + ((t - x0) / span) * plotW;

  let y = T;
  const layout = panels.map((p) => { const ph = p.height || (multi ? 92 : 150); const o = { p, top: y, ph }; y += ph + GAP; return o; });
  const totalH = y - GAP + B;

  let svg = `<svg xmlns="${NS}" viewBox="0 0 ${width} ${totalH}" role="img" aria-label="${esc(ariaLabel)}">`;
  for (const { p, top, ph } of layout) {
    const vals = p.kind === 'stack'
      ? p.data.map((d) => Object.values(d.parts).reduce((a, b) => a + b, 0))
      : p.data.map((d) => d.v);
    let dmin = p.domain ? p.domain[0] : (p.kind === 'line' ? Math.min(...vals) : 0);
    let dmax = p.domain ? p.domain[1] : Math.max(...vals, 1);
    if (!p.domain && p.kind === 'line') { const pad = (dmax - dmin) * 0.15 || 1; dmin = Math.max(0, dmin - pad); dmax += pad; }
    const ticks = p.ticks || niceTicks(dmin, dmax, multi ? 2 : 4, !!p.integer);
    if (!p.domain) { dmin = Math.min(dmin, ticks[0]); dmax = Math.max(dmax, ticks[ticks.length - 1]); }
    const Y = (v) => top + ph - ((v - dmin) / (dmax - dmin || 1)) * ph;
    p._Y = Y; p._top = top; p._ph = ph; p._dmin = dmin;
    // grade hairline + rótulos do eixo y
    for (const tk of ticks) {
      const yy = Y(tk);
      svg += `<line class="grid" x1="${L}" x2="${width - R}" y1="${f1(yy)}" y2="${f1(yy)}"/>`;
      svg += `<text x="${L - 6}" y="${f1(yy + 3.5)}" text-anchor="end">${esc(p.tickFmt ? p.tickFmt(tk) : fmtNum(tk, tk % 1 ? 1 : 0))}</text>`;
    }
    svg += `<line class="axis" x1="${L}" x2="${width - R}" y1="${f1(Y(Math.max(dmin, 0)))}" y2="${f1(Y(Math.max(dmin, 0)))}"/>`;
    if (multi) svg += `<text x="${L}" y="${f1(top - 9)}" style="font-weight:700">${esc(p.name)}</text>`;

    if (p.kind === 'bar' || p.kind === 'stack') {
      const slot = p.slotMs || DAY;
      const band = X(x0 + slot) - X(x0);
      const bw = Math.max(3, Math.min(24, band - 2));
      for (const d of p.data) {
        const cx = X(d.t + slot / 2);
        if (p.kind === 'bar') {
          if (!d.v) continue;
          svg += barPath(cx - bw / 2, bw, Y(d.v), Y(Math.max(dmin, 0)), p.color);
        } else {
          let acc = 0;
          const parts = p.parts.filter((pt) => d.parts[pt.key] > 0);
          parts.forEach((pt, i) => {
            const v = d.parts[pt.key], yTop = Y(acc + v), yBot = Y(acc) - (i > 0 ? 2 : 0);
            svg += i === parts.length - 1 ? barPath(cx - bw / 2, bw, yTop, yBot, pt.color) : `<rect x="${f1(cx - bw / 2)}" y="${f1(yTop)}" width="${f1(bw)}" height="${f1(Math.max(0, yBot - yTop))}" fill="${pt.color}"/>`;
            acc += v;
          });
        }
      }
    } else {
      const pts = p.data.map((d) => [X(d.t), Y(d.v)]);
      if (p.area && pts.length > 1) {
        svg += `<path d="M${f1(pts[0][0])} ${f1(Y(dmin))}L${pts.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}L${f1(pts[pts.length - 1][0])} ${f1(Y(dmin))}Z" fill="${p.color}" opacity="0.1"/>`;
      }
      if (pts.length > 1) svg += `<path d="M${pts.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}" fill="none" stroke="${p.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const showAll = pts.length <= 40;
      pts.forEach((q, i) => {
        if (!showAll && i !== pts.length - 1) return;
        svg += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="4.5" fill="${p.color}" stroke="var(--card)" stroke-width="2"/>`;
      });
      // rótulo direto só no último ponto
      if (pts.length) {
        const last = pts[pts.length - 1], d = p.data[p.data.length - 1];
        const anchor = last[0] > width - 50 ? 'end' : 'start';
        svg += `<text x="${f1(last[0] + (anchor === 'end' ? -8 : 8))}" y="${f1(last[1] - 8)}" text-anchor="${anchor}" style="fill:var(--ink);font-weight:800;font-size:12px">${esc(p.fmt ? p.fmt(d.v) : fmtNum(d.v, 1))}</text>`;
      }
    }
  }
  // eixo x
  const bottom = totalH - B + 14;
  for (const t of xTicks(x0, to, 4)) {
    const xx = X(t);
    svg += `<text x="${f1(xx)}" y="${bottom}" text-anchor="${xx < L + 10 ? 'start' : xx > width - R - 10 ? 'end' : 'middle'}">${esc(fmtTick(t, span))}</text>`;
  }
  svg += `<line class="axis cross" x1="0" x2="0" y1="${T - 4}" y2="${totalH - B}" style="display:none;stroke:var(--muted)"/>`;
  svg += '</svg>';

  const wrap = h('div', { class: 'chart-wrap', tabindex: '0', role: 'group', 'aria-label': `${ariaLabel}. Use as setas para percorrer os pontos, ou veja a tabela.` });
  wrap.innerHTML = svg;
  const tt = h('div', { class: 'tt', role: 'status' });
  wrap.appendChild(tt);
  root.appendChild(wrap);

  // dados por tempo (união) para o crosshair
  const times = [...new Set(panels.flatMap((p) => p.data.map((d) => d.t)))].sort((a, b) => a - b);
  const cross = wrap.querySelector('.cross');
  const svgEl = wrap.querySelector('svg');
  const slotOf = (p) => (p.kind === 'line' ? 0 : (p.slotMs || DAY) / 2);
  function show(t) {
    if (t == null) { cross.style.display = 'none'; tt.classList.remove('on'); return; }
    const anyBar = panels.some((p) => p.kind !== 'line');
    const xx = X(t + (anyBar ? (panels.find((p) => p.kind !== 'line').slotMs || DAY) / 2 : 0));
    cross.setAttribute('x1', f1(xx)); cross.setAttribute('x2', f1(xx)); cross.style.display = '';
    clear(tt);
    tt.appendChild(h('div', { class: 'tt-t' }, fmtDate(t, { year: span > 300 * DAY })));
    for (const p of panels) {
      const d = p.data.find((q) => q.t === t);
      if (!d) continue;
      if (p.kind === 'stack') {
        for (const pt of p.parts) if (d.parts[pt.key] > 0) tt.appendChild(h('div', { class: 'tt-row' }, h('i', { class: 'tt-key', style: { background: pt.color } }), h('b', null, `${fmtNum(d.parts[pt.key], 0)} ${p.unit || ''}`), h('span', null, pt.name)));
      } else {
        tt.appendChild(h('div', { class: 'tt-row' }, h('i', { class: 'tt-key', style: { background: p.color } }), h('b', null, p.fmt ? p.fmt(d.v) : `${fmtNum(d.v, 1)} ${p.unit || ''}`), h('span', null, p.name)));
      }
    }
    if (tt.children.length === 1) { tt.classList.remove('on'); return; }
    tt.classList.add('on');
    const box = svgEl.getBoundingClientRect();
    const px = (xx / width) * box.width;
    const tw = tt.offsetWidth || 140;
    tt.style.left = `${Math.max(0, Math.min(box.width - tw, px - tw / 2))}px`;
    tt.style.top = '-6px';
    tt.style.transform = 'translateY(-100%)';
  }
  let cursor = -1;
  function nearest(clientX) {
    const box = svgEl.getBoundingClientRect();
    const sx = ((clientX - box.left) / box.width) * width;
    let best = null, bd = Infinity;
    for (const t of times) {
      const anyBar = panels.some((p) => p.kind !== 'line' && p.data.some((d) => d.t === t));
      const xx = X(t + (anyBar ? (panels.find((p) => p.kind !== 'line').slotMs || DAY) / 2 : 0));
      const dd = Math.abs(xx - sx);
      if (dd < bd) { bd = dd; best = t; }
    }
    return best;
  }
  wrap.addEventListener('pointermove', (e) => { const t = nearest(e.clientX); cursor = times.indexOf(t); show(t); });
  wrap.addEventListener('pointerdown', (e) => { const t = nearest(e.clientX); cursor = times.indexOf(t); show(t); });
  wrap.addEventListener('pointerleave', () => { if (document.activeElement !== wrap) show(null); });
  wrap.addEventListener('blur', () => show(null));
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { cursor = Math.min(times.length - 1, cursor + 1); show(times[cursor]); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { cursor = Math.max(0, (cursor < 0 ? times.length : cursor) - 1); show(times[cursor]); e.preventDefault(); }
    if (e.key === 'Escape') show(null);
  });

  // legenda (≥ 2 séries)
  const legendItems = [];
  for (const p of panels) {
    if (p.kind === 'stack') p.parts.forEach((pt) => legendItems.push({ name: pt.name, color: pt.color, kind: 'bar' }));
    else legendItems.push({ name: p.name, color: p.color, kind: p.kind === 'line' ? 'line' : 'bar' });
  }
  if (legendItems.length >= 2) {
    root.appendChild(h('div', { class: 'legend' }, legendItems.map((it) => h('span', null, h('i', it.kind === 'line' ? { class: 'lk', style: { background: it.color } } : { style: { background: it.color } }), it.name))));
  }
  // visão de tabela (acessibilidade e alternativa ao tooltip)
  if (table !== false) root.appendChild(tableToggle(() => buildTable(panels, times)));
  return root;
}

function barPath(x, w, yTop, yBase, color) {
  const hgt = Math.max(0, yBase - yTop);
  if (hgt <= 0.5) return '';
  const r = Math.min(4, w / 2, hgt);
  return `<path d="M${f1(x)} ${f1(yBase)}V${f1(yTop + r)}Q${f1(x)} ${f1(yTop)} ${f1(x + r)} ${f1(yTop)}H${f1(x + w - r)}Q${f1(x + w)} ${f1(yTop)} ${f1(x + w)} ${f1(yTop + r)}V${f1(yBase)}Z" fill="${color}"/>`;
}

function tableToggle(build) {
  const box = h('div');
  let open = false, tbl = null;
  const b = h('button', { type: 'button', class: 'link', 'aria-expanded': 'false' }, 'Ver como tabela');
  b.addEventListener('click', () => {
    open = !open;
    b.textContent = open ? 'Ocultar tabela' : 'Ver como tabela';
    b.setAttribute('aria-expanded', String(open));
    if (open) { tbl = build(); box.appendChild(tbl); } else if (tbl) { tbl.remove(); tbl = null; }
  });
  box.appendChild(h('div', { class: 'chart-actions' }, b));
  return box;
}

function buildTable(panels, times) {
  const cols = [];
  for (const p of panels) {
    if (p.kind === 'stack') p.parts.forEach((pt) => cols.push({ head: `${pt.name}${p.unit ? ` (${p.unit})` : ''}`, get: (t) => { const d = p.data.find((q) => q.t === t); return d && d.parts[pt.key] ? fmtNum(d.parts[pt.key], 0) : ''; } }));
    else cols.push({ head: `${p.name}${p.unit ? ` (${p.unit})` : ''}`, get: (t) => { const d = p.data.find((q) => q.t === t); return d ? (p.fmt ? p.fmt(d.v) : fmtNum(d.v, 1)) : ''; } });
  }
  const t = h('table', null,
    h('thead', null, h('tr', null, h('th', null, 'Data'), cols.map((c) => h('th', null, c.head)))),
    h('tbody', null, [...times].reverse().map((tm) => h('tr', null, h('td', null, fmtDate(tm, { year: true })), cols.map((c) => h('td', null, c.get(tm)))))));
  return h('div', { style: { maxHeight: '260px', overflow: 'auto' } }, t);
}

// ---- Barras horizontais (categorias) com valor na ponta e tooltip por barra ----
export function hBars({ items, color = 'var(--s1)', unit = '', digits = 0, max, emptyText = 'Sem dados neste período.' }) {
  const root = h('div', { class: 'chart' });
  if (!items.length) { root.appendChild(h('p', { class: 'muted', style: { padding: '12px 0' } }, emptyText)); return root; }
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  const rowH = 30, L = 92, R = 44, W = 360, H = items.length * rowH + 4;
  let svg = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img">`;
  items.forEach((it, i) => {
    const y = i * rowH + 4, bw = Math.max(2, ((W - L - R) * it.value) / top);
    svg += `<text x="${L - 8}" y="${y + 15}" text-anchor="end" style="fill:var(--ink)">${esc(it.label.length > 14 ? it.label.slice(0, 13) + '…' : it.label)}</text>`;
    svg += `<path d="M${L} ${y + 4}H${f1(L + bw - 4)}Q${f1(L + bw)} ${y + 4} ${f1(L + bw)} ${y + 8}V${y + 14}Q${f1(L + bw)} ${y + 18} ${f1(L + bw - 4)} ${y + 18}H${L}Z" fill="${it.color || color}"/>`;
    svg += `<text x="${f1(L + bw + 6)}" y="${y + 15}" style="fill:var(--ink);font-weight:800">${esc(fmtNum(it.value, digits))}</text>`;
  });
  svg += '</svg>';
  root.innerHTML = svg;
  root.appendChild(tableToggle(() => h('table', null, h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, unit || 'Valor'))),
    h('tbody', null, items.map((it) => h('tr', null, h('td', null, it.label), h('td', null, fmtNum(it.value, digits))))))));
  return root;
}

// ---- Mini linha (sparkline) ----
export function sparkline(values, { width = 120, height = 34, color = 'var(--s1)' } = {}) {
  if (values.length < 2) return h('span');
  const min = Math.min(...values), max = Math.max(...values), pad = 4;
  const pts = values.map((v, i) => [pad + (i * (width - 2 * pad)) / (values.length - 1), height - pad - ((v - min) / (max - min || 1)) * (height - 2 * pad)]);
  const d = 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');
  const last = pts[pts.length - 1];
  const el = h('span', { class: 'spark', 'aria-hidden': 'true' });
  el.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f1(last[0])}" cy="${f1(last[1])}" r="4" fill="${color}" stroke="var(--card)" stroke-width="2"/></svg>`;
  return el;
}

// Tela Bem-estar: perguntas, respostas, ícones e cores (dados puros, sem navegador).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { WB_ICONS, WB_SCALES, WB_PERIOD, WB_NOTE, WB_HUES } from '../../js/data/wellbeing.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(join(ROOT, 'css/app.css'), 'utf8');
const uiSrc = readFileSync(join(ROOT, 'js/ui.js'), 'utf8');

// ícones que já existem em js/ui.js (usados como selo no cabeçalho de algumas perguntas)
const builtin = new Set([...uiSrc.matchAll(/^ {2}(\w+): '/gm)].map((m) => m[1]));
const allIcons = new Set([...Object.keys(WB_ICONS), ...builtin]);

test('perguntas de 5 níveis: campos do registro, valores 1–5, rótulos únicos', () => {
  assert.deepEqual(WB_SCALES.map((q) => q.key), ['mood', 'energy', 'tiredness', 'fatigue', 'recovery']);
  for (const q of WB_SCALES) {
    assert.deepEqual(q.options.map((o) => o.v), [1, 2, 3, 4, 5], q.key);
    const labels = q.options.map((o) => o.label);
    assert.equal(new Set(labels).size, 5, `${q.key}: rótulos repetidos`);
    assert.ok(labels.every((l) => l.trim()), `${q.key}: rótulo vazio`);
  }
});

test('fluxo menstrual: 3 respostas com os mesmos valores gravados antes (leve, médio, intenso)', () => {
  assert.deepEqual(WB_PERIOD.flow.map((o) => o.v), ['leve', 'médio', 'intenso']);
});

test('toda resposta e todo selo tem ícone, e dentro de cada pergunta os ícones são todos diferentes', () => {
  const opts = [...WB_SCALES.flatMap((q) => q.options), ...WB_PERIOD.flow];
  for (const o of opts) assert.ok(WB_ICONS[o.icon], `ícone ausente: ${o.icon}`);
  for (const q of [...WB_SCALES, WB_PERIOD, WB_NOTE]) assert.ok(allIcons.has(q.badge), `selo ausente: ${q.badge}`);
  for (const [name, list] of [...WB_SCALES.map((q) => [q.key, q.options]), ['fluxo', WB_PERIOD.flow]]) {
    const marks = list.map((o) => WB_ICONS[o.icon]);
    assert.equal(new Set(marks).size, marks.length, `${name}: dois níveis com o mesmo desenho`);
  }
});

test('desenhos válidos: só path/circle/rect, sem NaN/undefined e tags fechadas', () => {
  for (const [name, svg] of Object.entries(WB_ICONS)) {
    assert.ok(!/NaN|undefined|Infinity/.test(svg), `${name}: número inválido`);
    const tags = [...svg.matchAll(/<(\w+)/g)].map((m) => m[1]);
    assert.ok(tags.length > 0 && tags.every((t) => ['path', 'circle', 'rect'].includes(t)), `${name}: elemento inesperado (${tags})`);
    assert.equal((svg.match(/</g) || []).length, (svg.match(/>/g) || []).length, `${name}: tag aberta`);
    assert.equal((svg.match(/<(path|circle|rect)\b[^>]*\/>/g) || []).length, tags.length, `${name}: elemento sem fechar`);
  }
});

test('anel de recuperação enche 20% … 100% e o medidor gira da esquerda para a direita', () => {
  const dash = (n) => Number(WB_ICONS[`wb-ring-${n}`].match(/stroke-dasharray="([\d.]+) /)[1]);
  const part = [1, 2, 3, 4, 5].map(dash);
  assert.ok(part.every((v, i) => i === 0 || v > part[i - 1]), `anel não cresce: ${part}`);
  assert.ok(Math.abs(part[4] - 2 * Math.PI * 8.5) < 0.05, 'nível 5 = volta completa');
  const needleX = (n) => Number(WB_ICONS[`wb-gauge-${n}`].match(/M12 12\.6L([\d.-]+) /)[1]);
  const xs = [1, 2, 3, 4, 5].map(needleX);
  assert.ok(xs.every((v, i) => i === 0 || v > xs[i - 1]), `ponteiro não avança: ${xs}`);
  const cells = (n) => Number(WB_ICONS[`wb-battery-${n}`].match(/width="([\d.]+)" height="6"/)[1]);
  const fill = [1, 2, 3, 4, 5].map(cells);
  assert.ok(fill.every((v, i) => i === 0 || v > fill[i - 1]), `bateria não enche: ${fill}`);
});

test('uma cor pastel por pergunta: 7 matizes diferentes, todos definidos no CSS (claro e os dois escuros)', () => {
  assert.equal(WB_HUES.length, 7);
  assert.equal(new Set(WB_HUES).size, 7, 'duas perguntas com a mesma cor');
  const ctx = {
    claro: /^\.wq\[data-hue="(\w+)"\]/gm,
    'escuro (automático)': /:root:not\(\[data-theme="light"\]\) \.wq\[data-hue="(\w+)"\]/g,
    'escuro (escolhido)': /:root\[data-theme="dark"\] \.wq\[data-hue="(\w+)"\]/g,
  };
  for (const [nome, re] of Object.entries(ctx)) {
    const found = new Set([...css.matchAll(re)].map((m) => m[1]));
    // no escuro, "sand" é o padrão do próprio `.wq` (regra sem data-hue)
    for (const hue of WB_HUES) assert.ok(found.has(hue) || (hue === 'sand' && nome.startsWith('escuro')), `matiz ${hue} sem CSS no tema ${nome}`);
  }
});

test('ordem das perguntas na tela (e, portanto, a ordem das cores)', () => {
  assert.deepEqual([WB_PERIOD, ...WB_SCALES, WB_NOTE].map((q) => q.key), ['period', 'mood', 'energy', 'tiredness', 'fatigue', 'recovery', 'note']);
});

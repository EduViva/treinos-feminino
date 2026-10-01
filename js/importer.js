// Converte uma lista de treinos colada como texto em dados estruturados (sem alterar o que foi escrito).
// Exemplo de entrada:
//   Treino A - Pernas
//   Leg press 4x12 80kg 90s
//   Cadeira extensora 3x15
//   Treino B
//   1) Supino máquina 3 x 10 - 25 kg
import { norm } from './util.js';

const HEADER = /^(treino|dia|ficha|workout)\s+([a-z0-9]+)\b\s*[-–—:]?\s*(.*)$/i;
const LETTER_HEADER = /^([a-e])\s*[-–—:)]\s*(.*)$/i;

export function parseWorkoutText(text) {
  const workouts = [];
  let cur = null;
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const raw of lines) {
    let line = raw.replace(/^[•*·\-–—]\s+/, '').replace(/^\d+\s*[.)]\s+/, '');
    const hm = raw.match(HEADER);
    const hasSets = /(\d+)\s*[x×*]\s*\d+|\d+\s*s[eé]ries?/i.test(raw);
    if (hm && !hasSets) {
      cur = { name: `Treino ${hm[2].toUpperCase()}`, description: hm[3] || '', items: [] };
      workouts.push(cur); continue;
    }
    const lm = raw.match(LETTER_HEADER);
    if (lm && !hasSets && lm[2].split(' ').length <= 5 && raw.length < 40 && !/\d/.test(raw)) {
      cur = { name: `Treino ${lm[1].toUpperCase()}`, description: lm[2] || '', items: [] };
      workouts.push(cur); continue;
    }
    if (/^[^\d]{2,40}:$/.test(raw) && !hasSets) { cur = { name: raw.replace(/:$/, ''), description: '', items: [] }; workouts.push(cur); continue; }
    if (!cur) { cur = { name: 'Treino A', description: '', items: [] }; workouts.push(cur); }
    const it = parseLine(line);
    if (it && it.name) cur.items.push(it);
  }
  return workouts.filter((w) => w.items.length);
}

export function parseLine(line) {
  let s = line;
  let sets = null, reps = null, load = null, rest = null, secUnit = false;
  let m = s.match(/(\d+)\s*[x×*]\s*(\d+)\s*(s|seg|segundos)?\b/i);
  if (m) { sets = +m[1]; reps = +m[2]; secUnit = !!m[3]; s = s.replace(m[0], ' '); } else {
    m = s.match(/(\d+)\s*s[eé]ries?\s*(?:de|x)?\s*(\d+)(?:\s*(?:repeti[cç][õo]es|reps?))?/i);
    if (m) { sets = +m[1]; reps = +m[2]; s = s.replace(m[0], ' '); }
  }
  m = s.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
  if (m) { load = parseFloat(m[1].replace(',', '.')); s = s.replace(m[0], ' '); }
  m = s.match(/(?:descanso|desc\.?|rest)?\s*[:\-]?\s*(\d+)\s*(?:min(?:utos?)?)\b/i);
  if (m && /min/i.test(m[0])) { rest = +m[1] * 60; s = s.replace(m[0], ' '); } else {
    m = s.match(/(?:descanso|desc\.?|rest)?\s*[:\-]?\s*(\d+)\s*(?:s|seg|segundos|")(?=\s|$|[,;.)])/i);
    if (m) { rest = +m[1]; s = s.replace(m[0], ' '); }
  }
  const name = s.replace(/\b(com|de|descanso|carga)\b\s*$/i, '').replace(/[()[\]]/g, ' ').replace(/[\-–—:,;.|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { raw: line, name, sets, reps, load, rest, secUnit };
}

function tokens(s) { return norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !['de', 'da', 'do', 'na', 'no', 'com', 'em'].includes(t)); }

// Encontra o exercício da biblioteca mais parecido (ou null → será criado). Considera os nomes alternativos.
export function matchExercise(name, library) {
  const n = norm(name);
  if (!n) return null;
  const scoreOf = (label) => {
    const en = norm(label);
    if (en === n) return 100;
    if (en.includes(n) || n.includes(en)) return 80 - Math.abs(en.length - n.length) * 0.2;
    const a = tokens(n), b = tokens(en);
    const common = a.filter((t) => b.some((u) => u === t || u.startsWith(t) || t.startsWith(u))).length;
    const ratio = common / Math.max(a.length, b.length || 1);
    return common && ratio >= 0.5 ? 40 + ratio * 30 : 0;
  };
  let best = null, bestScore = 0;
  for (const ex of library) {
    let score = scoreOf(ex.name);
    for (const alias of ex.aliases || []) score = Math.max(score, scoreOf(alias) - 1); // nome oficial vence empate
    if (score > bestScore) { bestScore = score; best = ex; }
  }
  return bestScore >= 50 ? best : null;
}

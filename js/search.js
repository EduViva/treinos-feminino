// Busca e filtros de exercícios (puro, sem DOM). Funciona offline sobre a lista local (catálogo + próprios).
//  • ignora acentos e maiúsculas ("supino" acha "Supíno"); aceita vários termos ("supino inc barra")
//  • procura no nome, nos sinônimos ("bench press", "pulldown") e nos rótulos de grupo/equipamento
//  • ranking: nome exato > começa com > palavra começa com > contém > sinônimo > rótulos; tolera 1 erro de digitação
//  • filtros combináveis: grupo, equipamento, tipo, nível e favoritos
import { fold, KINDS, LEVEL_NAMES } from './data/taxonomy.js';

const cache = new WeakMap();
function entry(ex) {
  let c = cache.get(ex);
  if (!c) {
    const name = fold(ex.name);
    c = {
      name, words: name.split(/[^a-z0-9]+/).filter(Boolean),
      aliases: (ex.aliases || []).map(fold),
      labels: fold([ex.group, ...(ex.secondary || []).slice(0, 0), ex.equipment, KINDS[ex.kind] || '', LEVEL_NAMES[ex.level] || ''].join(' ')),
    };
    c.aliasWords = c.aliases.flatMap((a) => a.split(/[^a-z0-9]+/).filter(Boolean));
    cache.set(ex, c);
  }
  return c;
}

// Distância de edição (com transposição), limitada: devolve > max assim que passar do limite.
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = [], prev = [], cur = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) { prev2[j] = prev[j]; prev[j] = cur[j]; }
  }
  return prev[b.length];
}

// Pontuação de UM termo em UM exercício (0 = não encontrou).
function scoreToken(t, c, fuzzy) {
  if (c.name === t) return 100;
  if (c.name.startsWith(t)) return 80;
  if (c.words.some((w) => w.startsWith(t))) return 60;
  if (c.name.includes(t)) return 40;
  let best = 0;
  for (const a of c.aliases) {
    if (a === t) best = Math.max(best, 90);
    else if (a.startsWith(t)) best = Math.max(best, 70);
    else if (c.aliasWords.some((w) => w.startsWith(t)) && a.split(/[^a-z0-9]+/).some((w) => w.startsWith(t))) best = Math.max(best, 50);
    else if (a.includes(t)) best = Math.max(best, 30);
  }
  if (best) return best;
  if (c.labels.includes(t)) return 20;
  if (fuzzy && t.length >= 4) { // erro de digitação ("agachameto", "supinp") — só quando não há acerto direto
    const max = t.length >= 8 ? 2 : 1;
    for (const w of c.words) if (editDistance(t, w.length > t.length ? w.slice(0, t.length + max) : w, max) <= max) return 15;
    for (const w of c.aliasWords) if (editDistance(t, w, max) <= max) return 10;
  }
  return 0;
}

function matchesFacets(ex, f) {
  if (f.groups?.length && !f.groups.includes(ex.group)) return false;
  if (f.equipment?.length && !f.equipment.includes(ex.equipment)) return false;
  if (f.types?.length && !f.types.includes(ex.kind || 'forca')) return false;
  if (f.levels?.length && !f.levels.includes(ex.level)) return false;
  if (f.favoritesOnly && !ex.favorite) return false;
  return true;
}

export function searchExercises(list, filters = {}) {
  const tokens = fold(filters.q || '').split(/\s+/).filter(Boolean);
  const run = (fuzzy) => {
    const phrase = tokens.join(' ');
    const out = [];
    for (const ex of list) {
      if (!matchesFacets(ex, filters)) continue;
      if (!tokens.length) { out.push({ ex, score: 0 }); continue; }
      const c = entry(ex);
      let total = 0, ok = true;
      for (const t of tokens) { const s = scoreToken(t, c, fuzzy); if (!s) { ok = false; break; } total += s; }
      if (!ok) continue;
      if (tokens.length > 1 && c.name.includes(phrase)) total += 25;       // frase inteira no nome
      total += (ex.favorite ? 4 : 0) - c.name.length / 200;                  // favoritos e nomes curtos primeiro
      out.push({ ex, score: total });
    }
    return out;
  };
  let out = run(false);
  if (!out.length && tokens.length) out = run(true);   // nada direto → tenta tolerar erro de digitação
  out.sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name, 'pt-BR'));
  return out.map((r) => r.ex);
}

// Contagem por faceta (para mostrar "Barra (37)" etc.), considerando os OUTROS filtros ativos.
export function facetCounts(list, filters, key, valueOf) {
  const f = { ...filters, [key]: [] };
  const counts = new Map();
  for (const ex of searchExercises(list, f)) { const v = valueOf(ex); counts.set(v, (counts.get(v) || 0) + 1); }
  return counts;
}

// Exercícios usados há pouco (histórico primeiro; depois treinos), sem repetição.
export function recentExerciseIds(sessions, workouts, limit = 8) {
  const seen = new Set(), out = [];
  const add = (id) => { if (id && !seen.has(id) && out.length < limit) { seen.add(id); out.push(id); } };
  for (let i = sessions.length - 1; i >= 0 && out.length < limit; i--) for (const x of sessions[i].exercises || []) if (x.sets?.length) add(x.exerciseId);
  for (const w of workouts) for (const it of w.items || []) add(it.exerciseId);
  return out;
}

// Validação do catálogo: integridade, padronização e anti-duplicação.
import * as tx from '../../js/data/taxonomy.js';

const STOP = new Set(['com', 'na', 'no', 'nas', 'nos', 'de', 'da', 'do', 'das', 'dos', 'em', 'a', 'o', 'e', 'para', 'ao']);
const norm = (s) => tx.fold(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => norm(s).split(' ').filter((t) => t && !STOP.has(t)).sort().join(' ');

export function validateCatalog(catalog, { artKeys = [] } = {}) {
  const errors = [];
  const err = (e, m) => errors.push(`${e.slug || e.name}: ${m}`);
  const slugs = new Map(), names = new Map(), toks = new Map(), aliases = new Map(), arts = new Map();

  for (const e of catalog) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.slug || '')) err(e, `slug inválido "${e.slug}" (use minúsculas sem acento, separado por hífen)`);
    if (slugs.has(e.slug)) err(e, `slug duplicado (${slugs.get(e.slug)})`); else slugs.set(e.slug, e.name);
    if (!e.name || e.name.length < 3 || e.name.length > 80) err(e, 'nome ausente ou fora de 3–80 caracteres');
    if (e.name !== e.name.trim() || /\s{2,}/.test(e.name)) err(e, 'nome com espaços sobrando');
    if (!tx.groups.has(e.group)) err(e, `grupo desconhecido "${e.group}"`);
    if (!tx.equipment.has(e.equipment)) err(e, `equipamento desconhecido "${e.equipment}"`);
    if (!tx.types.has(e.type)) err(e, `tipo desconhecido "${e.type}"`);
    if (!tx.levels.has(e.level)) err(e, `nível desconhecido "${e.level}"`);
    for (const s of e.secondary) if (!tx.groups.has(s)) err(e, `músculo secundário desconhecido "${s}"`);
    if (e.secondary.includes(e.group)) err(e, 'músculo secundário igual ao principal');
    if (new Set(e.secondary).size !== e.secondary.length) err(e, 'músculos secundários repetidos');
    if (e.instructions.length < 2 || e.instructions.length > 5) err(e, `use de 2 a 5 instruções (tem ${e.instructions.length})`);
    for (const t of e.instructions) if (t.length < 12 || t.length > 220 || !/[.!?]$/.test(t)) err(e, `instrução fora do padrão: "${t}"`);
    if (e.tips.length < 1 || e.tips.length > 2) err(e, 'inclua 1 ou 2 dicas de execução');
    for (const t of e.tips) if (t.length < 10 || t.length > 200) err(e, `dica fora do padrão: "${t}"`);
    if (!(e.sets >= 1 && e.sets <= 20 && e.reps >= 1 && e.reps <= 3600 && e.rest >= 0 && e.rest <= 900 && e.step > 0)) err(e, 'padrões de séries/reps/descanso inválidos');
    if (!['reps', 'seg', 'min'].includes(e.unit)) err(e, `unidade inválida "${e.unit}"`);
    if (e.type === 'alongamento' && e.unit !== 'seg') err(e, 'alongamento deve ser medido em segundos');
    if (e.type === 'cardio' && e.unit !== 'min') err(e, 'cardio deve ser medido em minutos');

    const n = norm(e.name);
    if (names.has(n)) err(e, `nome duplicado de "${names.get(n)}"`); else names.set(n, e.slug);
    const tk = tokens(e.name);
    if (toks.has(tk) && toks.get(tk) !== e.slug) err(e, `nome quase idêntico a "${toks.get(tk)}" (mesmas palavras)`); else toks.set(tk, e.slug);

    const seen = new Set();
    for (const a of e.aliases) {
      const na = norm(a);
      if (!na) err(e, 'sinônimo vazio');
      if (seen.has(na)) err(e, `sinônimo repetido "${a}"`); seen.add(na);
      if (na === n) err(e, `sinônimo igual ao próprio nome "${a}"`);
      if (aliases.has(na) && aliases.get(na) !== e.slug) err(e, `sinônimo "${a}" também usado por "${aliases.get(na)}"`); else aliases.set(na, e.slug);
    }
    if (e.art) {
      if (artKeys.length && !artKeys.includes(e.art)) err(e, `animação inexistente "${e.art}"`);
      if (arts.has(e.art)) err(e, `animação "${e.art}" já usada por "${arts.get(e.art)}"`); else arts.set(e.art, e.slug);
    }
  }
  // sinônimo não pode ser o nome de OUTRO exercício
  for (const [a, slug] of aliases) if (names.has(a) && names.get(a) !== slug) errors.push(`${slug}: sinônimo "${a}" é o nome do exercício "${names.get(a)}"`);
  // toda animação existente precisa estar em algum exercício
  for (const k of artKeys) if (!arts.has(k)) errors.push(`animação "${k}" não está associada a nenhum exercício do catálogo`);
  return errors;
}

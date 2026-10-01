// DSL compacta para escrever o catálogo de exercícios (fonte única → seed SQL).
//
//   const g = grp('peitoral');
//   g.bar('supino-reto-barra', 'Supino reto com barra', ['Supino reto', 'Bench press'], ['ombros', 'triceps'], 'm',
//         ['Passo 1', 'Passo 2'], 'Dica', { art: 'bench_press', p: 'comp' });
//
//   g.<eq>(slug, nome, sinônimos, secundários, nível, instruções, dica(s), opções)
//
// Convenção de nomes: "<Movimento> <variação> <equipamento>" — "Supino inclinado com halteres",
// "Crucifixo na máquina", "Remada no Smith". Nomes populares diferentes ficam em `aliases` (busca).

export const EQ = {
  maq: 'maquina', pol: 'polia', bar: 'barra', hal: 'halteres', smi: 'smith', ban: 'banco', pc: 'peso-corporal',
  bf: 'barra-fixa', kb: 'kettlebell', ela: 'elastico', ani: 'anilha', bol: 'bola-suica', med: 'medicine-ball',
  sus: 'suspensao', cor: 'corda-naval', ste: 'step', car: 'cardio', out: 'outro',
};
const LV = { i: 'iniciante', m: 'intermediario', a: 'avancado' };

// Padrões por tipo de exercício (séries × repetições/tempo, descanso, menor ajuste de carga)
export const PRESETS = {
  leg: { sets: 4, reps: 12, rest: 90, step: 2 },   // padrão dos exercícios da biblioteca original do app
  comp: { sets: 4, reps: 8, rest: 120, step: 2.5 },
  mid: { sets: 3, reps: 10, rest: 90, step: 2 },
  iso: { sets: 3, reps: 12, rest: 60, step: 2 },
  mach: { sets: 3, reps: 12, rest: 90, step: 5 },
  light: { sets: 3, reps: 15, rest: 45, step: 1 },
  bw: { sets: 3, reps: 12, rest: 60, step: 1, bw: true },
  core: { sets: 3, reps: 15, rest: 45, step: 1, bw: true },
  time: { sets: 3, reps: 30, rest: 45, step: 1, unit: 'seg', bw: true },
  stretch: { sets: 2, reps: 30, rest: 10, step: 2, unit: 'seg', bw: true, type: 'alongamento' },
  mob: { sets: 2, reps: 10, rest: 15, step: 2, bw: true, type: 'mobilidade' },
  cardio: { sets: 1, reps: 20, rest: 0, step: 2, unit: 'min', bw: true, type: 'cardio' },
  func: { sets: 3, reps: 12, rest: 60, step: 2, type: 'funcional' },
};

export function grp(group) {
  const out = {};
  for (const [short, eq] of Object.entries(EQ)) {
    out[short] = (slug, name, alt, sec, lvl, how, tips, o = {}) => {
      const p = { ...(PRESETS[o.p || 'mid']) };
      return {
        slug, name, aliases: alt || [], group, secondary: sec || [], equipment: o.eq || eq,
        type: o.type || p.type || 'forca', level: LV[lvl] || lvl, instructions: how, tips: Array.isArray(tips) ? tips : (tips ? [tips] : []),
        art: o.art || null, legacy: o.legacy || null,
        sets: o.sets ?? p.sets, reps: o.reps ?? p.reps, rest: o.rest ?? p.rest, step: o.step ?? p.step,
        unit: o.unit || p.unit || 'reps', bodyweight: o.bw ?? p.bw ?? false,
      };
    };
  }
  return out;
}

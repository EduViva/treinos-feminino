// Catálogo global de exercícios — agregação de todos os arquivos por grupo.
import peitoral from './peitoral.mjs';
import costas from './costas.mjs';
import ombros from './ombros.mjs';
import bracos from './bracos.mjs';
import pernas from './pernas.mjs';
import core from './core.mjs';
import cardioFuncional from './cardio-funcional.mjs';
import flexibilidade from './flexibilidade.mjs';

export const CATALOG = [...peitoral, ...costas, ...ombros, ...bracos, ...pernas, ...core, ...cardioFuncional, ...flexibilidade];

// id local antigo (biblioteca original do app, "ex-…") → slug do catálogo
export const LEGACY_IDS = Object.fromEntries(CATALOG.filter((e) => e.legacy).map((e) => [e.legacy, e.slug]));

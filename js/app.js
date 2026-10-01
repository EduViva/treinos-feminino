// Contexto compartilhado entre telas (evita imports circulares).
export const app = {
  navigate: (path) => { location.hash = path; },
  rerender: () => {},
  startSession: () => {},
  resumeSession: () => {},
  signOut: async () => {},          // sair da conta (definido em main.js)
  importLegacy: async () => {},     // importar dados antigos deste aparelho para a conta
  installPrompt: null,
  sessionActive: false,
};

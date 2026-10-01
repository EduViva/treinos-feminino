// Contexto compartilhado entre telas (evita imports circulares).
export const app = {
  navigate: (path) => { location.hash = path; },
  rerender: () => {},
  startSession: () => {},
  resumeSession: () => {},
  installPrompt: null,
  sessionActive: false,
};

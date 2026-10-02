// Telas de edição: detecta alterações, mostra "Descartar | Salvar" e avisa antes de sair sem salvar.
//
//   const ed = editScreen({ root, read, save, saved, discard, inline, extra, sticky });
//
//   root     elemento da tela (escuta input/change/click para recalcular as alterações)
//   read()   estado atual do formulário como texto (compara com o estado salvo)
//   save()   grava; devolve true se deu certo (false = deixa a pessoa na tela, ex.: faltou o nome). NÃO navega.
//   saved()  o que fazer depois de salvar pelo botão (ex.: voltar para a lista). Opcional.
//   base     (opcional) estado considerado "salvo" ao abrir; padrão = o estado de agora
//   discard() o que fazer ao descartar (ex.: voltar para a lista; ou, em telas "inline", recarregar o formulário)
//   inline   true: Salvar/Descartar só ficam ativos quando há alterações (perfil, bem-estar)
//
// A tela registra `app.guard`; o roteador (main.js) usa isso para perguntar antes de trocar de tela.
import { h } from './util.js';
import { app } from './app.js';
import { btn, discardDialog, leaveDialog } from './ui.js';

export function editScreen({ root, read, save, saved, discard, base: base0, inline = false, sticky = true, extra = null, saveLabel = 'Salvar', discardLabel = 'Descartar' }) {
  let base = base0 ?? read(), released = false, busy = false;
  const dirty = () => !released && read() !== base;

  const note = h('div', { class: 'eb-note', 'aria-live': 'polite' });
  const bDiscard = btn(discardLabel, { kind: 'secondary', onClick: () => onDiscard() });
  const bSave = btn(saveLabel, { onClick: () => onSave() });
  const bar = h('div', { class: `editbar ${sticky ? 'sticky' : 'flat'}`, role: 'region', 'aria-label': 'Salvar ou descartar alterações' },
    note, h('div', { class: 'eb-row' }, extra, bDiscard, bSave));

  function refresh() {
    const d = dirty();
    bar.classList.toggle('dirty', d);
    note.textContent = d ? 'Alterações não salvas' : '';
    if (inline) { bSave.disabled = !d || busy; bDiscard.disabled = !d || busy; } else { bSave.disabled = busy; bDiscard.disabled = busy; }
  }
  // recalcula logo depois que o controle tratou o evento (fase de subida + microtarefa = sem atraso visível);
  // a fase de captura com timer cobre controles que interrompem a propagação
  let timer = 0;
  for (const ev of ['input', 'change', 'click', 'keyup', 'focusout']) {
    root.addEventListener(ev, () => { clearTimeout(timer); timer = setTimeout(refresh, 0); }, true);
    root.addEventListener(ev, () => queueMicrotask(refresh));
  }

  async function doSave() {
    if (busy) return false;
    busy = true; refresh();
    try {
      const ok = await save();
      if (ok) base = read();
      return !!ok;
    } finally { busy = false; refresh(); }
  }
  async function onSave() { if (await doSave() && saved) saved(); }
  async function onDiscard() {
    if (dirty() && !(await discardDialog())) return;
    released = true;           // vai sair/recarregar: não perguntar de novo
    discard();
    if (inline) { released = false; base = read(); refresh(); }
  }

  const guard = {
    owner: root,
    dirty,
    // true = pode sair (nada a salvar, ou a pessoa escolheu salvar/descartar); false = continua na tela
    async beforeLeave() {
      if (!dirty()) return true;
      const r = await leaveDialog();
      if (r === 'stay') return false;
      if (r === 'save') return doSave();
      return true;
    },
    release() { released = true; },
  };
  app.guard = guard;
  const prev = root._destroy;
  root._destroy = () => { prev && prev(); clearTimeout(timer); if (app.guard && app.guard.owner === root) app.guard = null; };

  refresh();
  return {
    bar, guard, dirty,
    base: () => base,                                 // estado salvo (para retomar um rascunho)
    check: refresh,                                   // depois de mudanças feitas por código (ex.: redesenhar a lista)
    rebase() { base = read(); released = false; refresh(); },
    save: doSave,
    leave: guard.beforeLeave,                         // para ações dentro da tela que descartariam o formulário (ex.: trocar de dia)
  };
}

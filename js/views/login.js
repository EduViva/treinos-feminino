// Entrar / criar conta / confirmar e-mail / recuperar senha.
// O código de 6 dígitos do e-mail funciona dentro do app instalado (o link abriria em outro navegador).
import { h, clear } from '../util.js';
import * as auth from '../auth.js';
import { btn, icon, iconBtn, field, segmented } from '../ui.js';

const input = (attrs) => h('input', { type: 'text', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', ...attrs });

function passwordInput({ value = '', autocomplete = 'current-password', label = 'Senha', placeholder = '' } = {}) {
  const el = h('input', { type: 'password', value, autocomplete, 'aria-label': label, placeholder, autocapitalize: 'none', autocorrect: 'off' });
  const eye = iconBtn('eye', 'Mostrar senha', () => {
    const show = el.type === 'password';
    el.type = show ? 'text' : 'password';
    eye.innerHTML = icon(show ? 'eyeoff' : 'eye');
    eye.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  });
  return { el, node: h('div', { class: 'pw' }, el, eye) };
}

// <label> de verdade (o campo de senha tem um botão dentro, então `field()` o trataria como grupo).
const labeled = (label, node, hint) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), node, hint ? h('span', { class: 'field-hint' }, hint) : null);

// mode: 'signin' | 'signup' | 'confirm' | 'forgot' | 'reset' | 'newpass'
export function authView({ mode = 'signin', email = '', onDone, notice = '' } = {}) {
  let cur = mode, mail = email, busy = false;
  const root = h('div', { class: 'auth' });
  const card = h('div', { class: 'card', style: { marginTop: '14px' } });
  root.append(
    h('div', { class: 'hero' },
      h('img', { class: 'logo', src: 'icons/icon.svg', alt: '' }),
      h('h1', null, 'Meus Treinos'),
      h('p', { class: 'muted' }, 'Seu diário inteligente de treino: registre o que realmente aconteceu e acompanhe sua evolução.')),
    card);

  const msg = h('div', { role: 'status', 'aria-live': 'polite' });
  const say = (text, ok = false) => { clear(msg); if (text) msg.appendChild(h('p', { class: ok ? 'form-ok' : 'form-error' }, text)); };
  const offlineNote = () => (navigator.onLine === false ? h('p', { class: 'form-error' }, 'Você está sem internet. Conecte-se para entrar.') : null);

  async function run(button, fn) {
    if (busy) return;
    busy = true; button.disabled = true; say('');
    try { await fn(); } catch (e) { say(auth.friendlyAuthError(e)); } finally { busy = false; button.disabled = false; }
  }
  const go = (m, extra = {}) => { cur = m; if (extra.email !== undefined) mail = extra.email; draw(extra.msg); };

  function draw(note) {
    clear(card);
    card.appendChild(msg); say(note || notice || '', !!(note || notice));
    notice = '';
    const off = offlineNote(); if (off) card.appendChild(off);
    if (cur === 'signin' || cur === 'signup') card.appendChild(segmented({ options: [['signin', 'Entrar'], ['signup', 'Criar conta']], value: cur, onChange: (v) => go(v, { email: readMail() }) }));
    ({ signin, signup, confirm, forgot, reset, newpass })[cur]();
  }
  let mailEl = null;
  const readMail = () => (mailEl ? mailEl.value.trim() : mail);

  function emailField() {
    mailEl = input({ type: 'email', autocomplete: 'email', inputmode: 'email', enterkeyhint: 'next', placeholder: 'voce@email.com', value: mail, 'aria-label': 'E-mail' });
    return field('E-mail', mailEl);
  }
  const form = (children, onSubmit) => h('form', { onSubmit: (e) => { e.preventDefault(); onSubmit(e.submitter || e.target.querySelector('button[type=submit]')); }, novalidate: true }, children);
  const submit = (label) => btn(label, { type: 'submit', size: 'lg', block: true });
  const link = (label, to, extra) => h('button', { type: 'button', class: 'link', onClick: () => go(to, { email: readMail(), ...extra }) }, label);

  function signin() {
    const pw = passwordInput();
    card.appendChild(form([emailField(), labeled('Senha', pw.node), submit('Entrar'),
      h('div', { class: 'links' }, link('Esqueci minha senha', 'forgot'))], (b) => run(b, async () => {
      mail = readMail();
      if (!mail || !pw.el.value) return say('Informe e-mail e senha.');
      try { await auth.signIn({ email: mail, password: pw.el.value }); } catch (e) {
        if (/email not confirmed/i.test(String(e.message)) || e.code === 'email_not_confirmed') return go('confirm', { email: mail, msg: 'Falta confirmar o e-mail. Digite o código que enviamos (ou toque no link do e-mail).' });
        throw e;
      }
      await onDone();
    })));
  }

  function signup() {
    const name = input({ autocomplete: 'given-name', autocapitalize: 'words', placeholder: 'Como você quer ser chamada?', 'aria-label': 'Nome', enterkeyhint: 'next' });
    const pw = passwordInput({ autocomplete: 'new-password', label: 'Senha', placeholder: 'mínimo 8 caracteres' });
    card.appendChild(form([field('Nome', name), emailField(), labeled('Senha', pw.node, 'Use pelo menos 8 caracteres.'), submit('Criar conta'),
      h('p', { class: 'muted', style: { fontSize: '13px', marginTop: '12px' } }, 'Seus treinos ficam salvos na sua conta, protegidos por login, e continuam funcionando sem internet.')], (b) => run(b, async () => {
      mail = readMail();
      if (!name.value.trim()) return say('Diga seu nome para começar.');
      if (!mail) return say('Informe seu e-mail.');
      if (pw.el.value.length < 8) return say('A senha precisa ter pelo menos 8 caracteres.');
      const r = await auth.signUp({ email: mail, password: pw.el.value, name: name.value });
      if (r.session) return onDone();
      go('confirm', { email: mail, msg: 'Conta criada! Enviamos um e-mail para confirmar. Digite o código de 6 dígitos (ou toque no link do e-mail).' });
    })));
  }

  function codeBlock(label) {
    const code = input({ inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 8, class: 'code-input', placeholder: '000000', 'aria-label': label, enterkeyhint: 'done' });
    code.addEventListener('input', () => { code.value = code.value.replace(/\D/g, '').slice(0, 8); });
    return code;
  }

  function confirm() {
    const code = codeBlock('Código de confirmação');
    card.append(
      h('h3', { style: { marginBottom: '6px' } }, 'Confirme seu e-mail'),
      h('p', { class: 'muted', style: { marginBottom: '14px' } }, `Enviamos uma mensagem para ${mail || 'o seu e-mail'}. Veja também o spam.`),
      form([field('Código do e-mail', code), submit('Confirmar'),
        h('div', { class: 'links' },
          h('button', { type: 'button', class: 'link', onClick: (e) => run(e.currentTarget, async () => { await auth.resendConfirmation(mail); say('E-mail reenviado.', true); }) }, 'Reenviar e-mail'),
          link('Já confirmei pelo link — entrar', 'signin'))], (b) => run(b, async () => {
        if (code.value.length < 6) return say('Digite o código de 6 dígitos.');
        await auth.verifyCode({ email: mail, token: code.value, type: 'signup' });
        await onDone();
      })));
    code.focus();
  }

  function forgot() {
    card.append(h('h3', { style: { marginBottom: '6px' } }, 'Recuperar senha'),
      h('p', { class: 'muted', style: { marginBottom: '14px' } }, 'Informe o e-mail da conta. Enviaremos um código para você criar uma nova senha.'),
      form([emailField(), submit('Enviar código'), h('div', { class: 'links' }, link('Voltar', 'signin'))], (b) => run(b, async () => {
        mail = readMail();
        if (!mail) return say('Informe seu e-mail.');
        await auth.requestPasswordReset(mail);
        go('reset', { email: mail, msg: 'Se existir uma conta com esse e-mail, o código chegará em instantes.' });
      })));
  }

  function reset() {
    const code = codeBlock('Código de recuperação');
    const pw = passwordInput({ autocomplete: 'new-password', label: 'Nova senha', placeholder: 'mínimo 8 caracteres' });
    card.append(h('h3', { style: { marginBottom: '6px' } }, 'Nova senha'),
      h('p', { class: 'muted', style: { marginBottom: '14px' } }, `Digite o código enviado para ${mail} e escolha a nova senha.`),
      form([field('Código do e-mail', code), labeled('Nova senha', pw.node), submit('Salvar nova senha'),
        h('div', { class: 'links' }, link('Voltar', 'signin'))], (b) => run(b, async () => {
        if (code.value.length < 6) return say('Digite o código de 6 dígitos.');
        if (pw.el.value.length < 8) return say('A senha precisa ter pelo menos 8 caracteres.');
        await auth.verifyCode({ email: mail, token: code.value, type: 'recovery' });
        await auth.updatePassword(pw.el.value);
        await onDone();
      })));
    code.focus();
  }

  // Chegou pelo link do e-mail (a sessão já existe): só falta a nova senha.
  function newpass() {
    const pw = passwordInput({ autocomplete: 'new-password', label: 'Nova senha', placeholder: 'mínimo 8 caracteres' });
    card.append(h('h3', { style: { marginBottom: '6px' } }, 'Escolha uma nova senha'),
      form([labeled('Nova senha', pw.node), submit('Salvar nova senha')], (b) => run(b, async () => {
        if (pw.el.value.length < 8) return say('A senha precisa ter pelo menos 8 caracteres.');
        await auth.updatePassword(pw.el.value);
        await onDone();
      })));
  }

  draw();
  return root;
}

// Tela de espera (primeira sincronização da conta neste aparelho).
export function splashView(text = 'Carregando sua conta…', action) {
  return h('div', { class: 'splash' },
    h('img', { class: 'logo', src: 'icons/icon.svg', alt: '', style: { width: '72px', height: '72px', borderRadius: '22px' } }),
    h('h2', { style: { marginTop: '14px' } }, text),
    action || h('div', { class: 'spin', role: 'progressbar', 'aria-label': text }));
}

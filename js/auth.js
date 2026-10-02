// Autenticação (Supabase Auth): e-mail + senha, confirmação/recuperação por link OU por código de 6 dígitos
// (o código funciona no app instalado do iPhone, onde o link abriria em outro navegador).
//
// A sessão fica no localStorage do navegador (chave "treinos-auth"). Para o app abrir OFFLINE sem esperar a
// rede, `cachedIdentity()` lê o usuário dessa sessão guardada; a renovação do token acontece em segundo plano.
import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const STORAGE_KEY = 'treinos-auth';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storageKey: STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

const redirectUrl = () => location.origin + location.pathname;

// Usuário da sessão guardada (sem rede). Retorna null se não houver sessão.
export function cachedIdentity() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (s?.user?.id) return { id: s.user.id, email: s.user.email || '' };
  } catch { /* sem sessão */ }
  return null;
}

export async function signUp({ email, password, name }) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: (name || '').trim() }, emailRedirectTo: redirectUrl() } });
  if (error) throw error;
  // Com confirmação de e-mail ligada, `session` vem nula e o usuário precisa confirmar antes de entrar.
  return { session: data.session, user: data.user, needsConfirmation: !data.session };
}
export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}
export async function signOut() { await supabase.auth.signOut({ scope: 'local' }).catch(() => {}); }
export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl() } });
  if (error) throw error;
}
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
  if (error) throw error;
}
// type: 'signup' (confirmar cadastro) | 'recovery' (recuperar senha)
export async function verifyCode({ email, token, type }) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: String(token).trim(), type });
  if (error) throw error;
  return data.session;
}
export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
export async function currentSession() { const { data } = await supabase.auth.getSession(); return data.session; }
export const onAuthChange = (fn) => supabase.auth.onAuthStateChange(fn).data.subscription;

// Mensagens em português, sem jargão.
export function friendlyAuthError(e) {
  const m = String(e?.message || e || '');
  const code = e?.code || e?.error_code || '';
  if (/failed to fetch|network|load failed|fetch failed/i.test(m) || e?.name === 'AuthRetryableFetchError') return 'Sem conexão com a internet. Tente de novo quando estiver online.';
  if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(m) || code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).';
  if (/already registered|already been registered/i.test(m) || code === 'user_already_exists') return 'Este e-mail já tem uma conta. Toque em “Entrar”.';
  if (/password should be at least|weak.?password/i.test(m) || code === 'weak_password') return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/rate limit|too many|over_email_send_rate_limit|over_request_rate_limit/i.test(m) || /rate_limit/.test(code)) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (/token has expired|otp_expired|invalid.*(token|otp)|otp.*invalid/i.test(m) || code === 'otp_expired') return 'Código inválido ou expirado. Peça um novo.';
  if (/unable to validate email|invalid.*email|email address.*invalid/i.test(m) || code === 'email_address_invalid') return 'Esse e-mail não parece válido.';
  if (/new password should be different/i.test(m)) return 'Escolha uma senha diferente da anterior.';
  if (/signups? not allowed|signup_disabled/i.test(m)) return 'Novos cadastros estão desativados no momento.';
  return m || 'Algo deu errado. Tente novamente.';
}

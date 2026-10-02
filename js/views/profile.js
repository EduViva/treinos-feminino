// Onboarding, perfil, preferências, privacidade e backup.
import { h, clear, fmtNum, fmtDate, fmtTime, dateKey, parseNum } from '../util.js';
import * as store from '../store.js';
import { app } from '../app.js';
import {
  btn, icon, pageHead, field, textInput, selectInput, numInput, readNum, openSheet, confirmDialog, toast, stepper, chips, alertDialog, details,
} from '../ui.js';
import * as auth from '../auth.js';
import * as sync from '../sync/engine.js';
import * as db from '../db.js';
import { legacySummary } from '../legacy.js';
import { syncLabel } from './common.js';

export const APP_VERSION = '1.0.0';
const OBJETIVOS = ['Hipertrofia (ganhar massa)', 'Emagrecimento', 'Condicionamento físico', 'Saúde e bem-estar', 'Força', 'Reabilitação / retorno', 'Outro'];
const NIVEIS = ['Iniciante', 'Intermediário', 'Avançado'];
const SEXOS = [['', 'Selecione'], ['Feminino', 'Feminino'], ['Masculino', 'Masculino'], ['Prefiro não informar', 'Prefiro não informar']];

function profileForm(p = {}) {
  const name = textInput(p.name || '', { placeholder: 'Como você quer ser chamada?', autocomplete: 'given-name', 'aria-label': 'Nome' });
  const age = numInput(p.age, { placeholder: 'anos' });
  const sex = selectInput(SEXOS, p.sex || '');
  const height = numInput(p.height, { placeholder: 'cm' });
  const weight = numInput(p.weight, { placeholder: 'kg' });
  const goal = selectInput([['', 'Selecione'], ...OBJETIVOS], p.goal || '');
  const level = selectInput([['', 'Selecione'], ...NIVEIS], p.level || '');
  const node = h('div', null,
    field('Nome', name),
    h('div', { class: 'two' }, field('Idade', age), field('Sexo', sex)),
    h('div', { class: 'two' }, field('Altura (cm)', height), field('Peso (kg)', weight)),
    field('Objetivo', goal), field('Nível de experiência', level));
  return {
    node,
    read: () => ({ name: name.value.trim(), age: readNum(age), sex: sex.value, height: readNum(height), weight: readNum(weight), goal: goal.value, level: level.value }),
    name,
  };
}

// ================= Onboarding =================
export function onboardingView() {
  const root = h('div');
  const form = profileForm({});
  const examples = h('input', { type: 'checkbox', checked: true });
  root.append(
    h('div', { class: 'hero' },
      h('img', { class: 'logo', src: 'icons/icon.svg', alt: '' }),
      h('h1', null, 'Meus Treinos'),
      h('p', { class: 'muted' }, 'Seu diário inteligente de treino: registre o que realmente aconteceu, entenda padrões e decida a sua evolução.')),
    h('div', { class: 'card', style: { marginTop: '14px' } },
      h('div', { class: 'row', style: { alignItems: 'flex-start' } }, h('span', { class: 'ico', style: { color: 'var(--ok)' }, html: icon('shield', 24) }),
        h('p', null, h('b', null, 'Só seus. '), 'Seus treinos ficam na sua conta, protegidos por login (ninguém mais enxerga os seus dados), e também neste aparelho — então tudo continua funcionando sem internet.'))),
    h('div', { class: 'card', style: { marginTop: '12px' } }, h('div', { class: 'card-title' }, 'Seu perfil'), form.node,
      h('p', { class: 'muted', style: { fontSize: '13px' } }, 'Serve só de contexto. As sugestões de carga usam o seu histórico real, nunca peso, altura ou sexo isoladamente. Tudo pode ser alterado depois.')),
    h('div', { class: 'card', style: { marginTop: '12px' } },
      h('label', { class: 'switch' }, h('span', null, 'Incluir treinos de exemplo', h('small', null, 'Segunda a sexta, com alongamento e mobilidade (cargas em branco). Você pode apagar ou trocar tudo.')), examples)),
    h('div', { style: { marginTop: '18px' } }, btn('Começar', { size: 'lg', block: true, onClick: async () => {
      const p = form.read();
      if (!p.name) { toast('Diga seu nome para começar.'); form.name.focus(); return; }
      await store.saveProfile(p);
      if (examples.checked && !store.state.workouts.length) {
        const n = await store.loadSeedWorkouts();
        if (!n) toast('Não consegui carregar os treinos de exemplo agora. Você pode adicioná-los depois em Treinos.');
      }
      app.applyTheme();
      toast(`Bem-vinda, ${store.firstName()}!`);
      app.navigate('/');
    } })));
  return root;
}

// ================= Perfil =================
export function profileView() {
  const st = store.state;
  const root = h('div');
  root.appendChild(pageHead('Perfil', { sub: 'Você, preferências e dados' }));

  root.appendChild(accountCard());

  const form = profileForm(st.profile || {});
  root.appendChild(h('div', { class: 'card', style: { marginTop: '12px' } }, h('div', { class: 'card-title' }, 'Seus dados'), form.node,
    btn('Salvar perfil', { onClick: async () => { const p = form.read(); if (!p.name) return toast('O nome não pode ficar vazio.'); await store.saveProfile(p); toast('Perfil salvo.'); } }),
    h('p', { class: 'muted', style: { fontSize: '13px', marginTop: '10px' } }, 'Esses dados servem de contexto. As sugestões de carga priorizam o seu histórico real de desempenho.')));

  // preferências
  const sw = (key, label, hint) => {
    const inp = h('input', { type: 'checkbox', checked: st.settings[key], onChange: () => store.saveSettings({ [key]: inp.checked }) });
    return h('label', { class: 'switch' }, h('span', null, label, hint ? h('small', null, hint) : null), inp);
  };
  const restStep = stepper({ value: st.settings.defaultRest, min: 15, max: 600, step: 15, decimals: 0, unit: 's', onChange: (v) => store.saveSettings({ defaultRest: v }) });
  const themeChips = chips({ options: [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']], value: st.settings.theme, onChange: (v) => store.saveSettings({ theme: v }) });
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Preferências'), h('div', { class: 'card' },
    sw('sound', 'Som ao fim do descanso', 'Pode exigir um toque na tela antes (regra do navegador)'),
    sw('vibration', 'Vibração', 'Quando o aparelho permitir'),
    sw('wakeLock', 'Manter a tela ligada no treino'),
    sw('autoStartSet', 'Iniciar a série automaticamente', 'Pula o botão “Iniciar série” depois do descanso'),
    h('div', { style: { marginTop: '12px' } }, field('Descanso padrão (novos exercícios)', restStep)),
    field('Tema', themeChips))));

  // instalar
  const inst = h('div');
  const drawInstall = () => {
    clear(inst);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) { inst.appendChild(h('p', { class: 'muted' }, '✓ O app já está instalado neste aparelho.')); return; }
    if (app.installPrompt) inst.appendChild(btn('Instalar na tela inicial', { ic: 'download', onClick: async () => { app.installPrompt.prompt(); await app.installPrompt.userChoice; app.installPrompt = null; drawInstall(); } }));
    inst.appendChild(details('Como instalar no celular', h('p', null, h('b', null, 'iPhone (Safari): '), 'toque em Compartilhar → “Adicionar à Tela de Início”.'),
      h('p', { style: { marginTop: '8px' } }, h('b', null, 'Android (Chrome): '), 'menu ⋮ → “Instalar app” ou “Adicionar à tela inicial”.'),
      h('p', { class: 'muted', style: { marginTop: '8px' } }, 'Depois de instalado, funciona sem internet.')));
  };
  drawInstall();
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Instalação'), h('div', { class: 'card' }, inst)));

  // dados / backup
  const status = h('p', { class: 'muted', style: { fontSize: '13.5px', marginTop: '10px' } });
  const drawStatus = async () => {
    const est = await store.storageEstimate();
    const m = store.state.meta;
    status.textContent = [
      m.lastExportAt ? `Último arquivo exportado: ${fmtDate(m.lastExportAt, { year: true })} às ${fmtTime(m.lastExportAt)}.` : 'Você ainda não exportou um arquivo de backup.',
      store.state.persisted === true ? 'Armazenamento protegido contra limpeza automática: sim.' : store.state.persisted === false ? 'Armazenamento persistente: não concedido (o navegador pode limpar dados se faltar espaço — exporte backups).' : '',
      est ? `Espaço usado: ${(est.usage / 1e6).toFixed(1)} MB.` : '',
    ].filter(Boolean).join(' ');
  };
  drawStatus();
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Dados e backup'), h('div', { class: 'card' },
    h('p', { class: 'muted', style: { marginBottom: '12px' } }, 'Para guardar seu histórico por anos, exporte um arquivo de vez em quando e guarde no seu e-mail, nuvem ou computador.'),
    h('div', { class: 'grid2' },
      btn('Exportar dados', { ic: 'download', onClick: exportSheet }),
      btn('Importar dados', { kind: 'secondary', ic: 'upload', onClick: importFile })),
    h('div', { class: 'grid2', style: { marginTop: '10px' } },
      btn('Criar backup', { kind: 'secondary', ic: 'shield', onClick: async () => { await store.createSnapshot('Manual'); toast('Backup criado neste aparelho.'); } }),
      btn('Restaurar', { kind: 'secondary', ic: 'refresh', onClick: restoreSheet })),
    status)));

  // privacidade
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Privacidade'), h('div', { class: 'card' },
    h('p', null, h('b', null, 'Onde ficam os dados? '), 'Na sua conta (nuvem, com login e proteção para que só você acesse) e em uma cópia neste aparelho, que permite usar o app sem internet.'),
    h('p', { style: { marginTop: '8px' } }, h('b', null, 'O que é enviado? '), 'Perfil, treinos, histórico, atividades, bem-estar, peso, observações e as suas fotos/vídeos de exercícios. Nada é compartilhado com outras pessoas, anúncios ou análises.'),
    h('p', { style: { marginTop: '8px' } }, h('b', null, 'Seu controle: '), 'você pode exportar um arquivo de backup, apagar todos os dados da conta ou excluir a conta a qualquer momento (na “Zona de risco”).'))));

  // perigo
  root.appendChild(h('div', { class: 'section' }, h('h2', null, 'Zona de risco'), h('div', { class: 'card' },
    h('p', { class: 'muted', style: { fontSize: '13px', marginBottom: '12px' } }, 'Estas ações valem para a sua conta (nuvem) e para este aparelho. Exige internet.'),
    btn('Apagar todos os meus dados', { kind: 'danger', ic: 'trash', block: true, onClick: eraseAll }),
    h('div', { style: { height: '10px' } }),
    btn('Excluir minha conta', { kind: 'danger', ic: 'trash', block: true, onClick: deleteAccount }))));

  root.appendChild(h('p', { class: 'muted', style: { textAlign: 'center', fontSize: '12.5px', margin: '22px 0 0' } }, `Meus Treinos v${APP_VERSION} · Ferramenta de acompanhamento pessoal. As sugestões não substituem orientação de profissional de educação física ou saúde.`));
  return root;
}

// ---- exportar ----
const inPreview = () => typeof window !== 'undefined' && !!window.claude; // visualizador de artifacts
async function saveFile(filename, blob) {
  if (inPreview()) {
    alertDialog('Download indisponível na prévia', 'Dentro do visualizador do Claude os downloads são bloqueados. Instale o app pelo endereço publicado (HTTPS) para exportar backups.');
    return 'cancel';
  }
  const file = new File([blob], filename, { type: 'application/json' });
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Backup — Meus Treinos' }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename, style: { display: 'none' } });
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
  return 'download';
}

function exportSheet() {
  const mediaCount = [...store.state.media.values()].reduce((a, l) => a + l.length, 0);
  const inc = h('input', { type: 'checkbox', checked: true });
  const s = openSheet({
    title: 'Exportar dados', className: 'compact',
    body: [h('p', { class: 'muted' }, 'Gera um arquivo .json com todo o seu histórico (perfil, treinos, sessões, atividades, bem-estar, peso, progressões).'),
      mediaCount ? h('label', { class: 'switch' }, h('span', null, `Incluir fotos e vídeos (${mediaCount})`, h('small', null, 'Pode deixar o arquivo bem grande')), inc) : null],
    footer: [btn('Cancelar', { kind: 'secondary', onClick: () => s.close() }), btn('Exportar', { onClick: async () => {
      s.close();
      try {
        const data = await store.exportAll({ includeMedia: mediaCount ? inc.checked : false });
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const res = await saveFile(`treinos-backup-${dateKey()}.json`, blob);
        if (res !== 'cancel') { await store.setMeta({ lastExportAt: Date.now() }); toast('Backup exportado.'); app.rerender(); }
      } catch (e) { alertDialog('Não foi possível exportar', e.message); }
    } })],
  });
}

// ---- importar ----
function importFile() {
  const inp = h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
  inp.addEventListener('change', async () => {
    const f = inp.files[0]; inp.remove(); if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      const sum = store.validateBackup(obj);
      importSheet2(obj, sum, f.name);
    } catch (e) { alertDialog('Arquivo inválido', e.message || 'Não consegui ler este arquivo.'); }
  });
  document.body.appendChild(inp); inp.click();
}
function importSheet2(obj, sum, fname) {
  const s = openSheet({
    title: 'Importar dados', className: 'compact',
    body: [h('p', { class: 'muted' }, `${fname} — exportado em ${fmtDate(obj.exportedAt, { year: true })}.`),
      h('div', { class: 'grid2', style: { margin: '12px 0' } }, [['Treinos', sum.treinos], ['Exercícios', sum.exercicios], ['Sessões', sum.sessoes], ['Atividades', sum.atividades], ['Bem-estar', sum.bemestar], ['Mídias', sum.midias]].map(([l, n]) => h('div', { class: 'stat' }, h('b', null, n), h('span', null, l)))),
      h('p', { class: 'muted', style: { fontSize: '13px' } }, 'Um backup interno é criado antes de qualquer mudança.')],
    footer: [
      btn('Mesclar', { kind: 'secondary', onClick: async () => { s.close(); await run('merge'); } }),
      btn('Substituir tudo', { kind: 'danger', onClick: async () => { if (await confirmDialog({ title: 'Substituir tudo?', message: 'Os dados atuais serão trocados pelos do arquivo (um backup interno é criado antes).', confirmText: 'Substituir', danger: true })) { s.close(); await run('replace'); } } }),
    ],
  });
  async function run(mode) {
    try { await store.importAll(obj, mode); app.applyTheme(); toast(mode === 'merge' ? 'Dados mesclados.' : 'Dados importados.'); app.navigate('/'); } catch (e) { alertDialog('Falha ao importar', e.message); }
  }
}

// ---- restaurar (backups internos) ----
async function restoreSheet() {
  const snaps = await store.listSnapshots();
  const list = h('div');
  const s = openSheet({ title: 'Restaurar backup', body: list, className: 'tall' });
  const draw = (arr) => {
    clear(list);
    if (!arr.length) { list.appendChild(h('p', { class: 'muted' }, 'Nenhum backup interno ainda. Toque em “Criar backup”. Backups automáticos semanais também aparecem aqui (guardo os 8 mais recentes).')); return; }
    list.appendChild(h('p', { class: 'muted', style: { marginBottom: '10px' } }, 'Backups internos não incluem fotos/vídeos (estes permanecem como estão).'));
    list.appendChild(h('div', { class: 'list' }, arr.map((r) => h('div', { class: 'li' },
      h('div', { class: 'grow' }, h('div', { class: 't' }, `${fmtDate(r.createdAt, { year: true })} ${fmtTime(r.createdAt)}`), h('div', { class: 's' }, `${r.label} · ${r.counts.sessoes} sessões · ${r.counts.treinos} treinos`)),
      btn('Restaurar', { size: 'sm', kind: 'secondary', onClick: async () => {
        if (!(await confirmDialog({ title: 'Restaurar este backup?', message: 'Os dados atuais serão substituídos (um backup do estado atual é criado antes).', confirmText: 'Restaurar', danger: true }))) return;
        await store.restoreSnapshot(r.id); s.close(); toast('Backup restaurado.'); app.navigate('/');
      } }),
      h('button', { class: 'icon-btn', 'aria-label': 'Excluir backup', html: icon('trash', 18), onClick: async () => { await store.deleteSnapshot(r.id); draw(await store.listSnapshots()); } })))));
  };
  draw(snaps);
}

// ---- conta ----
function accountCard() {
  const ident = auth.cachedIdentity();
  const email = ident?.email || '';
  const status = h('p', { class: 'muted', style: { fontSize: '13.5px', marginTop: '2px' } });
  const syncBtn = btn('Sincronizar agora', { kind: 'secondary', size: 'sm', ic: 'refresh', onClick: async () => { await sync.syncNow(); const s = sync.status; toast(s.state === 'offline' ? 'Sem internet: as alterações serão enviadas quando voltar.' : s.state === 'error' ? 'Algumas alterações não foram enviadas. Tentaremos de novo.' : 'Tudo sincronizado.'); } });
  const draw = (s) => {
    const when = s.lastSyncAt ? ` · última vez às ${fmtTime(s.lastSyncAt)}` : '';
    status.textContent = syncLabel(s) + (s.state === 'idle' ? when : '');
    syncBtn.disabled = s.state === 'syncing';
  };
  draw(sync.status);
  const card = h('div', { class: 'card' },
    h('div', { class: 'row' }, h('div', { class: 'avatar', 'aria-hidden': 'true' }, (email || store.firstName() || '?').charAt(0).toUpperCase()),
      h('div', { class: 'grow' }, h('b', null, email || 'Conta conectada'), status)),
    h('div', { class: 'row wrap', style: { marginTop: '12px' } }, syncBtn,
      btn('Sair', { kind: 'ghost', size: 'sm', ic: 'logout', onClick: () => app.signOut() })));
  card._destroy = sync.onStatus(draw);
  // dados antigos (versão sem conta) ainda neste aparelho?
  legacySummary().then((l) => {
    if (!l) return;
    const c = l.counts;
    card.appendChild(h('div', { class: 'banner info', style: { marginTop: '12px' } }, h('span', { class: 'ico', html: icon('upload', 22) }),
      h('div', { class: 'grow' }, h('b', null, 'Dados antigos neste aparelho'),
        h('p', { class: 'muted' }, `${c.treinos} treinos, ${c.sessoes} sessões, ${c.atividades} atividades, ${c.bemestar} registros de bem-estar. Importe para não perder nada.`),
        h('div', { style: { marginTop: '10px' } }, btn('Importar para minha conta', { size: 'sm', onClick: () => app.importLegacy() })))));
  }).catch(() => {});
  return card;
}

async function eraseAll() {
  if (!(await confirmDialog({ title: 'Apagar tudo?', message: 'Isso remove perfil, treinos, histórico, atividades, bem-estar, fotos e vídeos da sua conta (nuvem) e deste aparelho. Considere exportar um backup antes.', confirmText: 'Continuar', danger: true }))) return;
  if (!(await confirmDialog({ title: 'Tem certeza?', message: 'Não há como desfazer.', confirmText: 'Apagar tudo', danger: true }))) return;
  if (navigator.onLine === false) return alertDialog('Sem internet', 'Para apagar também os dados da nuvem é preciso estar online. Conecte-se e tente de novo.');
  try { await sync.eraseRemoteData(); } catch (e) { return alertDialog('Não foi possível apagar na nuvem', `${e.message}\n\nNada foi apagado deste aparelho.`); }
  await store.eraseEverything(); // também recarrega o catálogo de exercícios
  toast('Dados apagados.');
  app.navigate('/boas-vindas');
}

async function deleteAccount() {
  if (!(await confirmDialog({ title: 'Excluir sua conta?', message: 'A conta e TODOS os seus dados (nuvem e este aparelho) serão excluídos para sempre. Exporte um backup antes se quiser guardar algo.', confirmText: 'Continuar', danger: true }))) return;
  if (!(await confirmDialog({ title: 'Última confirmação', message: 'Excluir a conta definitivamente?', confirmText: 'Excluir minha conta', danger: true }))) return;
  if (navigator.onLine === false) return alertDialog('Sem internet', 'Para excluir a conta é preciso estar online.');
  try { await sync.deleteRemoteAccount(); } catch (e) { return alertDialog('Não foi possível excluir a conta', e.message); }
  await app.signOut({ purge: true, silent: true });
  toast('Conta excluída.');
}

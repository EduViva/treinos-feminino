# Arquitetura — Meus Treinos (PWA + Supabase)

> “Registrar o que realmente aconteceu, entender padrões e usar esses dados para orientar decisões futuras.”

O app continua sendo um **PWA offline-first** em JavaScript puro. A persistência principal agora é o **Supabase**
(Postgres + Auth + Storage, projeto **“App de treinos”**, organização **“App feminino”**) e o IndexedDB virou o
**cache local + fila de envio** que permite treinar sem internet. A usuária não precisa saber que o Supabase existe:
ela entra com e-mail e senha e tudo “simplesmente” aparece em qualquer aparelho.

## 1. Decisões e por quê

| Tema | Decisão | Motivo |
|---|---|---|
| Tecnologia | HTML + CSS + **JavaScript puro (ES modules)**, sem framework e sem build do app | Manutenção simples, deploy em qualquer host estático (GitHub Pages) |
| Banco | **Supabase / Postgres 17**, schema relacional normalizado, migrations versionadas em `supabase/migrations` | Multiusuário, escala para 10.000+ contas, SQL e RLS auditáveis |
| Segurança | **Row Level Security em todas as tabelas** + papéis como dados (RBAC) | Uma aluna nunca enxerga dados de outra; instrutor só vê alunas vinculadas e só o que elas liberaram |
| Cliente → banco | `@supabase/supabase-js` **empacotado em `js/vendor/supabase.js`** (esbuild) e servido pela própria origem | O app abre offline (service worker), sem CDN |
| Chave no navegador | Somente a **publishable key** (`js/config.js`) | É pública por desenho; quem protege é o RLS. A `service_role`/secret **nunca** entra no repositório |
| Offline | IndexedDB por usuária (cache) + **outbox** de operações pendentes + sincronização incremental | Treino funciona sem sinal e sincroniza quando a internet volta |
| Catálogo | 334 exercícios **globais, somente leitura**, no Postgres; “minha versão” é um exercício próprio | Catálogo único e sem duplicatas; personalização nunca altera o global |
| Ilustrações | **Motor próprio de figura feminina em SVG** (esqueleto cinemático + IK) | Mesma identidade em todos os exercícios, animação leve, sem arquivos de mídia, 100% offline |
| Cronômetros | Baseados em **carimbos de tempo** (`Date.now()`), não em contadores | Resistem a tela bloqueada, segundo plano e recarga |
| Progressão | Módulo **puro** (`progression.js`) com decisão + explicação + dados | Testável; nunca altera nada sozinho; nunca inventa dados |

## 2. Estrutura

```
index.html · manifest.webmanifest · sw.js
css/app.css                      design system (claro/escuro) + modo treino + login/sync/buscador
js/
  main.js                        boot em fases (login → app), roteador (hash), nav, tema, SW
  config.js                      URL e publishable key do Supabase (públicas)
  auth.js                        login, cadastro, código por e-mail, recuperação de senha, sessão em cache
  db.js                          IndexedDB (um banco por usuária: treinos-feminino-u-<uid>)
  store.js                       estado em memória + persistência local + fila de envio + backup
  sync/
    engine.js                    outbox, envio idempotente, pull incremental, mídia, backoff, status
    mappers.js                   modelo do app ⇄ linhas do Postgres
    uuid.js                      uuid v4/v5 (ids determinísticos do catálogo)
  edit.js                        telas de edição: "Descartar | Salvar", detecção de alterações, aviso ao sair sem salvar
  legacy.js                      importa os dados da versão antiga (sem conta) para a conta
  search.js                      busca por relevância (sem acento, sinônimos, filtros, favoritos)
  data/taxonomy.js               grupos, equipamentos, tipos, níveis, papéis e permissões (fonte única)
  data/legacy-map.js             GERADO: ids antigos ("ex-…") → ids do catálogo
  data/wellbeing.js              Bem-estar: perguntas, respostas, ícones SVG (um por resposta) e a cor pastel de cada pergunta
  data/seed.js                   treinos de exemplo e constantes
  session.js · progression.js · stats.js · importer.js · charts.js · ui.js · visual.js
  figure/                        motor de ilustração (rig, kit, arts, scene)
  vendor/supabase.js             supabase-js empacotado (gerado por `npm run vendor`)
  views/                         login, home, workouts, exercises, finder (buscador), session, evolution,
                                 calendar, wellbeing, activities, profile, suggestion, common
supabase/
  migrations/*.sql               schema, RLS, RBAC, Storage, dados de referência (ordem cronológica)
  catalog/*.mjs                  FONTE do catálogo (334 exercícios) + validador + gerador de SQL
  seed.sql                       GERADO a partir de catalog/ (idempotente)
  tests/rls_multiuser.sql        85 verificações de segurança, rodam numa transação sempre revertida
  config.toml                    configuração do Supabase CLI (opcional)
tests/unit   (node --test)       progressão, estatísticas, importador, catálogo, seed, busca, mappers, legado, Bem-estar (ícones/cores)
tests/e2e    (Playwright)        fluxos em celular; `fake-supabase.mjs` simula Auth/REST/Storage + RLS
scripts/                         serve, stamp-sw, make-icons, vendor, build-seed, db-test
```

## 3. Banco de dados (Supabase)

### 3.1 Tabelas (schema `public`, todas com RLS ligado)

| Domínio | Tabelas |
|---|---|
| Identidade e papéis | `profiles` (1:1 com `auth.users`, criado por trigger), `roles`, `permissions`, `role_permissions`, `user_roles` (papel por usuária, opcionalmente dentro de uma academia) |
| Academias e vínculos | `organizations` (academia), `instructor_students` (instrutor ↔ aluna, `status`, `scopes` liberados pela aluna) |
| Catálogo | `exercises`, `exercise_secondary_muscles`, `exercise_media`, `muscle_groups`, `equipment_types`, `exercise_types`, `user_exercise_prefs` (favorito, arquivado, notas, padrões e mídia principal **por usuária**) |
| Treinos | `workouts`, `workout_exercises` |
| Execução | `workout_sessions`, `session_exercises`, `session_sets` (planejado × alvo × realizado) |
| Registros | `activities`, `wellbeing_entries`, `body_weights`, `progression_suggestions` |

Convenções: ids `uuid`; toda tabela privada tem `user_id` (dono); tabelas-filhas repetem o `user_id` e uma
**FK composta** garante que ele é igual ao do pai; `updated_at` é preenchido por **trigger no servidor**
(é o cursor da sincronização, imune a relógio errado do celular); `deleted_at` (soft delete) onde a exclusão
precisa chegar aos outros aparelhos; todas as FKs têm índice.

### 3.2 Papéis, academias e instrutores (preparado, sem tela ainda)

* **Papéis são dados**: `student` (padrão, atribuído no cadastro), `instructor` e `admin` estão em `roles`;
  novos papéis/permissões entram por `insert`, sem mexer no schema. `has_permission()` consulta
  `user_roles → role_permissions`.
* **Academia → vários instrutores → várias alunas**: `organizations` + `user_roles.organization_id`
  (instrutor numa academia) + `instructor_students` (vínculo individual).
* **A aluna manda no que compartilha**: `instructor_students.scopes` ∈ `workouts:read`, `workouts:write`,
  `sessions:read`, `activities:read`, `wellbeing:read`, `body:read`. Dados sensíveis (ciclo, humor, peso) só com
  opt-in explícito. Instrutor **lê** treinos/histórico/atividades vinculados e, com `workouts:write`, monta treinos
  para a aluna (autoria carimbada pelo servidor e imutável). Nunca altera sessões.
* Funções auxiliares ficam no schema `private` (`security definer`, `search_path=''`), fora da API pública.

### 3.3 RLS (resumo)

* Aluna: `user_id = (select auth.uid())` em tudo (o `select` envolvente faz o Postgres avaliar uma vez por consulta).
* Catálogo e tabelas de referência: **leitura** para qualquer usuária autenticada; escrita só `admin`.
* Exercício personalizado: só o dono lê/escreve; nunca altera o global (`origin = 'custom'`, `parent_exercise_id` guarda de qual veio).
* Instrutor: apenas via vínculo `active` + escopo. O instrutor **convida** (`pending`) ou a aluna escolhe um instrutor; **só a aluna** aceita, altera escopos e encerra (`links_update_by_student`); a trigger `guard_link_update` torna instrutor/aluna imutáveis no vínculo.
* Storage: `catalog-media` (público, só admin escreve) e `user-media` (privado, **pasta por usuária**: `<uid>/…`).
* RPCs da própria usuária: `erase_my_data()` (apaga tudo, mantém a conta) e `delete_my_account()` (cascata).
  O aviso do advisor sobre `delete_my_account` ser executável por `authenticated` é **intencional**.

### 3.4 Catálogo global (334 exercícios)

* Fonte única em `supabase/catalog/*.mjs` (um arquivo por região do corpo) com validação
  (`validate.mjs`: sem duplicatas de nome/slug/alias, grupos/equipamentos/tipos existentes, campos obrigatórios).
* `scripts/build-seed.mjs` gera `supabase/seed.sql` e a migration de dados de referência. Os **ids são determinísticos**
  (uuid v5 do slug), então o seed é idempotente (`on conflict do update`) e o app calcula o mesmo id sem consultar o banco.
* Campos: nome, sinônimos (`aliases`), grupo principal, músculos secundários, equipamento (18), tipo (5: musculação, cardio,
  funcional, alongamento, mobilidade), instruções, dicas, nível, ativo/inativo, padrões, mídia (`exercise_media`), origem, datas.
* `search_text` (nome + sinônimos + grupo + equipamento, sem acento) com `pg_trgm` para busca rápida no servidor.
* Mídia (foto/vídeo/animação) fica no **Storage**, referenciada por `exercise_media` — nunca dentro das tabelas.
  Hoje as ilustrações vêm do motor SVG (`art_key`); fotos/vídeos reais entram sem mudar o schema.

### 3.5 Reproduzir o banco do zero

```bash
# Supabase CLI (opcional):  supabase db reset        → aplica migrations/*.sql e depois seed.sql
# Ou, em projeto vazio, aplique na ordem:  supabase/migrations/*.sql  e  supabase/seed.sql
npm run catalog:build      # regenera seed.sql + migration de referência + js/data/legacy-map.js
npm run catalog:check      # falha (CI) se algum arquivo gerado estiver desatualizado
npm run db:test            # 85 testes de segurança no banco (transação revertida)
```

`npm run db:test` usa a Management API (`SUPABASE_ACCESS_TOKEN`) ou, com `DATABASE_URL=postgres://…`, qualquer Postgres via `psql`.

## 3b. Sincronização offline-first

```
tela → store.js ──grava──▶ IndexedDB (cache)  ──enfileira──▶ outbox ──(online)──▶ Supabase
                                  ▲                                                  │
                                  └─────── pull incremental (updated_at ≥ cursor) ◀──┘
```

* **Escrita local primeiro**: toda ação (treino, série, favorito…) grava no IndexedDB e na `outbox`; a tela não espera a rede.
* **Envio** idempotente (`upsert` por id) em ordem de dependência de FK:
  perfil → exercício → mídia → preferências → treino → sessão → atividade → bem-estar → peso → sugestão.
  Falha de rede → *backoff* exponencial e nova tentativa ao voltar a internet / reabrir o app; erro de FK recupera sozinho.
* **Pull incremental** por tabela: `updated_at ≥ cursor − 2 min`. O cursor vem **só de timestamps do servidor**.
  Alterações locais ainda pendentes **vencem** sobre o que veio do servidor (nada é sobrescrito por dado velho).
* **Exclusões** viram `deleted_at` e se propagam; mídia sobe/baixa do Storage sob demanda.
* **Indicador** discreto no topo (“Sincronizado”, “Sincronizando…”, “Sem internet · N pendentes”, “Erro”) e botão “Sincronizar agora” no Perfil.
* **Um IndexedDB por usuária** (`treinos-feminino-u-<uid>`): trocar de conta no mesmo aparelho nunca mistura dados.
* **Sem internet na primeira vez** neste aparelho: o app pede conexão (não há o que mostrar ainda). Depois disso abre offline,
  usando a identidade em cache (`treinos-auth` no localStorage) até a internet voltar.

### Autenticação
E-mail + senha (mínimo 8). Confirmação e recuperação por **código de 6 dígitos** digitado no próprio app
(funciona no PWA instalado do iPhone, onde o link do e-mail abriria no Safari). PKCE; sessão persistida e renovada sozinha.
> O SMTP padrão do Supabase é limitado (poucos e-mails por hora, só para o time do projeto em alguns planos). Para
> produção, configure um **SMTP próprio** em *Authentication → SMTP* — sem isso o cadastro de novas usuárias pode falhar por limite.

### Dados da versão antiga (sem conta)
No primeiro login, se existir o banco local antigo (`treinos-feminino`), o app **oferece importar** para a conta:
treinos, sessões, atividades, bem-estar, pesos, exercícios próprios e mídias; ids antigos de exercícios padrão
(`ex-…`) são convertidos para o catálogo novo (`legacy-map.js`); depois de sincronizar, o banco antigo é apagado do aparelho.

## 4. Modo treino (máquina de estados — `session.js`)

```
Iniciar treino ──▶ READY (1º exercício já iniciado)
OVERVIEW ⇄ INTRO → READY → RUNNING → REST ─┬→ READY (próxima série)
                                           ├→ INTRO (próximo exercício)
                                           └→ FINISH → SUMMARY (salva no histórico)
```

* **“Iniciar treino” já inicia o 1º exercício** (`Session.begin()`): vai direto para a série 1, sem passar por “Iniciar exercício”. Como a apresentação (INTRO) é pulada, a 1ª série mostra o que ela mostraria: sugestão de progressão, observação e “Como fazer”. Entre exercícios a INTRO continua (é o momento de ir ao aparelho). Com “Iniciar a série automaticamente” ligado, o treino começa já na série em andamento.
* **Série em andamento (RUNNING):** exercício **por tempo** (prancha, alongamento, cardio) mostra a contagem regressiva e o botão **“Terminei”**; exercício **por repetição** não mostra cronômetro (o tempo da série continua sendo gravado) e o botão é **“Descansar”**, que encerra a série e começa o descanso. Na **última série do treino** não há descanso (`Session.finishesWorkout`), então o botão continua “Terminei” e a tela seguinte é “Finalizar treino”.
* Rascunho salvo a cada evento (`kv.activeSession`) → reabrir o app retoma exatamente de onde parou.
* Descanso: `endsAt` em timestamp; `+15s`, `+30s`, `EDITAR`, `PULAR`; ao zerar: flash + som + vibração; o tempo **realmente** descansado é gravado (`restActual`).
* Tela ligada durante o treino (Screen Wake Lock, configurável).
* Durações gravadas: treino, cada exercício, cada série, cada descanso e total de descanso.

## 5. Progressão (`progression.js`)

Conservadora e explicável. Só sugere quando **todos** os critérios abaixo passam, sempre com dados reais:

1. ≥ 3 sessões **consecutivas** com a mesma carga;
2. todas as séries nas repetições **planejadas** nessas sessões;
3. sessões distribuídas em ≥ 5 dias;
4. esforço médio ≤ “Moderado” e nenhuma série “muito difícil” na última; RIR médio ≥ 1 (quando registrados);
5. sem sinais de fadiga (como se sentiu / fadiga do bem-estar);
6. repetições não caíram; última sessão há ≤ 21 dias.

Resultados: `suggest` (testar +passo), `hold` (“por enquanto, não recomendamos…” + motivos reais),
`insufficient` (“Dados insuficientes para sugerir uma progressão com confiança.” + contagem real) ou `na` (peso corporal/tempo).
A tela sempre responde: **O que está sugerindo? Por que? Quais dados? Posso ignorar?** e oferece Aceitar / Alterar / Ignorar. Nada é aplicado sozinho.
Peso, altura e sexo **não** entram no cálculo.

## 6. Mídia e animações

* Prioridade: animação instrucional → sequência de 4 quadros → mídia própria → imagem estática (a usuária pode definir a mídia própria como principal).
* Animação: início → movimento → fim → retorno (hold 0,75 s + 1,9 s por trecho), câmera lenta 0,5×, pausa, trajetória tracejada com seta, músculos principais (coral) e secundários (âmbar), legenda por fase.
* `prefers-reduced-motion` abre direto em quadros.
* Fotos são reduzidas (máx. 1600 px); vídeos entram como estão (aviso acima de 60 MB). Substituir/excluir mídia **não** afeta o histórico.

## 6b. Tela Bem-estar (design)
Cada pergunta é um painel com a **sua cor pastel** (`css/app.css`, `.wq[data-hue]`: rosa, amarelo, verde, lilás, pêssego, azul e areia, com versão para o tema escuro) e as respostas são **botões com ícone + rótulo**.
A cor só identifica a *pergunta*; a *resposta* é a forma do ícone (rosto, bateria que enche, olho que fecha, medidor, anel, gotas), e o botão escolhido muda de "claro" para "cheio", então nada depende só da cor.
O E2E mede o contraste renderizado nos dois temas (rótulo escolhido ≥ 4,5:1, ícones ≥ 3:1, títulos ≥ 4,5:1).

## 6c. Telas de edição (Salvar / Descartar)

Toda tela em que se muda algo tem **Descartar** e **Salvar** à vista e **nada é gravado antes de salvar**:

| Tela | Como funciona |
|---|---|
| Editor de treino, editor de exercício | barra fixa acima do menu (`js/edit.js`); as mudanças ficam num rascunho na tela; Salvar grava e volta para a lista; Descartar volta sem gravar |
| Perfil (“Seus dados”), Bem-estar | “inline”: Salvar/Descartar só ficam ativos quando há alterações; Descartar recarrega o que estava salvo; no Bem-estar, trocar de dia com alterações pergunta antes |
| Folhas (atividade, peso, exercício do treino, “Ajustar” do treino, descanso) | rodapé com Descartar | Salvar (ou Aplicar); fechar no X, no fundo ou com Esc, **com dados digitados**, pede confirmação (`openSheet({ guard })`) |
| Resultado da série (descanso) e resumo do treino | rascunho + Descartar | Salvar; o resumo mostra “Descartar alterações” quando a sensação/observação foi mexida (o treino já está no histórico) |

* **Aviso ao sair** — `editScreen()` registra `app.guard`; como toda navegação do app é por hash (abas, setas de voltar, `app.navigate`, botão voltar do aparelho), o roteador (`main.js`) intercepta o `hashchange`: com alterações, volta para a tela (`history.go`, sem bagunçar o histórico) e pergunta **Salvar / Descartar / Continuar editando**. `beforeunload` cobre fechar a aba. A sincronização não recria a tela enquanto há alterações.
* **Rascunho que atravessa telas** — no editor de treino, “Criar exercício” e “Ver animação” guardam o rascunho em memória (`app.stagedWorkout`) e o editor o retoma na volta; o exercício criado entra no rascunho, não no treino salvo.
* Preferências do Perfil (interruptores, descanso padrão, tema) continuam valendo na hora, como configurações.

## 7. Offline

`sw.js` pré-carrega todos os arquivos (`scripts/stamp-sw.mjs` gera a lista + versão por hash). Cache-first, sem chamadas a terceiros. Nova versão → instalada em segundo plano e usada na próxima abertura.

## 8. Backup

Os dados já ficam na conta. O backup em arquivo continua disponível como **cópia extra**:

* **Exportar** (`.json`, com ou sem mídia; menu Compartilhar no celular) / **Importar** (mesclar ou substituir, validando o arquivo).
  O arquivo não inclui o catálogo global (só exercícios próprios, preferências e dados da usuária).
* **Backup / Restaurar** internos: instantâneo manual, semanal automático e “antes de importar/restaurar”.
* O Início só avisa algo se houver alterações que **não conseguiram ser enviadas**.

## 9. Privacidade

* Os dados ficam na conta da usuária (Postgres com RLS) e em uma cópia no aparelho para uso offline. Nada é vendido, nada é compartilhado com outras usuárias.
* Sem análises, anúncios ou bibliotecas de terceiros: o app só carrega arquivos da própria origem e conversa apenas com o projeto Supabase.
* Dados sensíveis (peso, ciclo, humor, fadiga, observações) só seriam visíveis a um instrutor com **autorização explícita** da própria aluna (`wellbeing:read` / `body:read`).
* Perfil → *Zona de risco*: **Apagar todos os meus dados** (nuvem + aparelho) e **Excluir minha conta**.

## 10. Testes

| Camada | Comando | O que cobre |
|---|---|---|
| Unitários | `npm test` | progressão, estatísticas, importador, catálogo (dados válidos), seed em dia, busca, mappers, importação de dados antigos |
| Segurança no banco | `npm run db:test` | RLS/RBAC/Storage: aluna A × B, instrutor vinculado × não vinculado, escopos, admin, catálogo somente leitura, `erase_my_data` |
| E2E | `npm run e2e` | `run`/`run2` (fluxos originais do app, adaptados), `edit` (Salvar/Descartar em todas as telas, aviso ao sair, rascunho do treino), `cloud` (login, sincronização, offline, dois aparelhos, **segunda usuária só vê o que é dela**), `legacy` (migração de dados antigos) |

Os E2E usam um **Supabase simulado em processo** (`tests/e2e/fake-supabase.mjs`: Auth, REST com filtros do PostgREST, Storage,
emulação de RLS e FKs) interceptando a rede do navegador — rápido, determinístico e sem tocar no banco real.
A garantia de segurança **de verdade** vem do `db:test`, que roda contra o Postgres do projeto.
O CI (`.github/workflows/pages.yml`) roda `catalog:check`, `npm test` e `npm run e2e` antes de publicar.

> Ambientes com restrição de rede (como o sandbox em que isto foi desenvolvido) precisam liberar o host
> `bdwrqpiwrrkbtxeuvaem.supabase.co` para que o app/testes falem com a API real.

## 11. Limites conhecidos

* PWAs não tocam alarme com a **tela bloqueada**: por isso o app mantém a tela ligada no treino (Wake Lock). Se o aparelho bloquear, o alerta dispara ao voltar.
* iPhone não permite vibração por web.
* Conflito entre aparelhos: vale a última alteração enviada por registro (`updated_at` do servidor); sessões de treino realizadas são imutáveis, então não colidem.
* A área do instrutor tem **banco, RLS e testes prontos**, mas ainda não tem telas.

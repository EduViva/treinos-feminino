# Meus Treinos 🏋️‍♀️

Diário inteligente de treinos para celular (PWA): **treino planejado × realizado**, cronômetros, histórico, evolução, progressão explicada, atividades e bem-estar.
Funciona **offline**, instala na tela inicial e guarda tudo na **sua conta** (Supabase, protegida por login e Row Level Security), sincronizando sozinho quando há internet.

## Instalar no celular

O app precisa ser servido por **HTTPS** para poder ser instalado (é uma regra dos navegadores). Opções simples:

### A) GitHub Pages (já configurado)
1. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Faça merge desta branch na `main` (ou rode o workflow **Publicar app** manualmente em *Actions*).
3. Abra `https://<seu-usuario>.github.io/treinos-feminino/` no celular.
   * **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*.
   * **Android (Chrome):** menu ⋮ → *Instalar app*.

> Páginas em repositórios privados exigem plano pago do GitHub. Alternativa gratuita: qualquer host estático
> (Netlify Drop, Cloudflare Pages, Vercel…) — basta publicar o conteúdo da pasta, sem build.

### B) Testar localmente
```bash
npm run serve        # http://localhost:8080
```
`localhost` conta como seguro, então o service worker e o modo offline funcionam no computador.

## Primeiros passos
0. **Crie sua conta** (nome, e-mail e senha) e confirme o e-mail digitando o código de 6 dígitos que chega na caixa de entrada. Se você já usava a versão antiga (sem conta), o app oferece **importar** seus treinos e histórico no primeiro acesso.
1. Preencha o **perfil** (ou deixe só o nome).
2. Escolha **treinos de exemplo** (editáveis) ou crie/importe os seus: *Treinos → ⋯ → Importar lista de texto* aceita algo como  
   `Treino A - Pernas` / `Leg press 4x12 80kg 90s` / `Extensora 3x15 30kg`.
3. Toque em **Iniciar treino**. Em cada série: *Iniciar série → Terminei → descanso → próxima*.
4. Mudou a carga? **Usar somente hoje** não mexe no plano; **Tornar novo padrão** atualiza o plano.
5. Seus dados já ficam na conta; o **backup** em arquivo (Perfil → Exportar dados) é uma cópia extra opcional.
6. Busque exercícios no catálogo (**334** exercícios, com sinônimos): digite “supino”, filtre por grupo, equipamento, tipo ou nível e toque na ★ para favoritar.

## Desenvolvimento

```bash
npm ci               # instala supabase-js e esbuild (só para gerar o vendor e os scripts)
npm run serve        # servidor estático (sem dependências)
npm test             # testes unitários
npm run e2e          # E2E em Chromium mobile com Supabase simulado (requer Playwright)
npm run db:test      # 85 testes de segurança (RLS) no Postgres do projeto — transação sempre revertida
npm run catalog:build   # regenera seed.sql + dados de referência a partir de supabase/catalog/
npm run catalog:check   # confere se os arquivos gerados estão em dia (CI)
npm run vendor       # reempacota o supabase-js em js/vendor/supabase.js
npm run stamp        # atualiza a lista de pré-cache e a versão do sw.js  ← rode antes de publicar
npm run icons        # regera os PNGs dos ícones a partir de icons/*.svg
```

> **Depois de alterar qualquer arquivo do app, rode `npm run stamp`** (o workflow do GitHub Pages já faz isso) — é o que faz o service worker entregar a versão nova.

### Supabase
* Projeto: **“App de treinos”**, organização **“App feminino”** (ref `bdwrqpiwrrkbtxeuvaem`). `js/config.js` guarda só a URL e a *publishable key* (públicas por desenho). **Nunca** coloque a `service_role`/secret key no repositório.
* Banco: `supabase/migrations/*.sql` (schema, RLS, papéis, Storage) + `supabase/seed.sql` (catálogo). Para recriar do zero: `supabase db reset` (CLI) ou aplique as migrations em ordem e depois o seed.
* Auth: em *Authentication → URL Configuration*, mantenha a Site URL do GitHub Pages e `http://localhost:8080/**` nas URLs permitidas. O SMTP padrão do Supabase tem limite baixo de e-mails por hora — **configure um SMTP próprio** antes de abrir o cadastro para muitas pessoas.
* Rede: quem desenvolve atrás de proxy/firewall precisa liberar `bdwrqpiwrrkbtxeuvaem.supabase.co`.

Arquitetura, modelo de dados, progressão e decisões: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Aviso
Ferramenta de acompanhamento pessoal. As sugestões de progressão se baseiam apenas no seu histórico registrado e **não** substituem orientação de profissional de educação física ou de saúde. Registros de bem-estar/ciclo mostram padrões descritivos dos seus dados, sem causalidade nem diagnóstico.

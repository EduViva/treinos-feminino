# Meus Treinos 🏋️‍♀️

Diário inteligente de treinos para celular (PWA): **treino planejado × realizado**, cronômetros, histórico, evolução, progressão explicada, atividades e bem-estar.
Funciona **offline**, instala na tela inicial e guarda tudo **somente no seu aparelho**.

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
1. Preencha o **perfil** (ou deixe só o nome).
2. Escolha **treinos de exemplo** (editáveis) ou crie/importe os seus: *Treinos → ⋯ → Importar lista de texto* aceita algo como  
   `Treino A - Pernas` / `Leg press 4x12 80kg 90s` / `Extensora 3x15 30kg`.
3. Toque em **Iniciar treino**. Em cada série: *Iniciar série → Terminei → descanso → próxima*.
4. Mudou a carga? **Usar somente hoje** não mexe no plano; **Tornar novo padrão** atualiza o plano.
5. Faça um **backup** (Perfil → Exportar dados) de vez em quando.

## Desenvolvimento

```bash
npm run serve    # servidor estático (sem dependências)
npm test         # testes unitários (progressão, estatísticas, importador)
npm run e2e      # E2E em Chromium mobile (requer Playwright instalado)
npm run stamp    # atualiza a lista de pré-cache e a versão do sw.js  ← rode antes de publicar
npm run icons    # regera os PNGs dos ícones a partir de icons/*.svg
```

> **Depois de alterar qualquer arquivo do app, rode `npm run stamp`** (o workflow do GitHub Pages já faz isso) — é o que faz o service worker entregar a versão nova.

Arquitetura, modelo de dados, progressão e decisões: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Aviso
Ferramenta de acompanhamento pessoal. As sugestões de progressão se baseiam apenas no seu histórico registrado e **não** substituem orientação de profissional de educação física ou de saúde. Registros de bem-estar/ciclo mostram padrões descritivos dos seus dados, sem causalidade nem diagnóstico.

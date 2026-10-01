# Arquitetura — Meus Treinos (PWA)

> “Registrar o que realmente aconteceu, entender padrões e usar esses dados para orientar decisões futuras.”

## 1. Decisões e por quê

| Tema | Decisão | Motivo |
|---|---|---|
| Tecnologia | HTML + CSS + **JavaScript puro (ES modules)**, sem build e sem dependências de runtime | Privacidade (nada externo), funcionamento offline garantido, manutenção simples, deploy em qualquer host estático |
| Armazenamento | **IndexedDB** (inclui fotos/vídeos como `Blob`) + `navigator.storage.persist()` | Dados grandes e estruturados, persistem ao fechar o app; o navegador é solicitado a não limpar |
| Offline | **Service worker** cache-first com lista de pré-cache gerada (`npm run stamp`) | Treino funciona sem internet; cada versão tem hash próprio |
| Ilustrações | **Motor próprio de figura feminina em SVG** (esqueleto cinemático + IK) | Mesma modelo/identidade em todos os exercícios, animação em loop leve, sem arquivos de mídia, 100% offline |
| Cronômetros | Baseados em **carimbos de tempo** (`Date.now()`), não em contadores | Resistem a tela bloqueada, app em segundo plano e recarga |
| Progressão | Módulo **puro** (`progression.js`) que devolve decisão + explicação + dados | Testável; nunca altera nada sozinho; nunca inventa dados |
| Gráficos | SVG próprio (linha 2px, barras ≤ 24px, grade hairline, legenda, tooltip, tabela) | Sem bibliotecas; acessível; paleta validada para daltonismo |

## 2. Estrutura

```
index.html · manifest.webmanifest · sw.js
css/app.css                      design system (claro/escuro) + modo treino
js/
  main.js                        boot, roteador (hash), barra de navegação, tema, SW
  app.js                         contexto compartilhado (evita imports circulares)
  db.js                          IndexedDB (stores, helpers)
  store.js                       estado em memória + persistência + backup/importação
  session.js                     MOTOR da sessão de treino (sem DOM)
  progression.js                 motor de progressão explicável (puro)
  stats.js                       agregações (puras)
  importer.js                    texto → treinos estruturados
  charts.js                      gráficos SVG
  ui.js · visual.js              componentes; animação/mídia do exercício
  data/seed.js                   biblioteca inicial (editável) e constantes
  figure/
    rig.js                       figura feminina (vista lateral e frontal), IK, destaque muscular
    kit.js                       peças de aparelhos (pads, pilhas de pesos, anilhas, cabos)
    arts.js                      21 cenas: poses inicial/final + aparelho + dicas por fase
    scene.js                     render, trajetória (setas), player em loop, modo quadros
  views/                         home, workouts, exercises, session, evolution, calendar,
                                 wellbeing, activities, profile, suggestion, common
tests/unit  (node --test)        progressão, estatísticas, importador
tests/e2e   (Playwright)         fluxos completos em viewport de celular, offline, persistência
scripts/                         serve.mjs, stamp-sw.mjs, make-icons.mjs
```

## 3. Modelo de dados (IndexedDB `treinos-feminino`, v1)

| Store | Conteúdo |
|---|---|
| `kv` | `profile`, `settings`, `meta`, `activeSession` (rascunho do treino em andamento) |
| `exercises` | biblioteca: nome, grupo, secundários, aparelho, instruções, padrões (séries/reps/carga/descanso/passo), unidade (reps/seg), `art`, mídia principal, arquivado |
| `workouts` | planos (A, B, C…): itens `{exerciseId, sets, reps, load, rest, notes}` em ordem |
| `sessions` | **treino realizado** — registro imutável com *snapshot* do plano |
| `activities` | corrida, caminhada, bike, vôlei, ping-pong, outras (campos adaptáveis) |
| `wellbeing` | um registro por dia: menstruação/início do ciclo, humor, energia, cansaço, fadiga, recuperação, nota |
| `weights` | peso corporal por data |
| `suggestions` | sugestão de progressão + decisão (aceita/alterada/ignorada) + nova carga + data + resultado |
| `media` | fotos/vídeos do usuário (`Blob`) associados a um exercício |
| `backups` | instantâneos internos restauráveis (8 mais recentes) |

### Planejado × realizado (princípio central)

Cada exercício dentro de uma `session` guarda três níveis, que nunca se sobrescrevem:

```
planned  → o que o treino dizia ao iniciar (snapshot imutável)
target   → o alvo DE HOJE (pode ser ajustado)  + changes[] com escopo
sets[]   → o que REALMENTE aconteceu: carga/reps realizadas, planejadas, alvo,
           início/fim, duração, descanso planejado × realizado, esforço, RIR
```

* **[USAR SOMENTE HOJE]** altera apenas `target` (e registra em `changes`).
* **[TORNAR NOVO PADRÃO]** altera `target` **e** o item do treino (`workouts`), com `scope: 'default'`.
* Apagar/editar treinos ou exercícios nunca toca nas `sessions` (exercícios com histórico são **arquivados**, não apagados).

## 4. Modo treino (máquina de estados — `session.js`)

```
OVERVIEW ⇄ INTRO → READY → RUNNING → REST ─┬→ READY (próxima série)
                                           ├→ INTRO (próximo exercício)
                                           └→ FINISH → SUMMARY (salva no histórico)
```

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

## 7. Offline

`sw.js` pré-carrega todos os arquivos (`scripts/stamp-sw.mjs` gera a lista + versão por hash). Cache-first, sem chamadas a terceiros. Nova versão → instalada em segundo plano e usada na próxima abertura.

## 8. Backup

* **Exportar** (`.json`, com ou sem mídia; usa o menu Compartilhar no celular) / **Importar** (mesclar ou substituir, validando o arquivo).
* **Backup / Restaurar** internos: instantâneo manual, semanal automático e “antes de importar/restaurar”.
* Lembrete no Início quando passam 30 dias sem exportar.

## 9. Privacidade

Nenhum dado sai do aparelho. Sem contas, servidores, análises, fontes ou bibliotecas externas (verificado: o app só carrega arquivos da própria origem).
Dados mais sensíveis (peso, ciclo, humor, fadiga, observações) ficam no mesmo armazenamento local e entram no backup apenas quando a usuária exporta.

## 10. Limites conhecidos

* PWAs não conseguem tocar alarme com a **tela bloqueada**: por isso o app mantém a tela ligada no treino (Wake Lock). Se o aparelho bloquear, o alerta dispara ao voltar.
* iPhone não permite vibração por web.
* Armazenamento é por navegador/aparelho: trocar de celular exige exportar/importar o backup.

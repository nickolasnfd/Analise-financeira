# AGENTS.md — Constituição do Projeto

> **O que é este arquivo:** a fonte de verdade do projeto. Claude Code, Antigravity e ferramentas compatíveis com a convenção AGENTS.md leem este arquivo automaticamente no início de cada sessão. Specs de feature (em `/specs`) NUNCA podem contradizer este arquivo — se um conflito surgir, este arquivo é atualizado primeiro, conscientemente.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## 0. Protocolo de início de sessão (o agente MUST seguir isto antes de qualquer tarefa)

1. Ler este AGENTS.md por completo.
2. Ler `VISION.md` (propósito do projeto).
3. Ler `specs/STATUS.md` (o que está em andamento, o que foi concluído, decisões recentes).
4. Se a tarefa da sessão se refere a uma feature existente, ler o spec correspondente em `specs/`.
5. Confirmar em 2-3 linhas o entendimento do estado atual antes de começar.

> **Por quê:** LLMs não têm memória entre sessões. Este protocolo garante que toda sessão começa do mesmo estado, independente da ferramenta usada (Claude Code, Antigravity, VS Code).

---

## 1. Identidade do projeto

- **Nome:** Análise Financeira
- **O que faz (1 frase):** Permite acompanhar os ativos da carteira pessoal (Ações B3 e FIIs) com métricas e índices atualizados, e — em fases futuras — notícias, insights e explicação didática de relatórios gerenciais para tomada de decisão mais consciente.
- **Para quem (uso pessoal / negócio / cliente):** Uso pessoal (Nickolas)
- **Idioma da interface e do conteúdo:** pt-BR
- **Idioma do código e commits:** inglês

## 2. Stack e decisões travadas

> Preencha uma vez. Mudar aqui é decisão de arquitetura, não detalhe de implementação. O agente NEVER troca uma tecnologia desta lista por outra "equivalente" sem sinalizar e aguardar aprovação.

- **Frontend/Framework:** Next.js (App Router, TypeScript)
- **Backend/Runtime:** Next.js Route Handlers / Server Components
- **Banco de dados:** Supabase (Postgres)
- **Hosting/Deploy:** Vercel
- **Repo:** github.com/nickolasnfd/Analise-financeira
- **Autenticação:** Supabase Auth (login simples, usuário único)
- **Integrações externas:** brapi.dev (cotações e fundamentos de Ações B3 e FIIs, plano gratuito)
- **Gerenciador de pacotes:** npm

## 3. Ciclo de trabalho (fases obrigatórias)

Toda feature passa por 5 fases, nesta ordem. NEVER pular fase.

| Fase | Artefato | Portão de saída |
|------|----------|-----------------|
| 1. Especificar | `specs/<feature>.md` seções 1-4 | Problema e critério de sucesso claros, escopo fechado |
| 2. Planejar | seções 5-7 do spec | Plano numerado, cada passo com verificação; zero perguntas abertas |
| 3. Aprovar | status do spec → `Aprovado` | Humano escreveu "aprovado" explicitamente |
| 4. Implementar | código + `✅` por passo | Cada passo do plano verificado antes do próximo |
| 5. Validar | seção 9 do spec preenchida | Todos os critérios de aceite testados; `STATUS.md` atualizado |

> **Regra de ouro:** implementação sem spec aprovado é a definição de bug neste projeto, mesmo que o código funcione.

## 4. Disciplina de engenharia (aplica-se a toda mudança de código)

- MUST pensar antes de codificar: declarar suposições, expor ambiguidade, perguntar se algo não está claro — nunca assumir silenciosamente.
- MUST fazer a menor mudança que resolve o problema. Sem abstrações especulativas, sem "flexibilidade" ou configurabilidade não pedida, sem tratamento de erro para cenários impossíveis.
- MUST fazer mudanças cirúrgicas: tocar só o que precisa mudar. NEVER refatorar, "melhorar" ou reformatar código adjacente que não está quebrado.
- MUST definir o critério de verificação de cada passo ANTES de implementá-lo.
- MUST remover imports/variáveis/funções que as SUAS mudanças tornaram órfãos.
- NEVER remover código morto pré-existente não relacionado — apenas mencionar.
- NEVER inventar dados, métricas, premissas de mercado ou comportamento de API. Se um número ou comportamento é necessário e não foi verificado, declarar como suposição explícita antes de usar.
- NEVER adicionar features além do que o spec pede, mesmo que pareçam óbvias. Anotar a ideia em `specs/BACKLOG.md` e seguir o escopo.

**Teste final de cada diff:** cada linha alterada é rastreável diretamente a um passo do plano aprovado? Se não, reverter.

## 5. Ritmo de entrega

- MUST implementar um passo do plano por vez, verificado antes de seguir.
- MUST reportar `✅ [passo X concluído — verificação: resultado]` após cada passo.
- MUST parar e reportar quando um passo falha na verificação — NEVER seguir adiante com um passo quebrado "para resolver depois".
- Specs grandes MUST ser divididos em múltiplos specs menores se o plano passar de ~8 passos (respeita limites de contexto e de compute/sessão das ferramentas).

## 6. Ações que exigem aprovação humana explícita ANTES de executar

O agente NEVER executa as ações abaixo sem um "aprovado" explícito por escrito na mesma sessão, mesmo que o spec já esteja aprovado:

- Deletar arquivos, tabelas, branches ou dados existentes
- Alterar schema de banco de dados (migrations) em ambiente de produção
- Enviar comunicações em nome do usuário (email, mensagens, posts)
- Ações financeiras ou que gerem custos reais (criar projetos pagos, provisionar recursos)
- Operações em massa (bulk update/delete)
- Push direto para branch principal / deploy em produção
- Alterar variáveis de ambiente em produção
- Contratar plano pago de qualquer API de dados (ex: brapi Pro)
- Adicionar scraping de qualquer site novo
- Qualquer mudança que exponha dados da carteira sem autenticação

Protocolo: mostrar o plano exato da ação → sinalizar o que é irreversível → aguardar "aprovado" → só então executar.

## 7. Definição de pronto (Definition of Done)

Uma feature só é `Implementado` quando TODOS os itens abaixo são verdadeiros:

- [ ] Código implementado conforme o spec aprovado, sem desvio de escopo
- [ ] Todos os critérios de aceite (EARS) do spec verificados — manualmente ou via teste
- [ ] Sem regressão: funcionalidades existentes relacionadas foram testadas
- [ ] `specs/STATUS.md` atualizado (feature movida para "Concluído", decisões novas registradas)
- [ ] Este AGENTS.md atualizado SE a feature mudou alguma decisão travada
- [ ] Commit(s) com mensagem clara referenciando o spec

## 8. Gestão de erros durante implementação

Quando um erro surgir (build quebrado, teste falhando, deploy com erro):

1. Reportar o erro completo (mensagem literal, não paráfrase).
2. Diagnosticar a causa raiz antes de propor correção — NEVER aplicar correções por tentativa e erro em sequência.
3. Se a correção exigir mudança fora do escopo do spec atual, parar e perguntar.
4. Registrar erros recorrentes e suas soluções em `specs/LEARNINGS.md` para sessões futuras.

## 9. O que NUNCA fazer neste projeto

- NEVER commitar `.env`, chaves de API, tokens ou credenciais
- NEVER usar `.single()` do Supabase onde o registro pode não existir — usar `.maybeSingle()`
- NEVER criar repositório git aninhado dentro do repo principal
- NEVER inventar ou estimar valores financeiros (cotação, DY, P/VP etc.) — todo número exibido vem da API/fonte, com data/hora da coleta visível
- NEVER apresentar insight ou análise como recomendação de investimento — o app informa, não recomenda

## 10. Estrutura de arquivos do harness

```
/
├── AGENTS.md              ← este arquivo (constituição)
├── VISION.md              ← propósito do projeto, 1-2 parágrafos
├── specs/
│   ├── STATUS.md          ← estado atual: em andamento / concluído / decisões
│   ├── BACKLOG.md         ← ideias fora de escopo capturadas durante o trabalho
│   ├── LEARNINGS.md       ← erros recorrentes e soluções (memória entre sessões)
│   ├── SPEC.template.md   ← template para novas features
│   └── <feature>.md       ← um spec por feature
└── [código do app]
```

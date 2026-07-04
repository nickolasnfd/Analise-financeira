# SPEC — Dashboard simplificado da carteira

**Status:** Aprovado
**Criado em:** 2026-07-03
**Projeto:** Análise Financeira
**Substitui/depende de:** —

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Hoje não existe visão consolidada da carteira: para saber como os ativos estão, é preciso visitar vários sites e cruzar manualmente cotações, indicadores e posição. Isso consome tempo, é propenso a erro e desestimula o acompanhamento regular — decisões acabam tomadas com informação incompleta ou defasada.

### 2. Critério de sucesso
O usuário faz login, adiciona um ativo (ex: `MXRF11`, quantidade e preço médio) e, em menos de 10 segundos, o dashboard exibe o ativo com cotação atual, variação do dia e os principais indicadores da categoria (Ações: P/L, ROE, DY; FIIs: DY, P/VP), todos com data/hora da coleta visível.

### 3. Escopo

**Dentro do escopo:**
- Login (Supabase Auth, usuário único)
- Adicionar/editar/remover ativo da carteira (ticker, quantidade, preço médio)
- Dashboard com cards/tabela por ativo: cotação atual, variação do dia, valor da posição, resultado vs. preço médio
- Indicadores principais por categoria: Ações (P/L, ROE, DY), FIIs (DY, P/VP)
- Dados de mercado via brapi.dev (plano gratuito)
- Visão de totais da carteira (valor total investido, valor atual, resultado total)
- Data/hora da última coleta visível para o usuário

**Fora do escopo (explicitamente NÃO incluído — ideias vão para BACKLOG.md):**
- Notícias, insights e página de análise profunda por ativo
- Relatórios gerenciais e sua explicação didática
- Atualização em tempo real / streaming
- Outras categorias de ativos (ETFs, BDRs, cripto, renda fixa)
- Alertas/notificações
- Histórico ou gráficos de evolução da carteira ao longo do tempo

### 4. Restrições
- **Técnicas:** deve respeitar a stack travada em AGENTS.md seção 2 (Next.js + Supabase + Vercel + brapi.dev).
- **De dados:** criar tabelas de carteira/posições no Supabase (migration necessária). Dados de mercado (cotação, indicadores) NÃO são persistidos nesta fase — consultados sob demanda na brapi.dev, com cache curto em memória/edge para respeitar o rate limit do plano gratuito.
- **Dependências:** projeto Supabase criado e configurado; token da brapi.dev obtido e disponível via variável de ambiente (nunca commitado).

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

> Fatos verificados sobre a brapi.dev (jul/2026, via busca — o site bloqueia fetch direto): plano gratuito ~15.000 req/mês, **1 ativo por requisição**, **token obrigatório**, retorna **402** ao exceder o limite. `/quote/{ticker}` traz preço e variação do dia; fundamentos via `fundamental=true` / `modules=defaultKeyStatistics,financialData` (P/L = `priceEarnings`). FIIs têm endpoints `/api/v2/fii/*` com `dividendYield12m` e `priceToNav` (≈ P/VP). Campos exatos de ROE e P/VP para ações no plano gratuito **não foram confirmados** → resolvidos empiricamente no passo 4 do plano, nunca inventados.

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Estrutura de dados da carteira | (a) tabela única `portfolio_positions` com coluna `asset_type`; (b) tabelas separadas para ações e FIIs | (a) tabela única | Menos duplicação; a diferença de indicadores por categoria é resolvida na camada de exibição, não no schema |
| Dados de mercado | (a) persistir em tabela de cache no banco; (b) buscar sob demanda com cache curto (TTL) no servidor | (b) sob demanda + TTL curto | Escopo (seção 3) exclui persistir mercado nesta fase; TTL curto respeita o teto de 15k req/mês da brapi |
| Fonte dos indicadores de FII | (a) módulos do `/quote`; (b) endpoints `/api/v2/fii/*` | Verificar no passo 4 e usar o que o **plano gratuito** expõe | Não inventar shape de API — decidir empiricamente com token real |
| Validação de ticker ao adicionar | (a) confiar no input do usuário; (b) validar via brapi antes de persistir | (b) validar antes de persistir | Evita posições com ticker inexistente; sustenta o critério de erro (seção 8) |
| Indicador ausente na resposta da API | (a) esconder o card; (b) exibir `—` | (b) exibir `—` | AGENTS seção 9: nunca inventar valor financeiro; ausência é informação honesta |
| Método de login | magic link / email+senha / Google OAuth | **email + senha** | Escolha do usuário (2026-07-04) |

### 6. Plano de implementação

1. **Scaffold + ambiente** — criar app Next.js (App Router, TS), instalar `@supabase/supabase-js` e `@supabase/ssr`; criar `.env.local` (SUPABASE_URL, SUPABASE_ANON_KEY, BRAPI_TOKEN) e `.env.example`; garantir `.env*` no `.gitignore`. → verificar: `npm run dev` sobe sem erro e `git status` não lista `.env.local`.
2. **Schema + RLS** — migration criando `portfolio_positions` (id, user_id → auth.users, ticker, asset_type check em ('stock','fii'), quantity numeric, avg_price numeric, created_at, updated_at) com RLS restringindo cada usuário às próprias linhas. → verificar: tabela existe (list_tables), RLS ativa, e um SELECT com outro user_id não retorna linhas.
3. **Autenticação** — página de login (método definido na pergunta 3) + middleware de sessão Supabase protegendo `/dashboard`. → verificar: acesso não autenticado a `/dashboard` redireciona para login; após autenticar, chega ao dashboard.
4. **Spike de contrato brapi + cliente** — função que chama `/quote/{ticker}` (e endpoint de FII, se aplicável) com o token, para 1 ação e 1 FII, e registra os nomes reais de campo (preço, variação %, `priceEarnings`, ROE, DY, `priceToNav`/P-VP). Documentar os campos confirmados neste spec. → verificar: chamada real retorna 200 e cada campo usado existe ou é explicitamente marcado como ausente, para 1 ação e 1 FII.
5. **Serviço de mercado + cache** — normalizar a resposta da brapi para `{ price, dayChangePct, indicators{}, collectedAt }` com cache de TTL curto; tratar 402 e indisponibilidade sem lançar exceção. → verificar: duas chamadas seguidas ao mesmo ticker contabilizam 1 requisição (cache); 402/erro retorna objeto com flag de indisponível.
6. **CRUD da carteira** — server actions + UI para adicionar/editar/remover posição (ticker, asset_type, quantity, avg_price), validando o ticker via brapi antes de persistir. → verificar: adicionar `MXRF11` persiste e aparece; ticker inválido não persiste e mostra erro; editar e remover refletem no banco.
7. **Dashboard** — cards/tabela por ativo com cotação, variação do dia, valor da posição (qtd × preço atual), resultado vs. preço médio (R$ e %), indicadores por categoria (ação: P/L, ROE, DY; FII: DY, P/VP) e data/hora da coleta; `—` para indicador ausente. → verificar: com 1 ação e 1 FII cadastrados, todos os campos aparecem corretos e o timestamp de coleta é visível.
8. **Totais + estados** — totais da carteira (investido, valor atual, resultado total R$ e %) e estados de vazio, carregando e erro. → verificar: os totais batem com a soma das posições; carteira vazia mostra chamada para adicionar ativo; erro de API mostra aviso sem quebrar o dashboard.

### 7. Perguntas em aberto

> Respondidas em 2026-07-04. Nenhuma pergunta em aberto.

- [x] **1. Token brapi.dev:** o usuário **vai gerar** um token do plano gratuito e fornecer via `.env` antes do passo 4. Dependência registrada na seção 4 do spec — o passo 4 não roda sem o token.
- [x] **2. Projeto Supabase:** **criar projeto novo** via MCP Supabase. Aprovação explícita será pedida na hora da criação (AGENTS seção 6). URL + anon key resultantes vão para o `.env`.
- [x] **3. Método de login:** **email + senha** (Supabase Auth).
- [x] **4. Indicadores por card:** confirmado — Ação = P/L, ROE, DY; FII = DY, P/VP; `—` quando o campo não vier da API.

### 8. Critérios de aceite (formato EARS)

- QUANDO um usuário não autenticado acessa `/dashboard`, O SISTEMA DEVE redirecioná-lo para a tela de login.
- QUANDO o usuário autenticado adiciona um ativo válido (ticker existente, quantidade, preço médio), O SISTEMA DEVE persistir a posição e exibi-la no dashboard em menos de 10 segundos, com cotação, variação do dia e os indicadores da categoria.
- QUANDO o dashboard exibe um ativo, O SISTEMA DEVE mostrar a data/hora da coleta dos dados de mercado.
- QUANDO o usuário edita a quantidade ou o preço médio de uma posição, O SISTEMA DEVE recalcular o valor da posição e o resultado vs. preço médio.
- QUANDO o usuário remove uma posição, O SISTEMA DEVE removê-la do dashboard e atualizar os totais da carteira.
- QUANDO o usuário tenta adicionar um ticker inexistente/inválido na brapi, O SISTEMA DEVE exibir mensagem de erro clara e NÃO persistir a posição.
- QUANDO a brapi retorna 402 (limite excedido) ou está indisponível, O SISTEMA DEVE exibir a posição com os dados de mercado marcados como indisponíveis, sem quebrar o dashboard.
- QUANDO um indicador específico (ex: ROE, P/VP) não é retornado pela API para aquele ativo, O SISTEMA DEVE exibir `—` no lugar, sem inventar valor.

### Ações destrutivas ou irreversíveis nesta feature?
[ ] Não
[x] Sim → aprovação explícita será pedida na hora da execução (AGENTS seção 6), mesmo com o spec aprovado:
- Criar/provisionar projeto Supabase (se a pergunta 2 for "criar novo")
- Aplicar migration de schema no Supabase (passo 2)
- Remover posição da carteira é deleção de dado do próprio usuário via UI — comportamento previsto da feature, confirmado a cada clique pela própria interface (não exige aprovação de sessão)

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** Nickolas
**Data:** 2026-07-04
**Observações da revisão:** Aprovado sem ressalvas após fechamento das 4 perguntas em aberto (token brapi a gerar, projeto Supabase novo, login email+senha, indicadores confirmados).

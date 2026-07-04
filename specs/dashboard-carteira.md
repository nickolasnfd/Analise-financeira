# SPEC — Dashboard simplificado da carteira

**Status:** Draft
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

*(a preencher na próxima sessão de trabalho — seções 5 a 8)*

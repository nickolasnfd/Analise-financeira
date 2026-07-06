# STATUS — Análise Financeira

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento
- (nada — aguardando validação live de `relatorios-gerenciais` pelo usuário)

## Concluído
- `specs/relatorios-gerenciais.md` — Página `/ativos/[ticker]` com relatórios gerenciais via CVM (RAD CVM + Fundos.NET). **Código 4/4 concluído**: cliente CVM (`src/lib/cvm/`) testado com dados reais (PETR4: 4 ITRs; MXRF11: 4 Informes Mensais), rota `/ativos/[ticker]`, busca por ticker no dashboard. Verificado em sessão: typecheck, build, lint, e o cliente CVM contra os sistemas reais da CVM (fora do app, script descartável). **Validação live pendente** (render da rota autenticada, navegação real) — sem `.env.local`/Supabase configurados nesta sessão; ver checklist na FASE 5 do spec.
- `specs/dashboard-carteira.md` — Dashboard simplificado da carteira. **Código 8/8 concluído** (scaffold, schema+RLS, auth email+senha, cliente brapi, serviço de mercado, CRUD, view, totais/estados). Verificado em sessão: typecheck, build, lint, redirect/render. **Validação live pendente** (login real, persistência, cotação) — egress da sessão bloqueia Supabase/brapi; ver checklist pós-deploy na FASE 5 do spec.

## Decisões recentes
- 2026-07-03: Stack travada — Next.js + Supabase + Vercel; dados via brapi.dev (free); login simples Supabase Auth; escopo inicial Ações B3 + FIIs.
- 2026-07-04: Spec dashboard-carteira aprovado. Login = email+senha. Projeto Supabase será criado novo (aprovação pendente na hora do passo 1/2). Token brapi.dev a ser gerado pelo usuário antes do passo 4.
- 2026-07-06: Spec relatorios-gerenciais aprovado. Fonte dos relatórios = sistemas oficiais da CVM (RAD CVM para ações, Fundos.NET para FIIs), gratuitos, sem scraping por site de RI individual. Explicação didática via LLM adiada para o backlog (custo). Página acessível para qualquer ticker B3 válido, não só carteira; últimos 4 relatórios; layout empilhado (indicadores no topo, relatórios abaixo); busca por ticker no topo do dashboard. Repositório confirmado sem branch `main` separada (única branch = padrão do GitHub); deploy Vercel já conectado e automático a cada push.
- 2026-07-06: Mapeamento ticker→identificador CVM resolvido via busca por nome (brapi `longName`/`shortName`) em vez de base estática — RAD CVM usa lista de empresas embutida na própria página; Fundos.NET usa `listarFundos?term=`. Tipo de ativo (ação/FII) para tickers fora da carteira detectado por heurística de sufixo ("11"/"11B"). Contrato completo de ambos os sistemas confirmado e testado com dados reais; ver `specs/LEARNINGS.md`.

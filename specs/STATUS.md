# STATUS — Análise Financeira

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento
- `specs/relatorios-gerenciais.md` — Página `/ativos/[ticker]` com relatórios gerenciais via CVM. Spec aprovado 2026-07-06. Iniciando passo 1 do plano (spike do contrato CVM).

## Concluído
- `specs/dashboard-carteira.md` — Dashboard simplificado da carteira. **Código 8/8 concluído** (scaffold, schema+RLS, auth email+senha, cliente brapi, serviço de mercado, CRUD, view, totais/estados). Verificado em sessão: typecheck, build, lint, redirect/render. **Validação live pendente** (login real, persistência, cotação) — egress da sessão bloqueia Supabase/brapi; ver checklist pós-deploy na FASE 5 do spec.

## Decisões recentes
- 2026-07-03: Stack travada — Next.js + Supabase + Vercel; dados via brapi.dev (free); login simples Supabase Auth; escopo inicial Ações B3 + FIIs.
- 2026-07-04: Spec dashboard-carteira aprovado. Login = email+senha. Projeto Supabase será criado novo (aprovação pendente na hora do passo 1/2). Token brapi.dev a ser gerado pelo usuário antes do passo 4.
- 2026-07-06: Spec relatorios-gerenciais aprovado. Fonte dos relatórios = sistemas oficiais da CVM (RAD CVM para ações, Fundos.NET para FIIs), gratuitos, sem scraping por site de RI individual. Explicação didática via LLM adiada para o backlog (custo). Página acessível para qualquer ticker B3 válido, não só carteira; últimos 4 relatórios; layout empilhado (indicadores no topo, relatórios abaixo); busca por ticker no topo do dashboard. Repositório confirmado sem branch `main` separada (única branch = padrão do GitHub); deploy Vercel já conectado e automático a cada push.

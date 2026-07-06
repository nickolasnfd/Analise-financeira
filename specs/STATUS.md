# STATUS — Análise Financeira

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento
- `specs/dashboard-carteira.md` — Dashboard simplificado da carteira (status: Aprovado, implementação passos 1-6/8 concluídos; faltam 7 (view do dashboard) e 8 (totais/estados)).
  - Verificação live (login real, persistência, cotação) fica pendente: egress desta sessão bloqueia `*.supabase.co` e `brapi.dev` (ver LEARNINGS). Confirmar após deploy Vercel / execução local.

## Concluído
- (nada ainda)

## Decisões recentes
- 2026-07-03: Stack travada — Next.js + Supabase + Vercel; dados via brapi.dev (free); login simples Supabase Auth; escopo inicial Ações B3 + FIIs.
- 2026-07-04: Spec dashboard-carteira aprovado. Login = email+senha. Projeto Supabase será criado novo (aprovação pendente na hora do passo 1/2). Token brapi.dev a ser gerado pelo usuário antes do passo 4.

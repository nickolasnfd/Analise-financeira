# STATUS — Análise Financeira

Projeto iniciado em 2026-07-03. Harness SDD instalado.

## Em andamento
- `specs/relatorios-gerenciais.md` — validação live em andamento: **bug encontrado em produção (2026-07-07)** — resolução ticker→empresa no RAD CVM falha por divergência de nome (`company_not_found` para "Companhia Paranaense de Energia"/Copel e "Barings BDC, Inc."). Diagnóstico em curso.
- `specs/relatorios-explicacao.md` — Explicação didática de relatórios via API Claude (status: Draft; depende de relatorios-gerenciais; aguardando respostas às perguntas em aberto e aprovação)
- `specs/dashboard-carteira.md` — validação live final pelo usuário (correção do 403 da brapi deployada em 2026-07-06; aguardando re-teste)

## Concluído
- `specs/relatorios-gerenciais.md` — Página `/ativos/[ticker]` com relatórios gerenciais via CVM (RAD CVM + Fundos.NET). **Código 4/4 concluído**: cliente CVM (`src/lib/cvm/`) testado com dados reais (PETR4: 4 ITRs; MXRF11: 4 Informes Mensais), rota `/ativos/[ticker]`, busca por ticker no dashboard. Verificado em sessão: typecheck, build, lint, e o cliente CVM contra os sistemas reais da CVM (fora do app, script descartável). *(Validação live reaberta — ver "Em andamento".)*
- `specs/dashboard-carteira.md` — Dashboard simplificado da carteira. **Código 8/8 concluído** (scaffold, schema+RLS, auth email+senha, cliente brapi, serviço de mercado, CRUD, view, totais/estados). Verificado em sessão: typecheck, build, lint, redirect/render. **Validação live pendente** (login real, persistência, cotação em produção após o fix do 403).

## Decisões recentes
- 2026-07-03: Stack travada — Next.js + Supabase + Vercel; dados via brapi.dev (free); login simples Supabase Auth; escopo inicial Ações B3 + FIIs.
- 2026-07-04: Spec dashboard-carteira aprovado. Login = email+senha. Projeto Supabase será criado novo (aprovação pendente na hora do passo 1/2). Token brapi.dev a ser gerado pelo usuário antes do passo 4.
- 2026-07-06: Plano gratuito da brapi rejeita `modules=` (403) — removido do cliente; DY/ROE/P/VP viram "—" no free (ver LEARNINGS.md). Site URL do Supabase Auth precisa apontar para produção (ação manual do usuário).
- 2026-07-06: Spec relatorios-gerenciais aprovado. Fonte dos relatórios = sistemas oficiais da CVM (RAD CVM para ações, Fundos.NET para FIIs), gratuitos, sem scraping por site de RI individual. Explicação didática via LLM adiada para o backlog (custo). Página acessível para qualquer ticker B3 válido, não só carteira; últimos 4 relatórios; layout empilhado (indicadores no topo, relatórios abaixo); busca por ticker no topo do dashboard. Repositório confirmado sem branch `main` separada (única branch = padrão do GitHub); deploy Vercel já conectado e automático a cada push.
- 2026-07-06: Mapeamento ticker→identificador CVM resolvido via busca por nome (brapi `longName`/`shortName`) em vez de base estática — RAD CVM usa lista de empresas embutida na própria página; Fundos.NET usa `listarFundos?term=`. Tipo de ativo (ação/FII) para tickers fora da carteira detectado por heurística de sufixo ("11"/"11B"). Contrato completo de ambos os sistemas confirmado e testado com dados reais; ver `specs/LEARNINGS.md`.
- 2026-07-07: Spec da explicação didática de relatórios redigido (Draft) por agente em sessão paralela — retirado do backlog a pedido do usuário; recomendação Sonnet 5, PDF nativo, cache no banco, teto de custo; nenhuma implementação até aprovação. Um segundo draft (relatorios-acesso.md, acesso via FNET) foi descartado antes do push por já estar superado pela implementação de relatorios-gerenciais.

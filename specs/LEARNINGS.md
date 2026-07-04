# LEARNINGS — erros recorrentes e soluções

> Memória entre sessões. Registrar aqui todo erro que custou tempo e sua solução, para nunca repeti-lo.

## 2026-07-04 — Egress bloqueia Supabase data plane e brapi.dev nesta sessão remota
**Sintoma:** `fetch`/`curl` para `https://<ref>.supabase.co/...` e `https://brapi.dev/...` falham com `CONNECT tunnel failed, response 403` ("Host not in allowlist"). O dev server sobe, mas `supabase.auth.*` e chamadas à brapi não completam em runtime dentro da sessão.
**Causa raiz:** o proxy de egress do ambiente remoto (Claude Code on the web) aplica um allowlist que inclui registries de pacotes e a **API de management** do Supabase (usada pelas ferramentas MCP), mas **não** o data plane `*.supabase.co` nem `brapi.dev`.
**Consequência:** verificação *live* de qualquer passo que dependa de auth/DB do Supabase ou da brapi (passos 3-round-trip, 4, 5, 6, 7, 8) não é possível de dentro desta sessão. Redirect/render/typecheck/build são verificáveis; login real e fetch de mercado não.
**Solução:** verificar essas partes após deploy (Vercel) ou rodando localmente, OU o dono do ambiente amplia a política de rede para incluir `*.supabase.co` e `brapi.dev`. Migrations do Supabase seguem funcionando via MCP (rota de management, não bloqueada). NUNCA desabilitar TLS/HTTPS_PROXY nem reburlar a política (README do proxy).

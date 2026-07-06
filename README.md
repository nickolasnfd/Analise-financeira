# Análise Financeira

Aplicação pessoal para acompanhar a carteira de investimentos (Ações B3 e FIIs)
com cotações e indicadores atualizados. Stack: Next.js (App Router, TypeScript),
Supabase (Postgres + Auth), dados de mercado via [brapi.dev](https://brapi.dev),
deploy na Vercel.

> A constituição do projeto está em [`AGENTS.md`](./AGENTS.md); o estado atual e
> os specs em [`specs/`](./specs).

---

## Variáveis de ambiente

A aplicação precisa de **3 variáveis**. Nunca as comite — o arquivo `.env.local`
já está no `.gitignore`. Use [`.env.example`](./.env.example) como modelo.

| Variável | O que é | Onde obter |
|----------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Supabase → seu projeto → **Project Settings → Data API** (campo *Project URL*) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (publishable/anon) do Supabase | Supabase → **Project Settings → API Keys** (chave *anon/publishable*) |
| `BRAPI_TOKEN` | Token da API brapi.dev (plano gratuito) | [brapi.dev](https://brapi.dev) → sua conta → *Meu Token* |

> As duas variáveis `NEXT_PUBLIC_*` são públicas por natureza (vão para o
> navegador e são protegidas por RLS no banco). O `BRAPI_TOKEN` é **secreto** e
> fica só no servidor — nunca o exponha no cliente nem em commits.

---

## Rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo de ambiente e preencher os 3 valores
cp .env.example .env.local
# edite .env.local com os valores da tabela acima

# 3. Subir o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`. Você será levado à tela de login.

---

## Deploy na Vercel

1. Conectar o repositório `nickolasnfd/Analise-financeira` a um projeto Vercel.
2. Em **Settings → Environment Variables**, adicionar as 3 variáveis da tabela
   acima (mesmos nomes e valores).
3. Publicar. A Vercel detecta o Next.js automaticamente (`npm run build`).

---

## Banco de dados

O schema vive em [`supabase/migrations/`](./supabase/migrations). A tabela
`portfolio_positions` (uma linha por ativo, modelo de preço médio) tem RLS
ativa — cada usuário só enxerga as próprias posições.

---

## Primeiro uso (checklist)

Depois de configurar as variáveis e subir o app (local ou Vercel):

1. Criar sua conta pela tela de login (botão **Criar conta**). Se o login não
   entrar direto, verifique em *Supabase → Authentication → Providers → Email*
   se a confirmação de email está ativa.
2. Adicionar um FII (ex: `MXRF11`) e uma ação (ex: `PETR4`) e conferir cotação,
   variação do dia, valor da posição, resultado, indicadores e a data/hora da
   coleta.
3. Se algum indicador (ROE, P/VP, DY) aparecer como `—` indevidamente, ajustar
   as chaves de campo em [`src/lib/market/service.ts`](./src/lib/market/service.ts)
   conforme a resposta real da brapi.

O checklist completo de validação está na FASE 5 de
[`specs/dashboard-carteira.md`](./specs/dashboard-carteira.md).

---

## Scripts

| Comando | Ação |
|---------|------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servir o build |
| `npm run lint` | ESLint |

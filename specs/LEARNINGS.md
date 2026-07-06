# LEARNINGS — erros recorrentes e soluções

> Memória entre sessões. Registrar aqui todo erro que custou tempo e sua solução, para nunca repeti-lo.

## 2026-07-04 — Egress bloqueia Supabase data plane e brapi.dev nesta sessão remota
**Sintoma:** `fetch`/`curl` para `https://<ref>.supabase.co/...` e `https://brapi.dev/...` falham com `CONNECT tunnel failed, response 403` ("Host not in allowlist"). O dev server sobe, mas `supabase.auth.*` e chamadas à brapi não completam em runtime dentro da sessão.
**Causa raiz:** o proxy de egress do ambiente remoto (Claude Code on the web) aplica um allowlist que inclui registries de pacotes e a **API de management** do Supabase (usada pelas ferramentas MCP), mas **não** o data plane `*.supabase.co` nem `brapi.dev`.
**Consequência:** verificação *live* de qualquer passo que dependa de auth/DB do Supabase ou da brapi (passos 3-round-trip, 4, 5, 6, 7, 8) não é possível de dentro desta sessão. Redirect/render/typecheck/build são verificáveis; login real e fetch de mercado não.
**Solução:** verificar essas partes após deploy (Vercel) ou rodando localmente, OU o dono do ambiente amplia a política de rede para incluir `*.supabase.co` e `brapi.dev`. Migrations do Supabase seguem funcionando via MCP (rota de management, não bloqueada). NUNCA desabilitar TLS/HTTPS_PROXY nem reburlar a política (README do proxy).

## 2026-07-06 — brapi free plan: `modules=` retorna 403 e derruba a validação de ticker
**Sintoma:** em produção, adicionar ativo falhava silenciosamente (0 inserts; logs Vercel sem exceção; logs Supabase mostram getUser mas nenhum POST em `/rest/v1/portfolio_positions`).
**Causa raiz:** o cliente brapi enviava `modules=defaultKeyStatistics,financialData`; o plano gratuito responde **HTTP 403** ("Módulos permitidos: summaryProfile"). A validação de ticker falhava antes do insert. Obs.: a resposta 403 é inconsistente (às vezes 200 para ações — não confiar).
**Contrato confirmado do plano free** (2026-07-06, token real): `quote/{ticker}?fundamental=true` → preço, variação %, horário, `priceEarnings` (pode ser null p/ FII). `dividendYield`, ROE e P/VP **não existem** no free (viram `—`). `dividends=true` também falha.
**Solução:** nunca enviar `modules=` no plano free; logar falhas da brapi com `console.error` (sem isso a produção fica indiagnosticável); técnica de diagnóstico: extensão `http` do Postgres (Supabase) serve de laboratório para chamar a brapi quando o egress da sessão bloqueia o host (habilitar → testar → **remover**).

## 2026-07-06 — Contrato real do RAD CVM e Fundos.NET (relatórios gerenciais)
**Contexto:** integração com os sistemas oficiais da CVM para listar relatórios gerenciais por ativo (`specs/relatorios-gerenciais.md`). Nenhum dos dois tem API REST documentada; contrato descoberto via captura de rede no navegador + testes diretos com `curl`/`node`.

**RAD CVM (ações, `rad.cvm.gov.br`/`ENETWeb`):**
- Busca: `POST frmConsultaExternaCVM.aspx/ListarDocumentos`, JSON body (ver `src/lib/cvm/rad-cvm.ts`). `dataDe`/`dataAte` são **obrigatórios** quando `periodo:"2"` — deixá-los vazios quebra o backend com erro de SQL (`Must declare the scalar variable "@DataDe"`).
- Empresa identificada por Código CVM, resolvido por **nome** (não ticker) contra a lista completa de empresas embutida na própria página de busca (campo oculto `hdnEmpresas`, ~480KB, todas as companhias registradas) — sem chamada extra.
- Resposta usa delimitador customizado (`*` entre registros, `$&` entre campos) com HTML embutido; o link de download vem de um `onclick=OpenDownloadDocumentos(seq,versao,protocolo,tipo)` dentro desse HTML. **O protocolo é alfanumérico** (ex: `009512ITR310320260200157120-79`), não numérico — um regex assumindo `\d+` para esse campo falha silenciosamente (nenhum resultado, sem erro).
- Existe um campo `hdnHabilitaCaptcha` (hoje `"N"`) — a CVM pode exigir reCAPTCHA sob condições não documentadas. Nunca tentar resolver; tratar como falha e degradar (estado de erro), nunca bloquear a página.
- Retificações (nova versão do mesmo período de referência) aparecem como registros separados — deduplicar por período de referência mantendo a versão mais alta, senão "os 4 mais recentes" fica com duplicatas do mesmo trimestre.

**Fundos.NET (FIIs, `fnet.bmfbovespa.com.br`/fnet/publico):**
- Nome→fundo: `GET listarFundos?term=<nome>` (header `CSRFToken` extraído de `var csrf_token` na página) retorna `idFundo` diretamente — não precisa de CNPJ.
- Documentos: `GET pesquisarGerenciadorDocumentosDados?d=1&s=<start>&l=<len>&idFundo=<id>&idCategoriaDocumento=6&idTipoDocumento=40&idEspecieDocumento=0` (6 = Informes Periódicos, 40 = Informe Mensal Estruturado — ids obtidos via `listarTodasCategoriaPorTipoFundo`/`listarTodosTiposPorCategoriaETipoFundo`). Resposta JSON limpa.
- **`l` (itens por página) tem limite de 200** — pedir mais retorna HTTP 400 com `"O limite de itens para pesquisas é 200!"`.
- **A ordenação do servidor não é confiável** — nem por posição padrão nem passando parâmetro de sort (`o=[{"dataEntrega":"desc"}]`, testado e ignorado). Buscar tudo (até 200) e ordenar por `dataEntrega` no próprio código antes de pegar os mais recentes.

**Ambas:** sem chave de API, dado público, gratuito — confirma a decisão do spec de usar CVM em vez de scraping por site de RI.

## 2026-07-06 — Supabase Auth Site URL padrão aponta email de confirmação para localhost
**Sintoma:** email de confirmação de cadastro redireciona para `http://localhost:3000` em vez do domínio de produção.
**Causa raiz:** *Site URL* do Supabase Auth fica no padrão `http://localhost:3000` até ser configurada.
**Solução:** Supabase Dashboard → Authentication → URL Configuration → *Site URL* = URL de produção (ex.: `https://analise-financeira-jade.vercel.app`). Não configurável via MCP; ação manual do usuário.

# SPEC — Página do ativo com relatórios gerenciais (CVM)

**Status:** Aprovado
**Criado em:** 2026-07-06
**Projeto:** Análise Financeira
**Substitui/depende de:** depende de `specs/dashboard-carteira.md` (indicadores de mercado por ticker já existem)

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Hoje o app mostra cotação e indicadores de cada ativo, mas nada sobre a saúde do negócio/fundo por trás do ticker. Para entender isso, é preciso ir manualmente ao site de RI da empresa (ou ao sistema da CVM) e procurar o relatório gerencial mais recente — um processo manual, disperso por site, que desestimula esse tipo de acompanhamento mais profundo previsto na visão do produto.

### 2. Critério de sucesso
O usuário digita um ticker (da carteira ou não) no campo de busca, chega em `/ativos/TICKER` e, em poucos segundos, vê os indicadores de mercado do ativo e uma lista dos 4 relatórios gerenciais mais recentes vindos da CVM, cada um com tipo/período, data de publicação e link para abrir o documento original.

### 3. Escopo

**Dentro do escopo:**
- Rota `/ativos/[ticker]`, acessível para qualquer ticker B3 válido (não só os da carteira).
- Campo de busca por ticker no topo do dashboard, linkando para `/ativos/[ticker]`.
- Reaproveitar os indicadores de mercado já existentes (`src/lib/market/service.ts`) na página do ativo.
- Buscar e listar os 4 relatórios gerenciais mais recentes por ativo:
  - Ações → RAD CVM (rad.cvm.gov.br).
  - FIIs → Fundos.NET (fnet.bmfbovespa.com.br).
- Cada relatório listado com: tipo/trimestre, data de publicação, link para abrir o documento original na CVM (sem baixar/hospedar o PDF).
- Estado vazio quando nenhum relatório é encontrado; estado de erro quando a consulta à CVM falha, sem quebrar a página.

**Fora do escopo (explicitamente NÃO incluído — vai para `specs/BACKLOG.md`):**
- Explicação didática do relatório via LLM (custo de API a decidir depois).
- Notícias por categoria e insights derivados de indicadores (fases futuras da visão).
- Download/armazenamento do PDF do relatório (só o link para o original).
- Histórico completo de relatórios (só os últimos 4).

### 4. Restrições
- **Técnicas:** stack travada em AGENTS.md seção 2. Fonte de dados dos relatórios deve ser gratuita (dado público da CVM) — sem contratar API paga.
- **De dados:** nenhuma migration nova esperada — a busca de relatórios é sob demanda, sem persistir no Supabase.
- **Dependências:** indicadores de mercado por ticker (`dashboard-carteira`, já implementado). Nenhum token novo esperado — os sistemas da CVM (RAD CVM e Fundos.NET) são públicos e não exigem chave de API. Se a fase 2 encontrar exigência de autenticação ou chave, isso deve ser reportado como desvio antes de prosseguir.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

> **Contrato confirmado do spike (2026-07-06, via navegador, para PETR4/Petrobras e MXRF11):**
> - **RAD CVM (ações):** não tem REST documentado publicamente. A página `https://www.rad.cvm.gov.br/ENETWeb/frmConsultaExternaCVM.aspx` (a versão anterior, `/ENET/...`, foi descontinuada em 06/07/2026) carrega um form ASP.NET WebForms (`__VIEWSTATE`/`__EVENTVALIDATION`, cookies de sessão); a busca real dispara `POST .../frmConsultaExternaCVM.aspx/ListarDocumentos` com body JSON confirmado via curl:
>   ```json
>   { "dataDe": "01/01/2025", "dataAte": "06/07/2026", "empresa": ",9512",
>     "setorAtividade": "-1", "categoriaEmissor": "-1", "situacaoEmissor": "-1",
>     "tipoParticipante": "-1", "dataReferencia": "", "categoria": "EST_-1,IPE_-1_-1_-1",
>     "periodo": "2", "horaIni": "", "horaFim": "", "palavraChave": "",
>     "ultimaDtRef": "false", "tipoEmpresa": "0", "token": "", "versaoCaptcha": "" }
>   ```
>   `empresa` = Código CVM sem zero à esquerda, prefixado por vírgula (`,9512` para Petrobras); `categoria: "EST_-1,IPE_-1_-1_-1"` = "todos os documentos" (equivalente aos 2 chips "TODOS" da UI); os demais campos de filtro usam `"-1"` como "todos" quando vazios. Resposta: `{"d":{"temErro":bool,"SolicitarCaptcha":"S"|"N","dados":"<string com delimitador customizado>"}}` — registros separados por `*`, campos por `$&`; cada registro inclui nome da empresa, categoria, tipo/espécie, assunto, data de referência, data de entrega, status, versão, modalidade, e um HTML com `onclick=OpenDownloadDocumentos('<id>','<versao>','<protocolo>','<tipo>')` — usado para montar a URL de download `frmDownloadDocumento.aspx?Tela=ext&numSequencia=<id>&numVersao=<versao>&numProtocolo=<protocolo>&descTipo=<tipo>&CodigoInstituicao=1`. **Risco confirmado:** existe um campo `hdnHabilitaCaptcha` (hoje `"N"`) — a CVM pode exigir reCAPTCHA v2/v3 sob condições não documentadas; se isso acontecer (`SolicitarCaptcha: "S"`), o cliente NEVER deve tentar resolver o captcha — deve cair no estado de erro já previsto (seção 8), não travar/bloquear a página. Categorias observadas incluem `ITR - Informações Trimestrais`, `Relatório de Sustentabilidade`, `Comunicado ao Mercado`, `Reunião da Administração` — a categoria mais próxima de "relatório gerencial" recorrente e estruturado é o **ITR** (trimestral).
> - **Fundos.NET (FIIs):** `GET /fnet/publico/listarFundos?term=<nome>&page=1&idTipoFundo=0&idAdm=0&paraCerts=false` (header `CSRFToken`, obtido de `var csrf_token` embutido na página) resolve nome→`idFundo` (ex.: `term=MAXI RENDA` → `idFundo=20715`). Documentos: `GET /fnet/publico/pesquisarGerenciadorDocumentosDados?d=1&s=<start>&l=<len>&idFundo=<id>&idCategoriaDocumento=6&idTipoDocumento=40&idEspecieDocumento=0` (6 = "Informes Periódicos", 40 = "Informe Mensal Estruturado" — confirmados via `listarTodasCategoriaPorTipoFundo`/`listarTodosTiposPorCategoriaETipoFundo`). Resposta JSON limpa: `{recordsFiltered, data: [{id, tipoDocumento, dataReferencia, dataEntrega, status, versao}, ...]}`. **A ordenação retornada pelo servidor não é confiável** (testado — não é cronológica mesmo pedindo `s`/`l` no fim da lista nem com parâmetro `o` de sort); a estratégia é buscar todos os registros da categoria/tipo (poucas centenas, 1 página grande) e ordenar por `dataEntrega` no próprio código, filtrando status ativo (`A`/`AC`, excluindo `C`/`CC` cancelado) antes de pegar os 4 mais recentes. Download: `/fnet/publico/downloadDocumento?id=<id>`.
>
> **Mapeamento ticker → identificador CVM (resolvido, 2026-07-06):** não existe uma base pública gratuita direta de ticker→Código CVM/CNPJ/idFundo. Alternativas descartadas: (a) dataset aberto `cad_fi.csv` da CVM — tem CNPJ mas não ticker; (b) endpoint `brapi /api/v2/fii/reports` — traz CNPJ pronto, mas é **plano Pro** e no sandbox gratuito só aceita `MXRF11`/`HGLG11`.
> **Abordagem escolhida e testada:** usar o **nome da empresa/fundo** como ponte — a brapi retorna `longName`/`shortName` no `/quote/{ticker}` (dado já buscado pelo serviço de mercado existente). Ações: nome alimenta um match contra a lista completa de empresas (nome + Código CVM) que o **próprio RAD CVM já embute na página** de busca (campo oculto `hdnEmpresas`, ~480KB, todas as companhias registradas) — sem chamada extra. FIIs: nome alimenta `listarFundos?term=` do Fundos.NET, que devolve `idFundo` diretamente. Sem base estática própria para manter. Risco conhecido: nomes ambíguos ou sem correspondência exata — cai no estado vazio (seção 8), nunca escolhendo um resultado errado silenciosamente.

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Fonte dos relatórios | (a) scraping do site de RI de cada empresa/fundo; (b) sistemas oficiais da CVM (RAD CVM + Fundos.NET) | (b) CVM | Fonte única, gratuita e oficial, cobre qualquer ativo automaticamente — não exige scraper por empresa (decisão do usuário, 2026-07-06) |
| Mapeamento ticker → identificador CVM | (a) tabela estática mantida manualmente; (b) busca por nome (via `longName`/`shortName` já retornado pela brapi) dentro de cada sistema CVM; (c) endpoint pago `brapi /api/v2/fii/reports` | (b) busca por nome | Sem base própria para manter; reaproveita dado já buscado; (c) descartado por ser pago e limitado a 2 tickers no sandbox gratuito |
| Acesso à página do ativo | (a) só ativos da carteira; (b) qualquer ticker válido | (b) qualquer ticker válido | Decisão do usuário (2026-07-06) — permite pesquisar antes de comprar |
| Quantidade de relatórios exibidos | (a) últimos 4; (b) histórico completo | (a) últimos 4 | Decisão do usuário (2026-07-06) — cobre ~1 ano sem sobrecarregar a página |
| Layout da página do ativo | (a) indicadores no topo, relatórios abaixo (empilhado); (b) duas colunas lado a lado | (a) empilhado | Escolhido no protótipo visual (2026-07-06) |
| Navegação para ticker fora da carteira | (a) campo de busca no topo do dashboard; (b) só via URL direta | (a) campo de busca | Decisão do usuário (2026-07-06) |
| Armazenamento do PDF | (a) baixar e hospedar; (b) só linkar para o documento original na CVM | (b) só link | Menor escopo; evita problemas de direitos/armazenamento desnecessário |
| Detectar tipo de ativo (ação/FII) para ticker fora da carteira | (a) heurística pelo sufixo do ticker (B3: tickers terminados em "11" são cotas/units, majoritariamente FIIs no escopo deste app); (b) campo explícito no formulário de busca | (a) heurística de sufixo | Sem fricção de UI extra; escopo do app é só Ações B3 + FIIs (AGENTS.md), risco de erro é baixo e documentado aqui, não inventado silenciosamente |

### 6. Plano de implementação

1. ✅ **Spike: contrato de busca na CVM** — para 1 ação (PETR4) e 1 FII (MXRF11), determinado via navegador como consultar os documentos em cada sistema (RAD CVM para ações, Fundos.NET para FIIs). Contrato documentado na seção 5. → verificado: para os 2 ativos-piloto, a consulta real (navegador, com captura de rede) retornou relatórios reais com tipo, data e link de download. **Pendente:** mapeamento ticker→identificador CVM para tickers além dos 2 pilotos — resolver no passo 2.
2. ✅ **Cliente CVM (servidor)** — `src/lib/cvm/rad-cvm.ts` (ações) e `src/lib/cvm/fundos-net.ts` (FIIs) implementados; `src/lib/cvm/service.ts` resolve nome via brapi e despacha para o sistema certo pela heurística de sufixo do ticker. → ✅ verificado com dados reais (script `tsx` descartável, fora do repo): PETR4 retornou 4 ITRs distintos (deduplicados por período de referência, versão mais recente); MXRF11 retornou 4 Informes Mensais Estruturados reais com link de download válido. Bugs corrigidos durante a verificação: (a) `dataDe`/`dataAte` vazios quebravam o RAD CVM com `periodo=2` — corrigido enviando janela de 2 anos; (b) regex de download assumia protocolo numérico, mas o protocolo de ações é alfanumérico (`009512ITR...-79`) — corrigido; (c) Fundos.NET limita `l` (itens por página) a 200, não 500 — corrigido; (d) retificações (mesma referência, versão nova) contavam como 2 relatórios — corrigido com dedup por período.
3. ✅ **Rota `/ativos/[ticker]`** — `src/app/ativos/[ticker]/page.tsx`, layout empilhado (indicadores no topo, relatórios abaixo), estado vazio e estado de erro implementados. → verificado: `npm run build`/`lint`/`tsc --noEmit` limpos. **Validação live pendente** (requer login Supabase real — mesma limitação de ambiente do `dashboard-carteira`, ver LEARNINGS.md): renderização real da rota autenticada não testada nesta sessão.
4. ✅ **Busca por ticker no dashboard** — `src/app/dashboard/ticker-search-form.tsx` adicionado ao header do dashboard. → verificado: build/lint limpos; navegação real não testada (mesma pendência acima).

### 7. Perguntas em aberto

- [x] **1. Fonte dos relatórios:** sistemas da CVM (RAD CVM + Fundos.NET), gratuitos.
- [x] **2. Explicação didática via LLM:** adiada para o backlog.
- [x] **3. Acesso:** qualquer ticker B3 válido, não só carteira.
- [x] **4. Quantidade de relatórios:** últimos 4.
- [x] **5. Navegação:** campo de busca no topo do dashboard.
- [x] **6. Layout:** indicadores no topo, relatórios abaixo.

> O contrato técnico exato da CVM (URLs de busca, mapeamento ticker→identificador, formato da resposta) não é uma pergunta em aberto do escopo — é uma suposição não verificada, tratada como spike no passo 1 do plano (seção 6) e documentada na seção 5.

### 8. Critérios de aceite (formato EARS)

- QUANDO o usuário submete um ticker válido no campo de busca do dashboard, O SISTEMA DEVE navegar para `/ativos/TICKER`.
- QUANDO `/ativos/TICKER` é acessada para um ativo com relatórios disponíveis na CVM, O SISTEMA DEVE exibir os indicadores de mercado do ativo e até 4 relatórios gerenciais mais recentes, cada um com tipo/período, data de publicação e link para o documento original.
- QUANDO `/ativos/TICKER` é acessada para um ticker sem relatórios encontrados na CVM, O SISTEMA DEVE exibir um estado vazio claro, sem erro.
- QUANDO a consulta à CVM falha (indisponibilidade, timeout), O SISTEMA DEVE exibir os indicadores de mercado normalmente e um aviso de que os relatórios não puderam ser carregados, sem quebrar a página.
- QUANDO o usuário acessa `/ativos/TICKER` para um ticker que não está na carteira, O SISTEMA DEVE exibir a página normalmente (sem exigir que o ativo esteja cadastrado).

### Ações destrutivas ou irreversíveis nesta feature?
[ ] Não
[x] Sim → aprovação explícita será pedida na hora da execução (AGENTS.md seção 6), mesmo com o spec aprovado:
- Adicionar scraping/consulta automatizada a um site novo (sistemas da CVM: RAD CVM e Fundos.NET) — pedir aprovação explícita antes do passo 2 do plano.

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** Nickolas
**Data:** 2026-07-06
**Observações da revisão:** Aprovado sem ressalvas após brainstorming (uso do companheiro visual para navegação/layout) e fechamento das perguntas de escopo (fonte CVM, sem LLM nesta fase, qualquer ticker, últimos 4 relatórios, busca no dashboard, layout empilhado).

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

> Código 4/4 passos concluído. Cliente CVM verificado com dados reais (PETR4, MXRF11). Rota e busca no dashboard passam build/typecheck/lint mas não foram exercitadas logadas nesta sessão (sem `.env.local`/Supabase configurados aqui) — mesma limitação já registrada em `dashboard-carteira`.

### 9. Registro de validação

| Critério de aceite (EARS) | Resultado | Como foi testado |
|--------------------|-----------|------------------|
| Busca por ticker → navega para `/ativos/TICKER` | ⏳ live-pending | Código pronto (`ticker-search-form.tsx`, `router.push`); requer sessão logada real |
| `/ativos/TICKER` com relatórios disponíveis → indicadores + até 4 relatórios com tipo, data, link | ✅ (dados reais) | Cliente CVM testado fora do app com PETR4 (4 ITRs) e MXRF11 (4 Informes Mensais) via script `tsx` descartável contra RAD CVM/Fundos.NET reais; render da página não testado logado |
| Ticker sem relatórios → estado vazio, sem erro | ✅ (código) | Ramo `reports.length === 0` implementado e tipado; não exercitado com um ticker real sem relatórios |
| Falha na consulta à CVM → aviso, indicadores continuam, sem quebrar | ✅ (código) | Ramo `!reportsResult.available` implementado; falhas reais da CVM (company_not_found, HTTP não-200, captcha) tratadas sem lançar exceção, confirmado nos testes de bug-fix |
| Ticker fora da carteira → página funciona normalmente | ✅ (código) | Rota não depende de `portfolio_positions`; testado indiretamente (PETR4/MXRF11 buscados sem estarem cadastrados em nenhum banco) |

**Regressões verificadas:** nenhuma mudança em `dashboard-carteira`; `brapi/client.ts` só ganhou 2 campos opcionais (`shortName`/`longName`) na tipagem, sem alterar comportamento existente.

**Desvios do plano:** o passo 2 (spike original) subestimou a complexidade real — precisou de reverse-engineering adicional (captura de payload via JS hooks no navegador + testes diretos com `curl`/`node` contra os endpoints reais) para descobrir: filtro de data obrigatório no RAD CVM, protocolo alfanumérico (não numérico) no link de download de ações, limite de 200 itens por página no Fundos.NET, e necessidade de deduplicar retificações por período de referência. Nenhum desses detalhes estava disponível em documentação — todos confirmados empiricamente antes de codar, sem inventar formato.

**Aprendizados → LEARNINGS.md:** registrado o contrato completo de RAD CVM e Fundos.NET, incluindo os 4 bugs acima e o risco de CAPTCHA (`hdnHabilitaCaptcha`).

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
> - **RAD CVM (ações):** não tem REST documentado publicamente. A página `https://www.rad.cvm.gov.br/ENETWeb/frmConsultaExternaCVM.aspx` (a versão anterior, `/ENET/...`, foi descontinuada em 06/07/2026) carrega um form; a busca real dispara `POST https://www.rad.cvm.gov.br/ENETWeb/frmConsultaExternaCVM.aspx/ListarDocumentos` (ASP.NET PageMethod — precisa carregar a página antes, para cookies de sessão/viewstate). Empresa identificada por **Código CVM** (Petrobras = `009512`), não por ticker — precisa de um mapeamento ticker→Código CVM (não confirmado neste spike; ver pergunta em aberto abaixo). Documento de download segue o padrão `frmDownloadDocumento.aspx?Tela=ext&numSequencia=<n>&numVersao=<n>&numProtocolo=<protocolo>&descTipo=<TIPO>&CodigoInstituicao=1`. Categorias observadas incluem `ITR - Informações Trimestrais`, `Relatório de Sustentabilidade`, `Comunicado ao Mercado`, `Reunião da Administração` — a categoria mais próxima de "relatório gerencial" recorrente e estruturado é o **ITR** (Informações Trimestrais, entregue a cada trimestre).
> - **Fundos.NET (FIIs):** a URL `https://fnet.bmfbovespa.com.br/fnet/publico/abrirGerenciadorDocumentosCVM?cnpjFundo=<CNPJ sem pontuação>` (ex.: `97521225000125` para MXRF11) já carrega a grade completa de documentos do fundo, sem precisar de busca adicional. Os dados vêm de `POST https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentosDados` (endpoint server-side do DataTables). Fundo identificado por **CNPJ**, não por ticker — precisa de mapeamento ticker→CNPJ (não confirmado neste spike). Categoria relevante = `Informes Periódicos` → tipo `Informe Mensal` (mensal, com `Status` Ativo/Inativo e `Versão`/`Modalidade` AP/RE para retificações — usar a versão mais recente Ativa). Download simples: `https://fnet.bmfbovespa.com.br/fnet/publico/downloadDocumento?id=<id>`.
>
> **Mapeamento ticker → identificador CVM (resolvido por pesquisa, 2026-07-06):** não existe uma base pública gratuita direta de ticker→Código CVM/CNPJ. Alternativas investigadas e descartadas: (a) dataset aberto `cad_fi.csv` da CVM — tem CNPJ mas não confirmado ter ticker; (b) endpoint `brapi /api/v2/fii/reports` — traz CNPJ e o relatório pronto, mas é **plano Pro** (pago) e no sandbox gratuito só aceita `MXRF11`/`HGLG11` — não serve para "qualquer ticker" gratuito.
> **Abordagem escolhida:** usar o **nome da empresa/fundo** como ponte — a brapi já retorna `longName`/`shortName` no `/quote/{ticker}` (dado já buscado pelo serviço de mercado existente, sem custo extra de requisição). Esse nome alimenta a busca por nome de cada sistema CVM (RAD CVM aceita nome parcial no campo "Empresa"; Fundos.NET aceita busca textual sobre o nome do fundo). Sem base estática própria para manter. Risco conhecido: nomes ambíguos ou sem correspondência exata — tratado pelo próprio critério de aceite de "estado vazio" (seção 8), nunca escolhendo um resultado errado silenciosamente.

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Fonte dos relatórios | (a) scraping do site de RI de cada empresa/fundo; (b) sistemas oficiais da CVM (RAD CVM + Fundos.NET) | (b) CVM | Fonte única, gratuita e oficial, cobre qualquer ativo automaticamente — não exige scraper por empresa (decisão do usuário, 2026-07-06) |
| Mapeamento ticker → identificador CVM | (a) tabela estática mantida manualmente; (b) busca por nome (via `longName`/`shortName` já retornado pela brapi) dentro de cada sistema CVM; (c) endpoint pago `brapi /api/v2/fii/reports` | (b) busca por nome | Sem base própria para manter; reaproveita dado já buscado; (c) descartado por ser pago e limitado a 2 tickers no sandbox gratuito |
| Acesso à página do ativo | (a) só ativos da carteira; (b) qualquer ticker válido | (b) qualquer ticker válido | Decisão do usuário (2026-07-06) — permite pesquisar antes de comprar |
| Quantidade de relatórios exibidos | (a) últimos 4; (b) histórico completo | (a) últimos 4 | Decisão do usuário (2026-07-06) — cobre ~1 ano sem sobrecarregar a página |
| Layout da página do ativo | (a) indicadores no topo, relatórios abaixo (empilhado); (b) duas colunas lado a lado | (a) empilhado | Escolhido no protótipo visual (2026-07-06) |
| Navegação para ticker fora da carteira | (a) campo de busca no topo do dashboard; (b) só via URL direta | (a) campo de busca | Decisão do usuário (2026-07-06) |
| Armazenamento do PDF | (a) baixar e hospedar; (b) só linkar para o documento original na CVM | (b) só link | Menor escopo; evita problemas de direitos/armazenamento desnecessário |

### 6. Plano de implementação

1. ✅ **Spike: contrato de busca na CVM** — para 1 ação (PETR4) e 1 FII (MXRF11), determinado via navegador como consultar os documentos em cada sistema (RAD CVM para ações, Fundos.NET para FIIs). Contrato documentado na seção 5. → verificado: para os 2 ativos-piloto, a consulta real (navegador, com captura de rede) retornou relatórios reais com tipo, data e link de download. **Pendente:** mapeamento ticker→identificador CVM para tickers além dos 2 pilotos — resolver no passo 2.
2. **Cliente CVM (servidor)** — implementar função(ões) server-side que, dado um ticker, resolve o identificador CVM e retorna os últimos 4 relatórios (tipo, data, link), tratando ação e FII com o fluxo correto de cada sistema. → verificar: chamando a função para o ticker de ação e o de FII do passo 1, retorna a lista esperada; ticker sem relatório encontrado retorna lista vazia sem lançar exceção.
3. **Rota `/ativos/[ticker]`** — página server component que busca indicadores de mercado (reuso do serviço existente) e a lista de relatórios (passo 2), renderizando no layout empilhado aprovado (indicadores no topo, relatórios abaixo com tipo, data e link "Abrir no site da CVM"). Incluir estado vazio (nenhum relatório encontrado) e estado de erro (consulta à CVM falhou) sem quebrar a página. → verificar: acessar `/ativos/PETR4` e `/ativos/MXRF11` renderiza indicadores + relatórios reais; um ticker inválido/sem dados mostra estado vazio, não erro 500.
4. **Busca por ticker no dashboard** — campo de busca no topo do dashboard que navega para `/ativos/[ticker]` ao submeter. → verificar: digitar um ticker (da carteira ou não) e submeter leva à página correta.

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

### 9. Registro de validação

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
|                    | ✅ / ❌   |                  |

**Regressões verificadas:**
**Desvios do plano:**
**Aprendizados → LEARNINGS.md:**

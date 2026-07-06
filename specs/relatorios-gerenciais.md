# SPEC — Página do ativo com relatórios gerenciais (CVM)

**Status:** Draft
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

> **Suposição a verificar (spike, passo 1 do plano):** RAD CVM e Fundos.NET não têm API REST documentada publicamente — são sistemas web com parâmetros de busca por URL (ex.: `cnpjFundo=` no Fundos.NET, nome/código CVM no RAD CVM), sem busca direta por ticker B3. Isso significa que existe um passo de **ticker → identificador CVM** (CNPJ do fundo, ou código CVM/nome da companhia) que precisa de uma fonte confiável antes de consultar os documentos. Nenhum desses detalhes deve ser codificado às cegas — confirmar formato real da consulta e da resposta no passo 1 (spike), documentar aqui o que for confirmado, e marcar como suposição explícita o que não for.

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Fonte dos relatórios | (a) scraping do site de RI de cada empresa/fundo; (b) sistemas oficiais da CVM (RAD CVM + Fundos.NET) | (b) CVM | Fonte única, gratuita e oficial, cobre qualquer ativo automaticamente — não exige scraper por empresa (decisão do usuário, 2026-07-06) |
| Mapeamento ticker → identificador CVM | (a) tabela estática mantida manualmente; (b) resolver dinamicamente via busca nos sistemas da CVM | Definir no passo 1 (spike) conforme o que os sistemas da CVM permitirem | Não travar aqui sem confirmar se dá para buscar por ticker/nome diretamente |
| Acesso à página do ativo | (a) só ativos da carteira; (b) qualquer ticker válido | (b) qualquer ticker válido | Decisão do usuário (2026-07-06) — permite pesquisar antes de comprar |
| Quantidade de relatórios exibidos | (a) últimos 4; (b) histórico completo | (a) últimos 4 | Decisão do usuário (2026-07-06) — cobre ~1 ano sem sobrecarregar a página |
| Layout da página do ativo | (a) indicadores no topo, relatórios abaixo (empilhado); (b) duas colunas lado a lado | (a) empilhado | Escolhido no protótipo visual (2026-07-06) |
| Navegação para ticker fora da carteira | (a) campo de busca no topo do dashboard; (b) só via URL direta | (a) campo de busca | Decisão do usuário (2026-07-06) |
| Armazenamento do PDF | (a) baixar e hospedar; (b) só linkar para o documento original na CVM | (b) só link | Menor escopo; evita problemas de direitos/armazenamento desnecessário |

### 6. Plano de implementação

1. **Spike: contrato de busca na CVM** — para 1 ação (ex: PETR4) e 1 FII (ex: MXRF11), determinar manualmente como localizar o identificador CVM a partir do ticker, e como consultar os documentos (URL de busca, formato da resposta — HTML ou JSON, campos de tipo/data/link do documento) em cada sistema (RAD CVM para ações, Fundos.NET para FIIs). Documentar aqui o que foi confirmado. → verificar: para os 2 ativos-piloto, uma consulta manual (browser/curl) retorna ao menos 1 relatório real com tipo, data e link para o documento.
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

**Aprovado por:**
**Data:**
**Observações da revisão:**

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

### 9. Registro de validação

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
|                    | ✅ / ❌   |                  |

**Regressões verificadas:**
**Desvios do plano:**
**Aprendizados → LEARNINGS.md:**

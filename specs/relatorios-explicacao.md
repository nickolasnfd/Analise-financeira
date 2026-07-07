# SPEC — Explicação didática de relatórios gerenciais (FIIs)

**Status:** Draft
**Criado em:** 2026-07-07
**Projeto:** Análise Financeira
**Substitui/depende de:** `specs/relatorios-gerenciais.md` (implementado — a página `/ativos/[ticker]` já lista os relatórios via RAD CVM/Fundos.NET com link de download; esta feature assume o relatório como **input já disponível**: PDF ou URL, com metadados ticker/data/fonte)

---

## FASE 1 — ESPECIFICAR

### 1. Problema
Os relatórios gerenciais de FIIs são a principal fonte primária para entender o que acontece dentro do fundo (vacância, inadimplência, alavancagem, resultado distribuível), mas são escritos em jargão financeiro/imobiliário denso, com 5–30 páginas de tabelas e gráficos. Para quem não domina os termos (P/VP, cap rate, LTV, RMG, ABL, vacância física vs. financeira), ler o relatório consome muito tempo, gera interpretação errada ou simplesmente não acontece — a decisão acaba tomada só por cotação e DY, ignorando a informação mais rica disponível. Hoje não existe no app nenhuma ponte entre o PDF do relatório e um entendimento acessível dele.

### 2. Critério de sucesso
Dado um relatório gerencial (PDF) de um FII da carteira já disponível via `relatorios-gerenciais`, o usuário clica em "Explicar relatório" e, em menos de 90 segundos, vê uma explicação em pt-BR contendo: (a) resumo do que o relatório diz em linguagem clara; (b) glossário dos termos técnicos presentes traduzidos; (c) pontos de atenção; (d) disclaimer visível de que não é recomendação de investimento; (e) link para o relatório original com a data do documento e a data/hora da geração da explicação. Uma segunda visualização do mesmo relatório carrega a explicação salva **sem** nova chamada à API (verificável por zero consumo de tokens).

### 3. Escopo

**Dentro do escopo:**
- Gerar explicação didática (pt-BR) de 1 relatório gerencial de FII por vez, sob demanda, via API da Anthropic (Claude) com envio nativo do PDF
- Estrutura fixa da explicação: resumo em linguagem clara, termos técnicos traduzidos, pontos de atenção
- Disclaimer obrigatório e visível: "conteúdo informativo — não é recomendação de compra ou venda" (AGENTS §9)
- Citação da fonte: link do relatório original + data do relatório + data/hora da geração
- Cache no Supabase: cada relatório é explicado 1x e a explicação é persistida e reutilizada
- Guarda de custo: teto mensal de gerações, configurável, com erro claro ao exceder
- Tratamento de erros: PDF ilegível/protegido, PDF acima dos limites, API indisponível/limitada, resposta recusada
- `ANTHROPIC_API_KEY` via variável de ambiente (nunca commitada)

**Fora do escopo (explicitamente NÃO incluído — ideias vão para BACKLOG.md):**
- Obtenção/descoberta/download dos relatórios (é o spec `relatorios-gerenciais.md`, implementado)
- Explicação de relatórios de Ações (releases de resultados, ITR/DFP) — só FIIs nesta fase
- Processamento em lote / automático de todos os relatórios ao serem publicados (Batch API da Anthropic dá 50% de desconto e é candidata natural se isso virar necessidade)
- Comparação entre relatórios de meses diferentes, séries históricas ou insights cruzados com dados de mercado
- Chat/perguntas livres sobre o relatório
- Re-geração automática quando o prompt/modelo mudar (re-gerar só por ação explícita do usuário)

### 4. Restrições
- **Técnicas:** stack travada (AGENTS §2): Next.js Route Handlers/Server Components + Supabase + Vercel. A chamada à API da Anthropic roda no servidor (Route Handler), nunca no cliente. Limites nativos de PDF da API Anthropic (confirmados na doc oficial em 2026-07-07): máx. **32 MB por requisição** e **600 páginas** (100 páginas quando o contexto do modelo é <1M tokens, caso do Haiku 4.5); PDF padrão sem senha/criptografia. Envio base64 de PDF **não exige beta header**. Atenção ao limite de duração de função serverless na Vercel (ver pergunta aberta 4) — mitigável com streaming.
- **De dados:** nova tabela no Supabase para explicações persistidas (migration necessária — aprovação explícita na hora, AGENTS §6). Nenhum dado financeiro é inventado: a explicação só reformula o que está no relatório, e todo número exibido referencia o documento-fonte com data.
- **Dependências:** (1) `specs/relatorios-gerenciais.md` implementado — fornece o PDF ou URL do relatório + metadados (ticker, data do relatório, link da fonte); (2) conta na Anthropic com créditos e `ANTHROPIC_API_KEY` gerada pelo usuário (ação com custo real — aprovação explícita, AGENTS §6); (3) dashboard-carteira (auth + carteira) já existente.

---

## FASE 2 — PLANEJAR

### 5. Decisões de design

> **Fatos verificados (2026-07-07):** via skill/documentação local da claude-api (cache 2026-06-24) e doc oficial de PDF support (fetch confirmado): preços por milhão de tokens — Haiku 4.5: $1 entrada / $5 saída; Sonnet 5: $3/$15 (preço introdutório $2/$10 até 2026-08-31); Opus 4.8: $5/$25. Custo de PDF: texto ≈ **1.500–3.000 tokens/página** + custo de imagem por página (cada página também é processada como imagem; o valor exato de tokens de imagem por página **não foi confirmado** — ver pergunta aberta 3). Endpoint `count_tokens` permite medir o custo exato de um PDF antes de gerar. O que não está listado aqui como verificado é suposição marcada.

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
| Quando gerar a explicação | (a) sob demanda (usuário clica) com cache; (b) pré-processamento em lote quando o relatório chega (ex.: Batch API, 50% de desconto) | **(a) sob demanda + cache** | Uso pessoal, ~5 FIIs: a maioria dos relatórios talvez nunca seja aberta — lote gastaria créditos em explicações não lidas. Sob demanda só paga pelo que é usado; o cache elimina custo repetido. Lote/Batch fica anotado como evolução futura se o volume crescer |
| Como enviar o PDF ao modelo | (a) PDF nativo (bloco `document` base64, sem beta); (b) extrair texto antes (ex.: lib de parsing) e enviar só texto | **(a) PDF nativo** | Relatórios de FII são cheios de tabelas e gráficos (vacância, cronograma de vencimentos, mapa de contratos); com PDF nativo cada página é processada como texto **e** imagem, preservando o conteúdo visual. Extração prévia de texto seria mais barata, mas perde tabelas/gráficos e adiciona dependência e modos de falha próprios. Trade-off aceito: custo maior por página |
| Persistência da explicação | (a) gerar 1x e salvar no banco (cache permanente); (b) re-gerar a cada visualização; (c) cache com TTL | **(a) salvar no banco** | O relatório é um documento imutável — a explicação de um PDF não "envelhece". Re-gerar multiplicaria custo por nada e traria variação entre leituras. Registro guarda: referência ao relatório (ticker + data + URL fonte), hash/identificador do PDF, modelo usado, tokens consumidos, explicação (markdown), data/hora da geração. Re-geração só por ação explícita do usuário (sobrescreve) |
| Modelo | Haiku 4.5 ($1/$5); Sonnet 5 ($3/$15; intro $2/$10); Opus 4.8 ($5/$25) | **Recomendação: Sonnet 5** — confirmação na pergunta aberta 1 | Explicar finanças para leigo sem distorcer exige qualidade de leitura de tabelas e didática; Haiku é o mais barato mas com maior risco de perder nuance; Opus é o mais capaz porém ~2,5× o custo do Sonnet para tarefa que não exige raciocínio longo. Escolha final é do usuário (custo real = decisão dele, AGENTS §6) |
| Formato da resposta do modelo | (a) texto livre; (b) estrutura fixa via prompt (seções: resumo / termos traduzidos / pontos de atenção) | **(b) estrutura fixa via prompt** | Garante que os 3 blocos do critério de sucesso sempre existam e permite renderização consistente na UI. O disclaimer e a citação da fonte **não** dependem do modelo: são renderizados pela própria UI, sempre (nunca delegados ao LLM) |
| Guarda de custo | (a) sem limite; (b) teto mensal de gerações no banco, verificado antes de chamar a API | **(b) teto mensal** | AGENTS §6: ações com custo real exigem controle. Contador mensal de gerações; ao exceder, erro claro sem chamar a API. Valor do teto: pergunta aberta 2 |
| PDF acima dos limites da API (>32 MB ou acima do limite de páginas) | (a) tentar dividir o PDF; (b) rejeitar com mensagem clara | **(b) rejeitar com mensagem clara** | Relatório gerencial típico tem 5–30 páginas — muito abaixo dos limites; divisão automática é complexidade especulativa (AGENTS §4). Se acontecer na prática, vira spec próprio |

**Elementos obrigatórios da UI (invariantes, renderizados pela aplicação):**
- Disclaimer visível junto de toda explicação: *"Esta explicação é informativa e educacional. Não é recomendação de compra, venda ou manutenção de ativos."*
- Citação da fonte: link para o relatório original + data do relatório + data/hora em que a explicação foi gerada + modelo utilizado.

**Estimativa de custo (⚠️ ESTIMATIVA — premissas explícitas, custo real medido no passo 3 do plano):**
- Premissa A (confirmada na doc): texto = 1.500–3.000 tokens/página.
- Premissa B (**SUPOSIÇÃO**): tokens de imagem por página não confirmados com número exato; adoto faixa de trabalho total (texto+imagem) de **~2.000–5.000 tokens/página**.
- Premissa C (**SUPOSIÇÃO**): saída (explicação) ≈ 2.000 tokens.
- Relatório de 30 páginas (pior caso típico): entrada ≈ 60k–150k tokens. Com **Sonnet 5** a preço cheio ($3/$15): entrada $0,18–0,45 + saída $0,03 ≈ **US$ 0,21–0,48 por relatório** (no preço introdutório $2/$10 até 2026-08-31: ≈ US$ 0,14–0,32). Relatório de 5 páginas: ≈ US$ 0,04–0,09.
- Mês típico da carteira (5 FIIs × 1 relatório/mês, 10–30 págs cada): ≈ **US$ 0,50–2,50/mês** com Sonnet 5. Com Haiku 4.5: ≈ US$ 0,15–0,80/mês. Com Opus 4.8: ≈ US$ 0,80–4,00/mês. Cache garante que releituras custam zero.
- Aferição precisa por PDF: chamar `count_tokens` antes de gerar (passo 3 valida a conta com um relatório real).

### 6. Plano de implementação

1. **Schema + RLS** — migration criando `report_explanations` (id, user_id → auth.users, ticker, report_date, source_url, pdf_hash, model, input_tokens, output_tokens, explanation_md, generated_at) com RLS restringindo ao próprio usuário, e unicidade por (user_id, pdf_hash). → verificar: tabela existe com RLS ativa e SELECT com outro user_id retorna zero linhas. *(Aprovação explícita antes de aplicar a migration — AGENTS §6.)*
2. **Ambiente** — `ANTHROPIC_API_KEY` em `.env.local` e `.env.example` (placeholder); confirmar `.env*` no `.gitignore`; instalar SDK oficial `@anthropic-ai/sdk`. → verificar: `git status`/histórico não contêm a chave e o build passa com o SDK instalado.
3. **Spike de custo e contrato** — com 1 relatório gerencial real de FII da carteira: chamar `count_tokens` (mede tokens reais do PDF) e 1 geração completa; registrar neste spec tokens de entrada/saída e custo real, validando/corrigindo a estimativa da seção 5. → verificar: chamada retorna 200 e a tabela de custo real está preenchida no spec.
4. **Serviço de explicação** — função de servidor que recebe (PDF ou URL + metadados vindos de `relatorios-gerenciais`), monta o prompt (pt-BR, público leigo, estrutura fixa resumo/termos/pontos de atenção, proibição explícita de recomendação e de inventar números ausentes do relatório) e envia o PDF nativo (bloco `document` antes do texto); trata 413/limites, 429, 500/529 e `stop_reason: refusal` sem lançar exceção não tratada. → verificar: para o PDF do passo 3, retorna explicação com as 3 seções, sem verbos de recomendação (comprar/vender/manter como conselho), e cada erro simulado retorna objeto de erro tipado.
5. **Cache + guarda de custo** — persistir a explicação em `report_explanations`; antes de gerar: (a) se já existe pelo `pdf_hash`, retornar a salva sem chamar a API; (b) se o teto mensal de gerações foi atingido, retornar erro de limite sem chamar a API. → verificar: 2ª solicitação do mesmo PDF consome 0 tokens (nenhuma chamada); com teto forçado em 0, a geração é bloqueada com mensagem clara.
6. **UI de explicação** — na área do relatório (integrada à superfície criada por `relatorios-gerenciais` — página /ativos/[ticker]): botão "Explicar relatório", estado de carregamento (streaming/progresso), renderização do markdown com as 3 seções, disclaimer fixo, citação da fonte (link + data do relatório) e data/hora da geração + modelo. → verificar: com um relatório explicado, todos os elementos obrigatórios estão visíveis na página.
7. **Estados de erro na UI** — mensagens específicas para: PDF ilegível/protegido/acima do limite, API indisponível/limitada (com orientação de tentar mais tarde), teto de custo atingido e resposta recusada; nenhum deles quebra a página. → verificar: cada cenário simulado exibe sua mensagem e o restante da página continua funcional.
8. **Validação + registro** — executar os critérios EARS (seção 8) com pelo menos 2 relatórios reais de FIIs distintos, preencher a seção 9 e atualizar `specs/STATUS.md`. → verificar: todos os critérios com ✅/justificativa e STATUS.md atualizado.

### 7. Perguntas em aberto

> O spec NEVER pode receber status `Aprovado` com perguntas abertas sem resposta.

- [ ] **1. Modelo definitivo:** recomendação é `claude-sonnet-5` ($3/$15 por MTok; intro $2/$10 até 2026-08-31). Alternativas: `claude-haiku-4-5` ($1/$5, mais barato, risco de perder nuance) e `claude-opus-4-8` ($5/$25, máxima qualidade). Como há custo real, a escolha é do usuário (AGENTS §6). Qual usar?
- [ ] **2. Teto de custo mensal:** qual limite de gerações/custo por mês é aceitável? (Sugestão inicial: 20 gerações/mês ≈ US$ 2–10 no pior caso com Sonnet 5 — SUPOSIÇÃO a validar com o custo real do passo 3.)
- [ ] **3. Tokens de imagem por página:** a doc confirma 1.500–3.000 tokens/página de texto e diz que cada página também é cobrada como imagem, mas **não** foi confirmado o número exato de tokens de imagem por página. A faixa de trabalho de ~2.000–5.000 tokens/página totais é SUPOSIÇÃO — o passo 3 (spike com `count_tokens`) resolve empiricamente.
- [ ] **4. Timeout na Vercel:** qual o limite de duração de função do plano Vercel atual do projeto e ele comporta uma geração de ~30–90s? **Não confirmado nesta sessão.** Mitigação provável: resposta em streaming. Verificar antes do passo 4.
- [ ] **5. Contrato com `relatorios-gerenciais`:** a página implementada entrega o link de download da fonte (RAD CVM/Fundos.NET); o serviço de explicação baixará o PDF a partir desse link (server-side) para enviar em base64 — confirmar antes do passo 4 (afeta se enviamos base64 ou referenciamos URL).
- [ ] **6. Conta/chave Anthropic:** o usuário criará a conta na Anthropic, adicionará créditos e gerará a `ANTHROPIC_API_KEY`? (Ação financeira — precisa de "aprovado" explícito; a chave entra só via env var, local e na Vercel.)
- [ ] **7. Relatório sem PDF acessível:** se a fonte (RAD CVM/Fundos.NET) bloquear o download server-side e só restar o link (sem download possível/permitido), a explicação fica indisponível para aquele relatório? (Proposta: sim, com mensagem clara — nada de scraping novo sem aprovação, AGENTS §6.)

### 8. Critérios de aceite (formato EARS)

- QUANDO o usuário clica em "Explicar relatório" para um relatório gerencial de FII ainda não explicado (PDF válido, dentro dos limites), O SISTEMA DEVE gerar e exibir, em até 90 segundos, a explicação em pt-BR com as 3 seções (resumo, termos traduzidos, pontos de atenção).
- QUANDO uma explicação é exibida, O SISTEMA DEVE mostrar de forma visível o disclaimer "não é recomendação de investimento", o link do relatório original, a data do relatório e a data/hora da geração.
- QUANDO uma explicação é gerada, O SISTEMA DEVE persisti-la e, em qualquer visualização posterior do mesmo relatório, exibir a versão salva sem nova chamada à API da Anthropic.
- QUANDO a explicação é gerada, O SISTEMA DEVE apresentar apenas conteúdo informativo — sem instrução ou sugestão de comprar, vender ou manter o ativo — e sem números que não constem do relatório-fonte.
- QUANDO o PDF é ilegível, protegido por senha ou excede os limites da API (32 MB / limite de páginas), O SISTEMA DEVE exibir mensagem de erro clara indicando o motivo, sem chamar (ou sem re-tentar indefinidamente) a API e sem quebrar a página. ← caso de erro
- QUANDO a API da Anthropic está indisponível ou retorna limite de uso (429/500/529), O SISTEMA DEVE exibir aviso de indisponibilidade temporária com orientação de tentar mais tarde, sem quebrar a página. ← caso de erro
- QUANDO o teto mensal de gerações foi atingido, O SISTEMA DEVE bloquear a nova geração antes de chamar a API e informar o limite ao usuário. ← caso de erro
- QUANDO a API retorna uma recusa (`stop_reason: refusal`) ou resposta sem as seções esperadas, O SISTEMA DEVE informar que a explicação não pôde ser gerada para aquele documento, sem exibir conteúdo parcial como se fosse completo. ← caso de erro

### Ações destrutivas ou irreversíveis nesta feature?
[ ] Não
[x] Sim → listar aqui e confirmar que aprovação explícita será pedida na hora da execução (AGENTS.md seção 6), mesmo com o spec aprovado:
- **Custo real de API (ação financeira):** criar conta Anthropic, adicionar créditos e cada chamada de geração consome créditos — aprovação explícita antes do passo 3 (primeira chamada real) e teto mensal como salvaguarda contínua.
- **Migration de schema no Supabase** (passo 1) — aprovação explícita antes de aplicar.
- **Variável de ambiente em produção** (`ANTHROPIC_API_KEY` na Vercel) — aprovação explícita antes de alterar env de produção.
- Re-geração explícita de uma explicação sobrescreve a versão salva — confirmada pelo próprio usuário na UI a cada uso (comportamento previsto da feature).

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

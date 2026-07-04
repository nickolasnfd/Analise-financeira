# SPEC — [Nome da feature]

**Status:** Draft | Em revisão | Aprovado | Implementado
**Criado em:** [AAAA-MM-DD]
**Projeto:**
**Substitui/depende de:** [link para outro spec, se aplicável]

---

## FASE 1 — ESPECIFICAR

### 1. Problema
O que está quebrado, faltando ou manual hoje? Descreva o problema sem mencionar solução. Se possível, descreva o custo de não resolver (tempo perdido, erro recorrente, fricção).

### 2. Critério de sucesso
Como saber, de forma binária (sim/não), que isso funcionou? NEVER usar critérios vagos ("funciona bem", "melhora a experiência"). Bom exemplo: "Usuário envia `+leite 2` no Telegram e o item aparece no inventário com quantidade 2 em menos de 5 segundos."

### 3. Escopo

**Dentro do escopo:**
-

**Fora do escopo (explicitamente NÃO incluído — ideias vão para BACKLOG.md):**
-

### 4. Restrições
- **Técnicas:** deve respeitar a stack travada em AGENTS.md seção 2. Restrições adicionais:
- **De dados:** que dados existem, que dados precisam ser criados, migrations necessárias:
- **Dependências:** features/serviços que precisam existir antes:

---

## FASE 2 — PLANEJAR

### 5. Decisões de design
> Escolhas de implementação que valem registrar ANTES de codificar: estrutura de dados, endpoints, componentes, fluxo. Se há duas abordagens viáveis, listar ambas com tradeoffs e marcar a escolhida. NEVER escolher silenciosamente.

| Decisão | Opções consideradas | Escolha | Por quê |
|---------|--------------------|---------|--------|
|         |                    |         |        |

### 6. Plano de implementação
> Passos numerados, cada um com verificação binária. Um passo = uma unidade validável antes de seguir. Máximo ~8 passos — acima disso, dividir em dois specs.

1. [Passo] → verificar: [checagem binária]
2. [Passo] → verificar: [checagem binária]
3. [Passo] → verificar: [checagem binária]

### 7. Perguntas em aberto
> O spec NEVER pode receber status `Aprovado` com perguntas abertas sem resposta.

- [ ]

### 8. Critérios de aceite (formato EARS)
> Sintaxe: QUANDO <gatilho>, O SISTEMA DEVE <resposta observável>.
> Cada critério deve ser testável por uma pessoa sem ler o código.

- QUANDO ..., O SISTEMA DEVE ...
- QUANDO ..., O SISTEMA DEVE ...
- QUANDO [entrada inválida/erro], O SISTEMA DEVE ... ← incluir pelo menos 1 caso de erro

### Ações destrutivas ou irreversíveis nesta feature?
[ ] Não
[ ] Sim → listar aqui e confirmar que aprovação explícita será pedida na hora da execução (AGENTS.md seção 6), mesmo com o spec aprovado:

---

## FASE 3 — APROVAÇÃO

**Aprovado por:** [nome]
**Data:**
**Observações da revisão:**

---

## FASE 5 — VALIDAÇÃO (preencher após implementar)

### 9. Registro de validação

| Critério de aceite | Resultado | Como foi testado |
|--------------------|-----------|------------------|
|                    | ✅ / ❌   |                  |

**Regressões verificadas:** [quais funcionalidades existentes foram re-testadas]
**Desvios do plano:** [o que mudou durante a implementação e por quê]
**Aprendizados → LEARNINGS.md:** [erros novos encontrados e soluções, se houver]

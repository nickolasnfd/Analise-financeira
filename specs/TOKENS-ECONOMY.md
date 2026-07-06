# TOKEN-ECONOMY — regras de economia de tokens para sessões de agente

**Inspiração:** [rtk](https://github.com/rtk-ai/rtk) (proxy de CLI que corta
60–90% dos tokens filtrando output na fonte).

> **Princípio único:** o contexto da sessão é o recurso mais caro do projeto.
> Todo output que entra na conversa deve ser **filtrado na fonte** — nunca
> despejar bruto para depois resumir. As 4 técnicas do rtk: filtrar, agrupar,
> truncar, deduplicar. E a 5ª que adotamos: **salvar o bruto em arquivo e só
> ler em caso de falha**.

## 1. Shell (Bash)

- MUST filtrar todo comando ruidoso no pipe, nunca exibir bruto:
  - testes: `npx vitest run 2>&1 | grep -E "Test Files|Tests |FAIL|✕"`
  - build: `npm run build 2>&1 | grep -E "error|✓ built"`
  - install: `npm install ... 2>&1 | tail -3`
  - git: `git log --oneline -N` · `git status --short` · `git push -q`
- MUST usar o padrão "bruto em arquivo": `comando >/tmp/x.log 2>&1` e mostrar
  só `tail`/`grep` do log; ler o arquivo inteiro APENAS se o comando falhar.
- NEVER usar `cat` de arquivo grande no chat; NEVER `ls -R` sem limite.

## 2. Leitura de arquivos

- MUST localizar com Grep/Glob ANTES de ler; ler com `offset`/`limit` quando o
  arquivo passar de ~100 linhas e só o trecho interessar.
- NEVER reler um arquivo logo após editá-lo (o estado já está no contexto).
- NEVER reler arquivos do harness (AGENTS/STATUS/specs) já lidos na sessão.

## 3. MCP do GitHub (maior vilão medido em projetos anteriores)

- Contexto: `actions_list` chegou a retornar **100–215 KB por chamada**.
- MUST preferir `git` local a MCP quando equivalente (log, diff, branch).
- MUST usar `per_page` mínimo (1–5) e `minimal_output: true` quando existir.
- Quando o output estourar e for salvo em arquivo: extrair SÓ os campos
  necessários com `python3 -c "import json; ..."` — nunca ler o arquivo cru.
- Para status de CI: 1 chamada `list_workflow_runs` com `per_page=1` + extração
  de `status/conclusion`; detalhar com `list_workflow_jobs` só se falhou.

## 4. Verificação visual (Playwright)

- MUST preferir **asserções programáticas** (counts, textos, atributos,
  scrollWidth) a screenshots — um screenshot custa ordens de grandeza mais
  tokens que um `console.log` de verificação.
- Screenshots: no MÁXIMO 1–2 por feature, no fechamento; viewport em vez de
  `fullPage: true` quando a região de interesse couber; mobile só quando a
  mudança tocar CSS/layout.
- Reusar o dev server já de pé (checar com `curl -s -o /dev/null -w "%{http_code}"`)
  em vez de subir um por verificação.

## 5. Sessões e modelo (maior alavanca estrutural)

- 1 feature (spec) por sessão; sessão nova começa pelo protocolo de retomada
  (AGENTS.md §0). Sessões longas passam de 150k de contexto e todo turno
  seguinte paga esse peso inteiro.
- Modelo por fase: forte para spec/plano, intermediário para implementar,
  leve para retomada.
- Respostas de chat e corpos de PR: objetivos; tabelas curtas > prosa longa.

## 6. rtk (opcional, ambiente local)

Se quiser a ferramenta em si na SUA máquina: `rtk init -g` instala um hook que
reescreve comandos Bash (`git status` → `rtk git status`) automaticamente no
Claude Code. Limitação: só intercepta Bash — Read/Grep/Glob nativos não passam
pelo hook. Em sandbox remoto (binário Rust não instalado), as regras acima
capturam o mesmo efeito manualmente.

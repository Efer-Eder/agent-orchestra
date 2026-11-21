# Relatório de desenvolvimento

Versão: `0.1.0-alpha.1` (local, não publicada). Data: 2026-11-21.

Este relatório registra o diagnóstico da Fase 0, o que mudou na Fase 2 e o que ainda falta. Cada item diz se está **Implementado** (o código existe), **Testado** (validado por teste executado), **Preparado** (configurado, depende de etapa externa) ou **Pendente**.

Prioridades: **P0** falha crítica, segurança ou perda de dados; **P1** funcionalidade principal quebrada; **P2** experiência ou qualidade importante; **P3** melhoria incremental.

## 1. Diagnóstico inicial (auditoria funcional)

Estado encontrado no início da Fase 2, item a item, com a evidência usada.

| #   | Pergunta                                         | Resposta no início                                                                                                                                                                                                                                                                                                                        | Evidência                                                                          |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Os três agentes executam suas responsabilidades? | Sim, com prompts e saídas próprios: Planner gera plano JSON validado, Builder propõe diffs validados, Reviewer dá veredito. **Problema (P1):** o Reviewer recebia só os diffs, sem a solicitação nem o plano.                                                                                                                             | `src/providers/openai-compatible.ts`, `src/providers/parse.ts`, testes do provedor |
| 2   | Orquestração real ou sequência de prompts?       | Real: máquina de estados explícita com transições validadas; cada etapa recebe a saída estruturada da anterior. O "Orchestra" é narração da interface no fluxo de sessão; como persona só existe no chat direto.                                                                                                                          | `src/domain/workflow.ts` (`TRANSITIONS`), `workflow.test.ts`                       |
| 3   | Comunicação estruturada entre agentes?           | Sim: `Plan` → `ProposedChange[]` → `Review`, tipados e validados (`parsePlan`, `parseChanges`, `parseReview`). Faltava o contexto do pedido para o Reviewer (item 1).                                                                                                                                                                     | `src/domain/types.ts`, `src/providers/parse.ts`                                    |
| 4   | Estados persistidos?                             | Sim, em `localStorage` (`agent-orchestra.data.v1`), sem a chave. Não há registro por passo de agente (P2).                                                                                                                                                                                                                                | `src/app/persistence.ts`, `state.test.ts`                                          |
| 5   | Interromper com segurança?                       | Sim: `AbortSignal` em todas as chamadas; cancelamento leva a `cancelled`. **Limitação (P3):** a leitura de arquivos no Rust não é cancelável no meio.                                                                                                                                                                                     | `workflow.test.ts` ("cancels an in-flight call")                                   |
| 6   | Aprovações humanas funcionam?                    | A do plano, sim (nada executa sem ela). **Problema (P1):** não havia aprovação final depois da revisão; a sessão ia direto para `completed`.                                                                                                                                                                                              | `workflow.ts` antes do commit `7fdc90d`                                            |
| 7   | Recupera o estado após reinício?                 | Sim: sessões interrompidas voltam como `failed` com o motivo (`recoverInterrupted`). Observado no app desktop entre duas execuções.                                                                                                                                                                                                       | `persistence.ts`, `state.test.ts`, execução manual                                 |
| 8   | Gerenciamento de modelos funciona?               | Um modelo por provedor, com teste de conexão (`/models`). **Problemas (P2):** sem modelo por agente; sem nova tentativa em falhas passageiras; sem streaming; provedor real nunca validado ponta a ponta (sem chave).                                                                                                                     | `openai-compatible.ts`, `SettingsView.tsx`                                         |
| 9   | Custos e tokens medidos corretamente?            | Tokens reais quando o provedor informa; sintéticos (marcados) no modo demonstração. **Problemas (P2):** uso não atribuído a cada agente; sem estimativa de custo.                                                                                                                                                                         | `Usage.synthetic`, `RightPanel.tsx`                                                |
| 10  | Configurações sobrevivem ao fechamento?          | Sim (tipo de provedor, endereço, modelo). A chave fica no Gerenciador de Credenciais do Windows quando o usuário pede.                                                                                                                                                                                                                    | `persistence.ts`, `src-tauri/src/secrets.rs` (4 testes)                            |
| 11  | Riscos em comandos e arquivos?                   | Não há execução de comandos nem escrita no disco. Leitura só dentro da pasta autorizada, com canonicalização, lista de negação, limites (12 arquivos, 64 KiB cada, 200 KiB no total) e redação de segredos. Conteúdo vai ao modelo marcado como não confiável. **Risco residual (P2):** a chave e o conteúdo lido passam pelo JavaScript. | `src-tauri/src/project_fs.rs` (6 testes), ADR 0009, `docs/threat-model.md`         |
| 12  | Compila e instala no Windows?                    | Compila: `npx tauri build` gera o instalador NSIS (2,52 MiB) e o executável. **Problemas (P2):** versão `0.0.0`; instalador sem assinatura e sem guia; instalação em si não testada.                                                                                                                                                      | build local, `src-tauri/tauri.conf.json`                                           |

**P0 encontrados: nenhum.** Não há segredo versionado (gitleaks no CI), `npm audit` sem vulnerabilidades, e nenhum caminho do app escreve no disco ou roda comandos.

## 2. Problemas encontrados e situação

| Prioridade | Problema                                                      | Situação                                                                   |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P1         | Reviewer sem a solicitação e o plano                          | Implementado e testado                                                     |
| P1         | Sem aprovação humana final                                    | Implementado e testado                                                     |
| P2         | Sem nova tentativa em 429/502/503/504/queda de rede           | Implementado e testado                                                     |
| P2         | Provedor real sem validação do caminho HTTP                   | Testado por contrato (servidor local real); rodada com chave real pendente |
| P2         | Sem modelo por agente                                         | Implementado e testado                                                     |
| P2         | Uso não atribuído a cada agente; sem registro de ferramentas  | Implementado e testado                                                     |
| P2         | Sem estimativa de custo                                       | Implementado e testado (sempre rotulada como estimativa)                   |
| P2         | Estados do Octo incompletos frente à especificação            | Implementado; "downloading" preparado                                      |
| P2         | Versão `0.0.0`, instalador sem guia e sem aviso de assinatura | Implementado (versão alpha, guia, build)                                   |
| P2         | Sem templates de issue e PR; README sem limitações            | Implementado                                                               |
| P2         | Chave e conteúdo dos arquivos passam pelo JavaScript          | Pendente (chamadas HTTP no Rust)                                           |
| P2         | Sem streaming                                                 | Pendente                                                                   |
| P3         | Sem syntax highlighting nos diffs e no código                 | Pendente                                                                   |
| P3         | Sem anexos no composer                                        | Pendente                                                                   |
| P3         | `localStorage` em vez de SQLite                               | Pendente                                                                   |
| P3         | Leitura de arquivos não cancelável no meio                    | Pendente                                                                   |
| P3         | Instalador sem assinatura de código                           | Pendente (depende de certificado)                                          |

## 3. Alterações implementadas

Commits locais desta fase (nenhum enviado ao GitHub):

| Commit    | O que mudou                                                                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `7fdc90d` | Estado `awaiting_final_approval`, função `approveFinal`, evento `final_approval`; o Reviewer recebe solicitação e plano.                        |
| `364fd73` | Prompt do Reviewer confere as mudanças contra o pedido e o plano aprovado.                                                                      |
| `d18f507` | Cartão de aprovação final na conversa (aceitar, rejeitar com motivo, pedir ajuste pelo composer).                                               |
| `7357efb` | Nova tentativa com espera exponencial (até 2), respeitando `Retry-After` até 10 s, cancelável; 401 e 400 nunca repetem. Teste de contrato HTTP. |
| `6fc6e69` | `AgentRun` por passo: provedor, modelo, início, fim, duração, status, uso, ferramentas (`list_files`, `read_files`) e erro. Modelo por agente.  |
| `8f0c254` | Interface: resumo do passo em cada turno, lista de execuções no painel, campos de modelo por agente e preços, custo estimado.                   |
| `d1d5ff3` | Octo: regendo, revisando, baixando, reverência, apontando o erro, cochilo por inatividade; anima sempre (decisão registrada no DESIGN.md).      |
| `f46245a` | Formulários de issue (bug, ideia, link privado de vulnerabilidade) e checklist de PR.                                                           |
| `c4a283b` | "Limitações conhecidas" nos READMEs, guia de instalação no Windows, ROADMAP e CHANGELOG.                                                        |
| `4f2eaa3` | Versão `0.1.0-alpha.1` em `package.json`, `Cargo.toml` e `tauri.conf.json`.                                                                     |

Arquivos principais: `src/domain/{types,workflow,provider,cost}.ts`, `src/providers/openai-compatible.ts`, `src/providers/mock.ts`, `src/app/{state,persistence,format,useIdle,useOrchestra}.ts`, `src/components/{SessionView,RightPanel,SettingsView,HomeView}.tsx`, `src/components/octo/*`, `src/i18n/messages.ts`, `DESIGN.md`, `README*.md`, `ROADMAP.md`, `CHANGELOG.md`, `docs/instalacao-windows.md`, `.github/*`.

## 4. Testes executados (2026-11-21, Windows)

| Comando                                               | Resultado                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run lint`                                        | sem erros                                                                                        |
| `npm run typecheck`                                   | sem erros                                                                                        |
| `npx vitest run`                                      | 13 arquivos, **116 testes passando** (eram 88 no início)                                         |
| `npx prettier --check .`                              | ok nos arquivos do repositório                                                                   |
| `npm run build`                                       | ok; JS 346,6 kB (107,3 kB gzip), CSS 41 kB                                                       |
| `npm audit` e `npm audit --omit=dev`                  | 0 vulnerabilidades                                                                               |
| `cargo fmt --check`                                   | ok                                                                                               |
| `cargo clippy --all-targets -- -D warnings`           | sem avisos                                                                                       |
| `cargo test`                                          | 10 passando, 1 ignorado (teste do cofre real, manual)                                            |
| `npx tauri build`                                     | ok; `Agent Orchestra_0.1.0-alpha.1_x64-setup.exe`, 2,52 MiB                                      |
| Executável de release sem servidor de desenvolvimento | abriu com título, barra lateral e tela inicial (UI Automation)                                   |
| Fluxo completo no navegador (modo demonstração)       | plano → aprovação → Builder → Reviewer → cartão de aprovação final, com três execuções no painel |

Testes novos nesta fase: aprovação final (3), nova tentativa (7), `parseRetryAfter`, contrato HTTP (5), modelo por agente, registros de execução (2), custo e pareamento de execuções (4), formatação (3), persistência de modelos e preços, inatividade, estados do Octo.

**Não executado:** rodada com provedor real (não há chave neste ambiente; o caminho HTTP está coberto pelo teste de contrato); instalação do NSIS nesta máquina (altera o sistema, depende de aprovação); testes end-to-end automatizados no app desktop (validação feita por UI Automation manual).

## 5. Decisões

- **Aprovação final obrigatória** antes de `completed`. Rejeitar no fim usa o mesmo estado `rejected`.
- **Registro por passo no domínio**, não na interface: `RunRecorder` mede com o relógio injetável, então os testes são determinísticos. Falhas e cancelamentos também geram registro.
- **Custo só como estimativa.** O app não consulta preços; usa a tabela que a pessoa digita (por 1M de tokens, moeda e data) e nunca calcula custo para tokens sintéticos.
- **Nova tentativa limitada** a 2, com teto de 10 s de espera; acima disso o erro aparece na hora.
- **Octo anima sempre**, mesmo com "reduzir movimento", por decisão do dono do projeto (2026-11-21). Os mascotes dos outros agentes seguem a preferência do sistema.

## 6. Pendências e próximos passos

1. Rodada registrada com provedor real (chave e modelo de verdade), anotando modelo, tokens e tempos.
2. Mover as chamadas HTTP para o Rust, para a chave e o conteúdo dos arquivos não passarem pelo JavaScript.
3. Streaming das respostas quando o provedor suportar.
4. Syntax highlighting nos diffs.
5. Aplicar diffs aprovados no disco, com aprovação por arquivo, dentro da pasta autorizada.
6. SQLite e exportação de sessão sem segredos.
7. Assinatura de código do instalador.

## 7. Bloqueios externos

- Chave de API de um provedor real para a validação ponta a ponta.
- Certificado de assinatura de código para o instalador.
- Aprovação para enviar os commits, publicar release e atualizar a página do projeto.

## 8. Riscos conhecidos

- **Prompt injection pelo conteúdo do projeto:** mitigado (conteúdo marcado como não confiável, saídas validadas, nada é executado ou gravado), não eliminado. Um modelo pode propor diffs ruins; a revisão e as duas aprovações humanas são a barreira.
- **Chave no processo da interface** durante a chamada (ver pendência 2).
- **Dados em `localStorage`:** limpar os dados do WebView apaga o histórico.
- **Instalador sem assinatura:** o SmartScreen avisa; o guia explica como conferir o SHA-256.

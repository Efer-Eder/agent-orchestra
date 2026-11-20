# Modelo de ameaças (inicial)

> Versão 0 — escrito na fase de fundação. Será revisado antes de qualquer recurso que toque disco, rede ou execute comandos.
> **Agent Orchestra não oferece sandbox.** Nenhum isolamento foi implementado nem demonstrado.

## Escopo atual

Hoje o projeto é um frontend web que roda no navegador com um provedor **mock** em memória:

- não faz chamadas de rede para provedores de IA;
- não lê nem grava arquivos;
- não executa comandos;
- não armazena segredos;
- guarda apenas a preferência de tema no `localStorage`.

A superfície de ataque real hoje é pequena. Os riscos abaixo descrevem o que **passará a existir** com o shell Tauri e provedores reais, e as mitigações planejadas.

## Ativos

1. Código-fonte e arquivos dos projetos do usuário.
2. Chaves de API de provedores de modelo.
3. Histórico de sessões (prompts, respostas, diffs).
4. A máquina do usuário (processos, rede, outros diretórios).

## Atores e fontes não confiáveis

- **Respostas de modelos**: conteúdo não confiável, podem conter prompt injection ou comandos maliciosos.
- **Arquivos do projeto** enviados como contexto: podem conter instruções embutidas (injeção indireta).
- **Endpoints personalizados** configurados pelo usuário: podem ser maliciosos ou interceptados.
- Dependências npm/crates (cadeia de suprimentos).

## Ameaças e mitigações

| # | Ameaça | Mitigação | Estado |
| --- | --- | --- | --- |
| T1 | Modelo induz execução de código/comando | Builder só **propõe** diffs; nenhum caminho executa saída de modelo. Execução de comandos fica desabilitada até existir isolamento demonstrado (ADR 0004). | Implementado no domínio (não há executor) |
| T2 | Alteração aplicada sem consentimento | Máquina de estados exige `approvePlan` antes da execução; aplicar diffs exigirá segunda aprovação por arquivo. | Parcial: aprovação do plano existe; aplicação ainda não existe |
| T3 | Escrita fora do diretório autorizado (`..`, caminhos absolutos, symlinks, junctions do Windows) | Validação no lado Rust: canonicalização, prefixo do diretório autorizado, recusa de symlinks/junctions que escapem, testes dedicados. | Planejado |
| T4 | Vazamento de chave de API | Chaves no Credential Manager/keychain; nunca em SQLite, logs ou exportações; nunca reexibidas. | Planejado |
| T5 | Envio de `.env`, chaves SSH etc. ao modelo | Lista de negação de arquivos sensíveis no montador de contexto; nada é carregado automaticamente fora do escopo. | Planejado |
| T6 | Prompt injection via arquivos/respostas | Conteúdo tratado como dado; saídas exibidas ao humano; nenhuma ação automática derivada do texto do modelo. | Princípio adotado |
| T7 | Exfiltração via endpoint personalizado | Validação de URL (https, sem credenciais embutidas), aviso explícito ao usuário. | Planejado |
| T8 | Telemetria oculta | Nenhuma telemetria/analytics. Qualquer mudança exigirá opt-in explícito e documentação. | Implementado (não há telemetria) |
| T9 | Dependência comprometida | `package-lock.json` versionado, CI com varredura de segredos (gitleaks); revisão de licenças antes do release. | Parcial |
| T10 | Mensagens de erro enormes/injetadas na UI | Mensagens truncadas a 500 caracteres; React escapa o texto (sem `dangerouslySetInnerHTML`). | Implementado |

## Fora de escopo (por ora)

- Isolamento por containers/VM.
- Assinatura de código do instalador (não existe; não será afirmada).
- Ataques com acesso local de administrador à máquina.

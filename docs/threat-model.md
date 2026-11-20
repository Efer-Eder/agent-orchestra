# Modelo de ameaças (inicial)

> Versão 0 — escrito na fase de fundação. Será revisado antes de qualquer recurso que toque disco, rede ou execute comandos.
> **Agent Orchestra não oferece sandbox.** Nenhum isolamento foi implementado nem demonstrado.

## Escopo atual

O projeto é uma interface React (no navegador ou dentro de um shell Tauri 2 mínimo) que:

- chama um **provedor de IA OpenAI-compatível** somente quando o usuário o configura, e somente no endereço informado;
- usa um modo demonstração offline por padrão;
- **lê** (nunca grava) arquivos da pasta autorizada do projeto, só no app desktop e só depois da aprovação do plano; **não** executa comandos;
- salva projetos, sessões e conversas no `localStorage` do WebView; a chave de API fica só em memória;
- no shell desktop: CSP restritiva (`connect-src` limitado a `https:` e `localhost`), capability `core:default` mais seis comandos liberados um a um (três de chave e `project_check_root`, `project_list_files`, `project_read_files`), e nenhum plugin (`fs`, `shell`, `http`).

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

| #   | Ameaça                                                                                                     | Mitigação                                                                                                                                                                                                                                                                 | Estado                                                              |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| T1  | Modelo induz execução de código/comando                                                                    | Builder só **propõe** diffs; nenhum caminho executa saída de modelo. Execução de comandos fica desabilitada até existir isolamento demonstrado (ADR 0004).                                                                                                                | Implementado no domínio (não há executor)                           |
| T2  | Alteração aplicada sem consentimento                                                                       | Máquina de estados exige `approvePlan` antes da execução; aplicar diffs exigirá segunda aprovação por arquivo.                                                                                                                                                            | Parcial: aprovação do plano existe; aplicação ainda não existe      |
| T3  | Leitura ou escrita fora do diretório autorizado (`..`, caminhos absolutos, symlinks, junctions do Windows) | Rust: canonicalização, prefixo do diretório autorizado, links não seguidos na listagem, lista de negação, testes dedicados (inclusive com junction real).                                                                                                                 | Leitura: implementado (ADR 0009). Escrita: ainda não existe no app. |
| T4  | Vazamento de chave de API                                                                                  | Chave em memória ou no Gerenciador de Credenciais do Windows (comandos Rust com validação, permissão explícita por comando); nunca no `localStorage` (teste); removida de mensagens de erro; enviada só ao endereço configurado. Ainda passa pelo JS para a chamada HTTP. | Implementado (desktop)                                              |
| T5  | Envio de `.env`, chaves SSH etc. ao modelo                                                                 | Lista de negação no Rust (pastas, nomes e extensões sensíveis), nada é lido sem aprovação do plano, redação de tokens e chaves no conteúdo antes de sair do Rust.                                                                                                         | Implementado (ADR 0009); a redação é heurística.                    |
| T6  | Prompt injection via arquivos/respostas                                                                    | Conteúdo tratado como dado; saídas exibidas ao humano; nenhuma ação automática derivada do texto do modelo.                                                                                                                                                               | Princípio adotado                                                   |
| T7  | Exfiltração via endpoint personalizado                                                                     | URL validada: https obrigatório (http só em localhost), sem credenciais, query ou âncora. O usuário escolhe o endereço e é avisado.                                                                                                                                       | Implementado                                                        |
| T8  | Telemetria oculta                                                                                          | Nenhuma telemetria/analytics. Qualquer mudança exigirá opt-in explícito e documentação.                                                                                                                                                                                   | Implementado (não há telemetria)                                    |
| T9  | Dependência comprometida                                                                                   | `package-lock.json` versionado, CI com varredura de segredos (gitleaks); revisão de licenças antes do release.                                                                                                                                                            | Parcial                                                             |
| T11 | Saída de modelo maliciosa ou malformada (caminhos `..`, absolutos, diffs gigantes)                         | Plano, diffs e revisão validados; caminhos fora do projeto e tipos desconhecidos recusados; limites de tamanho; sessão vai para "falhou".                                                                                                                                 | Implementado                                                        |
| T12 | Dados locais adulterados no `localStorage`                                                                 | Leitura defensiva com versão e validação de formato; itens estranhos descartados.                                                                                                                                                                                         | Implementado                                                        |
| T10 | Mensagens de erro enormes/injetadas na UI                                                                  | Mensagens truncadas a 500 caracteres; React escapa o texto (sem `dangerouslySetInnerHTML`).                                                                                                                                                                               | Implementado                                                        |

## Fora de escopo (por ora)

- Isolamento por containers/VM.
- Assinatura de código do instalador (não existe; não será afirmada).
- Ataques com acesso local de administrador à máquina.

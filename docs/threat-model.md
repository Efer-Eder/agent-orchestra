# Modelo de ameaças (inicial)

> Versão 0 — escrito na fase de fundação. Será revisado antes de qualquer recurso que toque disco, rede ou execute comandos.
> **Agent Orchestra não oferece sandbox.** Nenhum isolamento foi implementado nem demonstrado.

## Escopo atual

O projeto é uma interface React (no navegador ou dentro de um shell Tauri 2 mínimo) que:

- chama um **provedor de IA OpenAI-compatível** somente quando o usuário o configura, e somente no endereço informado;
- usa um modo demonstração offline por padrão;
- **lê** arquivos da pasta autorizada do projeto, só no app desktop e só depois da aprovação do plano; o conteúdo é lido e posto no prompt pelo Rust (ADR 0010);
- **grava** alterações só depois da aprovação final, arquivo por arquivo marcado pela pessoa, dentro da pasta autorizada (ADR 0011); **não** executa comandos;
- no desktop, faz as chamadas ao provedor pelo Rust; a chave fica no Rust (memória ou Gerenciador de Credenciais) e nenhum comando a devolve para a interface;
- salva projetos, sessões e conversas no `localStorage` do WebView, nunca a chave;
- no shell desktop: CSP com `connect-src` limitado à IPC (a interface não acessa a rede), capability `core:default` mais onze comandos liberados um a um (`secret_save`, `secret_delete`, `project_check_root`, `project_list_files`, `project_inspect_files`, `project_apply_changes`, `provider_set_key`, `provider_key_status`, `provider_complete`, `provider_list_models`, `provider_cancel`), e nenhum plugin (`fs`, `shell`, `http`).

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

| #   | Ameaça                                                                                                     | Mitigação                                                                                                                                                                                                                                                                                               | Estado                                                 |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| T1  | Modelo induz execução de código/comando                                                                    | Builder só **propõe** diffs; nenhum caminho executa saída de modelo. Execução de comandos fica desabilitada até existir isolamento demonstrado (ADR 0004).                                                                                                                                              | Implementado no domínio (não há executor)              |
| T2  | Alteração aplicada sem consentimento                                                                       | Máquina de estados exige `approvePlan` antes da execução e `approveFinal` antes de qualquer gravação; cada arquivo é marcado pela pessoa e há confirmação com a pasta de destino.                                                                                                                       | Implementado (ADR 0011)                                |
| T3  | Leitura ou escrita fora do diretório autorizado (`..`, caminhos absolutos, symlinks, junctions do Windows) | Rust: canonicalização, prefixo do diretório autorizado, links não seguidos na listagem, lista de negação, testes dedicados (inclusive com junction real).                                                                                                                                               | Implementado: leitura (ADR 0009) e escrita (ADR 0011). |
| T4  | Vazamento de chave de API                                                                                  | Chave em memória ou no Gerenciador de Credenciais do Windows (comandos Rust com validação, permissão explícita por comando); nunca no `localStorage` (teste); removida de mensagens de erro; enviada só ao endereço configurado. No desktop, usada só pelo Rust; passa uma vez pelo JS ao ser digitada. | Implementado (desktop)                                 |
| T5  | Envio de `.env`, chaves SSH etc. ao modelo                                                                 | Lista de negação no Rust (pastas, nomes e extensões sensíveis), nada é lido sem aprovação do plano, redação de tokens e chaves no conteúdo antes de sair do Rust.                                                                                                                                       | Implementado (ADR 0009); a redação é heurística.       |
| T6  | Prompt injection via arquivos/respostas                                                                    | Conteúdo tratado como dado; saídas exibidas ao humano; nenhuma ação automática derivada do texto do modelo.                                                                                                                                                                                             | Princípio adotado                                      |
| T7  | Exfiltração via endpoint personalizado                                                                     | URL validada: https obrigatório (http só em localhost), sem credenciais, query ou âncora. O usuário escolhe o endereço e é avisado.                                                                                                                                                                     | Implementado                                           |
| T8  | Telemetria oculta                                                                                          | Nenhuma telemetria/analytics. Qualquer mudança exigirá opt-in explícito e documentação.                                                                                                                                                                                                                 | Implementado (não há telemetria)                       |
| T9  | Dependência comprometida                                                                                   | `package-lock.json` versionado, CI com varredura de segredos (gitleaks); revisão de licenças antes do release.                                                                                                                                                                                          | Parcial                                                |
| T11 | Saída de modelo maliciosa ou malformada (caminhos `..`, absolutos, diffs gigantes)                         | Plano, diffs e revisão validados; caminhos fora do projeto e tipos desconhecidos recusados; limites de tamanho; sessão vai para "falhou".                                                                                                                                                               | Implementado                                           |
| T12 | Dados locais adulterados no `localStorage`                                                                 | Leitura defensiva com versão e validação de formato; itens estranhos descartados.                                                                                                                                                                                                                       | Implementado                                           |
| T10 | Mensagens de erro enormes/injetadas na UI                                                                  | Mensagens truncadas a 500 caracteres; React escapa o texto. O único HTML injetado é o do highlight.js, que escapa a entrada (teste dedicado).                                                                                                                                                           | Implementado                                           |

## Fora de escopo (por ora)

- Isolamento por containers/VM.
- Assinatura de código do instalador (não existe; não será afirmada).
- Ataques com acesso local de administrador à máquina.

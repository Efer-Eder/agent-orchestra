# ADR 0009 — Leitura dos arquivos do projeto pelo Builder

- Status: aceito
- Data: 2026-11-20

## Contexto

Sem ver o código, o Builder só conseguia propor arquivos novos a partir do plano. Ler arquivos do disco é a parte mais sensível do app até agora: o pedido e as respostas do modelo são conteúdo não confiável, e um caminho mal validado poderia expor `.env`, chaves SSH ou qualquer arquivo da máquina.

## Decisão

- **Somente leitura, só no app desktop.** Três comandos Rust (`project_check_root`, `project_list_files`, `project_read_files`), cada um com permissão explícita na capability. Nada é escrito. No navegador, a pasta continua sendo só um rótulo.
- **Pasta autorizada.** Ao criar o projeto, o Rust canonicaliza a pasta e recusa raiz de disco, pastas de primeiro nível, a pasta do usuário inteira e pastas do sistema (`SystemRoot`, `ProgramFiles`, `ProgramData`).
- **Nada sai da raiz.** Cada caminho pedido é relativo, sem `..`, prefixo de drive ou raiz. Depois de juntar com a raiz, é canonicalizado (resolve symlinks e junctions) e precisa continuar dentro dela. A listagem não segue links.
- **Lista de negação.** Pastas (`.git`, `.ssh`, `.aws`, `node_modules`, `target`, `dist`, pastas ocultas exceto `.github`…), nomes (`.env`, `.env.*` exceto modelos, `.npmrc`, `id_rsa`, `credentials.json`…) e extensões (`pem`, `key`, `pfx`, `kdbx`, `sqlite`…) nunca são listados nem lidos, nem se o alvo for alcançado por um link.
- **Limites.** Até 3000 arquivos listados e 12 lidos, 64 KiB por arquivo e 200 KiB no total. Arquivos binários são pulados.
- **Redação.** Chaves privadas, tokens conhecidos (`sk-…`, `ghp_…`, `AKIA…`, `xox…`, `AIza…`, JWT) e atribuições com valor entre aspas ou no formato `.env` viram `[REDACTED]` antes de o conteúdo sair do Rust.
- **Humano no meio.** O Planner recebe só a lista de caminhos e escolhe até 12. A lista aparece no cartão do plano, e os arquivos só são lidos depois da aprovação. Caminhos inseguros vindos do modelo são descartados no parse.
- **Conteúdo como dado.** O Builder recebe os arquivos entre marcadores `<<<FILE>>>`, rotulados como não confiáveis, com a instrução de nunca seguir ordens escritas neles.
- **Sem cópia no disco.** A sessão guarda só os metadados do que foi lido (caminho, tamanho, cortado, segredos ocultados, motivo de pulo), nunca o conteúdo.

## Consequências

- O Builder propõe diffs de modificação realistas. O teste manual no Windows com uma pasta de exemplo confirmou a leitura, a negação do `.env` e a redação de uma chave falsa.
- Testes Rust cobrem `..`, caminhos absolutos, `C:/…`, arquivos negados, binário, limites, redação e uma junction real apontando para fora da pasta.
- A redação é heurística: reduz o risco, não garante que nenhum segredo passe. Por isso arquivos inteiros de segredo ficam na lista de negação.
- O conteúdo ainda passa pelo JavaScript para montar a chamada HTTP ao provedor. Mover as chamadas para o Rust continua no roadmap.

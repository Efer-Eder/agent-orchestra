# ADR 0011 — Gravar no disco as alterações aprovadas

- Status: aceito
- Data: 2026-11-26
- Complementa: ADR 0004 (o Builder continua só propondo) e ADR 0009 (mesmas regras de caminho)

## Contexto

Até aqui o app parava nos diffs propostos: a pessoa copiava as mudanças à mão. Gravar no disco é a operação mais arriscada do app, porque o conteúdo vem de um modelo (não confiável) e um caminho mal validado pode sobrescrever qualquer arquivo da máquina.

## Decisão

- **Só depois da aprovação final**, só no app desktop e só com pasta autorizada.
- **Aprovação por arquivo.** Nenhum arquivo vem marcado. A pessoa marca cada um e confirma num segundo passo que mostra a pasta de destino. O domínio recusa registrar gravação fora do estado `completed`.
- **Mesmas regras da leitura** (`project_fs`): caminho relativo, sem `..`, raiz ou prefixo de drive, sem nomes negados (`.env`, `.git`, `node_modules`, chaves…).
- **Nada passa por link.** Se qualquer pasta no caminho ou o próprio arquivo for symlink ou junction, a gravação é recusada. Depois de criar pastas novas, a pasta real é canonicalizada e precisa estar dentro da raiz.
- **Sem escrita às cegas.**
  - `modify` só aplica se o contexto e as linhas removidas de cada trecho baterem com o arquivo atual (procura perto da linha indicada); se não, falha com `conflict`.
  - `create` nunca substitui um arquivo existente.
  - `delete` só remove o arquivo se o diff cobrir todo o conteúdo.
- **Gravação atômica.** Escreve um arquivo temporário ao lado e renomeia. Mantém CRLF quando o arquivo já usa. Cada arquivo dá certo ou falha sozinho; o resultado (gravado ou motivo) fica na sessão e na linha do tempo.
- **Sem desfazer pelo app.** A interface avisa para usar o git.

## Consequências

- Testes Rust: `..`, caminhos absolutos e UNC, nomes negados, junction real para fora da pasta (modificar e criar), conflito, trecho deslocado, CRLF, criação sem sobrescrever, exclusão parcial recusada, arquivo por arquivo e nenhum temporário deixado para trás.
- Validação manual no app desktop: aceitar a proposta, marcar um arquivo, confirmar e conferir o arquivo gravado na pasta de exemplo.
- Ainda não há "desfazer" nem visualização prévia do arquivo inteiro depois da mudança; o diff é a prévia.

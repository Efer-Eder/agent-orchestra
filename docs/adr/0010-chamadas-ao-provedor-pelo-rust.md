# ADR 0010 — Chamadas ao provedor pelo Rust, com streaming

- Status: aceito
- Data: 2026-11-26
- Substitui em parte: ADR 0006 e ADR 0008 (a chave não volta mais para a interface)

## Contexto

Até a alpha.1, a chave saía do Gerenciador de Credenciais para o JavaScript (`secret_load`), a chamada HTTP era feita com `fetch` na interface e o conteúdo dos arquivos lidos pelo Rust voltava para o JavaScript (`project_read_files`) para montar o prompt do Builder. Qualquer código rodando no WebView (uma dependência comprometida, um bug de renderização) teria acesso aos dois.

## Decisão

- **No app desktop, toda chamada ao provedor sai do Rust** (`src-tauri/src/provider_http.rs`, `reqwest` com rustls). A interface envia modelo, mensagens e um id de requisição.
- **A chave não atravessa a IPC de volta.** A chave digitada vai uma vez para o Rust (`provider_set_key`), fica na memória do processo e pode ser copiada, dentro do Rust, para o Gerenciador de Credenciais (`secret_save` sem parâmetro de chave). `provider_key_status` diz só se existe. `secret_load` foi removido.
- **Arquivos por referência.** O Builder manda só os caminhos aprovados; o Rust lê com as regras do ADR 0009 e coloca os blocos no lugar de `{{PROJECT_FILES}}`. `project_read_files` foi substituído por `project_inspect_files`, que devolve só metadados.
- **Mesma robustez do lado Rust:** timeout por chamada, até 2 novas tentativas para 429 com `Retry-After` curto, 502/503/504 e queda de rede, nunca para 401/400, cancelamento por id (`provider_cancel`, ligado ao `AbortSignal` da interface) e chave removida de qualquer mensagem de erro.
- **Streaming (SSE) quando o servidor suporta**, com `stream_options.include_usage` para manter o uso real. O texto chega à interface por um `Channel` do Tauri. Se o servidor responder 400 ao pedido com streaming, tenta uma vez sem. Depois que algum texto já apareceu, não há nova tentativa.
- **CSP fechada:** `connect-src` só permite a IPC. A interface do desktop não consegue fazer nenhuma requisição de rede.
- **A versão web continua com `fetch`** e a chave em memória: não há Rust no navegador. Ela não lê arquivos.

## Consequências

- Testes Rust contra um servidor HTTP local (chave só no Rust, 503 com nova tentativa, 401 sem, `Retry-After` longo, timeout, cancelamento, SSE com uso, fallback sem streaming, arquivos lidos no Rust com `.env` negado e marcador desarmado).
- Validação manual no app desktop contra um servidor compatível falso: o servidor recebeu `Authorization` do Rust, os blocos de arquivo com `.env` negado e a chave falsa de exemplo ocultada, e as três etapas chegaram em streaming com uso real.
- O binário cresce com `reqwest` e rustls: o executável foi de 10,9 MB para 15,8 MB e o instalador de 2,5 MiB para 4,1 MiB.
- A chave ainda passa uma vez pelo JavaScript, quando é digitada no campo de Configurações. Depois disso, não.

# ADR 0006 — Provedor OpenAI-compatível com chave só em memória

- Status: aceito
- Data: 2026-11-20

## Contexto

O app precisa funcionar com modelos reais, não só com o mock. Guardar a chave com segurança exige o Gerenciador de Credenciais do Windows (keychain), que depende de um comando Rust ainda não escrito.

## Decisão

- Implementar um provedor para a API **Chat Completions** (`POST {base}/chat/completions`, `GET {base}/models`), que cobre OpenAI e servidores compatíveis (OpenRouter, Groq, Ollama, LM Studio…).
- Exigir `https://`; aceitar `http://` só para `localhost`/`127.0.0.1`. Recusar usuário/senha, query e âncora no endereço.
- A **chave fica apenas na memória** do app: nunca é salva no `localStorage`, em exportações ou logs, e é removida de mensagens de erro do servidor.
- Erros mapeados: 401/403 → chave recusada; 429 → limite (com `retry-after`); timeout (60 s); falha de rede; resposta fora do formato.
- Saída do modelo é **dado não confiável**: o plano, os diffs e a revisão são validados (tipos, limites de tamanho, caminhos relativos sem `..`, sem caminho absoluto, sem letra de drive).
- A CSP do Tauri passa a permitir `connect-src https:` e `http://localhost:*`/`http://127.0.0.1:*` para o endereço configurado pelo usuário.

## Consequências

- O fluxo completo funciona com um modelo real quando há chave.
- A chave precisa ser digitada a cada abertura do app até existir o armazenamento no keychain (próximo passo).
- Servidores sem CORS para a origem do app podem falhar no navegador e no WebView; a mensagem de erro orienta. Um proxy no lado Rust pode resolver depois.
- O Builder ainda não lê arquivos do projeto: propõe diffs só a partir do plano.

# ADR 0007 — Persistência local no WebView antes do SQLite

- Status: aceito
- Data: 2026-11-20

## Contexto

Perder tudo ao recarregar tornava o app pouco útil. O alvo final é SQLite no lado Rust, mas isso exige comandos Tauri, migrações e testes próprios.

## Decisão

Salvar projetos, sessões, conversas com agentes e configurações **não secretas** no `localStorage` do WebView (também funciona no navegador), sob a chave versionada `agent-orchestra.data.v1`.

- Leitura defensiva: dados corrompidos ou de outra versão são ignorados; itens com formato inesperado são descartados.
- Sessões salvas no meio de uma chamada ao provedor voltam como **falhou** ("interrompida"), em vez de parecerem ainda em execução.
- A chave de API nunca entra no snapshot (teste automatizado garante).
- "Apagar dados locais" em Configurações remove tudo, com confirmação.

## Consequências

- Histórico sobrevive a recarregar e a fechar o app.
- Limite de alguns MB do `localStorage`; suficiente para a fase atual.
- A migração para SQLite lerá este snapshot uma vez e o importará.

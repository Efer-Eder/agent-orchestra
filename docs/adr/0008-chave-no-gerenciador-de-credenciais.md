# ADR 0008 — Chave de API no Gerenciador de Credenciais do Windows

- Status: aceito (evolui a [ADR 0006](0006-provedor-openai-compativel-com-chave-em-memoria.md))
- Data: 2026-11-20

## Contexto

Digitar a chave a cada abertura era incômodo. Ela não pode ir para `localStorage`, SQLite ou arquivos do app.

## Decisão

- Comandos Rust `secret_save`, `secret_load` e `secret_delete` usando `keyring-core` 1.1 + `windows-native-keyring-store` 1.1 (serviço `agent-orchestra`, conta = endereço normalizado do provedor).
- Validação no Rust: conta com esquema http(s), caracteres restritos e até 200 caracteres; chave sem caracteres de controle e até 4096 caracteres. Mensagens de erro nunca contêm a chave.
- Os comandos são declarados em `build.rs` (`AppManifest::commands`), então cada um exige permissão explícita na capability.
- A UI só oferece "Salvar no Windows" no app desktop; no navegador a chave continua só em memória.

## Consequências

- A chave é carregada automaticamente ao abrir o app para o provedor configurado.
- A chave ainda é lida pelo JS para fazer a chamada HTTP. Mover as chamadas para o Rust é o próximo endurecimento.
- macOS/Linux precisarão dos respectivos stores (`apple-native`, Secret Service) quando houver suporte.

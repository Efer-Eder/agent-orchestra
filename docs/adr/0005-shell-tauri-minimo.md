# ADR 0005 — Shell Tauri mínimo, sem comandos nem plugins

- Status: aceito (complementa a [ADR 0002](0002-fundacao-web-antes-do-shell-tauri.md))
- Data: 2026-11-20

## Contexto

Com Rust (MSVC) e as C++ Build Tools instalados, o shell Tauri 2 pode ser compilado e verificado localmente e no CI.

## Decisão

Adicionar `src-tauri/` gerado por `tauri init` e reduzido ao mínimo:

- sem comandos Rust customizados e sem plugins (inclusive o `tauri-plugin-log` gerado por padrão foi removido);
- capability única `core:default` para a janela `main`;
- CSP restritiva (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`);
- bundle apenas NSIS; nenhum instalador publicado.

Cada capacidade nova (armazenamento, allowlist de diretórios, aplicação de diffs) entrará como comando Rust específico, com testes e atualização do modelo de ameaças.

## Consequências

- O app abre no Windows com a UI atual; o comportamento é idêntico ao do navegador.
- O CI compila, roda `clippy -D warnings` e `cargo test` em `windows-latest`.
- Ainda não há persistência: fechar o app perde os dados.

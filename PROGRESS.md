# Progresso

Registro das etapas de desenvolvimento, da mais recente para a mais antiga.

## 2026-11-20 — Etapa 1: shell desktop Tauri 2

**Status:** concluída. O app ainda é protótipo (mock, sem persistência).

### Feito

- Instalei Rust 1.100 (MSVC) e VS 2022 Build Tools (C++). O projeto continua com npm ([ADR 0001](docs/adr/0001-npm-como-gerenciador-de-pacotes.md)).
- `src-tauri/` gerado com `tauri init` (CLI 2.12.6) e reduzido ao mínimo ([ADR 0005](docs/adr/0005-shell-tauri-minimo.md)): sem plugins, sem comandos, CSP restritiva, capability `core:default`, bundle só NSIS, ícones gerados a partir do logo.
- CI: novo job `Tauri shell (windows-latest)` com `cargo fmt --check`, `cargo clippy -D warnings` e `cargo test`.

### Verificação

- `cargo build`, `cargo clippy --all-targets -- -D warnings` e `cargo fmt --check`: OK localmente.
- `npm run tauri dev`: janela "Agent Orchestra" abriu no Windows e renderizou a UI com a CSP ativa (capturada por screenshot).
- `npm run tauri build` **não** foi executado; nenhum instalador gerado ou publicado.

### Próximo passo objetivo

Persistência local: módulo `storage` em Rust com SQLite (projetos, sessões, eventos) exposto por comandos Tauri específicos, com testes `cargo test`, e a UI passando a carregar/salvar por esses comandos quando rodar no desktop (mantendo o modo navegador em memória).

## 2026-11-20 — Etapa 0: fundação

**Status:** concluída (fundação). O produto em si ainda é protótipo.

### Feito

- Projeto Vite 8 + React 19 + TypeScript 6.0 + Tailwind 4 com npm ([ADR 0001](docs/adr/0001-npm-como-gerenciador-de-pacotes.md)).
  - TypeScript fixado em `~6.0` porque o `typescript-eslint` atual aceita `<6.1`.
- Domínio em `src/domain`: tipos, máquina de estados com aprovação obrigatória ([ADR 0003](docs/adr/0003-maquina-de-estados-com-aprovacao-obrigatoria.md)).
- Provedor mock offline em `src/providers/mock.ts` (sem rede, sem disco, uso marcado como sintético).
- UI de três painéis com tema claro/escuro/sistema, estados vazios, painéis laterais ocultáveis, aprovação/rejeição/cancelamento.
- Docs: arquitetura, modelo de ameaças, 4 ADRs, guia de pré-requisitos do Tauri 2 (conferido em v2.tauri.app).
- CI: lint, typecheck, testes e build em `windows-latest` e `ubuntu-latest`; gitleaks.

### Decisões

- **Sem `src-tauri/` por enquanto** ([ADR 0002](docs/adr/0002-fundacao-web-antes-do-shell-tauri.md)): sem Rust local não dava para compilar e verificar o código.
- **Builder só propõe diffs** ([ADR 0004](docs/adr/0004-builder-propoe-diffs-sem-executar-comandos.md)).

### Verificação

- `npm run lint`, `npm run typecheck`, `npm test` (30 testes), `npm run build`: OK localmente.
- Fluxo conferido no navegador: criar projeto → solicitação → plano → aprovar → diffs → revisão “Concluída”, sem erros no console.

### Pendências

- Shell Tauri, persistência, provedor real, aplicação de diffs, exportação.

### Próximo passo objetivo

Instalar Rust (MSVC) e C++ Build Tools no Windows, rodar `npx tauri init` conforme [docs/tauri-setup.md](docs/tauri-setup.md) e fazer a UI atual abrir em uma janela desktop, com CI compilando o shell em `windows-latest`.

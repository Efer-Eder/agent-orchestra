# Progresso

Registro das etapas de desenvolvimento, da mais recente para a mais antiga.

## 2026-11-20 — Etapa 2: interface Grafite e funcionalidades reais

**Status:** concluída. O produto continua em desenvolvimento (sem acesso a arquivos, sem instalador).

### Contexto

A primeira UI de três painéis ficou simples demais. Troquei por uma interface no estilo de app desktop de chat, com tema claro/escuro/sistema, provedor real e uma seção de agentes com mascotes (estilo "companions"). Antes de implementar, comparei quatro direções visuais em `design-lab/temas/` (Grafite, Partitura, Palco, Console) e fiquei com **Grafite**, documentado em [DESIGN.md](DESIGN.md).

### Feito

- Redesenho completo: sidebar com sessões por data e busca, Home com o Orchestra, timeline com turnos dos agentes e cartão de aprovação, composer arredondado, painel de detalhes com diff, Projetos, Configurações. Fonte Inter local e ícones lucide (licenças OFL e ISC).
- Provedor OpenAI-compatível real ([ADR 0006](docs/adr/0006-provedor-openai-compativel-com-chave-em-memoria.md)) com teste de conexão e validação da saída do modelo.
- Seção Agentes com conversa direta e marcadores de mascote.
- Persistência local sem a chave ([ADR 0007](docs/adr/0007-persistencia-local-antes-do-sqlite.md)); sessões interrompidas voltam como "falhou".
- Pedido de ajuste de plano, cancelamento, apagar sessão e apagar dados locais.
- CSP do Tauri liberando `https:` e `localhost` em `connect-src` para o provedor configurado.

### Verificação

- `npm run lint`, `npm run typecheck`, `npm test` (58 testes) e `npm run build`: OK.
- Navegador (1440×900): criar projeto → sugestão → plano → aprovar → diffs → revisão; abrir diff; chat com o Orchestra; Configurações; tema claro; recarregar mantém projeto, sessão e tema.
- `npm run tauri dev`: janela abriu com a nova UI, fonte e CSP ativas (screenshot em `docs/screenshots/`).
- **Não testado**: chamada a um provedor real com chave. Os contratos 401, 429, timeout, rede e resposta malformada estão cobertos por testes com `fetch` simulado.

### Próximo passo objetivo

Guardar a chave de API no Gerenciador de Credenciais do Windows por um comando Rust (`keyring`), com testes, para não precisar digitá-la a cada abertura; depois, leitura controlada dos arquivos do projeto como contexto do Builder.

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

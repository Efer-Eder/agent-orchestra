# Agent Orchestra

[![CI](https://github.com/Efer-Eder/agent-orchestra/actions/workflows/ci.yml/badge.svg)](https://github.com/Efer-Eder/agent-orchestra/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)

🇧🇷 Português · [🇺🇸 English](README.en.md)

> **Em desenvolvimento.** Isto ainda é uma fundação, não um produto pronto. Hoje roda **só no navegador**, com um **provedor mock offline**. Não há app desktop, provedores reais, persistência nem acesso a arquivos.

Agent Orchestra será um app desktop **local-first** (Tauri 2 + React) para coordenar agentes de IA em um fluxo de desenvolvimento com três papéis — **Planner**, **Builder** e **Reviewer** — e **aprovação humana** antes de qualquer execução.

## O que funciona agora

- Layout de três painéis (projetos/sessões/agentes · timeline e aprovação · diffs/uso/contexto), com painéis laterais ocultáveis, tema claro/escuro/sistema e estados vazios.
- Fluxo completo com o provedor mock: **solicitação → plano → aprovação → execução → revisão**, com rejeição e cancelamento.
- O Builder apenas **propõe** diffs; nada é gravado no disco.
- Uso de tokens exibido como **sintético** (é do mock); nenhum custo é estimado.
- Camada de domínio em TypeScript com testes (Vitest).

## Rodar localmente (Windows, macOS ou Linux)

Pré-requisito: Node.js 22 ou mais recente.

```powershell
git clone https://github.com/Efer-Eder/agent-orchestra.git
cd agent-orchestra
npm install
npm run dev
```

Abra <http://localhost:5173>. Crie um projeto, descreva uma solicitação e aprove o plano.

Outros comandos:

| Comando             | O que faz                    |
| ------------------- | ---------------------------- |
| `npm test`          | Testes (Vitest)              |
| `npm run lint`      | ESLint                       |
| `npm run typecheck` | Checagem de tipos            |
| `npm run build`     | Build de produção em `dist/` |

## Ainda não existe

App desktop (Tauri), provedores reais (OpenAI-compatible), persistência SQLite, aplicação de diffs no disco, execução de comandos, exportação de sessões. Veja o [ROADMAP](ROADMAP.md) e o [progresso](PROGRESS.md).

## Segurança

- Sem telemetria. Sem chamadas de rede a provedores de IA nesta versão.
- O projeto **não oferece sandbox**; execução de comandos está fora de escopo até existir isolamento demonstrado.
- Leia o [modelo de ameaças](docs/threat-model.md) e a [política de segurança](SECURITY.md).

## Documentação

- [Arquitetura](docs/architecture.md)
- [Decisões (ADRs)](docs/adr/)
- [Próximo passo: shell Tauri 2](docs/tauri-setup.md)
- [Como contribuir](CONTRIBUTING.md)

## Licença

[MIT](LICENSE) © 2026 Efer Eder

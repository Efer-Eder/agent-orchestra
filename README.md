# Agent Orchestra

[![CI](https://github.com/Efer-Eder/agent-orchestra/actions/workflows/ci.yml/badge.svg)](https://github.com/Efer-Eder/agent-orchestra/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)

🇧🇷 Português · [🇺🇸 English](README.en.md) · **[Página do projeto e demo online](https://efer.online/projeto/agent-orchestra/)**

> **Em desenvolvimento.** Ainda não é um produto pronto. Roda no navegador ou em uma janela desktop (Tauri 2) no Windows, em **modo demonstração offline** ou com um **provedor OpenAI-compatível** usando a sua chave. Não há instalador publicado, acesso a arquivos do projeto nem execução de comandos.

Agent Orchestra será um app desktop **local-first** (Tauri 2 + React) para coordenar agentes de IA em um fluxo de desenvolvimento com três papéis — **Planner**, **Builder** e **Reviewer** — e **aprovação humana** antes de qualquer execução.

![Seção Agentes no app desktop, tema escuro](docs/screenshots/agentes-desktop-escuro.png)

## O que funciona agora

- Interface no estilo de app desktop de chat ([DESIGN.md](DESIGN.md), tema **Grafite**): barra lateral com sessões por data e busca, conversa com os agentes, painel de detalhes e tema claro/escuro/sistema.
- Fluxo **solicitação → plano → aprovação → execução → revisão**, com rejeição, pedido de ajuste e cancelamento a qualquer momento.
- **Provedor real OpenAI-compatível** (OpenAI, OpenRouter, Groq, Ollama, LM Studio…): endereço, modelo e chave em Configurações, com teste de conexão e mensagens claras para 401, 429, timeout e falha de rede.
- **Modo demonstração offline**, sem rede e sem chave, com respostas rotuladas.
- Seção **Agentes**: converse direto com Orchestra, Planner, Builder e Reviewer. Os mascotes ainda serão desenhados; por enquanto há marcadores.
- O Builder apenas **propõe** diffs, que você vê no painel; nada é gravado no disco. Caminhos fora do projeto são recusados.
- Projetos, sessões e conversas ficam salvos neste dispositivo. **A chave de API nunca vai para os arquivos do app**: no app desktop você pode guardá-la no **Gerenciador de Credenciais do Windows**; no navegador ela fica só na memória.
- Uso de tokens reportado pelo provedor (ou sintético no modo demonstração). Custo não é estimado enquanto não houver tabela de preços configurável.

## Rodar localmente (Windows, macOS ou Linux)

Pré-requisito: Node.js 22 ou mais recente.

```powershell
git clone https://github.com/Efer-Eder/agent-orchestra.git
cd agent-orchestra
npm install
npm run dev
```

Abra <http://localhost:5173>. Crie um projeto, descreva uma solicitação e aprove o plano. Se quiser só ver, a mesma build roda em modo demonstração em <https://efer.online/projeto/agent-orchestra/demo/>.

Outros comandos:

| Comando             | O que faz                    |
| ------------------- | ---------------------------- |
| `npm test`          | Testes (Vitest)              |
| `npm run lint`      | ESLint                       |
| `npm run typecheck` | Checagem de tipos            |
| `npm run build`     | Build de produção em `dist/` |

## App desktop (Windows)

Requer Rust (MSVC) e Microsoft C++ Build Tools — veja [docs/tauri-setup.md](docs/tauri-setup.md).

```powershell
npm run tauri dev
```

Não há instalador publicado nem assinatura de código.

## Ainda não existe

Instalador publicado, leitura dos arquivos do projeto como contexto, aplicação de diffs no disco, execução de comandos, persistência SQLite, exportação de sessões e os mascotes. Veja o [ROADMAP](ROADMAP.md) e o [progresso](PROGRESS.md).

## Segurança

- Sem telemetria. Rede só é usada quando você configura um provedor real, e só para o endereço informado.
- A chave de API vai só para o provedor configurado. No desktop, pode ficar no Gerenciador de Credenciais do Windows; nunca em arquivos do app.
- O projeto **não oferece sandbox**; execução de comandos está fora de escopo até existir isolamento demonstrado.
- Leia o [modelo de ameaças](docs/threat-model.md) e a [política de segurança](SECURITY.md).

## Documentação

- [Design (Grafite)](DESIGN.md)
- [Arquitetura](docs/architecture.md)
- [Decisões (ADRs)](docs/adr/)
- [Shell desktop Tauri 2](docs/tauri-setup.md)
- [Como contribuir](CONTRIBUTING.md)

## Licença

[MIT](LICENSE) © 2026 Efer Eder

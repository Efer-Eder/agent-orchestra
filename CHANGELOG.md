# Changelog

Todas as mudanças relevantes serão registradas aqui. O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Mascotes animados: **Octo**, o polvo do Orchestra, com humores que acompanham a sessão, e mascotes para Planner, Builder e Reviewer.
- Chave de API guardada no **Gerenciador de Credenciais do Windows** no app desktop (comandos Rust `secret_save`, `secret_load`, `secret_delete`, com permissão explícita por comando); carregada ao abrir o app.
- Novo visual **Grafite** ([DESIGN.md](DESIGN.md)): barra lateral com sessões por data e busca, conversa com turnos dos agentes, composer arredondado, painel de detalhes com diff, tema claro/escuro/sistema, fonte Inter local e ícones lucide.
- Provedor **OpenAI-compatível** real com teste de conexão, tratamento de 401, 429, timeout e rede, e validação da saída do modelo (caminhos fora do projeto recusados).
- Seção **Agentes** com cards, marcadores de mascote e conversa direta com cada agente (mock ou provedor real).
- Persistência local de projetos, sessões e conversas; a chave de API fica só em memória.
- Pedido de ajuste de plano, apagar sessão, Configurações (tema, provedor, apagar dados locais), atalhos `Ctrl+N`, `Ctrl+K`, `Ctrl+.`.
- Laboratório de temas em `design-lab/temas/`.
- Frontend React + TypeScript + Vite + Tailwind com layout de três painéis, tema claro/escuro/sistema e estados vazios.
- Camada de domínio: tipos de projeto, sessão e papéis (Planner, Builder, Reviewer).
- Máquina de estados da sessão com aprovação humana obrigatória antes da execução, rejeição e cancelamento via `AbortSignal`.
- Provedor mock offline e determinístico (sem rede e sem disco).
- Testes com Vitest, CI no GitHub Actions (Windows e Ubuntu) e varredura de segredos com gitleaks.
- Shell desktop Tauri 2 mínimo (`src-tauri/`) com CSP restritiva, capability `core:default` e sem plugins; CI com `cargo fmt`, `clippy` e `cargo test` em Windows.
- Documentação: arquitetura, modelo de ameaças inicial, ADRs e guia do shell Tauri.

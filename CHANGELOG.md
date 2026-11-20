# Changelog

Todas as mudanças relevantes serão registradas aqui. O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Frontend React + TypeScript + Vite + Tailwind com layout de três painéis, tema claro/escuro/sistema e estados vazios.
- Camada de domínio: tipos de projeto, sessão e papéis (Planner, Builder, Reviewer).
- Máquina de estados da sessão com aprovação humana obrigatória antes da execução, rejeição e cancelamento via `AbortSignal`.
- Provedor mock offline e determinístico (sem rede e sem disco).
- Testes com Vitest, CI no GitHub Actions (Windows e Ubuntu) e varredura de segredos com gitleaks.
- Documentação: arquitetura, modelo de ameaças inicial, ADRs e guia do shell Tauri.

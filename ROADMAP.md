# Roadmap

Nada aqui está pronto, exceto o que estiver marcado. Itens podem mudar de ordem.

## Fundação — concluída em 2026-11-20

- [x] Frontend React + TypeScript + Vite + Tailwind com três painéis e tema claro/escuro
- [x] Domínio: tipos, máquina de estados com aprovação obrigatória
- [x] Provedor mock offline com fluxo completo testado
- [x] CI (lint, typecheck, testes, build em Windows/Ubuntu) e varredura de segredos
- [x] Arquitetura, modelo de ameaças inicial e ADRs

## Próximo: shell desktop (Tauri 2)

- [ ] Instalar pré-requisitos (C++ Build Tools, Rust MSVC) — ver [docs/tauri-setup.md](docs/tauri-setup.md)
- [ ] `npx tauri init` com CSP restritiva e capabilities mínimas
- [ ] CI compilando o shell em `windows-latest`

## MVP v0.1.0 (critérios da especificação)

- [ ] App abre no Windows e permite criar projeto/sessão
- [ ] Persistência SQLite (projetos, sessões, eventos) que sobrevive a reinício
- [ ] Allowlist de diretórios no lado Rust, com testes de `..`, caminhos absolutos, symlinks e junctions
- [ ] Aplicar diffs aprovados apenas dentro do diretório autorizado (aprovação por alteração)
- [ ] Provedor OpenAI-compatible opcional (chave no Credential Manager) com tratamento de 401, 429, timeout e rede
- [ ] Uso real do provedor separado de estimativa de custo, com preços configuráveis (moeda, unidade, data)
- [ ] Exportar sessão em JSON/Markdown removendo segredos
- [ ] Testes de sanitização de segredos e rejeição de ações não autorizadas
- [ ] Release Windows documentada (sem afirmar assinatura de código inexistente)

## Depois do MVP

- Painéis redimensionáveis e atalhos de teclado
- Internacionalização (UI hoje em pt-BR)
- MCP com permissões por ferramenta
- Múltiplos modelos simultâneos, filas de tarefas
- Branches Git temporárias, snapshots/rollback
- Execução de comandos **somente** com isolamento demonstrado (ex.: containers)
- Plugins, colaboração, macOS/Linux

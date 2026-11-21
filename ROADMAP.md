# Roadmap

Nada aqui está pronto, exceto o que estiver marcado. Itens podem mudar de ordem.

## Fundação — concluída em 2026-11-20

- [x] Frontend React + TypeScript + Vite + Tailwind com três painéis e tema claro/escuro
- [x] Domínio: tipos, máquina de estados com aprovação obrigatória
- [x] Provedor mock offline com fluxo completo testado
- [x] CI (lint, typecheck, testes, build em Windows/Ubuntu) e varredura de segredos
- [x] Arquitetura, modelo de ameaças inicial e ADRs

## Shell desktop (Tauri 2) — concluído em 2026-11-20

- [x] Pré-requisitos (C++ Build Tools, Rust MSVC) — ver [docs/tauri-setup.md](docs/tauri-setup.md)
- [x] `tauri init` com CSP restritiva e capability mínima
- [x] CI compilando o shell em `windows-latest`

## Interface Grafite e funcionalidades reais — concluído em 2026-11-20

- [x] Redesenho no padrão Grafite ([DESIGN.md](DESIGN.md))
- [x] Provedor OpenAI-compatível com tratamento de erros
- [x] Seção Agentes com chat direto
- [x] Persistência local (WebView) sem salvar a chave

## Próximo

- [x] Chave de API no Gerenciador de Credenciais do Windows (comando Rust)
- [ ] Fazer as chamadas HTTP pelo lado Rust para a chave não passar pelo JS
- [x] Ler arquivos do projeto autorizado como contexto do Builder (pasta autorizada, negação de `.env`/chaves, limites, redação)
- [x] Mascotes dos agentes e do Orchestra (Octo)
- [x] Interface em português e inglês
- [ ] Barra de título própria no desktop
- [ ] SQLite no lado Rust, importando os dados do `localStorage`

## MVP v0.1.0 (critérios da especificação)

- [x] App abre no Windows e permite criar projeto/sessão (em memória)
- [x] Histórico sobrevive a reinício (localStorage do WebView; SQLite depois)
- [x] Pasta autorizada no lado Rust, com testes de `..`, caminhos absolutos, symlinks e junctions (leitura; ADR 0009)
- [ ] Aplicar diffs aprovados apenas dentro do diretório autorizado (aprovação por alteração)
- [x] Provedor OpenAI-compatible opcional com tratamento de 401, 429, timeout e rede, nova tentativa em falhas passageiras e chave no cofre do Windows
- [x] Uso real do provedor separado de estimativa de custo, com preços configuráveis (moeda, unidade, data)
- [x] Registro de cada passo dos agentes (modelo, duração, tokens, ferramentas) e modelo por agente
- [x] Aprovação humana final depois da revisão
- [ ] Exportar sessão em JSON/Markdown removendo segredos
- [x] Testes de sanitização de segredos e rejeição de ações não autorizadas
- [x] Instalação no Windows documentada, sem assinatura de código ([docs/instalacao-windows.md](docs/instalacao-windows.md))
- [ ] Assinatura de código do instalador
- [ ] Rodada registrada com provedor real (chave e modelo de verdade)

## Depois do MVP

- Painéis redimensionáveis e atalhos de teclado
- Mais idiomas além de pt-BR e en-US
- MCP com permissões por ferramenta
- Múltiplos modelos simultâneos, filas de tarefas
- Branches Git temporárias, snapshots/rollback
- Execução de comandos **somente** com isolamento demonstrado (ex.: containers)
- Plugins, colaboração, macOS/Linux

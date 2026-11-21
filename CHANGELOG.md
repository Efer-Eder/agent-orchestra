# Changelog

Todas as mudanças relevantes serão registradas aqui. O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [0.1.0-alpha.1] - 2026-11-21

Primeira versão alpha. Ainda não publicada como release.

### Adicionado

- **Aprovação final**: depois da revisão a sessão para em "Aguardando aprovação final" e só fecha quando você aceita a proposta. O Reviewer agora recebe a solicitação e o plano aprovado, não só os diffs.
- **Registro de cada passo dos agentes**: modelo, duração, tokens (reais ou sintéticos), ferramentas usadas (listar e ler arquivos) e erro, na conversa e no painel de detalhes.
- **Modelo por agente** e **tabela de preços** em Configurações; o custo aparece sempre como estimativa feita com os preços informados, nunca para o modo demonstração.
- **Nova tentativa** em falhas passageiras do provedor (429 com espera curta, 502, 503, 504 e queda de conexão), até duas vezes, cancelável.
- Teste de contrato do provedor contra um servidor HTTP local real.
- Novos estados do Octo: regendo com batuta, revisando com lupa, empilhando cubos, reverência no sucesso, apontando o erro e cochilo depois de 3 minutos parado. O Octo anima mesmo com "reduzir movimento".
- Formulários de issue, checklist de PR e guia de instalação no Windows ([docs/instalacao-windows.md](docs/instalacao-windows.md)).
- Seção "Limitações conhecidas" nos READMEs.

### Alterado

- Versão `0.1.0-alpha.1` no app, no `package.json` e no shell Tauri.

### Anterior

- **Leitura dos arquivos do projeto** no app desktop: pasta autorizada validada em Rust, o Planner escolhe até 12 arquivos, você aprova, o Builder lê (somente leitura) e propõe diffs de modificação. Lista de negação (`.env`, chaves, `node_modules`…), limites de tamanho, binários pulados e redação de segredos no conteúdo.
- Interface em **português (Brasil)** e **inglês (EUA)**, com detecção pelo idioma do sistema, escolha salva em Configurações e `?lang=` na URL. Modo demonstração e respostas dos modelos seguem o idioma.
- READMEs novos em pt-BR e en-US com GIFs gravados do app real (`scripts/readme-media/`).
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

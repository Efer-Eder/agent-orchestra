# Instalação no Windows (alpha)

O Agent Orchestra ainda está em alpha. O instalador é gerado pelo Tauri (NSIS) e **não tem assinatura de código**, então o Windows avisa antes de abrir. Este guia explica o que esperar e como conferir o arquivo antes de rodar.

## Requisitos

- Windows 10 (1803 ou mais novo) ou Windows 11, 64 bits.
- WebView2 Runtime. Já vem no Windows 11 e nas versões atuais do Windows 10. Se faltar, o instalador do Tauri baixa o bootstrapper oficial da Microsoft.
- Nenhum Node.js, Rust ou ferramenta de desenvolvimento é necessário para usar o app instalado.

## Antes de instalar: conferir o arquivo

Quando houver uma release publicada, ela traz o SHA-256 do instalador. Confira no PowerShell:

```powershell
Get-FileHash ".\Agent Orchestra_0.1.0-alpha.1_x64-setup.exe" -Algorithm SHA256
```

O valor precisa ser igual ao da página da release. Se for diferente, não execute.

## O aviso do SmartScreen

Como o instalador não é assinado, a primeira execução mostra **"O Windows protegeu o computador"**. Para seguir:

1. Clique em **Mais informações**.
2. Confira se o arquivo é o que você baixou da release oficial.
3. Clique em **Executar assim mesmo**.

O aviso aparece porque não há certificado de assinatura de código, não por algo detectado no arquivo. Assinar o instalador está no [roadmap](../ROADMAP.md).

## O que o instalador faz

- Instala o app para o usuário atual (sem pedir administrador) e cria os atalhos do app.
- Não instala serviço, driver nem tarefa agendada, e não pede para iniciar com o Windows.
- Desinstalar: **Configurações → Aplicativos → Aplicativos instalados → Agent Orchestra → Desinstalar**.

## Onde ficam os dados

- **Projetos, sessões e conversas:** no armazenamento local do WebView2, dentro da pasta de dados do app em `%LOCALAPPDATA%\io.github.efer-eder.agent-orchestra`. Em **Configurações → Dados locais** dá para apagar tudo.
- **Chave de API:** só se você pedir, no **Gerenciador de Credenciais do Windows** (Credenciais do Windows, serviço `agent-orchestra`). Nunca em arquivo do app.
- A desinstalação não remove a chave do cofre. Remova pelo app antes (**Configurações → Remover do Windows**) ou pelo Gerenciador de Credenciais.

## Gerar o instalador a partir do código

Pré-requisitos em [tauri-setup.md](tauri-setup.md). Depois:

```powershell
npm ci
npx tauri build
```

O instalador sai em `src-tauri\target\release\bundle\nsis\`. O executável sem instalador fica em `src-tauri\target\release\agent-orchestra.exe` e roda sozinho, sem servidor de desenvolvimento.

## Limitações desta versão

Veja a seção "Limitações conhecidas" do [README](../README.md#limitações-conhecidas).

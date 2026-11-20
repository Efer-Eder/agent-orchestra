# Shell desktop (Tauri 2)

O diretório `src-tauri/` contém um shell Tauri 2 **mínimo**: ele apenas hospeda a UI web. Não há comandos Rust próprios nem plugins (sem acesso a arquivos, shell ou rede a partir da interface). Versões usadas: Tauri CLI 2.12.6, crate `tauri` 2.12.x, Rust 1.100 (MSVC).

Fontes conferidas em 20/11/2026: <https://v2.tauri.app/start/prerequisites/> e <https://v2.tauri.app/start/create-project/>.

## Pré-requisitos no Windows

1. **Microsoft C++ Build Tools**, marcando a carga de trabalho **"Desktop development with C++"**.
2. **WebView2**: já vem no Windows 10 (1803+) e no Windows 11. Caso falte, instale o "Evergreen Bootstrapper" da página do WebView2 Runtime.
3. **Rust** via rustup (no PowerShell):

   ```powershell
   winget install --id Rustlang.Rustup
   ```

   O toolchain padrão deve ser MSVC (`x86_64-pc-windows-msvc`). Se o Rust já estiver instalado:

   ```powershell
   rustup default stable-msvc
   ```

   Reabra o terminal depois da instalação.

4. **VBSCRIPT** só é necessário para gerar instalador MSI. O projeto está configurado para gerar apenas NSIS (`"targets": ["nsis"]`).

## Rodar o app desktop

```powershell
npm install
npm run tauri dev
```

A primeira compilação Rust leva alguns minutos. A janela abre com a mesma UI de `npm run dev`.

## Gerar instalador (não testado ainda)

```powershell
npm run tauri build
```

Ainda não foi validado nem publicado nenhum instalador. **Não há assinatura de código**: o Windows SmartScreen deve alertar ao executar um instalador gerado localmente.

## Segurança do shell

- CSP em `src-tauri/tauri.conf.json`: `default-src 'self'`, scripts e estilos só do próprio app, `object-src 'none'`, `frame-ancestors 'none'`, `connect-src` limitado ao IPC do Tauri, a `https:` e a `localhost` (para o provedor de IA configurado pelo usuário, ver [ADR 0006](adr/0006-provedor-openai-compativel-com-chave-em-memoria.md)).
- Capability única (`src-tauri/capabilities/default.json`) com `core:default` apenas, para a janela `main`.
- Nenhum plugin instalado (`fs`, `shell`, `http` etc. ausentes de propósito).

## Pré-requisitos no Ubuntu/Debian

Ainda não testado no Linux. Pela documentação oficial:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

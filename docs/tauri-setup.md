# Próximo passo: shell desktop Tauri 2

> **Ainda não existe `src-tauri/` neste repositório.** A máquina onde a fundação foi criada não tinha Rust/cargo, e preferimos não gerar código Rust que não pudemos compilar. Este guia descreve como adicioná-lo.

Fontes conferidas em 20/11/2026: <https://v2.tauri.app/start/prerequisites/> e <https://v2.tauri.app/start/create-project/>.

## Pré-requisitos no Windows

1. **Microsoft C++ Build Tools**, marcando a carga de trabalho **"Desktop development with C++"**.
2. **WebView2**: já vem no Windows 10 (1803+) e no Windows 11. Caso falte, instalar o "Evergreen Bootstrapper" da página do WebView2 Runtime.
3. **Rust** via rustup (no PowerShell):

   ```powershell
   winget install --id Rustlang.Rustup
   ```

   O toolchain padrão deve ser MSVC (`x86_64-pc-windows-msvc`). Se o Rust já estiver instalado:

   ```powershell
   rustup default stable-msvc
   ```

   Reabra o terminal depois da instalação.

4. **VBSCRIPT** só é necessário para gerar instalador MSI (`"targets": "msi"` ou `"all"`). Se o `light.exe` falhar, habilite em Configurações › Aplicativos › Recursos opcionais › Mais recursos do Windows.

## Pré-requisitos no Ubuntu/Debian (CI)

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Adicionar o Tauri ao frontend existente

```powershell
npm install -D @tauri-apps/cli@latest
npx tauri init
```

Respostas sugeridas para o `tauri init`:

| Pergunta               | Resposta                |
| ---------------------- | ----------------------- |
| App name               | `agent-orchestra`       |
| Window title           | `Agent Orchestra`       |
| Web assets location    | `../dist`               |
| Dev server URL         | `http://localhost:5173` |
| Frontend dev command   | `npm run dev`           |
| Frontend build command | `npm run build`         |

O `vite.config.ts` já ignora `src-tauri/` no watcher, como a documentação recomenda. Depois:

```powershell
npx tauri dev
```

## Critérios para considerar o passo concluído

- `npx tauri dev` abre a janela no Windows com a UI atual.
- CSP restritiva em `tauri.conf.json` e nenhuma permissão (capability) além do necessário.
- CI compila o shell em `windows-latest` (Rust instalado no runner).
- `PROGRESS.md` e este documento atualizados com versões reais usadas.

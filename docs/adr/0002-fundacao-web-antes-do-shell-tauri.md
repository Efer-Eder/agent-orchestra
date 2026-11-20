# ADR 0002 — Fundação web antes do shell Tauri

- Status: aceito
- Data: 2026-11-20

## Contexto

O produto alvo é um app desktop Tauri 2. Rust e cargo não estão instalados na máquina onde a fundação foi criada, e gerar `src-tauri/` sem conseguir compilá-lo produziria código não verificado.

## Decisão

Construir primeiro o frontend (React + TypeScript + Vite + Tailwind) e a camada de domínio, rodando no navegador. O shell Tauri é o próximo passo, documentado em [tauri-setup.md](../tauri-setup.md) com os pré-requisitos oficiais.

## Consequências

- O domínio não depende de APIs do Tauri; a ponte com Rust será injetada depois (ex.: armazenamento e aplicação de diffs).
- Enquanto não houver shell, nada é persistido e nada toca o disco.
- O README não afirma que existe app desktop.

# Agent Orchestra

[![CI](https://github.com/Efer-Eder/agent-orchestra/actions/workflows/ci.yml/badge.svg)](https://github.com/Efer-Eder/agent-orchestra/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[🇧🇷 Português](README.md) · 🇺🇸 English

> **In development.** This is a foundation, not a finished product. It runs in the browser or in a desktop window (Tauri 2) on Windows, always with an **offline mock provider**. There are no real providers, no persistence, no published installer and no file access yet.

Agent Orchestra aims to be a **local-first** desktop app (Tauri 2 + React) for coordinating AI agents in a development workflow with three roles — **Planner**, **Builder** and **Reviewer** — and **human approval** before anything runs.

## What works now

- Three-panel layout (projects/sessions/agents · timeline and approval · diffs/usage/context) with collapsible side panels, light/dark/system theme and empty states.
- Full flow with the mock provider: **request → plan → approval → execution → review**, including rejection and cancellation.
- The Builder only **proposes** diffs; nothing is written to disk.
- Token usage is shown as **synthetic** (it comes from the mock); no cost is estimated.
- TypeScript domain layer covered by tests (Vitest).

The UI is currently in Brazilian Portuguese.

## Run locally (Windows, macOS or Linux)

Requires Node.js 22 or newer.

```powershell
git clone https://github.com/Efer-Eder/agent-orchestra.git
cd agent-orchestra
npm install
npm run dev
```

Open <http://localhost:5173>, create a project, describe a request and approve the plan.

| Command             | What it does                  |
| ------------------- | ----------------------------- |
| `npm test`          | Tests (Vitest)                |
| `npm run lint`      | ESLint                        |
| `npm run typecheck` | Type checking                 |
| `npm run build`     | Production build into `dist/` |

## Desktop app (Windows)

Requires Rust (MSVC) and Microsoft C++ Build Tools — see [docs/tauri-setup.md](docs/tauri-setup.md) (in Portuguese).

```powershell
npm run tauri dev
```

No installer is published and there is no code signing.

## Not built yet

Published installer, real providers (OpenAI-compatible), SQLite persistence, applying diffs to disk, command execution, session export. See the [ROADMAP](ROADMAP.md) and [progress log](PROGRESS.md) (in Portuguese).

## Security

- No telemetry. No network calls to AI providers in this version.
- The project **does not provide a sandbox**; command execution is out of scope until isolation is demonstrated.
- See the [threat model](docs/threat-model.md) and [security policy](SECURITY.md).

## License

[MIT](LICENSE) © 2026 Efer Eder

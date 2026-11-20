# Arquitetura

> Estado: **fundação**. Este documento separa o que já existe do que está planejado.

## Visão geral

Agent Orchestra será um app desktop local-first (Tauri 2 + React) que coordena três papéis de agente — **Planner**, **Builder** e **Reviewer** — com aprovação humana obrigatória entre o plano e a execução.

```text
┌────────────────────────── UI (React + Tailwind) ──────────────────────────┐
│  Esquerda: projetos,      Centro: timeline,         Direita: diffs,        │
│  sessões, agentes         plano, aprovação          uso/custo, contexto    │
└──────────────┬────────────────────────────────────────────────────────────┘
               │ estado em memória (useReducer)          [existe]
┌──────────────▼──────────────── Domínio (TypeScript puro) ─────────────────┐
│  types.ts      workflow.ts (máquina de estados)     provider.ts (contrato) │  [existe]
└──────────────┬────────────────────────────────────────────────────────────┘
               │ AgentProvider
┌──────────────▼───────────────┐   ┌──────────────────────────────────────────┐
│ providers/mock.ts (offline)  │   │ Provedor OpenAI-compatible               │  [planejado]
│ [existe]                     │   └──────────────────────────────────────────┘
└──────────────────────────────┘
┌──────────── Shell desktop (Rust / Tauri 2) — janela [existe] ──────────────┐
│  storage (SQLite) · security (allowlist de diretórios, caminhos, symlinks) │  [planejado]
│  commands (aplicar diffs aprovados) · keychain para segredos               │
└────────────────────────────────────────────────────────────────────────────┘
```

## O que existe hoje

| Camada               | Arquivos                          | Notas                                                                                  |
| -------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| Tipos de domínio     | `src/domain/types.ts`             | Projeto, sessão, papéis, plano, alterações propostas, revisão, uso. Tudo serializável. |
| Fluxo                | `src/domain/workflow.ts`          | Máquina de estados explícita; funções puras/imutáveis; cancelamento via `AbortSignal`. |
| Contrato de provedor | `src/domain/provider.ts`          | `plan`, `build`, `review`, cada um com `AbortSignal`.                                  |
| Provedor mock        | `src/providers/mock.ts`           | Determinístico, offline, sem rede e sem disco. Uso de tokens marcado como `synthetic`. |
| UI                   | `src/App.tsx`, `src/components/*` | Três painéis, tema claro/escuro/sistema, estados vazios, painéis laterais ocultáveis.  |
| Estado da UI         | `src/app/state.ts`                | Somente memória; recarregar a página apaga tudo.                                       |

## Máquina de estados da sessão

```text
draft ──► planning ──► awaiting_approval ──► executing ──► reviewing ──► completed
   │          │               │                  │             │
   └──────────┴──── cancelled ┴── rejected       └── failed ───┘ (e cancelled)
```

- Só `awaiting_approval → executing` leva à execução, e só acontece por `approvePlan` (ação humana).
- Estados finais: `completed`, `rejected`, `cancelled`, `failed`.
- Erros do provedor viram `failed` com mensagem truncada (500 caracteres); `AbortError` vira `cancelled`.
- O Builder **apenas propõe** diffs (`ProposedChange`). Nenhum código atual grava arquivos.

## Shell desktop

`src-tauri/` (Tauri 2) abre a UI em uma janela no Windows. Sem comandos customizados nem plugins; CSP restritiva e capability `core:default`. Detalhes em [tauri-setup.md](tauri-setup.md) e [ADR 0005](adr/0005-shell-tauri-minimo.md).

## Planejado (ainda não existe)

- Comandos Rust no shell (hoje ele só hospeda a UI).
- Persistência em SQLite (projetos, sessões, eventos).
- Segredos no Windows Credential Manager / keychain, nunca em SQLite.
- Provedor OpenAI-compatible com tratamento de 401, 429, timeout e rede.
- Aplicação de diffs aprovados, restrita ao diretório autorizado.
- Exportação de sessão (JSON/Markdown) com remoção de segredos.

Decisões registradas em [docs/adr](adr/).

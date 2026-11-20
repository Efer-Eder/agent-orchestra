# ADR 0001 — npm como gerenciador de pacotes

- Status: aceito
- Data: 2026-11-20

## Contexto

A especificação sugere `pnpm`, mas ele não está instalado na máquina principal (Windows 11, Node 24, npm 11). Instalar ferramentas globais exige autorização do operador.

## Decisão

Usar **npm** com `package-lock.json` versionado. Todos os scripts (`dev`, `build`, `lint`, `typecheck`, `test`) funcionam com `npm run`.

## Consequências

- Zero pré-requisito além do Node.js para contribuir.
- CI usa `npm ci` com cache do npm.
- Migrar para pnpm no futuro é simples (gerar `pnpm-lock.yaml` e trocar comandos), se houver motivo concreto.

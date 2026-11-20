# ADR 0001 — npm como gerenciador de pacotes

- Status: aceito
- Data: 2026-11-20

## Contexto

O plano inicial sugeria `pnpm`, mas npm já vem com o Node.js e reduz os pré-requisitos para quem quer contribuir.

## Decisão

Usar **npm** com `package-lock.json` versionado. Todos os scripts (`dev`, `build`, `lint`, `typecheck`, `test`) funcionam com `npm run`.

## Consequências

- Zero pré-requisito além do Node.js para contribuir.
- CI usa `npm ci` com cache do npm.
- Migrar para pnpm no futuro é simples (gerar `pnpm-lock.yaml` e trocar comandos), se houver motivo concreto.

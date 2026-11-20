# Como contribuir

Obrigado pelo interesse! O projeto está em fase inicial; issues e PRs pequenos são muito bem-vindos.

## Ambiente

- Node.js 22+ e npm (ver [ADR 0001](docs/adr/0001-npm-como-gerenciador-de-pacotes.md)).
- Windows é a plataforma principal; evite scripts exclusivos de Unix.

```powershell
npm install
npm run dev
```

## Antes de abrir um PR

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

O CI roda os mesmos comandos em Windows e Ubuntu, além de uma varredura de segredos.

## Convenções

- Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `test:`, `chore:`...).
- Lógica nova no domínio (`src/domain`) vem com testes.
- Não documente como pronto o que ainda não existe; registre no `ROADMAP.md`.
- Nunca inclua chaves, tokens ou dados pessoais em código, testes ou fixtures.
- Mudanças que envolvam disco, rede ou execução de comandos devem atualizar o [modelo de ameaças](docs/threat-model.md).

## Decisões de arquitetura

Decisões relevantes viram um ADR curto em `docs/adr/` (contexto, decisão, consequências).

## Conduta

Ao participar você concorda com o [Código de Conduta](CODE_OF_CONDUCT.md).

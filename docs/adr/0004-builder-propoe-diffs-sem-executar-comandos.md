# ADR 0004 — Builder só propõe diffs; sem execução de comandos

- Status: aceito
- Data: 2026-11-20

## Contexto

Executar comandos gerados por modelos exige isolamento robusto, que ainda não existe. A especificação permite desabilitar a execução de comandos no MVP e apenas gerar diffs.

## Decisão

O Builder retorna `ProposedChange[]` (caminho, tipo, diff unificado) que é **somente exibido**. Não existe executor de comandos. Aplicar diffs ao disco será implementado no lado Rust, com allowlist de diretório e aprovação explícita.

## Consequências

- Nenhuma saída de modelo vira ação no sistema.
- O fluxo completo pode ser demonstrado com o provedor mock sem riscos.
- Execução de comandos volta à pauta somente com isolamento tecnicamente demonstrado (não chamaremos nada de "sandbox seguro" antes disso).

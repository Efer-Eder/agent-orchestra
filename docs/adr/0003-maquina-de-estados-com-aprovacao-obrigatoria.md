# ADR 0003 — Máquina de estados com aprovação humana obrigatória

- Status: aceito
- Data: 2026-11-20

## Contexto

O app não deve ser um sistema autônomo irrestrito. É preciso garantir, em código e em testes, que nenhuma execução ocorre sem decisão humana.

## Decisão

Modelar a sessão como uma máquina de estados explícita (`src/domain/workflow.ts`) com tabela de transições. A única aresta para `executing` parte de `awaiting_approval` e só é percorrida por `approvePlan`. As funções são puras e devolvem novos objetos (sem mutação), recebendo `ids`/`clock` injetáveis para testes determinísticos.

## Consequências

- Transições inválidas lançam `WorkflowError` e são cobertas por testes.
- A persistência futura pode gravar cada estado/evento como está (dados serializáveis).
- Novos passos (ex.: aprovação por arquivo antes de aplicar diffs) entram como novos estados, não como flags soltas.

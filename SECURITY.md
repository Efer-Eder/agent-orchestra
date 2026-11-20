# Política de segurança

## Estado do projeto

Agent Orchestra está **em desenvolvimento** e ainda não tem release. A versão atual roda no navegador com um provedor mock; não acessa arquivos, não executa comandos e não chama provedores de IA. **Não há sandbox** — veja o [modelo de ameaças](docs/threat-model.md).

## Versões suportadas

| Versão   | Suporte                   |
| -------- | ------------------------- |
| `main`   | ✅ correções de segurança |
| releases | nenhuma publicada ainda   |

## Como relatar uma vulnerabilidade

**Não abra issue pública.** Use o relato privado do GitHub:

1. Acesse a aba **Security** do repositório.
2. Clique em **Report a vulnerability**.

Inclua passos para reproduzir, impacto e, se possível, uma sugestão de correção. A meta é responder em até 7 dias e combinar com você a divulgação.

## Escopo de interesse

Mesmo nesta fase, são especialmente relevantes: caminhos para executar saída de modelos, escrita fora do diretório autorizado, vazamento de segredos em logs/exportações e dependências comprometidas.

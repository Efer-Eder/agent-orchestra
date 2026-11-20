# Design — Agent Orchestra

> Direção escolhida: **Grafite** (20/11/2026), entre quatro exemplos em [`design-lab/temas/`](design-lab/temas/index.html).
> Este documento é a fonte de verdade visual. Telas novas seguem estas regras. Se uma regra precisar mudar, a mudança é registrada aqui primeiro.

## Princípios

1. **Calmo para uso longo.** Neutros quentes, pouco ruído e uma única cor de destaque. Quem chama atenção são os agentes e as decisões, não a moldura.
2. **Familiar.** Segue o modelo de app desktop de chat: barra lateral com sessões, conversa no centro, caixa de mensagem embaixo e painel de contexto à direita.
3. **O humano decide.** Aprovações aparecem no fluxo da conversa, com ação principal clara e consequência explicada em uma linha.
4. **Agentes têm rosto.** Cada agente tem cor e mascote próprios. O Orchestra é o maestro e tem destaque.
5. **Honesto.** O que é mock, sintético ou estimado aparece rotulado. Nada finge ser real.

## Cores (tokens)

Os componentes usam apenas nomes semânticos (`bg-surface`, `text-ink-2`…), definidos em `src/index.css`.

| Token                 | Claro                    | Escuro         | Uso                                            |
| --------------------- | ------------------------ | -------------- | ---------------------------------------------- |
| `app`                 | `#f5f4ef`                | `#262624`      | fundo da área central                          |
| `sidebar`             | `#ecebe4`                | `#1d1d1b`      | barra lateral, painel direito, barra de título |
| `surface`             | `#ffffff`                | `#2d2d2a`      | cards, composer, menus                         |
| `surface-2`           | `#f0eee8`                | `#33332f`      | hover, mensagem do usuário, faixas             |
| `surface-3`           | `#e5e2d9`                | `#3c3c38`      | item selecionado, trilhas de progresso         |
| `line`                | `#dfdcd2`                | `#3b3a37`      | bordas e divisores (1px)                       |
| `ink`                 | `#1d1c19`                | `#eceae4`      | texto principal                                |
| `ink-2`               | `#4b4943`                | `#c3c0b7`      | texto secundário                               |
| `ink-3`               | `#7c796f`                | `#95928a`      | rótulos, metadados, placeholders               |
| `accent`              | `#5a48d6`                | `#8b7cff`      | ação principal, foco, seleção                  |
| `accent-soft`         | `#ebe7ff`                | `#312b52`      | fundos de destaque                             |
| `ok` / `warn` / `bad` | verde / âmbar / vermelho | versões claras | estados                                        |

- Uma única cor de destaque (violeta). Não usar cores de marcas de terceiros.
- Estados nunca dependem só de cor: sempre há texto ou ícone junto.
- Contraste mínimo WCAG AA (4.5:1 para texto, 3:1 para ícones e bordas de foco).

### Cores dos agentes

| Agente    | Cor       | Ícone provisório |
| --------- | --------- | ---------------- |
| Orchestra | `#8b7cff` | nota musical     |
| Planner   | `#4fb6ff` | lista            |
| Builder   | `#ffb547` | chave            |
| Reviewer  | `#5fd08f` | olho             |

## Tipografia

- **Inter Variable**, empacotada localmente (`@fontsource-variable/inter`, licença OFL). Nada carregado de CDN, por causa da CSP.
- Base 14px. Escala: 12 (metadados) · 12.5 (rótulos) · 13.5 (lista, corpo denso) · 14 (corpo) · 15 (títulos de seção) · 22–28 (títulos de página).
- Pesos 400 / 500 / 600. Sem negrito pesado.
- Monoespaçada (`Cascadia Code`, `Consolas`) só para caminhos, diffs e código.

## Forma, espaço e movimento

- Raio: 8px em itens de lista e botões, 12px em cards, 18px no composer, círculo nos avatares.
- Espaçamento em múltiplos de 4px. Coluna de conversa com no máximo 720px.
- Sombra só no composer e em menus flutuantes. Todo o resto usa borda de 1px.
- Animações curtas (150–220ms) para entrada de mensagens e hover. Respeitar `prefers-reduced-motion`.

## Layout

```text
┌──────────── barra de título (desktop) ─────────────────────────────┐
│ Sidebar 264px │ Centro (flexível)                │ Painel 300px   │
│ marca         │ cabeçalho: título · estado · ⧉   │ Ambiente       │
│ + Nova sessão │                                  │ Contexto       │
│ Procurar      │   conversa (máx. 720px)          │ Alterações     │
│ Agentes       │                                  │ Agentes        │
│ Projetos      │                                  │                │
│ Hoje / Ontem… │   composer arredondado           │                │
│ usuário/tema  │   provedor · modo                │                │
└───────────────┴──────────────────────────────────┴────────────────┘
```

- O painel direito abre e fecha pelo ícone no cabeçalho. Abaixo de 1100px ele vira gaveta sobre o conteúdo. Abaixo de 760px a sidebar também vira gaveta.
- Sem rolagem horizontal da página em nenhuma largura.

## Componentes

- **Sidebar:** marca, ações principais com atalho (`Ctrl N`, `Ctrl K`), sessões agrupadas por data (Hoje, Ontem, data), ponto colorido com o estado, rodapé com usuário, projeto ativo e provedor.
- **Mensagem do usuário:** bloco à direita, fundo `surface-2`, borda `line`, raio 12px.
- **Turno de agente:** avatar 34px, nome, metadado discreto (tempo, etapas) e texto. Detalhes técnicos ficam em linhas colapsáveis (`› Leu 6 arquivos`).
- **Cartão de plano/aprovação:** lista numerada e faixa inferior com a consequência em uma linha, **Rejeitar** (secundário) e **Aprovar plano** (primário).
- **Composer:** caixa arredondada com sombra suave, seletor do agente (chip com avatar), botão de enviar circular. Linha de metadados abaixo com provedor e modo. `Enter` envia, `Shift+Enter` quebra linha.
- **Painel direito:** seções com título pequeno em `ink-3`, pares chave-valor, barra de contexto, lista de arquivos com `+N −M`.
- **Estado vazio:** título curto, uma frase e uma ação. Sem ilustrações genéricas.
- **Carregamento:** skeletons no formato do conteúdo e indicador de "trabalhando" no turno do agente. Sem spinner de tela cheia.

## Agentes e mascotes

- Seção **Agentes** no estilo "companions": cards com palco (fundo com brilho na cor do agente), mascote grande, nome, uma frase e **Conversar**.
- O **Orchestra** tem o card maior e é o agente padrão do composer.
- Enquanto os mascotes não existem, o avatar é um círculo com gradiente da cor do agente e o ícone provisório, com o selo "mascote em breve".
- Mascotes finais ficarão em `public/mascots/<agente>.webp` (fundo transparente, 512×512, com versão para fundo claro e escuro se necessário) e serão referenciados no perfil do agente (`src/domain/agents.ts`).

## Temas

- **Claro, Escuro e Sistema.** O padrão é Sistema. A preferência fica salva localmente.
- O tema é aplicado pela classe `.dark` em `<html>`. Os tokens trocam juntos, os componentes não mudam.

## Desktop (Tauri)

Diretrizes para o app desktop:

- Barra de título própria com a cor `sidebar`, preservando arrastar, Snap e redimensionamento do Windows (planejado; hoje usa a moldura nativa).
- Modo demonstração (mock offline) claramente separado do modo real (provedor configurado).
- Instalador NSIS sem prometer assinatura de código enquanto ela não existir.

## Acessibilidade

- Navegação completa por teclado, foco visível com contorno `accent` de 2px.
- Regiões com rótulo (`aside`, `main`, `nav`), anúncios de novas mensagens em `aria-live="polite"`.
- Alvos de clique com no mínimo 32px de altura.

## Não fazer

- Gradientes roxo/rosa decorativos, vidro, mosaico de cards repetidos ou emojis como ícones.
- Excesso de badges e pílulas: um estado por item.
- Esconder que algo é mock, sintético ou estimado.

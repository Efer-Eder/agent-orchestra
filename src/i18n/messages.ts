import { LOCALES, type Locale } from '../domain/locale.ts';
import type { SessionStatus } from '../domain/types.ts';

export { LOCALES, type Locale };

/**
 * UI strings. Portuguese is the source; English must have exactly the same
 * shape (enforced by the `Messages` type), so a missing key fails typecheck.
 */

const pt = {
  meta: { htmlLang: 'pt-BR', dateLocale: 'pt-BR', name: 'Português (Brasil)' },
  common: {
    back: 'Voltar',
    cancel: 'Cancelar',
    close: 'Fechar',
    demoOffline: 'Demonstração offline',
    manualApproval: 'Aprovação manual',
    loading: 'Carregando',
  },
  status: {
    draft: 'Rascunho',
    planning: 'Planejando',
    awaiting_approval: 'Aguardando aprovação',
    executing: 'Executando',
    reviewing: 'Revisando',
    awaiting_final_approval: 'Aguardando aprovação final',
    completed: 'Concluída',
    rejected: 'Rejeitada',
    cancelled: 'Cancelada',
    failed: 'Falhou',
  } satisfies Record<SessionStatus, string>,
  days: { today: 'Hoje', yesterday: 'Ontem' },
  sidebar: {
    newSession: 'Nova sessão',
    search: 'Procurar',
    agents: 'Agentes',
    projects: 'Projetos',
    mainNav: 'Navegação principal',
    sessions: 'Sessões',
    searchPlaceholder: 'Procurar sessões',
    closeSearch: 'Fechar busca',
    noProject: 'Crie um projeto para começar a registrar sessões.',
    noResults: 'Nenhuma sessão encontrada.',
    empty: 'Suas sessões aparecem aqui.',
    withoutProject: 'Sem projeto',
    settings: 'Configurações',
  },
  shell: {
    sidebar: 'Barra lateral',
    openMenu: 'Abrir menu',
    details: 'Detalhes da sessão',
  },
  composer: { send: 'Enviar', sendHint: 'Enviar (Enter)', stop: 'Parar' },
  home: {
    welcome: 'Bem-vindo ao Agent Orchestra',
    prompt: 'O que vamos orquestrar hoje?',
    withProject: (name: string) =>
      `Descreva a tarefa em ${name}. O Planner propõe um plano e nada segue sem a sua aprovação.`,
    withoutProject:
      'Comece criando um projeto. Depois é só descrever o que você quer e acompanhar os agentes.',
    placeholder: 'Descreva o que você quer construir…',
    keys: 'Enter envia · Shift+Enter quebra linha',
    octoLabel: 'Octo, o maestro do Agent Orchestra',
    suggestions: [
      'Adicionar login com Google mantendo o login por senha. Cobrir com testes.',
      'Criar endpoint de exportação CSV dos pedidos com paginação.',
      'Revisar o tratamento de erros da API de pagamentos.',
    ],
  },
  projectForm: {
    aria: 'Novo projeto',
    name: 'Nome do projeto',
    folder: 'Pasta',
    create: 'Criar projeto',
  },
  projects: {
    title: 'Projetos',
    subtitle: 'Cada projeto tem suas sessões. O selecionado aparece na barra lateral.',
    noFolder: 'sem pasta',
    sessions: (n: number) => `${n} ${n === 1 ? 'sessão' : 'sessões'}`,
    newProject: 'Novo projeto',
  },
  session: {
    planMeta: 'plano',
    changesMeta: 'alterações',
    reviewMeta: 'revisão',
    maestro: 'maestro',
    working: 'trabalhando…',
    orchestraIntro: 'Vou pedir um plano ao Planner. Nada é alterado antes da sua aprovação.',
    awaitingAria: 'Plano aguardando aprovação',
    approveHint: {
      before: 'Aprovar libera o Builder para ',
      strong: 'propor',
      after: ' alterações. Nada é gravado no disco.',
    },
    reject: 'Rejeitar',
    approve: 'Aprovar plano',
    reasonPlaceholder: 'Motivo (opcional)',
    reasonAria: 'Motivo da rejeição',
    confirmReject: 'Confirmar rejeição',
    approved: 'Você aprovou o plano',
    rejected: (reason: string) =>
      reason ? `Você rejeitou o plano: ${reason}` : 'Você rejeitou o plano.',
    adjustReason: (note: string) => `pediu ajuste: ${note}`,
    adjustRequest: (note: string) => `Ajuste pedido: ${note}`,
    proposed: (n: number) =>
      n === 1
        ? '1 alteração proposta, não aplicada ao disco.'
        : `${n} alterações propostas, não aplicadas ao disco.`,
    reviewApproved: 'Aprovado pelo Reviewer',
    reviewChanges: 'Pede ajustes',
    receiving: (chars: string) => `recebendo resposta · ${chars} caracteres`,
    finalAria: 'Aprovação final',
    finalTitle: 'Revisão concluída. Aceitar a proposta?',
    finalHint:
      'Aceitar encerra a sessão com estas alterações propostas. Nada é gravado no disco; você aplica quando quiser.',
    finalHintChanges:
      'O Reviewer pediu ajustes. Você pode pedir uma nova rodada pela caixa de mensagem, aceitar assim mesmo ou rejeitar.',
    accept: 'Aceitar proposta',
    finalApproved: 'Você aceitou a proposta',
    cancelled: 'Execução cancelada.',
    interrupted: 'Interrompida: o app foi fechado ou recarregado durante a execução.',
    delete: 'Apagar sessão',
    openPanel: 'Abrir painel',
    closePanel: 'Fechar painel',
    placeholderAdjust: 'Peça um ajuste no plano…',
    placeholderNew: 'Nova solicitação neste projeto…',
    placeholderWait: 'Aguarde os agentes terminarem…',
    octoLabel: (mood: string) => `Octo, ${mood}`,
  },
  octoMood: {
    idle: 'aguardando',
    waving: 'acenando',
    thinking: 'pensando',
    working: 'trabalhando',
    happy: 'comemorando',
    worried: 'preocupado',
    sleeping: 'descansando',
    conducting: 'regendo',
    reviewing: 'revisando',
    downloading: 'baixando',
  },
  panel: {
    details: 'Detalhes',
    back: 'Voltar',
    environment: 'Ambiente',
    project: 'Projeto',
    noFolder: 'sem pasta',
    provider: 'Provedor',
    context: 'Contexto',
    noCalls: 'Sem chamadas ainda.',
    tokens: (input: string, output: string) => `${input} entrada · ${output} saída`,
    synthetic: 'Números sintéticos do modo demonstração (≈ 4 caracteres por token).',
    reported: 'Uso reportado pelo provedor.',
    noCost:
      'Custo: não estimado. Informe os preços do modelo em Configurações para ver uma estimativa.',
    syntheticCost: 'Custo: nenhum, o modo demonstração não chama provedor.',
    estimate: (value: string, asOf: string) =>
      `Custo estimado: ${value}, calculado com os preços que você informou (${asOf}). Não é a cobrança do provedor.`,
    runs: 'Execuções dos agentes',
    syntheticShort: '(sintéticos)',
    noRuns: 'Nenhum agente rodou ainda nesta sessão.',
    runStatus: { ok: 'ok', failed: 'falhou', cancelled: 'cancelada' },
    tool: {
      list_files: (n: string) => `listou ${n} arquivo(s)`,
      read_files: (n: string) => `leu ${n} arquivo(s)`,
    },
    toolSkipped: (n: string) => `${n} recusado(s)`,
    changes: 'Alterações propostas',
    awaitingPlan: 'Aguardando aprovação do plano.',
    noChanges: 'Nenhuma alteração ainda.',
    readOnly: 'Somente visualização. Aplicar no disco ainda não existe.',
    agents: 'Agentes nesta sessão',
    agentState: {
      working: 'trabalhando',
      done: 'concluiu',
      waiting: 'aguardando',
      leading: 'conduzindo',
    },
  },
  agents: {
    title: 'Agentes',
    subtitle:
      'Converse direto com cada agente. O Orchestra conduz as sessões; os outros três trabalham sob a batuta dele.',
    talk: 'Conversar',
    messages: (n: number) => `${n} ${n === 1 ? 'mensagem' : 'mensagens'}`,
    backToAgents: 'Voltar para Agentes',
    clear: 'Limpar conversa',
    sayHi: 'Diga oi para começar.',
    messageTo: (name: string) => `Mensagem para ${name}…`,
    savedHere: 'Conversa salva neste dispositivo',
    replyCancelled: 'Resposta cancelada.',
  },
  settings: {
    title: 'Configurações',
    subtitle: 'Tudo fica neste dispositivo. Sem telemetria.',
    appearance: 'Aparência',
    theme: 'Tema',
    light: 'Claro',
    dark: 'Escuro',
    system: 'Sistema',
    language: 'Idioma',
    provider: 'Provedor de IA',
    providerKind: 'Tipo de provedor',
    mock: 'Demonstração (offline)',
    openai: 'OpenAI-compatível',
    mockHelp:
      'O modo demonstração percorre o fluxo inteiro sem rede e sem chave. As respostas são fixas e rotuladas.',
    baseUrl: 'Endereço da API',
    baseUrlHint:
      'Qualquer servidor compatível com /chat/completions: OpenAI, OpenRouter, Groq, Ollama, LM Studio… http:// só é aceito para localhost.',
    model: 'Modelo',
    modelPlaceholder: 'nome do modelo no provedor',
    agentModels: 'Modelo por agente',
    agentModelsHint: 'Opcional. Em branco, o agente usa o modelo acima.',
    pricing: 'Preços para estimar custo',
    pricingHint:
      'Por 1 milhão de tokens, copiados da página de preços do provedor. O app não consulta preços: o custo mostrado é só uma estimativa com estes números.',
    inputPrice: 'Entrada',
    outputPrice: 'Saída',
    currency: 'Moeda',
    asOf: 'Preços de',
    clearPricing: 'Limpar preços',
    apiKey: 'Chave de API',
    apiKeyHint:
      'Nunca vai para os arquivos do app. Sem salvar no Windows, fica só na memória e some ao fechar. É enviada apenas ao endereço acima. O uso é cobrado pelo provedor, separado de qualquer assinatura de chat.',
    apiKeyPlaceholder: 'cole sua chave aqui',
    apiKeyHintDesktop:
      'A chave vai uma única vez para o lado Rust do app e não volta para a interface: as chamadas ao provedor saem do Rust. Sem salvar no Windows, ela some ao fechar o app. O uso é cobrado pelo provedor.',
    apiKeyReplace: 'chave definida; cole outra para trocar',
    useKey: 'Usar chave',
    keyInSession: 'Chave ativa nesta sessão, guardada no Rust, fora da interface.',
    vaultUnavailable:
      'Para lembrar a chave com segurança, use o app desktop: ela fica no Gerenciador de Credenciais do Windows.',
    vaultSaved:
      'Chave guardada no Gerenciador de Credenciais do Windows para este endereço. Só o lado Rust do app a lê.',
    vaultHint:
      'Guarde a chave no Gerenciador de Credenciais do Windows para não precisar digitá-la de novo.',
    vaultRemove: 'Remover do Windows',
    vaultSave: 'Salvar no Windows',
    test: 'Testar conexão',
    testing: 'Testando…',
    testOk: (count: number, model: string, found: boolean) =>
      `Conectado. ${count} modelo(s) disponível(is)${
        model ? (found ? `, incluindo ${model}.` : `; "${model}" não apareceu na lista.`) : '.'
      }`,
    providerFallback: 'Enquanto isso, o modo demonstração continua ativo.',
    needKey: 'Informe a chave de API para usar o provedor real.',
    data: 'Dados locais',
    dataHelp:
      'Projetos, sessões e conversas ficam salvos neste dispositivo (armazenamento local do app). A chave de API nunca é salva.',
    confirmReset: 'Apagar tudo? Não dá para desfazer.',
    reset: 'Apagar tudo',
    resetButton: 'Apagar dados locais',
  },
  files: {
    folderHintDesktop:
      'Pasta autorizada: o Builder só lê arquivos dentro dela, depois da sua aprovação. Nada é gravado.',
    folderHintWeb: 'No navegador é só um rótulo. A leitura de arquivos existe no app desktop.',
    planTitle: 'Arquivos que o Builder vai ler',
    planHint:
      'Somente leitura, depois da sua aprovação. .env, chaves e pastas como node_modules nunca são lidos.',
    readTitle: (n: number) =>
      n === 1 ? 'Leu 1 arquivo do projeto' : `Leu ${n} arquivos do projeto`,
    panelTitle: 'Arquivos lidos',
    panelEmpty: 'Nenhum arquivo lido nesta sessão.',
    webOnly: 'A leitura de arquivos só existe no app desktop.',
    truncated: 'cortado',
    redacted: (n: number) => (n === 1 ? '1 segredo ocultado' : `${n} segredos ocultados`),
    skipped: {
      denied: 'bloqueado',
      outside: 'fora da pasta',
      missing: 'não encontrado',
      binary: 'binário',
      budget: 'limite de tamanho',
    },
    errors: {
      root_missing: (d: string) => `A pasta não existe ou não pode ser aberta: ${d}`,
      root_not_dir: (d: string) => `Não é uma pasta: ${d}`,
      root_too_broad: (d: string) =>
        `Pasta ampla demais (${d}). Escolha a pasta do projeto, não a raiz do disco nem a pasta do usuário.`,
      root_system: (d: string) => `Pastas do sistema não podem ser projeto: ${d}`,
      unavailable: (d: string) => `Não foi possível acessar os arquivos do projeto (${d}).`,
    },
  },
  errors: {
    emptyProjectName: 'O nome do projeto é obrigatório.',
    emptyRequest: 'A solicitação não pode ficar vazia.',
    requestTooLong: (max: number) => `A solicitação excede ${max} caracteres.`,
    selectProject: 'Crie ou selecione um projeto primeiro.',
    describeAdjust: 'Descreva o ajuste.',
  },
};

export type Messages = typeof pt;

type Shape<T> = T extends (...args: infer A) => string
  ? (...args: A) => string
  : T extends string[]
    ? string[]
    : T extends object
      ? { [K in keyof T]: Shape<T[K]> }
      : string;

const en: Shape<Messages> = {
  meta: { htmlLang: 'en-US', dateLocale: 'en-US', name: 'English (US)' },
  common: {
    back: 'Back',
    cancel: 'Cancel',
    close: 'Close',
    demoOffline: 'Offline demo',
    manualApproval: 'Manual approval',
    loading: 'Loading',
  },
  status: {
    draft: 'Draft',
    planning: 'Planning',
    awaiting_approval: 'Awaiting approval',
    executing: 'Executing',
    reviewing: 'Reviewing',
    awaiting_final_approval: 'Awaiting final approval',
    completed: 'Completed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    failed: 'Failed',
  },
  days: { today: 'Today', yesterday: 'Yesterday' },
  sidebar: {
    newSession: 'New session',
    search: 'Search',
    agents: 'Agents',
    projects: 'Projects',
    mainNav: 'Main navigation',
    sessions: 'Sessions',
    searchPlaceholder: 'Search sessions',
    closeSearch: 'Close search',
    noProject: 'Create a project to start recording sessions.',
    noResults: 'No sessions found.',
    empty: 'Your sessions show up here.',
    withoutProject: 'No project',
    settings: 'Settings',
  },
  shell: { sidebar: 'Sidebar', openMenu: 'Open menu', details: 'Session details' },
  composer: { send: 'Send', sendHint: 'Send (Enter)', stop: 'Stop' },
  home: {
    welcome: 'Welcome to Agent Orchestra',
    prompt: 'What are we orchestrating today?',
    withProject: (name: string) =>
      `Describe the task in ${name}. The Planner proposes a plan and nothing moves without your approval.`,
    withoutProject:
      'Start by creating a project. Then describe what you want and follow the agents.',
    placeholder: 'Describe what you want to build…',
    keys: 'Enter sends · Shift+Enter adds a line',
    octoLabel: 'Octo, the conductor of Agent Orchestra',
    suggestions: [
      'Add Google sign-in while keeping password login. Cover it with tests.',
      'Create a paginated CSV export endpoint for orders.',
      'Review error handling in the payments API.',
    ],
  },
  projectForm: {
    aria: 'New project',
    name: 'Project name',
    folder: 'Folder',
    create: 'Create project',
  },
  projects: {
    title: 'Projects',
    subtitle: 'Each project has its own sessions. The selected one shows in the sidebar.',
    noFolder: 'no folder',
    sessions: (n: number) => `${n} ${n === 1 ? 'session' : 'sessions'}`,
    newProject: 'New project',
  },
  session: {
    planMeta: 'plan',
    changesMeta: 'changes',
    reviewMeta: 'review',
    maestro: 'conductor',
    working: 'working…',
    orchestraIntro: "I'll ask the Planner for a plan. Nothing changes before you approve it.",
    awaitingAria: 'Plan awaiting approval',
    approveHint: {
      before: 'Approving lets the Builder ',
      strong: 'propose',
      after: ' changes. Nothing is written to disk.',
    },
    reject: 'Reject',
    approve: 'Approve plan',
    reasonPlaceholder: 'Reason (optional)',
    reasonAria: 'Rejection reason',
    confirmReject: 'Confirm rejection',
    approved: 'You approved the plan',
    rejected: (reason: string) =>
      reason ? `You rejected the plan: ${reason}` : 'You rejected the plan.',
    adjustReason: (note: string) => `asked for an adjustment: ${note}`,
    adjustRequest: (note: string) => `Requested adjustment: ${note}`,
    proposed: (n: number) =>
      n === 1
        ? '1 proposed change, not applied to disk.'
        : `${n} proposed changes, not applied to disk.`,
    reviewApproved: 'Approved by the Reviewer',
    reviewChanges: 'Asks for changes',
    receiving: (chars: string) => `receiving answer · ${chars} characters`,
    finalAria: 'Final approval',
    finalTitle: 'Review done. Accept the proposal?',
    finalHint:
      'Accepting closes the session with these proposed changes. Nothing is written to disk; you apply them when you want.',
    finalHintChanges:
      'The Reviewer asked for changes. You can ask for another round in the message box, accept anyway or reject.',
    accept: 'Accept proposal',
    finalApproved: 'You accepted the proposal',
    cancelled: 'Run cancelled.',
    interrupted: 'Interrupted: the app was closed or reloaded during the run.',
    delete: 'Delete session',
    openPanel: 'Open panel',
    closePanel: 'Close panel',
    placeholderAdjust: 'Ask for a change to the plan…',
    placeholderNew: 'New request in this project…',
    placeholderWait: 'Wait for the agents to finish…',
    octoLabel: (mood: string) => `Octo, ${mood}`,
  },
  octoMood: {
    idle: 'waiting',
    waving: 'waving',
    thinking: 'thinking',
    working: 'working',
    happy: 'celebrating',
    worried: 'worried',
    sleeping: 'resting',
    conducting: 'conducting',
    reviewing: 'reviewing',
    downloading: 'downloading',
  },
  panel: {
    details: 'Details',
    back: 'Back',
    environment: 'Environment',
    project: 'Project',
    noFolder: 'no folder',
    provider: 'Provider',
    context: 'Context',
    noCalls: 'No calls yet.',
    tokens: (input: string, output: string) => `${input} in · ${output} out`,
    synthetic: 'Synthetic numbers from demo mode (≈ 4 characters per token).',
    reported: 'Usage reported by the provider.',
    noCost: 'Cost: not estimated. Enter the model prices in Settings to see an estimate.',
    syntheticCost: 'Cost: none, demo mode does not call any provider.',
    estimate: (value: string, asOf: string) =>
      `Estimated cost: ${value}, from the prices you entered (${asOf}). Not the provider's bill.`,
    runs: 'Agent runs',
    syntheticShort: '(synthetic)',
    noRuns: 'No agent has run in this session yet.',
    runStatus: { ok: 'ok', failed: 'failed', cancelled: 'cancelled' },
    tool: {
      list_files: (n: string) => `listed ${n} file(s)`,
      read_files: (n: string) => `read ${n} file(s)`,
    },
    toolSkipped: (n: string) => `${n} refused`,
    changes: 'Proposed changes',
    awaitingPlan: 'Waiting for plan approval.',
    noChanges: 'No changes yet.',
    readOnly: 'Read only. Applying to disk does not exist yet.',
    agents: 'Agents in this session',
    agentState: { working: 'working', done: 'done', waiting: 'waiting', leading: 'leading' },
  },
  agents: {
    title: 'Agents',
    subtitle:
      'Talk to each agent directly. The Orchestra leads the sessions; the other three play under its baton.',
    talk: 'Chat',
    messages: (n: number) => `${n} ${n === 1 ? 'message' : 'messages'}`,
    backToAgents: 'Back to Agents',
    clear: 'Clear conversation',
    sayHi: 'Say hi to get started.',
    messageTo: (name: string) => `Message ${name}…`,
    savedHere: 'Conversation saved on this device',
    replyCancelled: 'Reply cancelled.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Everything stays on this device. No telemetry.',
    appearance: 'Appearance',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    language: 'Language',
    provider: 'AI provider',
    providerKind: 'Provider type',
    mock: 'Demo (offline)',
    openai: 'OpenAI-compatible',
    mockHelp:
      'Demo mode runs the whole flow with no network and no key. Replies are fixed and labelled.',
    baseUrl: 'API address',
    baseUrlHint:
      'Any server compatible with /chat/completions: OpenAI, OpenRouter, Groq, Ollama, LM Studio… http:// is only accepted for localhost.',
    model: 'Model',
    modelPlaceholder: 'model name at the provider',
    agentModels: 'Model per agent',
    agentModelsHint: 'Optional. Left blank, the agent uses the model above.',
    pricing: 'Prices for cost estimates',
    pricingHint:
      'Per 1 million tokens, copied from the provider pricing page. The app never fetches prices: any cost shown is only an estimate from these numbers.',
    inputPrice: 'Input',
    outputPrice: 'Output',
    currency: 'Currency',
    asOf: 'Prices as of',
    clearPricing: 'Clear prices',
    apiKey: 'API key',
    apiKeyHint:
      'Never written to app files. Unless saved in Windows, it lives in memory only and is gone when the app closes. It is sent only to the address above. Usage is billed by the provider, separately from any chat subscription.',
    apiKeyPlaceholder: 'paste your key here',
    apiKeyHintDesktop:
      'The key goes to the Rust side of the app once and never comes back to the UI: provider calls are made from Rust. Unless saved in Windows, it is gone when the app closes. Usage is billed by the provider.',
    apiKeyReplace: 'key set; paste another to replace it',
    useKey: 'Use key',
    keyInSession: 'Key active in this session, held by Rust, outside the UI.',
    vaultUnavailable:
      'To remember the key safely, use the desktop app: it is kept in the Windows Credential Manager.',
    vaultSaved:
      'Key stored in the Windows Credential Manager for this address. Only the Rust side of the app reads it.',
    vaultHint:
      'Store the key in the Windows Credential Manager so you do not have to type it again.',
    vaultRemove: 'Remove from Windows',
    vaultSave: 'Save in Windows',
    test: 'Test connection',
    testing: 'Testing…',
    testOk: (count: number, model: string, found: boolean) =>
      `Connected. ${count} model(s) available${
        model ? (found ? `, including ${model}.` : `; "${model}" is not in the list.`) : '.'
      }`,
    providerFallback: 'Meanwhile, demo mode stays on.',
    needKey: 'Enter the API key to use the real provider.',
    data: 'Local data',
    dataHelp:
      'Projects, sessions and chats are saved on this device (app local storage). The API key is never saved.',
    confirmReset: 'Delete everything? This cannot be undone.',
    reset: 'Delete everything',
    resetButton: 'Delete local data',
  },
  files: {
    folderHintDesktop:
      'Authorized folder: the Builder only reads files inside it, after your approval. Nothing is written.',
    folderHintWeb: 'Just a label in the browser. Reading files exists in the desktop app.',
    planTitle: 'Files the Builder will read',
    planHint:
      'Read only, after your approval. .env, keys and folders like node_modules are never read.',
    readTitle: (n: number) => (n === 1 ? 'Read 1 project file' : `Read ${n} project files`),
    panelTitle: 'Files read',
    panelEmpty: 'No files read in this session.',
    webOnly: 'Reading files only exists in the desktop app.',
    truncated: 'truncated',
    redacted: (n: number) => (n === 1 ? '1 secret hidden' : `${n} secrets hidden`),
    skipped: {
      denied: 'blocked',
      outside: 'outside the folder',
      missing: 'not found',
      binary: 'binary',
      budget: 'size limit',
    },
    errors: {
      root_missing: (d: string) => `The folder does not exist or cannot be opened: ${d}`,
      root_not_dir: (d: string) => `Not a folder: ${d}`,
      root_too_broad: (d: string) =>
        `Folder too broad (${d}). Pick the project folder, not a drive root or your user folder.`,
      root_system: (d: string) => `System folders cannot be a project: ${d}`,
      unavailable: (d: string) => `Could not access the project files (${d}).`,
    },
  },
  errors: {
    emptyProjectName: 'The project name is required.',
    emptyRequest: 'The request cannot be empty.',
    requestTooLong: (max: number) => `The request exceeds ${max} characters.`,
    selectProject: 'Create or select a project first.',
    describeAdjust: 'Describe the adjustment.',
  },
};

export const MESSAGES: Record<Locale, Messages> = { 'pt-BR': pt, 'en-US': en };

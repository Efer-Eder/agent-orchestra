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
    folderHint: 'Por enquanto é só um rótulo: nada é lido do disco.',
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
    noCost: 'Custo: não estimado (sem tabela de preços configurada).',
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
    apiKey: 'Chave de API',
    apiKeyHint:
      'Nunca vai para os arquivos do app. Sem salvar no Windows, fica só na memória e some ao fechar. É enviada apenas ao endereço acima. O uso é cobrado pelo provedor, separado de qualquer assinatura de chat.',
    apiKeyPlaceholder: 'cole sua chave aqui',
    vaultUnavailable:
      'Para lembrar a chave com segurança, use o app desktop: ela fica no Gerenciador de Credenciais do Windows.',
    vaultSaved:
      'Chave guardada no Gerenciador de Credenciais do Windows para este endereço. Ela é carregada ao abrir o app.',
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
    folderHint: 'Just a label for now: nothing is read from disk.',
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
    noCost: 'Cost: not estimated (no price table configured).',
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
    apiKey: 'API key',
    apiKeyHint:
      'Never written to app files. Unless saved in Windows, it lives in memory only and is gone when the app closes. It is sent only to the address above. Usage is billed by the provider, separately from any chat subscription.',
    apiKeyPlaceholder: 'paste your key here',
    vaultUnavailable:
      'To remember the key safely, use the desktop app: it is kept in the Windows Credential Manager.',
    vaultSaved:
      'Key stored in the Windows Credential Manager for this address. It is loaded when the app opens.',
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
  errors: {
    emptyProjectName: 'The project name is required.',
    emptyRequest: 'The request cannot be empty.',
    requestTooLong: (max: number) => `The request exceeds ${max} characters.`,
    selectProject: 'Create or select a project first.',
    describeAdjust: 'Describe the adjustment.',
  },
};

export const MESSAGES: Record<Locale, Messages> = { 'pt-BR': pt, 'en-US': en };

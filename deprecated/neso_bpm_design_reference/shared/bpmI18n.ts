// @shared
export type BpmLocale = 'ru' | 'en'

export interface BpmUiCopy {
  home: string
  workspace: string
  navTheme: string
  navLanguage: string
  openLanding: string
  metrics: {
    active: string
    slaRisk: string
    autoCoverage: string
    bottleneck: string
    cycle: string
  }
  processCenterTitle: string
  processCenterHint: string
  filterAll: string
  filterAtRisk: string
  filterBlocked: string
  filterMyZone: string
  viewOps: string
  viewTeam: string
  viewAudit: string
  tableCompact: string
  tableStandard: string
  tableAudit: string
  colInstance: string
  colProcess: string
  colStage: string
  colStatus: string
  colSla: string
  colOwner: string
  detailTitle: string
  detailHint: string
  detailStage: string
  detailOwner: string
  detailRule: string
  detailAction: string
  detailEscalation: string
  kanbanTitle: string
  kanbanHint: string
  stageBacklog: string
  stageActive: string
  stageReview: string
  stageDone: string
  timelineTitle: string
  timelineHint: string
  builderTitle: string
  builderHint: string
  analyticsTitle: string
  analyticsHint: string
  chartThroughput: string
  chartSla: string
  chartBottlenecks: string
  editorTitle: string
  editorHint: string
  modeMarkdown: string
  modeWysiwyg: string
  modeSplit: string
  flowMap: string
  ruleMatrix: string
  automationQueue: string
  chartMode: string
  tableMode: string
  savedViews: string
  sectionOpen: string
  sectionDocs: string
  /** Описание на главной (hero). */
  heroDescription: string
  /** Заголовок секции сценариев на главной. */
  featuredScenariosTitle: string
  /** Aria-label для кнопки светлой темы. */
  themeLight: string
  /** Aria-label для кнопки тёмной темы. */
  themeDark: string
}

export const bpmCopy: Record<BpmLocale, BpmUiCopy> = {
  ru: {
    home: 'Главная',
    workspace: 'BPM рабочее пространство',
    navTheme: 'Тема',
    navLanguage: 'Язык',
    openLanding: 'Индекс',
    metrics: {
      active: 'Активные процессы',
      slaRisk: 'Риски SLA',
      autoCoverage: 'Автоматизация',
      bottleneck: 'Узкие места',
      cycle: 'Средний цикл'
    },
    processCenterTitle: 'Process inbox и flow instances',
    processCenterHint: 'Фильтры, сохранённые представления, статус, этап, SLA и ответственные.',
    filterAll: 'Все',
    filterAtRisk: 'Риск SLA',
    filterBlocked: 'Заблокировано',
    filterMyZone: 'Моя зона',
    viewOps: 'Ops priority',
    viewTeam: 'Team lead',
    viewAudit: 'Audit trail',
    tableCompact: 'Compact',
    tableStandard: 'Standard',
    tableAudit: 'Audit',
    colInstance: 'Инстанс',
    colProcess: 'Процесс',
    colStage: 'Этап',
    colStatus: 'Статус',
    colSla: 'SLA',
    colOwner: 'Owner',
    detailTitle: 'Детальная панель инстанса',
    detailHint: 'Контекст выполнения, ответственность, ближайшие шаги.',
    detailStage: 'Текущий этап',
    detailOwner: 'Ответственный',
    detailRule: 'Активное правило',
    detailAction: 'Следующее действие',
    detailEscalation: 'Эскалация через',
    kanbanTitle: 'Pipeline stages (Kanban)',
    kanbanHint: 'Карточки процесса двигаются по этапам исполнения.',
    stageBacklog: 'Backlog',
    stageActive: 'Execution',
    stageReview: 'Validation',
    stageDone: 'Done',
    timelineTitle: 'Execution timeline',
    timelineHint: 'События процесса, отклонения, эскалации и подтверждения.',
    builderTitle: 'Flow / Rules / Automation builder',
    builderHint: 'Визуальная сборка маршрута и правил без потери контекста выполнения.',
    analyticsTitle: 'Process analytics dashboard',
    analyticsHint: 'Режимы графиков и показатели производительности процессов.',
    chartThroughput: 'Throughput',
    chartSla: 'SLA pressure',
    chartBottlenecks: 'Bottlenecks',
    editorTitle: 'Knowledge editor (Markdown + WYSIWYG)',
    editorHint: 'Документация шага процесса и операционные заметки.',
    modeMarkdown: 'Markdown',
    modeWysiwyg: 'WYSIWYG',
    modeSplit: 'Split',
    flowMap: 'Flow map',
    ruleMatrix: 'Rules matrix',
    automationQueue: 'Automation queue',
    chartMode: 'Режим графика',
    tableMode: 'Режим таблицы',
    savedViews: 'Сохранённые view',
    sectionOpen: 'Открыть',
    sectionDocs: 'Документация',
    heroDescription:
      'Операционная консоль для контроля процессов, SLA, владельцев и автоматизаций в одном рабочем пространстве.',
    featuredScenariosTitle: 'Сценарии работы',
    themeLight: 'Светлая тема',
    themeDark: 'Тёмная тема'
  },
  en: {
    home: 'Home',
    workspace: 'BPM workspace',
    navTheme: 'Theme',
    navLanguage: 'Language',
    openLanding: 'Index',
    metrics: {
      active: 'Active processes',
      slaRisk: 'SLA risks',
      autoCoverage: 'Automation',
      bottleneck: 'Bottlenecks',
      cycle: 'Avg cycle'
    },
    processCenterTitle: 'Process inbox and flow instances',
    processCenterHint: 'Filters, saved views, status, stage, SLA and ownership.',
    filterAll: 'All',
    filterAtRisk: 'SLA risk',
    filterBlocked: 'Blocked',
    filterMyZone: 'My zone',
    viewOps: 'Ops priority',
    viewTeam: 'Team lead',
    viewAudit: 'Audit trail',
    tableCompact: 'Compact',
    tableStandard: 'Standard',
    tableAudit: 'Audit',
    colInstance: 'Instance',
    colProcess: 'Process',
    colStage: 'Stage',
    colStatus: 'Status',
    colSla: 'SLA',
    colOwner: 'Owner',
    detailTitle: 'Instance detail panel',
    detailHint: 'Execution context, ownership and next actions.',
    detailStage: 'Current stage',
    detailOwner: 'Owner',
    detailRule: 'Active rule',
    detailAction: 'Next action',
    detailEscalation: 'Escalation in',
    kanbanTitle: 'Pipeline stages (Kanban)',
    kanbanHint: 'Process cards moving through execution stages.',
    stageBacklog: 'Backlog',
    stageActive: 'Execution',
    stageReview: 'Validation',
    stageDone: 'Done',
    timelineTitle: 'Execution timeline',
    timelineHint: 'Process events, deviations, escalations and confirmations.',
    builderTitle: 'Flow / Rules / Automation builder',
    builderHint: 'Visual route composition with live rule context.',
    analyticsTitle: 'Process analytics dashboard',
    analyticsHint: 'Chart modes and performance metrics for process control.',
    chartThroughput: 'Throughput',
    chartSla: 'SLA pressure',
    chartBottlenecks: 'Bottlenecks',
    editorTitle: 'Knowledge editor (Markdown + WYSIWYG)',
    editorHint: 'Step documentation and operational notes.',
    modeMarkdown: 'Markdown',
    modeWysiwyg: 'WYSIWYG',
    modeSplit: 'Split',
    flowMap: 'Flow map',
    ruleMatrix: 'Rules matrix',
    automationQueue: 'Automation queue',
    chartMode: 'Chart mode',
    tableMode: 'Table mode',
    savedViews: 'Saved views',
    sectionOpen: 'Open',
    sectionDocs: 'Docs',
    heroDescription:
      'Operational console for process control, SLA ownership and automation signals in one workspace.',
    featuredScenariosTitle: 'Work scenarios',
    themeLight: 'Light theme',
    themeDark: 'Dark theme'
  }
}

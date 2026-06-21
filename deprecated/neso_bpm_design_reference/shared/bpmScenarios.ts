// @shared
import type { ThemeMode } from './themeCatalog'

export type ScenarioWidgetTone = 'info' | 'success' | 'warning' | 'danger'
export type ScenarioChecklistState = 'done' | 'active' | 'todo'

export type BpmScenarioLayout =
  | 'war-room'
  | 'approval-lab'
  | 'operations-hub'
  | 'risk-console'
  | 'delivery-studio'
  | 'executive-deck'
  | 'client-desk'
  | 'home-page'

export interface ScenarioWidget {
  id: string
  label: string
  value: string
  delta: string
  tone: ScenarioWidgetTone
}

export interface ScenarioChecklistItem {
  id: string
  label: string
  state: ScenarioChecklistState
}

export interface BpmDesignScenario {
  slug: string
  title: string
  description: string
  objective: string
  tags: string[]
  theme: ThemeMode
  presetId: string
  layout: BpmScenarioLayout
}

export const BPM_DESIGN_SCENARIOS: BpmDesignScenario[] = [
  {
    slug: 'home-page',
    title: 'Главная страница',
    description: 'Обзор метрик, Kanban-панель, timeline исполнения и блок избранных сценариев.',
    objective: 'Показать стартовый дашборд BPM-workspace с ключевыми виджетами.',
    tags: ['home', 'dashboard', 'metrics', 'kanban'],
    theme: 'light',
    presetId: 'sunrise-leaf',
    layout: 'home-page'
  },
  {
    slug: 'incident-war-room',
    title: 'Incident war room',
    description: 'Критические инциденты, эскалации и response-команды на одном экране.',
    objective: 'Сократить MTTR и стабилизировать SLA во время инцидента.',
    tags: ['incident', 'response', 'escalation'],
    theme: 'dark',
    presetId: 'forest-night',
    layout: 'war-room'
  },
  {
    slug: 'alert-center',
    title: 'Alert center',
    description: 'Оперативный центр алертов по SLA, очередям и интеграциям.',
    objective: 'Сократить время реакции на критические сигналы.',
    tags: ['alerts', 'monitoring', 'sla'],
    theme: 'light',
    presetId: 'misty-daybreak',
    layout: 'war-room'
  },
  {
    slug: 'timeline-investigation',
    title: 'Timeline investigation',
    description: 'Разбор цепочки событий инстанса для поиска корня проблемы.',
    objective: 'Найти точку сбоя и минимизировать повторение инцидента.',
    tags: ['timeline', 'forensics', 'debug'],
    theme: 'dark',
    presetId: 'midnight-pine',
    layout: 'war-room'
  },
  {
    slug: 'approvals',
    title: 'Approval matrix',
    description: 'Многоуровневые согласования с правилами fallback и ownership.',
    objective: 'Снизить bottleneck на финальном approve-этапе.',
    tags: ['approval', 'rules', 'governance'],
    theme: 'light',
    presetId: 'sunrise-leaf',
    layout: 'approval-lab'
  },
  {
    slug: 'procurement-flow',
    title: 'Procurement flow',
    description: 'Закупочные заявки: от инициации до контрактного закрытия.',
    objective: 'Снизить цикл согласования закупок без потери контроля.',
    tags: ['procurement', 'workflow', 'contracts'],
    theme: 'light',
    presetId: 'misty-daybreak',
    layout: 'approval-lab'
  },
  {
    slug: 'contract-lifecycle',
    title: 'Contract lifecycle',
    description: 'Жизненный цикл договора с этапами legal/review/approve/sign.',
    objective: 'Уменьшить задержки между legal и business approval.',
    tags: ['contract', 'legal', 'lifecycle'],
    theme: 'dark',
    presetId: 'forest-night',
    layout: 'approval-lab'
  },
  {
    slug: 'vendor-onboarding',
    title: 'Vendor onboarding',
    description: 'Проверка поставщиков, compliance и запуск в активный пул.',
    objective: 'Ускорить onboarding без роста рисков комплаенса.',
    tags: ['vendor', 'onboarding', 'compliance'],
    theme: 'light',
    presetId: 'sunrise-leaf',
    layout: 'approval-lab'
  },
  {
    slug: 'dispatch-monitoring',
    title: 'Dispatch monitoring',
    description: 'Диспетчеризация задач по командам и операционным линиям.',
    objective: 'Снизить ручные перекидывания задач между линиями.',
    tags: ['dispatch', 'routing', 'ops'],
    theme: 'dark',
    presetId: 'midnight-pine',
    layout: 'operations-hub'
  },
  {
    slug: 'workforce-queue',
    title: 'Workforce queue',
    description: 'Балансировка очередей между ролями и сменами.',
    objective: 'Выровнять нагрузку и снизить просрочки по очередям.',
    tags: ['workforce', 'queue', 'balancing'],
    theme: 'dark',
    presetId: 'forest-night',
    layout: 'operations-hub'
  },
  {
    slug: 'shift-handover',
    title: 'Shift handover',
    description: 'Передача активных кейсов между сменами с полным контекстом.',
    objective: 'Исключить потерю контекста и дублирование действий.',
    tags: ['handover', 'shift', 'operations'],
    theme: 'light',
    presetId: 'misty-daybreak',
    layout: 'operations-hub'
  },
  {
    slug: 'backlog-cleanup',
    title: 'Backlog cleanup sprint',
    description: 'Массовая обработка просроченного backlog по правилам приоритета.',
    objective: 'Сократить backlog старше 14 дней на фиксированную долю.',
    tags: ['backlog', 'cleanup', 'triage'],
    theme: 'light',
    presetId: 'sunrise-leaf',
    layout: 'operations-hub'
  },
  {
    slug: 'risk-assessment',
    title: 'Risk assessment studio',
    description: 'Матрица рисков и контроль mitigation-стратегий.',
    objective: 'Повысить точность приоритезации high-impact рисков.',
    tags: ['risk', 'matrix', 'analysis'],
    theme: 'dark',
    presetId: 'midnight-pine',
    layout: 'risk-console'
  },
  {
    slug: 'compliance-audit',
    title: 'Compliance audit desk',
    description: 'Audit-trail по обязательным шагам и контроль отклонений.',
    objective: 'Упростить расследования и отчетность для аудита.',
    tags: ['compliance', 'audit', 'traceability'],
    theme: 'dark',
    presetId: 'forest-night',
    layout: 'risk-console'
  },
  {
    slug: 'quality-gates',
    title: 'Quality gates',
    description: 'Контроль gate-условий перед продвижением этапов.',
    objective: 'Снизить возвраты между этапами и rework.',
    tags: ['quality', 'gates', 'delivery'],
    theme: 'light',
    presetId: 'misty-daybreak',
    layout: 'risk-console'
  },
  {
    slug: 'release-readiness',
    title: 'Release readiness',
    description: 'Готовность релиза по checklists, рискам и стадиям внедрения.',
    objective: 'Уменьшить вероятность срыва релиза на финальной стадии.',
    tags: ['release', 'readiness', 'delivery'],
    theme: 'dark',
    presetId: 'midnight-pine',
    layout: 'delivery-studio'
  },
  {
    slug: 'onboarding-journey',
    title: 'Onboarding journey',
    description: 'Пошаговый onboarding сотрудников по BPM-плейбуку.',
    objective: 'Сократить time-to-productivity новых сотрудников.',
    tags: ['onboarding', 'journey', 'people'],
    theme: 'light',
    presetId: 'sunrise-leaf',
    layout: 'delivery-studio'
  },
  {
    slug: 'executive-overview',
    title: 'Executive overview',
    description: 'Обзор ключевых метрик и рисков для руководителя направления.',
    objective: 'Сделать решение по приоритетам за один экран.',
    tags: ['executive', 'kpi', 'dashboard'],
    theme: 'light',
    presetId: 'misty-daybreak',
    layout: 'executive-deck'
  },
  {
    slug: 'capacity-planning',
    title: 'Capacity planning',
    description: 'Прогноз загрузки команд и планирование throughput.',
    objective: 'Удержать SLA в пиковые окна нагрузки.',
    tags: ['capacity', 'forecast', 'planning'],
    theme: 'dark',
    presetId: 'forest-night',
    layout: 'executive-deck'
  },
  {
    slug: 'client-dialogs',
    title: 'Client dialogs workspace',
    description:
      'Операционная переписка с клиентами: список диалогов, лента сообщений, CRM-профиль.',
    objective: 'Сократить time-to-first-response и ускорить handoff между линиями поддержки.',
    tags: ['support', 'dialogs', 'crm'],
    theme: 'light',
    presetId: 'misty-daybreak',
    layout: 'client-desk'
  }
]

const SCENARIO_BY_SLUG = new Map<string, BpmDesignScenario>(
  BPM_DESIGN_SCENARIOS.map((scenario) => [scenario.slug, scenario])
)

export function getBpmScenarioBySlug(slug: string): BpmDesignScenario | undefined {
  return SCENARIO_BY_SLUG.get(slug)
}

export function getScenarioSlugs(): string[] {
  return BPM_DESIGN_SCENARIOS.map((scenario) => scenario.slug)
}

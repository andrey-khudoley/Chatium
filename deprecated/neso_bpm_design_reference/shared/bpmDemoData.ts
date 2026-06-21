// @shared
import type {
  BpmAutomationJob,
  BpmBottleneck,
  BpmChartBar,
  BpmChartMode,
  BpmExecutionEvent,
  BpmInstanceRow,
  BpmKanbanColumn,
  BpmMetric,
  BpmRule,
  BpmTimelinePoint
} from './bpmTypes'
import type { BpmLocale, BpmUiCopy } from './bpmI18n'

export const THEME_LABEL_BY_ID = {
  'forest-night': { ru: 'Графитовая операционная', en: 'Graphite Ops' },
  'midnight-pine': { ru: 'Сигнальная тёмная', en: 'Signal Dark' },
  'sunrise-leaf': { ru: 'Облачная операционная', en: 'Cloud Ops' },
  'misty-daybreak': { ru: 'Стальной день', en: 'Steel Day' }
} as const

export function getBpmMetrics(ui: BpmUiCopy): BpmMetric[] {
  return [
    { id: 'active', label: ui.metrics.active, value: '124', delta: '+12', tone: 'info' },
    { id: 'sla', label: ui.metrics.slaRisk, value: '7', delta: '-3', tone: 'danger' },
    {
      id: 'automation',
      label: ui.metrics.autoCoverage,
      value: '68%',
      delta: '+6%',
      tone: 'success'
    },
    { id: 'bottlenecks', label: ui.metrics.bottleneck, value: '3', delta: '-1', tone: 'warning' },
    { id: 'cycle', label: ui.metrics.cycle, value: '2h 18m', delta: '-14m', tone: 'success' }
  ]
}

export function getBpmInstanceRows(locale: BpmLocale): BpmInstanceRow[] {
  return [
    {
      id: 'WF-3021',
      process: 'Order-to-Cash',
      stage: locale === 'ru' ? 'Подтверждение оплаты' : 'Payment validation',
      status: locale === 'ru' ? 'В работе' : 'In progress',
      sla: '00:42',
      owner: 'N. Smirnova',
      risk: 'warning'
    },
    {
      id: 'WF-3014',
      process: 'Incident Response',
      stage: locale === 'ru' ? 'Анализ первопричины' : 'Root cause review',
      status: locale === 'ru' ? 'Риск SLA' : 'SLA risk',
      sla: '00:11',
      owner: 'D. Johnson',
      risk: 'danger'
    },
    {
      id: 'WF-2978',
      process: 'Vendor Onboarding',
      stage: locale === 'ru' ? 'Проверка комплаенса' : 'Compliance check',
      status: locale === 'ru' ? 'На проверке' : 'In review',
      sla: '02:36',
      owner: 'A. Petrova',
      risk: 'info'
    },
    {
      id: 'WF-2962',
      process: 'Refund Approval',
      stage: locale === 'ru' ? 'Финальное подтверждение' : 'Final approval',
      status: locale === 'ru' ? 'Завершается' : 'Closing',
      sla: '03:12',
      owner: 'M. White',
      risk: 'success'
    },
    {
      id: 'WF-2920',
      process: 'Access Governance',
      stage: locale === 'ru' ? 'Назначение роли' : 'Role assignment',
      status: locale === 'ru' ? 'Ожидает' : 'Waiting',
      sla: '05:40',
      owner: 'S. Volkov',
      risk: 'neutral'
    }
  ]
}

export function getBpmDetailTimeline(locale: BpmLocale): BpmTimelinePoint[] {
  return [
    {
      time: '09:12',
      label:
        locale === 'ru'
          ? 'Инстанс перешёл в этап проверки платежа'
          : 'Instance moved to payment validation stage'
    },
    {
      time: '09:24',
      label:
        locale === 'ru'
          ? 'Сработало правило AMOUNT > 10k, назначен supervisor'
          : 'Rule AMOUNT > 10k fired, supervisor assigned'
    },
    {
      time: '09:38',
      label:
        locale === 'ru'
          ? 'Отправлена автоматическая задача на риск-проверку'
          : 'Automated risk check task dispatched'
    },
    {
      time: '09:49',
      label:
        locale === 'ru'
          ? 'Ожидание подтверждения фин. контролем'
          : 'Awaiting finance control confirmation'
    }
  ]
}

export function getBpmKanbanColumns(ui: BpmUiCopy): BpmKanbanColumn[] {
  return [
    {
      id: 'backlog',
      title: ui.stageBacklog,
      tone: 'backlog',
      cards: [
        { id: 'WF-3058', title: 'Contract Renewal', owner: 'E. Miller', sla: '04:12' },
        { id: 'WF-3052', title: 'Support Escalation', owner: 'I. Kim', sla: '03:26' }
      ]
    },
    {
      id: 'active',
      title: ui.stageActive,
      tone: 'active',
      cards: [
        { id: 'WF-3021', title: 'Order-to-Cash', owner: 'N. Smirnova', sla: '00:42' },
        { id: 'WF-3014', title: 'Incident Response', owner: 'D. Johnson', sla: '00:11' },
        { id: 'WF-2988', title: 'KYC Check', owner: 'A. Petrov', sla: '01:20' }
      ]
    },
    {
      id: 'review',
      title: ui.stageReview,
      tone: 'review',
      cards: [
        { id: 'WF-2978', title: 'Vendor Onboarding', owner: 'A. Petrova', sla: '02:36' },
        { id: 'WF-2969', title: 'Access Approval', owner: 'S. Hall', sla: '01:58' }
      ]
    },
    {
      id: 'done',
      title: ui.stageDone,
      tone: 'done',
      cards: [
        { id: 'WF-2962', title: 'Refund Approval', owner: 'M. White', sla: '03:12' },
        { id: 'WF-2951', title: 'Quality Re-check', owner: 'L. Novak', sla: '02:44' }
      ]
    }
  ]
}

export function getBpmExecutionTimeline(locale: BpmLocale): BpmExecutionEvent[] {
  return [
    {
      time: '10:03',
      type: 'info',
      text:
        locale === 'ru'
          ? 'Flow WF-3014: сработал маршрут эскалации в L2'
          : 'Flow WF-3014: escalation route to L2 triggered'
    },
    {
      time: '09:51',
      type: 'warning',
      text:
        locale === 'ru'
          ? 'WF-3021 приближается к порогу SLA (11 минут)'
          : 'WF-3021 approaching SLA threshold (11 min)'
    },
    {
      time: '09:37',
      type: 'success',
      text:
        locale === 'ru'
          ? 'WF-2962 завершён и отправлен в archive lane'
          : 'WF-2962 completed and moved to archive lane'
    },
    {
      time: '09:20',
      type: 'danger',
      text:
        locale === 'ru'
          ? 'WF-2988 отклонён правилом Compliance Rule #17'
          : 'WF-2988 rejected by Compliance Rule #17'
    }
  ]
}

export function getBpmRules(locale: BpmLocale): BpmRule[] {
  return [
    {
      name: 'AMOUNT > 10000',
      action: locale === 'ru' ? 'Назначить Senior Reviewer' : 'Assign Senior Reviewer',
      state: 'active'
    },
    {
      name: 'COUNTRY in [IR, KP]',
      action:
        locale === 'ru' ? 'Блокировать и уведомить Compliance' : 'Block and notify Compliance',
      state: 'critical'
    },
    {
      name: 'CLIENT_SEGMENT = VIP',
      action: locale === 'ru' ? 'Сократить SLA до 20 минут' : 'Reduce SLA to 20 minutes',
      state: 'active'
    }
  ]
}

export function getBpmAutomationJobs(locale: BpmLocale): BpmAutomationJob[] {
  return [
    {
      id: 'AUTO-778',
      title: locale === 'ru' ? 'Уведомление owner в Slack' : 'Owner notification to Slack',
      state: 'running'
    },
    {
      id: 'AUTO-774',
      title: locale === 'ru' ? 'Создать задачу в Jira' : 'Create Jira issue',
      state: 'queued'
    },
    {
      id: 'AUTO-769',
      title: locale === 'ru' ? 'Проверка документа KYC' : 'KYC document validation',
      state: 'done'
    }
  ]
}

export function getBpmChartModes(ui: BpmUiCopy): BpmChartMode[] {
  return [
    { id: 'throughput', label: ui.chartThroughput },
    { id: 'sla', label: ui.chartSla },
    { id: 'bottlenecks', label: ui.chartBottlenecks }
  ]
}

export function getBpmChartBars(mode: BpmChartMode['id']): BpmChartBar[] {
  if (mode === 'sla') {
    return [
      { label: 'L1', value: 78 },
      { label: 'L2', value: 56 },
      { label: 'L3', value: 34 },
      { label: 'VIP', value: 88 }
    ]
  }

  if (mode === 'bottlenecks') {
    return [
      { label: 'Approval', value: 82 },
      { label: 'Compliance', value: 64 },
      { label: 'Docs', value: 47 },
      { label: 'Sync', value: 39 }
    ]
  }

  return [
    { label: 'Mon', value: 44 },
    { label: 'Tue', value: 53 },
    { label: 'Wed', value: 67 },
    { label: 'Thu', value: 71 },
    { label: 'Fri', value: 59 },
    { label: 'Sat', value: 48 },
    { label: 'Sun', value: 42 }
  ]
}

export function getBpmBottlenecks(): BpmBottleneck[] {
  return [
    { title: 'Approval queue', value: '18m avg wait', status: 'Watch', tone: 'warning' },
    { title: 'Compliance checks', value: '24m avg wait', status: 'Critical', tone: 'danger' },
    { title: 'Integration retries', value: '7 incidents', status: 'Monitor', tone: 'info' },
    { title: 'Manual reassignment', value: '11 handoffs', status: 'Watch', tone: 'warning' }
  ]
}

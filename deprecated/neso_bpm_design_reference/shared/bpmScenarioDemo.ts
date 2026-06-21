// @shared
import type { BpmLocale } from './bpmI18n'
import { bpmCopy } from './bpmI18n'
import {
  getBpmAutomationJobs,
  getBpmBottlenecks,
  getBpmChartBars,
  getBpmChartModes,
  getBpmDetailTimeline,
  getBpmExecutionTimeline,
  getBpmInstanceRows,
  getBpmKanbanColumns,
  getBpmMetrics,
  getBpmRules
} from './bpmDemoData'
import type {
  BpmAutomationJob,
  BpmBottleneck,
  BpmChartBar,
  BpmChartMode,
  BpmEditorMode,
  BpmExecutionEvent,
  BpmInstanceRow,
  BpmKanbanColumn,
  BpmMetric,
  BpmRule,
  BpmTimelinePoint
} from './bpmTypes'
import {
  type BpmDesignScenario,
  type ScenarioChecklistItem,
  type ScenarioWidget
} from './bpmScenarios'

export interface BpmScenarioDemoState {
  metrics: BpmMetric[]
  rows: BpmInstanceRow[]
  selectedInstanceId: string
  timeline: BpmExecutionEvent[]
  detailTimeline: BpmTimelinePoint[]
  kanbanColumns: BpmKanbanColumn[]
  rules: BpmRule[]
  jobs: BpmAutomationJob[]
  chartModes: BpmChartMode[]
  activeChartMode: BpmChartMode['id']
  bars: BpmChartBar[]
  bottlenecks: BpmBottleneck[]
  tableMode: 'compact' | 'standard' | 'audit'
  editorMode: BpmEditorMode['id']
  markdownDraft: string
  widgets: ScenarioWidget[]
  checklist: ScenarioChecklistItem[]
}

const WIDGET_TONES: Array<ScenarioWidget['tone']> = ['info', 'success', 'warning', 'danger']

function getWidgetTone(index: number): ScenarioWidget['tone'] {
  return WIDGET_TONES[index % WIDGET_TONES.length] ?? 'info'
}

function getScenarioIndex(scenario: BpmDesignScenario): number {
  return Math.max(
    0,
    scenario.slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  )
}

function buildMetrics(base: BpmMetric[], scenarioIndex: number): BpmMetric[] {
  return base.map((metric, index) => {
    if (metric.id === 'active') {
      return {
        ...metric,
        value: String(90 + ((scenarioIndex + index) % 60)),
        delta: `+${3 + ((scenarioIndex + index) % 8)}`
      }
    }

    if (metric.id === 'sla') {
      return {
        ...metric,
        value: String(4 + ((scenarioIndex + index) % 9)),
        delta: `-${1 + ((scenarioIndex + index) % 4)}`
      }
    }

    if (metric.id === 'automation') {
      return {
        ...metric,
        value: `${54 + ((scenarioIndex + index) % 32)}%`,
        delta: `+${2 + ((scenarioIndex + index) % 7)}%`
      }
    }

    if (metric.id === 'bottlenecks') {
      return {
        ...metric,
        value: String(2 + ((scenarioIndex + index) % 6)),
        delta: `-${(scenarioIndex + index) % 3}`
      }
    }

    if (metric.id === 'cycle') {
      return {
        ...metric,
        value: `${1 + ((scenarioIndex + index) % 4)}h ${10 + ((scenarioIndex + index) % 50)}m`,
        delta: `-${5 + ((scenarioIndex + index) % 20)}m`
      }
    }

    return metric
  })
}

function buildRows(
  base: BpmInstanceRow[],
  scenario: BpmDesignScenario,
  locale: BpmLocale
): BpmInstanceRow[] {
  if (!base.length) return base

  const firstBase = base[0]
  if (!firstBase) return base

  const first: BpmInstanceRow = {
    ...firstBase,
    process: scenario.title,
    stage: locale === 'ru' ? 'Демо-сценарий' : 'Demo scenario'
  }

  return [first, ...base.slice(1)]
}

function buildWidgets(scenario: BpmDesignScenario, scenarioIndex: number): ScenarioWidget[] {
  return [
    {
      id: 'w-1',
      label: 'Active lanes',
      value: String(3 + (scenarioIndex % 5)),
      delta: `+${1 + (scenarioIndex % 3)}`,
      tone: getWidgetTone(scenarioIndex)
    },
    {
      id: 'w-2',
      label: 'At-risk flow',
      value: `${8 + (scenarioIndex % 17)}%`,
      delta: `-${1 + (scenarioIndex % 4)}%`,
      tone: getWidgetTone(scenarioIndex + 1)
    },
    {
      id: 'w-3',
      label: 'Automation hit-rate',
      value: `${62 + (scenarioIndex % 31)}%`,
      delta: `+${2 + (scenarioIndex % 6)}%`,
      tone: getWidgetTone(scenarioIndex + 2)
    },
    {
      id: 'w-4',
      label: 'Critical blockers',
      value: String(1 + (scenarioIndex % 5)),
      delta: `${scenarioIndex % 2 === 0 ? '-' : '+'}${1 + (scenarioIndex % 3)}`,
      tone: getWidgetTone(scenarioIndex + 3)
    }
  ]
}

function buildChecklist(scenario: BpmDesignScenario, locale: BpmLocale): ScenarioChecklistItem[] {
  if (locale === 'en') {
    return [
      { id: 'c-1', label: `Align lanes and ownership for ${scenario.title}`, state: 'done' },
      { id: 'c-2', label: `Validate SLA controls and escalation policy`, state: 'active' },
      { id: 'c-3', label: `Prepare rollout notes and operations checklist`, state: 'todo' }
    ]
  }

  return [
    {
      id: 'c-1',
      label: `Синхронизировать этапы и owner для сценария «${scenario.title}»`,
      state: 'done'
    },
    { id: 'c-2', label: 'Проверить SLA-ограничения и правила эскалации', state: 'active' },
    { id: 'c-3', label: 'Подготовить план запуска и операционный чек-лист', state: 'todo' }
  ]
}

export function buildScenarioDemoState(
  scenario: BpmDesignScenario,
  locale: BpmLocale
): BpmScenarioDemoState {
  const ui = bpmCopy[locale]
  const scenarioIndex = getScenarioIndex(scenario)

  const metrics = buildMetrics(getBpmMetrics(ui), scenarioIndex)
  const rows = buildRows(getBpmInstanceRows(locale), scenario, locale)
  const chartModes = getBpmChartModes(ui)
  const activeChartMode = chartModes[scenarioIndex % chartModes.length]?.id ?? 'throughput'

  const tableModeOptions: Array<'compact' | 'standard' | 'audit'> = ['compact', 'standard', 'audit']
  const editorModeOptions: Array<BpmEditorMode['id']> = ['split', 'markdown', 'wysiwyg']

  return {
    metrics,
    rows,
    selectedInstanceId: rows[0]?.id ?? 'WF-0000',
    timeline: getBpmExecutionTimeline(locale),
    detailTimeline: getBpmDetailTimeline(locale),
    kanbanColumns: getBpmKanbanColumns(ui),
    rules: getBpmRules(locale),
    jobs: getBpmAutomationJobs(locale),
    chartModes,
    activeChartMode,
    bars: getBpmChartBars(activeChartMode),
    bottlenecks: getBpmBottlenecks(),
    tableMode: tableModeOptions[scenarioIndex % tableModeOptions.length] ?? 'compact',
    editorMode: editorModeOptions[scenarioIndex % editorModeOptions.length] ?? 'split',
    markdownDraft: [
      `### ${scenario.title}`,
      '',
      `- Objective: ${scenario.objective}`,
      `- Tags: ${scenario.tags.join(', ')}`,
      '- Action: align rules, automation queue and SLA owner handoff'
    ].join('\n'),
    widgets: buildWidgets(scenario, scenarioIndex),
    checklist: buildChecklist(scenario, locale)
  }
}

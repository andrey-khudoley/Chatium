<template>
  <div
    class="min-h-screen"
    :class="isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'"
  >
    <div class="w-full px-4 sm:px-6 lg:px-8 py-8">
      <div class="p-6 rounded-lg mb-4" :class="isDark ? 'bg-gray-800' : 'bg-white'">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-bold flex items-center gap-2">
            <i class="fas fa-chart-line text-[var(--color-primary)]"></i>
            Дашборд
          </h2>
          <span class="text-xs opacity-70"> Компоненты нельзя перемещать в режиме просмотра </span>
        </div>
      </div>

      <div
        class="p-2 rounded-lg border"
        :class="isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'"
        style="height: calc(100vh - 220px)"
      >
        <div class="relative w-full h-full overflow-auto">
          <div
            class="relative"
            :style="{ width: boardPixelSize + 'px', height: boardPixelSize + 'px' }"
          >
            <div class="absolute inset-0 pointer-events-none" :style="gridBackgroundStyle"></div>
            <div
              v-for="component in components"
              :key="component.id"
              class="absolute rounded-lg shadow-md select-none flex flex-col overflow-hidden"
              :class="
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              "
              :style="getComponentStyle(component)"
            >
              <div
                class="px-3 py-2 border-b text-xs font-medium flex items-center justify-between flex-shrink-0"
                :class="isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-100 bg-gray-50'"
              >
                <div class="flex items-center gap-2">
                  <i class="fas fa-chart-bar text-[var(--color-primary)]"></i>
                  <span class="truncate max-w-[180px]">{{ component.title }}</span>
                </div>
                <span class="text-[10px] opacity-70 uppercase">
                  {{ component.metric || 'UNIQ' }}
                </span>
              </div>
              <div class="px-3 py-3 text-xs flex-1 flex flex-col overflow-hidden min-h-0">
                <div class="mb-1 opacity-80 flex-shrink-0">
                  {{ getViewTypeLabel(component.viewType) }} •
                  {{ getDatasetName(component.datasetId) }}
                </div>
                <div class="opacity-60 mb-2 flex-shrink-0">
                  Метрика: {{ component.metric || 'UNIQ' }} (уникальные значения)
                </div>
                <div v-if="component.description" class="opacity-60 mb-2 flex-shrink-0">
                  {{ component.description }}
                </div>

                <!-- Отображение для счётчика: крупное число -->
                <template v-if="component.viewType === 'counter'">
                  <div class="mt-2 text-base font-semibold">
                    <template v-if="metricsMap[component.id]">
                      <template v-if="metricsMap[component.id].error">
                        <span class="text-xs text-red-400">
                          {{ metricsMap[component.id].error }}
                        </span>
                      </template>
                      <template v-else>
                        <span class="text-2xl">
                          {{ formatMetricValue(metricsMap[component.id].value) }}
                        </span>
                      </template>
                    </template>
                    <template v-else>
                      <span class="opacity-40 text-xs italic">
                        Значение появится после подключения расчёта метрик
                      </span>
                    </template>
                  </div>
                </template>

                <!-- Отображение для простой таблицы -->
                <template v-else-if="component.viewType === 'simple-table'">
                  <div class="mt-3 text-[11px] opacity-80 flex-shrink-0">
                    <div class="mb-1 font-semibold">Конфигурация таблицы</div>
                    <div class="mb-2">
                      <span class="font-medium">Колонки:</span>
                      <span class="font-mono">
                        {{
                          getComponentColumns(component).length
                            ? getComponentColumns(component).join(' • ')
                            : 'по умолчанию'
                        }}
                      </span>
                    </div>
                  </div>
                  <div class="mt-2 flex-1 flex flex-col overflow-hidden min-h-0">
                    <div class="flex-1 overflow-auto min-h-0">
                      <table class="w-full text-[11px] border-collapse">
                        <thead>
                          <tr>
                            <th
                              v-for="columnId in getComponentColumns(component)"
                              :key="columnId"
                              class="border-b px-2 py-1 text-left font-semibold"
                              :class="isDark ? 'border-gray-700' : 'border-gray-200'"
                            >
                              {{ getColumnLabel(columnId) }}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-if="getSimpleTableLoading(component.id)">
                            <td
                              :colspan="getComponentColumns(component).length"
                              class="px-2 py-3 text-center opacity-60"
                            >
                              Загрузка данных таблицы...
                            </td>
                          </tr>
                          <tr v-else-if="getSimpleTableError(component.id)">
                            <td
                              :colspan="getComponentColumns(component).length"
                              class="px-2 py-3 text-center text-red-400 text-[11px]"
                            >
                              {{ getSimpleTableError(component.id) }}
                            </td>
                          </tr>
                          <tr v-else-if="getSimpleTableRows(component.id).length === 0">
                            <td
                              :colspan="getComponentColumns(component).length"
                              class="px-2 py-3 text-center opacity-60"
                            >
                              Данные не найдены за выбранный период
                            </td>
                          </tr>
                          <tr
                            v-else
                            v-for="(row, rowIndex) in getSimpleTableRows(component.id)"
                            :key="rowIndex"
                          >
                            <td
                              v-for="columnId in getComponentColumns(component)"
                              :key="columnId"
                              class="px-2 py-1 border-b"
                              :class="isDark ? 'border-gray-800' : 'border-gray-100'"
                            >
                              {{ formatSimpleTableCell(row, columnId) }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div
                    class="mt-2 flex items-center justify-between text-[10px] opacity-70 flex-shrink-0"
                  >
                    <div>Страница {{ getSimpleTablePage(component.id) }}</div>
                    <div class="space-x-1">
                      <button
                        v-if="getSimpleTablePage(component.id) > 1"
                        class="px-2 py-1 rounded"
                        :class="
                          getSimpleTableLoading(component.id)
                            ? 'opacity-40 cursor-not-allowed'
                            : isDark
                              ? 'hover:bg-gray-700'
                              : 'hover:bg-gray-200'
                        "
                        :disabled="getSimpleTableLoading(component.id)"
                        @click.prevent="
                          loadSimpleTablePage(component.id, getSimpleTablePage(component.id) - 1)
                        "
                      >
                        « Назад
                      </button>
                      <button
                        class="px-2 py-1 rounded"
                        :class="
                          getSimpleTableLoading(component.id) ||
                          !getSimpleTableHasMore(component.id)
                            ? 'opacity-40 cursor-not-allowed'
                            : isDark
                              ? 'hover:bg-gray-700'
                              : 'hover:bg-gray-200'
                        "
                        :disabled="
                          getSimpleTableLoading(component.id) ||
                          !getSimpleTableHasMore(component.id)
                        "
                        @click.prevent="
                          loadSimpleTablePage(component.id, getSimpleTablePage(component.id) + 1)
                        "
                      >
                        Вперёд »
                      </button>
                    </div>
                  </div>
                </template>

                <!-- Отображение для сводной таблицы -->
                <template v-else-if="component.viewType === 'pivot-table'">
                  <div class="mt-3 text-[11px] opacity-80 flex-shrink-0">
                    <div class="mb-1 font-semibold">Сводная таблица по атрибуциям</div>
                    <div class="mb-2 opacity-70">
                      Первая колонка — первая атрибуция, при раскрытии строки подгружается
                      следующая.
                    </div>
                  </div>

                  <div class="mt-2 flex-1 flex flex-col overflow-hidden min-h-0">
                    <div class="flex-1 overflow-auto min-h-0">
                      <table class="w-full text-[11px] border-collapse">
                        <thead>
                          <tr>
                            <th
                              class="border-b px-2 py-1 text-left font-semibold"
                              :class="isDark ? 'border-gray-700' : 'border-gray-200'"
                            >
                              Атрибуция
                            </th>
                            <th
                              class="border-b px-2 py-1 text-right font-semibold"
                              :class="isDark ? 'border-gray-700' : 'border-gray-200'"
                            >
                              Уникальные посетители
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-if="getPivotLoading(component.id, 0, [])">
                            <td colspan="2" class="px-2 py-3 text-center opacity-60">
                              Загрузка данных таблицы...
                            </td>
                          </tr>
                          <tr v-else-if="getPivotError(component.id, 0, [])">
                            <td colspan="2" class="px-2 py-3 text-center text-red-400 text-[11px]">
                              {{ getPivotError(component.id, 0, []) }}
                            </td>
                          </tr>
                          <template v-else>
                            <template
                              v-for="(row, rowIndex) in getPivotRows(component.id, 0, [])"
                              :key="`${component.id}-0-${row.value}`"
                            >
                              <PivotTableRowRecursive
                                :component-id="component.id"
                                :row="row"
                                :level="0"
                                :row-index="rowIndex"
                                :path="[]"
                                :is-dark="isDark"
                              />
                            </template>
                            <tr v-if="getPivotTotal(component.id, 0, [])">
                              <td
                                class="px-2 py-2 font-semibold border-t"
                                :class="isDark ? 'border-gray-700' : 'border-gray-200'"
                              >
                                {{ getPivotTotal(component.id, 0, []).label }}
                              </td>
                              <td
                                class="px-2 py-2 text-right font-semibold border-t"
                                :class="isDark ? 'border-gray-700' : 'border-gray-200'"
                              >
                                {{
                                  formatPivotMetricValue(
                                    getPivotTotal(component.id, 0, []).metricValue
                                  )
                                }}
                              </td>
                            </tr>
                          </template>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  computed,
  ref,
  onMounted,
  provide,
  defineComponent,
  inject,
  computed as computedVue,
  h,
  Fragment
} from 'vue'
import { TIME_PERIODS } from '../shared/datasetTypes'
import { PIVOT_ATTRIBUTION_FIELDS } from '../shared/dashboardTypes'

const GRID_SIZE = 80
const BOARD_UNITS = 50

const props = defineProps({
  initialDashboard: {
    type: Object,
    default: null
  },
  datasets: {
    type: Array,
    default: () => []
  },
  initialMetrics: {
    type: Array,
    default: () => []
  },
  apiUrls: {
    type: Object,
    default: () => ({})
  }
})

const isDark = ref(false)

const dashboardTitle = computed(() => props.initialDashboard?.name || 'Дашборд')
const dashboardDescription = computed(() => props.initialDashboard?.description || '')

const components = computed(() => {
  if (!props.initialDashboard?.config) return []
  try {
    const config = JSON.parse(props.initialDashboard.config)
    return (config.components || []).map((comp, index) => ({
      id: comp.id || `view_component_${index}`,
      title: comp.title || `Компонент ${index + 1}`,
      viewType: comp.viewType || 'counter',
      datasetId: comp.datasetId || '',
      metric: comp.metric || 'UNIQ',
      description: comp.description || '',
      columns: Array.isArray(comp.columns) ? comp.columns : [],
      layout: normaliseLayout(comp.layout, index)
    }))
  } catch {
    return []
  }
})

const metricsMap = computed(() => {
  const map = {}
  const items = Array.isArray(props.initialMetrics) ? props.initialMetrics : []
  for (const item of items) {
    if (item && item.componentId) {
      // @ts-ignore - динамическая карта метрик по ID компонента
      map[item.componentId] = item
    }
  }
  return map
})

const timePeriodName = computed(() => {
  if (!props.initialDashboard?.config) return '—'
  try {
    const config = JSON.parse(props.initialDashboard.config)
    const period = TIME_PERIODS.find((p) => p.id === config.timePeriod)
    return period ? period.name : config.timePeriod || '—'
  } catch {
    return '—'
  }
})

const boardPixelSize = BOARD_UNITS * GRID_SIZE

const gridBackgroundStyle = computed(() => {
  const color = isDark.value ? 'rgba(156,163,175,0.15)' : 'rgba(156,163,175,0.25)'
  return {
    backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`,
    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
  }
})

// Состояние простых таблиц (построчные данные)
const simpleTableState = ref({})

// Состояние сводных таблиц (иерархические данные)
const pivotState = ref({})
const pivotExpandedRows = ref({}) // key = `${componentId}:${level}:${path.join('>')}:${rowIndex}`

// Поддержка колонок для простых табличных компонентов
const SIMPLE_TABLE_COLUMN_LABELS = {
  time: 'Время',
  user: 'Пользователь',
  location: 'География и устройство',
  event: 'Событие',
  utm: 'UTM-метки'
}

function getComponentColumns(component) {
  const cols = Array.isArray(component && component.columns) ? component.columns : []
  if (cols.length > 0) {
    return cols
  }
  // Значения по умолчанию для простых таблиц
  return ['time', 'user', 'location', 'event', 'utm']
}

function getColumnLabel(columnId) {
  return SIMPLE_TABLE_COLUMN_LABELS[columnId] || columnId
}

function getMetricValue(componentId) {
  const entry = metricsMap.value && metricsMap.value[componentId]
  if (!entry || typeof entry.value !== 'number') {
    return null
  }
  return entry.value
}

// Логика загрузки данных удалена - будет переписана с нуля
function getSimpleTableRows(componentId) {
  return []
}

function getSimpleTableLoading(componentId) {
  return false
}

function getSimpleTableHasMore(componentId) {
  return false
}

function getSimpleTableError(componentId) {
  return null
}

function getSimpleTablePage(componentId) {
  return 1
}

function loadSimpleTablePage(componentId, page = 1) {
  // Логика загрузки данных удалена
}

function formatSimpleTableCell(row, columnId) {
  if (!row) return '—'

  switch (columnId) {
    case 'time':
      return row.ts ? String(row.ts).substring(0, 19).replace('T', ' ') : '—'
    case 'user': {
      const parts = []
      if (row.user_first_name || row.user_last_name) {
        parts.push([row.user_first_name, row.user_last_name].filter(Boolean).join(' '))
      }
      if (row.user_email) {
        parts.push(row.user_email)
      }
      if (row.user_phone) {
        parts.push(row.user_phone)
      }
      return parts.length ? parts.join(' · ') : 'Анонимный'
    }
    case 'location': {
      const parts = []
      if (row.ip) parts.push(row.ip)
      if (row.location_country || row.location_city) {
        parts.push([row.location_country, row.location_city].filter(Boolean).join(', '))
      }
      if (row.ua_device_type || row.ua_os_name || row.ua_client_name) {
        const deviceParts = []
        if (row.ua_device_type) deviceParts.push(row.ua_device_type)
        if (row.ua_os_name) deviceParts.push(row.ua_os_name)
        if (row.ua_client_name) deviceParts.push(row.ua_client_name)
        parts.push(deviceParts.join(' · '))
      }
      return parts.length ? parts.join(' | ') : '—'
    }
    case 'event': {
      if (row.title) return row.title
      if (row.urlPath) return row.urlPath
      if (row.action) return row.action
      return '—'
    }
    case 'utm': {
      const parts = []
      if (row.utm_source) parts.push(`source=${row.utm_source}`)
      if (row.utm_medium) parts.push(`medium=${row.utm_medium}`)
      if (row.utm_campaign) parts.push(`campaign=${row.utm_campaign}`)
      if (row.utm_term) parts.push(`term=${row.utm_term}`)
      if (row.utm_content) parts.push(`content=${row.utm_content}`)
      return parts.length ? parts.join(' · ') : '—'
    }
    default:
      return row[columnId] != null ? String(row[columnId]) : '—'
  }
}

function normaliseLayout(layout, index) {
  const fallback = {
    x: 0,
    y: index * 4,
    w: 4,
    h: 3
  }

  if (!layout) return fallback

  const x = typeof layout.x === 'number' && layout.x >= 0 ? layout.x : fallback.x
  const y = typeof layout.y === 'number' && layout.y >= 0 ? layout.y : fallback.y
  const w = typeof layout.w === 'number' && layout.w > 0 ? layout.w : fallback.w
  const h = typeof layout.h === 'number' && layout.h > 0 ? layout.h : fallback.h

  return {
    x: Math.min(x, BOARD_UNITS - 1),
    y: Math.min(y, BOARD_UNITS - 1),
    w: Math.min(w, BOARD_UNITS),
    h: Math.min(h, BOARD_UNITS)
  }
}

function getComponentStyle(component) {
  const layout = normaliseLayout(component.layout, 0)
  return {
    left: layout.x * GRID_SIZE + 'px',
    top: layout.y * GRID_SIZE + 'px',
    width: layout.w * GRID_SIZE + 'px',
    height: layout.h * GRID_SIZE + 'px'
  }
}

function getViewTypeLabel(viewType) {
  switch (viewType) {
    case 'counter':
      return 'Целочисленный счётчик'
    case 'simple-table':
      return 'Простая таблица'
    case 'pivot-table':
      return 'Сводная таблица'
    default:
      return 'Компонент'
  }
}

function getDatasetName(datasetId) {
  if (!datasetId) return 'Датасет не выбран'
  const dataset = (props.datasets || []).find((d) => d.id === datasetId)
  return dataset ? dataset.name : 'Неизвестный датасет'
}

function formatMetricValue(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return '—'
  }
  if (typeof rawValue !== 'number') {
    return String(rawValue)
  }
  try {
    return rawValue.toLocaleString('ru-RU')
  } catch {
    return String(rawValue)
  }
}

// Функции для работы со сводной таблицей
function getPivotNodeKey(level, path) {
  return `${level}:${path.join('>')}`
}

function getPivotComponentState(componentId) {
  if (!pivotState.value[componentId]) {
    pivotState.value[componentId] = {
      nodes: {}
    }
  }
  return pivotState.value[componentId]
}

// Логика загрузки данных удалена - будет переписана с нуля
function getPivotRows(componentId, level, path) {
  return []
}

function getPivotLoading(componentId, level, path) {
  return false
}

function getPivotError(componentId, level, path) {
  return null
}

function getPivotTotal(componentId, level, path) {
  return null
}

function loadPivotLevel(componentId, level = 0, path = []) {
  // Логика загрузки данных удалена
}

function formatPivotMetricValue(val) {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'number') {
    try {
      return val.toLocaleString('ru-RU')
    } catch {
      return String(val)
    }
  }
  return String(val)
}

function getPivotRowKey(componentId, level, path, rowIndex) {
  return `${componentId}:${level}:${path.join('>')}:${rowIndex}`
}

function isPivotRowExpanded(componentId, level, path, rowIndex) {
  const key = getPivotRowKey(componentId, level, path, rowIndex)
  return !!pivotExpandedRows.value[key]
}

function togglePivotRow(componentId, level, path, rowIndex, rowValue) {
  // Логика загрузки данных удалена - будет переписана с нуля
  const key = getPivotRowKey(componentId, level, path, rowIndex)
  pivotExpandedRows.value[key] = !pivotExpandedRows.value[key]
}

// Предоставляем функции для рекурсивного компонента
const pivotFunctions = {
  getPivotRows,
  getPivotLoading,
  getPivotError,
  isPivotRowExpanded,
  togglePivotRow,
  formatPivotMetricValue
}
provide('pivotFunctions', pivotFunctions)

// Создаем рекурсивный компонент для сводной таблицы через render function
const PivotTableRowRecursive = defineComponent({
  name: 'PivotTableRowRecursive',
  props: {
    componentId: { type: String, required: true },
    row: { type: Object, required: true },
    level: { type: Number, required: true },
    rowIndex: { type: Number, required: true },
    path: { type: Array, required: true },
    isDark: { type: Boolean, required: true }
  },
  setup(props) {
    const pivotFuncs = inject('pivotFunctions')

    const currentPath = computedVue(() => [...props.path, props.row.value])
    const isExpanded = computedVue(
      () =>
        pivotFuncs?.isPivotRowExpanded?.(
          props.componentId,
          props.level,
          props.path,
          props.rowIndex
        ) || false
    )
    const childRows = computedVue(() =>
      props.row.hasChildren && isExpanded.value
        ? pivotFuncs?.getPivotRows?.(props.componentId, props.level + 1, currentPath.value) || []
        : []
    )
    const isLoading = computedVue(
      () =>
        pivotFuncs?.getPivotLoading?.(props.componentId, props.level + 1, currentPath.value) ||
        false
    )
    const error = computedVue(
      () =>
        pivotFuncs?.getPivotError?.(props.componentId, props.level + 1, currentPath.value) || null
    )

    const handleToggle = () => {
      if (pivotFuncs?.togglePivotRow) {
        pivotFuncs.togglePivotRow(
          props.componentId,
          props.level,
          props.path,
          props.rowIndex,
          props.row.value
        )
      }
    }

    const formatMetric = pivotFuncs?.formatPivotMetricValue || ((val) => String(val || '—'))

    return () => {
      const borderClass = props.isDark ? 'border-gray-800' : 'border-gray-100'
      const paddingLeft = `${props.level * 32}px`

      const children = []

      // Основная строка
      children.push(
        h('tr', [
          h(
            'td',
            {
              class: `px-2 py-1 border-b ${borderClass}`,
              style: { paddingLeft }
            },
            [
              h('div', { class: 'flex items-center gap-2' }, [
                props.row.hasChildren
                  ? h(
                      'button',
                      {
                        onClick: handleToggle,
                        class: `p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${isExpanded.value ? 'text-blue-500' : 'text-gray-400'}`
                      },
                      [
                        h('i', {
                          class: `fas ${isExpanded.value ? 'fa-chevron-down' : 'fa-chevron-right'} text-[10px]`
                        })
                      ]
                    )
                  : h('span', { class: 'w-4' }),
                h('span', props.row.label)
              ])
            ]
          ),
          h(
            'td',
            {
              class: `px-2 py-1 text-right border-b ${borderClass}`
            },
            formatMetric(props.row.metricValue)
          )
        ])
      )

      // Дочерние строки, если строка раскрыта
      if (props.row.hasChildren && isExpanded.value) {
        if (isLoading.value) {
          children.push(
            h('tr', [
              h(
                'td',
                {
                  colspan: 2,
                  class: 'px-2 py-1 text-[10px] opacity-60',
                  style: { paddingLeft: `${(props.level + 1) * 32}px` }
                },
                'Загрузка...'
              )
            ])
          )
        } else if (error.value) {
          children.push(
            h('tr', [
              h(
                'td',
                {
                  colspan: 2,
                  class: 'px-2 py-1 text-[10px] text-red-400',
                  style: { paddingLeft: `${(props.level + 1) * 32}px` }
                },
                error.value
              )
            ])
          )
        } else {
          childRows.value.forEach((childRow, childIndex) => {
            children.push(
              h(PivotTableRowRecursive, {
                key: `${props.componentId}-${props.level + 1}-${childRow.value}`,
                componentId: props.componentId,
                row: childRow,
                level: props.level + 1,
                rowIndex: childIndex,
                path: currentPath.value,
                isDark: props.isDark
              })
            )
          })
        }
      }

      return h(Fragment, children)
    }
  }
})

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme === 'dark'
  // Логика загрузки данных удалена - будет переписана с нуля
})
</script>

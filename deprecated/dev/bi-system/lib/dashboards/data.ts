// @shared
// Логика обработки данных удалена - будет переписана с нуля
// Оставляем только типы для совместимости

export interface DashboardComponentConfig {
  id: string
  title?: string
  viewType?: string
  datasetId?: string
  metric?: string
  columns?: string[]
}

export interface DashboardConfig {
  timePeriod?: string
  components?: DashboardComponentConfig[]
}

export interface DashboardMetricResult {
  componentId: string
  value: number | null
  error?: string
}

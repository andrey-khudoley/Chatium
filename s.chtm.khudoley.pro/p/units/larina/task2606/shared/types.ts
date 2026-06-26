// @shared

/** Поля одной записи диагностики в листинге (без dom). */
export interface DiagnosticsItem {
  id: string
  visitorId?: string
  ip?: string
  url?: string
  params?: string
  info?: unknown
  createdAt?: number
}

/** Полная запись диагностики с полем dom (для детального просмотра). */
export interface DiagnosticsDetailItem extends DiagnosticsItem {
  dom?: string
}

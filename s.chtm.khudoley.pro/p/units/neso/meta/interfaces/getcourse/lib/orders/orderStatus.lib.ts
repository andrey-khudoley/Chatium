/**
 * Маппинг GC-статусов/is_payed → внутренний статус заказа.
 */

export type InternalOrderStatus = 'new' | 'pending' | 'part_paid' | 'paid' | 'cancelled' | 'failed'

/**
 * Проверяет, является ли значение поля is_payed истинным.
 * Истинно: true, 1, '1', 'true'.
 */
export function isPayedTruthy(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true'
}

/**
 * Маппит GC-статус + признак оплаты + переопределение payed-статуса
 * во внутренний статус заказа.
 *
 * @param gcStatus   — сырой статус из GC постбэка
 * @param isPayed    — признак оплаты из is_payed постбэка
 * @param paidOverride — значение настройки gc_paid_status (по умолч. 'payed')
 */
export function mapGcStatus(
  gcStatus: string,
  isPayed: boolean,
  paidOverride: string
): InternalOrderStatus {
  if (isPayed || gcStatus === 'payed' || gcStatus === paidOverride) {
    return 'paid'
  }

  switch (gcStatus) {
    case 'new':
      return 'new'
    case 'in_work':
    case 'not_confirmed':
    case 'payment_waiting':
      return 'pending'
    case 'part_payed':
      return 'part_paid'
    case 'cancelled':
    case 'waiting_for_return':
    case 'false':
      return 'cancelled'
    default:
      return 'pending'
  }
}

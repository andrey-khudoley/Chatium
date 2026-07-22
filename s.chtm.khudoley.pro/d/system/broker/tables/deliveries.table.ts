import { Heap } from '@app/heap'

/*
  BrokerDeliveries — материализованные доставки, самая быстрорастущая таблица
  брокера (§3.3). Одна строка на пару (событие × подписчик); жизненный цикл
  pending → claimed → acked/dead ведёт сам подписчик через pull (§5.9).

  Окружение — в сегменте id (`__stage_` здесь): id объявляется ровно в одном
  файле аккаунта; перенос d/→p/ трансформирует сегмент в `__prod_`
  (§3 «Окружения», подробности — modules.table.ts).
*/
// Heap.Enum ожидает объектный enum (TEnumType), не массив-литерал — см. modules.table.ts.
export const DELIVERY_STATUS_ENUM = {
  pending: 'pending',
  claimed: 'claimed',
  acked: 'acked',
  dead: 'dead'
} as const

const fields = {
  eventId: Heap.String({
    customMeta: { title: 'id события-источника из BrokerEvents (строка, не RefLink)' }
  }),
  eventType: Heap.String({
    customMeta: { title: 'Тип события (снимок для pull-фильтра подписчика)' }
  }),
  schemaVersion: Heap.Number({ customMeta: { title: 'Версия схемы payload (снимок)' } }),
  payload: Heap.Optional(
    Heap.Any({ customMeta: { title: 'Снимок payload события (толстая доставка, ADR-0006)' } })
  ),
  subscriberModuleKey: Heap.String({
    customMeta: { title: 'moduleKey подписчика (строка, не RefLink)' }
  }),
  status: Heap.Enum(DELIVERY_STATUS_ENUM, {
    customMeta: { title: 'Статус доставки (жизненный цикл §3.3)' }
  }),
  claimedAt: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Момент последнего claim, epoch ms (не задан до первого claim)' }
    })
  ),
  claimCount: Heap.Number({
    customMeta: { title: 'Сколько раз доставку выдавали (диагностика, О7)' },
    defaultValue: 0
  }),
  lastError: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Причина финальной сдачи (deadDelivery, обрезается до LAST_ERROR_MAX)' }
    })
  ),
  claimToken: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Метка текущего захвата (nanoid, новая на каждый claim, О6)' }
    })
  )
}

export const BrokerDeliveries = Heap.Table('t__broker__deliveries__stage_fk9ze2', fields, {
  customMeta: {
    title: 'Broker Deliveries (stage)',
    description: 'Материализованные доставки брокера — §3.3'
  }
})

export type BrokerDeliveriesRow = typeof BrokerDeliveries.T
export type BrokerDeliveriesRowJson = typeof BrokerDeliveries.JsonT

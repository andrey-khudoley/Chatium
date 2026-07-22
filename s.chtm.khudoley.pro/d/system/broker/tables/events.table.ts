import { Heap } from '@app/heap'
import { IS_PROD } from '../config/env'

/*
  BrokerEvents — неизменяемый журнал опубликованных событий (§3.2). Append-only:
  фактическая часть строки после публикации не редактируется, меняется лишь
  служебный dispatchedAt (разовый переход null → timestamp, §5.8).
*/
const fields = {
  eventType: Heap.String({ customMeta: { title: 'Доменный тип события (glob-таргет при матче)' } }),
  // Корневое плоское число (не внутри payload) — вынесено ради индексируемости (ADR-0003).
  schemaVersion: Heap.Number({ customMeta: { title: 'Версия схемы payload внутри eventType' } }),
  producerModuleKey: Heap.String({
    customMeta: { title: 'moduleKey продюсера (строка, не RefLink)' }
  }),
  payload: Heap.Optional(
    Heap.Any({ customMeta: { title: 'Полезная нагрузка (потолок 8 КБ, §3.2)' } })
  ),
  idempotencyKey: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Ключ дедупликации публикации (producerModuleKey, idempotencyKey)' }
    })
  ),
  dispatchedAt: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Момент завершения fan-out, epoch ms (null = не завершён)' }
    })
  )
}

const BrokerEventsStage = Heap.Table('t__broker__events__stage_BOnFpq', fields, {
  customMeta: {
    title: 'Broker Events (stage)',
    description: 'Журнал опубликованных событий брокера — §3.2'
  }
})
const BrokerEventsProd = Heap.Table('t__broker__events__prod_BOnFpq', fields, {
  customMeta: {
    title: 'Broker Events (prod)',
    description: 'Журнал опубликованных событий брокера — §3.2'
  }
})

export const BrokerEvents = IS_PROD ? BrokerEventsProd : BrokerEventsStage

export type BrokerEventsRow = typeof BrokerEventsStage.T
export type BrokerEventsRowJson = typeof BrokerEventsStage.JsonT

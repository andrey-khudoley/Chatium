import { Heap } from '@app/heap'

/*
  BrokerEventsArchive — холодный инлайновый архив журнала (§3.4). Только схема:
  функционально код МВП (волна 2) её не использует — retention-джоб (§3.5),
  архивация и любое чтение архива входят в волну 3 (§0.1). Здесь таблица лишь
  объявляется, чтобы схема была зафиксирована и неизменяема с самого начала (§3).

  Окружение — в сегменте id (`__stage_` здесь): id объявляется ровно в одном
  файле аккаунта; перенос d/→p/ трансформирует сегмент в `__prod_`
  (§3 «Окружения», подробности — modules.table.ts).
*/
const fields = {
  batchFrom: Heap.Number({ customMeta: { title: 'Минимальный createdAt в батче, epoch ms' } }),
  batchTo: Heap.Number({ customMeta: { title: 'Максимальный createdAt в батче, epoch ms' } }),
  count: Heap.Number({ customMeta: { title: 'Число упакованных событий в строке' } }),
  events: Heap.Any({
    customMeta: { title: 'Упакованный массив архивных строк BrokerEvents (JSON)' }
  })
}

export const BrokerEventsArchive = Heap.Table('t__broker__events-arch__stage_LO6Zki', fields, {
  customMeta: {
    title: 'Broker Events Archive (stage)',
    description: 'Холодный инлайновый архив журнала — §3.4 (без операций в волне 2)'
  }
})

export type BrokerEventsArchiveRow = typeof BrokerEventsArchive.T
export type BrokerEventsArchiveRowJson = typeof BrokerEventsArchive.JsonT

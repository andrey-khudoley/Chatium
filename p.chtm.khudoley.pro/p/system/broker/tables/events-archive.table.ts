import { Heap } from '@app/heap'
import { IS_PROD } from '../config/env'

/*
  BrokerEventsArchive — холодный инлайновый архив журнала (§3.4). Только схема:
  функционально код МВП (волна 2) её не использует — retention-джоб (§3.5),
  архивация и любое чтение архива входят в волну 3 (§0.1). Здесь таблица лишь
  объявляется, чтобы схема была зафиксирована и неизменяема с самого начала (§3).
*/
const fields = {
  batchFrom: Heap.Number({ customMeta: { title: 'Минимальный createdAt в батче, epoch ms' } }),
  batchTo: Heap.Number({ customMeta: { title: 'Максимальный createdAt в батче, epoch ms' } }),
  count: Heap.Number({ customMeta: { title: 'Число упакованных событий в строке' } }),
  events: Heap.Any({
    customMeta: { title: 'Упакованный массив архивных строк BrokerEvents (JSON)' }
  })
}

const BrokerEventsArchiveStage = Heap.Table('t__broker__events-arch__stage_LO6Zki', fields, {
  customMeta: {
    title: 'Broker Events Archive (stage)',
    description: 'Холодный инлайновый архив журнала — §3.4 (без операций в волне 2)'
  }
})
const BrokerEventsArchiveProd = Heap.Table('t__broker__events-arch__prod_LO6Zki', fields, {
  customMeta: {
    title: 'Broker Events Archive (prod)',
    description: 'Холодный инлайновый архив журнала — §3.4 (без операций в волне 2)'
  }
})

export const BrokerEventsArchive = IS_PROD ? BrokerEventsArchiveProd : BrokerEventsArchiveStage

export type BrokerEventsArchiveRow = typeof BrokerEventsArchiveStage.T
export type BrokerEventsArchiveRowJson = typeof BrokerEventsArchiveStage.JsonT

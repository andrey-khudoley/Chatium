import { Heap } from '@app/heap'

/**
 * Таблица лидов App A — фиксирует каждую попытку отправки формы лендинга.
 * Хранится в Heap приложения client1; ничего не пересекается с другими client'ами.
 *
 * Содержит:
 * - снимок входных данных формы (без секретов);
 * - результат вызова gateway (`addUser`/`createDeal`): `ok`, `requestId`, код ошибки;
 * - источник трафика (UTM/landingId), если форма их прислала.
 */
export const Leads = Heap.Table('t__chatiumclub-client1__lead__7Vt3Aa', {
  email: Heap.String({
    customMeta: { title: 'Email' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  name: Heap.String({
    customMeta: { title: 'Имя' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  phone: Heap.String({
    customMeta: { title: 'Телефон' }
  }),
  utmSource: Heap.String({
    customMeta: { title: 'utm_source' }
  }),
  utmCampaign: Heap.String({
    customMeta: { title: 'utm_campaign' }
  }),
  landingId: Heap.String({
    customMeta: { title: 'ID лендинга' }
  }),
  addUserOk: Heap.Boolean({
    customMeta: { title: 'addUser ok' }
  }),
  addUserErrorCode: Heap.String({
    customMeta: { title: 'addUser error.code' }
  }),
  createDealOk: Heap.Boolean({
    customMeta: { title: 'createDeal ok' }
  }),
  createDealErrorCode: Heap.String({
    customMeta: { title: 'createDeal error.code' }
  }),
  gatewayRequestId: Heap.String({
    customMeta: { title: 'requestId gateway (последний)' }
  }),
  createdAt: Heap.Number({
    customMeta: { title: 'Создано (Unix ms)' }
  })
})

export default Leads

export type LeadsRow = typeof Leads.T
export type LeadsRowJson = typeof Leads.JsonT

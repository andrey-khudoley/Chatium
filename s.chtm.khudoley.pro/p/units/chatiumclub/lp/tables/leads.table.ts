import { Heap } from '@app/heap'

/**
 * Таблица лидов лендинга «Получить доступ к SDK».
 * Хранит отправки формы: телефон, Telegram username, описание интеграции, время создания.
 */
export const Leads = Heap.Table('t__chatiumclub-lp__lead__7Mq3Xp', {
  phone: Heap.String({
    customMeta: { title: 'Телефон' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  telegramUsername: Heap.String({
    customMeta: { title: 'Telegram username' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  integrationNotes: Heap.String({
    customMeta: { title: 'Что хотите интегрировать?' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  submittedAt: Heap.Number({
    customMeta: { title: 'Время отправки заявки (Unix ms)' }
  })
})

export default Leads

export type LeadsRow = typeof Leads.T
export type LeadsRowJson = typeof Leads.JsonT

import { Heap } from '@app/heap'

/**
 * Лог входящих вебхуков GC App C — каждая попытка приёма webhook'а.
 * Поддерживает идемпотентность по `gcEventId` и аудит реакций Леночки.
 *
 * `tokenValid` — результат проверки токена в URL (точное равенство со значением в Heap).
 * Сам токен в логи не попадает (manual §5.7).
 */
export const WebhookLog = Heap.Table('t__chatiumclub-client3__webhook_log__3Ds5Cq', {
  /** Идентификатор события GC (для идемпотентности) — может быть пустым, если GC не прислал. */
  gcEventId: Heap.String({
    customMeta: { title: 'GC event ID' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  eventType: Heap.String({
    customMeta: { title: 'Тип события' }
  }),
  email: Heap.String({
    customMeta: { title: 'Email пользователя GC' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  dealId: Heap.String({
    customMeta: { title: 'GC deal ID' }
  }),
  amount: Heap.Number({
    customMeta: { title: 'Сумма' }
  }),
  tokenValid: Heap.Boolean({
    customMeta: { title: 'Токен URL валиден' }
  }),
  reactionOk: Heap.Boolean({
    customMeta: { title: 'Реакция отправлена (addCommentToDialog ok)' }
  }),
  reactionErrorCode: Heap.String({
    customMeta: { title: 'Реакция: error.code' }
  }),
  gatewayRequestId: Heap.String({
    customMeta: { title: 'requestId gateway' }
  }),
  status: Heap.String({
    customMeta: { title: 'Статус: queued | delivered | already_processed | invalid_token | error' }
  }),
  receivedAt: Heap.Number({
    customMeta: { title: 'Получено (Unix ms)' }
  })
})

export default WebhookLog

export type WebhookLogRow = typeof WebhookLog.T
export type WebhookLogRowJson = typeof WebhookLog.JsonT

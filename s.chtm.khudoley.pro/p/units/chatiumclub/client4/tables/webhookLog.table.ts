import { Heap } from '@app/heap'

/**
 * Лог входящих вебхуков GC App D — каждая попытка приёма webhook'а о регистрации.
 * Поддерживает идемпотентность по `gcEventId` и аудит отправки приветствия.
 *
 * `tokenValid` — результат проверки токена в URL (точное равенство со значением в Heap).
 * Сам токен в логи не попадает (manual §5.7).
 */
export const WebhookLog = Heap.Table('t__chatiumclub-client4__webhook_log__7Vx9Pq', {
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
  /** Идентификатор активности (training/webinar) в GC. */
  activityId: Heap.String({
    customMeta: { title: 'GC activity ID' }
  }),
  activityName: Heap.String({
    customMeta: { title: 'Название активности' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  tokenValid: Heap.Boolean({
    customMeta: { title: 'Токен URL валиден' }
  }),
  reactionOk: Heap.Boolean({
    customMeta: { title: 'Приветствие отправлено (addCommentToDialog ok)' }
  }),
  reactionErrorCode: Heap.String({
    customMeta: { title: 'Реакция: error.code' }
  }),
  gatewayRequestId: Heap.String({
    customMeta: { title: 'requestId gateway' }
  }),
  status: Heap.String({
    customMeta: {
      title:
        'Статус: queued | delivered | already_processed | invalid_token | error | user_not_found'
    }
  }),
  receivedAt: Heap.Number({
    customMeta: { title: 'Получено (Unix ms)' }
  })
})

export default WebhookLog

export type WebhookLogRow = typeof WebhookLog.T
export type WebhookLogRowJson = typeof WebhookLog.JsonT

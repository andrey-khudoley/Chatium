import { Heap } from '@app/heap'

/**
 * Таблица для логирования всех входящих вебхуков от Telegram
 *
 * Каждая запись содержит:
 * - botId: ID бота, которому принадлежит вебхук
 * - projectId: ID проекта, к которому принадлежит бот (для аудита и быстрого доступа)
 * - updateId: уникальный ID обновления от Telegram (для предотвращения дубликатов)
 * - rawData: сырые данные вебхука в формате JSON
 * - receivedAt: время получения вебхука
 */
export const TelegramWebhooks = Heap.Table('t__tg_channel_analytics__webhooks__a3b4c5d6', {
  botId: Heap.String({
    customMeta: { title: 'ID бота' }
  }),
  projectId: Heap.String({
    customMeta: { title: 'ID проекта' }
  }),
  updateId: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'ID обновления от Telegram' }
    })
  ),
  rawData: Heap.Any({
    customMeta: { title: 'Сырые данные вебхука' }
  }),
  receivedAt: Heap.DateTime({
    customMeta: { title: 'Время получения вебхука' }
  })
})

export default TelegramWebhooks

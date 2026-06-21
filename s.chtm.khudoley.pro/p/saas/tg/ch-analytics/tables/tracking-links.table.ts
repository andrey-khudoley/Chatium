import { Heap } from '@app/heap'

/**
 * Таблица для хранения отслеживаемых ссылок
 *
 * Каждая запись содержит:
 * - name: название ссылки
 * - placementUrl: место размещения (опционально)
 * - channelId: ID канала из TelegramChats
 * - botId: ID бота (обязательно, если несколько ботов)
 * - projectId: ID проекта
 * - inviteLink: сгенерированный инвайт-линк (опционально)
 * - inviteLinkCreatedAt: время создания инвайт-линка
 * - revokedAt: время отзыва ссылки (опционально)
 *
 * Системные поля createdAt и updatedAt добавляются автоматически
 */
export const TrackingLinks = Heap.Table('t__tg_channel_analytics__tracking_links__c1d2e3f4', {
  name: Heap.String({
    customMeta: { title: 'Название ссылки' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  placementUrl: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Место размещения' },
      searchable: { langs: ['ru', 'en'], embeddings: false }
    })
  ),
  channelId: Heap.String({
    customMeta: { title: 'ID канала из TelegramChats' }
  }),
  botId: Heap.String({
    customMeta: { title: 'ID бота' }
  }),
  projectId: Heap.String({
    customMeta: { title: 'ID проекта' }
  }),
  inviteLink: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Сгенерированный инвайт-линк' }
    })
  ),
  inviteLinkCreatedAt: Heap.Optional(
    Heap.DateTime({
      customMeta: { title: 'Время создания инвайт-линка' }
    })
  ),
  revokedAt: Heap.Optional(
    Heap.DateTime({
      customMeta: { title: 'Время отзыва ссылки' }
    })
  )
})

export default TrackingLinks

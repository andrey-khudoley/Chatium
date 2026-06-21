import { Heap } from '@app/heap'

/**
 * Таблица для хранения событий подписки, которые нужно атрибутировать
 *
 * Каждая запись содержит:
 * - joinId: уникальный ID события (из update_id или генерируемый)
 * - chatId: ID канала
 * - botId: ID бота
 * - projectId: ID проекта
 * - userId: ID пользователя (Telegram user ID)
 * - userName: имя пользователя
 * - joinedAt: время подписки
 * - inviteLink: invite_link из webhook (опционально, для детерминированной атрибуции)
 * - attributionMethod: способ атрибуции: 'deterministic' | 'probabilistic' | 'unknown'
 * - attributedToLinkClickId: ID LinkClick, к которому привязано (опционально)
 * - attributedToTrackingLinkId: ID TrackingLink (опционально)
 * - confidence: уверенность атрибуции (0-1, только для вероятностного)
 * - status: статус: 'pending' | 'attributed' | 'expired'
 *
 * Системные поля createdAt и updatedAt добавляются автоматически
 */
export const JoinEvents = Heap.Table('t__tg_channel_analytics__join_events__e5f6a7b8', {
  joinId: Heap.String({
    customMeta: { title: 'Уникальный ID события подписки' }
  }),
  chatId: Heap.String({
    customMeta: { title: 'ID канала' }
  }),
  botId: Heap.String({
    customMeta: { title: 'ID бота' }
  }),
  projectId: Heap.String({
    customMeta: { title: 'ID проекта' }
  }),
  userId: Heap.String({
    customMeta: { title: 'ID пользователя (Telegram user ID)' }
  }),
  userName: Heap.String({
    customMeta: { title: 'Имя пользователя' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  joinedAt: Heap.DateTime({
    customMeta: { title: 'Время подписки' }
  }),
  inviteLink: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Invite link из webhook (для детерминированной атрибуции)' }
    })
  ),
  attributionMethod: Heap.Union(
    [Heap.Literal('deterministic'), Heap.Literal('probabilistic'), Heap.Literal('unknown')],
    {
      customMeta: { title: 'Способ атрибуции' },
      defaultValue: 'unknown'
    }
  ),
  attributedToLinkClickId: Heap.Optional(
    Heap.String({
      customMeta: { title: 'ID LinkClick, к которому привязано событие' }
    })
  ),
  attributedToTrackingLinkId: Heap.Optional(
    Heap.String({
      customMeta: { title: 'ID TrackingLink' }
    })
  ),
  confidence: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Уверенность атрибуции (0-1, только для вероятностного)' }
    })
  ),
  status: Heap.Union(
    [Heap.Literal('pending'), Heap.Literal('attributed'), Heap.Literal('expired')],
    {
      customMeta: { title: 'Статус события' },
      defaultValue: 'pending'
    }
  )
})

export default JoinEvents

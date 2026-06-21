import { Heap } from '@app/heap'

/**
 * Таблица для хранения токенов Telegram ботов
 *
 * Каждая запись содержит:
 * - token: токен бота, введённый пользователем
 * - botName: название бота, полученное через API Telegram
 * - botUsername: имя бота (username с суффиксом "_bot")
 * - projectId: ID проекта, к которому привязан бот
 * - lastError: текст последней ошибки (если была)
 * - lastErrorAt: время последней ошибки (если была)
 * - lastErrorType: тип последней ошибки (если была) - например, 'admin_permission_required', 'invite_link_creation_failed'
 */
export const BotTokens = Heap.Table('t__tg_channel_analytics__bot_tokens__f8e9d2a1', {
  token: Heap.String({
    customMeta: { title: 'Токен бота' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  botName: Heap.String({
    customMeta: { title: 'Название бота' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  botUsername: Heap.String({
    customMeta: { title: 'Имя бота' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  projectId: Heap.String({
    customMeta: { title: 'ID проекта' }
  }),
  lastError: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Последняя ошибка' }
    })
  ),
  lastErrorAt: Heap.Optional(
    Heap.DateTime({
      customMeta: { title: 'Время последней ошибки' }
    })
  ),
  lastErrorType: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Тип последней ошибки' }
    })
  )
})

export default BotTokens

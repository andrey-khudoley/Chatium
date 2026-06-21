// @shared
/**
 * Утилита для извлечения информации о чате из вебхука Telegram
 *
 * Telegram вебхуки могут содержать chat в разных местах:
 * - message.chat
 * - channel_post.chat
 * - edited_message.chat
 * - edited_channel_post.chat
 * - callback_query.message.chat
 * - my_chat_member.chat
 * - chat_member.chat
 * - chat_join_request.chat
 * - chat_boost.chat (Bot API 9.0+)
 * - removed_chat_boost.chat (Bot API 9.0+)
 *
 * ВАЖНО: Извлекаем только Chat объекты, НЕ User объекты!
 * User объекты (.from, .user) имеют другой тип и не должны попадать в таблицу чатов.
 *
 * НЕ обрабатываем (не содержат Chat):
 * - inline_query (содержит только from, query, location, chat_type)
 * - chosen_inline_result (содержит только from, result_id, query)
 * - shipping_query (содержит только from, invoice_payload, shipping_address)
 * - pre_checkout_query (содержит только from, currency, total_amount, invoice_payload)
 * - poll (не содержит chat)
 * - poll_answer (содержит только poll_id, user, option_ids)
 */

export interface ChatInfo {
  id: number | string
  type?: string
  title?: string
  username?: string
}

/**
 * Извлекает информацию о чате из вебхука Telegram
 * @param update - объект вебхука от Telegram
 * @returns информация о чате или null, если чат не найден
 */
export function extractChatFromUpdate(update: any): ChatInfo | null {
  if (!update || typeof update !== 'object') {
    return null
  }

  // Проверяем только места, где может быть Chat объект
  // НЕ включаем User объекты (.from, .user) - они имеют другой тип
  const chatPaths = [
    update.message?.chat,
    update.channel_post?.chat,
    update.edited_message?.chat,
    update.edited_channel_post?.chat,
    update.callback_query?.message?.chat,
    // update.inline_query?.chat, // ❌ УДАЛЕНО: inline_query не содержит chat (только from, query, location, chat_type)
    // ИСКЛЮЧАЕМ User объекты:
    // update.chosen_inline_result?.from, // ❌ User объект
    // update.shipping_query?.from, // ❌ User объект
    // update.pre_checkout_query?.from, // ❌ User объект
    // update.poll_answer?.user, // ❌ User объект
    update.my_chat_member?.chat,
    update.chat_member?.chat,
    update.chat_join_request?.chat,
    update.chat_boost?.chat, // Bot API 9.0+
    update.removed_chat_boost?.chat // Bot API 9.0+
  ]

  // Допустимые типы чатов в Telegram
  const validChatTypes = ['private', 'group', 'supergroup', 'channel']

  for (const chat of chatPaths) {
    if (chat && chat.id !== undefined && chat.id !== null) {
      // Дополнительная проверка: убеждаемся, что это Chat объект, а не User
      // Chat объекты имеют поле 'type' с допустимыми значениями
      // User объекты не имеют поля 'type' или имеют другие поля
      if (chat.type && validChatTypes.includes(chat.type)) {
        return {
          id: chat.id,
          type: chat.type,
          title: chat.title,
          username: chat.username
        }
      }
    }
  }

  return null
}

/**
 * Проверяет, содержит ли вебхук информацию о чате
 * @param update - объект вебхука от Telegram
 * @returns true, если чат найден, false в противном случае
 */
export function hasChatInUpdate(update: any): boolean {
  return extractChatFromUpdate(update) !== null
}

/**
 * Извлекает статус бота в канале из вебхука Telegram
 * Статус находится в my_chat_member.new_chat_member.status или chat_member.new_chat_member.status
 *
 * Возможные статусы:
 * - 'member' - бот является участником
 * - 'administrator' - бот является администратором
 * - 'left' - бот покинул канал
 * - 'kicked' - бот был удален из канала
 * - 'restricted' - бот ограничен
 * - 'creator' - бот является создателем
 *
 * @param update - объект вебхука от Telegram
 * @returns статус бота или null, если статус не найден
 */
export function extractBotStatusFromUpdate(update: any): string | null {
  if (!update || typeof update !== 'object') {
    return null
  }

  // Проверяем my_chat_member (изменение статуса бота)
  const myChatMember = update.my_chat_member
  if (myChatMember && myChatMember.new_chat_member && myChatMember.new_chat_member.status) {
    return myChatMember.new_chat_member.status
  }

  // Проверяем chat_member (изменение статуса участника)
  const chatMember = update.chat_member
  if (chatMember && chatMember.new_chat_member && chatMember.new_chat_member.status) {
    return chatMember.new_chat_member.status
  }

  return null
}

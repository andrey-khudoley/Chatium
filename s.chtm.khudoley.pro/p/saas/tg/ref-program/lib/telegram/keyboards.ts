/**
 * Клавиатуры бота (кнопки для прототипа).
 */

export interface TelegramReplyButton {
  text: string
}

export interface TelegramInlineButton {
  text: string
  url?: string
  callback_data?: string
}

/** Главная клавиатура (ReplyKeyboard) — кнопки под полем ввода. */
export function getMainKeyboard(): TelegramReplyButton[][] {
  return [
    [{ text: '🔗 Управлять ссылками' }, { text: '📈 Статистика' }],
    [{ text: '💰 Запросить вывод' }]
  ]
}

/** Inline-кнопки для сообщения (одна строка). */
export function getWelcomeInlineButtons(partnerLinkUrl?: string): TelegramInlineButton[][] {
  if (partnerLinkUrl) {
    return [[{ text: '🔗 Открыть партнёрскую ссылку', url: partnerLinkUrl }]]
  }
  return []
}

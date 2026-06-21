/**
 * Построение текстовых сообщений бота (приветствие, статистика).
 */

import type { PartnerRow } from '../../shared/types'

function formatMoney(kopecks: number): string {
  const rubles = kopecks / 100
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(rubles)
}

function defaultStats(partner: PartnerRow) {
  const s = partner.stats
  if (s && typeof s === 'object' && 'registrations' in s) {
    return s as {
      registrations: number
      orders: number
      payments: number
      paymentsSum: number
      earnings: number
      pendingEarnings: number
    }
  }
  return {
    registrations: 0,
    orders: 0,
    payments: 0,
    paymentsSum: 0,
    earnings: 0,
    pendingEarnings: 0
  }
}

/**
 * Приветственное сообщение: приветствие, название кампании, ссылка (если есть), краткая статистика.
 */
export function buildWelcomeMessage(
  partner: PartnerRow,
  campaignTitle?: string,
  partnerLinkUrl?: string
): string {
  const stats = defaultStats(partner)
  const greeting = `Здравствуйте, ${partner.fullName || 'партнёр'}!`
  const registration = campaignTitle
    ? `Вы зарегистрированы в партнёрской программе «${campaignTitle}».`
    : 'Вы зарегистрированы в партнёрской программе.'

  let linkBlock = ''
  if (partnerLinkUrl) {
    linkBlock = `\n\n🔗 Ваша партнёрская ссылка:\n${partnerLinkUrl}\n`
  }

  const statsBlock = `
📊 Ваша статистика:
👤 Регистраций — ${stats.registrations}
🛒 Заказов — ${stats.orders}
💳 Оплачено — ${stats.payments} на сумму ${formatMoney(stats.paymentsSum)}
💰 Заработок — ${formatMoney(stats.earnings)}
⏳ К выплате — ${formatMoney(stats.pendingEarnings)}
`.trim()

  return `${greeting}\n\n${registration}${linkBlock}\n\n${statsBlock}`
}

/**
 * Сообщение только со статистикой.
 */
export function buildStatsMessage(partner: PartnerRow): string {
  const stats = defaultStats(partner)
  return `
📊 Ваша статистика

👤 Регистраций: ${stats.registrations}
🛒 Заказов: ${stats.orders}
💳 Оплаченных: ${stats.payments}
💵 Сумма оплат: ${formatMoney(stats.paymentsSum)}
💰 Заработано: ${formatMoney(stats.earnings)}
⏳ К выводу: ${formatMoney(stats.pendingEarnings)}
`.trim()
}

/**
 * Текст уведомления партнёру о первой регистрации по его реферальной ссылке.
 */
export function buildRegistrationNotification(
  ref: string,
  name?: string,
  email?: string,
  phone?: string
): string {
  const parts = [`Реферал: ${ref}`]
  if (name?.trim()) parts.push(`Имя: ${name.trim()}`)
  return `👤 Новая регистрация\n\n${parts.join('\n')}`.trim()
}

/**
 * Текст уведомления партнёру о новом заказе по его реферальной ссылке.
 */
export function buildOrderNotification(
  orderId: string,
  productName: string,
  orderSumKopecks: number
): string {
  const product = productName?.trim() || '—'
  return `🛒 Новый заказ

ID заказа: ${orderId}
Сумма: ${formatMoney(orderSumKopecks)}`.trim()
}

/**
 * Текст уведомления партнёру о новой оплате по его реферальной ссылке.
 */
export function buildPaymentNotification(orderId: string, paymentSumKopecks: number): string {
  return `💳 Новая оплата

Заказ: ${orderId}
Сумма: ${formatMoney(paymentSumKopecks)}`.trim()
}

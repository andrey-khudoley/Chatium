/**
 * Маппинг полей формы → params Legacy-импорта GC (§5.4 спеки — рабочая гипотеза,
 * подтверждается прогоном прототипа волны 1; статус подтверждения — открытый
 * пункт волны 2, код MVP не опирается на неподтверждённое). Чистая функция —
 * изолирует гипотезу от остального кода, чтобы правка §5.4 задела один файл.
 */

export type SubmitUtm = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

export type SubmitToParamsInput = {
  name: string
  email: string
  phone: string
  offerId: string
  /** Цена из снимка оффера формы (§3.1) — с сервера, не с клиента. Переопределяет
   * стоимость предложения в создаваемой сделке через `deal.deal_cost`. */
  price?: string
  utm: SubmitUtm
}

export type LegacyImportParams = {
  user: { email: string; phone: string; first_name: string }
  // Предложение GC привязывается по числовому id через `offer_id` (подтверждено
  // прогоном 24-07-2026, §5.4): `offer_code` ищет по символьному коду и на числовой
  // id отвечает «Предложение с кодом N не найдено». `deal_cost` — стоимость сделки
  // из снимка формы (переопределяет цену предложения).
  deal: { offer_id: string; deal_cost?: string }
  system: { refresh_if_exists: 1; return_payment_link: 1 }
  session: Record<string, string>
}

/** Пустые UTM опускаются — session может остаться пустым объектом. */
export function mapSubmitToParams(input: SubmitToParamsInput): LegacyImportParams {
  const session: Record<string, string> = {}
  if (input.utm.utmSource) session.utm_source = input.utm.utmSource
  if (input.utm.utmMedium) session.utm_medium = input.utm.utmMedium
  if (input.utm.utmCampaign) session.utm_campaign = input.utm.utmCampaign
  if (input.utm.utmContent) session.utm_content = input.utm.utmContent
  if (input.utm.utmTerm) session.utm_term = input.utm.utmTerm

  const deal: LegacyImportParams['deal'] = { offer_id: input.offerId }
  if (input.price) deal.deal_cost = input.price

  return {
    user: {
      email: input.email,
      phone: input.phone,
      first_name: input.name
    },
    deal,
    system: {
      refresh_if_exists: 1,
      return_payment_link: 1
    },
    session
  }
}

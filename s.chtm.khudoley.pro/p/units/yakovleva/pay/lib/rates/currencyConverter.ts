/**
 * Конвертация рублёвой суммы в целевую валюту для deal-потока Lava.Top.
 *
 * Приоритет источника курса:
 *   1) RUB → identity (без конвертации).
 *   2) USD/EUR: ручной курс (widget_lavatop_manual_rate_*), если задан > 0.
 *   3) USD/EUR: курс ЦБ РФ (https://www.cbr-xml-daily.ru/daily_json.js).
 *
 * Не импортирует кросс-проектные библиотеки (lava_gc_integration и др.).
 */

import { request } from '@app/request'
import * as loggerLib from '../logger.lib'
import { getLavatopManualRate } from '../settings.lib'

const LOG_MODULE = 'lib/rates/currencyConverter'
const CBR_URL = 'https://www.cbr-xml-daily.ru/daily_json.js'

export type PaymentCurrency = 'RUB' | 'USD' | 'EUR'

export type ConvertResult =
  | { ok: true; amount: number; rate: number; source: 'identity' | 'manual' | 'cbr' }
  | { ok: false; code: 'RATE_UNAVAILABLE' }

export type ConvertToRubResult =
  | { ok: true; amountRub: number; rate: number; source: 'identity' | 'manual' | 'cbr' }
  | { ok: false; code: 'RATE_UNAVAILABLE' }

/**
 * Округляет до двух знаков после запятой (центы). Один раунд, без повторной арифметики.
 */
function roundToCents(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100
}

/**
 * Возвращает курс «рублей за 1 единицу валюты» (rubForOne).
 * Приоритет: ручной курс (widget_lavatop_manual_rate_*) → ЦБ РФ.
 * Для RUB не вызывается — вызывать только для USD/EUR.
 */
async function getRubForOne(
  ctx: app.Ctx,
  currency: 'USD' | 'EUR'
): Promise<
  { ok: true; rate: number; source: 'manual' | 'cbr' } | { ok: false; code: 'RATE_UNAVAILABLE' }
> {
  // Ручной курс (из настроек)
  const manualRate = await getLavatopManualRate(ctx, currency)
  if (manualRate !== null) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] getRubForOne: manual`,
      payload: { currency, rate: manualRate, source: 'manual' }
    })
    return { ok: true, rate: manualRate, source: 'manual' }
  }

  // Курс ЦБ РФ
  let cbrBody: Record<string, unknown>
  try {
    const response = await request({
      url: CBR_URL,
      method: 'get',
      responseType: 'json',
      throwHttpErrors: false,
      timeout: 15000
    })
    if (response.statusCode !== 200) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_MODULE}] getRubForOne: CBR HTTP error`,
        payload: { currency, statusCode: response.statusCode }
      })
      return { ok: false, code: 'RATE_UNAVAILABLE' }
    }
    cbrBody = (response.body ?? {}) as Record<string, unknown>
  } catch {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] getRubForOne: CBR request exception`,
      payload: { currency }
    })
    return { ok: false, code: 'RATE_UNAVAILABLE' }
  }

  // Извлечение Valute[currency].Value / Nominal
  const valute = (cbrBody.Valute ?? {}) as Record<string, Record<string, unknown>>
  const item = valute[currency]
  if (!item) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] getRubForOne: CBR currency not found`,
      payload: { currency }
    })
    return { ok: false, code: 'RATE_UNAVAILABLE' }
  }
  const value = Number(item.Value)
  const nominal = Number(item.Nominal ?? 1)
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(nominal) || nominal <= 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] getRubForOne: CBR invalid value/nominal`,
      payload: { currency, value, nominal }
    })
    return { ok: false, code: 'RATE_UNAVAILABLE' }
  }
  const rubForOne = value / nominal
  return { ok: true, rate: rubForOne, source: 'cbr' }
}

/**
 * Конвертирует сумму в рублях в целевую валюту.
 */
export async function convertRubTo(
  ctx: app.Ctx,
  params: { amountRub: number; currency: PaymentCurrency }
): Promise<ConvertResult> {
  const { amountRub, currency } = params

  // RUB → identity, без конвертации
  if (currency === 'RUB') {
    const amount = roundToCents(amountRub)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] convertRubTo: identity`,
      payload: { amountRub, currency, rate: 1, source: 'identity', amount }
    })
    return { ok: true, amount, rate: 1, source: 'identity' }
  }

  const rateRes = await getRubForOne(ctx, currency)
  if (!rateRes.ok) {
    return { ok: false, code: 'RATE_UNAVAILABLE' }
  }

  // ДЕЛЕНИЕ: amountRub / rate — конвертация рублей в иностранную валюту
  const amount = roundToCents(amountRub / rateRes.rate)
  if (!Number.isFinite(amount) || amount <= 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] convertRubTo: conversion produced invalid amount`,
      payload: { amountRub, currency, rate: rateRes.rate, source: rateRes.source, amount }
    })
    return { ok: false, code: 'RATE_UNAVAILABLE' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] convertRubTo: ${rateRes.source}`,
    payload: { amountRub, currency, rate: rateRes.rate, source: rateRes.source, amount }
  })
  return { ok: true, amount, rate: rateRes.rate, source: rateRes.source }
}

/**
 * Конвертирует сумму в иностранной валюте в рубли (обратное к convertRubTo).
 * RUB → identity. USD/EUR → amountRub = amount * rubForOne (УМНОЖЕНИЕ).
 * Источник курса: ручной (widget_lavatop_manual_rate_* — единственный источник
 * ручных курсов в проекте, общий для виджетов) → ЦБ РФ.
 */
export async function convertToRub(
  ctx: app.Ctx,
  params: { amount: number; currency: PaymentCurrency }
): Promise<ConvertToRubResult> {
  const { amount, currency } = params

  // RUB → identity, без конвертации
  if (currency === 'RUB') {
    const amountRub = roundToCents(amount)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] convertToRub: identity`,
      payload: { amount, currency, rate: 1, source: 'identity', amountRub }
    })
    return { ok: true, amountRub, rate: 1, source: 'identity' }
  }

  const rateRes = await getRubForOne(ctx, currency)
  if (!rateRes.ok) {
    return { ok: false, code: 'RATE_UNAVAILABLE' }
  }

  // УМНОЖЕНИЕ: amount * rate — конвертация иностранной валюты в рубли
  const amountRub = roundToCents(amount * rateRes.rate)
  if (!Number.isFinite(amountRub) || amountRub <= 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] convertToRub: conversion produced invalid amountRub`,
      payload: { amount, currency, rate: rateRes.rate, source: rateRes.source, amountRub }
    })
    return { ok: false, code: 'RATE_UNAVAILABLE' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] convertToRub: ${rateRes.source}`,
    payload: { amount, currency, rate: rateRes.rate, source: rateRes.source, amountRub }
  })
  return { ok: true, amountRub, rate: rateRes.rate, source: rateRes.source }
}

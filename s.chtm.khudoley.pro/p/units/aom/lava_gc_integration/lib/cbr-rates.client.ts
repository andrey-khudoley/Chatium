import { request } from '@app/request'
import type { LavaCurrency } from './lava-types'
import * as loggerLib from './logger.lib'

const LOG_MODULE = 'lib/cbr-rates.client'
const CBR_DAILY_JSON_URL = 'https://www.cbr-xml-daily.ru/daily_json.js'

type CbrValuteItem = {
  CharCode?: string
  Value?: number
  Nominal?: number
}

type CbrDailyJsonResponse = {
  Date?: string
  PreviousDate?: string
  Valute?: Record<string, CbrValuteItem>
}

function roundToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function getCurrencyRateRubForOne(
  payload: CbrDailyJsonResponse,
  currency: Extract<LavaCurrency, 'USD' | 'EUR'>
): number | null {
  const valute = payload.Valute ?? {}
  const item = Object.values(valute).find((x) => x?.CharCode === currency)
  if (!item) return null

  const value = Number(item.Value)
  const nominal = Number(item.Nominal ?? 1)
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(nominal) || nominal <= 0) {
    return null
  }
  return value / nominal
}

export async function convertRubToCurrency(
  ctx: app.Ctx,
  params: { amountRub: number; currency: Extract<LavaCurrency, 'USD' | 'EUR'> }
): Promise<{ amount: number; source: string; rateRubForOne: number }> {
  const response = await request({
    url: CBR_DAILY_JSON_URL,
    method: 'get',
    responseType: 'json',
    throwHttpErrors: false,
    timeout: 15000
  })

  if (response.statusCode !== 200) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] convertRubToCurrency: ошибка HTTP при чтении курсов`,
      payload: { statusCode: response.statusCode, url: CBR_DAILY_JSON_URL }
    })
    throw new Error(`CBR rates request failed with HTTP ${response.statusCode}`)
  }

  const body = response.body as CbrDailyJsonResponse
  const rateRubForOne = getCurrencyRateRubForOne(body, params.currency)
  if (!rateRubForOne) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] convertRubToCurrency: не найден курс валюты`,
      payload: { currency: params.currency, hasValute: Boolean(body?.Valute) }
    })
    throw new Error(`CBR rates payload does not contain rate for ${params.currency}`)
  }

  const convertedAmount = roundToCents(params.amountRub / rateRubForOne)
  if (!Number.isFinite(convertedAmount) || convertedAmount <= 0) {
    throw new Error(`CBR conversion produced invalid amount: ${convertedAmount}`)
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] convertRubToCurrency: конвертация выполнена`,
    payload: {
      amountRub: params.amountRub,
      currency: params.currency,
      rateRubForOne,
      convertedAmount
    }
  })

  return {
    amount: convertedAmount,
    source: CBR_DAILY_JSON_URL,
    rateRubForOne
  }
}

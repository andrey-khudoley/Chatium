import { requireAnyUser } from '@app/auth'
import {
  buildLavaOfferAmountOutOfRangeMessage,
  getLavaOfferAmountLimits,
  isAmountWithinLavaOfferLimits,
  LAVA_OFFER_AMOUNT_LIMITS
} from '../../../lib/lava-amount-limits.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/lava-amount-limits-unit'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/lava-amount-limits-unit — лимиты суммы оффера Lava (без сети).
 */
export const lavaAmountLimitsUnitTestRoute = app.get('/', async (ctx) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Юнит: lava-amount-limits`,
    payload: {}
  })

  const results: TestResult[] = []

  const check = (id: string, title: string, passed: boolean) => {
    results.push({ id, title, passed })
  }

  check(
    'eur_limits_from_lava_error',
    'EUR: диапазон 5…10000 (как в HTTP 400 Lava)',
    LAVA_OFFER_AMOUNT_LIMITS.EUR.min === 5 && LAVA_OFFER_AMOUNT_LIMITS.EUR.max === 10000
  )

  check('eur_below_min', 'EUR: 4.99 < min', !isAmountWithinLavaOfferLimits(4.99, 'EUR'))
  check('eur_at_min', 'EUR: 5 OK', isAmountWithinLavaOfferLimits(5, 'EUR'))
  check('eur_at_max', 'EUR: 10000 OK', isAmountWithinLavaOfferLimits(10000, 'EUR'))
  check('eur_above_max', 'EUR: 10000.01 > max', !isAmountWithinLavaOfferLimits(10000.01, 'EUR'))

  check('usd_symmetric', 'USD: те же границы, что EUR', getLavaOfferAmountLimits('USD').min === 5)

  check('rub_below_min', 'RUB: 49 < 50', !isAmountWithinLavaOfferLimits(49, 'RUB'))
  check('rub_at_min', 'RUB: 50 OK', isAmountWithinLavaOfferLimits(50, 'RUB'))

  const msgRub = buildLavaOfferAmountOutOfRangeMessage({
    currency: 'RUB',
    effectiveAmount: 49,
    min: 50,
    max: 100
  })
  check('message_rub_nonempty', 'Текст для RUB непустой', msgRub.length > 20)

  const msgEur = buildLavaOfferAmountOutOfRangeMessage({
    currency: 'EUR',
    effectiveAmount: 1.07,
    min: 5,
    max: 10000,
    sourceAmountRub: 100
  })
  check(
    'message_eur_contains_parts',
    'Текст для EUR содержит суммы и RUB',
    msgEur.includes('1.07') && msgEur.includes('100') && msgEur.includes('EUR')
  )

  return { success: true, test: 'lava-amount-limits-unit', results, at: Date.now() }
})

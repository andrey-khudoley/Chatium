/**
 * Кэш суммы GC-заказа для config-эндпоинта (доступность виджетов).
 *
 * Функции работают с таблицей `GcDealCache` (createOrUpdateBy по dealId).
 *
 * Известные ограничения:
 * - Гонка при параллельных запросах с одним dealId возможна (два resolve вместо одного),
 *   но безвредна для корректности — кэш не источник истины.
 *   runWithExclusiveLock сознательно НЕ используется: lock на публичном
 *   высокочастотном эндпоинте дал бы contention без выгоды.
 */

import { GcDealCache } from '../../tables/gcDealCache.table'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/gateway/gcDealCache'

/** Время жизни записи кэша в миллисекундах. */
const GC_DEAL_CACHE_TTL_MS = 60_000

/**
 * Возвращает закэшированную сумму GC-заказа, если запись актуальна (TTL не истёк).
 * При любой ошибке возвращает null (кэш необязателен — fail-open).
 *
 * @param ctx — платформенный контекст
 * @param dealIdNormalized — нормализованный dealId (строка числа без пробелов)
 * @returns сумма заказа или null при промахе/ошибке
 */
export async function getCachedGcDealAmount(
  ctx: app.Ctx,
  dealIdNormalized: string
): Promise<number | null> {
  try {
    const hit = await GcDealCache.findOneBy(ctx, { dealId: dealIdNormalized })

    // Один замер времени — исключаем пограничный случай, когда TTL истекает
    // между двумя независимыми вызовами Date.now().
    const age = hit ? Date.now() - hit.cachedAt : 0
    if (hit && age < GC_DEAL_CACHE_TTL_MS) {
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 7,
          message: 'gcDealCache hit',
          payload: { dealId: dealIdNormalized, age }
        })
      } catch {
        // глотаем
      }
      return hit.amount
    }

    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: 'gcDealCache miss',
        payload: { dealId: dealIdNormalized, reason: hit ? 'expired' : 'no_entry' }
      })
    } catch {
      // глотаем
    }

    if (!hit) return null

    // Запись протухла — удаляем при чтении (без отдельной джобы).
    try {
      await GcDealCache.delete(ctx, hit.id)
    } catch (delErr) {
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_MODULE}] getCachedGcDealAmount: delete_stale_error`,
          payload: { dealId: dealIdNormalized, error: String(delErr) }
        })
      } catch {
        // глотаем
      }
    }
    return null
  } catch (err) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_MODULE}] getCachedGcDealAmount: error`,
        payload: { dealId: dealIdNormalized, error: String(err) }
      })
    } catch {
      // глотаем
    }
    return null
  }
}

/**
 * Записывает сумму GC-заказа в кэш. При ошибке — только логирует, не бросает.
 *
 * @param ctx — платформенный контекст
 * @param dealIdNormalized — нормализованный dealId (строка числа без пробелов)
 * @param amount — рублёвый эквивалент (RUB; для USD/EUR — конвертированный)
 */
export async function setCachedGcDealAmount(
  ctx: app.Ctx,
  dealIdNormalized: string,
  amount: number
): Promise<void> {
  try {
    await GcDealCache.createOrUpdateBy(ctx, 'dealId', {
      dealId: dealIdNormalized,
      cachedAt: Date.now(),
      amount
    })
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: 'gcDealCache set',
        payload: { dealId: dealIdNormalized }
      })
    } catch {
      // глотаем
    }
  } catch (err) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_MODULE}] setCachedGcDealAmount: error`,
        payload: { dealId: dealIdNormalized, error: String(err) }
      })
    } catch {
      // глотаем
    }
  }
}

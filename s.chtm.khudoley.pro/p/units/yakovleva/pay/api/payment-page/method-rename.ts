// @shared-route
/**
 * `POST /api/payment-page/method-rename` — переименование кастомного метода оплаты.
 *
 * Body: `{ oldMethodKey: string, newMethodKey: string }`.
 * Системные методы (isSystem=true) переименовать нельзя — FAIL-CLOSED на сервере.
 * Дубликат newMethodKey → явная ошибка.
 *
 * Под runWithExclusiveLock — защита от гонок при параллельных переименованиях.
 * In-place update (rowId сохраняется, осиротевших строк нет).
 *
 * Доступ — guardInternalApi. Помечен // @shared-route для .run() из Vue.
 */

import { runWithExclusiveLock } from '@app/sync'
import * as loggerLib from '../../lib/logger.lib'
import * as repo from '../../repos/paymentPageMethods.repo'
import { guardInternalApi } from '../../lib/access/apiGuard'
import { isValidMethodId, parsePaymentPageMethodRecord } from '../../shared/paymentPageTypes'

const LOG_PATH = 'api/payment-page/method-rename'

export const paymentPageMethodRenameRoute = app.post('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const body = req.body as { oldMethodKey?: unknown; newMethodKey?: unknown }
  const oldMethodKey = typeof body?.oldMethodKey === 'string' ? body.oldMethodKey.trim() : ''
  const newMethodKey = typeof body?.newMethodKey === 'string' ? body.newMethodKey.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { oldMethodKey, newMethodKey }
  })

  // Валидация
  if (!oldMethodKey) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] validation_failed oldMethodKey_empty`,
      payload: {}
    })
    return { success: false, error: 'oldMethodKey не может быть пустым' }
  }

  if (!isValidMethodId(newMethodKey)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] validation_failed newMethodKey`,
      payload: { newMethodKey }
    })
    return {
      success: false,
      error: 'id должен начинаться с буквы и содержать только буквы, цифры, дефисы и подчёркивания'
    }
  }

  if (oldMethodKey === newMethodKey) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] validation_failed same_key`,
      payload: { oldMethodKey }
    })
    return { success: false, error: 'Новый id совпадает со старым' }
  }

  try {
    let result: 'ok' | 'not_found' | 'system' | 'duplicate' = 'not_found'

    await runWithExclusiveLock(ctx, 'yakovleva-pay:pp-method-write', async () => {
      result = await repo.renameMethodKey(ctx, oldMethodKey, newMethodKey)
    })

    if (result === 'not_found') {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] not_found`,
        payload: { oldMethodKey }
      })
      return { success: false, error: 'Метод не найден' }
    }

    if (result === 'system') {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] system_forbidden`,
        payload: { oldMethodKey }
      })
      return { success: false, error: 'Системный метод нельзя переименовать' }
    }

    if (result === 'duplicate') {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] duplicate`,
        payload: { newMethodKey }
      })
      return { success: false, error: 'Метод с таким id уже существует' }
    }

    // result === 'ok': читаем обновлённую строку и нормализуем
    const row = await repo.getByMethodKey(ctx, newMethodKey)
    if (!row) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] renamed_row_missing`,
        payload: { newMethodKey }
      })
      return { success: false, error: 'Ошибка: метод переименован, но не найден при чтении' }
    }

    const method = parsePaymentPageMethodRecord({
      methodKey: row.methodKey,
      name: row.name,
      resolver: { type: row.resolverType, value: row.resolverValue },
      enabled: row.enabled,
      hideOnPartialPayment:
        typeof row.hideOnPartialPayment === 'boolean' ? row.hideOnPartialPayment : undefined,
      hideOnTopUpPayment:
        typeof row.hideOnTopUpPayment === 'boolean' ? row.hideOnTopUpPayment : undefined,
      isSystem: row.isSystem,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount,
      imageUrl: row.imageUrl,
      label: row.label,
      caption: row.caption ?? '',
      section: row.section,
      order: row.order,
      offerListType: row.offerListType,
      offers: row.offers ?? [],
      customScript: row.customScript ?? '',
      menuItems: row.menuItems ?? []
    })

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] success`,
      payload: { oldMethodKey, newMethodKey }
    })

    return { success: true, method }
  } catch (error) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] error`,
        payload: { oldMethodKey, newMethodKey, error: String(error) }
      })
    } catch {
      /* fail-open */
    }
    return { success: false, error: String(error) }
  }
})

export default paymentPageMethodRenameRoute

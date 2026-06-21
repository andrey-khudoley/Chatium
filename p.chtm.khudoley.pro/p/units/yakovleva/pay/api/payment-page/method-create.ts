// @shared-route
/**
 * `POST /api/payment-page/method-create` — создание кастомного метода оплаты.
 *
 * Body: `{ name, id, section, order? }`.
 * Валидация: id — isValidMethodId (начинается с буквы, [A-Za-z0-9_-], до 64 символов);
 * section — допустимая PaymentPageSection; name — непустая строка.
 *
 * Под runWithExclusiveLock — защита от гонок при параллельном создании.
 * Дубликат id → явная ошибка (не генерируем суффикс, id задаёт оператор явно).
 *
 * Доступ — guardInternalApi. Помечен // @shared-route для .run() из Vue.
 */

import { runWithExclusiveLock } from '@app/sync'
import * as loggerLib from '../../lib/logger.lib'
import * as repo from '../../repos/paymentPageMethods.repo'
import { guardInternalApi } from '../../lib/access/apiGuard'
import {
  isPaymentPageSection,
  isValidMethodId,
  parsePaymentPageMethodRecord
} from '../../shared/paymentPageTypes'

const LOG_PATH = 'api/payment-page/method-create'

export const paymentPageMethodCreateRoute = app.post('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const body = req.body as {
    name?: unknown
    id?: unknown
    section?: unknown
    order?: unknown
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  const section = body?.section
  // Порядок внутри секции вычисляет клиент (конец секции = max+1). Если не передан
  // или невалиден — 0; тогда метод встанет в начало секции до первого bulk-save.
  const order =
    typeof body?.order === 'number' && Number.isFinite(body.order) && body.order >= 0
      ? Math.floor(body.order)
      : 0

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { name, id, section, order }
  })

  // Валидация id
  if (!isValidMethodId(id)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] validation_failed id`,
      payload: { id }
    })
    return {
      success: false,
      error: 'id должен начинаться с буквы и содержать только буквы, цифры, дефисы и подчёркивания'
    }
  }

  if (!isPaymentPageSection(section)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] validation_failed section`,
      payload: { section }
    })
    return { success: false, error: 'Недопустимое значение section' }
  }

  if (!name) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] validation_failed name_empty`,
      payload: {}
    })
    return { success: false, error: 'name не может быть пустым' }
  }

  try {
    let createdRow
    await runWithExclusiveLock(ctx, 'yakovleva-pay:pp-method-write', async () => {
      // Проверяем коллизию id под локом
      const existing = await repo.getByMethodKey(ctx, id)
      if (existing) {
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_PATH}] id_duplicate`,
          payload: { id }
        })
        // Сигнализируем через специальный маркер
        createdRow = null
        return
      }

      createdRow = await repo.create(ctx, {
        methodKey: id,
        resolverType: 'id',
        resolverValue: id,
        name,
        section: section as string,
        label: '',
        caption: '',
        imageUrl: '',
        offerListType: 'off',
        order,
        minAmount: 0,
        maxAmount: 0,
        enabled: true,
        hideOnPartialPayment: false,
        hideOnTopUpPayment: false,
        isSystem: false,
        offers: [],
        customScript: '',
        menuItems: [],
        interactionMode: 'standard'
      })

      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] created`,
        payload: { id, section }
      })
    })

    // createdRow === null означает коллизию id (установлено внутри лока)
    if (createdRow === null) {
      return { success: false, error: 'Метод с таким id уже существует' }
    }

    if (!createdRow) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] create_row_missing`,
        payload: { reason: 'createdRow_is_undefined' }
      })
      return { success: false, error: 'Ошибка создания метода' }
    }

    // Нормализуем в PaymentPageMethodRecord для ответа
    const row = createdRow as Awaited<ReturnType<typeof repo.create>>
    const record = parsePaymentPageMethodRecord({
      methodKey: row.methodKey,
      name: row.name,
      resolver: { type: row.resolverType, value: row.resolverValue },
      enabled: row.enabled,
      hideOnPartialPayment:
        typeof row.hideOnPartialPayment === 'boolean' ? row.hideOnPartialPayment : false,
      hideOnTopUpPayment:
        typeof row.hideOnTopUpPayment === 'boolean' ? row.hideOnTopUpPayment : false,
      isSystem: row.isSystem,
      minAmount: row.minAmount,
      maxAmount: row.maxAmount,
      imageUrl: row.imageUrl,
      label: row.label,
      section: row.section,
      order: row.order,
      offerListType: row.offerListType,
      offers: row.offers ?? [],
      customScript: row.customScript ?? '',
      menuItems: row.menuItems ?? [],
      interactionMode: 'standard'
    })

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] success`,
      payload: { methodKey: record.methodKey }
    })

    return { success: true, method: record }
  } catch (error) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] error`,
        payload: { error: String(error) }
      })
    } catch {
      /* fail-open */
    }
    return { success: false, error: String(error) }
  }
})

export default paymentPageMethodCreateRoute

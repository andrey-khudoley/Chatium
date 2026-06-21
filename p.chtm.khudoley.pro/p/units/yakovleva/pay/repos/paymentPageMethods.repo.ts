/**
 * Репозиторий методов страницы оплаты (payment-page dealPay).
 *
 * Слой работы с БД: только Heap-операции, без бизнес-логики.
 * Методов < 1000 — используем findAll без пагинации.
 */

import { PaymentPageMethods } from '../tables/paymentPageMethods.table'
import type { PaymentPageMethodRow } from '../tables/paymentPageMethods.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/paymentPageMethods.repo'

export type PaymentPageMethodCreatePayload = {
  methodKey: string
  resolverType: string
  resolverValue: string
  name: string
  section: string
  label: string
  caption: string
  imageUrl: string
  offerListType: string
  order: number
  minAmount: number
  maxAmount: number
  enabled: boolean
  hideOnPartialPayment: boolean
  hideOnTopUpPayment: boolean
  isSystem: boolean
  offers?: unknown
  customScript: string
  menuItems?: unknown
  interactionMode?: string
}

/** Все записи методов (методов < 1000 — findAll без пагинации). */
export async function list(ctx: app.Ctx): Promise<PaymentPageMethodRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] list entry`,
    payload: {}
  })
  const rows = await PaymentPageMethods.findAll(ctx, {
    order: [{ order: 'asc' }]
  })

  // Защита от рассинхрона: methodKey должен быть уникальным, но БД его не гарантирует
  // (обычное Heap.String-поле). Если под сбоем лока возникли дубликаты — findOneBy
  // вернёт лишь одну строку, вторая станет «осиротевшей». Детектируем здесь (rows уже
  // в руках — без лишних запросов) и логируем как ошибку для ручного разбора.
  const seenKeys = new Set<string>()
  const duplicateKeys: string[] = []
  for (const r of rows) {
    if (seenKeys.has(r.methodKey)) {
      duplicateKeys.push(r.methodKey)
    } else {
      seenKeys.add(r.methodKey)
    }
  }
  if (duplicateKeys.length > 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] list warn: duplicate methodKey detected`,
      payload: { duplicateKeys }
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] list exit`,
    payload: { count: rows.length }
  })
  return rows
}

/** Найти запись по бизнес-ключу метода. */
export async function getByMethodKey(
  ctx: app.Ctx,
  methodKey: string
): Promise<PaymentPageMethodRow | null> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getByMethodKey entry`,
    payload: { methodKey }
  })
  const row = await PaymentPageMethods.findOneBy(ctx, { methodKey })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getByMethodKey exit`,
    payload: { methodKey, found: !!row }
  })
  return row
}

/** Общее количество записей. */
export async function countAll(ctx: app.Ctx): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countAll entry`,
    payload: {}
  })
  const count = await PaymentPageMethods.countBy(ctx, {})
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countAll exit`,
    payload: { count }
  })
  return count
}

/** Количество системных записей (isSystem=true) — для seed fast-path по покрытию набора. */
export async function countSystem(ctx: app.Ctx): Promise<number> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countSystem entry`,
    payload: {}
  })
  const count = await PaymentPageMethods.countBy(ctx, { isSystem: true })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] countSystem exit`,
    payload: { count }
  })
  return count
}

/** Создать новую запись метода. */
export async function create(
  ctx: app.Ctx,
  data: PaymentPageMethodCreatePayload
): Promise<PaymentPageMethodRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    payload: { methodKey: data.methodKey, isSystem: data.isSystem }
  })
  const row = await PaymentPageMethods.create(ctx, {
    methodKey: data.methodKey,
    resolverType: data.resolverType,
    resolverValue: data.resolverValue,
    name: data.name,
    section: data.section,
    label: data.label,
    caption: data.caption,
    imageUrl: data.imageUrl,
    offerListType: data.offerListType,
    order: data.order,
    minAmount: data.minAmount,
    maxAmount: data.maxAmount,
    enabled: data.enabled,
    hideOnPartialPayment: data.hideOnPartialPayment,
    hideOnTopUpPayment: data.hideOnTopUpPayment,
    isSystem: data.isSystem,
    offers: data.offers ?? undefined,
    customScript: data.customScript,
    menuItems: data.menuItems ?? undefined,
    interactionMode: data.interactionMode ?? 'standard'
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { methodKey: data.methodKey, rowId: row.id }
  })
  return row
}

/**
 * Переименовать methodKey существующей записи (in-place update, rowId сохраняется).
 * Системные методы переименовывать нельзя.
 * Возвращает: 'ok' | 'not_found' | 'system' | 'duplicate'.
 */
export async function renameMethodKey(
  ctx: app.Ctx,
  oldMethodKey: string,
  newMethodKey: string
): Promise<'ok' | 'not_found' | 'system' | 'duplicate'> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] renameMethodKey entry`,
    payload: { oldMethodKey, newMethodKey }
  })

  const row = await PaymentPageMethods.findOneBy(ctx, { methodKey: oldMethodKey })
  if (!row) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] renameMethodKey not_found`,
      payload: { oldMethodKey }
    })
    return 'not_found'
  }

  if (row.isSystem === true) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] renameMethodKey system_forbidden`,
      payload: { oldMethodKey }
    })
    return 'system'
  }

  const existing = await PaymentPageMethods.findOneBy(ctx, { methodKey: newMethodKey })
  if (existing) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] renameMethodKey duplicate`,
      payload: { newMethodKey }
    })
    return 'duplicate'
  }

  // Обновляем поле methodKey ВНУТРИ строки (rowId сохраняется, осиротевших строк нет).
  // resolverValue тоже обновляем на newMethodKey — он использовался как id в DOM.
  // resolverType не трогаем.
  await PaymentPageMethods.update(ctx, {
    id: row.id,
    methodKey: newMethodKey,
    resolverValue: newMethodKey
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] renameMethodKey exit`,
    payload: { oldMethodKey, newMethodKey, rowId: row.id }
  })
  return 'ok'
}

/**
 * Обновить существующую запись по methodKey.
 * Возвращает true если строка найдена и обновлена, false если не найдена.
 */
export async function updateByMethodKey(
  ctx: app.Ctx,
  methodKey: string,
  patch: Partial<Omit<PaymentPageMethodCreatePayload, 'methodKey' | 'isSystem'>>
): Promise<boolean> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] updateByMethodKey entry`,
    payload: { methodKey }
  })
  const row = await PaymentPageMethods.findOneBy(ctx, { methodKey })
  if (!row) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] updateByMethodKey warn: row not found`,
      payload: { methodKey }
    })
    return false
  }
  await PaymentPageMethods.update(ctx, { id: row.id, ...patch })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] updateByMethodKey exit`,
    payload: { methodKey, rowId: row.id }
  })
  return true
}

/**
 * Удалить запись(и) по methodKey. Guard isSystem — НЕ здесь (в API-обработчике).
 * Удаляет ВСЕ строки с данным methodKey: если под сбоем лока возникли дубликаты,
 * `findOneBy` оставил бы «осиротевшую» строку, которую нельзя убрать из UI. Здесь
 * чистим все совпадения разом. Возвращает true если хотя бы одна строка удалена.
 */
export async function deleteByMethodKey(ctx: app.Ctx, methodKey: string): Promise<boolean> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] deleteByMethodKey entry`,
    payload: { methodKey }
  })
  const rows = await PaymentPageMethods.findAll(ctx, { where: { methodKey } })
  if (rows.length === 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] deleteByMethodKey not found`,
      payload: { methodKey }
    })
    return false
  }
  if (rows.length > 1) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] deleteByMethodKey warn: duplicate methodKey, removing all`,
      payload: { methodKey, count: rows.length }
    })
  }
  for (const row of rows) {
    await PaymentPageMethods.delete(ctx, row.id)
  }
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] deleteByMethodKey exit`,
    payload: { methodKey, deleted: rows.length }
  })
  return true
}

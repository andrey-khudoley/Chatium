/**
 * Серверные геттеры конфигурации страницы оплаты.
 *
 * Читает настройки из таблицы `settings` (general) и таблицы `PaymentPageMethods` (methods).
 * При сбое чтения — пробрасывает исключение (вызывающий код в index.tsx обрабатывает его
 * graceful-дефолтом).
 *
 * По образцу lib/widget/widgetSettings.lib.ts: не логируем значения настроек,
 * только entry/error при сбое.
 */

import * as settingsLib from '../settings.lib'
import * as loggerLib from '../logger.lib'
import * as repo from '../../repos/paymentPageMethods.repo'
import { ensureSeeded } from './paymentPageMethodSeed'
import {
  parsePaymentPageGeneral,
  parsePaymentPageMethodRecord,
  PAYMENT_PAGE_SECTIONS,
  PAYMENT_PAGE_DEFAULT_SECTIONS,
  type PaymentPageGeneralConfig,
  type PaymentPageMethodRecord
} from '../../shared/paymentPageTypes'

const LOG_MODULE = 'lib/paymentPage/paymentPageSettings.lib'

/**
 * Читает и возвращает общие настройки страницы оплаты.
 * При отсутствии записи в Heap — возвращает дефолты через parsePaymentPageGeneral.
 */
export async function getPaymentPageGeneral(ctx: app.Ctx): Promise<PaymentPageGeneralConfig> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getPaymentPageGeneral entry`,
    payload: {}
  })
  const raw = await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.PAYMENT_PAGE_GENERAL)
  return parsePaymentPageGeneral(raw)
}

/**
 * Читает и возвращает список записей методов оплаты из таблицы PaymentPageMethods.
 * Сортирует по: индекс секции → order → createdAt.
 *
 * `opts.seed` (по умолчанию true) — гарантировать наличие системных записей через
 * ensureSeeded перед чтением. Админские пути (SSR панели, settings-get) сидируют;
 * публичный анонимный config.ts передаёт `seed:false`, чтобы НЕ триггерить запись
 * в БД под write-локом в горячем пути покупателя (сид делает админ при заходе).
 */
export async function getPaymentPageMethods(
  ctx: app.Ctx,
  opts?: { seed?: boolean }
): Promise<PaymentPageMethodRecord[]> {
  const shouldSeed = opts?.seed !== false
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getPaymentPageMethods entry`,
    payload: { seed: shouldSeed }
  })

  if (shouldSeed) {
    await ensureSeeded(ctx)
  }

  const rows = await repo.list(ctx)

  // Строим индекс секций для сортировки
  const sectionIndex: Record<string, number> = {}
  PAYMENT_PAGE_SECTIONS.forEach((sec, idx) => {
    sectionIndex[sec] = idx
  })

  const records: PaymentPageMethodRecord[] = rows.map((row) => {
    return parsePaymentPageMethodRecord({
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
      menuItems: row.menuItems ?? [],
      interactionMode: row.interactionMode
    })
  })

  // Индекс createdAt по methodKey для O(1) доступа в компараторе (избегаем O(n²) find)
  const createdAtByKey = new Map(
    rows.map((r) => [r.methodKey, r.createdAt ? String(r.createdAt) : ''])
  )

  // Сортировка: секция → order → createdAt (createdAt из Heap-строки; ISO-строка сортируется лексикографически)
  records.sort((a, b) => {
    const si = (sectionIndex[a.section] ?? 99) - (sectionIndex[b.section] ?? 99)
    if (si !== 0) return si
    const oi = a.order - b.order
    if (oi !== 0) return oi
    const ca = createdAtByKey.get(a.methodKey) ?? ''
    const cb = createdAtByKey.get(b.methodKey) ?? ''
    return ca < cb ? -1 : ca > cb ? 1 : 0
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] getPaymentPageMethods exit`,
    payload: { count: records.length }
  })

  return records
}

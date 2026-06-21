/**
 * Seed системных методов оплаты страницы оплаты (payment-page).
 *
 * При первом вызове `ensureSeeded` создаёт 29 системных записей в таблице PaymentPageMethods.
 * Уже существующие записи не трогает (правки администратора сохраняются).
 *
 * Под `runWithExclusiveLock` — защита от гонок при параллельных запросах.
 */

import { runWithExclusiveLock } from '@app/sync'
import * as repo from '../../repos/paymentPageMethods.repo'
import * as loggerLib from '../logger.lib'
import {
  PAYMENT_PAGE_METHOD_IDS,
  PAYMENT_PAGE_DEFAULT_SECTIONS,
  getDefaultHideOnPartialPayment
} from '../../shared/paymentPageTypes'

const LOG_MODULE = 'lib/paymentPage/paymentPageMethodSeed'

/** Типы для seed-константы (серверные, без импорта shared-типов — только данные). */
type SeedEntry = {
  methodKey: string
  resolverType: 'id' | 'class'
  resolverValue: string
  section: string
}

/**
 * Список 29 системных методов.
 * `sberbank-auto-acquiring-block` → резолвер type='class' (у него нет id в DOM).
 * Все остальные → type='id', value=methodKey.
 */
const SEED_ENTRIES: SeedEntry[] = PAYMENT_PAGE_METHOD_IDS.map((methodKey) => {
  if (methodKey === 'sberbank-auto-acquiring-block') {
    return {
      methodKey,
      resolverType: 'class',
      resolverValue: 'sberbank-auto-acquiring-block',
      section: PAYMENT_PAGE_DEFAULT_SECTIONS[methodKey] ?? 'pay'
    }
  }
  return {
    methodKey,
    resolverType: 'id',
    resolverValue: methodKey,
    section: PAYMENT_PAGE_DEFAULT_SECTIONS[methodKey] ?? 'pay'
  }
})

/**
 * Гарантирует наличие системных записей в таблице PaymentPageMethods.
 * Создаёт только отсутствующие — существующие не трогает.
 *
 * Fast-path: если число СИСТЕМНЫХ записей >= SEED_ENTRIES.length — пропускаем без
 * захвата лока. Считаем именно системные (isSystem=true), а не все строки: общий
 * count мог бы превысить seedLen за счёт кастомных методов, маскируя отсутствие
 * какого-то системного ключа.
 * Лок захватывается только при необходимости досеять недостающие записи.
 */
export async function ensureSeeded(ctx: app.Ctx): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] ensureSeeded entry`,
    payload: {}
  })

  const seedLen = SEED_ENTRIES.length
  const systemCount = await repo.countSystem(ctx)

  if (systemCount >= seedLen) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] seed skip, already complete`,
      payload: { systemCount }
    })
    return
  }

  await runWithExclusiveLock(ctx, 'yakovleva-pay:pp-method-write', async () => {
    // Double-check внутри лока: другой поток мог досеять пока мы ждали лок
    const existing = await repo.list(ctx)
    const existingKeys = new Set(existing.map((r) => r.methodKey))

    let created = 0
    let alreadyExist = 0

    for (const entry of SEED_ENTRIES) {
      if (existingKeys.has(entry.methodKey)) {
        alreadyExist++
        continue
      }
      await repo.create(ctx, {
        methodKey: entry.methodKey,
        resolverType: entry.resolverType,
        resolverValue: entry.resolverValue,
        name: entry.methodKey,
        section: entry.section,
        label: '',
        caption: '',
        imageUrl: '',
        offerListType: 'off',
        order: 0,
        minAmount: 0,
        maxAmount: 0,
        enabled: true,
        hideOnPartialPayment: getDefaultHideOnPartialPayment(entry.methodKey),
        hideOnTopUpPayment: false,
        isSystem: true,
        offers: [],
        customScript: '',
        menuItems: []
      })
      created++
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] ensureSeeded complete`,
      payload: { created, alreadyExist, total: seedLen }
    })
  })
}

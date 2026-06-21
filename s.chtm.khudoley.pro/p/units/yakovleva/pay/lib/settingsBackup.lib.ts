import { runWithExclusiveLock } from '@app/sync'
import * as settingsRepo from '../repos/settings.repo'
import * as paymentMethodsRepo from '../repos/paymentPageMethods.repo'
import * as settingsLib from './settings.lib'
import { getPaymentPageMethods } from './paymentPage/paymentPageSettings.lib'
import {
  parsePaymentPageMethodRecord,
  type PaymentPageMethodRecord
} from '../shared/paymentPageTypes'
import type { PaymentPageMethodCreatePayload } from '../repos/paymentPageMethods.repo'

const BACKUP_FORMAT = 'yakovleva-pay-settings'
const BACKUP_VERSION = 1
const SETTINGS_IMPORT_LOCK = 'yakovleva-pay:settings-import'
const PAYMENT_METHOD_WRITE_LOCK = 'yakovleva-pay:pp-method-write'

const ADMIN_SETTING_KEYS = new Set<string>([
  settingsLib.SETTING_KEYS.PROJECT_NAME,
  settingsLib.SETTING_KEYS.PROJECT_TITLE,
  settingsLib.SETTING_KEYS.LOG_LEVEL,
  settingsLib.SETTING_KEYS.LOGS_LIMIT,
  settingsLib.SETTING_KEYS.LOG_WEBHOOK,
  settingsLib.SETTING_KEYS.DASHBOARD_RESET_AT
])

const NON_SETTING_BACKUP_KEYS = new Set<string>([settingsLib.SETTING_KEYS.PAYMENT_PAGE_METHODS])

const PORTABLE_SETTING_KEYS = new Set<string>(
  Object.values(settingsLib.SETTING_KEYS).filter(
    (key) => !ADMIN_SETTING_KEYS.has(key) && !NON_SETTING_BACKUP_KEYS.has(key)
  )
)

const EMPTY_MEANS_DELETE_KEYS = new Set<string>([
  settingsLib.SETTING_KEYS.LP_APIKEY,
  settingsLib.SETTING_KEYS.LP_LOGIN,
  settingsLib.SETTING_KEYS.LP_WEBHOOK_TOKEN,
  settingsLib.SETTING_KEYS.LAVA_TEST_APIKEY,
  settingsLib.SETTING_KEYS.LAVA_WEBHOOK_SECRET
])

export type PortableSettingsBackup = {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  settings: Record<string, unknown>
  paymentPageMethods: PaymentPageMethodRecord[]
}

export type ImportPortableSettingsResult = {
  settingsSaved: number
  settingsDeleted: number
  settingsSkipped: number
  methodsUpserted: number
  methodsDeleted: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isPortableSettingKey(key: string): boolean {
  return PORTABLE_SETTING_KEYS.has(key)
}

function shouldDeleteInsteadOfSave(key: string, value: unknown): boolean {
  return EMPTY_MEANS_DELETE_KEYS.has(key) && typeof value === 'string' && value.trim() === ''
}

function methodToCreatePayload(record: PaymentPageMethodRecord): PaymentPageMethodCreatePayload {
  return {
    methodKey: record.methodKey,
    resolverType: record.resolver.type,
    resolverValue: record.resolver.value,
    name: record.name,
    section: record.section,
    label: record.label,
    caption: record.caption,
    imageUrl: record.imageUrl,
    offerListType: record.offerListType,
    order: record.order,
    minAmount: record.minAmount,
    maxAmount: record.maxAmount,
    enabled: record.enabled,
    hideOnPartialPayment: record.hideOnPartialPayment,
    hideOnTopUpPayment: record.hideOnTopUpPayment,
    isSystem: record.isSystem,
    offers: record.offers,
    customScript: record.customScript,
    menuItems: record.menuItems,
    interactionMode: record.interactionMode
  }
}

function methodToPatch(
  record: PaymentPageMethodRecord
): Partial<Omit<PaymentPageMethodCreatePayload, 'methodKey' | 'isSystem'>> {
  return {
    resolverType: record.resolver.type,
    resolverValue: record.resolver.value,
    name: record.name,
    section: record.section,
    label: record.label,
    caption: record.caption,
    imageUrl: record.imageUrl,
    offerListType: record.offerListType,
    order: record.order,
    minAmount: record.minAmount,
    maxAmount: record.maxAmount,
    enabled: record.enabled,
    hideOnPartialPayment: record.hideOnPartialPayment,
    hideOnTopUpPayment: record.hideOnTopUpPayment,
    offers: record.offers,
    customScript: record.customScript,
    menuItems: record.menuItems,
    interactionMode: record.interactionMode
  }
}

function parseBackup(raw: unknown): {
  settings: Record<string, unknown>
  paymentPageMethods: PaymentPageMethodRecord[] | null
} {
  if (!isRecord(raw)) throw new Error('JSON должен быть объектом экспорта настроек')
  if (raw.format !== BACKUP_FORMAT) throw new Error('Неподдерживаемый формат файла настроек')
  if (raw.version !== BACKUP_VERSION) throw new Error('Неподдерживаемая версия файла настроек')
  if (!isRecord(raw.settings)) throw new Error('В файле отсутствует объект settings')

  let paymentPageMethods: PaymentPageMethodRecord[] | null = null
  if (raw.paymentPageMethods !== undefined) {
    if (!Array.isArray(raw.paymentPageMethods)) {
      throw new Error('paymentPageMethods должен быть массивом')
    }
    const seen = new Set<string>()
    paymentPageMethods = raw.paymentPageMethods.map((item) => {
      const record = parsePaymentPageMethodRecord(item)
      if (!record.methodKey) throw new Error('paymentPageMethods содержит метод без methodKey')
      if (seen.has(record.methodKey)) {
        throw new Error(`Дублирующийся methodKey в paymentPageMethods: ${record.methodKey}`)
      }
      seen.add(record.methodKey)
      return record
    })
  }

  return { settings: raw.settings, paymentPageMethods }
}

export async function exportPortableSettings(ctx: app.Ctx): Promise<PortableSettingsBackup> {
  const allSettings = await settingsLib.getAllSettings(ctx)
  const settings: Record<string, unknown> = {}

  for (const key of Object.keys(allSettings)) {
    if (isPortableSettingKey(key)) {
      settings[key] = allSettings[key]
    }
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    paymentPageMethods: await getPaymentPageMethods(ctx)
  }
}

export async function importPortableSettings(
  ctx: app.Ctx,
  rawBackup: unknown
): Promise<ImportPortableSettingsResult> {
  const backup = parseBackup(rawBackup)
  const incomingSettings = backup.settings
  const incomingKeys = new Set(Object.keys(incomingSettings))
  const result: ImportPortableSettingsResult = {
    settingsSaved: 0,
    settingsDeleted: 0,
    settingsSkipped: 0,
    methodsUpserted: 0,
    methodsDeleted: 0
  }

  await runWithExclusiveLock(ctx, SETTINGS_IMPORT_LOCK, async () => {
    for (const key of Object.keys(incomingSettings)) {
      if (!isPortableSettingKey(key)) {
        result.settingsSkipped++
        continue
      }

      const value = incomingSettings[key]
      if (shouldDeleteInsteadOfSave(key, value)) {
        await settingsRepo.deleteByKey(ctx, key)
        result.settingsDeleted++
      } else {
        await settingsLib.setSetting(ctx, key, value)
        result.settingsSaved++
      }
    }

    for (const key of PORTABLE_SETTING_KEYS) {
      if (!incomingKeys.has(key)) {
        await settingsRepo.deleteByKey(ctx, key)
        result.settingsDeleted++
      }
    }

    if (backup.paymentPageMethods) {
      await runWithExclusiveLock(ctx, PAYMENT_METHOD_WRITE_LOCK, async () => {
        const incomingMethodKeys = new Set(backup.paymentPageMethods!.map((item) => item.methodKey))
        const currentRows = await paymentMethodsRepo.list(ctx)

        for (const record of backup.paymentPageMethods!) {
          const existing = currentRows.find((row) => row.methodKey === record.methodKey)
          if (existing) {
            await paymentMethodsRepo.updateByMethodKey(ctx, record.methodKey, methodToPatch(record))
          } else {
            await paymentMethodsRepo.create(ctx, methodToCreatePayload(record))
          }
          result.methodsUpserted++
        }

        for (const row of currentRows) {
          if (!incomingMethodKeys.has(row.methodKey)) {
            const deleted = await paymentMethodsRepo.deleteByMethodKey(ctx, row.methodKey)
            if (deleted) result.methodsDeleted++
          }
        }
      })
    }
  })

  return result
}

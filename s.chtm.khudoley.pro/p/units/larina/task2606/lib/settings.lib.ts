import * as repo from '../repos/settings.repo'
import { writeServerLog } from './logger.lib'

const LOG_MODULE = 'lib/settings.lib'

/** Ключи настроек */
export const SETTING_KEYS = {
  DIAGNOSTICS_ENABLED: 'diagnostics_enabled'
} as const

/** Значения по умолчанию */
export const DEFAULTS: Record<string, unknown> = {
  [SETTING_KEYS.DIAGNOSTICS_ENABLED]: true
}

/**
 * getSetting не логирует через writeServerLog — вызывается из isDiagnosticsEnabled,
 * которая вызывается из ingest-обработчика. Чтобы не плодить шум при каждом запросе.
 */
export async function getSetting(ctx: app.Ctx, key: string): Promise<unknown> {
  const row = await repo.findByKey(ctx, key)
  if (row && row.value !== undefined && row.value !== null) {
    return row.value
  }
  return DEFAULTS[key] ?? null
}

/**
 * Проверяет, включён ли приём диагностики.
 */
export async function isDiagnosticsEnabled(ctx: app.Ctx): Promise<boolean> {
  const value = await getSetting(ctx, SETTING_KEYS.DIAGNOSTICS_ENABLED)
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1) return true
  if (value === 'false' || value === 0) return false
  return true
}

/**
 * Сохраняет настройку. Нормализует boolean для тумблера.
 */
export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting entry`,
    payload: { key, value }
  })

  let normalized: unknown = value

  if (key === SETTING_KEYS.DIAGNOSTICS_ENABLED) {
    if (value === 'true' || value === 1 || value === true) {
      normalized = true
    } else if (value === 'false' || value === 0 || value === false) {
      normalized = false
    } else {
      normalized = Boolean(value)
    }
  }

  await writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] setSetting normalized`,
    payload: { key, normalized }
  })

  await repo.upsert(ctx, key, normalized)

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] setSetting exit`,
    payload: { key, normalized }
  })
}

/**
 * Бизнес-логика настроек и темы.
 * Вызывает repos, возвращает нормализованные значения.
 */
import * as repo from '../repos/settings.repo'

const DEFAULT_BASE_URL = 'https://d5dufuc4uj90lbcrvpac.4b4k4pg5.apigw.yandexcloud.net'
const DEFAULT_ADMIN_TOKEN = '123'

export async function getSetting(ctx: app.Ctx, key: string): Promise<unknown> {
  const row = await repo.findByKey(ctx, key)
  if (row && row.value !== undefined && row.value !== null) {
    return row.value
  }
  if (key === 'adminToken') {
    return DEFAULT_ADMIN_TOKEN
  }
  return null
}

export async function getSettingString(ctx: app.Ctx, key: string): Promise<string> {
  const value = await getSetting(ctx, key)
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  if (key === 'baseUrl') return DEFAULT_BASE_URL
  if (key === 'adminToken') return DEFAULT_ADMIN_TOKEN
  return ''
}

export async function setSetting(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await repo.upsert(ctx, key, value)
}

export type ThemeValue = 'light' | 'dark'

export async function getDefaultTheme(ctx: app.Ctx): Promise<ThemeValue> {
  const value = await getSetting(ctx, 'defaultTheme')
  if (value === 'light' || value === 'dark') {
    return value
  }
  return 'dark'
}

export async function saveDefaultTheme(ctx: app.Ctx, theme: ThemeValue): Promise<void> {
  await repo.upsert(ctx, 'defaultTheme', theme)
}

/** Настройки для доступа к внешнему API документов (baseUrl, adminToken). */
export async function getDocsApiSettings(ctx: app.Ctx): Promise<{ baseUrl: string; adminToken: string }> {
  const baseUrl = await getSettingString(ctx, 'baseUrl')
  const adminToken = await getSettingString(ctx, 'adminToken')
  return {
    baseUrl: baseUrl || DEFAULT_BASE_URL,
    adminToken: adminToken || DEFAULT_ADMIN_TOKEN
  }
}

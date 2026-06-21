// @shared-route

import { requireAccountRole } from '@app/auth'
import { ProjectSettings } from '../tables/settings.table'
import { Debug, DebugLevel } from '../shared/debug'
import {
  applyDebugLevel,
  getCachedLogLevel,
  LOG_LEVEL_SETTING_KEY,
  parseDebugLevel,
  persistLogLevel
} from '../lib/logging'
import '../lib/logs-init'

const PROJECT_NAME_SETTING_KEY = 'project_name'
const PROJECT_TITLE_SETTING_KEY = 'project_title'
const PROJECT_DESCRIPTION_SETTING_KEY = 'project_description'
const LOGS_WEBHOOK_URL_KEY = 'logs_webhook_url'
const LOGS_WEBHOOK_ENABLED_KEY = 'logs_webhook_enabled'
const SETTINGS_LIMIT = 1000
const VALID_LOG_LEVELS: DebugLevel[] = ['info', 'warn', 'error']

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

async function loadSettings(ctx: RichUgcCtx): Promise<Record<string, any>> {
  const records = await ProjectSettings.findAll(ctx, { limit: SETTINGS_LIMIT })
  const settings: Record<string, any> = {}

  for (const record of records || []) {
    if (record && typeof record.key === 'string') {
      settings[record.key] = record.value
    }
  }

  if (settings[PROJECT_NAME_SETTING_KEY] === undefined) {
    settings[PROJECT_NAME_SETTING_KEY] = ''
  }

  if (settings[PROJECT_TITLE_SETTING_KEY] === undefined) {
    settings[PROJECT_TITLE_SETTING_KEY] = ''
  }

  if (settings[PROJECT_DESCRIPTION_SETTING_KEY] === undefined) {
    settings[PROJECT_DESCRIPTION_SETTING_KEY] = ''
  }

  if (settings[LOG_LEVEL_SETTING_KEY] === undefined) {
    settings[LOG_LEVEL_SETTING_KEY] = getCachedLogLevel()
  }
  if (settings[LOGS_WEBHOOK_URL_KEY] === undefined) settings[LOGS_WEBHOOK_URL_KEY] = ''
  if (settings[LOGS_WEBHOOK_ENABLED_KEY] === undefined) settings[LOGS_WEBHOOK_ENABLED_KEY] = false

  return settings
}

/**
 * GET /api/admin-settings
 * Получение всех настроек админки
 */
export const apiGetAdminSettingsRoute = app.get('/', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/admin-settings/get')
    Debug.info(ctx, '[api/admin-settings] Начало обработки запроса на получение настроек')

    requireAccountRole(ctx, 'Admin')
    Debug.info(
      ctx,
      `[api/admin-settings] Пользователь авторизован как Admin: userId=${ctx.user?.id}`
    )

    const settings = await loadSettings(ctx)
    Debug.info(
      ctx,
      `[api/admin-settings] Настройки загружены, ключей: ${Object.keys(settings).length}`
    )

    return {
      success: true,
      settings
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/admin-settings] Ошибка при получении настроек: ${error.message}`,
      'E_GET_ADMIN_SETTINGS'
    )
    Debug.error(ctx, `[api/admin-settings] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при получении настроек'
    }
  }
})

/**
 * POST /api/admin-settings
 * Обновление настроек админки
 */
export const apiUpdateAdminSettingsRoute = app.post('/', async (ctx, req) => {
  try {
    await applyDebugLevel(ctx, 'api/admin-settings/post')
    Debug.info(ctx, '[api/admin-settings] Начало обработки запроса на обновление настроек')

    requireAccountRole(ctx, 'Admin')
    Debug.info(
      ctx,
      `[api/admin-settings] Пользователь авторизован как Admin: userId=${ctx.user?.id}`
    )

    if (!req.body || typeof req.body !== 'object') {
      Debug.warn(ctx, '[api/admin-settings] Тело запроса отсутствует или имеет неверный тип')
      return {
        success: false,
        error: 'Тело запроса отсутствует или имеет неверный тип'
      }
    }

    const body = req.body as Record<string, any>

    if ('project_name' in body) {
      if (body.project_name !== null && typeof body.project_name !== 'string') {
        Debug.warn(
          ctx,
          `[api/admin-settings] project_name должен быть строкой, получен: ${typeof body.project_name}`
        )
        return {
          success: false,
          error: 'project_name должен быть строкой'
        }
      }

      const normalized = normalizeText(body.project_name)
      await ProjectSettings.createOrUpdateBy(ctx, 'key', {
        key: PROJECT_NAME_SETTING_KEY,
        value: normalized
      })
      Debug.info(ctx, `[api/admin-settings] project_name обновлён: ${normalized || '(empty)'}`)
    }

    if ('project_title' in body) {
      if (body.project_title !== null && typeof body.project_title !== 'string') {
        Debug.warn(
          ctx,
          `[api/admin-settings] project_title должен быть строкой, получен: ${typeof body.project_title}`
        )
        return {
          success: false,
          error: 'project_title должен быть строкой'
        }
      }

      const normalized = normalizeText(body.project_title)
      await ProjectSettings.createOrUpdateBy(ctx, 'key', {
        key: PROJECT_TITLE_SETTING_KEY,
        value: normalized
      })
      Debug.info(ctx, `[api/admin-settings] project_title обновлён: ${normalized || '(empty)'}`)
    }

    if ('project_description' in body) {
      if (body.project_description !== null && typeof body.project_description !== 'string') {
        Debug.warn(
          ctx,
          `[api/admin-settings] project_description должен быть строкой, получен: ${typeof body.project_description}`
        )
        return {
          success: false,
          error: 'project_description должен быть строкой'
        }
      }

      const normalized = normalizeText(body.project_description)
      await ProjectSettings.createOrUpdateBy(ctx, 'key', {
        key: PROJECT_DESCRIPTION_SETTING_KEY,
        value: normalized
      })
      Debug.info(
        ctx,
        `[api/admin-settings] project_description обновлён: ${normalized ? 'updated' : '(empty)'}`
      )
    }

    if ('log_level' in body) {
      if (typeof body.log_level !== 'string') {
        Debug.warn(
          ctx,
          `[api/admin-settings] log_level должен быть строкой, получен: ${typeof body.log_level}`
        )
        return {
          success: false,
          error: 'log_level должен быть строкой'
        }
      }

      const level = body.log_level.toLowerCase()
      if (!VALID_LOG_LEVELS.includes(level as DebugLevel)) {
        Debug.warn(ctx, `[api/admin-settings] Недопустимый уровень логирования: ${body.log_level}`)
        return {
          success: false,
          error: `Недопустимый уровень логирования. Допустимые значения: ${VALID_LOG_LEVELS.join(', ')}`
        }
      }

      const parsedLevel = parseDebugLevel(level)
      await persistLogLevel(ctx, parsedLevel)
      Debug.info(ctx, `[api/admin-settings] log_level обновлён: ${parsedLevel}`)
    }

    if ('logs_webhook_url' in body) {
      const v = body.logs_webhook_url
      const url = v !== null && typeof v === 'string' ? v.trim() : ''
      await ProjectSettings.createOrUpdateBy(ctx, 'key', { key: LOGS_WEBHOOK_URL_KEY, value: url })
    }
    if ('logs_webhook_enabled' in body) {
      const v = body.logs_webhook_enabled
      const enabled = v === true || v === 'true'
      await ProjectSettings.createOrUpdateBy(ctx, 'key', {
        key: LOGS_WEBHOOK_ENABLED_KEY,
        value: enabled
      })
    }

    const settings = await loadSettings(ctx)
    Debug.info(ctx, '[api/admin-settings] Настройки успешно обновлены')

    return {
      success: true,
      settings
    }
  } catch (error: any) {
    Debug.error(
      ctx,
      `[api/admin-settings] Ошибка при обновлении настроек: ${error.message}`,
      'E_UPDATE_ADMIN_SETTINGS'
    )
    Debug.error(ctx, `[api/admin-settings] Stack trace: ${error.stack || 'N/A'}`)
    return {
      success: false,
      error: error.message || 'Ошибка при обновлении настроек'
    }
  }
})

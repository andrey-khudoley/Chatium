// @shared

import { ProjectSettings } from '../tables/settings.table'

export const PROJECT_NAME_SETTING_KEY = 'project_name'
export const PROJECT_TITLE_SETTING_KEY = 'project_title'
export const PROJECT_DESCRIPTION_SETTING_KEY = 'project_description'
export const LOGS_WEBHOOK_URL_SETTING_KEY = 'logs_webhook_url'
export const LOGS_WEBHOOK_ENABLED_SETTING_KEY = 'logs_webhook_enabled'
const DEFAULT_PROJECT_NAME = 'A/Ley Services'
const DEFAULT_PROJECT_TITLE = 'A/Ley Services'
const DEFAULT_PROJECT_DESCRIPTION = 'В разработке'
const SETTINGS_LIMIT = 1000

/**
 * Загружает настройки проекта из БД
 *
 * @param ctx - контекст запроса
 * @returns объект с настройками: projectName, projectTitle и projectDescription
 */
export async function loadProjectSettings(ctx: RichUgcCtx): Promise<{
  projectName: string
  projectTitle: string
  projectDescription: string
  logsWebhookUrl: string
  logsWebhookEnabled: boolean
}> {
  try {
    const records = await ProjectSettings.findAll(ctx, { limit: SETTINGS_LIMIT })
    const settings: Record<string, any> = {}

    for (const record of records || []) {
      if (record && typeof record.key === 'string') {
        settings[record.key] = record.value
      }
    }

    const projectName =
      typeof settings[PROJECT_NAME_SETTING_KEY] === 'string' &&
      settings[PROJECT_NAME_SETTING_KEY].trim()
        ? settings[PROJECT_NAME_SETTING_KEY].trim()
        : DEFAULT_PROJECT_NAME

    const projectTitle =
      typeof settings[PROJECT_TITLE_SETTING_KEY] === 'string' &&
      settings[PROJECT_TITLE_SETTING_KEY].trim()
        ? settings[PROJECT_TITLE_SETTING_KEY].trim()
        : DEFAULT_PROJECT_TITLE

    const projectDescription =
      typeof settings[PROJECT_DESCRIPTION_SETTING_KEY] === 'string' &&
      settings[PROJECT_DESCRIPTION_SETTING_KEY].trim()
        ? settings[PROJECT_DESCRIPTION_SETTING_KEY].trim()
        : DEFAULT_PROJECT_DESCRIPTION

    const logsWebhookUrl =
      typeof settings[LOGS_WEBHOOK_URL_SETTING_KEY] === 'string'
        ? settings[LOGS_WEBHOOK_URL_SETTING_KEY].trim()
        : ''
    const logsWebhookEnabled =
      settings[LOGS_WEBHOOK_ENABLED_SETTING_KEY] === true ||
      settings[LOGS_WEBHOOK_ENABLED_SETTING_KEY] === 'true'

    return {
      projectName,
      projectTitle,
      projectDescription,
      logsWebhookUrl,
      logsWebhookEnabled
    }
  } catch (error: any) {
    ctx.account.log(`[settings] Ошибка при загрузке настроек проекта: ${error.message}`)
    return {
      projectName: DEFAULT_PROJECT_NAME,
      projectTitle: DEFAULT_PROJECT_TITLE,
      projectDescription: DEFAULT_PROJECT_DESCRIPTION,
      logsWebhookUrl: '',
      logsWebhookEnabled: false
    }
  }
}

// @shared
import { AnalyticsSettings, ensureDefaultSettings } from '../tables/settings.table'

/**
 * Получение названия проекта из настроек
 * Инициализирует настройку project_name по умолчанию, если её нет
 */
export async function getProjectName(ctx: app.Ctx): Promise<string> {
  try {
    // Обеспечиваем инициализацию настроек по умолчанию
    await ensureDefaultSettings(ctx)

    const setting = await AnalyticsSettings.findOneBy(ctx, {
      key: 'project_name'
    })

    if (!setting || !setting.value) {
      throw new Error('Настройка project_name не найдена после инициализации')
    }

    return setting.value
  } catch (error) {
    // В случае ошибки повторно пытаемся инициализировать и получить значение
    try {
      await ensureDefaultSettings(ctx)
      const setting = await AnalyticsSettings.findOneBy(ctx, {
        key: 'project_name'
      })
      if (setting?.value) {
        return setting.value
      }
    } catch (retryError) {
      // Если всё равно ошибка, возвращаем пустую строку (не должно случиться)
      return ''
    }
    return ''
  }
}

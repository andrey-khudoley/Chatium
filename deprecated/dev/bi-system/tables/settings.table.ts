import { Heap } from '@app/heap'

export const AnalyticsSettings = Heap.Table('analytics_settings_a3f8b2c1', {
  key: Heap.String({
    customMeta: { title: 'Ключ настройки' }
  }),
  value: Heap.String({
    customMeta: { title: 'Значение' }
  }),
  description: Heap.String({
    customMeta: { title: 'Описание' }
  })
})

/**
 * Инициализация настроек по умолчанию
 * Создаёт настройку project_name если её ещё нет
 */
export async function ensureDefaultSettings(ctx: app.Ctx): Promise<void> {
  try {
    const existingSetting = await AnalyticsSettings.findOneBy(ctx, {
      key: 'project_name'
    })

    if (!existingSetting) {
      await AnalyticsSettings.createOrUpdateBy(ctx, 'key', {
        key: 'project_name',
        value: 'Система бизнес-аналитики',
        description: 'Название проекта для отображения в интерфейсе'
      })
    }
  } catch (error) {
    // Игнорируем ошибки при инициализации
    console.error('Failed to initialize default settings:', error)
  }
}

export default AnalyticsSettings

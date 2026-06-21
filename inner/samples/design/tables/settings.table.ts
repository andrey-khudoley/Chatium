import { Heap } from '@app/heap'

export const TgChannelAnalyticsSettings = Heap.Table('tg_channel_analytics_settings_d2c9e7f3', {
  key: Heap.String({
    customMeta: { title: 'Ключ' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  value: Heap.Any({
    customMeta: { title: 'Значение' }
  })
})

/**
 * Инициализация настроек по умолчанию
 * Создаёт настройку project_title если её ещё нет
 */
export async function ensureDefaultSettings(ctx: RichUgcCtx): Promise<void> {
  try {
    const existingSetting = await TgChannelAnalyticsSettings.findOneBy(ctx, {
      key: 'project_title'
    })

    if (!existingSetting) {
      await TgChannelAnalyticsSettings.createOrUpdateBy(ctx, 'key', {
        key: 'project_title',
        value: 'Аналитика телеграм-каналов'
      })
    }
  } catch (error) {
    console.error('Failed to initialize default settings:', error)
  }
}

export default TgChannelAnalyticsSettings

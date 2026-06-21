import { Heap } from '@app/heap'
import { Debug } from '../shared/debug'

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
 *
 * ВАЖНО: Не вызываем applyDebugLevel здесь, чтобы избежать циклической зависимости,
 * так как applyDebugLevel может вызвать ensureLogLevelRecord, который создаёт настройку log_level
 */
export async function ensureDefaultSettings(ctx: RichUgcCtx): Promise<void> {
  try {
    Debug.info(ctx, '[settings] Инициализация настроек по умолчанию')

    Debug.info(ctx, '[settings] Поиск настройки project_title')
    const existingSetting = await TgChannelAnalyticsSettings.findOneBy(ctx, {
      key: 'project_title'
    })

    if (!existingSetting) {
      Debug.info(ctx, '[settings] Настройка project_title не найдена, создаём новую')
      await TgChannelAnalyticsSettings.createOrUpdateBy(ctx, 'key', {
        key: 'project_title',
        value: 'Аналитика телеграм-каналов'
      })
      Debug.info(ctx, '[settings] Настройка project_title успешно создана')
    } else {
      Debug.info(ctx, `[settings] Настройка project_title уже существует: ${existingSetting.value}`)
    }

    Debug.info(ctx, '[settings] Инициализация настроек по умолчанию завершена')
  } catch (error: any) {
    // Используем Debug напрямую без applyDebugLevel, чтобы избежать циклической зависимости
    Debug.error(
      ctx,
      `[settings] Ошибка при инициализации настроек по умолчанию: ${error.message}`,
      'E_INIT_DEFAULT_SETTINGS'
    )
    Debug.error(ctx, `[settings] Stack trace: ${error.stack || 'N/A'}`)
  }
}

export default TgChannelAnalyticsSettings

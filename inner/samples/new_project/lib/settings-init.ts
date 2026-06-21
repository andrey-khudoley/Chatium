// @shared

import { ProjectSettings } from '../tables/settings.table'
import { Debug } from '../shared/debug'
import './logs-init'

/**
 * Инициализация настроек по умолчанию
 * Создаёт настройку log_prefix если её ещё нет
 *
 * Эта функция вынесена из файла таблицы, чтобы избежать циклических зависимостей.
 * Файл таблицы (settings.table.ts) должен содержать ТОЛЬКО определение Heap.Table.
 */
export async function ensureDefaultSettings(ctx: RichUgcCtx): Promise<void> {
  try {
    Debug.info(ctx, '[settings] Инициализация настроек по умолчанию')

    Debug.info(ctx, '[settings] Поиск настройки log_prefix')
    const existingSetting = await ProjectSettings.findOneBy(ctx, {
      key: 'log_prefix'
    })

    if (!existingSetting) {
      Debug.info(ctx, '[settings] Настройка log_prefix не найдена, создаём новую')
      await ProjectSettings.createOrUpdateBy(ctx, 'key', {
        key: 'log_prefix',
        value: '[PROJECT]'
      })
      Debug.info(ctx, '[settings] Настройка log_prefix успешно создана')
    } else {
      Debug.info(ctx, `[settings] Настройка log_prefix уже существует: ${existingSetting.value}`)
    }

    Debug.info(ctx, '[settings] Инициализация настроек по умолчанию завершена')
  } catch (error: any) {
    Debug.error(
      ctx,
      `[settings] Ошибка при инициализации настроек по умолчанию: ${error.message}`,
      'E_INIT_DEFAULT_SETTINGS'
    )
    Debug.error(ctx, `[settings] Stack trace: ${error.stack || 'N/A'}`)
  }
}

// @shared-route

import { revokeLinksJob } from './jobs/revoke-links.job'
import { batchAttributionJob } from './jobs/batch-attribution.job'
import { Debug } from './shared/debug'
import { applyDebugLevel } from './lib/logging'

/**
 * Инициализация при старте приложения
 * Запускает job'ы для отзыва ссылок и батч-матчинга один раз для первого выполнения
 *
 * Примечание: job'ы сами планируют следующие выполнения при каждом запуске,
 * поэтому здесь используется scheduleJobAsap для первого запуска,
 * что предотвращает дублирование расписаний.
 */
app.accountHook('@start', async (ctx) => {
  try {
    await applyDebugLevel(ctx, 'init')
    Debug.info(ctx, '[init] Инициализация системы аналитики ссылок')

    // Запускаем job для отзыва ссылок один раз для первого выполнения
    // Job сам будет планировать следующие выполнения
    await revokeLinksJob.scheduleJobAsap(ctx, {})

    Debug.info(ctx, '[init] Job для отзыва ссылок запущен для первого выполнения')

    // Запускаем job для батч-матчинга один раз для первого выполнения
    // Job сам будет планировать следующие выполнения (через 30-60 секунд)
    await batchAttributionJob.scheduleJobAsap(ctx, {})

    Debug.info(ctx, '[init] Job для батч-матчинга запущен для первого выполнения')
  } catch (error: any) {
    Debug.error(ctx, `[init] Ошибка инициализации job'ов: ${error.message}`, 'E_INIT_JOBS')
    Debug.error(ctx, `[init] Stack trace: ${error.stack || 'N/A'}`)
  }
})

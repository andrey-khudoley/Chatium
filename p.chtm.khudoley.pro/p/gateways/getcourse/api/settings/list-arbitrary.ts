// @shared-route
import { requireAccountRole } from '@app/auth'
import * as settingsLib from '../../lib/settings.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/settings/list-arbitrary'

/**
 * GET /api/settings/list-arbitrary — список произвольных пар «ключ — значение» в Heap
 * (manual §5.9): всё, что не входит в `KNOWN_SETTING_KEYS` (зафиксированные ключи проекта).
 *
 * Используется админкой для редактирования `gc_itest_*` и других пользовательских ключей.
 * Только Admin. Значения возвращаются как есть (для типичных id/строк): секреты в эту
 * категорию не должны попадать (manual §5.7), потому что секретные ключи — `gc_developer_api_key`
 * и `gc_test_school_api_key` — отнесены к фиксированному перечню.
 */
export const listArbitrarySettingsRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] entry`,
    payload: {}
  })

  try {
    const items = await settingsLib.listArbitrarySettings(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] ok`,
      payload: { count: items.length, keys: items.map((r) => r.key) }
    })
    return { success: true, items }
  } catch (error) {
    if (!loggerLib.isServerErrorAlreadyLogged(error)) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] error`,
        payload: { error: String(error) }
      })
    }
    return { success: false, error: String(error), items: [] }
  }
})

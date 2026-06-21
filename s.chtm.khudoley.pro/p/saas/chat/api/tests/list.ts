// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/tests/list'

/**
 * GET /api/tests/list — каталог тестов (логирование и метрики).
 */
export const listTestsRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос каталога тестов`,
    payload: {}
  })

  const categories = [
    {
      id: 'logger-lib',
      title: 'Библиотека логов',
      tests: [
        { id: 'shouldLogByLevel_Info', title: 'shouldLogByLevel (Info, 6)' },
        { id: 'shouldLogByLevel_Error', title: 'shouldLogByLevel (Error, 3)' },
        { id: 'shouldLogByLevel_Disable', title: 'shouldLogByLevel (Disable, 7)' },
        { id: 'writeServerLog', title: 'writeServerLog (no throw)' }
      ]
    },
    {
      id: 'messages-helpers',
      title: 'Хелперы сообщений (normalizeAuthorId, normalizeReactions)',
      tests: [
        { id: 'normalizeAuthorId_empty', title: 'normalizeAuthorId(undefined)' },
        { id: 'normalizeAuthorId_string', title: 'normalizeAuthorId(string)' },
        { id: 'normalizeAuthorId_object', title: 'normalizeAuthorId(object)' },
        { id: 'normalizeReactions_object', title: 'normalizeReactions(object)' },
        { id: 'normalizeReactions_string_json', title: 'normalizeReactions(string JSON)' },
        { id: 'normalizeReactions_invalid_string', title: 'normalizeReactions(invalid string)' }
      ]
    },
    {
      id: 'logging-get-level',
      title: 'API логирования: get-level',
      tests: [{ id: 'get_level_valid', title: 'get-level returns valid level' }]
    },
    {
      id: 'logging-set-level',
      title: 'API логирования: set-level',
      tests: [
        { id: 'set_level_valid', title: 'set-level(Warn) success' },
        { id: 'set_level_invalid', title: 'set-level(invalid) returns error' },
        { id: 'set_level_wrong_type', title: 'set-level(non-string) rejected' }
      ]
    },
    {
      id: 'logging-metrics',
      title: 'API логирования: метрики',
      tests: [
        { id: 'get_metrics_shape', title: 'get-metrics returns object' },
        { id: 'reset_metrics', title: 'reset-metrics and get-metrics' }
      ]
    }
  ]

  return { success: true, categories }
})

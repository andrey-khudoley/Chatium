// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { normalizeAuthorId, normalizeReactions } from '../../../lib/messages-helpers'

const LOG_PATH = 'api/tests/endpoints-check/messages-helpers'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/messages-helpers — тесты normalizeAuthorId и normalizeReactions.
 */
export const messagesHelpersTestRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки messages-helpers`,
    payload: {}
  })

  const results: TestResult[] = []

  try {
    const r1 = normalizeAuthorId(undefined)
    results.push({
      id: 'normalizeAuthorId_empty',
      title: 'normalizeAuthorId(undefined) === ""',
      passed: r1 === ''
    })
  } catch (e) {
    results.push({
      id: 'normalizeAuthorId_empty',
      title: 'normalizeAuthorId(undefined) === ""',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const r2 = normalizeAuthorId('user-123')
    results.push({
      id: 'normalizeAuthorId_string',
      title: 'normalizeAuthorId("user-123") === "user-123"',
      passed: r2 === 'user-123'
    })
  } catch (e) {
    results.push({
      id: 'normalizeAuthorId_string',
      title: 'normalizeAuthorId("user-123")',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const r3 = normalizeAuthorId({ id: 'user-456' })
    results.push({
      id: 'normalizeAuthorId_object',
      title: 'normalizeAuthorId({ id: "user-456" }) === "user-456"',
      passed: r3 === 'user-456'
    })
  } catch (e) {
    results.push({
      id: 'normalizeAuthorId_object',
      title: 'normalizeAuthorId(object)',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const msg1 = { reactions: { '👍': ['u1'] } }
    const out1 = normalizeReactions(msg1)
    results.push({
      id: 'normalizeReactions_object',
      title: 'normalizeReactions(object) returns object',
      passed:
        typeof out1 === 'object' &&
        out1 !== null &&
        !Array.isArray(out1) &&
        out1['👍'] !== undefined
    })
  } catch (e) {
    results.push({
      id: 'normalizeReactions_object',
      title: 'normalizeReactions(object)',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const msg2 = { data: { reactions: '{"👍":["u1"]}' } }
    const out2 = normalizeReactions(msg2)
    results.push({
      id: 'normalizeReactions_string_json',
      title: 'normalizeReactions(string JSON) parses',
      passed:
        typeof out2 === 'object' &&
        out2 !== null &&
        Array.isArray((out2 as Record<string, unknown>)['👍'])
    })
  } catch (e) {
    results.push({
      id: 'normalizeReactions_string_json',
      title: 'normalizeReactions(string JSON)',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const msg3 = { data: { reactions: 'invalid' } }
    const out3 = normalizeReactions(msg3)
    results.push({
      id: 'normalizeReactions_invalid_string',
      title: 'normalizeReactions(invalid string) returns {}',
      passed: typeof out3 === 'object' && out3 !== null && Object.keys(out3).length === 0
    })
  } catch (e) {
    results.push({
      id: 'normalizeReactions_invalid_string',
      title: 'normalizeReactions(invalid string)',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  return { success: true, test: 'messages-helpers', results, at: Date.now() }
})

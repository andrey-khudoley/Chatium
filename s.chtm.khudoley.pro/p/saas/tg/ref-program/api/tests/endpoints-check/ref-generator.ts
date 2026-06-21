// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import {
  generateUrlSafeId,
  generateCampaignSecret,
  generateLinkSlug
} from '../../../lib/core/refGenerator'

const LOG_PATH = 'api/tests/endpoints-check/ref-generator'

const BASE62_REGEX = /^[A-Za-z0-9]+$/

type TestResult = { id: string; title: string; passed: boolean; error?: string }

function isBase62(s: string): boolean {
  return BASE62_REGEX.test(s)
}

/**
 * GET /api/tests/endpoints-check/ref-generator — тесты lib/core/refGenerator.
 * Проверки: длина, алфавит base62, generateCampaignSecret.
 */
export const refGeneratorTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки refGenerator`,
    payload: {}
  })

  const results: TestResult[] = []

  try {
    const id = generateUrlSafeId()
    const lengthOk = id.length === 8
    const charsetOk = isBase62(id)
    results.push({
      id: 'generateUrlSafeId-default',
      title: 'generateUrlSafeId() — длина 8, base62',
      passed: lengthOk && charsetOk
    })
  } catch (e) {
    results.push({
      id: 'generateUrlSafeId-default',
      title: 'generateUrlSafeId() — длина 8, base62',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const id = generateUrlSafeId(12)
    const lengthOk = id.length === 12
    const charsetOk = isBase62(id)
    results.push({
      id: 'generateUrlSafeId-length',
      title: 'generateUrlSafeId(12) — длина 12, base62',
      passed: lengthOk && charsetOk
    })
  } catch (e) {
    results.push({
      id: 'generateUrlSafeId-length',
      title: 'generateUrlSafeId(12) — длина 12, base62',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const secret = generateCampaignSecret()
    const lengthOk = secret.length === 8
    const charsetOk = isBase62(secret)
    results.push({
      id: 'generateCampaignSecret',
      title: 'generateCampaignSecret() — длина 8, base62',
      passed: lengthOk && charsetOk
    })
  } catch (e) {
    results.push({
      id: 'generateCampaignSecret',
      title: 'generateCampaignSecret() — длина 8, base62',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const slug = generateLinkSlug()
    const lengthOk = slug.length === 10
    const charsetOk = isBase62(slug)
    results.push({
      id: 'generateLinkSlug',
      title: 'generateLinkSlug() — длина 10, base62',
      passed: lengthOk && charsetOk
    })
  } catch (e) {
    results.push({
      id: 'generateLinkSlug',
      title: 'generateLinkSlug() — длина 10, base62',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  return { success: true, test: 'ref-generator', results, at: Date.now() }
})

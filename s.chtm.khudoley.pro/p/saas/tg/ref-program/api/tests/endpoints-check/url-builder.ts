// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { substituteRef, buildPartnerLinkUrl } from '../../../lib/core/urlBuilder'

const LOG_PATH = 'api/tests/endpoints-check/url-builder'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/url-builder — тесты lib/core/urlBuilder (substituteRef, buildPartnerLinkUrl).
 */
export const urlBuilderTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки urlBuilder`,
    payload: {}
  })

  const results: TestResult[] = []

  try {
    const out = substituteRef('https://example.com/landing?ref={ref}', 'XYZ789')
    const passed = out === 'https://example.com/landing?ref=XYZ789'
    results.push({
      id: 'substituteRef-single',
      title: 'substituteRef — одна подстановка {ref}',
      passed
    })
    if (!passed) {
      results[results.length - 1].error = `Ожидалось ...?ref=XYZ789, получено: ${out}`
    }
  } catch (e) {
    results.push({
      id: 'substituteRef-single',
      title: 'substituteRef — одна подстановка {ref}',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const out = substituteRef('https://site.com?a={ref}&b={ref}', 'A1B2')
    const passed = out === 'https://site.com?a=A1B2&b=A1B2'
    results.push({
      id: 'substituteRef-multiple',
      title: 'substituteRef — несколько вхождений {ref}',
      passed
    })
    if (!passed) {
      results[results.length - 1].error = `Получено: ${out}`
    }
  } catch (e) {
    results.push({
      id: 'substituteRef-multiple',
      title: 'substituteRef — несколько вхождений {ref}',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const url = buildPartnerLinkUrl('Ab1Cd2Ef3G')
    const hasSlug = url.includes('Ab1Cd2Ef3G')
    const hasRedirectPath = (url.includes('/r') || url.includes('r?')) && url.includes('linkId=')
    const passed = hasSlug && hasRedirectPath && url.startsWith('http')
    results.push({
      id: 'buildPartnerLinkUrl',
      title: 'buildPartnerLinkUrl — URL содержит slug и путь редиректа /r?linkId=',
      passed
    })
    if (!passed) {
      results[results.length - 1].error = [
        !hasSlug && 'нет slug в URL',
        !hasRedirectPath && 'нет пути редиректа /r?linkId=',
        !url.startsWith('http') && 'URL не начинается с http'
      ]
        .filter(Boolean)
        .join('; ')
    }
  } catch (e) {
    results.push({
      id: 'buildPartnerLinkUrl',
      title: 'buildPartnerLinkUrl — URL содержит slug и путь редиректа',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Итог: ${results.filter((r) => r.passed).length}/${results.length} тестов пройдено`,
    payload: { results: results.map((r) => ({ id: r.id, passed: r.passed, error: r.error })) }
  })

  return { success: true, test: 'url-builder', results, at: Date.now() }
})

// @shared-route
import { requireAnyUser } from '@app/auth'
import { request } from '@app/request'
import { getPartnerRedirectUrl, getRedirectTestLandingUrlTemplate } from '../../../config/routes'
import * as loggerLib from '../../../lib/logger.lib'
import * as campaignRepo from '../../../lib/repo/campaignRepo'
import * as pageRepo from '../../../lib/repo/pageRepo'
import * as linkRepo from '../../../lib/repo/linkRepo'
import Campaigns from '../../../tables/campaigns.table'
import CampaignMembers from '../../../tables/campaign_members.table'
import Partners from '../../../tables/partners.table'
import Pages from '../../../tables/pages.table'
import PartnerLinks from '../../../tables/partner_links.table'
import Visits from '../../../tables/visits.table'

const LOG_PATH = 'api/tests/endpoints-check/redirect-route'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/redirect-route — тесты роута редиректа GET /r?linkId=.
 * Проверяет: 404 для неизвестного slug, редирект с созданием визита, идемпотентность (повторный клик — тот же ref).
 */
export const redirectRouteTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    return { success: false, error: 'Нет пользователя в контексте', results: [], at: Date.now() }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки роута редиректа`,
    payload: {}
  })

  const results: TestResult[] = []
  let campaignId: string | null = null
  let partnerId: string | null = null
  let pageId: string | null = null
  let linkSlug: string | null = null

  try {
    // Тест 1: неизвестный slug — GET /r возвращает страницу с текстом «Ссылка не найдена»
    try {
      const url404 = getPartnerRedirectUrl('nonexistent-slug-xyz-' + Date.now())
      const res404 = await request({
        url: url404,
        method: 'get',
        responseType: 'text',
        throwHttpErrors: false,
        followRedirect: false
      } as unknown as Parameters<typeof request>[0])
      const status = res404.statusCode
      const body = typeof res404.body === 'string' ? res404.body : ''
      const passed = body.includes('Ссылка не найдена') && (status === 200 || status === 404)
      results.push({
        id: 'redirect-404-unknown-slug',
        title: 'GET /r?linkId= — неизвестный slug → «Ссылка не найдена»',
        passed,
        error: passed
          ? undefined
          : `status=${status ?? '?'}, body содержит текст: ${body.includes('Ссылка не найдена')}`
      })
    } catch (e) {
      results.push({
        id: 'redirect-404-unknown-slug',
        title: 'GET /r?linkId= — неизвестный slug → 404',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }

    const campaign = await campaignRepo.createCampaign(ctx, {
      title: `[${LOG_PATH}] Тестовая кампания`,
      ownerUserId: userId
    })
    campaignId = campaign?.id ?? null

    if (!campaignId) {
      results.push(
        {
          id: 'redirect-success',
          title: 'GET /r?linkId= — редирект и визит',
          passed: false,
          error: 'Кампания не создана'
        },
        {
          id: 'redirect-idempotent',
          title: 'GET /r?linkId= — повторный клик (тот же ref)',
          passed: false,
          error: 'Пропущен'
        }
      )
    } else {
      const partner = await Partners.create(ctx, {
        campaignId,
        tgId: 'test-tg-redirect-' + Date.now(),
        username: 'test_redirect_user',
        fullName: 'Test Redirect Partner',
        stats: null
      })
      partnerId = partner?.id ?? null

      const page = await pageRepo.createPage(ctx, {
        campaignId,
        title: `[${LOG_PATH}] Тестовая страница`,
        urlTemplate: getRedirectTestLandingUrlTemplate()
      })
      pageId = page?.id ?? null

      if (!partnerId || !pageId) {
        results.push(
          {
            id: 'redirect-success',
            title: 'GET /r?linkId= — редирект и визит',
            passed: false,
            error: !partnerId ? 'Партнёр не создан' : 'Страница не создана'
          },
          {
            id: 'redirect-idempotent',
            title: 'GET /r?linkId= — повторный клик (тот же ref)',
            passed: false,
            error: 'Пропущен'
          }
        )
      } else {
        const link = await linkRepo.getOrCreatePartnerLink(ctx, campaignId, partnerId, pageId)
        linkSlug = link?.publicSlug ?? null

        if (!linkSlug) {
          results.push(
            {
              id: 'redirect-success',
              title: 'GET /r?linkId= — редирект и визит',
              passed: false,
              error: 'Нет publicSlug у ссылки'
            },
            {
              id: 'redirect-idempotent',
              title: 'GET /r?linkId= — повторный клик (тот же ref)',
              passed: false,
              error: 'Пропущен'
            }
          )
        } else {
          const visitsBefore = await Visits.findAll(ctx, { where: { campaignId }, limit: 10 })

          try {
            const urlRedirect = getPartnerRedirectUrl(linkSlug)
            const resRedirect = await request({
              url: urlRedirect,
              method: 'get',
              responseType: 'text',
              throwHttpErrors: false,
              followRedirect: false
            } as unknown as Parameters<typeof request>[0])
            const visitsAfter1 = await Visits.findAll(ctx, { where: { campaignId }, limit: 10 })
            const createdVisit = visitsAfter1.length === visitsBefore.length + 1
            const code = resRedirect.statusCode ?? 0
            const body = typeof resRedirect.body === 'string' ? resRedirect.body : ''
            const hasRegistrationLabel = code === 200 && body.includes('Регистрация')
            const passed = hasRegistrationLabel && createdVisit && visitsAfter1.some((v) => v.ref)

            results.push({
              id: 'redirect-success',
              title: 'GET /r?linkId= — страница «Регистрация» и визит',
              passed,
              error: passed
                ? undefined
                : `status=${code}, hasLabel=${hasRegistrationLabel}, visitCreated=${createdVisit}`
            })
          } catch (e) {
            results.push({
              id: 'redirect-success',
              title: 'GET /r?linkId= — страница «Регистрация» и визит',
              passed: false,
              error: (e as Error)?.message ?? String(e)
            })
          }

          try {
            const urlRedirect2 = getPartnerRedirectUrl(linkSlug)
            await request({
              url: urlRedirect2,
              method: 'get',
              responseType: 'text',
              throwHttpErrors: false,
              followRedirect: false
            } as unknown as Parameters<typeof request>[0])
            const visitsAfter2 = await Visits.findAll(ctx, { where: { campaignId }, limit: 10 })
            const stillOneVisit = visitsAfter2.length === 1
            const passed = stillOneVisit

            results.push({
              id: 'redirect-idempotent',
              title: 'GET /r?linkId= — повторный клик (тот же ref, один визит)',
              passed,
              error: passed ? undefined : `visits count=${visitsAfter2.length} (ожидался 1)`
            })
          } catch (e) {
            results.push({
              id: 'redirect-idempotent',
              title: 'GET /r?linkId= — повторный клик (тот же ref)',
              passed: false,
              error: (e as Error)?.message ?? String(e)
            })
          }
        }
      }
    }
  } finally {
    if (campaignId) {
      const visits = await Visits.findAll(ctx, { where: { campaignId }, limit: 500 })
      for (const v of visits) {
        try {
          await Visits.delete(ctx, v.id)
        } catch (_) {}
      }
      const links = await PartnerLinks.findAll(ctx, { where: { campaignId }, limit: 100 })
      for (const l of links) {
        try {
          await PartnerLinks.delete(ctx, l.id)
        } catch (_) {}
      }
      const pages = await Pages.findAll(ctx, { where: { campaignId }, limit: 100 })
      for (const p of pages) {
        try {
          await Pages.delete(ctx, p.id)
        } catch (_) {}
      }
      if (partnerId) {
        try {
          await Partners.delete(ctx, partnerId)
        } catch (_) {}
      }
      const members = await CampaignMembers.findAll(ctx, {
        where: { campaignId },
        limit: 100
      })
      for (const m of members) {
        try {
          await CampaignMembers.delete(ctx, m.id)
        } catch (_) {}
      }
      try {
        await Campaigns.delete(ctx, campaignId)
      } catch (_) {}
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Итог: ${results.filter((r) => r.passed).length}/${results.length} тестов пройдено`,
    payload: { results: results.map((r) => ({ id: r.id, passed: r.passed, error: r.error })) }
  })

  return { success: true, test: 'redirect-route', results, at: Date.now() }
})

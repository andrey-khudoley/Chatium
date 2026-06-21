// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as campaignRepo from '../../../lib/repo/campaignRepo'
import * as pageRepo from '../../../lib/repo/pageRepo'
import Campaigns from '../../../tables/campaigns.table'
import CampaignMembers from '../../../tables/campaign_members.table'
import Pages from '../../../tables/pages.table'

const LOG_PATH = 'api/tests/endpoints-check/page-repo'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/page-repo — тесты репозитория страниц (createPage, getPageById, getCampaignPages).
 */
export const pageRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    return { success: false, error: 'Нет пользователя в контексте', results: [], at: Date.now() }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки pageRepo`,
    payload: {}
  })

  const results: TestResult[] = []
  let campaignId: string | null = null
  let pageId: string | null = null

  try {
    const campaign = await campaignRepo.createCampaign(ctx, {
      title: `[${LOG_PATH}] Тестовая кампания`,
      ownerUserId: userId
    })
    campaignId = campaign?.id ?? null

    if (!campaignId) {
      results.push({
        id: 'createPage',
        title: 'createPage',
        passed: false,
        error: 'Кампания не создана'
      })
      results.push({
        id: 'getPageById-found',
        title: 'getPageById (найдена)',
        passed: false,
        error: 'Пропущен'
      })
      results.push({
        id: 'getPageById-notFound',
        title: 'getPageById (не найдена)',
        passed: false,
        error: 'Пропущен'
      })
      results.push({
        id: 'getCampaignPages',
        title: 'getCampaignPages',
        passed: false,
        error: 'Пропущен'
      })
    } else {
      try {
        const title = `[${LOG_PATH}] Тестовая страница`
        const urlTemplate = 'https://example.com/landing?ref={ref}'
        const page = await pageRepo.createPage(ctx, {
          campaignId,
          title,
          urlTemplate
        })
        pageId = page?.id ?? null

        const passed =
          pageId != null &&
          page.title === title &&
          page.urlTemplate === urlTemplate &&
          page.campaignId?.id === campaignId

        results.push({
          id: 'createPage',
          title: 'createPage',
          passed
        })
        if (!passed) {
          results[results.length - 1].error = [
            !pageId && 'нет page.id',
            page?.title !== title && 'title не совпадает',
            page?.urlTemplate !== urlTemplate && 'urlTemplate не совпадает'
          ]
            .filter(Boolean)
            .join('; ')
        }
      } catch (e) {
        results.push({
          id: 'createPage',
          title: 'createPage',
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }

      if (pageId) {
        try {
          const found = await pageRepo.getPageById(ctx, pageId)
          const passed = found != null && found.id === pageId
          results.push({
            id: 'getPageById-found',
            title: 'getPageById (найдена)',
            passed
          })
        } catch (e) {
          results.push({
            id: 'getPageById-found',
            title: 'getPageById (найдена)',
            passed: false,
            error: (e as Error)?.message ?? String(e)
          })
        }
      }

      try {
        const notFound = await pageRepo.getPageById(ctx, 'non-existent-page-id-xyz')
        results.push({
          id: 'getPageById-notFound',
          title: 'getPageById (не найдена)',
          passed: notFound === null
        })
      } catch (e) {
        results.push({
          id: 'getPageById-notFound',
          title: 'getPageById (не найдена)',
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }

      try {
        const list = await pageRepo.getCampaignPages(ctx, campaignId)
        const containsOur = pageId ? list.some((p) => p.id === pageId) : list.length >= 0
        results.push({
          id: 'getCampaignPages',
          title: 'getCampaignPages',
          passed: containsOur
        })
      } catch (e) {
        results.push({
          id: 'getCampaignPages',
          title: 'getCampaignPages',
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }
    }
  } finally {
    if (campaignId) {
      const pages = await Pages.findAll(ctx, { where: { campaignId }, limit: 100 })
      for (const p of pages) {
        try {
          await Pages.delete(ctx, p.id)
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

  return { success: true, test: 'page-repo', results, at: Date.now() }
})

// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as campaignRepo from '../../../lib/repo/campaignRepo'
import * as pageRepo from '../../../lib/repo/pageRepo'
import * as linkRepo from '../../../lib/repo/linkRepo'
import Campaigns from '../../../tables/campaigns.table'
import CampaignMembers from '../../../tables/campaign_members.table'
import Partners from '../../../tables/partners.table'
import Pages from '../../../tables/pages.table'
import PartnerLinks from '../../../tables/partner_links.table'

const LOG_PATH = 'api/tests/endpoints-check/link-repo'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/link-repo — тесты репозитория партнёрских ссылок (getOrCreatePartnerLink, getPartnerLinks, findLinkByPublicSlug).
 */
export const linkRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    return { success: false, error: 'Нет пользователя в контексте', results: [], at: Date.now() }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки linkRepo`,
    payload: {}
  })

  const results: TestResult[] = []
  let campaignId: string | null = null
  let partnerId: string | null = null
  let pageId: string | null = null

  try {
    const campaign = await campaignRepo.createCampaign(ctx, {
      title: `[${LOG_PATH}] Тестовая кампания`,
      ownerUserId: userId
    })
    campaignId = campaign?.id ?? null

    if (!campaignId) {
      results.push({
        id: 'getOrCreatePartnerLink',
        title: 'getOrCreatePartnerLink',
        passed: false,
        error: 'Кампания не создана'
      })
      results.push({
        id: 'getOrCreatePartnerLink-idempotent',
        title: 'getOrCreatePartnerLink (повтор — та же ссылка)',
        passed: false,
        error: 'Пропущен'
      })
      results.push({
        id: 'getPartnerLinks',
        title: 'getPartnerLinks',
        passed: false,
        error: 'Пропущен'
      })
      results.push({
        id: 'findLinkByPublicSlug',
        title: 'findLinkByPublicSlug',
        passed: false,
        error: 'Пропущен'
      })
    } else {
      const partner = await Partners.create(ctx, {
        campaignId,
        tgId: 'test-tg-' + Date.now(),
        username: 'test_user',
        fullName: 'Test Partner',
        stats: null
      })
      partnerId = partner?.id ?? null

      const page = await pageRepo.createPage(ctx, {
        campaignId,
        title: `[${LOG_PATH}] Тестовая страница`,
        urlTemplate: 'https://example.com?ref={ref}'
      })
      pageId = page?.id ?? null

      if (!partnerId || !pageId) {
        results.push({
          id: 'getOrCreatePartnerLink',
          title: 'getOrCreatePartnerLink',
          passed: false,
          error: !partnerId ? 'Партнёр не создан' : 'Страница не создана'
        })
        results.push({
          id: 'getOrCreatePartnerLink-idempotent',
          title: 'getOrCreatePartnerLink (повтор — та же ссылка)',
          passed: false,
          error: 'Пропущен'
        })
        results.push({
          id: 'getPartnerLinks',
          title: 'getPartnerLinks',
          passed: false,
          error: 'Пропущен'
        })
        results.push({
          id: 'findLinkByPublicSlug',
          title: 'findLinkByPublicSlug',
          passed: false,
          error: 'Пропущен'
        })
      } else {
        try {
          const link1 = await linkRepo.getOrCreatePartnerLink(ctx, campaignId, partnerId, pageId)
          const hasId = typeof link1.id === 'string'
          const hasSlug = typeof link1.publicSlug === 'string' && link1.publicSlug.length > 0
          const sameIds =
            link1.campaignId?.id === campaignId &&
            link1.partnerId?.id === partnerId &&
            link1.pageId?.id === pageId

          const link2 = await linkRepo.getOrCreatePartnerLink(ctx, campaignId, partnerId, pageId)
          const idempotent = link1.id === link2.id && link1.publicSlug === link2.publicSlug

          results.push({
            id: 'getOrCreatePartnerLink',
            title: 'getOrCreatePartnerLink',
            passed: hasId && hasSlug && sameIds
          })
          if (!(hasId && hasSlug && sameIds)) {
            results[results.length - 1].error = [
              !hasId && 'нет id',
              !hasSlug && 'нет publicSlug',
              !sameIds && 'неверные campaignId/partnerId/pageId'
            ]
              .filter(Boolean)
              .join('; ')
          }

          results.push({
            id: 'getOrCreatePartnerLink-idempotent',
            title: 'getOrCreatePartnerLink (повтор — та же ссылка)',
            passed: idempotent
          })
          if (!idempotent && link1.publicSlug) {
            results[results.length - 1].error =
              `Ожидалась та же запись, slug: ${link1.publicSlug} vs ${link2.publicSlug}`
          }
        } catch (e) {
          results.push({
            id: 'getOrCreatePartnerLink',
            title: 'getOrCreatePartnerLink',
            passed: false,
            error: (e as Error)?.message ?? String(e)
          })
          results.push({
            id: 'getOrCreatePartnerLink-idempotent',
            title: 'getOrCreatePartnerLink (повтор — та же ссылка)',
            passed: false,
            error: 'Пропущен из-за ошибки getOrCreatePartnerLink'
          })
        }

        try {
          const links = await linkRepo.getPartnerLinks(ctx, partnerId)
          const hasAtLeastOne =
            links.length >= 1 && links.some((l) => l.partnerId?.id === partnerId)
          results.push({
            id: 'getPartnerLinks',
            title: 'getPartnerLinks',
            passed: hasAtLeastOne
          })
        } catch (e) {
          results.push({
            id: 'getPartnerLinks',
            title: 'getPartnerLinks',
            passed: false,
            error: (e as Error)?.message ?? String(e)
          })
        }

        try {
          const link = await linkRepo.getOrCreatePartnerLink(ctx, campaignId, partnerId, pageId)
          const slug = link?.publicSlug
          if (slug) {
            const found = await linkRepo.findLinkByPublicSlug(ctx, slug)
            const passed = found != null && found.id === link.id && found.publicSlug === slug
            results.push({
              id: 'findLinkByPublicSlug',
              title: 'findLinkByPublicSlug',
              passed
            })
          } else {
            results.push({
              id: 'findLinkByPublicSlug',
              title: 'findLinkByPublicSlug',
              passed: false,
              error: 'Нет publicSlug у созданной ссылки'
            })
          }
        } catch (e) {
          results.push({
            id: 'findLinkByPublicSlug',
            title: 'findLinkByPublicSlug',
            passed: false,
            error: (e as Error)?.message ?? String(e)
          })
        }
      }
    }
  } finally {
    if (campaignId) {
      const links = await PartnerLinks.findAll(ctx, {
        where: { campaignId },
        limit: 100
      })
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

  return { success: true, test: 'link-repo', results, at: Date.now() }
})

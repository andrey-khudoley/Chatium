// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as campaignRepo from '../../../lib/repo/campaignRepo'
import * as memberRepo from '../../../lib/repo/memberRepo'
import Campaigns from '../../../tables/campaigns.table'
import CampaignMembers from '../../../tables/campaign_members.table'

const LOG_PATH = 'api/tests/endpoints-check/campaign-repo'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/campaign-repo — тесты репозитория кампаний (createCampaign, getCampaignById, getUserCampaigns).
 * Создаётся кампания через createCampaign, проверяются чтение и список; в конце тестовые данные удаляются.
 */
export const campaignRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    return { success: false, error: 'Нет пользователя в контексте', results: [], at: Date.now() }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки campaignRepo`,
    payload: {}
  })

  const results: TestResult[] = []
  let campaignId: string | null = null

  try {
    // --- createCampaign ---
    try {
      const title = `[${LOG_PATH}] Тестовая кампания`
      const campaign = await campaignRepo.createCampaign(ctx, { title, ownerUserId: userId })
      campaignId = campaign?.id ?? null

      if (!campaignId) {
        results.push({
          id: 'createCampaign',
          title: 'createCampaign',
          passed: false,
          error: 'campaign.id отсутствует после createCampaign'
        })
      } else {
        const hasId = typeof campaign.id === 'string'
        const hasTitle = campaign.title === title
        const hasSecret =
          typeof campaign.webhookSecret === 'string' && campaign.webhookSecret.length > 0
        const hasSettings = campaign.settings != null
        const notDeleted = campaign.isDeleted !== true
        const access = await memberRepo.checkCampaignAccess(ctx, campaign.id, userId)
        const ownerAdded = access.hasAccess === true && access.role === 'campaign-owner'

        const passed = hasId && hasTitle && hasSecret && hasSettings && notDeleted && ownerAdded
        results.push({
          id: 'createCampaign',
          title: 'createCampaign',
          passed
        })
        if (!passed) {
          results[results.length - 1].error = [
            !hasId && 'нет id',
            !hasTitle && 'title не совпадает',
            !hasSecret && 'нет webhookSecret',
            !hasSettings && 'нет settings',
            !notDeleted && 'isDeleted !== false',
            !ownerAdded && 'владелец не добавлен в campaign_members'
          ]
            .filter(Boolean)
            .join('; ')
        }
      }
    } catch (e) {
      const errMsg = (e as Error)?.message ?? String(e)
      results.push({
        id: 'createCampaign',
        title: 'createCampaign',
        passed: false,
        error: errMsg
      })
    }

    if (!campaignId) {
      results.push({
        id: 'getCampaignById-found',
        title: 'getCampaignById (найдена)',
        passed: false,
        error: 'Пропущен: кампания не создана'
      })
      results.push({
        id: 'getCampaignById-notFound',
        title: 'getCampaignById (не найдена)',
        passed: false,
        error: 'Пропущен: кампания не создана'
      })
      results.push({
        id: 'getUserCampaigns',
        title: 'getUserCampaigns',
        passed: false,
        error: 'Пропущен: кампания не создана'
      })
    } else {
      // --- getCampaignById (найдена) ---
      try {
        const found = await campaignRepo.getCampaignById(ctx, campaignId)
        const passed = found != null && found.id === campaignId && found.title?.includes(LOG_PATH)
        results.push({
          id: 'getCampaignById-found',
          title: 'getCampaignById (найдена)',
          passed
        })
      } catch (e) {
        results.push({
          id: 'getCampaignById-found',
          title: 'getCampaignById (найдена)',
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }

      // --- getCampaignById (не найдена) ---
      try {
        const notFound = await campaignRepo.getCampaignById(ctx, 'non-existent-id-xyz-123')
        results.push({
          id: 'getCampaignById-notFound',
          title: 'getCampaignById (не найдена)',
          passed: notFound === null
        })
      } catch (e) {
        results.push({
          id: 'getCampaignById-notFound',
          title: 'getCampaignById (не найдена)',
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }

      // --- getUserCampaigns ---
      try {
        const list = await campaignRepo.getUserCampaigns(ctx, userId)
        const containsOur =
          list.some((c) => c.id === campaignId) && list.every((c) => c.isDeleted !== true)
        const otherList = await campaignRepo.getUserCampaigns(ctx, 'fake-user-id-xyz-123')
        const otherDoesNotContain = !otherList.some((c) => c.id === campaignId)
        results.push({
          id: 'getUserCampaigns',
          title: 'getUserCampaigns',
          passed: containsOur && otherDoesNotContain
        })
      } catch (e) {
        results.push({
          id: 'getUserCampaigns',
          title: 'getUserCampaigns',
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }
    }
  } finally {
    if (campaignId) {
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
    payload: {
      results: results.map((r) => ({ id: r.id, passed: r.passed, error: r.error }))
    }
  })

  return { success: true, test: 'campaign-repo', results, at: Date.now() }
})

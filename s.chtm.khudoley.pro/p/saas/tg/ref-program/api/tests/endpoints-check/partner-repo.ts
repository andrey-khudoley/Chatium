// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as campaignRepo from '../../../lib/repo/campaignRepo'
import * as partnerRepo from '../../../lib/repo/partnerRepo'
import Campaigns from '../../../tables/campaigns.table'
import CampaignMembers from '../../../tables/campaign_members.table'
import Partners from '../../../tables/partners.table'
import type { TelegramUser } from '../../../shared/types'

const LOG_PATH = 'api/tests/endpoints-check/partner-repo'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const MOCK_TG_USER: TelegramUser = {
  id: 999000000 + Math.floor(Math.random() * 1000000),
  is_bot: false,
  first_name: 'Test',
  last_name: 'Partner',
  username: 'test_partner_repo',
  language_code: 'ru'
}

/**
 * GET /api/tests/endpoints-check/partner-repo — тесты репозитория партнёров (getOrCreatePartner, getPartnerById).
 */
export const partnerRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    ctx.account.log(`[${LOG_PATH}] Нет пользователя в контексте`, { level: 'warn', json: {} })
    return { success: false, error: 'Нет пользователя в контексте', results: [], at: Date.now() }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки partnerRepo`,
    payload: {}
  })

  const results: TestResult[] = []
  let campaignId: string | null = null
  let partnerId: string | null = null

  try {
    const campaign = await campaignRepo.createCampaign(ctx, {
      title: `[${LOG_PATH}] Тестовая кампания`,
      ownerUserId: userId
    })
    campaignId = campaign?.id ?? null

    if (!campaignId) {
      ctx.account.log(`[${LOG_PATH}] Кампания не создана`, { level: 'warn', json: {} })
      pushSkipped(results, 'Кампания не создана')
    } else {
      try {
        const r1 = await partnerRepo.getOrCreatePartner(ctx, campaignId, MOCK_TG_USER)
        const createOk =
          r1.isNew === true &&
          r1.partner != null &&
          r1.partner.id != null &&
          r1.partner.tgId === String(MOCK_TG_USER.id) &&
          (r1.partner.fullName?.includes('Test') ?? false)
        results.push({
          id: 'getOrCreatePartner-new',
          title: 'getOrCreatePartner (новый партнёр)',
          passed: createOk
        })
        if (!createOk) {
          const err = `isNew=${r1.isNew}, partner.id=${r1.partner?.id}, tgId=${r1.partner?.tgId}`
          results[results.length - 1].error = err
          ctx.account.log(`[${LOG_PATH}] getOrCreatePartner-new: ${err}`, {
            level: 'warn',
            json: { testId: 'getOrCreatePartner-new', error: err }
          })
        }
        partnerId = r1.partner?.id ?? null
      } catch (e) {
        const errMsg = (e as Error)?.message ?? String(e)
        ctx.account.log(`[${LOG_PATH}] getOrCreatePartner-new exception: ${errMsg}`, {
          level: 'error',
          json: { testId: 'getOrCreatePartner-new', error: errMsg, stack: (e as Error)?.stack }
        })
        results.push({
          id: 'getOrCreatePartner-new',
          title: 'getOrCreatePartner (новый партнёр)',
          passed: false,
          error: errMsg
        })
      }

      try {
        const r2 = await partnerRepo.getOrCreatePartner(ctx, campaignId, MOCK_TG_USER)
        const idempotentOk = r2.isNew === false && r2.partner != null && r2.partner.id === partnerId
        results.push({
          id: 'getOrCreatePartner-existing',
          title: 'getOrCreatePartner (существующий — тот же партнёр)',
          passed: idempotentOk
        })
        if (!idempotentOk) {
          const err = `ожидался isNew=false, id=${r2.partner?.id}, partnerId=${partnerId}`
          results[results.length - 1].error = err
          ctx.account.log(`[${LOG_PATH}] getOrCreatePartner-existing: ${err}`, {
            level: 'warn',
            json: { testId: 'getOrCreatePartner-existing', error: err }
          })
        }
      } catch (e) {
        const errMsg = (e as Error)?.message ?? String(e)
        ctx.account.log(`[${LOG_PATH}] getOrCreatePartner-existing exception: ${errMsg}`, {
          level: 'error',
          json: { testId: 'getOrCreatePartner-existing', error: errMsg }
        })
        results.push({
          id: 'getOrCreatePartner-existing',
          title: 'getOrCreatePartner (существующий — тот же партнёр)',
          passed: false,
          error: errMsg
        })
      }

      try {
        const found = partnerId ? await partnerRepo.getPartnerById(ctx, partnerId) : null
        const getByIdOk = found != null && found.id === partnerId
        results.push({
          id: 'getPartnerById-found',
          title: 'getPartnerById (найден)',
          passed: getByIdOk
        })
        if (!getByIdOk) {
          const err = partnerId
            ? 'партнёр не найден или id не совпадает'
            : 'partnerId не был создан'
          results[results.length - 1].error = err
          ctx.account.log(`[${LOG_PATH}] getPartnerById-found: ${err}`, {
            level: 'warn',
            json: { testId: 'getPartnerById-found', error: err }
          })
        }
      } catch (e) {
        const errMsg = (e as Error)?.message ?? String(e)
        ctx.account.log(`[${LOG_PATH}] getPartnerById-found exception: ${errMsg}`, {
          level: 'error',
          json: { testId: 'getPartnerById-found', error: errMsg }
        })
        results.push({
          id: 'getPartnerById-found',
          title: 'getPartnerById (найден)',
          passed: false,
          error: errMsg
        })
      }

      try {
        const notFound = await partnerRepo.getPartnerById(
          ctx,
          'nonexistent-partner-id-xyz-' + Date.now()
        )
        results.push({
          id: 'getPartnerById-notFound',
          title: 'getPartnerById (не найден)',
          passed: notFound === null
        })
        if (notFound !== null) {
          results[results.length - 1].error = 'ожидался null'
          ctx.account.log(`[${LOG_PATH}] getPartnerById-notFound: ожидался null`, {
            level: 'warn',
            json: { testId: 'getPartnerById-notFound' }
          })
        }
      } catch (e) {
        const errMsg = (e as Error)?.message ?? String(e)
        ctx.account.log(`[${LOG_PATH}] getPartnerById-notFound exception: ${errMsg}`, {
          level: 'error',
          json: { testId: 'getPartnerById-notFound', error: errMsg }
        })
        results.push({
          id: 'getPartnerById-notFound',
          title: 'getPartnerById (не найден)',
          passed: false,
          error: errMsg
        })
      }
    }
  } finally {
    if (campaignId) {
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

  const failed = results.filter((r) => !r.passed)
  if (failed.length > 0) {
    ctx.account.log(
      `[${LOG_PATH}] Пройдено ${results.filter((r) => r.passed).length}/${results.length}, упало: ${failed.map((r) => r.id).join(', ')}`,
      {
        level: 'warn',
        json: { failed: failed.map((r) => ({ id: r.id, error: r.error })) }
      }
    )
  }
  await loggerLib.writeServerLog(ctx, {
    severity: failed.length > 0 ? 4 : 7,
    message: `[${LOG_PATH}] Итог: ${results.filter((r) => r.passed).length}/${results.length} тестов пройдено`,
    payload: { results: results.map((r) => ({ id: r.id, passed: r.passed, error: r.error })) }
  })

  return { success: true, test: 'partner-repo', results, at: Date.now() }
})

function pushSkipped(results: TestResult[], reason: string): void {
  const ids = [
    'getOrCreatePartner-new',
    'getOrCreatePartner-existing',
    'getPartnerById-found',
    'getPartnerById-notFound'
  ]
  const titles: Record<string, string> = {
    'getOrCreatePartner-new': 'getOrCreatePartner (новый партнёр)',
    'getOrCreatePartner-existing': 'getOrCreatePartner (существующий — тот же партнёр)',
    'getPartnerById-found': 'getPartnerById (найден)',
    'getPartnerById-notFound': 'getPartnerById (не найден)'
  }
  for (const id of ids) {
    results.push({ id, title: titles[id], passed: false, error: reason })
  }
}

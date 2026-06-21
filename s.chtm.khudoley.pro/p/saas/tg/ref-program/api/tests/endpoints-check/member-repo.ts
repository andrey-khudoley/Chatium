// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { generateCampaignSecret } from '../../../lib/core/refGenerator'
import * as memberRepo from '../../../lib/repo/memberRepo'
import { DEFAULT_CAMPAIGN_SETTINGS } from '../../../shared/constants'
import Campaigns from '../../../tables/campaigns.table'
import CampaignMembers from '../../../tables/campaign_members.table'

const LOG_PATH = 'api/tests/endpoints-check/member-repo'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/member-repo — тесты репозитория участников кампании (addMember, checkCampaignAccess).
 * Создаётся тестовая кампания, добавляется участник, проверяется доступ; в конце тестовые данные удаляются.
 */
export const memberRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const userId = ctx.user?.id
  if (typeof userId !== 'string') {
    return { success: false, error: 'Нет пользователя в контексте', results: [], at: Date.now() }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки memberRepo`,
    payload: {}
  })

  const results: TestResult[] = []
  let campaignId: string | null = null
  let memberIdToDelete: string | null = null

  try {
    const campaign = await Campaigns.create(ctx, {
      title: `[${LOG_PATH}] Тестовая кампания`,
      ownerUserId: userId,
      webhookSecret: generateCampaignSecret(),
      settings: DEFAULT_CAMPAIGN_SETTINGS
    })
    campaignId = campaign?.id ?? null
    if (!campaignId) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] Ошибка: campaign.id отсутствует после create`,
        payload: { campaignKeys: campaign ? Object.keys(campaign) : [] }
      })
      results.push({
        id: 'addMember',
        title: 'addMember',
        passed: false,
        error: 'campaign.id отсутствует после Campaigns.create'
      })
      results.push({
        id: 'checkCampaignAccess-hasAccess',
        title: 'checkCampaignAccess (есть доступ)',
        passed: false,
        error: 'Пропущен: addMember не выполнен'
      })
      results.push({
        id: 'checkCampaignAccess-noAccess',
        title: 'checkCampaignAccess (нет доступа)',
        passed: false,
        error: 'Пропущен: addMember не выполнен'
      })
    } else {
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 7,
          message: `[${LOG_PATH}] PRE-TEST LOG FOR addMember`,
          payload: {
            campaignId,
            userId,
            role: 'campaign-owner',
            type_campaignId: typeof campaignId,
            type_userId: typeof userId
          }
        })
        await loggerLib.writeServerLog(ctx, {
          severity: 7,
          message: `[${LOG_PATH}] Тест addMember: входные значения`,
          payload: { campaignId, userId, role: 'campaign-owner' }
        })
        const member = await memberRepo.addMember(ctx, campaignId, userId, 'campaign-owner')
        memberIdToDelete = member.id
        const passed =
          member != null &&
          typeof member.id === 'string' &&
          member.campaignId?.id === campaignId &&
          member.userId?.id === userId &&
          member.role === 'campaign-owner'
        results.push({
          id: 'addMember',
          title: 'addMember',
          passed
        })
        await loggerLib.writeServerLog(ctx, {
          severity: passed ? 7 : 4,
          message: `[${LOG_PATH}] Тест addMember: ${passed ? 'OK' : 'FAIL'}`,
          payload: passed
            ? { memberId: member.id }
            : { member: member != null ? Object.keys(member) : null }
        })
      } catch (e) {
        const errMsg = (e as Error)?.message ?? String(e)
        const errStack = (e as Error)?.stack
        results.push({
          id: 'addMember',
          title: 'addMember',
          passed: false,
          error: errMsg
        })
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_PATH}] Тест addMember: FAIL — ${errMsg}`,
          payload: { error: errMsg, stack: errStack }
        })
      }

      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 7,
          message: `[${LOG_PATH}] Тест checkCampaignAccess (есть доступ): входные значения`,
          payload: { campaignId, userId }
        })
        const access = await memberRepo.checkCampaignAccess(ctx, campaignId, userId)
        const passed = access.hasAccess === true && access.role === 'campaign-owner'
        results.push({
          id: 'checkCampaignAccess-hasAccess',
          title: 'checkCampaignAccess (есть доступ)',
          passed
        })
        await loggerLib.writeServerLog(ctx, {
          severity: passed ? 7 : 4,
          message: `[${LOG_PATH}] Тест checkCampaignAccess (есть доступ): ${passed ? 'OK' : 'FAIL'}`,
          payload: { hasAccess: access.hasAccess, role: access.role }
        })
      } catch (e) {
        const errMsg = (e as Error)?.message ?? String(e)
        const errStack = (e as Error)?.stack
        results.push({
          id: 'checkCampaignAccess-hasAccess',
          title: 'checkCampaignAccess (есть доступ)',
          passed: false,
          error: errMsg
        })
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_PATH}] Тест checkCampaignAccess (есть доступ): FAIL — ${errMsg}`,
          payload: { error: errMsg, stack: errStack }
        })
      }

      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 7,
          message: `[${LOG_PATH}] Тест checkCampaignAccess (нет доступа): запуск`,
          payload: { campaignId, fakeUserId: 'fake-user-id-xyz-123' }
        })
        const noAccess = await memberRepo.checkCampaignAccess(
          ctx,
          campaignId,
          'fake-user-id-xyz-123'
        )
        const passed = noAccess.hasAccess === false && noAccess.role === null
        results.push({
          id: 'checkCampaignAccess-noAccess',
          title: 'checkCampaignAccess (нет доступа)',
          passed
        })
        await loggerLib.writeServerLog(ctx, {
          severity: passed ? 7 : 4,
          message: `[${LOG_PATH}] Тест checkCampaignAccess (нет доступа): ${passed ? 'OK' : 'FAIL'}`,
          payload: { hasAccess: noAccess.hasAccess, role: noAccess.role }
        })
      } catch (e) {
        const errMsg = (e as Error)?.message ?? String(e)
        const errStack = (e as Error)?.stack
        results.push({
          id: 'checkCampaignAccess-noAccess',
          title: 'checkCampaignAccess (нет доступа)',
          passed: false,
          error: errMsg
        })
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_PATH}] Тест checkCampaignAccess (нет доступа): FAIL — ${errMsg}`,
          payload: { error: errMsg, stack: errStack }
        })
      }
    }
  } finally {
    if (memberIdToDelete) {
      try {
        await CampaignMembers.delete(ctx, memberIdToDelete)
      } catch (_) {}
    }
    if (campaignId) {
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

  return { success: true, test: 'member-repo', results, at: Date.now() }
})

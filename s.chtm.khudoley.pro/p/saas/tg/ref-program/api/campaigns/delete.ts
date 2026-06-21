// @shared-route
import { requireRealUser } from '@app/auth'
import * as campaignRepo from '../../lib/repo/campaignRepo'
import * as memberRepo from '../../lib/repo/memberRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/campaigns/delete'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * POST /api/campaigns/delete — мягкое удаление кампании (isDeleted = true).
 * Body: { campaignId: string }
 * Требуется роль campaign-owner.
 */
export const deleteCampaignRoute = app.post('/', async (ctx, req) => {
  try {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.debug,
      message: `[${LOG_PATH}] Запрос POST`,
      payload: { body: req.body }
    })
    const user = requireRealUser(ctx)
    const body = (req.body || {}) as { campaignId?: unknown }
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : ''
    if (!campaignId) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.warn,
        message: `[${LOG_PATH}] campaignId не указан`,
        payload: {}
      })
      return { success: false, error: 'Поле campaignId обязательно' }
    }

    const access = await memberRepo.checkCampaignAccess(ctx, campaignId, user.id)
    if (!access.hasAccess) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.warn,
        message: `[${LOG_PATH}] Нет доступа к кампании`,
        payload: { campaignId, userId: user.id }
      })
      return { success: false, error: 'Нет доступа к кампании' }
    }
    if (access.role !== 'campaign-owner') {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.warn,
        message: `[${LOG_PATH}] Удалять может только владелец`,
        payload: { campaignId, userId: user.id, role: access.role }
      })
      return { success: false, error: 'Удалять кампанию может только владелец' }
    }

    const ok = await campaignRepo.deleteCampaign(ctx, campaignId)
    if (!ok) {
      await loggerLib.writeServerLog(ctx, {
        severity: SEV.warn,
        message: `[${LOG_PATH}] Кампания не найдена`,
        payload: { campaignId }
      })
      return { success: false, error: 'Кампания не найдена' }
    }
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.info,
      message: `[${LOG_PATH}] Кампания удалена`,
      payload: { campaignId, userId: user.id }
    })
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] Исключение`,
      payload: { error: message, stack: err instanceof Error ? err.stack : undefined }
    })
    return { success: false, error: message || 'Ошибка удаления' }
  }
})

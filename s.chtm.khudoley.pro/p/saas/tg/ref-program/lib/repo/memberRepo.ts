/**
 * Репозиторий участников кампании (campaign_members).
 * addMember — создание записи; checkCampaignAccess — проверка доступа по роли.
 */

import type { CampaignRole } from '../../shared/constants'
import CampaignMembers from '../../tables/campaign_members.table'
import * as loggerLib from '../logger.lib'

const LOG_PATH = 'lib/repo/memberRepo'
const SEV = { debug: 7 } as const

/**
 * Добавляет участника в кампанию.
 */
export async function addMember(
  ctx: app.Ctx,
  campaignId: string,
  userId: string,
  role: CampaignRole
): Promise<typeof CampaignMembers.T> {
  return CampaignMembers.create(ctx, {
    campaignId,
    userId,
    role
  })
}

export interface CheckCampaignAccessResult {
  hasAccess: boolean
  role: string | null
}

/**
 * Проверяет доступ пользователя к кампании по записи в campaign_members.
 * Возвращает { hasAccess, role } (role = null при отсутствии доступа).
 */
export async function checkCampaignAccess(
  ctx: app.Ctx,
  campaignId: string,
  userId: string
): Promise<CheckCampaignAccessResult> {
  const member = await CampaignMembers.findOneBy(ctx, {
    campaignId,
    userId
  })
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] checkCampaignAccess`,
    payload: { campaignId, userId, hasMember: !!member, role: member?.role ?? null }
  })
  if (!member) {
    return { hasAccess: false, role: null }
  }
  return { hasAccess: true, role: member.role }
}

/**
 * Список участников кампании.
 */
export async function listMembers(
  ctx: app.Ctx,
  campaignId: string
): Promise<Array<typeof CampaignMembers.T>> {
  return CampaignMembers.findAll(ctx, {
    where: { campaignId },
    limit: 500
  })
}

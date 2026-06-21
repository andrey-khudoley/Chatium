/**
 * Репозиторий приглашений в кампанию (campaign_invites).
 * Создание инвайта, получение по токену, принятие (добавление в members + пометка использованным).
 */

import { generateInviteToken } from '../core/refGenerator'
import * as memberRepo from './memberRepo'
import CampaignInvites from '../../tables/campaign_invites.table'
import Campaigns from '../../tables/campaigns.table'

const DEFAULT_INVITE_DAYS = 7

export interface CreateInviteInput {
  campaignId: string
  createdByUserId: string
  expiresInDays?: number
}

/**
 * Создаёт приглашение: генерирует токен, запись в campaign_invites.
 * Возвращает инвайт с полем token.
 */
export async function createInvite(
  ctx: app.Ctx,
  input: CreateInviteInput
): Promise<typeof CampaignInvites.T> {
  const token = generateInviteToken()
  const expiresInDays = input.expiresInDays ?? DEFAULT_INVITE_DAYS
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
  return CampaignInvites.create(ctx, {
    campaignId: input.campaignId,
    token,
    createdByUserId: input.createdByUserId,
    expiresAt
  })
}

/**
 * Возвращает приглашение по токену с подгруженной кампанией.
 * Не возвращает истёкшие или уже принятые (acceptedAt != null).
 */
export async function getInviteByToken(
  ctx: app.Ctx,
  token: string
): Promise<{ invite: typeof CampaignInvites.T; campaign: typeof Campaigns.T } | null> {
  const invite = await CampaignInvites.findOneBy(ctx, { token })
  if (!invite || invite.acceptedAt) return null
  const campaignId = invite.campaignId?.id
  if (!campaignId) return null
  if (invite.expiresAt) {
    const exp = new Date(invite.expiresAt).getTime()
    if (Date.now() > exp) return null
  }
  const campaign = await Campaigns.findById(ctx, campaignId)
  if (!campaign || campaign.isDeleted === true) return null
  return { invite, campaign }
}

export type AcceptInviteResult =
  | {
      success: true
      campaignId: string
    }
  | {
      success: false
      error: string
    }

/**
 * Принимает приглашение: добавляет userId в campaign_members с ролью campaign-member,
 * помечает инвайт acceptedAt = сейчас.
 * Если пользователь уже участник — возвращает success без повторного добавления.
 */
export async function acceptInvite(
  ctx: app.Ctx,
  token: string,
  userId: string
): Promise<AcceptInviteResult> {
  const data = await getInviteByToken(ctx, token)
  if (!data) {
    return { success: false, error: 'Приглашение не найдено, истекло или уже использовано' }
  }
  const { invite, campaign } = data
  const campaignId = campaign.id

  const access = await memberRepo.checkCampaignAccess(ctx, campaignId, userId)
  if (access.hasAccess) {
    await CampaignInvites.update(ctx, {
      id: invite.id,
      acceptedAt: new Date().toISOString()
    })
    return { success: true, campaignId }
  }

  await memberRepo.addMember(ctx, campaignId, userId, 'campaign-member')
  await CampaignInvites.update(ctx, {
    id: invite.id,
    acceptedAt: new Date().toISOString()
  })
  return { success: true, campaignId }
}

/**
 * Список приглашений по кампании (для админки; опционально только активные).
 */
export async function listInvitesByCampaign(
  ctx: app.Ctx,
  campaignId: string,
  options?: { activeOnly?: boolean }
): Promise<Array<typeof CampaignInvites.T>> {
  const list = await CampaignInvites.findAll(ctx, {
    where: { campaignId },
    limit: 500
  })
  if (options?.activeOnly) {
    const now = Date.now()
    return list.filter(
      (i) => !i.acceptedAt && (!i.expiresAt || new Date(i.expiresAt).getTime() > now)
    )
  }
  return list
}

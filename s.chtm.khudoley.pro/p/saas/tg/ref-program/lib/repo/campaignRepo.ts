/**
 * Репозиторий кампаний (campaigns).
 * createCampaign — создание с добавлением владельца в campaign_members;
 * getCampaignById, getUserCampaigns — чтение.
 */

import { generateCampaignSecret } from '../core/refGenerator'
import * as memberRepo from './memberRepo'
import { DEFAULT_CAMPAIGN_SETTINGS } from '../../shared/constants'
import type { CampaignSettings } from '../../shared/types'
import Campaigns from '../../tables/campaigns.table'
import CampaignMembers from '../../tables/campaign_members.table'

export interface CreateCampaignInput {
  title: string
  ownerUserId: string
  settings?: Partial<CampaignSettings>
}

/**
 * Создаёт кампанию: генерирует webhookSecret, создаёт запись в campaigns,
 * добавляет владельца в campaign_members с ролью campaign-owner, возвращает кампанию.
 */
export async function createCampaign(
  ctx: app.Ctx,
  input: CreateCampaignInput
): Promise<typeof Campaigns.T> {
  const webhookSecret = generateCampaignSecret()
  const settings: CampaignSettings = {
    ...DEFAULT_CAMPAIGN_SETTINGS,
    ...input.settings
  }
  const campaign = await Campaigns.create(ctx, {
    title: input.title,
    ownerUserId: input.ownerUserId,
    webhookSecret,
    settings,
    isDeleted: false
  })
  await memberRepo.addMember(ctx, campaign.id, input.ownerUserId, 'campaign-owner')
  return campaign
}

/**
 * Возвращает кампанию по id или null.
 */
export async function getCampaignById(
  ctx: app.Ctx,
  campaignId: string
): Promise<typeof Campaigns.T | null> {
  return Campaigns.findById(ctx, campaignId)
}

/**
 * Возвращает кампанию по webhook secret (для webhook-хуков).
 * Игнорирует удалённые кампании.
 */
export async function findCampaignBySecret(
  ctx: app.Ctx,
  key: string
): Promise<typeof Campaigns.T | null> {
  const campaign = await Campaigns.findOneBy(ctx, { webhookSecret: key })
  if (!campaign || campaign.isDeleted === true) return null
  return campaign
}

/**
 * Возвращает список кампаний пользователя: по campaign_members по userId,
 * загрузка кампаний, фильтр isDeleted === false.
 */
export async function getUserCampaigns(
  ctx: app.Ctx,
  userId: string
): Promise<Array<typeof Campaigns.T>> {
  const members = await CampaignMembers.findAll(ctx, {
    where: { userId },
    limit: 1000
  })
  const campaignIds = [...new Set(members.map((m) => m.campaignId?.id).filter(Boolean))] as string[]
  if (campaignIds.length === 0) {
    return []
  }
  const campaigns = await Campaigns.findAll(ctx, {
    where: { id: campaignIds },
    limit: 1000
  })
  return campaigns.filter((c) => c.isDeleted !== true)
}

/**
 * Обновляет настройки кампании (частичное слияние с текущими settings).
 */
export async function updateCampaignSettings(
  ctx: app.Ctx,
  campaignId: string,
  settings: Partial<CampaignSettings>
): Promise<typeof Campaigns.T | null> {
  const campaign = await Campaigns.findById(ctx, campaignId)
  if (!campaign) return null
  const current = (campaign.settings as CampaignSettings) || {}
  const merged: CampaignSettings = {
    ...DEFAULT_CAMPAIGN_SETTINGS,
    ...current,
    ...settings
  }
  await Campaigns.update(ctx, { id: campaign.id, settings: merged })
  return Campaigns.findById(ctx, campaignId)
}

/**
 * Мягкое удаление кампании (isDeleted = true).
 */
export async function deleteCampaign(ctx: app.Ctx, campaignId: string): Promise<boolean> {
  const campaign = await Campaigns.findById(ctx, campaignId)
  if (!campaign) return false
  await Campaigns.update(ctx, { id: campaign.id, isDeleted: true })
  return true
}

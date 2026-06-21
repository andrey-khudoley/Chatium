/**
 * Общие константы проекта (роли кампании, дефолты настроек).
 */

import type { CampaignSettings } from './types'

// ============================================
// РОЛИ КАМПАНИИ
// ============================================

export const CAMPAIGN_ROLES = ['campaign-owner', 'campaign-member'] as const
export type CampaignRole = (typeof CAMPAIGN_ROLES)[number]

// ============================================
// ДЕФОЛТЫ CAMPAIGN SETTINGS
// ============================================

export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettings = {
  requireNewClient: false,
  products: [],
  attributionDays: null,
  botUpdatesLimit: 25,
  logLevel: 'info'
}

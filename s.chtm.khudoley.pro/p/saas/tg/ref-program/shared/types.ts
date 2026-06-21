// @shared
/**
 * Общие TypeScript-типы проекта (по плану 9.4).
 */

import type { TSaasRefVisit1Vw7KxRow } from '../tables/visits.table'
import type { TSaasRefProgramPartner3Ab7CdRow } from '../tables/partners.table'
import type { TSaasTgRefBotX7pQ2mRow } from '../tables/bots.table'
import type { TSaasRefBotUpdate7Pq3RsRow } from '../tables/bot_updates.table'
import type { TSaasRefReferral9Xy2ZkRow } from '../tables/referrals.table'
import type { ReferralAggregatesRow } from '../tables/referral_aggregates.table'
import type { TSaasRefProgramRegistration4Ab3CdRow } from '../tables/registrations.table'
import type { TSaasRefOrderTg5De6FgRow } from '../tables/orders.table'
import type { TSaasRefProgramPayment7Hi8JkRow } from '../tables/payments.table'

// ============================================
// CAMPAIGN
// ============================================

export interface CampaignSettings {
  requireNewClient: boolean
  products: string[]
  attributionDays: number | null
  botUpdatesLimit: number
  logLevel: 'info' | 'warn' | 'error' | 'disable'
}

export interface CampaignRow {
  id: string
  title: string
  ownerUserId: string
  webhookSecret: string
  settings: CampaignSettings
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

// ============================================
// CAMPAIGN MEMBER
// ============================================

export interface MemberRow {
  id: string
  campaignId: string
  userId: string
  role: string
  createdAt: string
  updatedAt: string
}

// ============================================
// PAGE
// ============================================

export interface PageRow {
  id: string
  campaignId: string
  title: string
  urlTemplate: string
  createdAt: string
  updatedAt: string
}

// ============================================
// PARTNER LINK
// ============================================

export interface PartnerLinkRow {
  id: string
  campaignId: string
  partnerId: string
  pageId: string
  publicSlug: string
  createdAt: string
  updatedAt: string
}

// ============================================
// VISIT
// ============================================

/** Строка таблицы визитов (клики по партнёрским ссылкам). Алиас к типу из tables/visits.table.ts */
export type VisitRow = TSaasRefVisit1Vw7KxRow

// ============================================
// PARTNER
// ============================================

/** Строка таблицы партнёров (Telegram-пользователи кампании). */
export type PartnerRow = TSaasRefProgramPartner3Ab7CdRow

export interface PartnerStats {
  registrations: number
  orders: number
  payments: number
  paymentsSum: number
  earnings: number
  pendingEarnings: number
}

// ============================================
// REFERRAL & EVENTS (фича 5)
// ============================================

/** Строка таблицы рефералов (без агрегатов; агрегаты в referral_aggregates). */
export type ReferralRow = TSaasRefReferral9Xy2ZkRow

/** Строка таблицы агрегатов рефералов (заказы/оплаты). */
export type ReferralAggregateRow = ReferralAggregatesRow

/** Строка таблицы регистраций. */
export type RegistrationRow = TSaasRefProgramRegistration4Ab3CdRow

/** Строка таблицы заказов. */
export type OrderRow = TSaasRefOrderTg5De6FgRow

/** Строка таблицы оплат. */
export type PaymentRow = TSaasRefProgramPayment7Hi8JkRow

// ============================================
// BOT
// ============================================

/** Строка таблицы ботов. */
export type BotRow = TSaasTgRefBotX7pQ2mRow

/** Строка таблицы апдейтов бота. */
export type BotUpdateRow = TSaasRefBotUpdate7Pq3RsRow

// ============================================
// TELEGRAM (payload от Telegram Bot API)
// ============================================

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  username?: string
  first_name?: string
  last_name?: string
}

export interface MessageEntity {
  type: string
  offset: number
  length: number
  url?: string
  user?: TelegramUser
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  entities?: MessageEntity[]
}

export interface CallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: CallbackQuery
}

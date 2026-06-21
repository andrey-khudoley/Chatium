import { requireRealUser } from '@app/auth'
import * as userSettingsRepo from '../repos/user-settings.repo'
import {
  DEFAULT_USER_TIMEZONE_OFFSET_HOURS,
  USER_TIMEZONE_OFFSET_MAX,
  USER_TIMEZONE_OFFSET_MIN,
} from '../shared/user-settings-defaults'

function clampOffsetHours(raw: number): number {
  const n = Math.round(raw)
  return Math.max(USER_TIMEZONE_OFFSET_MIN, Math.min(USER_TIMEZONE_OFFSET_MAX, n))
}

/**
 * Эффективное смещение UTC в часах: из Heap или дефолт (+3).
 */
export async function getEffectiveTimezoneOffsetHours(ctx: app.Ctx, userId: string): Promise<number> {
  const row = await userSettingsRepo.findByUserId(ctx, userId)
  if (!row) return DEFAULT_USER_TIMEZONE_OFFSET_HOURS
  const h = row.timezoneOffsetHours
  if (typeof h !== 'number' || !Number.isFinite(h)) return DEFAULT_USER_TIMEZONE_OFFSET_HOURS
  return clampOffsetHours(h)
}

export async function saveTimezoneOffsetHours(ctx: app.Ctx, userId: string, offsetHours: number): Promise<number> {
  const clamped = clampOffsetHours(offsetHours)
  await userSettingsRepo.upsertTimezone(ctx, userId, clamped)
  return clamped
}

/**
 * Смещение UTC для текущего запроса: из Heap для вошедшего пользователя, иначе дефолт (+3).
 */
export async function getTimezoneOffsetForCtxUser(ctx: app.Ctx): Promise<number> {
  if (!ctx.user) return DEFAULT_USER_TIMEZONE_OFFSET_HOURS
  try {
    const u = requireRealUser(ctx)
    return await getEffectiveTimezoneOffsetHours(ctx, u.id)
  } catch {
    return DEFAULT_USER_TIMEZONE_OFFSET_HOURS
  }
}

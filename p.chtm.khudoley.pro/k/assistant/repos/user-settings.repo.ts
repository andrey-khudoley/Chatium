import UserSettings, { type UserSettingsRow } from '../tables/user-settings.table'

export async function findByUserId(ctx: app.Ctx, userId: string): Promise<UserSettingsRow | null> {
  return UserSettings.findOneBy(ctx, { userId })
}

export async function upsertTimezone(ctx: app.Ctx, userId: string, timezoneOffsetHours: number): Promise<void> {
  await UserSettings.createOrUpdateBy(ctx, 'userId', { userId, timezoneOffsetHours })
}

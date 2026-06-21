/**
 * Репозиторий настроек — слой работы с БД.
 * Только CRUD, без бизнес-логики.
 */
import Settings from '../tables/settings.table'

export type SettingsRow = typeof Settings.T

export async function findByKey(ctx: app.Ctx, key: string): Promise<SettingsRow | null> {
  return Settings.findOneBy(ctx, { key })
}

export async function upsert(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await Settings.createOrUpdateBy(ctx, 'key', { key, value })
}

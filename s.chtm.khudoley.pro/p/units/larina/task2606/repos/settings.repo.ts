import { runWithExclusiveLock } from '@app/sync'
import Settings, { type SettingsRow } from '../tables/settings.table'

/**
 * Репозиторий настроек — слой работы с БД.
 * Только CRUD-операции, без бизнес-логики.
 * Не логируем через logger.lib: findByKey вызывается из getSetting,
 * а getSetting используется из writeServerLog — иначе получается рекурсия.
 */
export async function findByKey(ctx: app.Ctx, key: string): Promise<SettingsRow | null> {
  return Settings.findOneBy(ctx, { key })
}

export async function findAll(ctx: app.Ctx): Promise<SettingsRow[]> {
  return Settings.findAll(ctx, {})
}

export async function upsert(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await runWithExclusiveLock(ctx, `settings-upsert-${key}`, async (lockedCtx) => {
    await Settings.createOrUpdateBy(lockedCtx, 'key', { key, value })
  })
}

export async function deleteByKey(ctx: app.Ctx, key: string): Promise<void> {
  const row = await Settings.findOneBy(ctx, { key })
  if (row) {
    await Settings.delete(ctx, row.id)
  }
}

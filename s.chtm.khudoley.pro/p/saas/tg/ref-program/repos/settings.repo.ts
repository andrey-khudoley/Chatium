import Settings from '../tables/settings.table'
import type { SettingsRow } from '../tables/settings.table'

if (!Settings) {
  throw new Error(
    'Settings table is not initialized. ' +
      'Check if table "t__tg-ref-program__setting__7Fk2Qw" exists in Heap and is properly exported from tables/settings.table.ts'
  )
}

/**
 * Репозиторий настроек — слой работы с БД.
 * Только CRUD-операции, без бизнес-логики.
 */
export async function findByKey(ctx: app.Ctx, key: string): Promise<SettingsRow | null> {
  return Settings.findOneBy(ctx, { key })
}

export async function findAll(ctx: app.Ctx): Promise<SettingsRow[]> {
  return Settings.findAll(ctx, {})
}

export async function upsert(ctx: app.Ctx, key: string, value: unknown): Promise<void> {
  await Settings.createOrUpdateBy(ctx, 'key', { key, value })
}

export async function deleteByKey(ctx: app.Ctx, key: string): Promise<void> {
  const row = await Settings.findOneBy(ctx, { key })
  if (row) {
    await Settings.delete(ctx, row.id)
  }
}

import SpinGrants, { type SpinGrantsRow } from '../tables/spinGrants.table'

/**
 * Репозиторий дополнительных попыток — слой работы с БД.
 * Только write/sum операции, без бизнес-логики.
 * Не логирует через writeServerLog — избегаем рекурсии (аналогично settings/logs repo).
 */

/**
 * Суммарное количество дополнительных попыток для email.
 * Heap не имеет нативного sum, поэтому читаем все grants по email и суммируем поле count.
 * Email должен быть нормализован вызывающим.
 */
export async function sumByEmail(ctx: app.Ctx, email: string): Promise<number> {
  const rows = await SpinGrants.findAll(ctx, { where: { email } })
  return rows.reduce((acc, row) => acc + (row.count ?? 0), 0)
}

/** Создаёт запись о выдаче дополнительных попыток. Email должен быть нормализован вызывающим. */
export async function create(
  ctx: app.Ctx,
  data: { email: string; count: number; grantedAt: number }
): Promise<SpinGrantsRow> {
  return SpinGrants.create(ctx, data)
}

/**
 * Удаляет все записи SpinGrants и возвращает число удалённых (§8.5).
 * Используется сбросом колеса (§11.8).
 * limit: null обязателен — без него Heap удалит только 1 запись.
 */
export async function deleteAll(ctx: app.Ctx): Promise<number> {
  const deletedCount = await SpinGrants.deleteAll(ctx, { limit: null })
  return deletedCount
}

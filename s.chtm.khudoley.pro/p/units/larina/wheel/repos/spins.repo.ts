import Spins, { type SpinsRow } from '../tables/spins.table'
import * as segmentsRepo from './segments.repo'

/**
 * Репозиторий вращений колеса — слой работы с БД.
 * Только write/count/read операции, без бизнес-логики.
 * Не логирует через writeServerLog — избегаем рекурсии (аналогично settings/logs repo).
 */

/** Публичная форма строки победителя (без полного email). */
export type RecentSpinRow = {
  email: string
  prize: string
  timestamp: number
}

/** Количество вращений для указанного email. Email должен быть нормализован вызывающим. */
export async function countByEmail(ctx: app.Ctx, email: string): Promise<number> {
  return Spins.countBy(ctx, { email })
}

/**
 * Количество выигрышей по сегменту (фильтр по RefLink-полю segment).
 * Используется при проверке maxWins. segmentId — id записи в Segments.
 */
export async function countBySegment(ctx: app.Ctx, segmentId: string): Promise<number> {
  return Spins.countBy(ctx, { segment: segmentId })
}

/** Создаёт запись о вращении. Email должен быть нормализован вызывающим. */
export async function create(
  ctx: app.Ctx,
  data: { email: string; segment: string; timestamp: number }
): Promise<SpinsRow> {
  return Spins.create(ctx, data)
}

/**
 * Последние победы для пагинации (§8.4, §6.6).
 * Для каждой записи резолвит название приза через segments.repo.findById по RefLink-полю segment.
 * RefLink runtime — объект с .id: string; используется .id для получения сегмента.
 * email возвращается полным — маскировку выполняет вызывающий API-слой.
 */
export async function findRecent(
  ctx: app.Ctx,
  limit: number,
  offset = 0
): Promise<RecentSpinRow[]> {
  const rows = await Spins.findAll(ctx, {
    order: [{ timestamp: 'desc' }],
    limit,
    offset
  })

  const result: RecentSpinRow[] = []
  for (const row of rows) {
    // Defensive null-guard (§8.4): RefLink обычно присутствует (поле обязательное), но при
    // повреждении/ручной правке данных может быть пустым — не роняем всю выдачу из-за одной строки.
    const segmentId = row.segment?.id
    const segRow = segmentId ? await segmentsRepo.findById(ctx, segmentId) : null
    const prize = segRow?.full || segRow?.label || ''
    result.push({ email: row.email, prize, timestamp: row.timestamp })
  }
  return result
}

/**
 * Удаляет все записи Spins и возвращает число удалённых (§8.4).
 * Используется сбросом колеса (§11.8).
 * limit: null обязателен — без него Heap удалит только 1 запись.
 */
export async function deleteAll(ctx: app.Ctx): Promise<number> {
  const deletedCount = await Spins.deleteAll(ctx, { limit: null })
  return deletedCount
}

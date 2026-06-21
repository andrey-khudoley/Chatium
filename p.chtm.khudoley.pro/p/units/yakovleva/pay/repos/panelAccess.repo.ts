/**
 * Репозиторий выданных доступов к панели (ADR 0003, implementation-plan §1.11.3).
 *
 * Слой работы с БД: только Heap-операции, без бизнес-логики.
 *
 * Одна запись на пользователя (уникальность `userId` — на уровне приложения,
 * см. `lib/access/invites.consumeInvite`). Запись с непустым `revokedAt`
 * считается недействительной. Повторная выдача доступа тому же пользователю —
 * обновление существующей записи (сброс `revokedAt`/`revokedByUserId`).
 */

import { PanelAccess } from '../tables/panelAccess.table'
import type { PanelAccessRow } from '../tables/panelAccess.table'
import { collectAllPaged } from '../lib/heapPaging'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/panelAccess.repo'

/** Любая запись по `userId` (активная или отозванная). */
export async function findByUserId(ctx: app.Ctx, userId: string): Promise<PanelAccessRow | null> {
  return PanelAccess.findOneBy(ctx, { userId })
}

/** Активная (не отозванная) запись по `userId`, либо null. */
export async function findActiveByUserId(
  ctx: app.Ctx,
  userId: string
): Promise<PanelAccessRow | null> {
  const row = await PanelAccess.findOneBy(ctx, { userId })
  if (!row || row.revokedAt) {
    return null
  }
  return row
}

export type UpsertGrantPayload = {
  userId: string
  grantedByUserId: string
  inviteId: string
}

/**
 * Создать грант или реактивировать существующий для того же `userId`.
 * При реактивации сбрасывает `revokedAt`/`revokedByUserId` и проставляет новые
 * `grantedAt`/`grantedByUserId`/`inviteId`.
 */
export async function upsertGrant(
  ctx: app.Ctx,
  payload: UpsertGrantPayload
): Promise<PanelAccessRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] upsertGrant entry`,
    payload: { userId: payload.userId, inviteId: payload.inviteId }
  })

  const existing = await PanelAccess.findOneBy(ctx, { userId: payload.userId })
  const grantedAt = Date.now()

  let row: PanelAccessRow
  if (existing) {
    row = await PanelAccess.update(ctx, {
      id: existing.id,
      grantedAt,
      grantedByUserId: payload.grantedByUserId,
      inviteId: payload.inviteId,
      revokedAt: null,
      revokedByUserId: null
    })
  } else {
    row = await PanelAccess.create(ctx, {
      userId: payload.userId,
      grantedAt,
      grantedByUserId: payload.grantedByUserId,
      inviteId: payload.inviteId
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] upsertGrant exit`,
    payload: { userId: payload.userId, grantId: row.id, reactivated: !!existing }
  })
  return row
}

/** Отозвать активный доступ пользователя. No-op, если записи нет. */
export async function revokeByUserId(
  ctx: app.Ctx,
  userId: string,
  revokedByUserId: string
): Promise<boolean> {
  const row = await PanelAccess.findOneBy(ctx, { userId })
  if (!row) {
    return false
  }
  await PanelAccess.update(ctx, {
    id: row.id,
    revokedAt: Date.now(),
    revokedByUserId
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] revokeByUserId`,
    payload: { userId, grantId: row.id }
  })
  return true
}

/**
 * Все записи грантов (активные и отозванные) для списка в админке.
 * Через `collectAllPaged` — иначе при >1000 грантов список тихо усекается
 * (Heap.findAll отдаёт максимум 1000 строк, 008-heap.md).
 */
export async function findAll(ctx: app.Ctx): Promise<PanelAccessRow[]> {
  return collectAllPaged((limit, offset) =>
    PanelAccess.findAll(ctx, { order: [{ grantedAt: 'desc' }], limit, offset })
  )
}

/** Удалить грант пользователя (используется в тестах для очистки). No-op, если записи нет. */
export async function deleteByUserId(ctx: app.Ctx, userId: string): Promise<void> {
  const row = await PanelAccess.findOneBy(ctx, { userId })
  if (row) {
    await PanelAccess.delete(ctx, row.id)
  }
}

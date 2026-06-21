/**
 * Репозиторий пригласительных токенов (внутренняя система доступов).
 *
 * Слой работы с БД: только Heap-операции, без бизнес-логики.
 *
 * Уникальность `token` — на уровне приложения (случайный токен ≥ 32 символа +
 * параллельные потребления защищены `runWithExclusiveLock` в `lib/access/invites`).
 */

import PanelInvites, { type PanelInvitesRow } from '../tables/panelInvites.table'
import { collectAllPaged } from '../lib/heapPaging'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/panelInvites.repo'

export async function findByToken(ctx: app.Ctx, token: string): Promise<PanelInvitesRow | null> {
  return PanelInvites.findOneBy(ctx, { token })
}

export async function findById(ctx: app.Ctx, id: string): Promise<PanelInvitesRow | null> {
  const rows = await PanelInvites.findAll(ctx, { where: { id }, limit: 1 })
  return rows[0] ?? null
}

export type CreateInvitePayload = {
  token: string
  createdByUserId: string
  issuedAt: number
  expiresAt: number
  note?: string
}

export async function create(ctx: app.Ctx, payload: CreateInvitePayload): Promise<PanelInvitesRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    // токен в логи не пишем
    payload: { createdByUserId: payload.createdByUserId, hasNote: !!payload.note }
  })
  const data: Record<string, unknown> = {
    token: payload.token,
    createdByUserId: payload.createdByUserId,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt
  }
  if (payload.note !== undefined) {
    data.note = payload.note
  }
  const row = await PanelInvites.create(ctx, data as Parameters<typeof PanelInvites.create>[1])
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { inviteId: row.id }
  })
  return row
}

/** Пометить инвайт использованным. */
export async function markUsed(
  ctx: app.Ctx,
  inviteId: string,
  usedByUserId: string,
  usedAt: number
): Promise<void> {
  await PanelInvites.update(ctx, {
    id: inviteId,
    usedAt,
    usedByUserId
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] markUsed`,
    payload: { inviteId, usedByUserId }
  })
}

/** Отозвать инвайт Admin'ом. */
export async function revokeById(ctx: app.Ctx, inviteId: string, revokedAt: number): Promise<void> {
  await PanelInvites.update(ctx, {
    id: inviteId,
    revokedAt
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] revokeById`,
    payload: { inviteId }
  })
}

/**
 * Все инвайты (для списка в админке), свежие первыми.
 * Через `collectAllPaged` — инвайты со временем копятся (не удаляются, лишь
 * помечаются used/revoked), поэтому без пагинации >1000 записей тихо усекаются.
 */
export async function findAll(ctx: app.Ctx): Promise<PanelInvitesRow[]> {
  return collectAllPaged((limit, offset) =>
    PanelInvites.findAll(ctx, { order: [{ issuedAt: 'desc' }], limit, offset })
  )
}

/** Удалить инвайт по id (используется в тестах для очистки). */
export async function deleteById(ctx: app.Ctx, id: string): Promise<void> {
  await PanelInvites.delete(ctx, id)
}

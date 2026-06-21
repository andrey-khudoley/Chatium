/**
 * Управление пригласительными ссылками и грантами доступа
 * (ADR 0003, implementation-plan §1.11.3).
 *
 * Жизненный цикл инвайта: создан Admin → передан получателю → потреблён
 * по «Подтвердить» (`consumeInvite`). Сам переход по ссылке инвайт **не** расходует.
 * Потребление атомарно (`runWithExclusiveLock`) и помечает инвайт `used` только
 * в самом конце, после успешного создания гранта.
 */

import { runWithExclusiveLock } from '@app/sync'
import { accountNanoid } from '@app/nanoid'

import * as panelAccessRepo from '../../repos/panelAccess.repo'
import * as panelInvitesRepo from '../../repos/panelInvites.repo'
import type { PanelInvitesRow } from '../../tables/panelInvites.table'
import { getFullUrl, ROUTE_PATHS } from '../../config/routes'
import { INVITE_TTL_MS, INVITE_CONSUME_LOCK_PREFIX } from './constants'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/access/invites'

export type InviteState = 'unknown' | 'used' | 'revoked' | 'expired' | 'valid'

export type InviteLike = {
  usedAt?: number | null
  revokedAt?: number | null
  expiresAt: number
}

/**
 * Чистая классификация состояния инвайта (тестируется юнитами без Heap).
 * Приоритет: used > revoked > expired (§1.11.4): уже использованный инвайт
 * остаётся «использованным» даже если параллельно истёк или отозван.
 */
export function classifyInvite(invite: InviteLike | null | undefined, now: number): InviteState {
  if (!invite) return 'unknown'
  if (invite.usedAt != null) return 'used'
  if (invite.revokedAt != null) return 'revoked'
  if (now > invite.expiresAt) return 'expired'
  return 'valid'
}

function requireUserId(ctx: app.Ctx): string {
  const id = ctx.user?.id
  if (!id) {
    throw new Error('requireUserId: ctx.user отсутствует (ожидался requireRealUser)')
  }
  return id
}

export type GenerateInviteResult = {
  inviteId: string
  token: string
  fullUrl: string
  expiresAt: number
}

/**
 * Сгенерировать пригласительную ссылку. Admin-only внутри (caller обязан был
 * вызвать `requireAccountRole(ctx, 'Admin')`). Токен ≥ 32 символа: два
 * `accountNanoid` (каждый ~21 символ) гарантируют длину.
 */
export async function generateInvite(
  ctx: app.Ctx,
  options?: { note?: string }
): Promise<GenerateInviteResult> {
  const createdByUserId = requireUserId(ctx)
  const token = `${accountNanoid(ctx)}${accountNanoid(ctx)}`
  const issuedAt = Date.now()
  const expiresAt = issuedAt + INVITE_TTL_MS

  const note = options?.note?.trim()
  const row = await panelInvitesRepo.create(ctx, {
    token,
    createdByUserId,
    issuedAt,
    expiresAt,
    ...(note ? { note } : {})
  })

  // Абсолютный URL: ссылку Admin копирует и передаёт получателю вне системы,
  // поэтому нужен полный адрес с host текущего воркспэйса (зеркало webhookUrl в index.tsx).
  const fullUrl = `https://${ctx.account.host}${getFullUrl(ROUTE_PATHS.accessInvite)}?token=${token}`

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] invite_generated`,
    // токен в логи не пишем (§1.11.5)
    payload: { inviteId: row.id, createdByUserId }
  })

  return { inviteId: row.id, token, fullUrl, expiresAt }
}

export type ConsumeInviteResult =
  | { ok: true; grantId: string }
  | { ok: false; reason: Exclude<InviteState, 'valid'> | 'already_has_access' }

/**
 * Потребить инвайт (нажатие «Подтвердить» авторизованным пользователем).
 * Под `runWithExclusiveLock` по токену — гонки и двойное потребление закрыты.
 * Любая ветка отказа инвайт **не трогает** (см. §1.11.3).
 */
export async function consumeInvite(ctx: app.Ctx, token: string): Promise<ConsumeInviteResult> {
  const userId = requireUserId(ctx)
  const lockKey = `${INVITE_CONSUME_LOCK_PREFIX}${token}`

  return runWithExclusiveLock(
    ctx,
    lockKey,
    async (lockCtx: app.Ctx): Promise<ConsumeInviteResult> => {
      const now = Date.now()
      const invite = await panelInvitesRepo.findByToken(lockCtx, token)
      const state = classifyInvite(invite, now)

      // unknown / used / revoked / expired — инвайт не модифицируем.
      if (state !== 'valid' || !invite) {
        await loggerLib.writeServerLog(lockCtx, {
          severity: 6,
          message: `[${LOG_MODULE}] invite_invalid`,
          payload: { reason: state, userId, inviteId: invite?.id ?? null }
        })
        return { ok: false, reason: state as Exclude<InviteState, 'valid'> }
      }

      // У пользователя уже есть активный доступ — инвайт не расходуем (может пригодиться другому).
      const activeGrant = await panelAccessRepo.findActiveByUserId(lockCtx, userId)
      if (activeGrant) {
        return { ok: false, reason: 'already_has_access' }
      }

      // Создаём грант, и только ПОТОМ помечаем инвайт использованным.
      const grant = await panelAccessRepo.upsertGrant(lockCtx, {
        userId,
        grantedByUserId: invite.createdByUserId,
        inviteId: invite.id
      })
      await panelInvitesRepo.markUsed(lockCtx, invite.id, userId, now)

      await loggerLib.writeServerLog(lockCtx, {
        severity: 6,
        message: `[${LOG_MODULE}] invite_consumed`,
        payload: { inviteId: invite.id, userId, grantId: grant.id }
      })

      return { ok: true, grantId: grant.id }
    }
  )
}

/** Read-only чтение инвайта по токену (для страницы; не расходует инвайт). */
export async function getInviteByToken(
  ctx: app.Ctx,
  token: string
): Promise<PanelInvitesRow | null> {
  return panelInvitesRepo.findByToken(ctx, token)
}

/** Отозвать неиспользованный инвайт. Admin-only внутри (caller проверил роль). */
export async function revokeInvite(ctx: app.Ctx, inviteId: string): Promise<void> {
  await panelInvitesRepo.revokeById(ctx, inviteId, Date.now())
}

/** Отозвать выданный доступ пользователя. Admin-only внутри (caller проверил роль). */
export async function revokeGrant(ctx: app.Ctx, userId: string): Promise<boolean> {
  const revokedByUserId = requireUserId(ctx)
  return panelAccessRepo.revokeByUserId(ctx, userId, revokedByUserId)
}

/**
 * Внутренняя проверка прав доступа к панели (ADR 0003, implementation-plan §1.11.2).
 *
 * Вызывать ПОСЛЕ `requireRealUser(ctx)`. Модель:
 *   - Admin Chatium-аккаунта проходит всегда.
 *   - Иначе нужна активная (не отозванная) запись в `panel_access` по `userId`.
 *   - Нет записи / отозвана → `InternalAccessDeniedError`.
 *
 * Для HTML-роутов вызывающий перехватывает ошибку и редиректит на `/web/forbidden`.
 * Для API-роутов — возвращает HTTP 403 JSON.
 */

import * as panelAccessRepo from '../../repos/panelAccess.repo'
import { INTERNAL_ACCESS_DENIED } from './constants'
import * as loggerLib from '../logger.lib'

const LOG_MODULE = 'lib/access/requireInternalAccess'

export class InternalAccessDeniedError extends Error {
  code = INTERNAL_ACCESS_DENIED
  constructor(message: string) {
    super(message)
    this.name = 'InternalAccessDeniedError'
  }
}

/**
 * Чистое решение о доступе. Тестируется юнитами без Heap.
 * @param isAdmin    — `ctx.user.is('Admin')`.
 * @param hasActiveGrant — есть ли активная (не отозванная) запись в `panel_access`.
 */
export function decideInternalAccess(isAdmin: boolean, hasActiveGrant: boolean): boolean {
  return isAdmin || hasActiveGrant
}

/**
 * Бросает `InternalAccessDeniedError`, если у текущего пользователя нет доступа.
 * Предполагает, что `requireRealUser(ctx)` уже вызван (есть `ctx.user`).
 */
export async function requireInternalAccess(ctx: app.Ctx): Promise<void> {
  const user = ctx.user
  if (!user) {
    throw new InternalAccessDeniedError('no user (requireRealUser must run first)')
  }

  const isAdmin = user.is('Admin')
  // Heap-запрос только для не-Admin (Admin проходит всегда).
  const hasActiveGrant = isAdmin
    ? false
    : (await panelAccessRepo.findActiveByUserId(ctx, user.id)) !== null

  if (!decideInternalAccess(isAdmin, hasActiveGrant)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] access_denied`,
      payload: { userId: user.id }
    })
    throw new InternalAccessDeniedError(`user ${user.id} not in panel_access`)
  }
}

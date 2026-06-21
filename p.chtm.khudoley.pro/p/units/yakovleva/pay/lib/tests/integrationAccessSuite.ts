/**
 * Интеграционные проверки внутренней авторизации (ADR 0003, §1.11).
 * Heap-зависимые сценарии: лайфцикл гранта, генерация/потребление инвайта.
 * Каждый тест убирает за собой созданные записи.
 *
 * Вынесено из integrationSuite ради лимита размера файла.
 */
import { requireInternalAccess } from '../access/requireInternalAccess'
import { generateInvite, consumeInvite, getInviteByToken } from '../access/invites'
import * as panelAccessRepo from '../../repos/panelAccess.repo'
import * as panelInvitesRepo from '../../repos/panelInvites.repo'
import { type TemplateIntegrationTestResult, push, tryAsync } from './integrationSuiteHelpers'

export async function runAccessIntegrationChecks(
  ctx: app.Ctx,
  results: TemplateIntegrationTestResult[],
  admin: boolean
): Promise<void> {
  const uid = (ctx as { user?: { id?: string } }).user?.id ?? ''

  function uniqToken(): string {
    return `tkn_test_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  // requireInternalAccess для Admin — не бросает.
  if (admin) {
    await tryAsync(
      results,
      'access_require_admin_passes',
      'requireInternalAccess(admin) не бросает',
      async () => {
        await requireInternalAccess(ctx)
        return true
      }
    )
  } else {
    push(
      results,
      'access_require_admin_passes',
      'requireInternalAccess(admin)',
      false,
      'нужна роль Admin'
    )
  }

  // Лайфцикл гранта на фиктивном userId (без зависимости от роли).
  await tryAsync(
    results,
    'access_repo_grant_lifecycle',
    'panelAccess upsert/active/revoke',
    async () => {
      const fakeUser = `__test_user_${Date.now()}`
      try {
        await panelAccessRepo.upsertGrant(ctx, {
          userId: fakeUser,
          grantedByUserId: uid || 'x',
          inviteId: 'test'
        })
        const activeAfter = await panelAccessRepo.findActiveByUserId(ctx, fakeUser)
        await panelAccessRepo.revokeByUserId(ctx, fakeUser, uid || 'x')
        const activeAfterRevoke = await panelAccessRepo.findActiveByUserId(ctx, fakeUser)
        return activeAfter !== null && activeAfterRevoke === null
      } finally {
        await panelAccessRepo.deleteByUserId(ctx, fakeUser)
      }
    }
  )

  // generateInvite: токен ≥ 32 символа, fullUrl содержит token.
  await tryAsync(
    results,
    'access_invite_generate_token_min_32',
    'generateInvite: токен ≥ 32',
    async () => {
      const inv = await generateInvite(ctx, { note: 'integration-test' })
      try {
        return inv.token.length >= 32 && inv.fullUrl.indexOf('token=') !== -1
      } finally {
        await panelInvitesRepo.deleteById(ctx, inv.inviteId)
      }
    }
  )

  // getInviteByToken не расходует инвайт.
  await tryAsync(
    results,
    'access_invite_get_does_not_consume',
    'getInviteByToken не помечает used',
    async () => {
      const token = uniqToken()
      const row = await panelInvitesRepo.create(ctx, {
        token,
        createdByUserId: uid || 'x',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3_600_000
      })
      try {
        const a = await getInviteByToken(ctx, token)
        const b = await getInviteByToken(ctx, token)
        return !!a && !!b && a.usedAt == null && b.usedAt == null
      } finally {
        await panelInvitesRepo.deleteById(ctx, row.id)
      }
    }
  )

  // consumeInvite: истёкший → expired, инвайт не тронут.
  await tryAsync(results, 'access_invite_consume_expired', 'consumeInvite: expired', async () => {
    const token = uniqToken()
    const row = await panelInvitesRepo.create(ctx, {
      token,
      createdByUserId: uid || 'x',
      issuedAt: Date.now() - 10_000,
      expiresAt: Date.now() - 1_000
    })
    try {
      const res = await consumeInvite(ctx, token)
      const reload = await panelInvitesRepo.findByToken(ctx, token)
      return !res.ok && res.reason === 'expired' && !!reload && reload.usedAt == null
    } finally {
      await panelInvitesRepo.deleteById(ctx, row.id)
    }
  })

  // consumeInvite: отозванный → revoked, инвайт не тронут.
  await tryAsync(results, 'access_invite_consume_revoked', 'consumeInvite: revoked', async () => {
    const token = uniqToken()
    const row = await panelInvitesRepo.create(ctx, {
      token,
      createdByUserId: uid || 'x',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3_600_000
    })
    await panelInvitesRepo.revokeById(ctx, row.id, Date.now())
    try {
      const res = await consumeInvite(ctx, token)
      const reload = await panelInvitesRepo.findByToken(ctx, token)
      return !res.ok && res.reason === 'revoked' && !!reload && reload.usedAt == null
    } finally {
      await panelInvitesRepo.deleteById(ctx, row.id)
    }
  })

  // Полный поток: consume(ok) → создаётся грант и used; повторный consume → used.
  await tryAsync(
    results,
    'access_invite_consume_flow',
    'consumeInvite: ok → grant + used; повтор → used',
    async () => {
      // Гарантируем чистое состояние для текущего пользователя.
      await panelAccessRepo.deleteByUserId(ctx, uid)
      const inv = await generateInvite(ctx, { note: 'flow-test' })
      try {
        const res1 = await consumeInvite(ctx, inv.token)
        const afterUse = await panelInvitesRepo.findByToken(ctx, inv.token)
        const grant = await panelAccessRepo.findActiveByUserId(ctx, uid)
        const res2 = await consumeInvite(ctx, inv.token)
        return (
          res1.ok === true &&
          !!afterUse &&
          afterUse.usedAt != null &&
          grant !== null &&
          res2.ok === false &&
          res2.reason === 'used'
        )
      } finally {
        await panelAccessRepo.deleteByUserId(ctx, uid)
        await panelInvitesRepo.deleteById(ctx, inv.inviteId)
      }
    }
  )

  // already_has_access: у пользователя есть грант → свежий инвайт не расходуется.
  await tryAsync(
    results,
    'access_invite_already_has_access',
    'consumeInvite: already_has_access не расходует',
    async () => {
      await panelAccessRepo.deleteByUserId(ctx, uid)
      await panelAccessRepo.upsertGrant(ctx, {
        userId: uid,
        grantedByUserId: uid || 'x',
        inviteId: 'pre'
      })
      const inv = await generateInvite(ctx, { note: 'aha-test' })
      try {
        const res = await consumeInvite(ctx, inv.token)
        const reload = await panelInvitesRepo.findByToken(ctx, inv.token)
        return !res.ok && res.reason === 'already_has_access' && !!reload && reload.usedAt == null
      } finally {
        await panelAccessRepo.deleteByUserId(ctx, uid)
        await panelInvitesRepo.deleteById(ctx, inv.inviteId)
      }
    }
  )
}

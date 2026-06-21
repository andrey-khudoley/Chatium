/**
 * Фаза 5 юнит-сьюта LifePay: correlation-id и контроль внутреннего доступа.
 *
 *   - runCorrelationChecks: generateCorrelationId, appendCorrelationId,
 *     extractCorrelationId, mergeWebhooksById;
 *   - runAccessChecks: classifyInvite (5 веток + precedence) и decideInternalAccess.
 */

import { classifyInvite } from '../access/invites'
import { decideInternalAccess } from '../access/requireInternalAccess'
import {
  generateCorrelationId,
  appendCorrelationId,
  extractCorrelationId,
  mergeWebhooksById
} from '../../shared/correlation'
import { tryPush, type LifepayUnitTestResult } from './lifepayUnitHelpers'

export function runCorrelationChecks(results: LifepayUnitTestResult[]): void {
  tryPush(
    results,
    'lp_correlation_generate_nonempty',
    'generateCorrelationId возвращает непустые уникальные строки',
    () => {
      const a = generateCorrelationId()
      const b = generateCorrelationId()
      return typeof a === 'string' && a.length > 0 && typeof b === 'string' && a !== b
    }
  )

  tryPush(
    results,
    'lp_correlation_append_valid',
    'appendCorrelationId добавляет correlationId в валидный URL',
    () => {
      const r = appendCorrelationId('https://x.test/webhooks/lifepay', 'cid-1')
      return r.appended === true && r.url.includes('correlationId=cid-1')
    }
  )

  tryPush(
    results,
    'lp_correlation_append_preserves_token',
    'appendCorrelationId сохраняет существующий token в callbackUrl',
    () => {
      const r = appendCorrelationId('https://x.test/webhooks/lifepay?token=ABC', 'cid-2')
      return (
        r.appended === true && r.url.includes('token=ABC') && r.url.includes('correlationId=cid-2')
      )
    }
  )

  tryPush(
    results,
    'lp_correlation_append_invalid',
    'appendCorrelationId на невалидном URL возвращает оригинал без падения',
    () => {
      const r = appendCorrelationId('not-a-url', 'cid-3')
      return r.appended === false && r.url === 'not-a-url'
    }
  )

  tryPush(
    results,
    'lp_correlation_extract_present',
    'extractCorrelationId извлекает значение из объекта',
    () =>
      extractCorrelationId({ correlationId: 'cid-4' }) === 'cid-4' &&
      extractCorrelationId({ correlationId: '  cid-5  ' }) === 'cid-5'
  )

  tryPush(
    results,
    'lp_correlation_extract_absent',
    'extractCorrelationId возвращает "" при отсутствии/неверном типе',
    () =>
      extractCorrelationId({}) === '' &&
      extractCorrelationId(null) === '' &&
      extractCorrelationId({ correlationId: 42 }) === '' &&
      extractCorrelationId({ correlationId: '' }) === ''
  )

  tryPush(
    results,
    'lp_correlation_merge_dedup',
    'mergeWebhooksById убирает дубли по id и сортирует по processedAt desc',
    () => {
      const a = [
        { id: 'w1', processedAt: 100 },
        { id: 'w2', processedAt: 300 }
      ]
      const b = [
        { id: 'w2', processedAt: 300 },
        { id: 'w3', processedAt: 200 }
      ]
      const merged = mergeWebhooksById(a, b)
      return (
        merged.length === 3 &&
        merged[0]?.id === 'w2' &&
        merged[1]?.id === 'w3' &&
        merged[2]?.id === 'w1'
      )
    }
  )
}

export function runAccessChecks(results: LifepayUnitTestResult[]): void {
  const now = 1_000_000

  // classifyInvite
  tryPush(
    results,
    'access_classify_unknown',
    'classifyInvite(null) → unknown',
    () => classifyInvite(null, now) === 'unknown'
  )
  tryPush(
    results,
    'access_classify_used',
    'classifyInvite(usedAt) → used',
    () => classifyInvite({ usedAt: 5, expiresAt: now + 1000 }, now) === 'used'
  )
  tryPush(
    results,
    'access_classify_revoked',
    'classifyInvite(revokedAt) → revoked',
    () => classifyInvite({ revokedAt: 5, expiresAt: now + 1000 }, now) === 'revoked'
  )
  tryPush(
    results,
    'access_classify_expired',
    'classifyInvite(expiresAt<now) → expired',
    () => classifyInvite({ expiresAt: now - 1 }, now) === 'expired'
  )
  tryPush(
    results,
    'access_classify_valid',
    'classifyInvite(свежий) → valid',
    () => classifyInvite({ expiresAt: now + 1000 }, now) === 'valid'
  )
  tryPush(
    results,
    'access_classify_used_precedence',
    'classifyInvite: used приоритетнее revoked/expired',
    () => classifyInvite({ usedAt: 5, revokedAt: 5, expiresAt: now - 1 }, now) === 'used'
  )

  // decideInternalAccess
  tryPush(
    results,
    'access_decide_admin',
    'decideInternalAccess(admin) → true',
    () => decideInternalAccess(true, false) === true
  )
  tryPush(
    results,
    'access_decide_grant',
    'decideInternalAccess(grant) → true',
    () => decideInternalAccess(false, true) === true
  )
  tryPush(
    results,
    'access_decide_none',
    'decideInternalAccess(нет) → false',
    () => decideInternalAccess(false, false) === false
  )
}

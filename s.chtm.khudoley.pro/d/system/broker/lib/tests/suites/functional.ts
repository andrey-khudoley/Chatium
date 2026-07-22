import { validatePatterns, matchesGlob, expandAncestors } from '../../broker/glob'
import { hashModuleToken } from '../../broker/token'
import { shouldLog, buildSocketEvent, type ServerLogEntry } from '../../log/logger'
import { fetchDeliveriesCore } from '../../broker/pull'
import { brokerDeadDeliveryFn } from '../../../api/broker/internal/dead'
import { BrokerEvents } from '../../../tables/events.table'
import { BrokerDeliveries } from '../../../tables/deliveries.table'
import { LAST_ERROR_MAX } from '../../../config/constants'
import { makeUniq, testModuleKey, registerTestModule, retryRead, assert } from '../helpers'
import type { TestImpl } from '../types'

async function test_glob_validation(): Promise<string> {
  assert(
    validatePatterns(['tasks.*', '*', 'finance.payment.created']) === null,
    'валидные паттерны отвергнуты'
  )
  assert(validatePatterns(['tasks.cr*']) !== null, 'частично-сегментный паттерн должен отвергаться')
  assert(validatePatterns(['**']) !== null, "'**' должен отвергаться")
  assert(validatePatterns(['']) !== null, 'пустой паттерн должен отвергаться')
  return 'validatePatterns отклоняет частично-сегментные/**/пустые паттерны'
}

async function test_glob_match_expand(): Promise<string> {
  const ancestors = expandAncestors('tasks.created')
  assert(
    ancestors.length === 3 &&
      ancestors[0] === '*' &&
      ancestors[1] === 'tasks.*' &&
      ancestors[2] === 'tasks.created',
    `неверная развёртка предков: ${JSON.stringify(ancestors)}`
  )
  assert(matchesGlob('tasks.created', 'tasks.*'), 'tasks.* должен матчить tasks.created')
  assert(
    matchesGlob('tasks.created.done', 'tasks.*'),
    'tasks.* должен матчить более глубокий tasks.created.done'
  )
  assert(!matchesGlob('orders.created', 'tasks.*'), 'tasks.* не должен матчить orders.created')
  assert(matchesGlob('anything', '*'), "'*' должен матчить любой тип")
  return 'expandAncestors/matchesGlob работают корректно (ADR-0008)'
}

async function test_sha256_token_hash(): Promise<string> {
  const hash = await hashModuleToken('demo', 'token123')
  assert(/^[0-9a-f]{64}$/.test(hash), `хэш не похож на SHA-256 hex: ${hash}`)
  const hash2 = await hashModuleToken('demo', 'token123')
  assert(hash === hash2, 'хэш должен быть детерминирован')
  const hash3 = await hashModuleToken('demo2', 'token123')
  assert(hash !== hash3, 'хэш должен зависеть от moduleKey (доменное разделение §5.1)')
  return 'hashModuleToken выдаёт детерминированный SHA-256 hex с доменным разделением'
}

async function test_log_level_cutoff(): Promise<string> {
  assert(shouldLog('Disable', 'fatal') === false, 'Disable не должен пропускать даже fatal')
  assert(shouldLog('Error', 'error') === true, 'Error должен пропускать error')
  assert(shouldLog('Error', 'warn') === false, 'Error не должен пропускать warn')
  assert(shouldLog('Warn', 'warn') === true, 'Warn должен пропускать warn')
  assert(shouldLog('Info', 'info') === true, 'Info должен пропускать info')
  assert(shouldLog('Info', 'debug') === false, 'Info не должен пропускать debug')
  assert(shouldLog('Debug', 'trace') === true, 'Debug должен пропускать trace (debug-класс)')
  return 'shouldLog реализует таблицу отсечки §5.10.4'
}

async function test_socket_payload_debug_only(): Promise<string> {
  const entry: ServerLogEntry = { level: 'info', message: 'probe', payload: { secret: 1 } }
  const eventInfo = buildSocketEvent(entry, 'Info')
  assert(
    eventInfo.data.payload === undefined,
    'payload не должен попадать в сокет-событие на уровне Info'
  )
  const eventDebug = buildSocketEvent(entry, 'Debug')
  assert(
    eventDebug.data.payload !== undefined,
    'payload должен попадать в сокет-событие на уровне Debug'
  )
  return 'buildSocketEvent кладёт payload только при log_level=Debug (§5.10.5)'
}

async function test_fetch_limit_clamp(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'clamp')
  const reg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: ['*']
  })
  assert(reg.success, `регистрация не удалась: ${JSON.stringify(reg)}`)

  for (let i = 0; i < 3; i++) {
    const ev = await BrokerEvents.create(ctx, {
      eventType: 'test.clamp.probe',
      schemaVersion: 1,
      producerModuleKey: moduleKey,
      payload: null,
      dispatchedAt: Date.now()
    })
    await BrokerDeliveries.create(ctx, {
      eventId: ev.id,
      eventType: ev.eventType,
      schemaVersion: 1,
      payload: null,
      subscriberModuleKey: moduleKey,
      status: 'pending',
      claimCount: 0
    })
  }

  const result = await fetchDeliveriesCore(ctx, { moduleKey, authToken: reg.authToken, limit: 0 })
  assert(result.success, `fetchDeliveries не удался: ${JSON.stringify(result)}`)
  assert(
    result.deliveries.length === 1,
    `limit=0 должен клэмпиться до 1, получено ${result.deliveries.length}`
  )

  return 'limit клэмпится снизу до 1 (Math.max(1, ...))'
}

async function test_last_error_truncate(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'lasterr')
  const reg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: ['*']
  })
  assert(reg.success, 'регистрация не удалась')

  const ev = await BrokerEvents.create(ctx, {
    eventType: 'test.lasterror.probe',
    schemaVersion: 1,
    producerModuleKey: moduleKey,
    payload: null,
    dispatchedAt: Date.now()
  })
  const delivery = await BrokerDeliveries.create(ctx, {
    eventId: ev.id,
    eventType: ev.eventType,
    schemaVersion: 1,
    payload: null,
    subscriberModuleKey: moduleKey,
    status: 'pending',
    claimCount: 0
  })
  const claimToken = 'probe-token'
  const won = await BrokerDeliveries.updateAll(ctx, {
    patch: { status: 'claimed', claimedAt: Date.now(), claimToken, claimCount: 1 },
    where: { id: delivery.id, status: 'pending' },
    limit: 1
  })
  assert(won === 1, 'не удалось застолбить фикстуру')

  const longError = 'x'.repeat(LAST_ERROR_MAX + 500)
  // Internal-транспорт через app.function .run() (фикс-раунда 1, п.4 — матрица
  // транспортов, ячейка "dead"): не core-вызов напрямую.
  const result = await brokerDeadDeliveryFn.run(ctx, {
    moduleKey,
    authToken: reg.authToken,
    deliveryId: delivery.id,
    claimToken,
    lastError: longError
  })
  assert(
    result.success && result.result === 'dead',
    `deadDelivery должен пройти, а не отклонить длинный lastError: ${JSON.stringify(result)}`
  )

  const row = await retryRead(() => BrokerDeliveries.findById(ctx, delivery.id))
  assert(
    !!row && (row.lastError?.length ?? 0) <= LAST_ERROR_MAX,
    `lastError не обрезан: длина ${row?.lastError?.length}`
  )

  return `lastError обрезается до ${LAST_ERROR_MAX} символов, вызов не отклоняется (О7); internal .run()`
}

export const functionalTests: Record<string, TestImpl> = {
  glob_validation: test_glob_validation,
  glob_match_expand: test_glob_match_expand,
  sha256_token_hash: test_sha256_token_hash,
  log_level_cutoff: test_log_level_cutoff,
  socket_payload_debug_only: test_socket_payload_debug_only,
  fetch_limit_clamp: test_fetch_limit_clamp,
  last_error_truncate: test_last_error_truncate
}

import { runWithExclusiveLock } from '@app/sync'
import { BrokerModules } from '../../tables/modules.table'
import { BrokerDeliveries } from '../../tables/deliveries.table'
import { type BrokerResult, assertCondition, runOperation } from './result'
import { validatePatterns } from './glob'
import { generateAuthToken, hashModuleToken } from './token'
import { publishSystemEvent } from './audit'
import { writeServerLog } from '../log/logger'
import { lockKey } from '../../config/env'
import {
  BROKER_SENTINEL,
  RESERVED_EVENT_PREFIX,
  RESERVED_MODULE_KEY_TEST_PREFIX
} from '../../config/constants'

export type RegisterModuleParams = {
  moduleKey: string
  allowedPublishTypes: string[]
  allowedSubscribeTypes: string[]
  claimTimeoutMs?: number | null
  displayName?: string
  metadata?: unknown
}

export type RegisterModuleResult = {
  moduleKey: string
  authToken: string
  status: 'active' | 'onModeration'
}

/**
 * testOpts — бэкдор персистентного тестового набора (фикс-раунда 1, п.3):
 * структурно недостижим ни с одной транспортной поверхности (ни внешний HTTP,
 * ни internal app.function не прокидывают 4-й позиционный аргумент функции —
 * оба всегда вызывают registerModuleCore ровно с (ctx, params, channel)),
 * поэтому снять резерв префикса 'test-' может только доверенный in-process
 * код теста (см. lib/tests/helpers.ts, registerTestModule).
 */
export type RegisterModuleTestOpts = { allowReservedTestPrefix?: boolean }

/**
 * Регистрация модуля (§5.2). channel — определяется гейтвеем по каналу вызова
 * (internal app.function / external HTTP), не принимается из тела запроса —
 * канал неподделываем.
 */
export async function registerModuleCore(
  ctx: RichUgcCtx,
  params: RegisterModuleParams,
  channel: 'internal' | 'external',
  testOpts?: RegisterModuleTestOpts
): Promise<BrokerResult<RegisterModuleResult>> {
  return runOperation(ctx, async () => {
    const {
      moduleKey,
      allowedPublishTypes,
      allowedSubscribeTypes,
      claimTimeoutMs,
      displayName,
      metadata
    } = params

    assertCondition(
      moduleKey !== BROKER_SENTINEL,
      'reserved_module_key',
      `broker: moduleKey "${BROKER_SENTINEL}" is reserved`
    )
    // Резерв префикса 'test-' (фикс-раунда 1, п.3) — см. RegisterModuleTestOpts выше.
    // Проверка регистронезависимая: свип тестов удаляет по $ilike 'test-%', поэтому
    // 'Test-foo'/'TEST-x' обязаны отвергаться так же, как 'test-foo'.
    assertCondition(
      testOpts?.allowReservedTestPrefix ||
        !moduleKey.toLowerCase().startsWith(RESERVED_MODULE_KEY_TEST_PREFIX),
      'reserved_module_key',
      `broker: moduleKey prefix "${RESERVED_MODULE_KEY_TEST_PREFIX}" is reserved for the test harness`
    )
    assertCondition(
      typeof moduleKey === 'string' &&
        moduleKey.length > 0 &&
        !moduleKey.includes(':') &&
        !moduleKey.includes('.'),
      'invalid_pattern',
      'broker: moduleKey must be a non-empty string without ":" or "."'
    )
    // Отрицательный/нечисловой таймаут ломает CAS-перезабор в pull.ts — cutoff
    // уходит в будущее и ни одна claimed-строка никогда не считается просроченной
    // (фикс-раунда 1, п.10).
    assertCondition(
      claimTimeoutMs == null || (Number.isFinite(claimTimeoutMs) && claimTimeoutMs >= 1),
      'invalid_pattern',
      'broker: claimTimeoutMs must be a finite number >= 1, or null/undefined'
    )

    const publishError = validatePatterns(allowedPublishTypes)
    assertCondition(!publishError, 'invalid_pattern', publishError ?? '')
    const subscribeError = validatePatterns(allowedSubscribeTypes)
    assertCondition(!subscribeError, 'invalid_pattern', subscribeError ?? '')

    assertCondition(
      !allowedPublishTypes.some((p) => p.startsWith(RESERVED_EVENT_PREFIX)),
      'reserved_namespace',
      `broker: publish types must not use reserved "${RESERVED_EVENT_PREFIX}" namespace`
    )

    const source = channel

    const lockResult = await runWithExclusiveLock(ctx, lockKey('register', moduleKey), async () => {
      const existing = await BrokerModules.findOneBy(ctx, { moduleKey })
      assertCondition(
        !existing,
        'module_already_exists',
        `broker: module "${moduleKey}" already exists`
      )

      // Защитный свип очереди доставок (фикс-раунда 1, п.2а) — под тем же
      // замком, ПЕРЕД create: гонка «fan-out × deleteModule» работает по
      // снапшоту реестра (см. runFanoutPass) — модуль мог быть удалён между
      // резолвом подписчиков и материализацией доставки; этот свип гарантирует,
      // что новый владелец только что освободившегося moduleKey не унаследует
      // чужой хвост доставок (§5.5).
      await BrokerDeliveries.deleteAll(ctx, {
        where: { subscriberModuleKey: moduleKey },
        limit: null,
        hard: true
      })

      const authToken = generateAuthToken()
      const authTokenHash = await hashModuleToken(moduleKey, authToken)
      const status = source === 'internal' ? ('active' as const) : ('onModeration' as const)

      await BrokerModules.create(ctx, {
        moduleKey,
        displayName,
        source,
        allowedPublishTypes,
        allowedSubscribeTypes,
        pendingPublishTypes: null,
        pendingSubscribeTypes: null,
        status,
        claimTimeoutMs: claimTimeoutMs ?? null,
        authTokenHash,
        metadata
      })

      return { authToken, status }
    })

    // Хвост после точки невозврата (фикс-раунда 1, п.9): строка модуля уже
    // создана и токен уже сгенерирован — сбой аудит-события/лога не должен
    // сжечь moduleKey. Аудит-событие durable — следующий publish/фикс подберёт;
    // лог самой ошибки хвоста — тоже в try/catch (не маскировать возврат токена).
    try {
      await publishSystemEvent(ctx, 'broker.module.registered', {
        moduleKey,
        source,
        status: lockResult.status
      })
      await writeServerLog(ctx, {
        level: 'info',
        message: `broker: module "${moduleKey}" registered (source=${source}, status=${lockResult.status})`,
        marks: { moduleKey, source, status: lockResult.status }
      })
    } catch (e) {
      try {
        await writeServerLog(ctx, {
          level: 'error',
          message: `broker: сбой хвоста регистрации "${moduleKey}" (аудит/лог) — токен уже выдан`,
          payload: { moduleKey, error: e instanceof Error ? e.message : String(e) }
        })
      } catch {
        // best-effort — не мешаем возврату токена, даже если сам лог ошибки не прошёл
      }
    }

    return { moduleKey, authToken: lockResult.authToken, status: lockResult.status }
  })
}

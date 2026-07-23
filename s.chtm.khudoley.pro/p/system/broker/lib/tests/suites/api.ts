import { disableModuleCore, enableModuleCore } from '../../broker/admin-status'
import { publishEventCore } from '../../broker/publish'
import { brokerRegisterFn } from '../../../api/broker/internal/register'
import { brokerPublishTypesFn } from '../../../api/broker/internal/publish-types'
import { brokerSubscribeTypesFn } from '../../../api/broker/internal/subscribe-types'
import { brokerRegisterRoute } from '../../../api/broker/register'
import { brokerPublishRoute } from '../../../api/broker/publish'
import { brokerPublishTypesRoute } from '../../../api/broker/publish-types'
import { brokerSubscribeTypesRoute } from '../../../api/broker/subscribe-types'
import { BrokerModules } from '../../../tables/modules.table'
import {
  makeUniq,
  testModuleKey,
  testEventType,
  testEventGlob,
  otherEventGlob,
  registerTestModule,
  transportModuleKey,
  cleanupTransportModule,
  retryRead,
  brokerHttp,
  assert
} from '../helpers'
import type { TestImpl } from '../types'

async function test_register_internal_active(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  // Реальный internal-транспорт (app.function .run(), фикс-раунда 1, п.4 —
  // матрица транспортов §9.3) — не может нести testOpts-бэкдор registerModuleCore
  // (см. registerTestModule), поэтому не под зарезервированным префиксом
  // 'test-'; убирается явно через cleanupTransportModule.
  const moduleKey = transportModuleKey(uniq, 'intreg')
  const result = await brokerRegisterFn.run(ctx, {
    moduleKey,
    allowedPublishTypes: ['tasks.*'],
    allowedSubscribeTypes: []
  })
  // cleanup — в finally (фикс-раунда 2): упавший assert не должен оставлять
  // вечный brokertest-модуль (общий sweep его не видит).
  try {
    assert(result.success, `internal-регистрация не удалась: ${JSON.stringify(result)}`)
    assert(
      result.status === 'active',
      `internal-регистрация должна дать status=active, получено ${result.status}`
    )
    const row = await retryRead(() => BrokerModules.findOneBy(ctx, { moduleKey }))
    assert(
      !!row && row.status === 'active' && row.source === 'internal',
      'строка модуля не отражает internal/active'
    )
    return 'internal-регистрация через app.function .run() сразу даёт status=active'
  } finally {
    await cleanupTransportModule(ctx, moduleKey)
  }
}

async function test_register_external_moderation(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  // Реальный внешний HTTP-транспорт — тот же аргумент, что и выше: не под
  // префиксом 'test-', убирается явно.
  const moduleKey = transportModuleKey(uniq, 'extreg')
  const resp = await brokerHttp(brokerRegisterRoute.url(), {
    moduleKey,
    allowedPublishTypes: ['tasks.*'],
    allowedSubscribeTypes: []
  })
  try {
    assert(
      resp.statusCode === 200 && resp.body.success,
      `external-регистрация должна вернуть 200/success: ${JSON.stringify(resp.body)}`
    )
    assert(
      resp.body.status === 'onModeration',
      `external-регистрация должна дать onModeration, получено ${resp.body.status}`
    )
    return 'external HTTP-регистрация даёт status=onModeration'
  } finally {
    await cleanupTransportModule(ctx, moduleKey)
  }
}

async function test_register_duplicate_refused(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'dup')
  const first = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: []
  })
  assert(first.success, 'первая регистрация должна пройти')
  const second = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: []
  })
  assert(
    !second.success && second.code === 'module_already_exists',
    `повторная регистрация должна отклоняться module_already_exists, получено ${JSON.stringify(second)}`
  )
  return 'повторная регистрация занятого moduleKey отклоняется'
}

async function test_register_reserved(ctx: RichUgcCtx): Promise<string> {
  const reservedKey = await registerTestModule(ctx, {
    moduleKey: 'broker',
    allowedPublishTypes: [],
    allowedSubscribeTypes: []
  })
  assert(
    !reservedKey.success && reservedKey.code === 'reserved_module_key',
    `moduleKey='broker' должен отклоняться reserved_module_key: ${JSON.stringify(reservedKey)}`
  )

  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'ns')
  const reservedPublish = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: ['broker.x'],
    allowedSubscribeTypes: []
  })
  assert(
    !reservedPublish.success && reservedPublish.code === 'reserved_namespace',
    `broker.* в publish должен отклоняться reserved_namespace: ${JSON.stringify(reservedPublish)}`
  )

  const subscribeOk = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: ['broker.*']
  })
  assert(
    subscribeOk.success,
    `broker.* в subscribe должен проходить (аудит-подписка): ${JSON.stringify(subscribeOk)}`
  )

  return 'moduleKey=broker и broker.* в publish отклоняются; broker.* в subscribe проходит'
}

async function test_auth_wrong_token_403(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'authwrong')
  const reg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: ['tasks.*'],
    allowedSubscribeTypes: []
  })
  assert(reg.success, 'регистрация для теста auth не удалась')

  const resp = await brokerHttp(brokerPublishRoute.url(), {
    moduleKey,
    authToken: `${reg.authToken}-wrong`,
    eventType: 'tasks.created',
    payload: {}
  })
  // ⚠️ фактический статус user-thrown AccessDeniedError на проводе доками не подтверждён
  // (403 vs 500) — план шаг 13, фиксируется по итогам Runtime Verification.
  assert(
    (resp.statusCode === 403 || resp.statusCode === 500) && resp.body?.success !== true,
    `неверный токен должен давать отказ (403 либо 500 c success:false), получено ${resp.statusCode}: ${JSON.stringify(resp.body)}`
  )
  return `неверный токен отклоняется (статус ${resp.statusCode})`
}

async function test_update_types_internal_applied(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'updint')
  const reg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: ['tasks.*'],
    allowedSubscribeTypes: ['orders.*']
  })
  assert(reg.success, 'регистрация не удалась')

  // Internal-транспорт через app.function .run() (фикс-раунда 1, п.4 — матрица
  // транспортов, ячейки "publish-types"/"subscribe-types").
  const pubResult = await brokerPublishTypesFn.run(ctx, {
    moduleKey,
    authToken: reg.authToken,
    types: ['tasks.*', 'finance.*']
  })
  assert(
    pubResult.success && pubResult.result === 'applied',
    `internal update publish-types должен applied: ${JSON.stringify(pubResult)}`
  )

  const subResult = await brokerSubscribeTypesFn.run(ctx, {
    moduleKey,
    authToken: reg.authToken,
    types: ['orders.*', 'tasks.*']
  })
  assert(
    subResult.success && subResult.result === 'applied',
    `internal update subscribe-types должен applied: ${JSON.stringify(subResult)}`
  )

  const row = await retryRead(() => BrokerModules.findOneBy(ctx, { moduleKey }))
  assert(!!row && row.status === 'active', 'status не должен меняться при обновлении типов')
  assert(row!.allowedPublishTypes.includes('finance.*'), 'боевой allowedPublishTypes не обновился')
  assert(
    row!.allowedSubscribeTypes.includes('tasks.*'),
    'боевой allowedSubscribeTypes не обновился'
  )

  return 'internal-обновление publish/subscribe-types через app.function .run() применяется сразу, status не меняется'
}

async function test_update_types_external_pending(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'updext')
  // Развилка applied/pending идёт по source ИЗ СТРОКИ (§5.3), не по каналу
  // вызова, поэтому pending достижим только у external-модуля. Регистрируем
  // external (→ onModeration) и активируем напрямую записью в строку — в волне 2
  // это штатный путь: модерации нет, «на своих модулях статус ставит админ
  // напрямую» (§0.1/§5.7).
  const reg = await registerTestModule(
    ctx,
    {
      moduleKey,
      allowedPublishTypes: [testEventGlob(uniq)],
      allowedSubscribeTypes: [otherEventGlob(uniq)]
    },
    'external'
  )
  assert(reg.success, 'регистрация не удалась')
  const regRow = await retryRead(() => BrokerModules.findOneBy(ctx, { moduleKey }))
  assert(!!regRow && regRow.source === 'external', 'фикстура должна иметь source=external')
  await BrokerModules.update(ctx, { id: regRow!.id, status: 'active' })

  const pubResp = await brokerHttp(brokerPublishTypesRoute.url(), {
    moduleKey,
    authToken: reg.authToken,
    types: [testEventGlob(uniq), 'finance.*']
  })
  assert(
    pubResp.statusCode === 200 && pubResp.body.success && pubResp.body.result === 'pending',
    `external-расширение publish-types должно уйти в pending: ${JSON.stringify(pubResp.body)}`
  )

  const subResp = await brokerHttp(brokerSubscribeTypesRoute.url(), {
    moduleKey,
    authToken: reg.authToken,
    types: [otherEventGlob(uniq), 'billing.*']
  })
  assert(
    subResp.statusCode === 200 && subResp.body.success && subResp.body.result === 'pending',
    `external-расширение subscribe-types должно уйти в pending: ${JSON.stringify(subResp.body)}`
  )

  const row = await retryRead(() => BrokerModules.findOneBy(ctx, { moduleKey }))
  assert(!!row && row.status === 'active', 'status не должен меняться при заявке на расширение')
  assert(
    row!.allowedPublishTypes.includes(testEventGlob(uniq)) &&
      !row!.allowedPublishTypes.includes('finance.*'),
    'боевой allowedPublishTypes не должен меняться до одобрения'
  )
  assert(
    Array.isArray(row!.pendingPublishTypes) && row!.pendingPublishTypes.includes('finance.*'),
    'pendingPublishTypes должен содержать запрошенное расширение'
  )

  // Модуль продолжает работать на одобренных правах (О5)
  const publishOk = await publishEventCore(ctx, {
    moduleKey,
    authToken: reg.authToken,
    eventType: testEventType(uniq),
    payload: {}
  })
  assert(
    publishOk.success,
    `модуль с висящей заявкой должен продолжать публиковать на одобренных правах: ${JSON.stringify(publishOk)}`
  )

  // Сужение (external) — применяется сразу, без модерации
  const narrowResp = await brokerHttp(brokerPublishTypesRoute.url(), {
    moduleKey,
    authToken: reg.authToken,
    types: [testEventGlob(uniq)]
  })
  assert(
    narrowResp.statusCode === 200 &&
      narrowResp.body.success &&
      narrowResp.body.result === 'applied',
    `external-сужение должно применяться сразу: ${JSON.stringify(narrowResp.body)}`
  )

  return 'external-расширение уходит в pending, боевое/status нетронуты; сужение применяется сразу'
}

async function test_admin_disable_enable(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'admst')
  const reg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  assert(reg.success, 'регистрация не удалась')

  const disabled = await disableModuleCore(ctx, { moduleKey })
  assert(
    disabled.success && disabled.status === 'disabled',
    `disableModuleCore должен перевести в disabled: ${JSON.stringify(disabled)}`
  )

  const gated = await publishEventCore(ctx, {
    moduleKey,
    authToken: reg.authToken,
    eventType: testEventType(uniq),
    payload: {}
  })
  assert(
    !gated.success && gated.code === 'module_not_active',
    `публикация выключенным модулем должна отклоняться module_not_active: ${JSON.stringify(gated)}`
  )

  const enabled = await enableModuleCore(ctx, { moduleKey })
  assert(
    enabled.success && enabled.status === 'active',
    `enableModuleCore должен вернуть в active: ${JSON.stringify(enabled)}`
  )

  const worksAgain = await publishEventCore(ctx, {
    moduleKey,
    authToken: reg.authToken,
    eventType: testEventType(uniq),
    payload: {}
  })
  assert(
    worksAgain.success,
    `после enable публикация должна снова работать: ${JSON.stringify(worksAgain)}`
  )

  return 'admin disable/enable корректно гейтит и восстанавливает работу модуля'
}

async function test_source_not_overridable(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = transportModuleKey(uniq, 'srcnotover')
  const resp = await brokerHttp(brokerRegisterRoute.url(), {
    moduleKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [],
    source: 'internal'
  })
  try {
    assert(
      resp.statusCode === 200 && resp.body.success,
      `регистрация не удалась: ${JSON.stringify(resp.body)}`
    )
    assert(
      resp.body.status === 'onModeration',
      `source из тела не должен переопределять канал — ожидался onModeration, получено ${resp.body.status}`
    )
    return 'внешний канал регистрации не подделывается полем source в теле'
  } finally {
    await cleanupTransportModule(ctx, moduleKey)
  }
}

export const apiTests: Record<string, TestImpl> = {
  register_internal_active: test_register_internal_active,
  register_external_moderation: test_register_external_moderation,
  register_duplicate_refused: test_register_duplicate_refused,
  register_reserved: test_register_reserved,
  auth_wrong_token_403: test_auth_wrong_token_403,
  update_types_internal_applied: test_update_types_internal_applied,
  update_types_external_pending: test_update_types_external_pending,
  admin_disable_enable: test_admin_disable_enable,
  source_not_overridable: test_source_not_overridable
  // 6 admin-тестов (admin_status/admin_metrics/admin_log_level/admin_role_gate/
  // admin_logs_search/admin_log_payload) вынесены в suites/api-admin.ts (фикс-цикл
  // волны 2.5, standards — лимит 300-400 строк). Реестр test-definitions.ts не
  // менялся — категория 'api' остаётся единой; TEST_IMPLS.api в run-tests.ts
  // собирает apiTests + apiAdminTests в один объект, порядок прогона задаёт
  // TEST_CATEGORIES (registry), не порядок объектов TEST_IMPLS.
}

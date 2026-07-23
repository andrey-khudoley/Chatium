import { brokerAdminStatusRoute } from '../../../api/broker/admin/status'
import { brokerAdminMetricsRoute } from '../../../api/broker/admin/metrics'
import { brokerAdminLogsRoute } from '../../../api/broker/admin/logs'
import { brokerAdminLogPayloadRoute } from '../../../api/broker/admin/log-payload'
import { brokerAdminLogLevelRoute } from '../../../api/broker/admin/log-level'
import { brokerAdminDisableRoute } from '../../../api/broker/admin/disable'
import { brokerAdminEnableRoute } from '../../../api/broker/admin/enable'
import { BrokerEvents } from '../../../tables/events.table'
import { BrokerDeliveries } from '../../../tables/deliveries.table'
import { getLogLevel, setLogLevel } from '../../log/settings'
import { shouldLog } from '../../log/logger'
import { readLogs } from '../../log/read-logs'
import {
  makeUniq,
  testModuleKey,
  testEventType,
  testEventGlob,
  registerTestModule,
  brokerHttp,
  assert,
  peekPendingLogProbe,
  fireLogProbe
} from '../helpers'
import type { TestImpl } from '../types'

/*
  lib/tests/suites/api-admin.ts — 6 admin-тестов, механически вынесенные из
  suites/api.ts (фикс-цикл волны 2.5, standards — лимит 300-400 строк).
  Реестр test-definitions.ts НЕ менялся — категория 'api' остаётся единой,
  меняется только физическое расположение реализаций; TEST_IMPLS.api в
  run-tests.ts собирает apiTests и apiAdminTests в один объект. Порядок
  прогона задаёт TEST_CATEGORIES (registry), а не порядок объектов TEST_IMPLS
  (см. run-tests.ts runAllTests) — admin_logs_search/admin_log_payload
  остаются последними в категории 'api' автоматически.
*/

async function test_admin_status(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'admstatus')
  const reg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  assert(reg.success, 'регистрация фикстуры не удалась')

  // dispatchedAt уже проставлен (не null) — фикстура не должна влиять на
  // fanoutBacklog (общий счётчик по всем событиям аккаунта, не только тестовым).
  const ev = await BrokerEvents.create(ctx, {
    eventType: testEventType(uniq),
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

  // Брекетинг вместо строгого равенства (фикс RV волны 2.5): счётчики общие и
  // живые — фоновый asap-дренер (аудит-события + активный broker.*-подписчик из
  // register_reserved этой же категории) может создать доставку между вызовом
  // роута и прямым countBy. Замер роута обязан лежать между двумя прямыми
  // замерами, снятыми до и после него, — это и есть «согласован с countBy».
  const backlogBefore = await BrokerEvents.countBy(ctx, { dispatchedAt: null })
  const pendingBefore = await BrokerDeliveries.countBy(ctx, { status: 'pending' })
  const result = await brokerAdminStatusRoute.run(ctx)
  const backlogAfter = await BrokerEvents.countBy(ctx, { dispatchedAt: null })
  const pendingAfter = await BrokerDeliveries.countBy(ctx, { status: 'pending' })

  const within = (v: number, a: number, b: number) => v >= Math.min(a, b) && v <= Math.max(a, b)
  assert(result.success, `status.run не удался: ${JSON.stringify(result)}`)
  assert(
    within(result.fanoutBacklog, backlogBefore, backlogAfter),
    `fanoutBacklog вне брекета прямых countBy: роут=${result.fanoutBacklog}, до=${backlogBefore}, после=${backlogAfter}`
  )
  assert(
    within(result.deliveriesByStatus.pending, pendingBefore, pendingAfter),
    `deliveriesByStatus.pending вне брекета: роут=${result.deliveriesByStatus.pending}, до=${pendingBefore}, после=${pendingAfter}`
  )
  assert(
    result.oldestPendingAgeMs !== null && result.oldestPendingAgeMs >= 0,
    `oldestPendingAgeMs должен быть числом >=0 при наличии pending-доставки: получено ${result.oldestPendingAgeMs}`
  )
  assert(
    result.modules.some((m: { moduleKey: string }) => m.moduleKey === moduleKey),
    'реестр modules должен содержать фикстурный модуль'
  )

  return 'admin_status: счётчики роута совпадают с прямыми countBy; oldestPendingAgeMs и modules корректны'
}

async function test_admin_metrics(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'admmetrics')
  const eventType = testEventType(uniq)

  const before = await brokerAdminMetricsRoute.run(ctx)
  assert(before.success, `metrics.run (before) не удался: ${JSON.stringify(before)}`)

  const reg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  assert(reg.success, 'регистрация фикстуры не удалась')

  const ev = await BrokerEvents.create(ctx, {
    eventType,
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
    status: 'dead',
    claimCount: 1,
    lastError: 'admin_metrics fixture'
  })

  const after = await brokerAdminMetricsRoute.run(ctx)
  assert(after.success, `metrics.run (after) не удался: ${JSON.stringify(after)}`)

  // Ассерты — «>=», не строгое равенство (фикс RV волны 2.5): метрики считаются
  // по живым общим таблицам, а сама фикстура порождает побочные события —
  // registerTestModule публикует аудит broker.module.registered (+1 к eventsTotal
  // сверх фикстурного события). Точное равенство на разделяемом счётчике неверно
  // по построению; принадлежность фикстуры проверяет ассерт по eventsByType24h.
  assert(
    after.eventsTotal >= before.eventsTotal + 1,
    `eventsTotal должен вырасти минимум на 1: до=${before.eventsTotal}, после=${after.eventsTotal}`
  )
  assert(
    after.events24h >= before.events24h + 1,
    `events24h должен вырасти минимум на 1: до=${before.events24h}, после=${after.events24h}`
  )
  assert(
    after.eventsByType24h.some((r: { eventType: string }) => r.eventType === eventType),
    `eventsByType24h должен содержать тип "${eventType}": ${JSON.stringify(after.eventsByType24h)}`
  )
  assert(
    after.deliveriesByStatus.dead >= before.deliveriesByStatus.dead + 1,
    `deliveriesByStatus.dead должен вырасти минимум на 1: до=${before.deliveriesByStatus.dead}, после=${after.deliveriesByStatus.dead}`
  )
  assert(
    after.activeModulesCount >= before.activeModulesCount + 1,
    `activeModulesCount должен вырасти минимум на 1: до=${before.activeModulesCount}, после=${after.activeModulesCount}`
  )

  return 'admin_metrics: eventsTotal/events24h/eventsByType24h/dead/activeModulesCount корректно отражают фикстуру'
}

async function test_admin_log_level(ctx: RichUgcCtx): Promise<string> {
  const original = await getLogLevel(ctx)
  try {
    const setResult = await brokerAdminLogLevelRoute.run(ctx, { level: 'Debug' })
    assert(
      setResult.success && setResult.level === 'Debug',
      `log-level.run({level:'Debug'}) должен вернуть level='Debug': ${JSON.stringify(setResult)}`
    )
    assert(
      (await getLogLevel(ctx)) === 'Debug',
      'getLogLevel должен отражать изменение сразу после смены через роут (чтение после записи)'
    )

    const readResult = await brokerAdminLogLevelRoute.run(ctx, {})
    assert(
      readResult.success && readResult.level === 'Debug',
      `повторный run({}) без level должен вернуть тот же текущий уровень 'Debug': ${JSON.stringify(readResult)}`
    )
    assert(
      shouldLog('Debug', 'debug'),
      'shouldLog("Debug","debug") должен быть true после смены уровня'
    )

    return 'admin_log_level: переключение через роут реально меняет отсечку, чтение после записи корректно'
  } finally {
    await setLogLevel(ctx, original)
  }
}

async function test_admin_role_gate(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'rolegate')

  // Все 7 admin-поверхностей — тела схемно валидны, единственная причина
  // отказа = гейт роли (§5.11, шапка плана «Правки гейта»). brokerHttp не
  // несёт cookie — реальный неаутентифицированный HTTP-вызов (не клонирование ctx).
  const checks: Array<{ name: string; url: string; body: Record<string, unknown> }> = [
    { name: 'status', url: brokerAdminStatusRoute.url(), body: {} },
    { name: 'metrics', url: brokerAdminMetricsRoute.url(), body: {} },
    { name: 'logs', url: brokerAdminLogsRoute.url(), body: { limit: 1 } },
    {
      name: 'log-payload',
      url: brokerAdminLogPayloadRoute.url(),
      body: { ts: 'x', msg: 'x', kv: 'x' }
    },
    { name: 'log-level', url: brokerAdminLogLevelRoute.url(), body: {} },
    { name: 'disable', url: brokerAdminDisableRoute.url(), body: { moduleKey } },
    { name: 'enable', url: brokerAdminEnableRoute.url(), body: { moduleKey } }
  ]

  for (const check of checks) {
    const resp = await brokerHttp(check.url, check.body)
    assert(
      resp.statusCode !== 200 || resp.body?.success !== true,
      `admin-поверхность "${check.name}" должна отклонять анонимный доступ (гейт роли), получено ${resp.statusCode}: ${JSON.stringify(resp.body)}`
    )
  }

  return 'admin_role_gate: все 7 admin-поверхностей (5 новых + disable/enable) отклоняют неаутентифицированный HTTP-доступ'
}

async function test_admin_logs_search(ctx: RichUgcCtx): Promise<string> {
  // Peek (не take, §9.5.2.5) — метку ещё должен прочитать log_two_phase
  // последним в integration-категории; ставится предпоследним в api (план шаг 14).
  const probe = peekPendingLogProbe() ?? (await fireLogProbe(ctx), peekPendingLogProbe())
  assert(probe, 'log-probe не выстрелила (ни в начале прогона, ни фоллбэком)')
  assert(!probe.failure, probe.failure ?? '')
  const mark = probe.mark

  let rows: Array<{ ts: string; level: string; msg: string; kv: string }> = []
  for (let i = 0; i < 80; i++) {
    const result = await brokerAdminLogsRoute.run(ctx, { search: mark, limit: 10 })
    assert(result.success, `admin logs.run не удался: ${JSON.stringify(result)}`)
    // route теперь возвращает несколько ветвей return (валидация входа, фикс-цикл
    // волны 2.5) — инференс типа .run() схлопывает их в одну плоскую форму с
    // rows?: опциональным полем; assert(result.success) выше гарантирует его
    // наличие рантаймом, но не сужает тип, поэтому явный фоллбэк на [].
    rows = result.rows ?? []
    if (rows.length > 0) break
  }
  assert(
    rows.some((r) => r.msg.includes(`above ${mark}`)),
    `запись "above ${mark}" не найдена через admin_logs — возможно, не дождались CH visibility`
  )
  const row = rows[0] as unknown as Record<string, unknown>
  assert(
    !('payload' in row) && !('jsonStr' in row),
    'строки списка admin_logs не должны нести payload/jsonStr (тянется отдельно, log-payload)'
  )

  return 'admin_logs_search: список логов по search находит пробу, строки без payload/jsonStr'
}

async function test_admin_log_payload(ctx: RichUgcCtx): Promise<string> {
  // Peek (не take) — ставится последним в api-категории (план шаг 14).
  const probe = peekPendingLogProbe() ?? (await fireLogProbe(ctx), peekPendingLogProbe())
  assert(probe, 'log-probe не выстрелила (ни в начале прогона, ни фоллбэком)')
  assert(!probe.failure, probe.failure ?? '')
  const mark = probe.mark

  let row: { ts: string; level: string; msg: string; kv: string } | undefined
  for (let i = 0; i < 80; i++) {
    const result = await readLogs(ctx, { search: mark, limit: 10 })
    row = result.rows.find((r) => r.msg.includes(`above ${mark}`))
    if (row) break
  }
  assert(row, `не удалось найти точную строку "above ${mark}" для раскрытия payload`)

  const found = await brokerAdminLogPayloadRoute.run(ctx, {
    ts: row!.ts,
    msg: row!.msg,
    kv: row!.kv
  })
  assert(
    found.success &&
      found.found === true &&
      typeof found.jsonStr === 'string' &&
      found.jsonStr.includes(mark),
    `log-payload должен найти запись с mark в jsonStr: ${JSON.stringify(found)}`
  )

  const notFound = await brokerAdminLogPayloadRoute.run(ctx, {
    ts: '1970-01-01 00:00:00.000',
    msg: `nonexistent-${mark}`,
    kv: 'nonexistent'
  })
  assert(
    notFound.success && notFound.found === false && notFound.jsonStr === null,
    `log-payload на несуществующей записи должен вернуть found:false без исключения: ${JSON.stringify(notFound)}`
  )

  return 'admin_log_payload: раскрытие payload по точным ts/msg/kv находит запись; отсутствующая запись даёт found:false'
}

export const apiAdminTests: Record<string, TestImpl> = {
  admin_status: test_admin_status,
  admin_metrics: test_admin_metrics,
  admin_log_level: test_admin_log_level,
  admin_role_gate: test_admin_role_gate,
  // Оба лог-теста — ПОСЛЕДНИМИ в порядке api-категории (максимум окна CH-видимости
  // до потребления пробы log_two_phase в integration, план шаг 14). Физическое
  // расположение здесь не влияет на порядок прогона — его задаёт TEST_CATEGORIES
  // (test-definitions.ts), run-tests.ts runAllTests идёт по registry, не по
  // объектам TEST_IMPLS.
  admin_logs_search: test_admin_logs_search,
  admin_log_payload: test_admin_log_payload
}

import { publishEventCore } from '../../broker/publish'
import { fetchDeliveriesCore } from '../../broker/pull'
import { deleteModuleCore } from '../../broker/delete-module'
import { BrokerModules } from '../../../tables/modules.table'
import { BrokerEvents } from '../../../tables/events.table'
import { BrokerDeliveries } from '../../../tables/deliveries.table'
import { PAYLOAD_MAX_CHARS, FETCH_LIMIT_MAX, FETCH_LIMIT_DEFAULT } from '../../../config/constants'
import {
  makeUniq,
  testModuleKey,
  testEventType,
  testEventGlob,
  registerTestModule,
  assert
} from '../helpers'
import type { TestImpl } from '../types'

async function test_payload_ceiling(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'pc-prod')
  const reg = await registerTestModule(ctx, {
    moduleKey: prodKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  assert(reg.success, 'регистрация не удалась')

  const tooLarge = { blob: 'x'.repeat(PAYLOAD_MAX_CHARS + 100) }
  const over = await publishEventCore(ctx, {
    moduleKey: prodKey,
    authToken: reg.authToken,
    eventType: testEventType(uniq),
    payload: tooLarge
  })
  assert(
    !over.success && over.code === 'payload_too_large',
    `payload > ${PAYLOAD_MAX_CHARS} должен отклоняться: ${JSON.stringify(over)}`
  )

  const okPayload = { blob: 'x'.repeat(PAYLOAD_MAX_CHARS - 200) }
  const ok = await publishEventCore(ctx, {
    moduleKey: prodKey,
    authToken: reg.authToken,
    eventType: testEventType(uniq),
    payload: okPayload
  })
  assert(ok.success, `payload чуть меньше потолка должен проходить: ${JSON.stringify(ok)}`)

  return `потолок payload ${PAYLOAD_MAX_CHARS} символов соблюдается`
}

async function test_fetch_over_limit_ok(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'fol-prod')
  const subKey = testModuleKey(uniq, 'fol-sub')
  const prodReg = await registerTestModule(ctx, {
    moduleKey: prodKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  const subReg = await registerTestModule(ctx, {
    moduleKey: subKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [testEventGlob(uniq)]
  })
  assert(prodReg.success && subReg.success, 'регистрации не удались')

  const COUNT = FETCH_LIMIT_MAX + 20
  const events = await Promise.all(
    Array.from({ length: COUNT }, () =>
      BrokerEvents.create(ctx, {
        eventType: testEventType(uniq),
        schemaVersion: 1,
        producerModuleKey: prodKey,
        payload: null,
        // Date.now() (фикс-раунда 2): доставки создаются вручную, событие с null
        // подхватил бы живой asap-дренер → дубликаты ломают точные счётчики.
        dispatchedAt: Date.now()
      })
    )
  )
  await Promise.all(
    events.map((ev) =>
      BrokerDeliveries.create(ctx, {
        eventId: ev.id,
        eventType: ev.eventType,
        schemaVersion: 1,
        payload: null,
        subscriberModuleKey: subKey,
        status: 'pending',
        claimCount: 0
      })
    )
  )

  const result = await fetchDeliveriesCore(ctx, {
    moduleKey: subKey,
    authToken: subReg.authToken,
    limit: 99999
  })
  assert(result.success, `fetch не удался: ${JSON.stringify(result)}`)
  assert(
    result.deliveries.length === FETCH_LIMIT_MAX,
    `limit сверху должен отсекаться до ${FETCH_LIMIT_MAX}, получено ${result.deliveries.length}`
  )

  return `limit > ${FETCH_LIMIT_MAX} усекается до потолка, а не отклоняется`
}

async function test_fetch_default_limit(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'fdl-prod')
  const subKey = testModuleKey(uniq, 'fdl-sub')
  const prodReg = await registerTestModule(ctx, {
    moduleKey: prodKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  const subReg = await registerTestModule(ctx, {
    moduleKey: subKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [testEventGlob(uniq)]
  })
  assert(prodReg.success && subReg.success, 'регистрации не удались')

  const COUNT = FETCH_LIMIT_DEFAULT + 5
  const events = await Promise.all(
    Array.from({ length: COUNT }, () =>
      BrokerEvents.create(ctx, {
        eventType: testEventType(uniq),
        schemaVersion: 1,
        producerModuleKey: prodKey,
        payload: null,
        // Date.now() (фикс-раунда 2): доставки создаются вручную, событие с null
        // подхватил бы живой asap-дренер → дубликаты ломают точные счётчики.
        dispatchedAt: Date.now()
      })
    )
  )
  await Promise.all(
    events.map((ev) =>
      BrokerDeliveries.create(ctx, {
        eventId: ev.id,
        eventType: ev.eventType,
        schemaVersion: 1,
        payload: null,
        subscriberModuleKey: subKey,
        status: 'pending',
        claimCount: 0
      })
    )
  )

  const result = await fetchDeliveriesCore(ctx, { moduleKey: subKey, authToken: subReg.authToken })
  assert(result.success, `fetch без limit не удался: ${JSON.stringify(result)}`)
  assert(
    result.deliveries.length === FETCH_LIMIT_DEFAULT,
    `без limit эффективный должен быть ${FETCH_LIMIT_DEFAULT}, получено ${result.deliveries.length}`
  )

  return `без limit применяется дефолт ${FETCH_LIMIT_DEFAULT}`
}

async function test_cascade_order(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'casc')
  const reg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: [testEventGlob(uniq)]
  })
  assert(reg.success, 'регистрация не удалась')

  const ev = await BrokerEvents.create(ctx, {
    eventType: testEventType(uniq),
    schemaVersion: 1,
    producerModuleKey: moduleKey,
    payload: null,
    // Date.now() (фикс-раунда 2) — доставка создаётся вручную строкой ниже.
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

  const del = await deleteModuleCore(ctx, { moduleKey, authToken: reg.authToken })
  assert(del.success, `deleteModule не удался: ${JSON.stringify(del)}`)
  assert(
    del.deletedDeliveries >= 1,
    `каскад должен удалить доставки модуля, удалено ${del.deletedDeliveries}`
  )

  const leftoverDeliveries = await BrokerDeliveries.countBy(ctx, { subscriberModuleKey: moduleKey })
  assert(
    leftoverDeliveries === 0,
    `после удаления доставок не должно оставаться, найдено ${leftoverDeliveries}`
  )

  const reReg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: [testEventGlob(uniq)]
  })
  assert(
    reReg.success,
    `повторная регистрация освобождённого moduleKey должна проходить: ${JSON.stringify(reReg)}`
  )

  const freshQueue = await BrokerDeliveries.countBy(ctx, { subscriberModuleKey: moduleKey })
  assert(
    freshQueue === 0,
    `новый владелец ключа не должен получить чужой хвост доставок, найдено ${freshQueue}`
  )

  return 'каскад удаляет доставки раньше строки модуля; повторная регистрация ключа стартует с пустой очередью'
}

async function test_deleteall_guard_semantics(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'delguard')

  const rows = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      BrokerModules.create(ctx, {
        moduleKey: `${moduleKey}-${i}`,
        source: 'internal',
        allowedPublishTypes: [],
        allowedSubscribeTypes: [],
        status: 'active',
        authTokenHash: 'x'
      })
    )
  )
  assert(rows.length === 5, 'фикстура не создалась')

  let guardTriggered = false
  try {
    await BrokerModules.deleteAll(ctx, {
      where: { moduleKey: { $ilike: `${moduleKey}-%` } },
      limit: 2,
      hard: true
    })
  } catch {
    guardTriggered = true
  }
  assert(
    guardTriggered,
    'deleteAll с limit меньше числа подходящих строк должен падать (Accidental mass-delete protection)'
  )

  const stillThere = await BrokerModules.countBy(ctx, { moduleKey: { $ilike: `${moduleKey}-%` } })
  assert(
    stillThere === 5,
    `сработавший предохранитель не должен ничего удалить, осталось ${stillThere}`
  )

  const deleted = await BrokerModules.deleteAll(ctx, {
    where: { moduleKey: { $ilike: `${moduleKey}-%` } },
    limit: null,
    hard: true
  })
  assert(deleted === 5, `limit: null должен удалить все подходящие строки, удалено ${deleted}`)

  return 'deleteAll: числовой limit меньше числа строк — падение без изменений; limit: null — удаление всех'
}

export const limitsTests: Record<string, TestImpl> = {
  payload_ceiling: test_payload_ceiling,
  fetch_over_limit_ok: test_fetch_over_limit_ok,
  fetch_default_limit: test_fetch_default_limit,
  cascade_order: test_cascade_order,
  deleteall_guard_semantics: test_deleteall_guard_semantics
}

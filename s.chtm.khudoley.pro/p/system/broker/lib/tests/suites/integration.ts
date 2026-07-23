import { deleteModuleCore } from '../../broker/delete-module'
import { publishEventCore } from '../../broker/publish'
import { fetchDeliveriesCore, ackDeliveryCore, deadDeliveryCore } from '../../broker/pull'
import { disableModuleCore, enableModuleCore } from '../../broker/admin-status'
import { runFanoutPass } from '../../broker/fanout'
import { getLogLevel, setLogLevel } from '../../log/settings'
import { readLogsByMark } from '../../log/read-logs'
import { brokerPublishFn } from '../../../api/broker/internal/publish'
import { brokerFetchDeliveriesFn } from '../../../api/broker/internal/fetch'
import { brokerDeleteFn } from '../../../api/broker/internal/delete'
import { brokerAckDeliveryFn } from '../../../api/broker/internal/ack'
import { brokerAckDeliveryRoute } from '../../../api/broker/deliveries/ack'
import { brokerDeadDeliveryRoute } from '../../../api/broker/deliveries/dead'
import { brokerDeleteRoute } from '../../../api/broker/delete'
import { BrokerEvents } from '../../../tables/events.table'
import { BrokerDeliveries } from '../../../tables/deliveries.table'
import { WORKSPACE_PATH } from '../../../config/env'
import {
  makeUniq,
  testModuleKey,
  testEventType,
  testEventGlob,
  otherEventGlob,
  registerTestModule,
  retryRead,
  brokerHttp,
  assert,
  fireLogProbe,
  takePendingLogProbe
} from '../helpers'
import type { TestImpl } from '../types'

async function test_happy_path(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'hp-prod')
  const subAKey = testModuleKey(uniq, 'hp-sub-a')
  const subBKey = testModuleKey(uniq, 'hp-sub-b')

  const prodReg = await registerTestModule(ctx, {
    moduleKey: prodKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  assert(prodReg.success, `регистрация продюсера не удалась: ${JSON.stringify(prodReg)}`)

  const subAReg = await registerTestModule(ctx, {
    moduleKey: subAKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [testEventGlob(uniq)],
    claimTimeoutMs: 50
  })
  assert(subAReg.success, 'регистрация sub-a не удалась')
  const subBReg = await registerTestModule(ctx, {
    moduleKey: subBKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [otherEventGlob(uniq)],
    claimTimeoutMs: 50
  })
  assert(subBReg.success, 'регистрация sub-b не удалась')

  // publish — через internal app.function .run() (фикс-раунда 1, п.4, матрица §9.3)
  const publishResult = await brokerPublishFn.run(ctx, {
    moduleKey: prodKey,
    authToken: prodReg.authToken,
    eventType: testEventType(uniq),
    payload: { title: 'demo' }
  })
  assert(publishResult.success, `publishEvent не удался: ${JSON.stringify(publishResult)}`)

  await runFanoutPass(ctx)
  const deliveriesA = await BrokerDeliveries.findAll(ctx, {
    where: { eventId: publishResult.eventId, subscriberModuleKey: subAKey },
    limit: 10
  })
  assert(
    deliveriesA.length === 1,
    `sub-a должен получить ровно одну доставку, получено ${deliveriesA.length}`
  )
  const deliveriesB = await BrokerDeliveries.findAll(ctx, {
    where: { eventId: publishResult.eventId, subscriberModuleKey: subBKey },
    limit: 10
  })
  assert(
    deliveriesB.length === 0,
    `sub-b не должен получать доставку по чужому типу, получено ${deliveriesB.length}`
  )
  const eventAfter = await retryRead(() => BrokerEvents.findById(ctx, publishResult.eventId))
  assert(
    !!eventAfter && typeof eventAfter.dispatchedAt === 'number',
    'dispatchedAt должен быть проставлен после fan-out'
  )

  // fetch — через internal app.function .run() (фикс-раунда 1, п.4)
  const fetched = await brokerFetchDeliveriesFn.run(ctx, {
    moduleKey: subAKey,
    authToken: subAReg.authToken
  })
  assert(
    fetched.success && fetched.deliveries.length === 1,
    `fetchDeliveries должен вернуть 1 доставку: ${JSON.stringify(fetched)}`
  )
  const delivery = fetched.deliveries[0]
  assert(delivery, 'fetchDeliveries вернул пустой массив вопреки length===1')
  assert(
    (delivery.payload as any)?.title === 'demo',
    'снимок payload в доставке не совпадает с опубликованным'
  )

  // ack — через EXTERNAL HTTP (матрица покрытия §9.3)
  const ackResp = await brokerHttp(brokerAckDeliveryRoute.url(), {
    moduleKey: subAKey,
    authToken: subAReg.authToken,
    deliveryId: delivery.id,
    claimToken: delivery.claimToken
  })
  assert(
    ackResp.statusCode === 200 && ackResp.body.success && ackResp.body.result === 'acked',
    `external ackDelivery должен пройти: ${JSON.stringify(ackResp.body)}`
  )

  // delete — sub-a через EXTERNAL HTTP, prod через internal .run() (матрица §9.3), sub-b — core
  const delSubA = await brokerHttp(brokerDeleteRoute.url(), {
    moduleKey: subAKey,
    authToken: subAReg.authToken
  })
  assert(
    delSubA.statusCode === 200 && delSubA.body.success,
    `external deleteModule sub-a должен пройти: ${JSON.stringify(delSubA.body)}`
  )
  const delSubB = await deleteModuleCore(ctx, { moduleKey: subBKey, authToken: subBReg.authToken })
  assert(delSubB.success, 'deleteModule sub-b не удался')
  const delProd = await brokerDeleteFn.run(ctx, {
    moduleKey: prodKey,
    authToken: prodReg.authToken
  })
  assert(delProd.success, 'internal .run() deleteModule продюсера не удался')

  return 'happy-path §9.5.2 пройден: регистрация → publish(.run) → fan-out → fetch(.run) → ack(external) → delete(external+.run+core)'
}

async function test_fanout_width(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'fw-prod')
  const subAKey = testModuleKey(uniq, 'fw-sub-a')
  const subBKey = testModuleKey(uniq, 'fw-sub-b')
  const subCKey = testModuleKey(uniq, 'fw-sub-c')

  const prodReg = await registerTestModule(ctx, {
    moduleKey: prodKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  const subAReg = await registerTestModule(ctx, {
    moduleKey: subAKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [testEventGlob(uniq)]
  })
  const subBReg = await registerTestModule(ctx, {
    moduleKey: subBKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: ['*']
  })
  const subCReg = await registerTestModule(ctx, {
    moduleKey: subCKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [otherEventGlob(uniq)]
  })
  assert(
    prodReg.success && subAReg.success && subBReg.success && subCReg.success,
    'регистрации не удались'
  )

  const pub = await publishEventCore(ctx, {
    moduleKey: prodKey,
    authToken: prodReg.authToken,
    eventType: testEventType(uniq),
    payload: {}
  })
  assert(pub.success, 'publishEvent не удался')
  await runFanoutPass(ctx)

  const a = await BrokerDeliveries.findAll(ctx, {
    where: { eventId: pub.eventId, subscriberModuleKey: subAKey },
    limit: 10
  })
  const b = await BrokerDeliveries.findAll(ctx, {
    where: { eventId: pub.eventId, subscriberModuleKey: subBKey },
    limit: 10
  })
  const c = await BrokerDeliveries.findAll(ctx, {
    where: { eventId: pub.eventId, subscriberModuleKey: subCKey },
    limit: 10
  })
  assert(a.length === 1, `sub-a (точный тип) должен получить доставку, получено ${a.length}`)
  assert(b.length === 1, `sub-b (*) должен получить доставку, получено ${b.length}`)
  assert(c.length === 0, `sub-c (чужой тип) не должен получать доставку, получено ${c.length}`)

  return 'fan-out «в ширину»: 2 подходящих подписчика получили доставку, неподходящий — нет'
}

async function test_drainer_recovery(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'dr-prod')
  const subKey = testModuleKey(uniq, 'dr-sub')
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

  // Фикстура «незавершённый fan-out» — прямой create в обход publish, чтобы не
  // гоняться с asap-джобом (разрешено планом для этого теста).
  const ev = await BrokerEvents.create(ctx, {
    eventType: testEventType(uniq),
    schemaVersion: 1,
    producerModuleKey: prodKey,
    payload: {},
    dispatchedAt: null
  })

  await runFanoutPass(ctx)
  const first = await BrokerDeliveries.findAll(ctx, {
    where: { eventId: ev.id, subscriberModuleKey: subKey },
    limit: 10
  })
  assert(first.length === 1, `recovery должен материализовать доставку, получено ${first.length}`)

  await runFanoutPass(ctx)
  const second = await BrokerDeliveries.findAll(ctx, {
    where: { eventId: ev.id, subscriberModuleKey: subKey },
    limit: 10
  })
  assert(
    second.length === 1,
    `повторный проход не должен дублировать доставку, получено ${second.length}`
  )

  return 'recovery дренера материализует незавершённое событие, повтор идемпотентен'
}

async function test_fanout_double(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'fd-prod')
  const subKey = testModuleKey(uniq, 'fd-sub')
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

  const pub = await publishEventCore(ctx, {
    moduleKey: prodKey,
    authToken: prodReg.authToken,
    eventType: testEventType(uniq),
    payload: {}
  })
  assert(pub.success, 'publishEvent не удался')

  await runFanoutPass(ctx)
  await runFanoutPass(ctx)
  await runFanoutPass(ctx)

  const deliveries = await BrokerDeliveries.findAll(ctx, {
    where: { eventId: pub.eventId, subscriberModuleKey: subKey },
    limit: 10
  })
  assert(
    deliveries.length === 1,
    `тройной проход дренера не должен создать больше одной доставки, получено ${deliveries.length}`
  )

  return 'повторные проходы дренера идемпотентны по (eventId, subscriberModuleKey)'
}

async function test_publish_dedup(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'pd-prod')
  const prodReg = await registerTestModule(ctx, {
    moduleKey: prodKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  assert(prodReg.success, 'регистрация не удалась')

  const idempotencyKey = `idem-${uniq}`
  const first = await publishEventCore(ctx, {
    moduleKey: prodKey,
    authToken: prodReg.authToken,
    eventType: testEventType(uniq),
    payload: { n: 1 },
    idempotencyKey
  })
  assert(first.success && !first.deduplicated, 'первая публикация должна быть новым событием')

  const second = await publishEventCore(ctx, {
    moduleKey: prodKey,
    authToken: prodReg.authToken,
    eventType: testEventType(uniq),
    payload: { n: 2 },
    idempotencyKey
  })
  assert(
    second.success && second.deduplicated && second.eventId === first.eventId,
    `повторная публикация с тем же idempotencyKey должна дать дедуп на тот же eventId: ${JSON.stringify(second)}`
  )

  const count = await BrokerEvents.countBy(ctx, { producerModuleKey: prodKey, idempotencyKey })
  assert(count === 1, `должно быть ровно одно событие с этим idempotencyKey, найдено ${count}`)

  return 'повторная публикация с тем же idempotencyKey дедуплицируется на уровне события'
}

async function test_reclaim_expired(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 're-prod')
  const subKey = testModuleKey(uniq, 're-sub')
  const prodReg = await registerTestModule(ctx, {
    moduleKey: prodKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  const subReg = await registerTestModule(ctx, {
    moduleKey: subKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [testEventGlob(uniq)],
    claimTimeoutMs: 1
  })
  assert(prodReg.success && subReg.success, 'регистрации не удались')

  const pub = await publishEventCore(ctx, {
    moduleKey: prodKey,
    authToken: prodReg.authToken,
    eventType: testEventType(uniq),
    payload: {}
  })
  assert(pub.success, 'publishEvent не удался')
  await runFanoutPass(ctx)

  const first = await fetchDeliveriesCore(ctx, { moduleKey: subKey, authToken: subReg.authToken })
  assert(first.success && first.deliveries.length === 1, 'первый fetch должен вернуть 1 доставку')
  const firstDelivery = first.deliveries[0]
  assert(firstDelivery, 'первый fetch вернул пустой массив вопреки length===1')
  const firstToken = firstDelivery.claimToken
  const firstCount = firstDelivery.claimCount

  const second = await fetchDeliveriesCore(ctx, { moduleKey: subKey, authToken: subReg.authToken })
  assert(
    second.success && second.deliveries.length === 1,
    `перезабор должен вернуть ту же доставку: ${JSON.stringify(second)}`
  )
  const secondDelivery = second.deliveries[0]
  assert(secondDelivery, 'второй fetch вернул пустой массив вопреки length===1')
  assert(secondDelivery.id === firstDelivery.id, 'перезабор должен вернуть ту же доставку')
  assert(secondDelivery.claimToken !== firstToken, 'перезабор должен выдать новую claimToken')
  assert(
    secondDelivery.claimCount === firstCount + 1,
    'claimCount должен инкрементироваться при перезаборе'
  )

  // ack по старой метке — через internal app.function .run() (фикс-раунда 1, п.4)
  const staleAck = await brokerAckDeliveryFn.run(ctx, {
    moduleKey: subKey,
    authToken: subReg.authToken,
    deliveryId: firstDelivery.id,
    claimToken: firstToken
  })
  assert(
    !staleAck.success && staleAck.code === 'invalid_claim_token',
    `ack по старой метке должен отклоняться invalid_claim_token: ${JSON.stringify(staleAck)}`
  )

  return 'перезабор просроченной claimed-доставки: новая claimToken, claimCount+1, старая метка отклоняется (ack через .run())'
}

async function test_close_matrix(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'cm-prod')
  const subKey = testModuleKey(uniq, 'cm-sub')
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

  // pending → ack должен отклоняться invalid_claim_token (метка раньше матрицы, §5.9.3)
  const ev1 = await BrokerEvents.create(ctx, {
    eventType: testEventType(uniq),
    schemaVersion: 1,
    producerModuleKey: prodKey,
    payload: {},
    dispatchedAt: null
  })
  const pendingDelivery = await BrokerDeliveries.create(ctx, {
    eventId: ev1.id,
    eventType: ev1.eventType,
    schemaVersion: 1,
    payload: {},
    subscriberModuleKey: subKey,
    status: 'pending',
    claimCount: 0
  })
  const ackPending = await ackDeliveryCore(ctx, {
    moduleKey: subKey,
    authToken: subReg.authToken,
    deliveryId: pendingDelivery.id,
    claimToken: 'anything'
  })
  assert(
    !ackPending.success && ackPending.code === 'invalid_claim_token',
    `ack на pending-строку должен давать invalid_claim_token: ${JSON.stringify(ackPending)}`
  )

  // claimed → acked, повтор → alreadyAcked, dead после acked → отказ
  const claimToken = 'cm-token-1'
  const wonClaim = await BrokerDeliveries.updateAll(ctx, {
    patch: { status: 'claimed', claimedAt: Date.now(), claimToken, claimCount: 1 },
    where: { id: pendingDelivery.id, status: 'pending' },
    limit: 1
  })
  assert(wonClaim === 1, 'не удалось перевести фикстуру в claimed')

  const ackFirst = await ackDeliveryCore(ctx, {
    moduleKey: subKey,
    authToken: subReg.authToken,
    deliveryId: pendingDelivery.id,
    claimToken
  })
  assert(
    ackFirst.success && ackFirst.result === 'acked',
    `первый ack должен пройти: ${JSON.stringify(ackFirst)}`
  )

  const ackAgain = await ackDeliveryCore(ctx, {
    moduleKey: subKey,
    authToken: subReg.authToken,
    deliveryId: pendingDelivery.id,
    claimToken
  })
  assert(
    ackAgain.success && ackAgain.result === 'alreadyAcked',
    `повторный ack должен быть идемпотентным alreadyAcked: ${JSON.stringify(ackAgain)}`
  )

  const deadOnAcked = await deadDeliveryCore(ctx, {
    moduleKey: subKey,
    authToken: subReg.authToken,
    deliveryId: pendingDelivery.id,
    claimToken
  })
  assert(
    !deadOnAcked.success && deadOnAcked.code === 'delivery_not_claimed',
    `dead на acked должен отклоняться delivery_not_claimed: ${JSON.stringify(deadOnAcked)}`
  )

  // --- Недостающие ячейки матрицы О6 (фикс-раунда 1, п.15): dead на pending,
  // повтор dead → alreadyDead, ack на dead → delivery_not_claimed. Заодно —
  // внешний HTTP для dead (фикс-раунда 1, п.5): до этой правки ни одного вызова
  // dead через реальный транспорт в наборе не было.
  const pendingDelivery2 = await BrokerDeliveries.create(ctx, {
    eventId: ev1.id,
    eventType: ev1.eventType,
    schemaVersion: 1,
    payload: {},
    subscriberModuleKey: subKey,
    status: 'pending',
    claimCount: 0
  })

  const deadOnPending = await deadDeliveryCore(ctx, {
    moduleKey: subKey,
    authToken: subReg.authToken,
    deliveryId: pendingDelivery2.id,
    claimToken: 'anything'
  })
  assert(
    !deadOnPending.success && deadOnPending.code === 'invalid_claim_token',
    `dead на pending-строку должен давать invalid_claim_token: ${JSON.stringify(deadOnPending)}`
  )

  const claimToken2 = 'cm-token-2'
  const wonClaim2 = await BrokerDeliveries.updateAll(ctx, {
    patch: { status: 'claimed', claimedAt: Date.now(), claimToken: claimToken2, claimCount: 1 },
    where: { id: pendingDelivery2.id, status: 'pending' },
    limit: 1
  })
  assert(wonClaim2 === 1, 'не удалось перевести вторую фикстуру в claimed')

  const deadFirst = await brokerHttp(brokerDeadDeliveryRoute.url(), {
    moduleKey: subKey,
    authToken: subReg.authToken,
    deliveryId: pendingDelivery2.id,
    claimToken: claimToken2
  })
  assert(
    deadFirst.statusCode === 200 && deadFirst.body.success && deadFirst.body.result === 'dead',
    `внешний HTTP dead должен пройти: ${JSON.stringify(deadFirst.body)}`
  )

  const deadAgain = await deadDeliveryCore(ctx, {
    moduleKey: subKey,
    authToken: subReg.authToken,
    deliveryId: pendingDelivery2.id,
    claimToken: claimToken2
  })
  assert(
    deadAgain.success && deadAgain.result === 'alreadyDead',
    `повторный dead должен быть идемпотентным alreadyDead: ${JSON.stringify(deadAgain)}`
  )

  const ackOnDead = await ackDeliveryCore(ctx, {
    moduleKey: subKey,
    authToken: subReg.authToken,
    deliveryId: pendingDelivery2.id,
    claimToken: claimToken2
  })
  assert(
    !ackOnDead.success && ackOnDead.code === 'delivery_not_claimed',
    `ack на dead-строку должен давать delivery_not_claimed: ${JSON.stringify(ackOnDead)}`
  )

  return 'матрица О6 полная: pending→invalid_claim_token (ack и dead), claimed→acked/dead, повтор→alreadyAcked/alreadyDead, перекрёстный ack/dead на закрытую строку→отказ; dead — внешний HTTP'
}

async function test_foreign_delivery(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'fd2-prod')
  const ownerKey = testModuleKey(uniq, 'fd2-owner')
  const strangerKey = testModuleKey(uniq, 'fd2-stranger')
  const prodReg = await registerTestModule(ctx, {
    moduleKey: prodKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  const ownerReg = await registerTestModule(ctx, {
    moduleKey: ownerKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [testEventGlob(uniq)]
  })
  const strangerReg = await registerTestModule(ctx, {
    moduleKey: strangerKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [testEventGlob(uniq)]
  })
  assert(prodReg.success && ownerReg.success && strangerReg.success, 'регистрации не удались')

  const pub = await publishEventCore(ctx, {
    moduleKey: prodKey,
    authToken: prodReg.authToken,
    eventType: testEventType(uniq),
    payload: {}
  })
  assert(pub.success, 'publishEvent не удался')
  await runFanoutPass(ctx)

  const ownerFetch = await fetchDeliveriesCore(ctx, {
    moduleKey: ownerKey,
    authToken: ownerReg.authToken
  })
  assert(
    ownerFetch.success && ownerFetch.deliveries.length === 1,
    'владелец должен получить доставку'
  )
  const delivery = ownerFetch.deliveries[0]
  assert(delivery, 'fetchDeliveries вернул пустой массив вопреки length===1')

  const strangerAck = await ackDeliveryCore(ctx, {
    moduleKey: strangerKey,
    authToken: strangerReg.authToken,
    deliveryId: delivery.id,
    claimToken: delivery.claimToken
  })
  assert(
    !strangerAck.success && strangerAck.code === 'delivery_unavailable',
    `чужой модуль не должен закрывать доставку: ${JSON.stringify(strangerAck)}`
  )

  const missingAck = await ackDeliveryCore(ctx, {
    moduleKey: ownerKey,
    authToken: ownerReg.authToken,
    deliveryId: 'nonexistent-id-xyz',
    claimToken: 'x'
  })
  assert(
    !missingAck.success && missingAck.code === 'delivery_unavailable',
    `несуществующая доставка должна давать delivery_unavailable: ${JSON.stringify(missingAck)}`
  )

  return 'чужая и несуществующая доставка одинаково дают delivery_unavailable'
}

async function test_status_gate(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const subKey = testModuleKey(uniq, 'sg-sub')
  const reg = await registerTestModule(ctx, {
    moduleKey: subKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: [testEventGlob(uniq)]
  })
  assert(reg.success, 'регистрация не удалась')

  await disableModuleCore(ctx, { moduleKey: subKey })
  const gated = await fetchDeliveriesCore(ctx, { moduleKey: subKey, authToken: reg.authToken })
  assert(
    !gated.success && gated.code === 'module_not_active',
    `fetch на disabled должен давать module_not_active: ${JSON.stringify(gated)}`
  )

  await enableModuleCore(ctx, { moduleKey: subKey })
  const ungated = await fetchDeliveriesCore(ctx, { moduleKey: subKey, authToken: reg.authToken })
  assert(ungated.success, `после enable fetch должен снова работать: ${JSON.stringify(ungated)}`)

  return 'гейт статуса: disabled блокирует pull-операции, enable восстанавливает работу'
}

async function test_audit_events(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'audit')
  const dashboardKey = testModuleKey(uniq, 'audit-dash')

  const dashReg = await registerTestModule(ctx, {
    moduleKey: dashboardKey,
    allowedPublishTypes: [],
    allowedSubscribeTypes: ['broker.module.*']
  })
  assert(dashReg.success, 'регистрация дашборда не удалась')

  const reg = await registerTestModule(ctx, {
    moduleKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  assert(reg.success, 'регистрация не удалась')

  const auditEvents = await BrokerEvents.findAll(ctx, {
    where: { producerModuleKey: 'broker', eventType: 'broker.module.registered' },
    order: [{ createdAt: 'desc' }],
    limit: 50
  })
  assert(
    auditEvents.some((e) => (e.payload as any)?.moduleKey === moduleKey),
    'аудит-событие регистрации не найдено в журнале'
  )

  await runFanoutPass(ctx)
  const dashDeliveries = await fetchDeliveriesCore(ctx, {
    moduleKey: dashboardKey,
    authToken: dashReg.authToken
  })
  assert(
    dashDeliveries.success && dashDeliveries.deliveries.length > 0,
    `дашборд, подписанный на broker.module.*, должен получить доставку аудит-события: ${JSON.stringify(dashDeliveries)}`
  )

  const reservedPublish = await publishEventCore(ctx, {
    moduleKey,
    authToken: reg.authToken,
    eventType: 'broker.x',
    payload: {}
  })
  assert(
    !reservedPublish.success && reservedPublish.code === 'reserved_namespace',
    `publish в broker.* обычным модулем должен отклоняться: ${JSON.stringify(reservedPublish)}`
  )

  return 'broker.* события пишутся в журнал, доставляются подписчику на broker.module.*, обычному publish запрещены'
}

async function test_log_two_phase(ctx: RichUgcCtx): Promise<string> {
  // Фаза «запись» выстрелена в НАЧАЛЕ прогона (runAllTests → fireLogProbe) —
  // к этому тесту запись успела доехать до ClickHouse (окно = длительность
  // прогона, фикс RV 22-07-2026). Запуск теста в одиночку (run-single) стреляет
  // пробу сам и может недождаться CH-видимости — гоняйте полный прогон.
  const fired = takePendingLogProbe() ?? (await fireLogProbe(ctx), takePendingLogProbe())
  assert(fired, 'log-probe не выстрелила (ни в начале прогона, ни фоллбэком)')
  assert(!fired.failure, fired.failure ?? '')
  const mark = fired.mark

  let found: Awaited<ReturnType<typeof readLogsByMark>> = []
  for (let i = 0; i < 80; i++) {
    found = await readLogsByMark(ctx, `above ${mark}`, { withPathFilter: false })
    if (found.length > 0) break
  }
  assert(
    found.length > 0,
    'запись "above <mark>" не найдена в account_logs — возможно, не дождались CH visibility timeout'
  )
  const foundRow = found[0]
  assert(foundRow, 'found вернул пустой массив вопреки length>0')
  assert(
    foundRow.workspacePath === WORKSPACE_PATH,
    `workspace_path не совпал с ожидаемым (${WORKSPACE_PATH}): фактически "${foundRow.workspacePath}"`
  )
  assert(
    !!foundRow.jsonStr && foundRow.jsonStr.includes(mark),
    'json_str записи "above" должен содержать mark'
  )

  const below = await readLogsByMark(ctx, `below ${mark}`, { withPathFilter: false })
  assert(
    below.length === 0,
    '"below <mark>" не должна быть видна (log_level=Warn отсекает info на момент записи)'
  )

  return 'двухфазный лог-тест подтверждает workspace_path и наличие payload в json_str на рабочем уровне'
}

async function test_no_log_recursion(ctx: RichUgcCtx): Promise<string> {
  // getLogLevel/setLogLevel не логируют через writeServerLog (§5.10.9) — регрессионная
  // проверка: серия вызовов не должна падать (RangeError на рекурсии стека).
  // setLogLevel в цикле инвалидирует TTL-кэш (фикс-раунда 2) — иначе 19 из 20
  // чтений били бы в кэш и регрессионная ценность теста была бы нулевой.
  for (let i = 0; i < 80; i++) {
    await setLogLevel(ctx, 'Info')
    await getLogLevel(ctx)
  }
  return 'getLogLevel/setLogLevel не рекурсируют через writeServerLog (20 циклов записи+чтения без падения)'
}

export const integrationTests: Record<string, TestImpl> = {
  happy_path: test_happy_path,
  fanout_width: test_fanout_width,
  drainer_recovery: test_drainer_recovery,
  fanout_double: test_fanout_double,
  publish_dedup: test_publish_dedup,
  reclaim_expired: test_reclaim_expired,
  close_matrix: test_close_matrix,
  foreign_delivery: test_foreign_delivery,
  status_gate: test_status_gate,
  audit_events: test_audit_events,
  log_two_phase: test_log_two_phase,
  no_log_recursion: test_no_log_recursion
}

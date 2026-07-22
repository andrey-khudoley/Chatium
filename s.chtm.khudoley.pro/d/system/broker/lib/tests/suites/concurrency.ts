import { brokerFetchDeliveriesRoute } from '../../../api/broker/deliveries/fetch'
import { brokerPublishRoute } from '../../../api/broker/publish'
import { BrokerEvents } from '../../../tables/events.table'
import { BrokerDeliveries } from '../../../tables/deliveries.table'
import {
  makeUniq,
  testModuleKey,
  testEventType,
  testEventGlob,
  registerTestModule,
  brokerHttp,
  assert
} from '../helpers'
import type { TestImpl } from '../types'

async function test_parallel_fetch_http(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'pf-prod')
  const subKey = testModuleKey(uniq, 'pf-sub')
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

  const NUM_DELIVERIES = 8
  for (let i = 0; i < NUM_DELIVERIES; i++) {
    // dispatchedAt: Date.now() (фикс-раунда 2) — доставка создаётся вручную ниже;
    // событие с null подхватил бы живой asap-дренер и создал бы дубликат,
    // ломая точный assert idsA+idsB === NUM_DELIVERIES.
    const ev = await BrokerEvents.create(ctx, {
      eventType: testEventType(uniq),
      schemaVersion: 1,
      producerModuleKey: prodKey,
      payload: { i },
      dispatchedAt: Date.now()
    })
    await BrokerDeliveries.create(ctx, {
      eventId: ev.id,
      eventType: ev.eventType,
      schemaVersion: 1,
      payload: { i },
      subscriberModuleKey: subKey,
      status: 'pending',
      claimCount: 0
    })
  }

  const [r1, r2] = await Promise.all([
    brokerHttp(brokerFetchDeliveriesRoute.url(), {
      moduleKey: subKey,
      authToken: subReg.authToken,
      limit: NUM_DELIVERIES
    }),
    brokerHttp(brokerFetchDeliveriesRoute.url(), {
      moduleKey: subKey,
      authToken: subReg.authToken,
      limit: NUM_DELIVERIES
    })
  ])
  assert(
    r1.statusCode === 200 && r1.body.success && r2.statusCode === 200 && r2.body.success,
    `оба параллельных fetch должны успешно завершиться: ${JSON.stringify([r1.body, r2.body])}`
  )

  const idsA = new Set<string>((r1.body.deliveries as Array<{ id: string }>).map((d) => d.id))
  const idsB = new Set<string>((r2.body.deliveries as Array<{ id: string }>).map((d) => d.id))
  const intersection = [...idsA].filter((id) => idsB.has(id))
  assert(
    intersection.length === 0,
    `параллельные заборы не должны пересекаться, пересечение: ${JSON.stringify(intersection)}`
  )
  assert(
    idsA.size + idsB.size === NUM_DELIVERIES,
    `суммарно должно быть забрано ${NUM_DELIVERIES}, получено ${idsA.size + idsB.size}`
  )

  return `два параллельных HTTP fetch по ${NUM_DELIVERIES} pending-доставкам не пересекаются (О3)`
}

async function test_parallel_publish_dedup(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const prodKey = testModuleKey(uniq, 'ppd-prod')
  const reg = await registerTestModule(ctx, {
    moduleKey: prodKey,
    allowedPublishTypes: [testEventGlob(uniq)],
    allowedSubscribeTypes: []
  })
  assert(reg.success, 'регистрация не удалась')

  const idempotencyKey = `parallel-idem-${uniq}`
  const [r1, r2] = await Promise.all([
    brokerHttp(brokerPublishRoute.url(), {
      moduleKey: prodKey,
      authToken: reg.authToken,
      eventType: testEventType(uniq),
      payload: {},
      idempotencyKey
    }),
    brokerHttp(brokerPublishRoute.url(), {
      moduleKey: prodKey,
      authToken: reg.authToken,
      eventType: testEventType(uniq),
      payload: {},
      idempotencyKey
    })
  ])
  assert(
    r1.statusCode === 200 && r1.body.success && r2.statusCode === 200 && r2.body.success,
    `оба параллельных publish должны успешно завершиться: ${JSON.stringify([r1.body, r2.body])}`
  )
  assert(
    r1.body.eventId === r2.body.eventId,
    `оба вызова должны сойтись на одном eventId: ${r1.body.eventId} vs ${r2.body.eventId}`
  )

  const count = await BrokerEvents.countBy(ctx, { producerModuleKey: prodKey, idempotencyKey })
  assert(count === 1, `должно остаться ровно одно событие, найдено ${count}`)

  return 'два параллельных HTTP publish с одним idempotencyKey сходятся на одном событии'
}

export const concurrencyTests: Record<string, TestImpl> = {
  parallel_fetch_http: test_parallel_fetch_http,
  parallel_publish_dedup: test_parallel_publish_dedup
}

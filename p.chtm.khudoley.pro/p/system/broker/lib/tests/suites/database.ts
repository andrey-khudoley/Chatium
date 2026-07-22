import { BrokerModules } from '../../../tables/modules.table'
import { BrokerEvents } from '../../../tables/events.table'
import { BrokerDeliveries } from '../../../tables/deliveries.table'
import { BrokerSettings } from '../../../tables/settings.table'
import { makeUniq, testModuleKey, retryRead, assert } from '../helpers'
import type { TestImpl } from '../types'

async function test_tables_exist(ctx: RichUgcCtx): Promise<string> {
  await BrokerModules.findAll(ctx, { limit: 1 })
  await BrokerEvents.findAll(ctx, { limit: 1 })
  await BrokerDeliveries.findAll(ctx, { limit: 1 })
  await BrokerSettings.findAll(ctx, { limit: 1 })
  return 'BrokerModules/BrokerEvents/BrokerDeliveries/BrokerSettings доступны'
}

async function test_schema_version_filter(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'schema')
  await BrokerEvents.create(ctx, {
    eventType: 'test.schema.probe',
    schemaVersion: 2,
    producerModuleKey: moduleKey,
    payload: null,
    dispatchedAt: Date.now()
  })
  const found = await BrokerEvents.findAll(ctx, {
    where: { producerModuleKey: moduleKey, schemaVersion: 2 },
    limit: 10
  })
  assert(found.length === 1, `ожидалась 1 строка с schemaVersion=2, найдено ${found.length}`)
  const notFound = await BrokerEvents.findAll(ctx, {
    where: { producerModuleKey: moduleKey, schemaVersion: 1 },
    limit: 10
  })
  assert(notFound.length === 0, 'schemaVersion=1 не должен матчить строку с версией 2')
  return 'Фильтр по schemaVersion работает (ADR-0003)'
}

async function test_settings_kv_roundtrip(ctx: RichUgcCtx): Promise<string> {
  const key = `test-${makeUniq()}-setting`
  await BrokerSettings.createOrUpdateBy(ctx, 'key', { key, value: { a: 1 } })
  const row1 = await retryRead(() => BrokerSettings.findOneBy(ctx, { key }))
  assert(row1 && (row1 as any).value?.a === 1, 'значение настройки не прочиталось после create')
  await BrokerSettings.createOrUpdateBy(ctx, 'key', { key, value: { a: 2 } })
  const row2 = await retryRead(() => BrokerSettings.findOneBy(ctx, { key }))
  assert(row2 && (row2 as any).value?.a === 2, 'значение настройки не обновилось')
  await BrokerSettings.deleteAll(ctx, { where: { key }, limit: 1, hard: true })
  return 'createOrUpdateBy/findOneBy на BrokerSettings работают (KV round-trip)'
}

async function test_updateall_cas_semantics(ctx: RichUgcCtx): Promise<string> {
  const uniq = makeUniq()
  const moduleKey = testModuleKey(uniq, 'cas')
  const ev = await BrokerEvents.create(ctx, {
    eventType: 'test.cas.probe',
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

  const won = await BrokerDeliveries.updateAll(ctx, {
    patch: { status: 'claimed', claimedAt: Date.now(), claimToken: 'probe', claimCount: 1 },
    where: { id: delivery.id, status: 'pending' },
    limit: 1
  })
  assert(won === 1, `первый CAS должен выиграть (won=${won})`)

  const lost = await BrokerDeliveries.updateAll(ctx, {
    patch: { status: 'claimed', claimedAt: Date.now(), claimToken: 'probe2', claimCount: 2 },
    where: { id: delivery.id, status: 'pending' },
    limit: 1
  })
  assert(lost === 0, `повторный CAS по устаревшему условию должен проиграть (won=${lost})`)

  return 'Семантика updateAll-CAS подтверждена: победитель — 1, проигравший — 0'
}

export const databaseTests: Record<string, TestImpl> = {
  tables_exist: test_tables_exist,
  schema_version_filter: test_schema_version_filter,
  settings_kv_roundtrip: test_settings_kv_roundtrip,
  updateall_cas_semantics: test_updateall_cas_semantics
}

import { Heap } from '@app/heap'
import { IS_PROD } from '../config/env'

/*
  BrokerModules — реестр модулей-участников (§3.1). Объект полей объявляется один
  раз на пару stage/prod; наружу экспортируется только выбранный селектором
  репозиторий (§3 «Окружения») — пара наружу не выходит.
*/

// Heap.Enum ожидает объектный enum (TEnumType) — паттерн, уже используемый в
// воркспейсе (p/units/neso/.../orders.table.ts); строковый массив-литерал
// молча ловит первый (объектный) оверлоад и падает типами.
export const MODULE_SOURCE_ENUM = { internal: 'internal', external: 'external' } as const
export const MODULE_STATUS_ENUM = {
  onModeration: 'onModeration',
  active: 'active',
  disabled: 'disabled'
} as const

const fields = {
  moduleKey: Heap.String({ customMeta: { title: 'Ключ модуля' } }),
  displayName: Heap.Optional(
    Heap.String({ customMeta: { title: 'Человекочитаемое имя (админ-диагностика)' } })
  ),
  source: Heap.Enum(MODULE_SOURCE_ENUM, {
    customMeta: { title: 'Источник регистрации (канал, не из тела запроса)' }
  }),
  allowedPublishTypes: Heap.Array(Heap.String(), {
    customMeta: { title: 'Одобренный whitelist типов публикации (glob, посегментный)' }
  }),
  allowedSubscribeTypes: Heap.Array(Heap.String(), {
    customMeta: { title: 'Одобренный whitelist типов подписки (glob, посегментный)' }
  }),
  pendingPublishTypes: Heap.Optional(
    Heap.Array(Heap.String(), {
      customMeta: { title: 'Заявка на расширение publish (§5.3), null = заявки нет' }
    })
  ),
  pendingSubscribeTypes: Heap.Optional(
    Heap.Array(Heap.String(), {
      customMeta: { title: 'Заявка на расширение subscribe (§5.4), null = заявки нет' }
    })
  ),
  status: Heap.Enum(MODULE_STATUS_ENUM, {
    customMeta: { title: 'Операционный статус модуля (ADR-0010)' }
  }),
  claimTimeoutMs: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Переопределение таймаута claim, мс (null = DEFAULT_CLAIM_TIMEOUT_MS)' }
    })
  ),
  authTokenHash: Heap.String({ customMeta: { title: 'SHA-256 хэш auth-токена (§5.1)' } }),
  metadata: Heap.Optional(
    Heap.Any({ customMeta: { title: 'Произвольные дополнительные данные модуля' } })
  )
}

const BrokerModulesStage = Heap.Table('t__broker__modules__stage_wI7S9L', fields, {
  customMeta: {
    title: 'Broker Modules (stage)',
    description: 'Реестр модулей-участников брокера — §3.1'
  }
})
const BrokerModulesProd = Heap.Table('t__broker__modules__prod_wI7S9L', fields, {
  customMeta: {
    title: 'Broker Modules (prod)',
    description: 'Реестр модулей-участников брокера — §3.1'
  }
})

// Пара наружу не экспортируется — только выбранный селектором репозиторий (§3 «Окружения»)
export const BrokerModules = IS_PROD ? BrokerModulesProd : BrokerModulesStage

export type BrokerModulesRow = typeof BrokerModulesStage.T
export type BrokerModulesRowJson = typeof BrokerModulesStage.JsonT

import { Heap } from '@app/heap'

/*
  BrokerModules — реестр модулей-участников (§3.1).

  Окружение — в сегменте id (`__prod_` в этой prod-копии): id таблицы объявляется
  ровно в ОДНОМ файле аккаунта (повторное объявление — BuildError платформы
  «Detected duplicate heap table name», прогон 22-07-2026), поэтому копия проекта
  объявляет только таблицу своего окружения; перенос d/→p/ трансформирует сегмент
  в `__prod_` (§3 «Окружения», 008-heap.md).
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

export const BrokerModules = Heap.Table('t__broker__modules__prod_wI7S9L', fields, {
  customMeta: {
    title: 'Broker Modules (prod)',
    description: 'Реестр модулей-участников брокера — §3.1'
  }
})

export type BrokerModulesRow = typeof BrokerModules.T
export type BrokerModulesRowJson = typeof BrokerModules.JsonT

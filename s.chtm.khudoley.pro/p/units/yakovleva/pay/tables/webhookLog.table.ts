/**
 * Журнал входящих webhook от платёжных гейтвеев (исторически — LifePay,
 * с 2026-05-28 также Lava.Top).
 *
 * Поля LifePay — по apidoc.life-pay.ru/notification (текущая live-документация).
 * `number` (transaction number LifePay) и `orderNumber` (наш) — searchable.
 *
 * Поле `rawBody` — полное тело webhook (JSON) **без маскирования PII**: клиент
 * Payments Client — оператор персональных данных по 152-ФЗ и хранит сырые данные.
 * Структурная гигиена (циклы, несериализуемое, усечение > 64KB) — через
 * `shared/prepareRawLog.prepareRawLog`. Запись делается ТОЛЬКО при валидном
 * токене/секрете — при `missing`/`mismatch`/`not_configured` запись намеренно
 * не создаётся.
 *
 * Поле `rawQuery` — query параметры как пришли (token не маскируется).
 *
 * Старое поле `emailMasked` (с маскированным email) переименовано в `email`
 * и теперь хранит сырое значение. Обёрнуто в `Heap.Optional` для совместимости
 * с записями, созданными до этого изменения.
 *
 * Поле `gatewayId` (опциональное) добавлено 2026-05-28 для многогейтвейной
 * архитектуры. Старые записи без поля считаются `'lifepay'` (legacy).
 *
 * Поле `gatewayExternalId` (опциональное) — внешний идентификатор события
 * со стороны гейтвея (для Lava.Top — `contractId`; для LifePay используется
 * `correlationId`, поэтому это поле остаётся пустым).
 *
 * Ключ таблицы обновлён после переименования проекта на `p/units/yakovleva/pay`;
 * старые записи из прежнего префикса этой версией не читаются.
 */

import { Heap } from '@app/heap'

// Rebuild Heap registry after project path migration to p/units/yakovleva/pay.
export const WebhookLog = Heap.Table('t__yakovleva-pay__whlog__d2Pq8T', {
  number: Heap.String({
    customMeta: { title: 'Transaction number LifePay (или пусто для Lava.Top)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  gatewayId: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Идентификатор гейтвея (lifepay / lavatop)' },
      searchable: { langs: ['en'], embeddings: false }
    })
  ),
  gatewayExternalId: Heap.Optional(
    Heap.String({
      customMeta: {
        title: 'Внешний ID события со стороны гейтвея (contractId для Lava.Top)'
      },
      searchable: { langs: ['en'], embeddings: false }
    })
  ),
  type: Heap.String({
    customMeta: { title: 'Тип события (payment / refund)' }
  }),
  status: Heap.String({
    customMeta: { title: 'Статус (success / fail / ...)' }
  }),
  method: Heap.String({
    customMeta: { title: 'Метод оплаты (card / internetAcquiring / mobileInternetAcquiring / ...)' }
  }),
  amount: Heap.String({
    customMeta: { title: 'Сумма (строка с двумя знаками)' }
  }),
  orderNumber: Heap.String({
    customMeta: { title: 'order.number из вложенного JSON (наш orderNumber)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  correlationId: Heap.Optional(
    Heap.String({
      customMeta: {
        title: 'correlationId из query callbackUrl (связка с request_log; пусто если нет)'
      }
    })
  ),
  tokenValid: Heap.Boolean({
    customMeta: { title: 'Был ли токен в query валиден' }
  }),
  duplicate: Heap.Boolean({
    customMeta: { title: 'Дубликат: number уже встречался' }
  }),
  processedAt: Heap.Number({
    customMeta: { title: 'Unix ms момента приёма' }
  }),
  email: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Email покупателя (raw, без маскирования)' }
    })
  ),
  rawBody: Heap.Optional(
    Heap.Any({
      customMeta: { title: 'Полное тело webhook (raw, без PII-маски)' }
    })
  ),
  rawQuery: Heap.Optional(
    Heap.Any({
      customMeta: { title: 'Query параметры (raw, token не маскируется)' }
    })
  )
})

export default WebhookLog

export type WebhookLogRow = typeof WebhookLog.T
export type WebhookLogRowJson = typeof WebhookLog.JsonT

# Broker-контракты коннектора

> Вынесено из [spec.md](spec.md) §10.
> Общие правила регистрации контрактов — там же.

---

## Правила, обязательные для авторинга контракта

Каждый из 3 новых контрактов в `contracts/brokerEvents.ts` (массив `BROKER_EVENT_CONTRACTS`)
должен иметь **полный** набор полей по образцу существующего `getcourse.raw_event.accepted`
(см. `contracts/brokerEvents.ts`):

- `eventType`, `eventVersion: 1`, `status: 'active'`, `description`;
- `payloadSchemaFormat: 'json-schema-subset-v1'`, `payloadSchema` (схемы ниже);
- `sourceRef: { moduleKey: MODULE_KEY, path: 'contracts/brokerEvents.ts', exportName: 'BROKER_EVENT_CONTRACTS', docsPath: 'docs/spec/broker-events.md' }`;
- `display.summaryFields` (2–3 поля для админ-сводки ядра);
- `examples` (≥1 валидный payload);
- `metadata: { interface: 'getcourse' }`.

**Ограничения схемы** (`schemaValidation.lib.ts`): только ключи `type`, `required`, `properties`,
`items`, `additionalProperties`, `enum`, `const`. «Опциональность» — отсутствием поля в `required`
(nullable/`format`/`minLength` недоступны). Все события — `additionalProperties: false`.

**Детерминизм (B2):** в payload **нет** волатильных полей (`occurredAt`/`paidAt` убраны).
Временную метку несёт конверт publish-request `occurredAt`, и она **детерминирована**:
`created` → `0` (у ответа createDeal таймстемпа нет; ключ уникален per `orderKey`);
`status_changed`/`paid` → Unix ms из `status_updated_at` постбэка (строка datetime → `Date.parse`).
Никогда не `Date.now()`. `amount` — число, `currency` — строка; оба из `Orders.amount` (Money),
а сумму задаёт потребитель при создании (M2). Все поля payload детерминированы по сделке.

---

## Новые события

### `getcourse.order.created@1`

Когда: сделка создана в GetCourse, получена `paymentUrl`.

| Поле payload     | Тип    | Req | Описание                                         |
| ---------------- | ------ | :-: | ------------------------------------------------ |
| `orderKey`       | string |  ✓  | внутренний ключ заказа                           |
| `idempotencyKey` | string |  ✓  | внешний ключ идемпотентности потребителя         |
| `gcDealId`       | string |  ✓  | id сделки в GetCourse                            |
| `gcDealNumber`   | string |  ✓  | номер сделки                                     |
| `offerId`        | string |  ✓  | числовой `offer_id` оффера                       |
| `userEmail`      | string |  ✓  | покупатель                                       |
| `amount`         | number |  ✓  | сумма (числом; источник истины Money — в Orders) |
| `currency`       | string |  ✓  | валюта (из Money)                                |
| `status`         | string |  ✓  | начальный внутренний статус (`new`)              |
| `paymentUrl`     | string |  ✓  | ссылка на оплату                                 |

```jsonc
// payloadSchema
{
  "type": "object",
  "required": [
    "orderKey",
    "idempotencyKey",
    "gcDealId",
    "gcDealNumber",
    "offerId",
    "userEmail",
    "amount",
    "currency",
    "status",
    "paymentUrl"
  ],
  "properties": {
    "orderKey": { "type": "string" },
    "idempotencyKey": { "type": "string" },
    "gcDealId": { "type": "string" },
    "gcDealNumber": { "type": "string" },
    "offerId": { "type": "string" },
    "userEmail": { "type": "string" },
    "amount": { "type": "number" },
    "currency": { "type": "string" },
    "status": { "type": "string" },
    "paymentUrl": { "type": "string" }
  },
  "additionalProperties": false
}
```

`idempotencyKey` (брокера): `'getcourse-order-created:' + orderKey`

---

### `getcourse.order.status_changed@1`

Когда: любой апдейт статуса заказа из входящего postback.

| Поле payload   | Тип     | Req | Описание                                                          |
| -------------- | ------- | :-: | ----------------------------------------------------------------- |
| `orderKey`     | string  |  ✓  | внутренний ключ заказа                                            |
| `gcDealId`     | string  |  ✓  | id сделки                                                         |
| `gcDealNumber` | string  |  ✓  | номер сделки                                                      |
| `fromStatus`   | string  |  —  | предыдущий внутренний статус (текущий `Orders.status` до апдейта) |
| `toStatus`     | string  |  ✓  | новый внутренний статус                                           |
| `gcStatus`     | string  |  ✓  | сырой статус GC                                                   |
| `isPayed`      | boolean |  ✓  | признак оплаты из GC                                              |

```jsonc
// payloadSchema
{
  "type": "object",
  "required": ["orderKey", "gcDealId", "gcDealNumber", "toStatus", "gcStatus", "isPayed"],
  "properties": {
    "orderKey": { "type": "string" },
    "gcDealId": { "type": "string" },
    "gcDealNumber": { "type": "string" },
    "fromStatus": { "type": "string" },
    "toStatus": { "type": "string" },
    "gcStatus": { "type": "string" },
    "isPayed": { "type": "boolean" }
  },
  "additionalProperties": false
}
```

`idempotencyKey` (брокера): `'getcourse-status:' + orderKey + ':' + webhookId`
(webhookId уникален per постбэк — исключает fingerprint-конфликт при разных gcStatus → один toStatus)
`occurredAt` (конверт): из `status_updated_at` postback (детерминирован).

> Регрессии статуса допускаются (M4): `fromStatus`/`toStatus` могут идти «назад» (откат менеджером).

---

### `getcourse.order.paid@1`

Когда: переход заказа в статус оплачен (`paid`). Публикуется дополнительно к `status_changed`.

| Поле payload   | Тип    | Req | Описание               |
| -------------- | ------ | :-: | ---------------------- |
| `orderKey`     | string |  ✓  | внутренний ключ заказа |
| `gcDealId`     | string |  ✓  | id сделки              |
| `gcDealNumber` | string |  ✓  | номер сделки           |
| `userEmail`    | string |  ✓  | покупатель             |
| `amount`       | number |  ✓  | сумма (числом)         |
| `currency`     | string |  ✓  | валюта (из Money)      |

```jsonc
// payloadSchema
{
  "type": "object",
  "required": ["orderKey", "gcDealId", "gcDealNumber", "userEmail", "amount", "currency"],
  "properties": {
    "orderKey": { "type": "string" },
    "gcDealId": { "type": "string" },
    "gcDealNumber": { "type": "string" },
    "userEmail": { "type": "string" },
    "amount": { "type": "number" },
    "currency": { "type": "string" }
  },
  "additionalProperties": false
}
```

`idempotencyKey` (брокера): `'getcourse-order-paid:' + orderKey`
`occurredAt` (конверт): из `status_updated_at` postback (детерминирован).

---

## Существующие события (не меняются)

- `getcourse.raw_event.accepted@1` — сырой конверт входящего webhook; сохраняется для обратной
  совместимости.

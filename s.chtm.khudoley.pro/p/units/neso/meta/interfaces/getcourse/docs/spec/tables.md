# Heap-таблицы коннектора

> Вынесено из [spec.md](spec.md) §9.
> Конструкторы Heap — по образцу существующих `tables/*.table.ts` (`Heap.String`, `Heap.Number`,
> `Heap.Any`, `Heap.Boolean`). Системные поля `id`/`createdAt`/`updatedAt` не объявлять — Heap
> добавляет их автоматически.

---

## `tables/orders.table.ts` — `Orders`

Фактическое имя Heap-таблицы: `t__neso_meta_gc_iface__orders__xP9mR4`.

| Поле                | Тип Heap | Конструктор                         | Назначение                                                                     |
| ------------------- | -------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| `orderKey`          | String   | `Heap.String`                       | внутренний идемпотентный ключ (`accountNanoid`), ключ upsert                   |
| `idempotencyKey`    | String   | `Heap.String`                       | **внешний** ключ идемпотентности от потребителя (поиск `findByIdempotencyKey`) |
| `gcDealId`          | String   | `Heap.String`                       | id сделки GetCourse (корреляция webhook, приоритет)                            |
| `gcDealNumber`      | String   | `Heap.String`                       | номер сделки GetCourse (корреляция webhook, fallback)                          |
| `offerId`           | String   | `Heap.String`                       | числовой `offer_id` оффера (хранится строкой)                                  |
| `userEmail`         | String   | `Heap.String`                       | покупатель                                                                     |
| `firstName`         | String   | `Heap.String`                       | имя (с входа создания)                                                         |
| `lastName`          | String   | `Heap.String`                       | фамилия                                                                        |
| `phone`             | String   | `Heap.String`                       | телефон                                                                        |
| `utmSource`         | String   | `Heap.String`                       | utm (с входа создания)                                                         |
| `utmMedium`         | String   | `Heap.String`                       | utm                                                                            |
| `utmCampaign`       | String   | `Heap.String`                       | utm                                                                            |
| `utmContent`        | String   | `Heap.String`                       | utm                                                                            |
| `utmTerm`           | String   | `Heap.String`                       | utm                                                                            |
| `amount`            | Money    | `Heap.Money`                        | стоимость (Money **несёт валюту сам** — отдельной `currency` нет)              |
| `paymentUrl`        | String   | `Heap.String`                       | ссылка на оплату (из `result.payment_link`)                                    |
| `status`            | Enum     | `Heap.Enum(ORDER_STATUS_ENUM, ...)` | внутренний статус                                                              |
| `rawCreateResponse` | Any      | `Heap.Any`                          | сырой ответ/ошибка гейтвея на создание (трассировка)                           |
| `rawStatus`         | Any      | `Heap.Any`                          | последнее сырое тело postback                                                  |

**Колонка `status`** — `Heap.Enum` от объектного enum `ORDER_STATUS_ENUM`:

```ts
export const ORDER_STATUS_ENUM = {
  new: 'new',
  pending: 'pending',
  part_paid: 'part_paid',
  paid: 'paid',
  cancelled: 'cancelled',
  failed: 'failed'
} as const

status: Heap.Enum(ORDER_STATUS_ENUM, {
  customMeta: { title: 'Статус заказа' }
})
```

> Валюта берётся из `amount` (Money). Отдельная колонка `currency` **убрана** как избыточная.
> Поиск по `gcDealId`/`gcDealNumber`/`idempotencyKey` реализован серверными репозиторными методами
> через `findOneBy`; клиентский `filter`/перебор не используется. Индексы/опции колонок для
> уникальности и быстрых выборок оформляются отдельным расширением при появлении такой нагрузки.

---

## `tables/webhookEvents.table.ts` — `WebhookEvents`

Фактическое имя Heap-таблицы: `t__neso_meta_gc_iface__webhook_events__kQ7nW2`.

| Поле           | Тип Heap | Конструктор    | Назначение                                                        |
| -------------- | -------- | -------------- | ----------------------------------------------------------------- |
| `webhookId`    | String   | `Heap.String`  | ключ дедупликации `deal_id:status:status_updated_at`, ключ upsert |
| `orderKey`     | String   | `Heap.String`  | найденный заказ (корреляция/аудит)                                |
| `gcDealNumber` | String   | `Heap.String`  | для корреляции с заказом                                          |
| `gcDealId`     | String   | `Heap.String`  | для корреляции с заказом                                          |
| `status`       | String   | `Heap.String`  | сырой GC-статус                                                   |
| `isPayed`      | Boolean  | `Heap.Boolean` | признак оплаты                                                    |
| `payload`      | Any      | `Heap.Any`     | сырое тело webhook                                                |
| `processed`    | Boolean  | `Heap.Boolean` | флаг идемпотентной обработки (default false)                      |

> Поле `receivedAt` **убрано** — момент приёма даёт системный `createdAt` (Heap добавляет его сам).

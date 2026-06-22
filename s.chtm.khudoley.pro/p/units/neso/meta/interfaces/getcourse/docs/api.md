# API

## App Functions (внутренний сервис)

Вызываются через `runAppFunction(ctx, 'p/units/neso/meta/interfaces/getcourse', '/...', params)`. Публичный HTTP-доступ не предусмотрен.

| Путь                | Файл                            | Назначение                                           |
| ------------------- | ------------------------------- | ---------------------------------------------------- |
| `/offers/list`      | `functions/offers/list.ts`      | Получить список офферов из GetCourse                 |
| `/orders/create`    | `functions/orders/create.ts`    | Создать заказ (идемпотентно)                         |
| `/orders/get`       | `functions/orders/get.ts`       | Получить снапшот заказа по ключу                     |
| `/checkout/process` | `functions/checkout/process.ts` | Drain-цикл обработки доставок web.checkout.submitted |

### `/offers/list`

Вход: нет.

Выход: `{ ok: true, offers: NormalizedOffer[] }` | `{ ok: false, error }`.

Оффер: `{ id, title, price, finalPrice, currency, status }`.

### `/orders/create`

Вход: `CreateOrderInput` — обязательные поля `idempotencyKey`, `email`, `amount`, `currency`; опциональные `offerId`, `firstName`, `lastName`, `phone`, `utmSource`…`utmTerm`, `correlationId`.

Выход: `{ success: true, paymentUrl, dealNumber, orderKey }` | `{ success: false, errorMessage }`.

Идемпотентность: повторный вызов с тем же `idempotencyKey` возвращает существующий заказ, не создавая новый. Исключение — заказ в статусе `failed`: тогда пересоздаётся. При успешном создании публикует событие `getcourse.order.created@1`.

`correlationId` (опц.) — пробрасывается как поле конверта в событие `getcourse.order.created@1`. Используется вызовами через broker-подписку (e.g. обработчик `web.checkout.submitted`), где роль correlationId играет `requestKey` доставки.

### `/checkout/process`

Вход: `{ limit?: number; maxBatches?: number }`.

Выход: `{ processed: number; failed: number; skipped: number }`.

Pump-точка drain-цикла: poll → handle → ack/fail для доставок типа `web.checkout.submitted@1` из core broker. Вызывается доверенными модулями NeSo через `runAppFunction` (модуль web — после publish) либо вручную/тестами. Проверка caller'а намеренно отсутствует (аналогично `/orders/create`).

Логика обработки — `lib/checkout/processCheckoutSubmitted.lib.ts`:

- `extractCheckoutPayload(payload)` — терпимый парсер входящего payload доставки.
- `handleCheckoutSubmittedPayload(ctx, payload)` → `{ ok: true, orderKey }` | `{ ok: false, permanent, errorMessage }` — вызывает `/orders/create` с `correlationId = requestKey` доставки и `idempotencyKey` из payload.
- `processCheckoutSubmittedDeliveries(ctx, { limit, maxBatches })` — drain-цикл (poll → handle → ack/fail).

### `/orders/get`

Вход: `{ orderKey }` или `{ idempotencyKey }`.

Выход: `{ ok: true, order: { orderKey, idempotencyKey, status, paymentUrl, gcDealId, gcDealNumber, offerId, amount, currency, userEmail } }` | `{ ok: false, error: 'not_found' }`.

Сырые поля (`rawCreateResponse`, `rawStatus`) наружу не передаются.

---

## Webhook (публичный)

| Method | Path                        | Файл                             | Auth                     | Назначение                |
| ------ | --------------------------- | -------------------------------- | ------------------------ | ------------------------- |
| POST   | `/` (через withProjectRoot) | `api/webhook/getcourse/index.ts` | Анонимный + token-фильтр | Приём постбэков GetCourse |

Роут анонимный — без `requireRealUser` и `@shared-route`. URL формируется через `withProjectRoot(route.url())`.

**Защита:** если настроен `webhook_path_token`, запрос без совпадающего параметра `?token=` отклоняется с HTTP 403 (возвращается `{ statusCode: 403, rawHttpBody, headers }`).

**Обработка:** принимает GC postback по заказу (`event_object_id=2`). Выполняет корреляцию с существующим заказом, обновляет статус, публикует broker-события. Дубль или нерелевантный постбэк — HTTP 200. Внутренняя ошибка — throw → HTTP 5xx.

---

## Broker-события

Контракты объявлены в `contracts/brokerEvents.ts`. Подробная спецификация payload — [`docs/spec/broker-events.md`](spec/broker-events.md).

| Событие                            | Когда публикуется                    | Idempotency key брокера                   |
| ---------------------------------- | ------------------------------------ | ----------------------------------------- |
| `getcourse.order.created@1`        | `/orders/create` — успешное создание | `getcourse-order-created:{orderKey}`      |
| `getcourse.order.status_changed@1` | Каждый входящий постбэк GC           | `getcourse-status:{orderKey}:{webhookId}` |
| `getcourse.order.paid@1`           | Постбэк с переходом в статус оплаты  | `getcourse-order-paid:{orderKey}`         |

Поле `occurredAt` у `order.created@1` — `0` (момент создания сделки в GC неизвестен).

---

## Broker-подписка (входящая)

Реализована в `lib/broker/coreBrokerClient.lib.ts`. Допустимые типы подписки: `web.checkout.*`.

| Операция                         | Описание                                                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `registerCoreBrokerSubscription` | Регистрирует подписку на `web.checkout.submitted@1` от модуля `web`, режим уведомления `none`. Вызывается при инициализации модуля. |
| `pollCoreBrokerDeliveries`       | Poll доставок из core broker. Вход: `(ctx, limit)`. Возвращает список доставок.                                                     |
| `ackCoreBrokerDeliveries`        | Подтверждение успешно обработанных доставок. Вход: `(ctx, items)`.                                                                  |
| `failCoreBrokerDeliveries`       | Отметка доставок как неудавшихся. Вход: `(ctx, items)`.                                                                             |

Все четыре функции — обёртки над ядром `/broker/{subscriptions/register,poll,ack,fail}`. Точки подмены `_setRunAppFn` / `_resetRunAppFn` предназначены для тестов.

---

## Настройки модуля

Управляются через `components/admin/AdminSettings.vue`.

| Ключ                  | Тип    | Назначение                       |
| --------------------- | ------ | -------------------------------- |
| `gateway_base_url`    | строка | Базовый URL шлюза                |
| `gc_school_host`      | строка | Хост школы GetCourse             |
| `gc_school_api_key`   | секрет | API-ключ GetCourse               |
| `webhook_path_token`  | секрет | Токен защиты webhook-роута       |
| `gc_default_offer_id` | строка | Оффер по умолчанию               |
| `gc_paid_status`      | строка | Статус GC, считающийся «оплачен» |

---

## Module Broker API

| Route                       | Method | Access | Description                                                  |
| --------------------------- | ------ | ------ | ------------------------------------------------------------ |
| `/api/module/register`      | POST   | Admin  | Register this module and its event contracts in core broker. |
| `/api/module/publish-event` | POST   | Admin  | Publish a `getcourse.raw_event.accepted` event.              |

### POST /api/module/publish-event

Request:

```json
{
  "rawEventId": "gc_evt_1",
  "eventType": "deal.created",
  "source": "manual",
  "accountName": "school.example",
  "objectId": "deal-123",
  "userId": "user-456",
  "payloadJson": "{\"id\":\"deal-123\",\"status\":\"new\"}",
  "targetModules": []
}
```

Response is the core broker publish result.

## Standard API

The copied module shell also includes standard settings, logs, dashboard and tests API:

- `/api/settings/*`
- `/api/logger/*`
- `/api/admin/logs/*`
- `/api/admin/dashboard/*`
- `/api/tests/*`

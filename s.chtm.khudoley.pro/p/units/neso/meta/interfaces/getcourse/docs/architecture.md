# Architecture

`p/units/neso/meta/interfaces/getcourse` — интерфейсный модуль GetCourse. Живёт рядом с
`p/units/neso/meta/core`. Реализует двустороннее взаимодействие с GetCourse: исходящий
API-коннектор (офферы, создание сделок) и входящий вебхук (постбэки статусов).

## Слои

- `config/` — заголовок проекта, route-хелперы.
- `pages/`, `components/`, `web/`, `pagecss/`, `shared/` — UI-оболочка.
- `tables/` — Heap-таблицы (`Orders`, `WebhookEvents`).
- `repos/` — CRUD-обёртки над таблицами (`repos/orders.repo.ts`,
  `repos/webhookEvents.repo.ts`): `findBy*`, `upsert` через `createOrUpdateBy`.
- `lib/` — вся серверная бизнес-логика (см. раздел «Подслои lib/»). Включает подслой
  `lib/checkout/` — обработка broker-доставок от ядра (поверх `lib/orders` и `lib/broker`).
- `api/` — файл-роуты: `appFunction`-эндпоинты для NeSo и вебхук-приёмник.
- `contracts/` — контракты брокерных событий, принадлежащих модулю
  (`contracts/brokerEvents.ts`).
- `lib/broker/coreBrokerClient.lib.ts` — единственное место вызова брокерных функций core.

## Подслои lib/

### gateway

- `lib/gateway/gcGatewayClient.lib.ts` — единственный исходящий HTTP-клиент.
  Вызывает `@app/request` с `throwHttpErrors:false`, `timeout:15000`.
  Экспортирует `callGetOffers` (GET) и `callCreateDeal` (POST, тело `{ params }`).
  Возвращает конверт `{ ok, data }` / `{ ok:false, error:{ code } }`.
  Содержит `classifyGatewayError` и точку подмены transport для тестов.
  Заголовки `X-Gc-School-Host` / `X-Gc-School-Api-Key` подставляет гейтвей (dev-key — там же).

- `lib/gateway/parseGcDeals.lib.ts` — чистая функция `parseGcDealsResponse`.
  Проверяет двойной флаг успеха (`body.success && result.success`);
  при `result.error` возвращает ошибку. Извлекает поля
  `payment_link`, `deal_id`, `deal_number`, `user_id`.

### offers

- `lib/offers/offers.lib.ts` — `fetchOffers` + `normalizeOffer` (возвращает `null`
  при пустом `id`) + `extractOffers` (разворачивает двойную обёртку `data.data`).

### orders

- `lib/orders/orders.lib.ts` — `createOrder`: валидация входа →
  `runWithExclusiveLock('gc-order-create:' + idempotencyKey)` →
  `findByIdempotencyKey` (повтор при `status='failed'`) →
  `callCreateDeal` → `parseGcDeals` → `Orders.upsert` →
  публикация события `created@1` (`occurredAt: 0`).
  Все Heap-операции выполняются внутри лока через `lockCtx`.

- `lib/orders/orderStatus.lib.ts` — `mapGcStatus` / `isPayedTruthy`:
  маппинг GC-статусов в внутренние (`new` / `pending` / `part_paid` /
  `paid` / `cancelled` / `failed`).

- `lib/orders/money.lib.ts` — `toMoney` / `fromMoney`:
  конвертация в `Heap.Money` (несёт валюту; null-guard;
  `@ts-ignore` только на `new Money`).

### checkout

- `lib/checkout/processCheckoutDeliveries.lib.ts` — `processCheckoutSubmittedDeliveries`:
  poll/claim доставок `web.checkout.submitted@1` из ядра-брокера (`coreBrokerClient`) →
  для каждой доставки вызывает `handleCheckoutSubmittedPayload` →
  при успехе — ack, при ошибке — fail (нефатально: drain продолжается).

- `lib/checkout/handleCheckoutPayload.lib.ts` — `handleCheckoutSubmittedPayload`:
  парсит payload доставки (`requestKey`, `idempotencyKey`, поля заказа) →
  вызывает существующий `createOrder` с `idempotencyKey` из payload →
  публикует `getcourse.order.created@1` с `correlationId = requestKey`.

Подслой вызывается из `app.function('/checkout/process')` (pump-by-publisher):
web публикует `web.checkout.submitted@1` → ядро создаёт доставку для подписчика →
web вызывает `/checkout/process` напрямую после publish (идиома `publish→scheduleJobAsap`,
без вечного cron). Подписка регистрируется один раз при холодном старте модуля.

### webhook

- `lib/webhook/processWebhook.lib.ts` — `processWebhook`:
  `runWithExclusiveLock('gc-webhook:' + webhookId)` →
  дедуп по флагу `processed` →
  корреляция `Orders` по `gcDealId` / `gcDealNumber` →
  `mapGcStatus` →
  публикация `status_changed@1` (ключ включает `webhookId`) +
  `paid@1` (только при переходе `fromStatus !== 'paid' && toStatus === 'paid'`) →
  **после** публикации — запись `status` заказа и флага `processed`
  (порядок гарантирует атомарность против частичного сбоя публикации).

## Поток данных

### Исходящий (коннектор)

```
NeSo → runAppFunction('/offers/list' | '/orders/create' | '/orders/get')
     → api/{offers|orders}/*   (appFunction-роут)
     → lib/{offers|orders}
     → gcGatewayClient  →  гейтвей (HTTP /v1/{op})  →  GetCourse
```

### Входящий (вебхук)

```
GetCourse postback
  → api/webhook/getcourse   (анонимный роут, токен-фильтр)
  → processWebhook
  → broker (meta/core)
  → подписчики
```

### Входящий (broker-подписка)

```
web publishes web.checkout.submitted@1
  → meta/core broker  (создаёт доставку для подписчика getcourse)
  → web вызывает app.function('/checkout/process')   (pump-by-publisher, scheduleJobAsap)
  → processCheckoutSubmittedDeliveries  (poll/claim доставок из ядра)
  → handleCheckoutSubmittedPayload  (парсит payload)
  → createOrder  (существующий lib/orders, идемпотентен по idempotencyKey)
  → publishes getcourse.order.created@1  (correlationId = requestKey)
  → ack доставки
```

## Идемпотентность и детерминизм брокера

**Создание заказа (прямой вызов).** Вход принимает `idempotencyKey` (формирует вызывающий).
Лок `gc-order-create:<key>` предотвращает параллельные дубли.
Повторный вызов при `status='failed'` запускает ретрай; при любом другом
статусе — возвращает существующую запись без повторного обращения к GC.

**Создание заказа через broker-подписку (at-least-once).** Поток `web.checkout.submitted@1`
доставляется с гарантией at-least-once: ядро-брокер удерживает доставку до явного ack.
При параллельных pump эксклюзивный claim в ядре (только один потребитель получает доставку)
плюс лок `gc-order-create:<idempotencyKey>` в `createOrder` исключают двойную обработку.
Если ack не пришёл в пределах `ackTimeout` (сбой или перезапуск) — доставка возвращается
в очередь; повторный вызов `createOrder` с тем же `idempotencyKey` вернёт уже созданную
запись без дублирования сделки в GC.
Холодный старт: подписка регистрируется один раз до первого poll; ядро не создаёт доставки
ретроактивно — модуль должен быть подписан на момент publish.

**Вебхук.** `webhookId` = `dealId:gcStatus:statusUpdatedAt`.
Флаг `processed` на записи `WebhookEvents` блокирует повторную обработку.
Лок `gc-webhook:<webhookId>` исключает гонку при одновременных доставках.

**Детерминизм `occurredAt`.**

- `created` → `occurredAt: 0` (фиксированное значение; не зависит от времени вызова).
- `status_changed`, `paid` → Unix ms из поля `status_updated_at` GC-постбэка.

Это критично: fingerprint брокера ядра (`meta/core`) включает `occurredAt` + payload.
Payload не содержит волатильных полей (метки времени вызова, случайные id),
поэтому повторная публикация того же события даёт тот же fingerprint —
брокер обнаруживает дубль и не обрабатывает его повторно.

## Брокерные события модуля

Контракты в `contracts/brokerEvents.ts`:

| Событие                   | Версия | Когда публикуется                                                          |
| ------------------------- | ------ | -------------------------------------------------------------------------- |
| `created`                 | 1      | Успешное создание сделки в GC (прямой вызов `/orders/create`)              |
| `getcourse.order.created` | 1      | Успешное создание сделки через broker-поток (`correlationId = requestKey`) |
| `status_changed`          | 1      | Любое изменение статуса из GC-постбэка                                     |
| `paid`                    | 1      | Переход в статус `paid` (если не был paid ранее)                           |

Модуль не импортирует внутренности core напрямую; все вызовы —
через `lib/broker/coreBrokerClient.lib.ts`.

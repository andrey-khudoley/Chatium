# Architecture

Источник истины: `docs/spec/spec.md`.

## Назначение

`p/units/neso/meta/interfaces/web` — Chatium-модуль публичного checkout-интерфейса NeSo Meta.

Целевая архитектура: пользовательская форма публикует событие `web.checkout.submitted@1` в `p/units/neso/meta/core`; GetCourse interface создаёт заказ и публикует `getcourse.order.created@1`; web-модуль получает это событие через broker delivery, отправляет `payment_ready` в WebSocket и клиент редиректит пользователя на `paymentUrl`.

## Текущее состояние

Checkout runtime реализован согласно spec rev.2:

- SSR-вход (`index.tsx`) + клиентская страница (`pages/CheckoutPage.vue`);
- API: `api/checkout/submit`, `api/checkout/status`, `api/module/register`;
- Broker-слой: `contracts/` (регистрация событий) + `lib/broker/` (producer/consumer);
- Checkout-логика: `lib/checkout/` (константы, нормализация, builders, обработчик доставок);
- Хранение: `tables/checkoutRequests` + repo;
- Страховочная джоба: `jobs/broker/poll` (self-terminating fallback).

## Основные слои

| Слой       | Каталог                        | Назначение                                                                                  |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| SSR routes | `index.tsx`, `web/*/index.tsx` | HTML entrypoints и SSR props (передают `requestKey`, `encodedSocketId` в CheckoutPage)     |
| Vue pages  | `pages/`                       | Клиентские страницы; без импортов `lib/`, `repos/`, `tables/`                              |
| API        | `api/`                         | `api/checkout/submit` — сабмит формы; `api/checkout/status` — poll статуса; `api/module/register` — регистрация модуля в ядре |
| Jobs       | `jobs/`                        | `jobs/broker/poll` — self-terminating fallback-джоба доставок (страховка при отсутствии socket/poll) |
| Contracts  | `contracts/`                   | Broker-контракт событий: описание `web.checkout.*` и подписки на `getcourse.order.*`       |
| Broker     | `lib/broker/`                  | Клиент ядра-брокера: producer (`web.checkout.submitted@1`), consumer (`getcourse.order.created@1`) |
| Checkout   | `lib/checkout/`                | Константы/ключи lock и socket, нормализация формы, builders socket-сообщений, обработчик доставок |
| Tables     | `tables/`                      | `tables/checkoutRequests` (requestKey, paymentUrl, status) + прочие settings/logs          |
| Repos      | `repos/`                       | Серверный доступ к Heap                                                                     |
| Lib        | `lib/`                         | Серверная бизнес-логика                                                                     |
| Shared     | `shared/`                      | Browser-safe helpers: `shared/checkoutClient` (типы для Vue) и shared routes               |

## Routing

`PROJECT_ROOT = 'p/units/neso/meta/interfaces/web'`.

Все внутренние ссылки должны строиться через `config/routes.tsx`. Route-файлы используют путь `'/'`.

## Поток данных (Checkout Flow)

```
GET /
 └─ SSR index.tsx
     ├─ accountNanoid → requestKey (rk)
     ├─ genSocketId('checkout:'+rk) → encodedSocketId
     └─ CheckoutPage.vue (SSR props: requestKey, encodedSocketId)
          └─ клиент подписывается на encodedSocketId, ждёт payment_ready

POST api/checkout/submit
 ├─ lock(checkout:{rk})
 ├─ upsert строки submitted в checkoutRequests
 ├─ publish web.checkout.submitted@1  (payload.idempotencyKey = web-checkout:{rk})
 ├─ ping getcourse /checkout/process  (cold-start подписки GetCourse)
 └─ scheduleJobAfter(jobs/broker/poll)  ← fallback-страховка

GetCourse interface (отдельный модуль):
 ├─ получает web.checkout.submitted@1
 ├─ создаёт заказ в GetCourse
 └─ publish getcourse.order.created@1  (payload.idempotencyKey = web-checkout:{rk})

Web: получение доставки (два параллельных канала):
 ├─ [основной]   api/checkout/status (client-driven poll) → processOrderCreatedDeliveries
 └─ [страховка]  jobs/broker/poll (self-terminating fallback-джоба)

Обработчик доставки:
 ├─ корреляция: event.payload.idempotencyKey == 'web-checkout:{rk}'
 ├─ orphan-доставка (нет строки) → fail, не ack
 ├─ невалидный payload → ack (skip)
 ├─ lock(checkout:{rk})
 ├─ upsert paymentUrl + status payment_ready
 └─ sendDataToSocket(raw socketId) → payment_ready

Клиент (CheckoutPage):
 └─ redirect по первому полученному paymentUrl (HTTP-ответ /status ИЛИ socket)
```

Идиома триггера доставки — pump+poll без вечного cron. WebSocket — дублирующий/ускоряющий канал, не единственный.

## Идемпотентность и race conditions

- Единый lock `checkout:{requestKey}` применяется в submit и в обработчике доставок.
- Повторный submit при уже созданной строке не плодит новый publish (no-op по терминальному статусу).
- Эксклюзивный claim доставки — на стороне ядра.
- `occurredAt: 0` в builder событий — детерминизм fingerprint (избегает дублей).

## Граница клиент/сервер

Vue-компонент `CheckoutPage.vue` импортирует только:

- `shared/checkoutClient` — типы и browser-safe константы;
- `@app/socket` — подписка на encodedSocketId;
- route-объекты через `.run()` (помечены `// @shared-route`).

Запрещено импортировать в `.vue`: `tables/`, `repos/`, `lib/`, `lib/broker/`, `lib/checkout/`.

Сервер отправляет `payment_ready` по **raw socketId** (декодируется из encodedSocketId на сервере).

## WebSocket Flow

Клиент получает `encodedSocketId` через SSR props (`genSocketId('checkout:'+rk)`), подписывается на него и ждёт `payment_ready`. Сервер отправляет по raw socketId (внутреннее представление). WebSocket — ускоряющий канал; клиент также делает poll через `api/checkout/status` и редиректит по первому пришедшему ответу.

## Ограничения

- Web Interface не хранит секреты GetCourse.
- GetCourse order creation остаётся в `interfaces/getcourse`.
- WebSocket нужен только для короткого события о готовой ссылке.
- Любой runtime-шаг сначала отражается в `docs/spec/spec.md`.

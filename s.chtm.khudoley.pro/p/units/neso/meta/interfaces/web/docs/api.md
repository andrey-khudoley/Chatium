# API

Источник истины по контрактам: `docs/spec/spec.md`.

## Текущий scaffold API

Скопирован из `p/template_project` и оставлен для настроек, логов, админки и тестового harness.

| Method | Path                          | File                             | Auth    | Назначение                     |
| ------ | ----------------------------- | -------------------------------- | ------- | ------------------------------ |
| GET    | `/api/settings/list`          | `api/settings/list.ts`           | Admin   | Список настроек                |
| GET    | `/api/settings/get?key=`      | `api/settings/get.ts`            | Admin   | Получить настройку             |
| POST   | `/api/settings/save`          | `api/settings/save.ts`           | Admin   | Сохранить настройку            |
| POST   | `/api/logger/log`             | `api/logger/log.ts`              | AnyUser | Записать серверный лог         |
| GET    | `/api/admin/logs/recent`      | `api/admin/logs/recent.ts`       | Admin   | Последние логи                 |
| GET    | `/api/admin/logs/before`      | `api/admin/logs/before.ts`       | Admin   | Пагинация логов                |
| GET    | `/api/admin/dashboard/counts` | `api/admin/dashboard/counts.ts`  | Admin   | Счётчики ошибок/предупреждений |
| POST   | `/api/admin/dashboard/reset`  | `api/admin/dashboard/reset.ts`   | Admin   | Сбросить счётчики              |
| GET    | `/api/tests/list`             | `api/tests/list.ts`              | AnyUser | Каталог тестов                 |
| GET    | `/api/tests/unit`             | `api/tests/unit/index.ts`        | AnyUser | Unit checks scaffold           |
| GET    | `/api/tests/integration`      | `api/tests/integration/index.ts` | AnyUser | Integration checks scaffold    |

## Checkout API

| Method | Path                    | File                      | Auth   | Назначение                                                                                             |
| ------ | ----------------------- | ------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| POST   | `/api/checkout/submit`  | `api/checkout/submit.ts`  | Public | Принять форму оформления, создать строку checkoutRequests, опубликовать `web.checkout.submitted@1`     |
| POST   | `/api/checkout/status`  | `api/checkout/status.ts`  | Public | Poll-драйвер: обработать доставки getcourse.order.created, вернуть статус и paymentUrl если готов     |

Оба эндпоинта помечены `// @shared-route`.

### POST /api/checkout/submit

**Вход:** поля формы (§4 спецификации) + `requestKey` (строка идемпотентности).

**Логика:**
1. Валидация входных данных.
2. `runWithExclusiveLock(checkout:{requestKey})` — защита от гонок.
3. Идемпотентность: если строка checkoutRequests с данным requestKey уже существует — повторный publish не выполняется.
4. Создание строки checkoutRequests со статусом `submitted`.
5. Publish события `web.checkout.submitted@1` (occurredAt: 0, correlationId = requestKey, idempotencyKey = `web-checkout-submitted:{requestKey}`).
6. WebSocket-сообщение `checkout_submitted`.
7. `scheduleJobAfter` fallback-джобы `/broker/poll`.
8. Best-effort ping getcourse `/checkout/process`.

**Выход:** `{ success, status, paymentUrl?, requestKey?, error? }`

### POST /api/checkout/status

**Вход:** `requestKey`.

**Логика:**
1. Валидация requestKey.
2. `processOrderCreatedDeliveries({ limit, maxBatches: 1 })` — poll/claim доставок `getcourse.order.created`; корреляция по `payload.idempotencyKey`; сохранение paymentUrl + статус `payment_ready` под lock; WebSocket-сообщение `payment_ready`; ack доставки.
3. Возврат текущего статуса.

**Выход:** `{ success, status, paymentUrl? }`

---

## Broker API

| Method | Path                    | File                       | Auth  | Назначение                                               |
| ------ | ----------------------- | -------------------------- | ----- | -------------------------------------------------------- |
| POST   | `/api/module/register`  | `api/module/register.ts`   | Admin | Ручная регистрация broker-модуля и подписки              |

Помечен `// @shared-route`.

### POST /api/module/register

**Вход:** нет тела (регистрационные параметры зашиты в lib).

**Логика:** вызывает `registerCoreBrokerSubscription` (через `lib/broker/coreBrokerClient.lib.ts`).

**Выход:** результат регистрации подписки.

---

## Broker-клиент (`lib/broker/coreBrokerClient.lib.ts`)

Не HTTP-эндпоинт, а серверная библиотека. Описана здесь как часть контракта взаимодействия.

**Конфигурация модуля:**
- `allowedPublishTypes`: `['web.checkout.*']`
- `allowedSubscribeTypes`: `['getcourse.order.*']`
- `authToken`: `neso-meta-web-interface-token`
- Подписка `getcourse-order-created-listener` (notification mode: none)

**Функции:**
- `registerCoreBrokerModule` / `registerCoreBrokerSubscription` — регистрация модуля и подписки.
- `publishCoreBrokerEvent` — публикация события (используется в `/api/checkout/submit`).
- `pollCoreBrokerDeliveries` / `ackCoreBrokerDeliveries` / `failCoreBrokerDeliveries` — управление доставками.
- `pingGetCourseProcess` — вызов getcourse `/checkout/process`.

---

## Джобы

| Job path       | File                    | Назначение                                                    |
| -------------- | ----------------------- | ------------------------------------------------------------- |
| `/broker/poll` | `jobs/broker/poll.ts`   | Fallback-джоба: обработка доставок, self-terminating loop     |

### app.job('/broker/poll')

**Логика:** вызывает `processOrderCreatedDeliveries`; если checkout не в терминальном статусе и лимит итераций не исчерпан — перепланирует себя через `scheduleJobAfter`; останавливается при терминальном статусе, исчерпании лимита или отсутствии строки checkoutRequests.

---

## WebSocket-сообщения (§5)

| Событие             | Данные                                                    | Когда                              |
| ------------------- | --------------------------------------------------------- | ---------------------------------- |
| `checkout_submitted`| —                                                         | После создания checkout request    |
| `payment_ready`     | `{ requestKey, paymentUrl, orderKey, gcDealNumber }`      | После получения paymentUrl от GC   |
| `checkout_failed`   | —                                                         | При ошибке обработки               |

Конкретные entrypoints и схема событий broker — `docs/spec/spec.md`.

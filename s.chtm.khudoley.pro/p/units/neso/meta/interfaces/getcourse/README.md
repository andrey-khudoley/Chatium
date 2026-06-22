# p/units/neso/meta/interfaces/getcourse

## Назначение

GetCourse Interface для NESO meta. Полноценный Chatium-модуль-коннектор рядом с
`p/units/neso/meta/core`: реализует интеграцию с платформой GetCourse (офферы,
заказы, постбэки) и публикует broker-события в core broker.

## Текущее состояние

Реализован коннектор GetCourse по `docs/spec/spec.md` рев.5 (фичи 1–4):

- **Фича 1** — получение списка офферов GetCourse (`functions/offers/list.ts`).
- **Фича 2** — создание заказа и получение платёжной ссылки (`functions/orders/create.ts`, `functions/orders/get.ts`).
- **Фича 3** — входящий postback GetCourse → корреляция заказа → публикация broker-событий (`api/webhook/getcourse/index.ts`, `lib/webhook/processWebhook.lib.ts`).
- **Фича 4** — broker-подписка на `web.checkout.submitted@1`: коннектор регистрирует подписку, poll/claim доставок выполняется через `functions/checkout/process.ts` (pump-by-publisher), обработка в `lib/checkout/processCheckoutSubmitted.lib.ts` → `createOrder` → публикует `getcourse.order.created@1` с `correlationId = requestKey`.

Поток данных: потребитель → `runAppFunction` → коннектор → gateway HTTP → GetCourse; входящий GC postback → коннектор → корреляция заказа → broker; `interfaces/web` публикует `web.checkout.submitted` → broker доставка → `app.function('/checkout/process')` → `createOrder` → `getcourse.order.created`.

Идемпотентность: `idempotencyKey` при создании заказа, `webhookId`+`processed` для постбэков, детерминированный `occurredAt`/`fingerprint` broker-событий. Фича 4: `idempotencyKey` пробрасывается из payload; корреляция закрыта через `correlationId = requestKey`.

## Состав

- `config/routes.tsx` — project root модуля.
- `contracts/brokerEvents.ts` — 3 broker-контракта: `offer.listed`, `order.created`, `order.status_changed`.
- `lib/gateway/` — HTTP-клиент GetCourse (`gcGatewayClient.lib.ts`) и парсер сделок (`parseGcDeals.lib.ts`).
- `lib/offers/offers.lib.ts` — бизнес-логика получения офферов.
- `lib/orders/` — логика заказов (`orders.lib.ts`, +`correlationId`), статусов (`orderStatus.lib.ts`), денег (`money.lib.ts`).
- `lib/webhook/processWebhook.lib.ts` — обработка входящего постбэка.
- `lib/broker/coreBrokerClient.lib.ts` — подписка на broker-события, poll/ack/fail доставок.
- `lib/checkout/processCheckoutSubmitted.lib.ts` — обработка `web.checkout.submitted@1` → `createOrder`.
- `functions/checkout/process.ts` — pump-by-publisher: poll/claim broker-доставок для подписки getcourse.
- `repos/` — репозитории `orders.repo.ts`, `webhookEvents.repo.ts`.
- `tables/` — Heap-таблицы `orders.table.ts`, `webhookEvents.table.ts`.
- `functions/` — точки входа для `runAppFunction` (офферы, заказы).
- `api/webhook/getcourse/index.ts` — эндпоинт приёма postback от GetCourse.
- `components/admin/AdminSettings.vue` — карточка настроек GetCourse в админке.
- `lib/tests/` — юнит и интеграционные тест-сьюты (`getcourseUnitSuite.ts`, `getcourseIntegrationSuite.ts`).

## Важно

- Платформа: Chatium. Серверная часть управляется платформой.
- Core broker вызывается через `@app/app.runAppFunction`, без HTTP URL.
- Heap/tables остаются на сервере; Vue импортирует только `shared/*`.
- Защищённые API начинаются с `requireAccountRole(ctx, 'Admin')`.

## Предусловия

- Dev-ключ GetCourse должен быть настроен в админке **гейтвея** — без него `createDeal`/`getOffers` возвращают ошибку.
- Операция `setUri` в гейтвее отключена (disabled): URI постбэка регистрируется вручную или внешним шагом. Поддержка `setUri` — отдельная задача.
- Postback/import API GetCourse требует **платного тарифа** школы.

## Ограничения (known-limitations)

- Тело постбэка GC окончательно не задокументировано: парсер (`parseGcDeals.lib.ts`) терпимый; финальная форма уточняется по живому сэмплу.
- При сбое публикации broker-события `order.created` после сохранения заказа — повторный вызов `/orders/create` с тем же `idempotencyKey` вернёт существующий заказ без переотправки `created`. Downstream покрывается первым `order.status_changed` из постбэка.
- Легаси прямой GC-интеграции в `neso/order` выносится в deprecated отдельной задачей.

## Навигация по документации

- `docs/architecture.md` — слои и роутинг модуля.
- `docs/api.md` — таблица эндпоинтов.
- `docs/data.md` — Heap-таблицы и связи.
- `docs/imports.md` — граф импортов.
- `docs/spec/spec.md` — спецификация коннектора (рев.5, source of truth).
- `docs/spec/broker-events.md` — описание broker-событий модуля.
- `docs/spec/tables.md` — схема таблиц (spec-уровень).

## Changelog

- 2026-06-22: фича 4 (spec рев.5) — broker-подписка на `web.checkout.submitted@1`, pump-by-publisher через `/checkout/process`, корреляция `correlationId = requestKey`, публикация `getcourse.order.created@1`.
- 2026-06-21: реализован коннектор GetCourse (фичи 1–3 по spec рев.3): офферы, создание заказа, postback → broker-события.

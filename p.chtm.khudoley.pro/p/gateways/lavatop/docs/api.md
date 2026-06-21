# API

## Настройки (api/settings/)

Эндпоинты для управления настройками проекта (key-value в Heap). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

| Method | Path                   | File                 | Auth  | Назначение                                                                                                                                                                                           |
| ------ | ---------------------- | -------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api/settings/list     | api/settings/list.ts | Admin | Список всех настроек (с дефолтами)                                                                                                                                                                   |
| GET    | /api/settings/get?key= | api/settings/get.ts  | Admin | Получить одну настройку                                                                                                                                                                              |
| POST   | /api/settings/save     | api/settings/save.ts | Admin | Сохранить настройку (body: `{ key, value }`). Для `log_level`: допускаются строки (Debug/Info/Warn/Error/Disable) и числа -1–4 (-1,0=Disable, 1=Info, 2=Warn, 3=Error, 4=Debug), нормализация в API. |

`key` должен быть непустой строкой после `trim`. Иначе `{ success: false }` и в серверный лог — severity 6, текст про валидацию key, в payload поля `reason` (`missing` | `not_string` | `empty_after_trim`), `keyType`, `bodyKeys`.

Каждый файл — один эндпоинт с путём `/`.

## Логи (api/logger/, api/admin/logs/)

Эндпоинты для записи и чтения серверных логов (проверка уровня, Heap, WebSocket, вебхук).

| Method | Path                   | File                     | Auth    | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ---------------------- | ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /api/logger/log        | api/logger/log.ts        | AnyUser | Записать лог (body: `{ message, severity?, payload? }`). message — текст сообщения (имя модуля при необходимости в тексте); severity — 0–7, по умолчанию 6; payload — JSON с контекстом. timestamp и уровень (level) вычисляются в lib. В ctx.log и ctx.account.log выводится строка вида `[DD.MM.YYYY HH:mm:ss.SSS] [LEVEL] message` (пробелы между группами в скобках). Уровень сверяется с настройкой log_level; при прохождении — запись в ctx.log, ctx.account.log, Heap, WebSocket (admin-logs), опционально POST на log_webhook.url. |
| GET    | /api/admin/logs/recent | api/admin/logs/recent.ts | Admin   | Получить последние N логов (query: `limit`, по умолчанию 50, макс. 200). Возвращает `{ success: true, entries: Array<LogEntry & { id: string }> }`.                                                                                                                                                                                                                                                                                                                                                                                         |
| GET    | /api/admin/logs/before | api/admin/logs/before.ts | Admin   | Получить N логов старше указанного timestamp (query: `beforeTimestamp` — timestamp последней записи в миллисекундах, `limit` — количество, по умолчанию 50, макс. 200). Возвращает `{ success: true, entries: Array<LogEntry & { id: string }>, hasMore: boolean }`.                                                                                                                                                                                                                                                                        |

## Дашборд админки (api/admin/dashboard/)

Счётчики ошибок и предупреждений в дашборде; таймштамп сброса хранится в настройках (`dashboard_reset_at`). Логика: lib/admin/dashboard.lib, репо — countBy по severity и timestamp (Heap where).

| Method | Path                        | File                          | Auth  | Назначение                                                                                                                         |
| ------ | --------------------------- | ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api/admin/dashboard/counts | api/admin/dashboard/counts.ts | Admin | Получить счётчики ошибок и предупреждений после таймштампа сброса. Возвращает `{ success: true, errorCount, warnCount, resetAt }`. |
| POST   | /api/admin/dashboard/reset  | api/admin/dashboard/reset.ts  | Admin | Сбросить дашборд: записать текущий таймштамп в настройки. Возвращает `{ success: true, errorCount: 0, warnCount: 0, resetAt }`.    |

Каждый файл — один эндпоинт с путём `/`.

## Тесты (api/tests/)

Набор: юнит без Heap (`lib/tests/templateUnitSuite.ts`), интеграция с Heap и `route.run` по API (`lib/tests/integrationSuite.ts`), HTTP GET страниц на клиенте (`TestsPage.vue`, проверка статуса и фрагментов SSR). Каталог — `shared/testCatalog.ts`; страница `/web/tests` — три вкладки (Юнит / Интеграция / HTTP), метрики по активной вкладке, прогон всей вкладки и точечный запуск (play). Блоки категорий на вкладке сворачиваются по клику на заголовок (по умолчанию развёрнута первая категория, остальные свёрнуты; иконка `fa-folder` / `fa-folder-open`). Для `GET /web/tests` фрагменты SSR — `window.__BOOT__` и подстрока `saas-gw-lavatop-page` из `<meta name="saas-gw-lavatop-page" content="web-tests">` в `web/tests/index.tsx` (текст вкладок в первичном HTML может отсутствовать до гидрации).

Проверки с `requireAccountRole(Admin)` в интеграционном прогоне при отсутствии роли Admin помечаются как провал с пояснением «нужна роль Admin» (один `ctx` на запрос).

При любом провале юнит/интеграционного кейса в серверный лог пишется отдельная запись через `lib/tests/logTestRunFailures.ts`: **severity 3** (видно при `log_level = Error`, в отличие от сводок с более высоким severity). Итоговая строка «набор завершён» при `failed > 0` тоже с **severity 3**. Старт прогона остаётся с severity 7 (при строгом уровне логов может не попасть в вывод).

| Method | Path                   | File                           | Auth    | Назначение                                                                                                                                                                           |
| ------ | ---------------------- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | /api/tests/list        | api/tests/list.ts              | AnyUser | Каталог: `{ success, categories }`. У категорий есть `blocks[]` и плоский `tests`.                                                                                                   |
| GET    | /api/tests/unit        | api/tests/unit/index.ts        | AnyUser | Юнит: `runTemplateUnitChecks()` — routes, project, logLevel script, logger.lib, shared/logger, целостность каталога. `{ success, kind: 'unit', results[], summary, at }`.            |
| GET    | /api/tests/integration | api/tests/integration/index.ts | AnyUser | Интеграция: Heap, libs, API через `route.run`, e2e-сценарии; в конце добавляется проверка `api_tests_integration_shape`. `{ success, kind: 'integration', results[], summary, at }`. |

## Публичный контур `invoices_v1` (api/v1/)

Авторизация клиента — заголовок `X-Lava-Apikey`. Проксируется в Lava.Top как `X-Api-Key`. Ответ: `{ ok, data | error, requestId }` + заголовок `X-Gateway-Request-Id`. Коды ошибок — `INVOKE_*` из `lib/gateway/gatewayErrors.ts`.

| Method | Path                 | File                       | Auth          | Назначение                                                                                                                                                                                                                                                                                          |
| ------ | -------------------- | -------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /v1/createInvoice    | api/v1/createInvoice.ts    | X-Lava-Apikey | Создание инвойса. Тело: `{ email, offerId, currency, paymentProvider?, paymentMethod?, buyerLanguage?, periodicity?, clientUtm?, callbackUrl?, clientOrderId? }`. `callbackUrl`/`clientOrderId` остаются в gateway для webhook-маппинга, в Lava.Top не уходят. Проксируется в POST /api/v3/invoice. |
| GET    | /v1/getInvoiceStatus | api/v1/getInvoiceStatus.ts | X-Lava-Apikey | Статус инвойса. Query: `id` (contractId). Проксируется в GET /api/v2/invoices/{id}.                                                                                                                                                                                                                 |
| GET    | /v1/listProducts     | api/v1/listProducts.ts     | X-Lava-Apikey | Список продуктов. Query: `nextPage?` (URL следующей страницы, SSRF-защита). Проксируется в GET /api/v2/products.                                                                                                                                                                                    |
| POST   | /v1/updateOfferPrice | api/v1/updateOfferPrice.ts | X-Lava-Apikey | Обновление цены оффера. Тело: `{ productId, offers: [{ id, prices: [{ amount, currency }], name?, description? }] }`. Проксируется в PATCH /api/v2/products/{productId}.                                                                                                                            |
| GET    | /v1/operations       | api/v1/operations.ts       | —             | Каталог операций (wire-форма из operationsCatalog). Без заголовков авторизации.                                                                                                                                                                                                                     |

Каждый файл — один эндпоинт с путём `/`. Общая цепочка — `handleV1Op`.

## Вебхуки Lava.Top (webhooks/)

| Method | Path             | File               | Auth                                      | Назначение                                                                                                                                                                                                                                    |
| ------ | ---------------- | ------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /webhooks/status | webhooks/status.ts | —                                         | Проверка доступности. Возвращает `{ ok, status: 'ready', webhookSecretConfigured }`.                                                                                                                                                          |
| POST   | /webhooks        | webhooks/index.ts  | X-Api-Key или Basic = lava_webhook_secret | Приём `PurchaseWebhookLog` от Lava.Top. Авторизация по `lava_webhook_secret`. Ответ: 401 при неверном секрете; 2xx при успехе/contract_not_found; 500 при незаданном секрете. Body: `{ success, duplicate?, forwarded?, contractNotFound? }`. |

## Журнал вебхуков для панели (api/admin/webhooks/)

| Method | Path                          | File                            | Auth             | Назначение                                                             |
| ------ | ----------------------------- | ------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| GET    | /api/admin/webhooks/recent    | api/admin/webhooks/recent.ts    | guardInternalApi | Последние события вебхуков (query: `limit`, `dateFrom?`, `dateTo?`).   |
| POST   | /api/admin/webhooks/reforward | api/admin/webhooks/reforward.ts | guardInternalApi | Повторный форвард события (body: `{ id }`). Вызывает `reforwardEvent`. |

## Сырые журналы gateway (api/admin/raw/)

| Method | Path                           | File                             | Auth             | Назначение                                                            |
| ------ | ------------------------------ | -------------------------------- | ---------------- | --------------------------------------------------------------------- |
| GET    | /api/admin/raw/requests/recent | api/admin/raw/requests/recent.ts | guardInternalApi | Последние входящие запросы (query: `limit`, `dateFrom?`, `dateTo?`).  |
| GET    | /api/admin/raw/requests/get    | api/admin/raw/requests/get.ts    | guardInternalApi | Запись входящего запроса по `id`.                                     |
| GET    | /api/admin/raw/upstream/recent | api/admin/raw/upstream/recent.ts | guardInternalApi | Последние вызовы к Lava.Top (query: `limit`, `dateFrom?`, `dateTo?`). |
| GET    | /api/admin/raw/upstream/get    | api/admin/raw/upstream/get.ts    | guardInternalApi | Запись вызова к Lava.Top по `id`.                                     |

## KPI-дашборд панели (api/admin/dashboard/)

| Method | Path                               | File                                 | Auth             | Назначение                                                                               |
| ------ | ---------------------------------- | ------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------- |
| GET    | /api/admin/dashboard/gatewayCounts | api/admin/dashboard/gatewayCounts.ts | guardInternalApi | KPI за период фильтра: запросов, okShare, avg/p95 latency, topErrorCode, upstream stats. |

## Фильтр по дате (api/admin/analytics/)

| Method | Path                             | File                               | Auth             | Назначение                                                                            |
| ------ | -------------------------------- | ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| POST   | /api/admin/analytics/filter-save | api/admin/analytics/filter-save.ts | guardInternalApi | Сохранить фильтр по дате (`{ from?, to? }`, Unix ms) в настройку `panel_date_filter`. |

## Доступы к панели (api/access/)

| Method | Path                        | File                          | Auth             | Назначение                                                                    |
| ------ | --------------------------- | ----------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| GET    | /api/access/grants          | api/access/grants.ts          | guardInternalApi | Список активных грантов.                                                      |
| GET    | /api/access/invites         | api/access/invites.ts         | guardInternalApi | Список инвайтов.                                                              |
| POST   | /api/access/generate-invite | api/access/generate-invite.ts | Admin            | Сгенерировать инвайт-токен (TTL 7 дней).                                      |
| POST   | /api/access/consume-invite  | api/access/consume-invite.ts  | AnyUser          | Принять инвайт (body: `{ token }`). Создаёт грант под `runWithExclusiveLock`. |
| POST   | /api/access/revoke-invite   | api/access/revoke-invite.ts   | Admin            | Отозвать инвайт (body: `{ id }`).                                             |
| POST   | /api/access/revoke-grant    | api/access/revoke-grant.ts    | Admin            | Отозвать грант (body: `{ id }`).                                              |

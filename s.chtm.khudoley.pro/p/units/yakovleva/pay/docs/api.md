# API

> Примечание (2026-05-28): в ходе технической декомпозиции (Phase B/B2/C) структура файлов страниц и тест-наборов изменилась. Поведение всех эндпоинтов, их пути, методы и авторизация не затронуты.

## Настройки (api/settings/)

| Method | Path                   | File                   | Auth  | Назначение                                                 |
| ------ | ---------------------- | ---------------------- | ----- | ---------------------------------------------------------- |
| GET    | /api/settings/list     | api/settings/list.ts   | Admin | Список всех настроек (с дефолтами)                         |
| GET    | /api/settings/get?key= | api/settings/get.ts    | Admin | Получить одну настройку                                    |
| POST   | /api/settings/save     | api/settings/save.ts   | Admin | Сохранить настройку (body: `{ key, value }`)               |
| GET    | /api/settings/export   | api/settings/export.ts | Admin | Экспорт переносимых настроек в JSON, включая секреты       |
| POST   | /api/settings/import   | api/settings/import.ts | Admin | Импорт JSON из `/api/settings/export` с заменой snapshot'а |

Для `key`-ей `lp_apikey`, `lp_login`, `lp_webhook_token`, `gateway_base_url` (LifePay), `lava_test_apikey`, `lava_base_url`, `lava_webhook_secret` (Lava.Top) и `gc_base_url`, `gc_test_school_api_key`, `gc_test_school_host`, `gc_enabled` (GC) валидация выполняется в `lib/settings.mutations.setSetting` (см. `docs/data.md`). `gateway_base_url`, `lava_base_url`, `gc_base_url` — optional override'ы: пустое значение включает auto-URL текущего workspace из `config/gatewayUrls.ts`. В exit-логе маскируются `lava_test_apikey`, `lava_webhook_secret`, `gc_test_school_api_key`.

`/api/settings/export` возвращает `{ success:true, backup }`, где `backup.format = 'yakovleva-pay-settings'`, `version = 1`, `settings` содержит переносимые ключи из settings с дефолтами, а `paymentPageMethods` — полный snapshot таблицы методов страницы оплаты. Из экспорта исключаются настройки админской страницы: `project_name`, `project_title`, `log_level`, `logs_limit`, `log_webhook`, `dashboard_reset_at`. `/api/settings/import` принимает `{ backup }`, игнорирует непереносимые ключи, валидирует значения через `setSetting`, удаляет переносимые ключи, отсутствующие в snapshot'е, и заменяет snapshot `PaymentPageMethods` под локом `yakovleva-pay:pp-method-write`.

## Логи (api/logger/, api/admin/logs/)

| Method | Path                   | File                     | Auth    | Назначение               |
| ------ | ---------------------- | ------------------------ | ------- | ------------------------ |
| POST   | /api/logger/log        | api/logger/log.ts        | AnyUser | Записать лог             |
| POST   | /api/logger/browser    | api/logger/browser.ts    | AnyUser | Браузерные логи пакетом  |
| GET    | /api/admin/logs/recent | api/admin/logs/recent.ts | Admin   | Последние N логов        |
| GET    | /api/admin/logs/before | api/admin/logs/before.ts | Admin   | N логов старше timestamp |

## Дашборд админки

| Method | Path                        | File                          | Auth  |
| ------ | --------------------------- | ----------------------------- | ----- |
| GET    | /api/admin/dashboard/counts | api/admin/dashboard/counts.ts | Admin |
| POST   | /api/admin/dashboard/reset  | api/admin/dashboard/reset.ts  | Admin |

## Тесты (api/tests/)

| Method | Path                   | File                           | Auth  | Назначение                                                                                                                                            |
| ------ | ---------------------- | ------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api/tests/list        | api/tests/list.ts              | Admin | Каталог тестов                                                                                                                                        |
| GET    | /api/tests/unit        | api/tests/unit/index.ts        | Admin | Юнит-наборы: шаблон + LifePay (`lifepayUnitSuite`), Lava.Top (`lavatopUnitSuite`) и plugin manifests. Зарегистрированы в `shared/testCatalogUnit.ts`. |
| GET    | /api/tests/integration | api/tests/integration/index.ts | Admin | Интеграционный набор                                                                                                                                  |

## Внутренняя авторизация (api/access/)

Управление доступом к панели: пригласительные ссылки и гранты (ADR 0003, §1.11). Реализовано 2026-05-24.

| Method | Path                        | File                          | Auth            | Назначение                                                                                                                            |
| ------ | --------------------------- | ----------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /api/access/consume-invite  | api/access/consume-invite.ts  | requireRealUser | Потребить инвайт по токену (тело `{ token }`). Расходует инвайт и создаёт грант только при успехе; под `runWithExclusiveLock`.        |
| POST   | /api/access/generate-invite | api/access/generate-invite.ts | Admin           | Создать пригласительную ссылку (тело `{ note? }`). Возвращает `{ inviteId, token, fullUrl, expiresAt }`. Токен показывается один раз. |
| POST   | /api/access/revoke-invite   | api/access/revoke-invite.ts   | Admin           | Отозвать инвайт (тело `{ inviteId }`).                                                                                                |
| POST   | /api/access/revoke-grant    | api/access/revoke-grant.ts    | Admin           | Отозвать грант пользователя (тело `{ userId }`).                                                                                      |
| GET    | /api/access/invites         | api/access/invites.ts         | Admin           | Список инвайтов без поля `token`.                                                                                                     |
| GET    | /api/access/grants          | api/access/grants.ts          | Admin           | Список грантов (активных и отозванных).                                                                                               |

## Гейтвеи и вебхуки (api/gateways/, webhooks/)

Серверная прокладка к payments-gateway + журнал + аналитика + приёмник webhook (implementation-plan §1.8.2 — §1.8.4). Все эндпоинты `api/gateways/*` защищены `requireRealUser` + `requireInternalAccess` через `guardInternalApi(ctx)` (ADR 0003 / §1.11.8, реализовано 2026-05-24).

| Method | Path                                                       | File                                  | Auth                                    | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ---------------------------------------------------------- | ------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /api/gateways/invoke                                       | api/gateways/invoke.ts                | requireRealUser + requireInternalAccess | Прокладка `{ gatewayId: 'lifepay' \| 'lavatop' \| 'gc', op, args, httpMethod? }` → соответствующий gateway. **`gatewayId` обязательно**. Диспатчер выбирает клиент: LifePay (`X-Lp-Apikey`/`X-Lp-Login`, base = `gateway_base_url` или auto), Lava.Top (`X-Lava-Apikey`, base = `lava_base_url` или auto) или GC (`X-Gc-School-Api-Key`/`X-Gc-School-Host`, base = `gc_base_url` или auto). Для `gatewayId: 'gc'` `httpMethod` обязателен (`'GET'` или `'POST'`); op проходит `validateGcOpName` (SSRF-защита). Возвращает тело gateway без изменений; `requestId` из `X-Gateway-Request-Id`. Журналирование в `request_log` с `gatewayId`. Без ретраев, без `Idempotency-Key`.                    |
| GET    | /api/gateways/recent-requests?limit=                       | api/gateways/recent-requests.ts       | requireRealUser + requireInternalAccess | Последние записи `request_log` в пределах глобального фильтра `panel_date_filter` (без полных тел). Ответ: `{ success, entries, hasMore }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| GET    | /api/gateways/recent-webhooks?limit=                       | api/gateways/recent-webhooks.ts       | requireRealUser + requireInternalAccess | Последние записи `webhook_log` в пределах глобального фильтра `panel_date_filter`. Ответ: `{ success, entries, hasMore }`. Поле `entries[].orderNumber` обогащается из связанного `request_log` по `correlationId`, если в самом webhook оно пустое (LifePay SBP-webhook не возвращает orderNumber). Поле `entries[].correlationId` возвращается. Поле `entries[].method` возвращается в ответе, но в UI-таблицах не отображается (убрана колонка «метод»).                                                                                                                                                                                                                                        |
| GET    | /api/gateways/analytics/summary                            | api/gateways/analytics/summary.ts     | requireRealUser + requireInternalAccess | Карточки аналитики за диапазон из глобального фильтра `panel_date_filter` (без параметра `windowHours`). Если фильтр не задан — все данные (до `ANALYTICS_SCAN_LIMIT = 5000`). Ответ: `dateFilter: { from, to }` (null если граница не задана) + `orders { created, paid, createdSum, paidSum }` + `requests { total, okShare, avgDurationMs, p95DurationMs, topErrorCode, topErrorCount }` + `webhooks { total, successShare, tokenValidShare }`.                                                                                                                                                                                                                                                 |
| POST   | /api/gateways/analytics/filter-save                        | api/gateways/analytics/filter-save.ts | requireRealUser + requireInternalAccess | Сохранить или сбросить глобальный фильтр панели. Тело: `{ from?: number\|null, to?: number\|null }` (Unix ms). Обе границы отсутствуют или null → сброс. Валидация: число > 0; при обеих заданных `from <= to`; иначе 400. Ответ: `{ success, filter: null \| { from?, to? } }`.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| GET    | /api/gateways/search-by-request-id?requestId=              | api/gateways/search-by-request-id.ts  | requireRealUser + requireInternalAccess | `request_log` + связанные `webhook_log`. Связка выполняется по двум ключам одновременно: `correlationId` (основной путь, надёжный) и `orderNumber` (исторический путь). Результаты объединяются без дублей (`mergeWebhooksById`). Поиск работает в пределах глобального фильтра `panel_date_filter`. Ответ включает `request.correlationId` и `webhook[].correlationId`.                                                                                                                                                                                                                                                                                                                           |
| GET    | /api/gateways/raw-request?id=\<heapId\>\|requestId=\<rid\> | api/gateways/raw-request.ts           | requireRealUser + requireInternalAccess | Полная raw-запись `request_log` со всеми полями включая `rawResponseBody`. Если задан `id` — приоритет по нему; иначе по `requestId`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| GET    | /api/gateways/raw-webhook?id=\<heapId\>                    | api/gateways/raw-webhook.ts           | requireRealUser + requireInternalAccess | Полная raw-запись `webhook_log` включая `rawBody` и `rawQuery` (token замаскирован). Дополнительно возвращает `linkedRequests` и `relatedWebhooks`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| POST   | /webhooks/lifepay?token=&correlationId=                    | webhooks/lifepay/index.tsx            | Анонимный + токен                       | Приёмник webhook от LifePay. Сверка токена в query; расхождение/отсутствие → 401/403 без тела и без записи. При валидном → guard «legacy-strict» (correlationId + request_log lookup) → разбор тела → запись в `webhook_log` с `gatewayId='lifepay'` + дедупликация по `number` через `webhook_idempotency` → шаг 5a downstream createDeal. **С 2026-06-02:** источник GC dealId — числовой `correlationId`; UUID-correlationId → skip `non_numeric_correlationId`; ре-резолв email/amount через `resolveGcDeal`; GC-вызовы (`getDealFields`, `getUserFields`, `createDeal`) логируются в `request_log`. MD5-подпись не проверяется. LifePay-ретраи: 1/3/5/10 мин, далее раз в час, до 10 попыток. |
| GET    | /webhooks/lavatop/status                                   | webhooks/lavatop/status.tsx           | Анонимный                               | Проверка доступности приёмника Lava.Top. Возвращает `{ ok, status: 'ready', webhookSecretConfigured }` без раскрытия секрета.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| POST   | /webhooks/lavatop                                          | webhooks/lavatop/index.tsx            | Анонимный + секрет (X-Api-Key / Basic)  | Приёмник webhook Lava.Top. Авторизация — `X-Api-Key` или Basic Authorization, значение должно совпадать с `lava_webhook_secret`. Без секрета — 503; неверная авторизация — 401; некорректное тело — 400. При валидном — запись в `webhook_log` с `gatewayId='lavatop'` и `gatewayExternalId=contractId`; дедупликация через `webhook_idempotency` по композитному ключу `lavatop:contractId:eventType:status` (`tryRegister`). Ответ 200 `{ success: true, duplicate }`.                                                                                                                                                                                                                           |
| POST   | /api/gateways/payment-socket                               | api/gateways/payment-socket.ts        | requireRealUser + requireInternalAccess | Выдаёт `encodedSocketId` для подписки на канал уведомлений об оплате (`@app/socket`). Тело: `{ correlationId: string }` (1–128 символов, `[A-Za-z0-9._:-]`). Ответ: `{ success, channel, encodedSocketId }`. Имя сырого канала — `pay-payment-<correlationId>` (`shared/paymentSocket.ts`). Сервер публикует сообщение `{ type: 'payment', data: {...} }` в этот канал при получении соответствующего webhook (см. `webhooks/lifepay` и `webhooks/lavatop`). 400 `PAYMENT_SOCKET_CORRELATION_ID_INVALID` — невалидный/пустой correlationId.                                                                                                                                                        |

### Контракт `/api/gateways/invoke`

Запрос (LifePay):

```json
{
  "gatewayId": "lifepay",
  "op": "createBill",
  "args": {
    "orderNumber": "A1",
    "amount": 1.0,
    "customerEmail": "x@y.z",
    "description": "...",
    "callbackUrl": "https://.../webhooks/lifepay?token=...&correlationId=<uuid>",
    "correlationId": "<uuid>"
  }
}
```

Запрос (Lava.Top):

```json
{
  "gatewayId": "lavatop",
  "op": "createInvoice",
  "args": {
    "email": "buyer@example.com",
    "offerId": "...",
    "currency": "RUB",
    "callbackUrl": "https://.../webhooks/lavatop"
  }
}
```

Запрос (GetCourse):

```json
{
  "gatewayId": "gc",
  "op": "someOperation",
  "httpMethod": "POST",
  "args": { ... }
}
```

`gatewayId` обязательно. `httpMethod` обязателен для GC. Допустимые значения `gatewayId` определяются `SUPPORTED_GATEWAYS` (`shared/invokeApi.ts`): `['lifepay', 'lavatop', 'gc']`.

`correlationId` в `args` извлекается сервером и сохраняется в `request_log`; в тело запроса к gateway **не** передаётся (отделяется перед вызовом). Для LifePay `callbackUrl` с `correlationId` в query доходит до LifePay и возвращается приёмнику webhook. Для Lava.Top связка через `contractId` (см. webhook ниже).

Ответ (общий для обоих гейтвеев, зеркало gateway §9.1):

- Успех: `{ "ok": true, "data": {...}, "requestId": "..." }`.
- Ошибка: `{ "ok": false, "error": { "code": "...", "message": "...", "details": {...} }, "requestId": "..." }`.

Локальные коды ошибок прокладки (до сетевого вызова):

- `INVOKE_GATEWAY_REQUIRED` (HTTP 400) — `gatewayId` не указан.
- `INVOKE_GATEWAY_UNKNOWN` (HTTP 400) — `gatewayId` не из `SUPPORTED_GATEWAYS`.
- `INVOKE_SETTINGS_MISSING` (HTTP 503) — для LifePay не настроены `lp_apikey`/`lp_login`; для Lava.Top — `lava_test_apikey`; для GC — `gc_test_school_api_key`/`gc_test_school_host`. Base URL-настройки не обязательны: пустое значение использует auto-URL текущего workspace.
- `INVOKE_OP_UNKNOWN` (HTTP 400) — операция не входит в каталог указанного гейтвея.
- `INVOKE_HTTP_METHOD_REQUIRED` (HTTP 400) — для GC не указан `httpMethod`.
- `INVOKE_HTTP_METHOD_INVALID` (HTTP 400) — для GC `httpMethod` не `'GET'` или `'POST'`.
- `INVOKE_PROXY_BODY_INVALID` (HTTP 400) — тело запроса некорректно.

Коды от LifePay-gateway транзитом: `INVOKE_LP_TIMEOUT`, `INVOKE_LP_NETWORK_ERROR`, `INVOKE_LP_UPSTREAM_ERROR`, `INVOKE_LP_SEMANTIC_ERROR` (с `details.lpRule`, `details.lpNumericCode`, `details.lpHttpStatus`) и др. — см. `p/gateways/lifepay/lib/gateway/gatewayErrors.ts`.

Коды от Lava.Top-gateway транзитом: `INVOKE_LAVA_TIMEOUT`, `INVOKE_LAVA_NETWORK_ERROR` + публичные коды контура `invoices_v1` (см. `p/gateways/lavatop/lib/gateway/gatewayErrors.ts`).

### Контракт `/webhook`

Внешний (LifePay → клиент), контракт — `../project-docs/knowledge/lifepay/webhooks.md` §1:

- Метод: `POST`. Транспорт — `multipart/form-data` с единственным текстовым полем
  `data` (JSON-строка транзакции), подтверждён живым webhook 2026-05-20. Подпись
  LifePay не публикует — аутентификация только токеном в query.
- Query: `?token=<lp_webhook_token>`.
- Чтение тела (`webhooks/lifepay/index.tsx`) — канонический `req.formData()` (Chatium native
  multipart с патча 18-05-2026, см. `../project-docs/knowledge/chatium/multipart-form-data.md`).
  Порядок источников с фоллбэками:
  1. `req.formData()` → поле `data` (`readWebhookDataField`) — основной путь LifePay;
  2. `req.body` → `unwrapWebhookBody` (если придёт `application/json` или
     `x-www-form-urlencoded`, в т.ч. обёртка `{data:"<json>"}` / `{"data":{...}}`);
  3. сырое тело строкой → `extractDataFromRawMultipart` (защитный фоллбэк, если
     `req.formData()` недоступен в рантайме).
     Выбранный источник и стратегия пишутся в лог `webhook_payload_parsed`
     (`source`, `strategy`).
- Поля payload (внутри `data`): `number`, `original_number`, `type` (payment/refund),
  `status` (success/fail), `method` (card / cash / recurrent / internetAcquiring /
  mobileInternetAcquiring), `terminal_serial`, `recipient_inn`, `operator_login`,
  `operator_name`, `amount`, `tip_amount`, `discount_amount`, `description`,
  `phone`, `email`, `pan`, `cardholder`, `rrn`, `lat`, `lng`, `created` (ISO 8601),
  `purchase[]` (позиции), `order` (`ext_id`, `number`, `name`, `phone`, `email`,
  `comment`, `barcode`), `add_fields`, `original_add_fields`.
- В Heap-таблице `webhook_log` под отдельными колонками хранятся `number`,
  `type`, `status`, `method`, `amount`, `orderNumber` (из `order.number`),
  `email` — остальное доступно через `rawBody` (Heap.Any, raw).

Поведение:

- `lp_webhook_token` пуст в Heap → 503, без тела, без записи.
- Токен отсутствует в query → 401, без тела, без записи.
- Токен не совпадает → 403, без тела, без записи (значение в логи не попадает).
- Токен валиден → **guard «legacy-strict»** (§1a, добавлен 2026-06-01, выполняется до чтения тела):
  - `correlationId` отсутствует в query → 200 OK без тела, без записи в `webhook_log`, без socket-публикации; лог `reason=correlationId_missing`.
  - `correlationId` есть, но `request_log` не содержит записи `createBill` с таким `correlationId` (проверяется через `repos/requestLog.countCreateBillByCorrelationId`) → 200 OK без тела, без записи, без публикации; лог `reason=correlationId_not_found`.
  - Сбой БД при lookup → guard трактует как отказ (строгая политика, severity 2 для алертинга); 200 OK без записи.
  - **Осознанный риск**: легитимный вебхук по заказу, созданному не через панель (или при затяжном сбое БД), будет отклонён без повторной попытки — LifePay сделает до 10 ретраев, но если `request_log` так и не появится, вебхук потеряется. Цель guard'а — исключить приём «чужих» вебхуков и нежелательное дублирование заказов; механизм `correlationId` — единственная верификация происхождения.
- Guard пройден → запись в `webhook_log` (`tokenValid: true`, `duplicate` по результату дедупа), ответ 200 OK с `OK`.
- Бизнес-исход: **шаг 5a — downstream GC createDeal** (реализовано 2026-06-01, пересмотрен 2026-06-02).
  Выполняется при: `type='payment'`, `status='success'` (`isSuccessfulPayment`), `dedupeResult==='first'`.
  - Источник dealId для GC-вызовов: **`correlationId` из query** (числовой = dealId GC). Если `correlationId` не числовой (UUID-формат, не deal-поток) — шаг пропускается с `reason=non_numeric_correlationId` (severity 6).
  - При числовом correlationId: вызывает `resolveGcDeal(ctx, correlationId, correlationId)` для получения актуальных `email` и `amount` из GC (ре-резолв). `getDealFields` и `getUserFields` логируются в `request_log` через `recordRequestLog` (try/catch, gatewayId='gc', correlationId для связки).
  - Маппинг кодов `resolveGcDeal`: `WIDGET_GC_ALREADY_PAID` → skip `already_paid` (sev6); прочие ошибки → `gc_resolve_failed` (sev4), downstream не выполняется.
  - Вызывает `updateGcDealOnPayment(ctx, input)` (`lib/webhook/gcDealUpdate.ts`) → `invokeByGateway(ctx,'gc','createDeal',...)` → `recordRequestLog` (try/catch). Устанавливает в GC статус из настройки `gc_deal_status` (fallback `payed`) и `deal_is_paid` по настройке `gc_create_payment`. В поле `deal_number` передаётся GC поле `number` (не dealId/correlationId) — извлекается из результата `resolveGcDeal` как `dealNumber`.
  - При любом исходе (успех/ошибка) возвращается 200. Ошибка логируется severity 3, не прерывает поток.
  - **Нет авто-ретрая**: повторный вебхук от LifePay → `dedupeResult==='duplicate'` → downstream не вызывается повторно.
  - При пропуске условий (дубль / не-`payment`+`success` / нечисловой correlationId): шаг пропускается с reason в лог `webhook_done`.
- При не-200 ответе LifePay повторяет webhook: 1 мин, 3 мин, 5 мин, 10 мин,
  далее раз в час, всего не более 10 попыток. Поэтому даже при ошибке записи
  в журнал отвечаем 200 OK — дедупликация по `number` через `webhook_idempotency`
  защищает от двойного учёта на стороне клиента.

### Контракт socket-уведомлений об оплате

Реальный поток: магазинный JS получает `encodedSocketId` через
`POST /api/gateways/payment-socket` и подписывается на канал через
`getOrCreateBrowserSocketClient().subscribeToData(encodedSocketId)`. Сервер
публикует сообщение в канал из webhook-приёмников после успешной (не-дубль)
записи в `webhook_log`. Дубли (LifePay ретраит 10 раз) защищаются на стороне
сервера через `webhook_idempotency` — сообщение публикуется один раз.

Имя сырого канала: `pay-payment-<correlationId>`. Ключ `correlationId`:

- LifePay — берётся из query callbackUrl (`extractCorrelationId(queryObj)`,
  `shared/correlation.ts`). Магазин обязан передать `correlationId` в args
  при `createBill` — иначе ни связки с request_log, ни socket-уведомления.
- Lava.Top — берётся из поля `clientOrderId` тела вебхука (Lava.Top возвращает
  его как есть). Магазин обязан передать `clientOrderId` в args при
  `createInvoice` — иначе аналогично.

Формат сообщения (`PaymentSocketMessage`, `shared/paymentSocket.ts`):

```json
{
  "type": "payment",
  "data": {
    "gatewayId": "lifepay" | "lavatop",
    "correlationId": "<тот же ключ>",
    "status": "success" | "fail" | "<иной>",
    "eventType": "payment" | "refund" | "<eventType Lava.Top>",
    "externalId": "<id транзакции upstream>",
    "orderNumber": "<orderNumber/clientOrderId, если есть>",
    "amount": "1.00",
    "timestamp": 1716985200000
  }
}
```

Если `correlationId` пустой / невалидный — публикация в канал не делается,
но запись в `webhook_log` всё равно сохраняется (поведение приёмников не
ломается отсутствием подписчика).

## Публичные эндпоинты и страницы доступа

| Method | Path                      | File                        | Auth                                         | Назначение                                                                                                              |
| ------ | ------------------------- | --------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| POST   | /webhooks/lifepay         | webhooks/lifepay/index.tsx  | Анонимный + токен в query                    | Приёмник webhook LifePay                                                                                                |
| GET    | /web/access/invite?token= | web/access/invite/index.tsx | requireRealUser                              | Страница подтверждения инвайта. Переход по ссылке не расходует инвайт; расход — только POST /api/access/consume-invite. |
| GET    | /web/forbidden            | web/forbidden/index.tsx     | requireRealUser                              | Страница 403 «Нет доступа к панели».                                                                                    |
| GET    | /web/tests                | web/tests/index.tsx         | Admin (requireRealUser + requireAccountRole) | Страница тестов. Аноним → /web/login, авторизованный без роли Admin → /web/forbidden.                                   |

## Виджеты оплаты (api/widgets/)

Публичные и admin-эндпоинты для встраиваемых виджетов на стороннюю страницу магазина. Реализовано 2026-05-29.

> CORS-стратегия: simple-request без preflight (`Content-Type: text/plain`, тело — JSON-строка). Сервер парсит тело вручную и отдаёт `Access-Control-Allow-Origin: *`; whitelist доменов/Origin больше не используется.

| Method | Path                           | File                             | Auth                                                       | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------ | ------------------------------ | -------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /api/widgets/config            | api/widgets/config.ts            | Публичный (CORS `*`)                                       | Определяет доступность каждого метода оплаты для конкретного заказа. С 2026-06-01: **метод изменён с GET на POST** (CORS simple-request, `Content-Type: text/plain`, тело — JSON-строка). Тело запроса: `{ dealId: string\|number, positions: [{id,title}] }`. Whitelist доменов отключён с 2026-06-13. 500 `WIDGET_CONFIG_ERROR` при сбое чтения настроек (fail-closed). 400 `WIDGET_BODY_INVALID` если `dealId` отсутствует/невалиден, а хотя бы для одного метода задан `minAmount`/`maxAmount`. Ответ: `{ ok, config: { lifepay: { enabled }, lavatop: { enabled } } }` (тип `WidgetAvailabilityConfig`, `shared/widgetSettingsTypes.ts`). `enabled` для метода `m` = настроенный plugin + явный `widget_*_enabled !== false` + `areAllOffersAllowed(positions из тела)` + `amountOk`; отсутствующий `widget_*_enabled` у настроенного plugin трактуется как включено. `amountOk` проверяется только если для метода задан `minAmount>0` или `maxAmount>0` — тогда сервер резолвит сумму сделки из GC через `resolveGcDealAmount` (с TTL-кэшом `GcDealCache`). **Проверка суммы ведётся в рублях**: `resolveGcDealAmount` конвертирует сумму заказа в RUB (RUB — без изменений; USD/EUR — по ручному курсу из веб-панели `widget_lavatop_manual_rate_*`, при его отсутствии — по курсу ЦБ РФ через cbr-xml-daily.ru). Если курс недоступен — fail-closed (`enabled:false`). При ошибке резолвинга суммы — fail-closed (`enabled:false`), ответ `ok:true`. Offer-фильтр применяется по `positions` из тела (клиент передаёт из DOM; сервер не доверяет, но используется только здесь — авторитетная проверка — в `intent-by-deal`). |
| POST   | /api/widgets/intent-lifepay    | api/widgets/intent-lifepay.ts    | Публичный (CORS `*`)                                       | Создать платёжное намерение LifePay. Парсит `text/plain`-тело. Серверный hard-limit `WIDGET_INTENT_HARD_LIMIT_RUB = 500 000 ₽` (применяется до per-user-max). Email/regex/orderNumber/description/callbackUrl формируются на сервере. Вызов `invokeByGateway('lifepay', 'createBill')`. Audit-лог через `loggerLib`. Серверный offer-фильтр (одиночный `offerId`) удалён — двухуровневая проверка позиций реализована в `intent-by-deal`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| POST   | /api/widgets/intent-lavatop    | api/widgets/intent-lavatop.ts    | Публичный (CORS `*`)                                       | **Deprecated** (offer-поток). Создать платёжное намерение Lava.Top. `email` и `offerId` обязательны; `amount` — опционален. Вызов `invokeByGateway('lavatop', 'createInvoice')`. `offerId` как продуктовый параметр `createInvoice` сохранён. Серверный offer-фильтр (одиночный) удалён; двухуровневая проверка — в `intent-by-deal`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| POST   | /api/widgets/intent-by-deal    | api/widgets/intent-by-deal.ts    | Публичный (CORS `*`)                                       | Создать платёжное намерение по GetCourse deal id. Тело (`text/plain` JSON): `{ dealId: string\|number, method?: 'lifepay'\|'lavatop', currency?: 'RUB'\|'USD'\|'EUR' }`. `currency` только для Lava.Top. **Идемпотентность (с 2026-06-01):** повторный запрос на тот же заказ в окне 30 минут возвращает ранее созданную `paymentUrl` без нового вызова gateway (кэш-lookup через `lib/gateway/idempotentBillCache.ts` по `request_log`). Поток LifePay: `idempotentBillCache.lookup` → (при промахе) `resolveGcDeal` → **`areAllOffersAllowed`** → `runWithExclusiveLock('yakovleva-pay:bill-idempotency:lifepay:<orderNumber>')` → `invokeByGateway('lifepay','createBill')` → `recordRequestLog`. Поток Lava.Top: `idempotentBillCache.lookup` → (при промахе) `resolveGcDeal` → проверки → `convertRubTo` → `runWithExclusiveLock('lavatop-offer:'+offerId)` → `updateOfferPrice` → `createInvoice` → `recordRequestLog` → `paymentUrl`. При `LockAcquisitionError` (зависший gateway) — **503 `WIDGET_GC_BUSY`** (LifePay) или **503 `WIDGET_LAVATOP_BUSY`** (Lava.Top); клиент повторяет. При запрещённой позиции — **403 `WIDGET_OFFER_NOT_ALLOWED`**. `orderNumber`/`correlationId` детерминированы: числовой dealId (нормализованный, без префикса), например `"848988370"`. PII (email) в ответ не включается.                                                                                                                                                                                                                                                                                                               |
| GET    | /api/widgets/settings-get      | api/widgets/settings-get.ts      | Сотрудник + Admin (`guardInternalApi`, `// @shared-route`) | Возвращает `WidgetSettingsData` с текущими значениями виджет-ключей для Vue-формы в `HomeWidgetSettings.vue` (вкладка «Настройки» главной).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| POST   | /api/widgets/settings-save     | api/widgets/settings-save.ts     | Сотрудник + Admin (`guardInternalApi`, `// @shared-route`) | Сохранить одну виджет-настройку. Тело: `{ key, value }`. Whitelist: только ключи из `WIDGET_SETTING_KEYS`. Делегирует `setSetting(ctx, key, value)`. Виджет-настройки — operational/бизнес, не секреты.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| GET    | /api/widgets/offers            | api/widgets/offers.ts            | Сотрудник + Admin (`guardInternalApi`, `// @shared-route`) | Проксирует `getOffers` GetCourse. При `gc_enabled=false` → `GC_DISABLED`; при пустых GC-настройках → `GC_NOT_CONFIGURED`. Используется `HomeWidgetSettings` для загрузки списка офферов с чекбоксами.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| POST   | /api/settings/save-operational | api/settings/save-operational.ts | Сотрудник + Admin (`guardInternalApi`, `// @shared-route`) | Сохранить одну operational-настройку. Тело: `{ key, value }`. Whitelist: `gc_enabled` (расширяется по мере добавления новых operational-ключей). Делегирует `setSetting(ctx, key, value)`. Используется `HomeSettingsTab.vue` для тоггла GC.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Контракт `/api/widgets/config`

Запрос (body в виде JSON-строки, `Content-Type: text/plain`):

```json
{ "dealId": "12345", "positions": [{ "id": "offer-001" }] }
```

`positions` — список позиций заказа из DOM страницы GC (клиент передаёт; используется для offer-фильтра на уровне config; авторитетная проверка — в `intent-by-deal`). При `offerListType='off'` offer-фильтр не применяется и `positions` не влияет на `enabled`.

Ответ (успех):

```json
{ "ok": true, "config": { "lifepay": { "enabled": true }, "lavatop": { "enabled": false } } }
```

Логика `enabled` для каждого метода `m`:

1. `settings.<m>Enabled` (флаг в настройках).
2. `areAllOffersAllowed(positions из тела, settings)` — offer-фильтр по переданным позициям. При `offerListType='off'` (дефолт) — всегда `true`, пропускается без проверки списка. При `'whitelist'`/`'blacklist'` — сверка по `id` позиций.
3. Если задан `minAmount>0` или `maxAmount>0` для метода: `resolveGcDealAmount(ctx, dealId)` → конвертация суммы заказа в рубли (RUB без изменений; USD/EUR — ручной курс панели → курс ЦБ РФ; недоступен курс → fail-closed `enabled:false`) → сравнение рублёвой суммы с диапазоном. При любой ошибке резолвинга — `enabled:false`, ответ `ok:true` (fail-closed).

Коды ошибок:

- HTTP 500 `WIDGET_CONFIG_ERROR` — сбой при чтении настроек (fail-closed).
- HTTP 400 `WIDGET_BODY_INVALID` — тело невалидно или `dealId` отсутствует/невалиден при наличии проверки суммы.

**Наблюдаемость (логирование):** эндпоинт и `resolveGcDealAmount` (`lib/gateway/gcDealResolver.ts`) пишут в `loggerLib.writeServerLog` следующие записи:

| Ключ записи            | Severity  | Условие / содержимое                                                                                                                                           |
| ---------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `body_invalid`         | 4 (warn)  | Невалидное тело или невалидный `dealId` (3 точки вызова). Видно при Info и Debug.                                                                              |
| `success`              | 6 (info)  | Итог запроса: `positionsCount`, `lifepayOfferOk`, `lifepayAmountOk`, `lavatopOfferOk`, `lavatopAmountOk`. Без массива id офферов. Видно при Info и Debug.      |
| `positions_parsed`     | 7 (debug) | Сырые данные: `positionsCount` + массив id офферов из тела. Только при LogLevel=Debug.                                                                         |
| `amount_resolve_start` | 7 (debug) | Вход в ветку резолва суммы: `dealId`, флаги `lifepayNeedsAmount`/`lavatopNeedsAmount`. Только при LogLevel=Debug.                                              |
| `amount_resolved`      | 7 (debug) | Результат резолва: `resolvedAmount`, `cachedHit`, `gcFailed`. Только при LogLevel=Debug.                                                                       |
| `decision`             | 7 (debug) | По каждому методу: `enabledSetting`, `needsAmount`, `min`, `max`, `offerListType`, `offersCount`, `offerOk`, `amountOk`, `enabled`. Только при LogLevel=Debug. |
| `entry` (резолвер)     | 7 (debug) | Вход в `resolveGcDealAmount`: `{dealId, dealIdRaw}`. Только при LogLevel=Debug.                                                                                |
| `fields_extracted`     | 7 (debug) | После парсинга `getDealFields`: `{dealId, costRaw, currency, cost}`. Только при LogLevel=Debug.                                                                |

При LogLevel=Info из потока видна только запись `success`. Для просмотра полной цепочки принятия решения (сырые данные, промежуточные суммы, решение per-метод) выставить `log_level=Debug` в `/web/admin`.

### Контракт `/api/widgets/intent-lifepay`

Запрос (body в виде JSON-строки, `Content-Type: text/plain`):

```json
{ "amount": 1500.0, "email": "buyer@example.com", "orderNumber": "ORD-001" }
```

Ответ (успех, зеркало gateway):

```json
{ "ok": true, "data": { "paymentUrl": "https://..." }, "requestId": "..." }
```

### Контракт `/api/widgets/intent-lavatop`

Запрос:

```json
{ "email": "buyer@example.com", "offerId": "offer-uuid", "amount": 1500.0 }
```

Ответ — аналогично invoke, `data.paymentUrl` содержит URL формы оплаты.

### Контракт `/api/widgets/intent-by-deal`

Запрос (body в виде JSON-строки, `Content-Type: text/plain`):

```json
{ "dealId": "12345", "method": "lifepay" }
```

Для Lava.Top:

```json
{ "dealId": "12345", "method": "lavatop", "currency": "USD" }
```

Для Lava.Top через UNLIMINT:

```json
{ "dealId": "12345", "method": "lavatop", "currency": "USD", "paymentProvider": "UNLIMINT" }
```

`method` опционален (по умолчанию `'lifepay'`). `currency` (только для `method: 'lavatop'`): `'RUB'` | `'USD'` | `'EUR'`; обязательна для Lava.Top. Опциональные поля выбора варианта Lava.Top (`paymentProvider`, `paymentMethod`, `buyerLanguage`, `periodicity`, `clientUtm`) передаются в gateway без бизнес-ограничений на стороне `/pay/`; доступность сочетания проверяет Lava.Top/gateway. Неизвестное `method` → `WIDGET_GC_METHOD_UNSUPPORTED` (HTTP 422).

Ответ (успех):

```json
{
  "ok": true,
  "paymentUrl": "https://...",
  "orderNumber": "12345",
  "correlationId": "12345",
  "requestId": "..."
}
```

PII (email покупателя) в ответ **не включается**. Поток резолвинга на сервере:

**LifePay (`method: 'lifepay'`, только RUB):**

1. `idempotentBillCache.lookup(ctx, 'lifepay', orderNumber, amount)` (`lib/gateway/idempotentBillCache.ts`) — поиск последнего успешного `createBill` в `request_log` по `op+gatewayId+orderNumber` за TTL 30 минут; при попадании — возврат кэшированного `paymentUrl` без шагов 2–5. Сверка `amount` выполняется в памяти (поле из `argsRedacted`).
2. `resolveGcDeal(ctx, dealId, correlationId?)` (`lib/gateway/gcDealResolver.ts`) — `getDealFields` → `getUserFields` через GC-гейтвей; извлекает из двойной обёртки `responseBody.data.data`. После каждого из двух вызовов выполняется `recordRequestLog` (try/catch, gatewayId='gc') с пробросом `correlationId` для связки в `request_log`. Результат `GcDealResolveResult` включает поле `dealNumber: string` — значение GC поля `number` сделки (пустая строка, если поле не задано).
3. Проверки: сделка найдена, не оплачена, валюта RUB, email присутствует, сумма в пределах hard-limit + min/max.
4. `runWithExclusiveLock('yakovleva-pay:bill-idempotency:lifepay:<orderNumber>', BILL_LOCK_WAIT_MS, BILL_LOCK_MAX_DURATION_MS)` — захват лока; `LockAcquisitionError` → 503 `WIDGET_GC_BUSY`.
5. Повторный `idempotentBillCache.lookup` внутри лока (второй конкурентный запрос видит запись первого).
6. `invokeByGateway('lifepay','createBill')` с суммой/валютой от GC. `correlationId` передаётся в `callbackUrl` и в `request_log`, но исключён из `argsForGateway`.
7. `recordRequestLog` — результат вызова записывается в `request_log` (`lib/gateway/recordRequestLog.ts`); обёрнут в try/catch.

**Lava.Top (`method: 'lavatop'`, RUB/USD/EUR):**

1. `idempotentBillCache.lookup(ctx, 'lavatop', orderNumber, currency, amount)` — поиск последнего успешного `createInvoice` в `request_log` по `op+gatewayId+orderNumber` за TTL 30 минут; при попадании — возврат кэшированного `paymentUrl`. Сверка `currency+amount` выполняется в памяти.
2. `resolveGcDeal(ctx, dealId, correlationId?)` — сумма/email из GC (рублёвый `cost`). После `getDealFields` и `getUserFields` пишет в `request_log` через `recordRequestLog`.
3. Проверки сделки + фильтр суммы (hard-limit + `widget_lavatop_min`/`widget_lavatop_max` по рублёвому `cost`).
4. `convertRubTo(cost, currency)` (`lib/rates/currencyConverter.ts`) — для RUB тождество; для USD/EUR: ручной курс из настроек (`widget_lavatop_manual_rate_usd`/`eur`) приоритетнее, иначе курс ЦБ РФ (cbr-xml-daily.ru через `@app/request`). Возвращает `{ok, amount, rate, source: 'identity'|'manual'|'cbr'}`.
5. Проверка лимитов суммы оффера Lava.Top (RUB 50…100000000, USD/EUR 5…10000); суммы ниже минимума не отправляются в Lava.Top.
6. `runWithExclusiveLock('lavatop-offer:'+offerId, LAVATOP_LOCK_WAIT_MS, LAVATOP_LOCK_MAX_DURATION_MS)` — захват лока; `LockAcquisitionError` → 503 `WIDGET_LAVATOP_BUSY`.
7. Повторный `idempotentBillCache.lookup` внутри лока.
8. `updateOfferPrice(offerId, productId, amount, currency)` → `createInvoice(offerId, email, currency, invoiceOptions?)` → `paymentUrl`. `clientOrderId = '{dealId}'` (числовой, нормализованный, без префикса).
9. `recordRequestLog` — результат `createInvoice` записывается в `request_log` (прежде Lava.Top-ветка не писала).

Предусловия Lava.Top deal-потока: `widget_lavatop_offer_id` + `widget_lavatop_product_id` заданы; оффер поддерживает RUB/USD/EUR.

### Коды ошибок виджетных эндпоинтов

- `WIDGET_METHOD_DISABLED` (HTTP 403) — метод оплаты отключён в настройках.
- `WIDGET_AMOUNT_EXCEEDS_HARD_LIMIT` (HTTP 400) — сумма > 500 000 ₽.
- `WIDGET_AMOUNT_EXCEEDS_USER_LIMIT` (HTTP 400) — сумма > `widget_*_max_amount`.
- `WIDGET_LAVATOP_AMOUNT_TOO_SMALL` (HTTP 400) — Lava.Top: сумма ниже публичного минимума (50 ₽ / 5 $ / 5 €).
- `WIDGET_EMAIL_REQUIRED` / `WIDGET_OFFER_ID_REQUIRED` (HTTP 400) — Lava.Top: обязательные поля.
- `LAVATOP_NOT_CONFIGURED` — Lava.Top: `lava_test_apikey` не задан.
- `WIDGET_BODY_INVALID` (HTTP 400) — `/api/widgets/config`: тело невалидно или `dealId` отсутствует/невалиден, когда хотя бы один метод требует проверку суммы (`minAmount`/`maxAmount` > 0).

Коды ошибок `intent-by-deal` (маппинг на HTTP):

- `WIDGET_GC_DEAL_ID_INVALID` (HTTP 400) — `dealId` не число или отсутствует.
- `WIDGET_GC_METHOD_UNSUPPORTED` (HTTP 422) — `method` не `'lifepay'` и не `'lavatop'`.
- `WIDGET_GC_DEAL_NOT_FOUND` (HTTP 404) — сделка не найдена в GC.
- `WIDGET_GC_ALREADY_PAID` (HTTP 409) — сделка уже оплачена (`is_payed=true`).
- `WIDGET_GC_EMAIL_MISSING` (HTTP 422) — email покупателя не задан в GC.
- `WIDGET_GC_CURRENCY_UNSUPPORTED` (HTTP 422) — для LifePay: валюта сделки != RUB.
- `WIDGET_GC_GATEWAY_ERROR` (HTTP 502) — ошибка при вызове GC-гейтвея.

Дополнительные коды для Lava.Top deal-потока:

- `WIDGET_LAVATOP_CURRENCY_INVALID` (HTTP 400) — `currency` не `'RUB'`, `'USD'` или `'EUR'`.
- `WIDGET_LAVATOP_NOT_CONFIGURED` (HTTP 502) — `widget_lavatop_offer_id` или `widget_lavatop_product_id` не заданы.
- `WIDGET_LAVATOP_RATE_UNAVAILABLE` (HTTP 502) — конвертация невозможна (ЦБ РФ недоступен, ручной курс не задан).
- `WIDGET_LAVATOP_PRICE_UPDATE_FAILED` (HTTP 502) — `updateOfferPrice` вернул ошибку.
- `WIDGET_LAVATOP_AMOUNT_TOO_SMALL` (HTTP 400) — итоговая сумма после конвертации ниже лимита Lava.Top по валюте.

Коды двухуровневого offer-фильтра (добавлены 2026-06-01):

- `WIDGET_OFFER_NOT_ALLOWED` (HTTP 403) — серверная проверка `areAllOffersAllowed` не прошла: хотя бы одна позиция заказа из `getDealFields.resolved.positions` не входит в whitelist или входит в blacklist по `id` (с 2026-06-01 сверка только по id; `title` в сравнении не участвует). Сервер проверяет независимо от клиентского DOM-фильтра.

Коды идемпотентности и локов (добавлены 2026-06-01):

- `WIDGET_GC_BUSY` (HTTP 503) — LifePay-ветка: не удалось захватить лок `'yakovleva-pay:bill-idempotency:lifepay:<orderNumber>'` за `BILL_LOCK_WAIT_MS` (зависший gateway или параллельный запрос не завершился). Клиент должен повторить запрос.
- `WIDGET_LAVATOP_BUSY` (HTTP 503) — Lava.Top-ветка: не удалось захватить лок `'lavatop-offer:<offerId>'` за `LAVATOP_LOCK_WAIT_MS`. Клиент должен повторить запрос.

### Двухуровневая модель offer-фильтра (реализовано 2026-06-01)

Фильтрация офферов выполняется на двух независимых уровнях:

**Уровень 1 — клиент (показ виджета):** userscript читает все позиции заказа из DOM-блока `.deal-positions` (каждая `<li class="offer-position-{posId}" data-offer-id="{offerId}">`, берётся только `data-offer-id`). Для каждой позиции проверяется соответствие whitelist/blacklist разрешённых офферов **по `id`**. Виджет рендерится только если ВСЕ позиции разрешены; хотя бы одна запрещённая → виджет не показывается. Логика реализована в `userscripts/common.js` (`extractDealPositions`, `areAllPositionsAllowed`).

**Уровень 2 — сервер (допуск к intent):** в `api/widgets/intent-by-deal.ts` позиции берутся из `getDealFields` (`lib/gateway/gcDealResolver.ts` возвращает `positions: {id}[]`), затем вызывается `areAllOffersAllowed` из `shared/widgetSettingsTypes.ts`. Запрещённая позиция → 403 `WIDGET_OFFER_NOT_ALLOWED`. Сервер не доверяет клиентскому DOM-фильтру.

**Семантика проверки** (синхронизирована между `shared/widgetSettingsTypes.ts` и `userscripts/common.js`, помечена комментариями-якорями «СИНХРОНИЗИРОВАНО»). С 2026-06-01 сверка **только по `id`** (`title` в настройках — лишь подпись для админки; нечёткое сравнение по названию убрано как хрупкое и избыточное):

- whitelist: позиция разрешена, если её `id` есть в списке. Пустой whitelist → всё запрещено.
- blacklist: позиция разрешена, если её `id` не в списке. Пустой blacklist → всё разрешено.
- Нет позиций в заказе → виджет не показывается (клиент) / сервер пропускает проверку (поведение при пустом `positions`).

**Режим «Выключен» в веб-панели** = `blacklist` + пустой список (= показать всем). Дефолт `offerListType` теперь `'blacklist'`.

## Страница оплаты (api/payment-page/)

Публичный и admin-эндпоинты для встраиваемой страницы оплаты, исполняемой на стороннем GC-домене. Архитектурно аналогичны `api/widgets/*`: один публичный эндпоинт CORS для браузера покупателя, два admin-эндпоинта (`settings-get`/`settings-save`) защищены `guardInternalApi`.

Слой: `api/payment-page/*` → `lib/paymentPage/` (геттеры конфига, методы) и `lib/settings.mutations.ts` (валидация и запись) → `repos/settings`, `repos/paymentPageMethods` → Heap (`PaymentPageMethods`). Кастомные методы управляются через `method-create` / `method-rename` / `method-delete`; системные методы задаются при инициализации и защищены от удаления и переименования.

Всего payment-page-роутов: **6** (обновлено 2026-06-07).

| Method | Path                            | File                              | Auth                                                       | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------- | --------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /api/payment-page/config        | api/payment-page/config.ts        | Публичный (CORS `*`, без авторизации)                      | Конфиг страницы оплаты для loader-скрипта покупателя. Выдаётся без `accountId`/секретов — только визуальный конфиг. Заголовки: `Access-Control-Allow-Origin: *`, `Content-Type: application/json`, `Cache-Control: no-store`. При успехе: `{ success:true, general:{ enabled, accentColor, loaderUrl, stylesUrl, scriptUrls:string[], calloutHtml:string, logoUrl:string, logoWidth:number, defaultMethod:string }, methods:{ [methodKey]: PaymentPageMethodPublic } }`. **С 2026-06-07** `methods` строится из записей Heap-таблицы `PaymentPageMethods` по ключу `methodKey`; каждый метод включает `resolver {type, value}`, `isSystem`, `methodKey`, `offerIds` (переименовано из `offers`), `caption` (string, подпись под названием метода), а также `customScript` (string) и `menuItems` (array) — для системных методов оба поля возвращаются пустыми (`customScript: ''`, `menuItems: []`). **С 2026-06-15** каждый метод включает `hideOnPartialPayment`; `pp-script-11.js` скрывает такой метод, когда URL страницы содержит параметр `paymentValue` (частичная оплата). `customScript` сознательно включён в публичный ответ: исполняется в браузере покупателя через `new Function` на стороне GC; доверяется только оператору панели, а не покупателю. Форма ответа (Record по `methodKey`) сохранена для совместимости с клиентским скриптом. **С 2026-06-07 (фикс):** эндпоинт **не** сидирует системные методы — вызывает `getPaymentPageMethods(ctx, { seed:false })` (только чтение). Сид выполняется исключительно в admin-путях: SSR панели (`index.tsx`) и `GET settings-get`. Если admin ни разу не открывал панель, публичный конфиг вернёт пустой список методов. Поле `general.calloutHtml` — произвольный HTML коллаут-блока. Поля `general.logoUrl`/`general.logoWidth` — логотип над заголовком «Оплата заказа» и его ширина в px. Поле `general.defaultMethod` — `methodKey` метода, выделенного по умолчанию при открытии страницы; пустая строка означает «ни один не выделен». Читается клиентским скриптом из `__PP_CONFIG__.general.defaultMethod`. Поля `section` и `order` управляют раскладкой на публичной странице (`pp-script-11.js`). При любой ошибке: `{ success:false, error }` с HTTP 200. URL статики строятся через `ctx.account.host + getFullUrl`. Зарегистрирован в `config/routes.tsx` как `paymentPageConfig`. |
| GET    | /api/payment-page/settings-get  | api/payment-page/settings-get.ts  | Сотрудник + Admin (`guardInternalApi`, `// @shared-route`) | Получить текущие настройки страницы оплаты для admin-вкладки. Ответ: `{ success:true, general, methods }`. **С 2026-06-07** `methods` — массив `PaymentPageMethodRecord[]` (каждый элемент включает `resolver`, `offers`, `isSystem`, `methodKey`), а не Record. **С 2026-06-15** каждый метод включает `hideOnPartialPayment` для чекбокса «Скрывать при частичной оплате». `general` включает `defaultMethod: string` — `methodKey` метода по умолчанию (пустая строка = ни один не выделен), а также `logoUrl: string` и `logoWidth: number` для логотипа над заголовком заказа. Нормализация при чтении: trim, нестрока → `''`; ширина логотипа ограничивается допустимым диапазоном. Зарегистрирован как `paymentPageSettingsGet`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| POST   | /api/payment-page/settings-save | api/payment-page/settings-save.ts | Сотрудник + Admin (`guardInternalApi`, `// @shared-route`) | Сохранить настройку страницы оплаты. Тело: `{ key, value }`. Whitelist ключей: `payment_page_general`, `payment_page_methods`. **С 2026-06-07** для ключа `payment_page_methods` — bulk-update в repo `PaymentPageMethods` под write-локом `yakovleva-pay:pp-method-write` (обновляются только существующие строки по `methodKey`; `isSystem` и `resolver` системных методов не меняются). Принимаемые и нормализуемые поля записи метода: `label` (string), `caption` (string), `enabled`, `hideOnPartialPayment`, `order`, `section`, `offerIds`, `customScript` (string), `menuItems` (array, нормализуется через `parseMenuItems`) и др. **Поля `customScript` и `menuItems` сохраняются только для несистемных методов (`isSystem:false`); для системных эти поля игнорируются** (read-only-инвариант, аналогично `name`/`resolver`). **С 2026-06-07 (фикс 2):** отсутствующий `methodKey` пропускается (счётчик `skipped`) до записи; обновляются только найденные строки. При `notFound > 0` ответ всегда `{ success:true, updated, skipped, notFound }` — сохранённые строки не откатываются, UI показывает предупреждение «Часть методов не найдена… Обновите страницу». Ранее при `notFound > 0` возвращался `success:false` с частично применёнными правками. Для ключа `payment_page_general` — `setSetting` как прежде; value-объект может содержать `defaultMethod`, `logoUrl`, `logoWidth` (сохраняется целиком). Повторное чтение getSetting для эха вынесено в best-effort: сбой чтения после успешного setSetting не переводит ответ в `success:false` (фоллбэк — эхо отправленного value). Валидация диапазона: если `maxAmount > 0 && maxAmount < minAmount`, `maxAmount` сбрасывается в 0 (без верхнего ограничения) с логом severity 4. Ответ: `{ success:true, updated, skipped, notFound }`. Зарегистрирован как `paymentPageSettingsSave`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| POST   | /api/payment-page/method-create | api/payment-page/method-create.ts | Сотрудник + Admin (`guardInternalApi`, `// @shared-route`) | Создать кастомный метод оплаты. **С 2026-06-07 — новый контракт тела:** `{ name, id, section, order? }`. `id` обязателен, валидируется через `isValidMethodId` (regex `/^[A-Za-z][A-Za-z0-9_-]{0,63}$/`, начинается с буквы, длина до 64). `methodKey = id` (генерация rand4/sanitize убрана). Уникальность `id` проверяется против всех существующих методов (системных и кастомных) под write-локом `yakovleva-pay:pp-method-write`. Необязательный параметр `order` (number ≥ 0) — позиция в секции; если не передан — сервер использует 0. Создаёт строку `PaymentPageMethods` с `isSystem:false`, `caption: ''`, `hideOnPartialPayment:false` и дефолтными значениями прочих полей. Ответ: `{ success:true, method: PaymentPageMethodRecord }` или `{ success:false, error }` (ошибки: `invalid_id` — не прошёл regex; `duplicate` — id уже занят). Зарегистрирован как `paymentPageMethodCreate`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| POST   | /api/payment-page/method-rename | api/payment-page/method-rename.ts | Сотрудник + Admin (`guardInternalApi`, `// @shared-route`) | **Новый роут (2026-06-07).** Переименовать id кастомного метода. Тело: `{ oldMethodKey, newMethodKey }`. Валидация: `newMethodKey` через `isValidMethodId`; `oldMethodKey ≠ newMethodKey`. Переименование выполняется in-place (`repo.renameMethodKey`): обновляются поля `methodKey` и `resolverValue` существующей строки под локом `yakovleva-pay:pp-method-write`, `rowId` сохраняется. Системные методы переименовать нельзя. Ответ: `{ success:false, error }` при `not_found` («Метод не найден»), `system` («Системный метод нельзя переименовать»), `duplicate` («Метод с таким id уже существует»); `{ success:true, method }` при успехе. Зарегистрирован как `paymentPageMethodRename`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| POST   | /api/payment-page/method-delete | api/payment-page/method-delete.ts | Сотрудник + Admin (`guardInternalApi`, `// @shared-route`) | Удалить кастомный метод оплаты. Тело: `{ methodKey }`. Ответ: `NOT_FOUND` если метод не существует; `SYSTEM_METHOD_DELETE_FORBIDDEN` если `isSystem:true` (fail-closed на сервере); иначе удаление под write-локом `yakovleva-pay:pp-method-write` → `{ success:true }`. Зарегистрирован как `paymentPageMethodDelete`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

> CORS-стратегия `/api/payment-page/config`: простой запрос с `Content-Type: text/plain`, `Access-Control-Allow-Origin: *` — без ограничения по домену. Ошибки всегда возвращаются с HTTP 200, чтобы loader мог прочитать `json.success`.
>
> С 2026-06-17 `POST /api/payment-page/config` принимает optional `{ dealId }` от `pp-loader.js` и возвращает `deal: { hasTopUpPayment: boolean }`. Сервер вычисляет признак через `resolveGcDealAmount`: `hasTopUpPayment=true`, когда `max(user_payed_money_value, payed_value) > 0`. Поле используется `pp-script-11.js` для методов с `hideOnTopUpPayment=true`; новый флаг также сохраняется через `settings-save`, создаётся с `false` в `method-create` и входит в `PaymentPageMethodRecord`.

## SSR-контракт пропа `gcOperations` (index.tsx → ClientHomePage)

`index.tsx` вызывает `fetchGcOperations(ctx)` при SSR и передаёт массив `GcOperationEntry[]` пропом `gcOperations` в компонент `ClientHomePage`.

Тип `GcOperationEntry` (`shared/operationsClientCatalog.ts`):

| Поле         | Тип                         | Описание                                                                                                                                                                                  |
| ------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`        | `string`                    | Ключ операции (имя)                                                                                                                                                                       |
| `label`      | `string`                    | Отображаемое название                                                                                                                                                                     |
| `httpMethod` | `'GET' \| 'POST'`           | HTTP-метод для `POST /api/gateways/invoke`                                                                                                                                                |
| `argsTree`   | `ArgsTreeNode \| undefined` | Иерархия полей из `GET /v1/operations` GC-гейтвея. При наличии — форма строится через `buildFormRows` (`shared/gcArgsForm.ts`). При отсутствии — форма деградирует к `__root__` textarea. |

`ArgsTreeNode` и `ArgsTreeField` определены в `shared/gcArgsForm.ts` и зеркалят wire-контракт GC gateway без кросс-проектного импорта. Источник данных — `GET /api/v1/operations` GC-гейтвея; парсинг — `lib/gateway/gcOperationsLoader.ts:normalizeEntry`. При изменении схемы полей на стороне гейтвея клиент правок не требует, пока wire-контракт `argsTree` остаётся совместимым.

## Payment Plugin Settings API (2026-06-09)

| Method | Path                         | File                           | Auth  | Purpose                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ---------------------------- | ------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api/plugins/settings-get    | api/plugins/settings-get.ts    | Admin | Returns manifest-driven plugin configs with masked/write-only secrets.                                                                                                                                                                                                                                                                                                          |
| POST   | /api/plugins/settings-save   | api/plugins/settings-save.ts   | Admin | Saves one whitelisted manifest field: `{ pluginId, key, value }`.                                                                                                                                                                                                                                                                                                               |
| GET    | /api/plugins/lavatop-catalog | api/plugins/lavatop-catalog.ts | Admin | Loads Lava.Top products/offers through gateway operation `listProducts`, follows `nextPage` up to 30 pages, normalizes `{ type:'PRODUCT', data }` and flat product formats. Returns `{ success:true, products:[{ id, title, offers:[{ id, title }] }], pages, requestId }`. Used by the Lava.Top plugin selector for `widget_lavatop_product_id` and `widget_lavatop_offer_id`. |

`/api/plugins/settings-save` accepts only plugin ids and setting keys declared by `lib/plugins/pluginRegistry.lib.ts`. Secret values are never returned raw after save. Deprecated `/api/settings/save-operational` is fail-closed with `OPERATIONAL_SETTINGS_DEPRECATED`; deprecated `/api/widgets/settings-get` and `/api/widgets/settings-save` are fail-closed with `WIDGET_SETTINGS_DEPRECATED`. `gc_enabled` and `gc_create_payment` are now saved through the GetCourse plugin manifest.

For `lifepay/createBill`, the client no longer sends the webhook URL with `lp_webhook_token`; `api/gateways/invoke.ts` builds `callbackUrl` server-side from `ROUTES.webhook` and the stored LifePay token before proxying the operation to the gateway.

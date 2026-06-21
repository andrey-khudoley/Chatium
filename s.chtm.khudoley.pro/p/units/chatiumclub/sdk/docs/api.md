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

Набор: юнит без Heap (`lib/tests/templateUnitSuite.ts`), интеграция с Heap и `route.run` по API (`lib/tests/integrationSuite.ts`), HTTP GET страниц на клиенте (`TestsPage.vue`, проверка статуса и фрагментов SSR). Каталог — `shared/testCatalog.ts`; страница `/web/tests` — три вкладки (Юнит / Интеграция / HTTP), метрики по активной вкладке, прогон всей вкладки и точечный запуск (play). Блоки категорий на вкладке сворачиваются по клику на заголовок (по умолчанию развёрнута первая категория, остальные свёрнуты; иконка `fa-folder` / `fa-folder-open`). Для `GET /web/tests` фрагменты SSR — `window.__BOOT__` и подстрока `chatiumclub-sdk-tests-page` из `<meta name="chatiumclub-sdk-tests-page" content="web-tests">` в `web/tests/index.tsx` (текст вкладок в первичном HTML может отсутствовать до гидрации).

Проверки с `requireAccountRole(Admin)` в интеграционном прогоне при отсутствии роли Admin помечаются как провал с пояснением «нужна роль Admin» (один `ctx` на запрос).

При любом провале юнит/интеграционного кейса в серверный лог пишется отдельная запись через `lib/tests/logTestRunFailures.ts`: **severity 3** (видно при `log_level = Error`, в отличие от сводок с более высоким severity). Итоговая строка «набор завершён» при `failed > 0` тоже с **severity 3**. Старт прогона остаётся с severity 7 (при строгом уровне логов может не попасть в вывод).

| Method | Path                   | File                           | Auth    | Назначение                                                                                                                                                                           |
| ------ | ---------------------- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | /api/tests/list        | api/tests/list.ts              | AnyUser | Каталог: `{ success, categories }`. У категорий есть `blocks[]` и плоский `tests`.                                                                                                   |
| GET    | /api/tests/unit        | api/tests/unit/index.ts        | AnyUser | Юнит: `runTemplateUnitChecks()` — routes, project, logLevel script, logger.lib, shared/logger, целостность каталога. `{ success, kind: 'unit', results[], summary, at }`.            |
| GET    | /api/tests/integration | api/tests/integration/index.ts | AnyUser | Интеграция: Heap, libs, API через `route.run`, e2e-сценарии; в конце добавляется проверка `api_tests_integration_shape`. `{ success, kind: 'integration', results[], summary, at }`. |

## Gateway (api/gateway/) — тонкая прокладка к gateway

Тонкий клиент SDK — отдельное Chatium-приложение, которое по обычному HTTP вызывает gateway-приложение (`p/saas/gw/gc`). Базовая логика — `lib/gateway/gatewayClient.ts` (см. `docs/architecture.md`, раздел «Gateway-клиент»). Эти эндпоинты — серверный фасад того же поведения через сетевой канал и предназначены для админки и интеграционных проверок.

Инструкция для ИИ-агента по использованию SDK — файл `000-llm-agent-chatiumclub-sdk.md` в корне проекта: полный перечень `op`, **все поля `args` по каждому `op` (приложение A)**, коды ошибок SDK и gateway, примеры, фасады, сериализация `args` (без внешних ссылок).

| Method | Path                    | File                      | Auth  | Назначение                                                                                                                                                                                                                                                                                                                                 |
| ------ | ----------------------- | ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | /api/gateway/invoke     | api/gateway/invoke.ts     | Admin | Вызвать `op` через тонкого клиента. Body: `{ op: string, args?: object, httpMethod?: 'GET' \| 'POST' }`. Если `httpMethod` не задан — берётся из локального снимка `shared/v1OpsList.generated.ts`. Возвращает `{ ok, data \| error, requestId, warnings, gatewayHttpStatus }` — повторяет контракт `lib/gateway/gatewayClient.ts#invoke`. |
| GET    | /api/gateway/operations | api/gateway/operations.ts | Admin | Прочитать каталог операций gateway (`GET {gateway_url}/api/v1/operations`, manual §3.3). Возвращает `{ ok, catalog \| error, requestId, gatewayHttpStatus }`, где `catalog = { catalogSchemaVersion, operations[] }`.                                                                                                                      |

Контракт ошибок (поле `error.code`):

- Коды gateway (`INVOKE_*`, `GATEWAY_*`, manual §10) приходят как есть, если gateway вернул JSON с `ok: false`.
- SDK-коды добавляются клиентом, когда до gateway не дошли:
  - `SDK_NOT_CONFIGURED` — не заданы `gateway_url` / `gc_school_host` / `gc_school_api_key` в Heap.
  - `SDK_OP_HTTP_METHOD_UNKNOWN` — клиент не знает HTTP-метод операции (нет в локальном снимке и не передан явно).
  - `SDK_GATEWAY_NETWORK_ERROR` — `@app/request` бросил исключение.
  - `SDK_GATEWAY_INVALID_RESPONSE` — gateway вернул не JSON или JSON без `ok` / `error.code`.
  - `SDK_BAD_REQUEST` — пустое поле `op` в теле `POST /api/gateway/invoke`.
  - `SDK_INTERNAL_ERROR` — необработанное исключение в роуте SDK.

В лог не попадают значения `gc_school_api_key`, полный `Authorization` и тела ответов GC (manual §5.7); фиксируются только длины, наличие, имена `op`, коды ошибок и `requestId`.

## Публичные эндпоинты

| Method | Path | File | Auth | Назначение |
| ------ | ---- | ---- | ---- | ---------- |
| -      | -    | -    | -    | -          |

## События и webhooks

- Не используются.

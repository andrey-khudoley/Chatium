# Architecture

## Назначение

Lava.Top gateway: серверный шлюз, реализующий публичный контур `invoices_v1` (`/v1/createInvoice`, `/v1/getInvoiceStatus`, `/v1/listProducts`, `/v1/updateOfferPrice`, `/v1/operations`) с маршрутизацией к `https://gate.lava.top`; принимает вебхуки Lava.Top и проксирует их на клиентский callback (webhook-relay). На `/` — панель оператора с журналами и внутренней системой доступов. Каркас унаследован от `template_project`.

## Ограничения платформы

- Серверная инфраструктура предоставляется Chatium.
- Нельзя менять стек и зависимости.
- Деплой — автоматически при пуше.

## Основные сценарии

- Внешний клиент вызывает `/v1/{op}` контура `invoices_v1` (создание счёта, статус, список продуктов, обновление цены).
- Lava.Top присылает вебхук на `/webhooks` — gateway дедуплицирует и проксирует на клиентский callback.
- Оператор открывает панель `/` (Admin или активный грант) — журналы, KPI, вебхуки.
- Авторизация и профиль; AdminPage (только роль Admin); страница тестов.

## Роутинг

- `index.tsx` — панель оператора (`pages/HomePage.vue`; `requireRealUser` + `requireInternalAccess`). Аноним → `/s/auth/signin`; без доступа → `/web/forbidden`. Передаёт `isAdmin`, `initialDateFilter`, `testValues`, `apiUrls`.
- `web/admin/index.tsx` — AdminPage, `requireAccountRole('Admin')`.
- `web/profile/index.tsx` — профиль, `requireRealUser()`.
- `web/tests/index.tsx` — страница тестов, `requireRealUser()` + `requireAccountRole('Admin')`. Без роли Admin → `/web/forbidden`.
- `web/login/index.tsx` — вход (редирект на системный `/s/auth/signin`).
- `web/forbidden/index.tsx` — страница 403 (отсутствие доступа к панели).
- `web/access/invite/index.tsx` — страница приёма инвайта (`requireRealUser`; рендерит `InviteAcceptPage.vue`).
- `api/v1/createInvoice.ts`, `api/v1/getInvoiceStatus.ts`, `api/v1/listProducts.ts`, `api/v1/updateOfferPrice.ts` — публичные gateway-эндпоинты контура `invoices_v1`. Авторизация: заголовок `X-Lava-Apikey`. Общая цепочка через `handleV1Op`.
- `api/v1/operations.ts` — каталог операций (`GET /v1/operations`). Без заголовка `X-Lava-Apikey`. Источник — `lib/gateway/operationsCatalog.ts`.
- `webhooks/index.ts` — рабочий приём вебхуков Lava.Top (`POST /webhooks`).
- `webhooks/status.ts` — проверка доступности webhook relay (`GET /webhooks/status`).

## Вёрстка админки и страницы тестов

- Корень Vue (`.app-layout` в `AdminPage.vue` / `TestsPage.vue`) ограничен высотой окна (`100vh` / `100dvh`) с `overflow: hidden`; после `boot-complete` у `body` нет вертикального скролла. Ширина: `.app-layout`, `<main class="ap-wrap|tp-wrap">` и блок `.ap` / `.tp` — на всю доступную ширину (`width: 100%`, у обёрток при необходимости `min-width: 0` для flex); контент по-прежнему ограничен `max-width: 1440px` у `.ap`/`.tp`. `<main>` — flex-колонка с `overflow: hidden` (сам не скроллится). Ниже — `.ap` / `.tp` (flex, `min-height: 0`), статус/тулбар `flex-shrink: 0`, сетка `.ap-grid` / `.tp-grid` с `grid-template-rows: minmax(0, 1fr)` и `flex: 1`; в двухколоночном режиме первая колонка — `minmax(240px, 1fr)` (не `minmax(0, 1fr)`), чтобы левая область не сжималась чрезмерно. Вертикальный скролл только у левой колонки `.ap-main` / `.tp-main` (`overflow-y: auto`, класс `content-wrapper` для стилей скроллбара). Правая колонка логов тянется по высоте ячейки сетки; список строк — `.ap-log-out` / `.tp-log-out` с внутренним `overflow-y`. На узкой вёрстке снова скроллится весь `<main>`.

## Gateway-слой (`lib/gateway/`, `shared/gatewayHttpHeaders.ts`)

Общий код для публичных эндпоинтов `/v1/*` invoices-gateway.

- `lib/gateway/constants.ts` — жёсткие константы: `GW_OUTBOUND_TIMEOUT_MS`, `GW_MAX_REQUEST_BODY_BYTES`, `GW_FORWARD_TIMEOUT_MS`, `LAVA_TOP_BASE_URL`.
- `lib/gateway/requestId.ts` — UUID v4 для корреляции лог-записей и заголовка `X-Gateway-Request-Id`.
- `lib/gateway/gatewayErrors.ts` — каталог `INVOKE_*` с HTTP-статусами: `INVOKE_LAVA_APIKEY_MISSING` (401), `INVOKE_LAVA_RATE_LIMITED` (429), `INVOKE_LP_UPSTREAM_ERROR` (502), `INVOKE_LP_TIMEOUT` (504), `INVOKE_LP_SEMANTIC_ERROR` (502), `INVOKE_BODY_INVALID_JSON` (400) и др.
- `lib/gateway/gatewayResponse.ts` — сборка ответа `{ ok, data | error, requestId }` с заголовком `X-Gateway-Request-Id`.
- `lib/gateway/lavaCredentials.ts` — чтение и валидация заголовка `X-Lava-Apikey`; маскирование длиной для безопасных логов.
- `lib/gateway/lavaTopClient.ts` — обёртка над `@app/request` для исходящих вызовов к Lava.Top. Поддерживает POST, GET, PATCH. Дискриминированное объединение `LavaClientResult`: `json_ok`, `upstream_status`, `upstream_parse_error`, `network_error`, `timeout`, `rate_limited` (429→rate_limited).
- `lib/gateway/buildCreateInvoiceBody.ts` — сборка тела `POST /api/v3/invoice` Lava.Top (без `callbackUrl`/`clientOrderId` — они остаются в gateway для маппинга).
- `lib/gateway/invoicesV1Semantic.ts` — классификация ответов Lava.Top и извлечение успешных payload'ов.
- `lib/gateway/operationsCatalog.ts` — машиночитаемый каталог операций `invoices_v1` (SSOT): `argsValidator` (рантайм, `@app/schema`), `argsSchema` (wire-форма для UI). `toOperationSummaries()` — в wire для клиента и `GET /v1/operations`.
- `lib/gateway/gatewayUnitSuite.ts` — юнит-тесты gateway (~21 кейс: каталог, маскирование, семантика, дедуп). Подключены в `api/tests/unit`.
- `lib/gateway/lavaTypes.ts` — типы запросов/ответов Lava.Top (`LavaWebhookPayload` и др.).
- `lib/gateway/handleV1Op.ts` — общая цепочка обработки `/v1/{op}`: requestId → availability → заголовок `X-Lava-Apikey` → body/query → валидация args → вызов прикладного handler → классификация транспорта Lava.Top → ответ. Прикладной handler в файле роута содержит только семантику конкретного `op`. Запись в `gatewayRequestLog` (всегда) и `gatewayUpstreamLog` (если был вызов к Lava.Top) — в `finally`.
- `shared/gatewayHttpHeaders.ts` (`// @shared`) — имена заголовков `X-Lava-Apikey`, `X-Api-Key`, `X-Gateway-Request-Id`.
- `shared/operationsCatalogShared.ts` (`// @shared`) — типы wire-формы каталога для SSR-пропсов и `GET /v1/operations`.
- `shared/gatewaySettingKeys.ts` (`// @shared`) — ключи настроек gateway (`lava_test_apikey`, `lava_base_url`, `lava_webhook_secret`, `panel_date_filter`) и тип `LtTestValues`.

Запрет логирования секретов: полные значения `apikey` / `lava_test_apikey` в `writeServerLog` не попадают. Допустимо: длина `apikey`, имя `op`, `requestId`, коды ошибок.

## Webhook-relay (`lib/webhook/`, `webhooks/`)

Lava.Top → `POST /webhooks` → авторизация по `lava_webhook_secret` (заголовок `X-Api-Key` или Basic) → `processWebhook` → дедуп по `dedupe_key = eventType:contractId:status` → поиск маппинга по `contractId` (для рекуррентных — fallback по `parentContractId`) → форвард best-effort на `callback_url`.

Ключевые решения (см. [ADR-0003](ADR/0003-webhook-relay.md)):

- Неверный секрет → 401 (Lava.Top повторит). Секрет не задан → 500.
- `contractId` не найден → событие сохраняется с `processing_error=contract_not_found`, ответ 2xx (иначе Lava.Top зря повторяет).
- Ошибка форварда → фиксируется в событии, ответ Lava.Top всё равно 2xx.
- Вся цепочка (find→create→mapping→forward) выполняется внутри `runWithExclusiveLock` по `dedupe_key` — гонки параллельных вебхуков закрыты.
- Маппинг `contractId → callback_url` создаётся в `createInvoice` при `callbackUrl` (идемпотентно, под локом).
- `reforwardEvent` — повторный форвард по `id` события (кнопка в панели).

## Система доступов к панели (`lib/access/`)

Доступ к главной `/`, `/web/tests` и API панели защищён двухуровневой схемой: **Admin** (роль аккаунта) или **активный грант** (запись в `panelAccess`). По модели `lifepay`.

- `requireInternalAccess` — вызывается в `index.tsx`; при отказе — редирект на `/web/forbidden`.
- `guardInternalApi` — для API-эндпоинтов (возвращает 403). Применяется к `api/admin/dashboard/gatewayCounts`, `api/admin/raw/*`, `api/admin/analytics/filter-save`, `api/admin/webhooks/*`.
- Инвайты: Admin генерирует токен (TTL 7 дней), пользователь принимает через `/web/access/invite` → `consumeInvite` (под `runWithExclusiveLock`). Отзыв — только Admin.

## Фильтр по дате (`panel_date_filter`)

Глобальный фильтр хранится в Heap-настройке `panel_date_filter` (`{ from?, to? }`, Unix ms). Управляется через `api/admin/analytics/filter-save.ts` (`guardInternalApi`). Репозитории `gatewayRequestLog.repo.ts` и `gatewayUpstreamLog.repo.ts` имеют метод `findRecentFiltered`. SSR-проп `initialDateFilter` передаётся в `HomePage.vue`.

## Разделение слоёв

Принцип разделения ответственности при работе с данными (см. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md)):

| Слой              | Каталог   | Ответственность                                                                      |
| ----------------- | --------- | ------------------------------------------------------------------------------------ |
| **Таблицы**       | `tables/` | Схемы Heap (поля, типы). Только определение структуры данных.                        |
| **Репозитории**   | `repos/`  | Работа с БД: CRUD, запросы. Никакой бизнес‑логики, только вызовы Heap API.           |
| **Бизнес‑логика** | `lib/`    | Правила, дефолты, валидация значений, вычисления. Вызывает репозитории.              |
| **API**           | `api/`    | HTTP‑эндпоинты, парсинг и первичная валидация запросов, проверка прав. Вызывает lib. |

Поток данных: `HTTP → API → lib → repos → Heap`.

## Структура каталогов

- `config/` — маршруты и `PROJECT_ROOT`.
- `web/` — браузерные роуты модулей (admin, profile, tests, login, forbidden, access/invite).
- `pages/` — Vue‑страницы: `HomePage.vue` (панель; вкладки Обзор/Входящие/К Lava/Вебхуки/Доступы/Создать запрос), `InviteAcceptPage.vue` (приём инвайта).
- `components/` — переиспользуемые Vue‑компоненты (Header, AppFooter, GlobalGlitch, LogoutModal, `RequestTestTab.vue` — форма имитации вызова `/api/v1/{op}`).
- `api/` — API‑эндпоинты. File-based: один файл — один эндпоинт с `/`. Включает: `api/v1/` (gateway), `api/admin/raw/` (журналы), `api/admin/dashboard/` (`guardInternalApi`), `api/admin/analytics/filter-save.ts`, `api/admin/webhooks/` (журнал/реформард), `api/access/` (управление доступами).
- `webhooks/` — публичный входящий webhook Lava.Top (`POST /webhooks`) и статус (`GET /webhooks/status`).
- `tables/` — Heap‑таблицы (схемы: settings, logs, gatewayRequestLog, gatewayUpstreamLog, lavatopWebhookEvent, lavatopWebhookMapping, panelAccess, panelInvites).
- `repos/` — репозитории (settings, logs, gatewayRequestLog с `findRecentFiltered`, gatewayUpstreamLog с `findRecentFiltered`, lavatopWebhookEvent, lavatopWebhookMapping, panelAccess, panelInvites).
- `lib/` — бизнес‑логика: settings.lib (включая геттеры gateway-настроек и `getPanelDateFilter`), logger.lib, `lib/gateway/` (gateway-слой), `lib/webhook/` (webhook-relay), `lib/access/` (система доступов).
- `shared/` — общий код (preloader, logLevel, logger syslog RFC 5424, browserRemoteLogger, `gatewayHttpHeaders.ts`, `gatewaySettingKeys.ts`, `operationsCatalogShared.ts`).
- `docs/` — документация проекта.

## Стратегия логирования

Логирование построено на стандарте syslog (RFC 5424), severity 0–7. Управление уровнем через настройку `log_level` (Debug/Info/Warn/Error/Disable).

| Severity | Уровень  | Что логируется                                                                           |
| -------- | -------- | ---------------------------------------------------------------------------------------- |
| 7        | Debug    | Сырые данные (параметры, возвраты, промежуточные значения) — появляются только при Debug |
| 6        | Info     | Карта вызовов: entry/exit функций, ветвления — без сырых данных при уровне Info          |
| 5        | Notice   | Пользовательские действия (клик, навигация, изменение настроек)                          |
| 4        | Warning  | Нештатные ситуации, не требующие немедленной реакции                                     |
| 3        | Error    | Ошибки, требующие внимания                                                               |
| 2        | Critical | Критические действия (выход из аккаунта)                                                 |
| -1       | Disable  | Логи выключены                                                                           |

**Ключевой принцип**: trace-логи (карта вызовов) имеют severity 6 (Info). Payload (сырые данные) автоматически отсекается при уровне != Debug:

- **Сервер** (`lib/logger.lib.ts`): функция `shouldIncludePayload` — payload в ctx.account.log, Heap, WebSocket и webhook только при Debug.
- **Браузер** (`shared/logger.ts`): `emitLog` фильтрует non-string args при уровне != Debug.

## Интеграции

- Внешние сервисы: Lava.Top (`https://gate.lava.top`). База URL настраивается через `lava_base_url`.
- Внутренние SDK: `@app/request` (исходящие HTTP-вызовы), `@app/sync` (runWithExclusiveLock), стандартные модули Chatium.

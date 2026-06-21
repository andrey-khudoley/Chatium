# Architecture

## Назначение

LifePay payments-gateway: серверный шлюз, реализующий публичный контур `bills_v1` (`/v1/createBill`, `/v1/getBillStatus`, `/v1/cancelBill`, `/v1/operations`) с маршрутизацией к LifePay через `@app/request`. На `/` — панель оператора с журналами входящих/исходящих запросов и внутренней системой доступов. Каркас унаследован от `template_project`. SSOT норматива — `docs/gateway/operation-manual.md`.

## Ограничения платформы

- Серверная инфраструктура предоставляется Chatium.
- Нельзя менять стек и зависимости.
- Деплой — автоматически при пуше.

## Основные сценарии

- Внешний клиент вызывает `/v1/{op}` контура `bills_v1` (создание/статус/отмена счёта).
- Оператор открывает панель `/` (Admin или активный грант) — журналы и дашборд.
- Авторизация и профиль; админка (только роль Admin); страница тестов.

## Роутинг

- `index.tsx` — панель оператора (`pages/HomePage.vue`; `requireRealUser` + `requireInternalAccess`). Аноним → `/s/auth/signin`; без доступа → `/web/forbidden`. Передаёт `isAdmin`, `initialDateFilter`, расширенные `apiUrls`.
- `web/admin/index.tsx` — админка, `requireAccountRole('Admin')`.
- `web/profile/index.tsx` — профиль, `requireRealUser()`.
- `web/tests/index.tsx` — страница тестов, `requireRealUser()` + `requireAccountRole('Admin')`. Без роли Admin → `/web/forbidden`.
- `web/login/index.tsx` — вход (редирект на системный `/s/auth/signin`).
- `web/forbidden/index.tsx` — страница 403 (отсутствие доступа к панели).
- `web/access/invite/index.tsx` — страница приёма инвайта (`requireRealUser`; рендерит `InviteAcceptPage.vue`).
- `api/v1/createBill.ts`, `api/v1/getBillStatus.ts`, `api/v1/cancelBill.ts` — публичные gateway-эндпоинты контура `bills_v1` LifePay. Авторизация: заголовки `X-Lp-Apikey`/`X-Lp-Login` (manual §2.2, §2.5). Общая цепочка через `handleV1Op`.
- `api/v1/operations.ts` — каталог операций (`GET /v1/operations`, manual §3.3). Без заголовков `X-Lp-*`. Источник — `lib/gateway/operationsCatalog.ts`.

## Gateway-слой (`lib/gateway/`, `shared/gatewayHttpHeaders.ts`)

Общий код для публичных эндпоинтов `/v1/*` payments-gateway. SSOT — `olga-getcourse-payments-c7d5a1/docs/gateway/operation-manual.md`.

- `lib/gateway/constants.ts` — жёсткие константы платформы: `GW_OUTBOUND_TIMEOUT_MS = 10_000` (§8.1, §12.2), `GW_MAX_REQUEST_BODY_BYTES = 1_048_576` (§8.7, §12.3), `LP_BILLS_V1_BASE_URL`.
- `lib/gateway/requestId.ts` — UUID v4 канонического вида (§2.3) для корреляции лог-записей и заголовка `X-Gateway-Request-Id`.
- `lib/gateway/gatewayErrors.ts` — каталог `INVOKE_*` с HTTP-статусами и каноническими текстами `error.message` строго по таблице §10 manual.
- `lib/gateway/gatewayResponse.ts` — сборка ответа платформы `TuneHttpHeadersResponse` (§9.0): `{ statusCode, rawHttpBody: JSON.stringify({ ok, data | error, requestId }), headers: { 'Content-Type', 'X-Gateway-Request-Id' } }`.
- `lib/gateway/lpCredentials.ts` — чтение и валидация заголовков `X-Lp-Apikey`/`X-Lp-Login` (нечувствительно к регистру, §2.5: 11 цифр, первая `7`); утилита `maskLpLogin('79161234567') → '+7916***4567'` для безопасных логов.
- `lib/gateway/lifePayClient.ts` — обёртка над `@app/request` для исходящих вызовов к LifePay. Дискриминированное объединение `LpClientResult`: `json_ok`, `upstream_status`, `upstream_parse_error`, `network_error`, `timeout` (§2.8.1). Один входящий запрос → ровно один исходящий, серверные ретраи запрещены (§8.6, §12.4).
- `lib/gateway/buildCreateBillBody.ts` — сборка тела `POST /v1/bill` LifePay: `apikey`/`login` из заголовков (§4.5), `method: "sbp"`, `order: { number }`, поля `args`.
- `lib/gateway/billsV1Semantic.ts` — классификация ответов LifePay по реальному контракту (apidoc.life-pay.ru/bill/index) и извлечение успешных payload'ов. Тип `BillsV1SemanticRule` содержит ровно четыре канонических значения: `bills_v1_status_error`, `bills_v1_code_error`, `bills_v1_missing_payment_url`, `bills_v1_error_string`. Основной признак ошибки — `code !== 0` в корне → `bills_v1_code_error` с `lpNumericCode`. Для `createBill` дополнительно проверяется наличие `paymentUrl` (B3). Для `getBillStatus` `data` имеет форму словаря `{ [billNumber]: { status: number, msg: string } }`; gateway вытаскивает первую запись и маппит числовой `status` (0/10/15/20/30) в имя справочника (`initiated`/`success`/`pending`/`failed`/`cancelled`) через `billStatusName`. Для `cancelBill` LifePay возвращает пустой `data: {}`; `extractCancelBillSuccess` отдаёт синтетический `{ status: 'cancelled' }`. `extractCreateBillSuccess` извлекает `{ billNumber, paymentUrl, paymentUrlWeb }` (приводя числовой `number` LifePay к строке).
- `lib/gateway/operationsCatalog.ts` — машиночитаемый каталог `op` (SSOT): для каждого записи поля `op`, `httpMethod`, `contour`, `availability`, рантайм-`argsValidator` (`s.object()` из `@app/schema`) и wire-`argsSchema` (plain JSON `{ fields[] }`). `toOperationSummaries()` — преобразование в wire-форму для клиента и `GET /v1/operations`. `validateCreateBillAmountPositive` — дополнительная проверка `amount > 0` сверх типа `s.number()`.
- `lib/gateway/handleV1Op.ts` — общая цепочка обработки `/v1/{op}` (§2.6, §2.8.1, §2.11): requestId → `availability` → заголовки → body/query → валидация args через каталог → вызов прикладного `handler` → классификация транспорта LifePay → ответ. Прикладной handler в файле роута содержит только семантику конкретного `op` (сборка тела/query, разбор `lpJson`). Для `availability = 'beta'` в ответ добавляется `warnings: [GATEWAY_OP_BETA_UNSTABLE]`.
- `shared/gatewayHttpHeaders.ts` (`// @shared`) — имена заголовков `X-Lp-Apikey`, `X-Lp-Login`, `X-Gateway-Request-Id`. Только строки имён, без значений секретов.
- `shared/operationsCatalogShared.ts` (`// @shared`) — типы wire-формы каталога (`OperationSummary`, `ArgsFieldSchema`, `ArgsSchemaJson`) для передачи на клиент через SSR-пропсы или `GET /v1/operations`.

Запрет логирования секретов (§5.7): полные значения `apikey` / `login` / `lp_test_*` в `writeServerLog` не попадают. Допустимо: длина `apikey`, маскированный `login`, имя `op`, `requestId`, коды ошибок.

## Компонент «Создать запрос» (RequestTestTab)

`components/RequestTestTab.vue` — форма имитации внешнего вызова `/api/v1/{op}`. Используется в двух контекстах:

| Контекст         | Страница                                 | Доступ                                    | Источник testValues                                                              |
| ---------------- | ---------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| Панель оператора | `HomePage.vue`, вкладка «Создать запрос» | `requireInternalAccess` (Admin или грант) | SSR-проп `testValues` из `index.tsx` (Heap через `settingsLib.getSettingString`) |
| Страница тестов  | `TestsPage.vue`, вкладка «Тест запроса»  | Admin-only                                | fallback: `getSettingRoute.run(ctx)` при нажатии «Использовать тестовые»         |

Проп `testValues: LpTestValues | undefined` — опциональный (`shared/gatewaySettingKeys.ts`). `useTestCredentials` внутри компонента берёт значения из пропа (если задан) или запрашивает через `getSettingRoute`.

Сценарий формы:

1. Дропдаун выбора `op` из каталога. Для `availability !== 'enabled'` — предупреждение, кнопка «Отправить» заблокирована.
2. Поля `X-Lp-Apikey` (type=password, кнопка показать/скрыть), `X-Lp-Login`; кнопка «Подставить» тестовые значения (`lp_test_apikey`/`lp_test_login`). Без заголовков `X-Lp-*` работает только `GET /v1/operations`.
3. Динамическая форма `args` из `argsSchema.fields`: обязательные (`*`), опциональные; тип `number` приводится при отправке. Кнопка «Подставить» email вставляет `tester@khudoley.pro`; кнопка «Очистить» сбрасывает форму.
4. Клиентская валидация на лету: непустые обязательные поля, `X-Lp-Login` по `^7[0-9]{10}$`, тип `number` валиден.
5. Отправка — реальный `fetch` с фронта на `/{projectRoot}/api/v1/{op}`.
6. Четыре снапшот-блока: заголовки запроса, тело запроса, ответ LifePay (upstream), ответ гейтвея.

**Тестовые ключи в SSR-HTML:** `lp_test_apikey`/`lp_test_login` попадают в HTML панели. Осознанное допущение — страница защищена `requireInternalAccess`, ключи тестовые. Новых API-роутов нет.

## Вёрстка админки и страницы тестов

- Корень Vue (`.app-layout` в `AdminPage.vue` / `TestsPage.vue`) ограничен высотой окна (`100vh` / `100dvh`) с `overflow: hidden`; после `boot-complete` у `body` нет вертикального скролла. Ширина: `.app-layout`, `<main class="ap-wrap|tp-wrap">` и блок `.ap` / `.tp` — на всю доступную ширину (`width: 100%`, у обёрток при необходимости `min-width: 0` для flex); контент по-прежнему ограничен `max-width: 1440px` у `.ap`/`.tp`. `<main>` — flex-колонка с `overflow: hidden` (сам не скроллится). Ниже — `.ap` / `.tp` (flex, `min-height: 0`), статус/тулбар `flex-shrink: 0`, сетка `.ap-grid` / `.tp-grid` с `grid-template-rows: minmax(0, 1fr)` и `flex: 1`; в двухколоночном режиме первая колонка — `minmax(240px, 1fr)` (не `minmax(0, 1fr)`), чтобы левая область не сжималась чрезмерно. Вертикальный скролл только у левой колонки `.ap-main` / `.tp-main` (`overflow-y: auto`, класс `content-wrapper` для стилей скроллбара). Правая колонка логов тянется по высоте ячейки сетки; список строк — `.ap-log-out` / `.tp-log-out` с внутренним `overflow-y`. На узкой вёрстке снова скроллится весь `<main>`.

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
- `pages/` — Vue‑страницы: **`HomePage.vue`** (панель оператора; вкладки Обзор/Входящие/К LifePay/Доступы/**Создать запрос**; KPI, raw-модалки, LIVE, toolbar фильтра по дате; вкладка «Доступы» — Admin: grants, invites, создание/отзыв), `InviteAcceptPage.vue` (приём инвайта).
- `components/` — переиспользуемые Vue‑компоненты (Header, AppFooter, GlobalGlitch, LogoutModal, **`RequestTestTab.vue`** — форма имитации вызова `/api/v1/{op}`; используется в `HomePage.vue` (панель) и `TestsPage.vue` (Admin)).
- `api/` — API‑эндпоинты. File-based: один файл — один эндпоинт с `/`. Включает: `api/v1/` (gateway), `api/admin/raw/` и `api/admin/dashboard/` (доступ `guardInternalApi`), **`api/admin/analytics/filter-save.ts`** (фильтр по дате), **`api/access/`** (управление доступами к панели).
- `tables/` — Heap‑таблицы (схемы: settings, logs, gatewayRequestLog, gatewayUpstreamLog, **panelAccess**, **panelInvites**).
- `repos/` — репозитории (settings, logs, gatewayRequestLog с `findRecentFiltered`, gatewayUpstreamLog с `findRecentFiltered`, **panelAccess**, **panelInvites**).
- `lib/` — бизнес‑логика: settings.lib (включая `getPanelDateFilter`), logger.lib, `lib/gateway/` (gateway-слой), **`lib/access/`** (система доступов: constants, requireInternalAccess, apiGuard, invites).
- `shared/` — общий код (preloader, logLevel, logger syslog RFC 5424, browserRemoteLogger, redactRaw, **`accessPages.tsx`** — JSX-страницы сообщений доступа).
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

## Система доступов к панели (`lib/access/`)

Доступ к главной `/`, `/web/tests` и API панели защищён двухуровневой схемой: **Admin** (роль аккаунта) или **активный грант** (запись в `panelAccess`).

- `decideInternalAccess` — проверяет роль Admin или наличие записи в `panelAccess` для `ctx.userId`.
- `requireInternalAccess` — вызывается в `index.tsx` и `web/tests/index.tsx`; при отказе — редирект на `/web/forbidden`.
- `guardInternalApi` — аналог для API-эндпоинтов (возвращает 403 вместо редиректа). Применяется к `api/admin/dashboard/gatewayCounts`, `api/admin/raw/*`, `api/admin/analytics/filter-save`.
- Инвайты: Admin генерирует токен (TTL 7 дней), пользователь принимает через `/web/access/invite` → `consumeInvite` (под `runWithExclusiveLock`). Отзыв — только Admin.

## Фильтр по дате (`panel_date_filter`)

Глобальный фильтр хранится в Heap-настройке `panel_date_filter` (`{ from?, to? }`, Unix ms). Управляется через `api/admin/analytics/filter-save.ts` (`guardInternalApi`). Репозитории `gatewayRequestLog.repo.ts` и `gatewayUpstreamLog.repo.ts` имеют метод `findRecentFiltered(ctx, limit, dateFrom?, dateTo?)`, применяющий `where: { requestedAt/$sentAt: { $gte, $lte } }` — без границ переходит на `findRecent`. Эндпоинты `recent.ts` принимают query `dateFrom`/`dateTo`. SSR-проп `initialDateFilter` передаётся из `index.tsx` в `HomePage.vue`.

## Интеграции

- Внешние сервисы: нет.
- Внутренние SDK: стандартные модули Chatium.

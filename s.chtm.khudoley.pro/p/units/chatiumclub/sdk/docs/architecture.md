# Architecture

## Назначение

Приложение **`p/units/chatiumclub/sdk`** — каркас **тонкого клиента** Chatium+GetCourse (`op` + `args` к gateway). Спецификация слоя SDK — в материалах курса; код пока наследует возможности `template_project`.

## Ограничения платформы

- Серверная инфраструктура предоставляется Chatium.
- Нельзя менять стек и зависимости.
- Деплой — автоматически при пуше.

## Основные сценарии

- Открыть главную страницу.
- Авторизоваться и попасть в профиль.
- Открыть админку (только роль Admin): в том числе карточка **«Подключение к gateway»** — ввод и сохранение в Heap трёх обязательных параметров тонкого клиента (`gateway_url`, `gc_school_host`, `gc_school_api_key` через `shared/sdkSettingKeys.ts` и API `api/settings/get` + `api/settings/save`).

## Роутинг

- `index.tsx` — главная (SSR + Vue), единственный роут в корне.
- `web/admin/index.tsx` — админка, `requireAccountRole('Admin')`.
- `web/profile/index.tsx` — профиль, `requireRealUser()`.
- `web/tests/index.tsx` — страница тестов, `requireRealUser()`.
- `web/login/index.tsx` — вход (редирект на системный `/s/auth/signin`).

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
- `web/` — браузерные роуты модулей (admin, profile, tests, login).
- `pages/` — Vue‑страницы (минимальные).
- `components/` — переиспользуемые Vue‑компоненты (Header, AppFooter, GlobalGlitch, LogoutModal).
- `api/` — API‑эндпоинты (получение и валидация входных данных). File-based: один файл — один эндпоинт с `/`. Пример: `api/settings/list.ts`, `api/logger/log.ts`, `api/admin/logs/recent.ts`, `api/tests/list.ts`, `api/tests/unit/index.ts`, `api/tests/integration/index.ts`, `api/gateway/invoke.ts`, `api/gateway/operations.ts`.
- `tables/` — Heap‑таблицы (схемы: settings, logs).
- `repos/` — репозитории (работа с БД: settings, logs; logs.repo включает findBeforeTimestamp для пагинации).
- `lib/` — бизнес‑логика (settings.lib, logger.lib: проверка уровня, запись в ctx/Heap/WebSocket/вебхук; `lib/gateway/` — тонкая прокладка к gateway).
- `shared/` — общий код (preloader, logLevel для передачи уровня логирования на клиент, logger — уровни syslog RFC 5424, createComponentLogger, setLogSink/LogEntry для дашборда, logEmergency…logDebug в браузере с проверкой порога, browserRemoteLogger — пакетная отправка браузерных логов на сервер через POST /api/logger/browser; `sdkSettingKeys.ts`, `gatewayHttpHeaders.ts`, `v1OpsList.generated.ts` — константы и снимок каталога gateway).
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

## Gateway-клиент

SDK вызывает gateway-приложение `p/saas/gw/gc` **по обычному HTTP** через `@app/request` (manual §12.1: тонкий клиент и gateway — разные приложения на разных серверах, межприложенческие вызовы не используются). Логика вынесена в `lib/gateway/`:

- `lib/gateway/constants.ts` — `SDK_GATEWAY_API_V1_PREFIX = '/api/v1'`, `SDK_GATEWAY_OPERATIONS_PATH = '/api/v1/operations'`, `SDK_GATEWAY_REQUEST_TIMEOUT_MS = 15_000` (с запасом над gateway-таймаутом 10 с — manual §8.1).
- `lib/gateway/gatewayClient.ts`:
  - `invoke(ctx, { op, args, httpMethod? })` — основной вызов: читает три gateway-настройки из Heap, выбирает HTTP-метод по локальному снимку каталога (`shared/v1OpsList.generated.ts`) или из аргумента, формирует `${gatewayUrl}/api/v1/${op}` с query (для GET) или JSON-телом (для POST), добавляет заголовки `X-Gc-School-Host` и `X-Gc-School-Api-Key`, отправляет один HTTP-запрос (без ретраев — manual §8.6), парсит ответ и возвращает `{ ok, data | error, requestId, warnings, gatewayHttpStatus }`.
  - `getOperationsCatalog(ctx)` — `GET /api/v1/operations` (без заголовков школы — manual §3.3); возвращает `{ ok, catalog | error, requestId, gatewayHttpStatus }`.
  - SDK-коды ошибок: `SDK_NOT_CONFIGURED`, `SDK_OP_HTTP_METHOD_UNKNOWN`, `SDK_GATEWAY_NETWORK_ERROR`, `SDK_GATEWAY_INVALID_RESPONSE`. Коды gateway (`INVOKE_*`, `GATEWAY_*` из manual §10) пробрасываются как есть.
  - Логи без секретов (manual §5.7): фиксируются только `op`, `httpMethod`, длина школьного ключа, `gatewayHttpStatus`, `requestId`, код ошибки и имя этапа (`logStage`).

Серверный фасад над тем же поведением — `api/gateway/invoke.ts` и `api/gateway/operations.ts` (Admin); см. `docs/api.md`, раздел «Gateway».

## Настройки тонкого клиента (Heap)

Три ключа лежат в той же key-value таблице настроек (`tables/settings.table.ts`); валидация — в `lib/settings.lib.ts#setSetting`:

| Ключ                | Назначение                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway_url`       | Базовый URL gateway-приложения, например `https://s.chtm.khudoley.pro/p/saas/gw/gc`. Обязан начинаться с `http://` или `https://`; хвостовой `/` обрезается при сохранении. |
| `gc_school_host`    | Хост школы GetCourse без схемы (`myschool.getcourse.ru` или `customdomain.ru`). Подставляется в заголовок `X-Gc-School-Host` (manual §2.5).                                 |
| `gc_school_api_key` | API-ключ конкретной школы GetCourse (секрет). Подставляется в заголовок `X-Gc-School-Api-Key` (manual §5.6). gateway этот ключ в Heap не хранит — ответственность на SDK.   |

Имена ключей экспортируются для UI из `shared/sdkSettingKeys.ts` (с пометкой `// @shared`); сами значения секретов в shared-бандл не попадают.

## Интеграции

- **Gateway GetCourse:** SDK обращается к gateway-приложению `p/saas/gw/gc` по обычному HTTP. Подробности — раздел «Gateway-клиент» выше; контракт ошибок и тел — `docs/api.md` и manual gateway (`p/saas/gw/gc/docs/gateway/gateway-operation-manual.md`).
- Внутренние SDK: стандартные модули Chatium (`@app/request`, `@app/heap`, `@app/auth`, `@app/socket`).

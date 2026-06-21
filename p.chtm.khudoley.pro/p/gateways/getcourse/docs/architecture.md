# Architecture

## Назначение

Приложение **`p/gateways/getcourse`** — экземпляр **GetCourse Gateway** на каркасе, изначально скопированном из `template_project` (страницы, админка, Heap settings/logs, тестовая страница). **Источник правды по коду** — дерево **`p/gateways/getcourse`** (в т.ч. `lib/logger.lib`, `web/admin`); каталог **`p/template_project`** — только происхождение каркаса при bootstrap, не место текущих правок. Целевая доменная логика — публичное API **`/v1/{op}`** и связка с GetCourse по нормативу в **`docs/gateway/`** (SSOT: `docs/gateway/gateway-operation-manual.md`, реестр `op`, OpenAPI и маппинг в том же каталоге). **План реализации (Прототип → MVP → Прод):** `docs/gateway/implementation-plan.md`.

## Ограничения платформы

- Серверная инфраструктура предоставляется Chatium.
- Нельзя менять стек и зависимости.
- Деплой — автоматически при пуше.

## Основные сценарии

- Открыть главную страницу.
- Авторизоваться и попасть в профиль.
- Открыть админку (только роль Admin).

## Роутинг

- `index.tsx` — панель (`HomePage.vue`; `requireRealUser` + `requireInternalAccess`). Аноним → `/s/auth/signin`; без доступа → `/web/forbidden`. Передаёт `isAdmin`, `initialDateFilter`, расширенные `apiUrls`.
- `web/admin/index.tsx` — админка, `requireAccountRole('Admin')`.
- `web/profile/index.tsx` — профиль, `requireRealUser()`.
- `web/tests/index.tsx` — страница тестов, `requireRealUser()` + `requireAccountRole('Admin')`. Без роли Admin → `/web/forbidden`.
- `web/login/index.tsx` — вход (редирект на системный `/s/auth/signin`).
- `web/forbidden/index.tsx` — страница 403 (отсутствие доступа к панели).
- `web/access/invite/index.tsx` — страница приёма инвайта (`requireRealUser`; рендерит `InviteAcceptPage.vue`).

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
- `pages/` — Vue‑страницы: **`HomePage.vue`** (главная панель; вкладки Обзор/Входящие/К GetCourse/Доступы/**Создать запрос**; KPI, таблица завершённых `/v1/{op}`, фильтр по дате, raw-модалка), `InviteAcceptPage.vue` (приём инвайта).
- `components/` — переиспользуемые Vue‑компоненты (Header, AppFooter, GlobalGlitch, LogoutModal, **`RequestTestTab.vue`** — форма имитации внешнего вызова `/api/v1/{op}`; новый компонент).
- `api/` — API‑эндпоинты. File-based: один файл — один эндпоинт с `/`. Включает: **`api/v1/*.ts`** (публичный gateway без сессии Chatium), **`api/admin/raw/`** (raw-журналы запросов/upstream, `guardInternalApi`), **`api/admin/analytics/`** (filter-save, `guardInternalApi`), **`api/admin/dashboard/gatewayCounts.ts`** (KPI за 24ч), **`api/access/`** (управление доступами к панели: generate-invite, consume-invite, revoke-invite, revoke-grant, invites, grants).
- `tables/` — Heap‑таблицы (схемы: settings, logs, **panelAccess**, **panelInvites**, **gatewayRequestLog**, **gatewayUpstreamLog**).
- `repos/` — репозитории (работа с БД: settings, logs, **panelAccess**, **panelInvites**, **gatewayRequestLog**, **gatewayUpstreamLog**).
- `lib/` — бизнес‑логика: settings.lib (включая `getPanelDateFilter`), logger.lib, **`lib/logLevel.ts`** (SSR-хелперы уровня логов; серверный код, перенесён из `shared/`), **`lib/preloader.ts`** (SSR-хелперы прелоадера; перенесён из `shared/`), **`lib/access/`** (система доступов: constants, requireInternalAccess, apiGuard, invites). Подкаталог **`lib/gateway/`** — общий слой публичного `/v1/*`.
- `shared/` — только действительно общий (клиент+сервер) код: logger syslog RFC 5424, browserRemoteLogger, **`accessPages.tsx`** — JSX-страницы сообщений доступа, **`redactRaw.ts`** — PII-маскирование для raw-журналов, **`operationsCatalogShared.ts`** — wire-типы каталога для UI, **`gatewaySettingKeys.ts`**, **`gcSchoolHostValidation.ts`**, **`testCatalog.ts`**.
- `docs/` — документация проекта; **`docs/gateway/`** — спецификация gateway (manual, JSON, скрипты).

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

Для ошибок, которые нужно одновременно зафиксировать в серверном логе и пробросить вызывающему коду как `throw new Error(…)` (например, валидация в `lib/settings.lib.ts`), используется **`throwLoggedServerError`** в `lib/logger.lib.ts`: сначала `writeServerLog` с настраиваемым severity (по умолчанию 3), затем исключение с тем же текстом.

**Ключевой принцип**: trace-логи (карта вызовов) имеют severity 6 (Info). Payload (сырые данные) автоматически отсекается при уровне != Debug:

- **Сервер** (`lib/logger.lib.ts`): функция `shouldIncludePayload` — payload в ctx.account.log, Heap, WebSocket и webhook только при Debug.
- **Браузер** (`shared/logger.ts`): `emitLog` фильтрует non-string args при уровне != Debug.

**Наблюдаемость `/v1/{op}`:** общий обработчик `lib/gateway/handleV1Op.ts` в блоке `finally` пишет две Heap-записи: `gatewayRequestLog` (входящий — всегда) и `gatewayUpstreamLog` (исходящий вызов GC — если дошло до отправки). Перед записью данные маскируются через `shared/redactRaw.ts` (`redactRawDeep`; лимит 64 KiB). Аналитика — через admin-эндпоинты `api/admin/raw/{requests,upstream}/{recent,get}` и `api/admin/dashboard/gatewayCounts` (KPI за 24ч через `countBy`); подсчёт и фильтрация — через Heap `where`/`countBy` без in-memory. Событий workspace (`@start/sdk`) больше нет; `api/gateway-analytics/` удалён.

## Интеграционный сьюит `/v1/{op}` (gateway-testing-strategy.md)

Сьюит реализует норматив `docs/gateway/gateway-testing-strategy.md`: один прогон на каждый из 59 публичных роутов `api/v1/*`, фазовый порядок 1–4, минимизация Heap-входа, цепочки producer→consumer→destructor, throttle 1 rps.

| Слой                   | Файл                                                                                                                                               | Ответственность                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Контекст сессии        | `lib/tests/gateway/v1OpsRunContext.ts`                                                                                                             | Типы `V1OpsRunContext` (dealId, userId, groupId, webinarId, ...), реестр `gc_itest_*` Heap-ключей (manual §5.8), email тестового пользователя `tester@khudoley.pro`.                                                                                                                                                                                                                                                                              |
| Сценарии               | `lib/tests/gateway/v1OpsScenarios.ts`                                                                                                              | Реестр на каждый из 59 op: фаза, `dependsOn`, требуемые Heap-ключи, `build(args)` или `skip` с человеческим объяснением, `capture(parsed)` для наполнения контекста.                                                                                                                                                                                                                                                                              |
| Раннер                 | `lib/tests/gateway/v1OpsSuiteRunner.ts`                                                                                                            | `runAllV1Ops` и `runSingleV1Op(opId)`: чтение Heap (хост/ключ школы + `gc_itest_*`), throttle 1 rps между сетевыми вызовами (ожидание по `Date.now()` без `setTimeout`: изолята нет глобального таймера; `@app/jobs` не подходит для паузы внутри одного запроса), проверка зависимостей, перенос результата в `runCtx`. Использует **`handleV1OpRouteWithGcDiagnostic`** (сырое тело ответа школы в `gcUpstream`), парсит `rawHttpBody` gateway. |
| Эндпоинт               | `api/tests/v1-ops/run.ts`                                                                                                                          | `POST /api/tests/v1-ops/run` (Admin), `body: { mode: 'all' \| 'single', opId? }`. Возвращает `V1OpsRunSummary` со списком результатов и сводкой.                                                                                                                                                                                                                                                                                                  |
| UI                     | `pages/TestsPage.vue`, секция «Gateway /v1/{op}» на вкладке HTTP                                                                                   | Метрики прогона, кнопка «Запустить сьюит», по строке на каждый op (бейдж availability, контур, метод), индивидуальная кнопка «Run», HTTP-статус, длительность, `requestId`, фаза, причина skip, раскрывающийся блок с распарсенным ответом и отправленными `args`.                                                                                                                                                                                |
| Список op для UI       | `shared/operationsCatalogShared.ts` (// @shared)                                                                                                   | Wire-тип `OperationSummary`; список `operationsList: OperationSummary[]` формируется в `web/tests/index.tsx` через `toOperationSummaries()` и передаётся как SSR-проп в `TestsPage.vue`. Нет generated-файлов.                                                                                                                                                                                                                                    |
| Каталог тестов         | `api/tests/list.ts`                                                                                                                                | Категория `gateway-v1` со списком 59 пунктов.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Префлайт               | `lib/tests/gateway/v1OpsPreflight.ts`                                                                                                              | Статичный анализ готовности сьюита без сетевых вызовов: вычисляет для каждого op `runStatus ∈ {ready, blocked-availability, warn-heap, warn-deps}`, состояние «уровня A» (manual §5.8) и список заполненных `gc_itest_*` (только имена). Транзитивно учитывает порядок фаз (стратегия §3.1).                                                                                                                                                      |
| Эндпоинт префлайта     | `api/tests/v1-ops/preflight.ts`                                                                                                                    | `GET /api/tests/v1-ops/preflight` (Admin). Используется UI при монтировании страницы `/web/tests` и после каждого прогона.                                                                                                                                                                                                                                                                                                                        |
| Произвольные настройки | `lib/settings.lib.ts` (`deleteSetting`, `listArbitrarySettings`, `KNOWN_SETTING_KEYS`), `api/settings/delete.ts`, `api/settings/list-arbitrary.ts` | Поддержка manual §5.9: универсальный ввод «ключ — значение» в Heap для `gc_itest_*` (§5.8 уровень B) и других пользовательских ключей. Секреты в этот список не включаются.                                                                                                                                                                                                                                                                       |
| UI настроек §5.9       | `pages/AdminPage.vue`, секция «Произвольные настройки Heap»                                                                                        | Форма «Ключ — Значение» с валидацией (непустой ключ, без управляющих символов), список существующих произвольных ключей с кнопками «Изменить» и «Удалить».                                                                                                                                                                                                                                                                                        |

Артефакты, оставленные тестами в школе (комментарии, заметки), помечаются префиксом `[gateway-itest]` (стратегия §5). Деструктор фазы 4 — `updateDealFields` со `status: "false"` для тестовой сделки.

### Визуальные состояния строк сценариев (стратегия §9.1, §9.3)

UI блока «Gateway /v1/{op}» использует `runStatus` из префлайта:

- `ready` — обычный фон, активная кнопка `Run`;
- `blocked-availability` — нейтральный серый фон (`rgba(70,70,78,0.28)`), кнопка `Run` отключена с иконкой `fa-ban`, в строке — текст «availability=…, запуск запрещён» (§9.1);
- `warn-heap` — приглушённый янтарный фон (`rgba(201,166,96,0.12)`) с боковой полосой `rgba(201,166,96,0.7)`, кнопка `Run` отключена, в строке — список недостающих `gc_itest_*` и ссылка «Задать в админке» (§9.3, §9.4);
- `warn-deps` — тот же янтарный фон, в строке — перечень предшественников, которых ждёт сценарий.

Сверху над списком — панель «Готовность к прогону»: статус трёх ключей уровня A (включая «✓»/«—»), counts по `runStatus`, ссылка на админку (§5.9).

**Ограничение UGC в шаблоне:** в выражениях `v-if` / `{{ }}` секции `/v1/{op}` не использовать optional chaining (`?.`) и не начинать `{{` с `{ … }` (объектный литерал) — иначе при синхронизации/рендере возможен пустой `ReferenceError:` в логе UGC. Доступ к полям после `fetch` — через явные проверки `row.result && row.result.field`; маппинг подписей — функции в `<script setup>`.

## Вкладка «Создать запрос» (HomePage)

Вкладка с id `request-builder` в `HomePage.vue`; реализована компонентом **`components/RequestTestTab.vue`** (Composition API). Видна при `requireInternalAccess` и непустом каталоге операций (`operationsCatalog` из `lib/gateway/operationsCatalog.ts`).

Сценарий:

1. Дропдаун выбора операции из `toOperationSummaries()`.
2. Секция «Заголовки» — поля `X-Gc-School-Host` и `X-Gc-School-Api-Key` (type=password, кнопка показать/скрыть). Кнопка «Подставить» тестовые значения берёт данные из SSR-пропа `testValues` (`GcTestValues`), который `index.tsx` читает из Heap через `settingsLib.getSettingString` (`gc_test_school_host`, `gc_test_school_api_key`). Новых API-роутов нет.
3. Секция «Тело запроса/Параметры» — форма строится **рекурсивно по дереву `argsTree`** (а не по плоскому `argsSchema.fields`): объекты с известными ключами разворачиваются в группы-заголовки с отступом по глубине, а каждый скаляр получает своё поле ввода (тот же UX, что у `lavatop`). Значения хранятся по точечному пути (`params.user.email`). Типы: `boolean` — селект true/false; `array`/`object`/`any` — JSON-поле (textarea); `string`/`number` — input. Обязательность поля учитывает всю цепочку предков (`ancestorsRequired`): required-лист внутри опционального объекта не помечается обязательным и не блокирует отправку. При сборке тела (`buildArgsObject` → `setByPath`) обязательные объекты-группы гарантированно присутствуют даже пустыми (`ensurePath`), чтобы пройти серверный валидатор. Режима единой «сырой» textarea (`usesRawBody`) больше нет. Кнопка «Подставить» email подставляет `tester@khudoley.pro`; кнопка «Очистить» сбрасывает форму.
4. Реальный `fetch` на `/{projectRoot}/api/v1/{op}`. Заголовок `gc_developer_api_key` намеренно отсутствует на клиенте — гейтвей добавляет его на сервере из Heap.
5. Четыре снапшот-блока: заголовки запроса, тело запроса, ответ GetCourse (upstream), ответ гейтвея.

**Тестовые ключи в HTML:** значения `gc_test_school_host` и `gc_test_school_api_key` попадают в SSR-страницу. Осознанное допущение — страница защищена `requireInternalAccess`, ключи тестовые. `gc_developer_api_key` в SSR не передаётся.

## Система доступов к панели (`lib/access/`)

Доступ к главной `/`, `/web/tests` и API панели защищён двухуровневой схемой: **Admin** (роль аккаунта) или **активный грант** (запись в `panelAccess`).

- `decideInternalAccess` — проверяет роль Admin или наличие записи в `panelAccess` для `ctx.userId`.
- `requireInternalAccess` — вызывается в `index.tsx` и `web/tests/index.tsx`; при отказе — редирект на `/web/forbidden`.
- `guardInternalApi` — аналог для API-эндпоинтов; возвращает ошибку 403 вместо редиректа.
- Инвайты: Admin генерирует токен (`generateInvite`, TTL 7 дней), пользователь принимает его через `/web/access/invite` → `consumeInvite` (под `runWithExclusiveLock` во избежание гонок). Отзыв инвайта / гранта — только Admin.

## Фильтр по дате (`panel_date_filter`)

Глобальный фильтр по дате/времени хранится в Heap-настройке `panel_date_filter` как объект `{ from?, to? }` (Unix ms). Управляется через `api/admin/analytics/filter-save.ts` (`guardInternalApi`). SSR-проп `initialDateFilter` передаётся из `index.tsx` в `HomePage.vue`; панель использует его для `apiUrls.filterSave`.

## Интеграции

- Внешние сервисы: нет.
- Внутренние SDK: стандартные модули Chatium.

# Spec-as-source: `p/units/neso/meta/core`

Статус: источник истины для проекта.  
Последнее обновление: 2026-06-19.
Область действия: весь каталог `p/units/neso/meta/core`.

Этот файл описывает требуемое состояние проекта целиком: продуктовую роль модуля, маршруты, страницы, API, данные, логи, тесты, UI-поведение, права доступа и правила эволюции. Если код, README, ADR или старые документы расходятся с этой спецификацией, приоритет у этого файла. Контракты и ошибки встроены сюда, потому что текущий объем не требует отдельных файлов.

Спецификация намеренно покрывает проект с избытком: кроме публичного поведения она фиксирует внутренние helper-ы, composable-слои, презентационные компоненты, тестовые раннеры и известные платформенные допущения. Это нужно, чтобы проект можно было поддерживать без обратного восстановления правил из кода.

## 0. Правило предварительной спецификации

Редактировать код проекта запрещено, если требуемое изменение еще не описано в этой спецификации.

Перед любым изменением runtime-кода, UI, API, данных, прав, тестов, маршрутов, логирования или структуры нужно сначала обновить этот файл так, чтобы новое поведение, контракт и критерии проверки были явно зафиксированы. Только после этого можно менять код.

Если во время реализации обнаружено, что нужен дополнительный кодовый шаг, не покрытый текущей спецификацией, работу с кодом нужно остановить, дописать спецификацию и только затем продолжить реализацию. Проверка или ревью должны считать кодовые изменения без предварительного описания в `docs/spec/spec.md` нарушением процесса, даже если сами изменения технически корректны.

## 1. Назначение

`p/units/neso/meta/core` - meta-модуль сервиса NESO, который хранит системные контракты, координирует взаимодействие модулей и выступает Heap-backed брокером событий.

Одна из продуктовых ролей core - работа в качестве центрального broker-а для event-driven модели будущего сервиса. Все прикладные модули сервиса должны обмениваться фактами через события: модуль-публикатор регистрирует, что произошло, core сохраняет событие в durable Heap-журнале, определяет подписчиков/получателей и дает модулям-потребителям единый способ узнать, что именно им нужно опросить и обработать.

Core не является внешним message broker-ом вроде Kafka/RabbitMQ. С учетом ограничений Chatium он реализует надежный polling-based broker поверх Heap:

- immutable event log для фактов, опубликованных модулями;
- registry модулей-участников;
- registry подписок потребителей;
- materialized delivery rows для каждого события и потребителя;
- poll/claim/ack/fail API для at-least-once доставки;
- best-effort notification layer, который сообщает подписчику о новых deliveries без необходимости постоянно опрашивать таблицу;
- idempotency, retry, dead-letter и audit состояния доставки;
- административную диагностику состояния broker-а.

Целевая гарантия broker-а - at-least-once delivery. Exactly-once не обещается: потребители обязаны быть идемпотентными по `eventId`, `deliveryId` или своему бизнес-ключу. Порядок доставки best-effort по `publishedAt asc` внутри одной подписки; глобальный строгий порядок между всеми модулями не гарантируется.

Уведомления подписчиков не являются источником истины и не заменяют delivery queue. Если internal/socket уведомление потеряно, доставка остается в `BrokerDeliveries` и может быть получена через internal `poll`. Если уведомление пришло несколько раз, потребитель обязан только выполнить server-side poll в core и обработать реальные deliveries.

Проект обязан предоставлять:

- публичную главную страницу;
- публичную страницу входа;
- страницу профиля для авторизованного пользователя;
- админку для роли `Admin`;
- страницу тестов для авторизованного пользователя;
- центральный registry BPM-модулей, которые могут публиковать и потреблять события;
- Heap-backed event log для событий сервиса;
- registry подписок модулей-потребителей;
- очередь доставок событий потребителям с poll/claim/ack/fail жизненным циклом;
- best-effort уведомления подписчиков о появлении новых deliveries через callback/WebSocket-канал, где это технически доступно;
- dead-letter и retry-контракты для событий, которые не удалось доставить;
- настройки проекта в Heap;
- серверное и браузерное логирование с уровнями;
- live-монитор логов через WebSocket для администратора;
- счетчики ошибок и предупреждений в админке;
- каталог и раннеры шаблонных юнит, серверных интеграционных и HTTP-проверок;
- документацию, достаточную для сопровождения проекта.

Проект не является самостоятельным Node/Vite-приложением. Он работает внутри Chatium, где `app`, `ctx`, file-based routing, Heap, auth, socket и серверная публикация предоставляются платформой.

## 2. Платформенные инварианты

- `app` и `ctx` являются глобальными объектами Chatium и не импортируются из локальных файлов.
- Новые внешние зависимости не добавляются. Используются платформенные модули и CDN-ассеты, уже применяемые в шаблоне.
- File-based routing: один файл route entrypoint = один route, предпочтительный путь внутри файла - `'/'`.
- Ссылки между маршрутами строятся через `config/routes.tsx`, route helpers или route `.url()`. Домен не хардкодится.
- Heap, repos и lib являются серверными слоями. Vue-компоненты не импортируют `tables/`, `repos/` или `lib/`; допустимы `shared/*` с `// @shared` и `api/*` route-модули с `// @shared-route`.
- Доступ к Heap идет через repos; бизнес-правила живут в `lib/`; HTTP-валидация и auth - в `api/` и SSR entrypoints.
- Логирование серверного кода идет через `ctx.log()` и `ctx.account.log()` внутри `lib/logger.lib.ts`; прикладной код использует `writeServerLog`.
- В Heap для подсчетов используется `countBy`, для фильтрации - `where`.
- `// @ts-ignore` допустим только для системных модулей Chatium без локальных типов.

## 3. Структура проекта

Обязательная структура:

| Путь                | Ответственность                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `index.tsx`         | SSR entrypoint главной страницы `/`.                                                                              |
| `web/*/index.tsx`   | SSR entrypoints страниц `/web/admin`, `/web/profile`, `/web/login`, `/web/tests`.                                 |
| `pages/*.vue`       | Компоненты страниц, получающие SSR props.                                                                         |
| `components/`       | Переиспользуемые UI-компоненты страниц.                                                                           |
| `api/`              | HTTP/API routes. Каждый файл экспортирует route-константу.                                                        |
| `functions/`        | Internal `app.function()` endpoints; не HTTP и не доступны browser/Vue напрямую.                                  |
| `tables/`           | Схемы Heap-таблиц.                                                                                                |
| `repos/`            | CRUD и запросы к Heap без бизнес-логики.                                                                          |
| `lib/`              | Бизнес-логика, валидация, вычисления, тестовые раннеры.                                                           |
| `shared/`           | Код, допустимый для клиента; файлы должны быть чистыми для браузера или явно совместимыми с Chatium shared-route. |
| `pagecss/`          | CSS-фрагменты страниц, вынесенные из TSX entrypoints.                                                             |
| `config/`           | Константы проекта, маршрутов и заголовков.                                                                        |
| `docs/spec/spec.md` | Этот spec-as-source документ.                                                                                     |

Нормативная детализация структуры:

- `components/admin/` содержит компоненты админки: `AdminCounters`, `AdminSettings`, `AdminLogMonitor` и broker ops components в `components/admin/broker/*`.
- `components/tests/` содержит только компоненты страницы тестов: `TestSuiteTab`, `TestsLogMonitor`.
- Broker не имеет внешних HTTP endpoints. Module-facing контракты регистрируются как `app.function()` в `functions/broker/*`, вызываются только через `@app/app.runAppFunction` из серверных wrapper-ов модулей и делегируют реализацию в `lib/broker/*`.
- `functions/broker/*` не помечается `// @shared-route`, не импортируется в Vue/browser/shared и не имеет URL через `route.url()`.
- `tables/broker*.table.ts`, `repos/broker*.repo.ts` и `lib/broker/*` являются серверным контуром event broker-а.
- `lib/broker/*` разделяется на pure validation/helpers, orchestration publish/poll/ack/fail, internal module identity and registry; repo не содержит маршрутизацию событий и не вызывает API других модулей.
- `shared/*` обязан быть помечен `// @shared`, если импортируется из Vue или shared-route кода. Исключение - серверно-используемые helper-ы, которые не попадают в браузерный bundle.
- `api/*` route-модули, импортируемые из Vue через `.run(ctx)` или `.query(...).run(ctx)`, должны быть помечены `// @shared-route`.
- `lib/htmlRedirect.ts` является единственной точкой приведения `ctx.resp.redirect()` к результату html-route; новые SSR redirect helper-ы не добавляются без явной причины.
- `pagecss/*.ts` не содержит бизнес-логики, API-вызовов, Heap-доступа или состояния. Это только строковые CSS-фрагменты для SSR injection.
- `docs/ADR/*`, `docs/api.md`, `docs/data.md`, `docs/imports.md` остаются справочниками. При расхождении с этим файлом правится либо этот файл, либо старый документ, но не код “под старый документ”.

### 3.1 Полный инвентарь файлов

Этот инвентарь является нормативным. Любой новый, удаленный или переименованный файл в `p/units/neso/meta/core` требует синхронного изменения таблицы.

| Файл                                                         | Нормативная роль                                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `.CHATIUM-LLM.md`                                            | Краткий LLM-контекст проекта и ссылки на документы; не источник истины.                                                |
| `.dir.json`                                                  | Метаданные каталога Chatium workspace.                                                                                 |
| `.workspace.json`                                            | Workspace feature flags, сейчас `heap`.                                                                                |
| `README.md`                                                  | Человеческое описание проекта и быстрые ссылки; не источник истины при расхождении со spec.                            |
| `index.tsx`                                                  | SSR route `/`, экспорт `indexPageRoute`.                                                                               |
| `web/admin/index.tsx`                                        | SSR route `/web/admin`, экспорт `adminPageRoute`.                                                                      |
| `web/login/index.tsx`                                        | SSR route `/web/login`, экспорт `loginPageRoute`.                                                                      |
| `web/profile/index.tsx`                                      | SSR route `/web/profile`, экспорт `profilePageRoute`.                                                                  |
| `web/tests/index.tsx`                                        | SSR route `/web/tests`, экспорт `testsPageRoute`.                                                                      |
| `pages/HomePage.vue`                                         | Vue page главной.                                                                                                      |
| `pages/LoginPage.vue`                                        | Vue page входа.                                                                                                        |
| `pages/ProfilePage.vue`                                      | Vue page профиля.                                                                                                      |
| `pages/AdminPage.vue`                                        | Vue page админки.                                                                                                      |
| `pages/TestsPage.vue`                                        | Vue page тестов.                                                                                                       |
| `components/Header.vue`                                      | Общий header и logout orchestration.                                                                                   |
| `components/LogoutModal.vue`                                 | Презентационный modal выхода.                                                                                          |
| `components/GlobalGlitch.vue`                                | Глобальные CSS-правила glitch effect.                                                                                  |
| `components/AppFooter.vue`                                   | Общий footer и событие `chatium-click`.                                                                                |
| `components/admin/AdminCounters.vue`                         | Презентационная карточка error/warn counters.                                                                          |
| `components/admin/AdminSettings.vue`                         | UI настроек `project_name` и `log_level`.                                                                              |
| `components/admin/AdminLogMonitor.vue`                       | Презентационный монитор логов админки.                                                                                 |
| `components/admin/broker/BrokerOpsPanel.vue`                 | Контейнер broker ops-панели: вкладки, фильтры, загрузка diagnostics and actions orchestration.                         |
| `components/admin/broker/BrokerModulesTable.vue`             | Таблица BPM-модулей с enable/disable actions.                                                                          |
| `components/admin/broker/BrokerSubscriptionsTable.vue`       | Таблица подписок broker-а с enable/disable actions.                                                                    |
| `components/admin/broker/BrokerEventsTable.vue`              | Таблица событий broker-а с primary summary and raw payload open action.                                                |
| `components/admin/broker/BrokerDeliveriesTable.vue`          | Таблица deliveries с inspect, requeue and skip actions.                                                                |
| `components/admin/broker/BrokerNotificationsTable.vue`       | Таблица notification attempts с retry action.                                                                          |
| `components/admin/broker/BrokerRawPayloadViewer.vue`         | Expandable JSON viewer для raw `BrokerEvents.payload` с audit-triggered load.                                          |
| `components/admin/broker/BrokerOpsConfirmModal.vue`          | Подтверждение ops actions с обязательным reason/comment.                                                               |
| `components/tests/TestSuiteTab.vue`                          | Презентационная вкладка test suite.                                                                                    |
| `components/tests/TestsLogMonitor.vue`                       | Презентационный монитор логов страницы тестов.                                                                         |
| `config/routes.tsx`                                          | `PROJECT_ROOT`, route constants and URL helpers.                                                                       |
| `config/project.tsx`                                         | Project/page constants and title/header helpers.                                                                       |
| `api/settings/list.ts`                                       | `GET /api/settings/list`, экспорт `listSettingsRoute`.                                                                 |
| `api/settings/get.ts`                                        | `GET /api/settings/get`, экспорт `getSettingRoute`.                                                                    |
| `api/settings/save.ts`                                       | `POST /api/settings/save`, экспорт `saveSettingRoute`.                                                                 |
| `api/logger/log.ts`                                          | `POST /api/logger/log`, экспорт `logRoute`.                                                                            |
| `api/logger/browser.ts`                                      | `POST /api/logger/browser`, экспорт `postBrowserLogsRoute`.                                                            |
| `api/admin/logs/recent.ts`                                   | `GET /api/admin/logs/recent`, экспорт `getRecentLogsRoute`.                                                            |
| `api/admin/logs/before.ts`                                   | `GET /api/admin/logs/before`, экспорт `getLogsBeforeRoute`.                                                            |
| `api/admin/dashboard/counts.ts`                              | `GET /api/admin/dashboard/counts`, экспорт `getDashboardCountsRoute`.                                                  |
| `api/admin/dashboard/reset.ts`                               | `POST /api/admin/dashboard/reset`, экспорт `resetDashboardRoute`.                                                      |
| `api/admin/broker/diagnostics.ts`                            | `GET /api/admin/broker/diagnostics`, broker ops data для admin UI.                                                     |
| `api/admin/broker/events/raw.ts`                             | `POST /api/admin/broker/events/raw`, audit и возврат raw payload события.                                              |
| `api/admin/broker/modules/toggle.ts`                         | `POST /api/admin/broker/modules/toggle`, enable/disable module with audit.                                             |
| `api/admin/broker/subscriptions/toggle.ts`                   | `POST /api/admin/broker/subscriptions/toggle`, enable/disable subscription with audit.                                 |
| `api/admin/broker/deliveries/requeue.ts`                     | `POST /api/admin/broker/deliveries/requeue`, requeue failed/dead_letter delivery with audit.                           |
| `api/admin/broker/deliveries/skip.ts`                        | `POST /api/admin/broker/deliveries/skip`, skip poison delivery with audit.                                             |
| `api/admin/broker/notifications/retry.ts`                    | `POST /api/admin/broker/notifications/retry`, retry notification attempt with audit.                                   |
| `api/tests/list.ts`                                          | `GET /api/tests/list`, экспорт `listTestsRoute`.                                                                       |
| `api/tests/unit/index.ts`                                    | `GET /api/tests/unit`, экспорт `templateUnitTestsRoute`.                                                               |
| `api/tests/integration/index.ts`                             | `GET /api/tests/integration`, экспорт `templateIntegrationTestsRoute`.                                                 |
| `functions/broker/publish.ts`                                | Internal `app.function('/broker/publish')`, публикация события модулем.                                                |
| `functions/broker/poll.ts`                                   | Internal `app.function('/broker/poll')`, получение и claim pending deliveries потребителем.                            |
| `functions/broker/ack.ts`                                    | Internal `app.function('/broker/ack')`, подтверждение обработки deliveries.                                            |
| `functions/broker/fail.ts`                                   | Internal `app.function('/broker/fail')`, фиксация ошибки и retry/dead-letter.                                          |
| `functions/broker/modules/register.ts`                       | Internal `app.function('/broker/modules/register')`, регистрация/обновление BPM-модуля и его event contracts manifest. |
| `functions/broker/subscriptions/register.ts`                 | Internal `app.function('/broker/subscriptions/register')`, batch регистрация/обновление подписок.                      |
| `functions/broker/diagnostics.ts`                            | Internal/Admin `app.function('/broker/diagnostics')`, чтение broker state для диагностики.                             |
| `functions/broker/notifications/retry.ts`                    | Internal/Admin `app.function('/broker/notifications/retry')`, retry notification attempts.                             |
| `jobs/broker/notifications-dispatch.ts`                      | `app.job` для batch dispatch `BrokerNotificationAttempts` в пределах lifetime операции.                                |
| `sample-module/contracts/brokerEvents.ts`                    | MAX-independent sample event contract `sample.note.created`.                                                           |
| `sample-module/lib/coreBrokerClient.lib.ts`                  | Sample module broker client через `@app/app.runAppFunction` без HTTP broker URL.                                       |
| `sample-module/api/register.ts`                              | `POST /sample-module/api/register`, Admin-only registration sample.                                                    |
| `sample-module/api/publish-note.ts`                          | `POST /sample-module/api/publish-note`, Admin-only publish sample note event.                                          |
| `sample-module/api/poll.ts`                                  | `POST /sample-module/api/poll`, Admin-only poll sample deliveries.                                                     |
| `sample-module/api/ack.ts`                                   | `POST /sample-module/api/ack`, Admin-only ack sample deliveries.                                                       |
| `sample-module/api/fail.ts`                                  | `POST /sample-module/api/fail`, Admin-only fail sample deliveries.                                                     |
| `sample-module/README.md`                                    | Краткая инструкция к sample module.                                                                                    |
| `../interfaces/getcourse/contracts/brokerEvents.ts`          | GetCourse interface event contract `getcourse.raw_event.accepted`.                                                     |
| `../interfaces/getcourse/lib/broker/coreBrokerClient.lib.ts` | GetCourse interface broker client через `@app/app.runAppFunction` без HTTP broker URL.                                 |
| `../interfaces/getcourse/api/module/register.ts`             | `POST /api/module/register`, Admin-only registration GetCourse interface module in its own project root.               |
| `../interfaces/getcourse/api/module/publish-event.ts`        | `POST /api/module/publish-event`, Admin-only publish normalized GetCourse raw event.                                   |
| `../interfaces/getcourse/README.md`                          | Краткая инструкция к GetCourse interface module.                                                                       |
| `tables/settings.table.ts`                                   | Heap schema `Settings`.                                                                                                |
| `tables/logs.table.ts`                                       | Heap schema `Logs`.                                                                                                    |
| `tables/brokerModules.table.ts`                              | Heap schema `BrokerModules`, registry BPM-модулей.                                                                     |
| `tables/brokerEventContracts.table.ts`                       | Heap schema `BrokerEventContracts`, версионированный каталог module-owned event contracts.                             |
| `tables/brokerSubscriptions.table.ts`                        | Heap schema `BrokerSubscriptions`, registry подписок потребителей.                                                     |
| `tables/brokerEvents.table.ts`                               | Heap schema `BrokerEvents`, immutable event log.                                                                       |
| `tables/brokerDeliveries.table.ts`                           | Heap schema `BrokerDeliveries`, materialized deliveries для poll/ack/fail.                                             |
| `tables/brokerNotificationAttempts.table.ts`                 | Heap schema `BrokerNotificationAttempts`, audit best-effort уведомлений подписчиков.                                   |
| `tables/brokerOpsAudit.table.ts`                             | Heap schema `BrokerOpsAudit`, audit admin ops actions and raw payload views.                                           |
| `tables/.gitkeep`                                            | Placeholder каталога tables; не содержит поведения.                                                                    |
| `repos/settings.repo.ts`                                     | CRUD repository для settings без logger recursion.                                                                     |
| `repos/logs.repo.ts`                                         | CRUD/query repository для logs.                                                                                        |
| `repos/brokerModules.repo.ts`                                | CRUD/query repository для `BrokerModules`.                                                                             |
| `repos/brokerEventContracts.repo.ts`                         | CRUD/query repository для `BrokerEventContracts`.                                                                      |
| `repos/brokerSubscriptions.repo.ts`                          | CRUD/query repository для `BrokerSubscriptions`.                                                                       |
| `repos/brokerEvents.repo.ts`                                 | Append/query repository для `BrokerEvents`.                                                                            |
| `repos/brokerDeliveries.repo.ts`                             | CRUD/query repository для `BrokerDeliveries`.                                                                          |
| `repos/brokerNotificationAttempts.repo.ts`                   | CRUD/query repository для `BrokerNotificationAttempts`.                                                                |
| `repos/brokerOpsAudit.repo.ts`                               | Append/query repository для `BrokerOpsAudit`.                                                                          |
| `lib/settings.lib.ts`                                        | Settings business logic and validation.                                                                                |
| `lib/logger.lib.ts`                                          | Server logging pipeline.                                                                                               |
| `lib/logLevel.lib.ts`                                        | Server-only helper for reading and injecting `window.__BOOT__.logLevel`.                                               |
| `lib/broker/internalApi.lib.ts`                              | Реализация broker contracts под `functions/broker/*`: publish, poll, ack, fail, registry.                              |
| `lib/broker/types.lib.ts`                                    | Broker DTO, semantic result/error types and safe row mappers.                                                          |
| `lib/broker/moduleIdentity.lib.ts`                           | Проверка internal module identity, registry state and permissions.                                                     |
| `lib/broker/eventContracts.lib.ts`                           | Регистрация, versioning, hash and lookup module-owned event contracts.                                                 |
| `lib/broker/errorCodes.lib.ts`                               | Stable broker semantic error codes and typed error result helpers.                                                     |
| `lib/broker/patterns.lib.ts`                                 | Exact/`*`/suffix wildcard matching для module/event patterns.                                                          |
| `lib/broker/safeJson.lib.ts`                                 | Stable ids, stable JSON/hash helpers and redaction helpers for broker errors/payload previews.                         |
| `lib/broker/schemaValidation.lib.ts`                         | Runtime validation `json-schema-subset-v1` для event payload contracts.                                                |
| `lib/broker/eventSummary.lib.ts`                             | Pure builder `BrokerEventSafe.primarySummary` по module-owned display hints с generic fallback.                        |
| `lib/broker/subscriptionMatching.lib.ts`                     | Pure matching события к подпискам.                                                                                     |
| `lib/broker/notify.lib.ts`                                   | Best-effort notification orchestration: internal/socket hints, attempts, retry.                                        |
| `lib/htmlRedirect.ts`                                        | Typed wrapper around `ctx.resp.redirect` for html routes.                                                              |
| `lib/admin/dashboard.lib.ts`                                 | Dashboard counters and reset logic.                                                                                    |
| `lib/tests/templateUnitSuite.ts`                             | Unit runner orchestrator.                                                                                              |
| `lib/tests/templateUnitRoutesChecks.ts`                      | Unit checks for route helpers.                                                                                         |
| `lib/tests/templateUnitSuiteHelpers.ts`                      | Sync unit result helpers.                                                                                              |
| `lib/tests/integrationSuite.ts`                              | Integration runner orchestrator.                                                                                       |
| `lib/tests/integrationApiSuite.ts`                           | API/e2e integration checks.                                                                                            |
| `lib/tests/integrationSuiteHelpers.ts`                       | Async integration result helpers and `isAdmin`.                                                                        |
| `lib/tests/logTestRunFailures.ts`                            | Failure-to-log bridge for test API wrappers.                                                                           |
| `lib/.gitkeep`                                               | Placeholder каталога lib; не содержит поведения.                                                                       |
| `shared/logger.ts`                                           | Browser logger, severity matrix and log sink.                                                                          |
| `shared/browserRemoteLogger.ts`                              | Browser remote batching and console/global handlers.                                                                   |
| `shared/useRemoteLogging.ts`                                 | Vue lifecycle composable for remote browser logging.                                                                   |
| `shared/useLogStream.ts`                                     | Vue lifecycle/state composable for log history and WebSocket.                                                          |
| `shared/logStreamUtils.ts`                                   | Pure log stream formatting/filter helpers.                                                                             |
| `shared/logStreamSocket.ts`                                  | Optional socket lifecycle listener adapter.                                                                            |
| `shared/useTestSuites.ts`                                    | Vue state/actions for test tabs and runners.                                                                           |
| `shared/testSuiteHelpers.ts`                                 | Pure test UI and HTTP check helpers.                                                                                   |
| `shared/testCatalog.ts`                                      | Runtime test catalog shared by UI/API/runners.                                                                         |
| `shared/logLevel.ts`                                         | SSR helper for reading/injecting `window.__BOOT__.logLevel`.                                                           |
| `shared/preloader.ts`                                        | SSR CSS/script/html snippets for boot loader.                                                                          |
| `shared/.gitkeep`                                            | Placeholder каталога shared; не содержит поведения.                                                                    |
| `styles.tsx`                                                 | Shared CSS strings `baseHtmlStyles`, `customScrollbarStyles`.                                                          |
| `pagecss/adminPageCss1.ts`                                   | Admin page CSS part 1.                                                                                                 |
| `pagecss/adminPageCss2.ts`                                   | Admin page CSS part 2.                                                                                                 |
| `pagecss/adminPageCss3.ts`                                   | Admin page CSS part 3.                                                                                                 |
| `pagecss/headerCss1.ts`                                      | Header CSS part 1.                                                                                                     |
| `pagecss/headerCss2.ts`                                      | Header CSS part 2.                                                                                                     |
| `pagecss/homeBootCss.ts`                                     | Home boot/CRT CSS.                                                                                                     |
| `pagecss/homePageCss1.ts`                                    | Home page CSS part 1.                                                                                                  |
| `pagecss/homePageCss2.ts`                                    | Home page CSS part 2.                                                                                                  |
| `pagecss/profilePageCss1.ts`                                 | Profile page CSS part 1.                                                                                               |
| `pagecss/profilePageCss2.ts`                                 | Profile page CSS part 2.                                                                                               |
| `pagecss/testsPageCss1.ts`                                   | Tests page CSS part 1.                                                                                                 |
| `pagecss/testsPageCss2.ts`                                   | Tests page CSS part 2.                                                                                                 |
| `pagecss/testsPageCss3.ts`                                   | Tests page CSS part 3.                                                                                                 |
| `pagecss/testsPageCss4.ts`                                   | Tests page CSS part 4.                                                                                                 |
| `docs/spec/spec.md`                                          | Spec-as-source, этот документ.                                                                                         |
| `docs/architecture.md`                                       | Legacy architecture reference.                                                                                         |
| `docs/api.md`                                                | Legacy API reference.                                                                                                  |
| `docs/data.md`                                               | Legacy data reference.                                                                                                 |
| `docs/imports.md`                                            | Legacy imports reference.                                                                                              |
| `docs/ADR/0001-initial-structure.md`                         | Legacy ADR initial structure.                                                                                          |
| `docs/ADR/0002-settings-heap-and-layered-api.md`             | Legacy ADR settings/layering.                                                                                          |
| `tsconfig.json`                                              | Local TS/Vue compiler config.                                                                                          |
| `jsx.d.ts`                                                   | Local JSX/Chatium type shim.                                                                                           |
| `vue-shim.d.ts`                                              | Local Vue/Chatium type shim.                                                                                           |

## 4. Роли и доступ

Роли:

- `Guest`: нет `ctx.user`.
- `AnyUser`: авторизованный пользователь любого типа, прошедший `requireAnyUser(ctx)`. Это не `Guest`; guest-запросы к AnyUser API обрабатываются платформенным auth helper.
- `RealUser`: пользователь прошел авторизацию, доступен через `requireRealUser(ctx)`.
- `Admin`: `ctx.user.is('Admin') === true`, проверяется через `requireAccountRole(ctx, 'Admin')`.
- `InternalModule`: server-side код модуля внутри того же Chatium-приложения/сервера. Это не HTTP-auth роль: identity задается trusted adapter-ом и сверяется с `BrokerModules`.

Правила доступа:

| Поверхность       | Доступ                 | Поведение без доступа                                   |
| ----------------- | ---------------------- | ------------------------------------------------------- |
| `/`               | Guest, RealUser, Admin | Доступна всем; набор ссылок зависит от auth state.      |
| `/web/login`      | Guest, RealUser, Admin | Доступна всем; строит ссылку `/s/auth/signin?back=...`. |
| `/web/profile`    | RealUser, Admin        | Редирект на `../login?back=<current-url>`.              |
| `/web/admin`      | Admin                  | Редирект на login с `back=<current-url>`.               |
| `/web/tests`      | RealUser, Admin        | Редирект на `../login?back=<current-url>`.              |
| `/api/settings/*` | Admin                  | Платформенная ошибка auth.                              |
| `/api/admin/*`    | Admin                  | Платформенная ошибка auth.                              |
| `/api/logger/*`   | AnyUser                | Платформенная ошибка auth.                              |
| `/api/tests/*`    | AnyUser                | Платформенная ошибка auth.                              |

На `/web/tests` non-admin пользователь видит тестовую страницу без админского live-канала логов. Серверная интеграция может возвращать failed-строки для проверок admin-branch с текстом `нужна роль Admin (ctx.user.is("Admin"))`.

Auth helper должен быть первой исполняемой строкой защищенного API-handler после объявления route callback: `requireAccountRole(ctx, 'Admin')` для Admin API и `requireAnyUser(ctx)` для AnyUser API. Для SSR entrypoints допускается предварительное диагностическое логирование, после чего `requireRealUser`/`requireAccountRole` выполняется до вычисления защищенных данных.

Broker internal identity:

- broker не публикует module-facing HTTP endpoints наружу; вызовы publish/poll/ack/fail выполняются через internal `app.function()` endpoints из `functions/broker/*`;
- межмодульные вызовы выполняются только через `@app/app.runAppFunction(ctx, targetApp, path, params)`, а не через `runAppFunctionInCurrentAccount`, `InternalCallTargetCurrentAccount`, `fetch`, `request` или `route.run(ctx)`;
- `targetApp` для вызова core broker-а задается в caller-side wrapper-е через существующую конфигурационную модель проекта: базовый путь берется из `config/routes.tsx` (`PROJECT_ROOT`) и резолвится тем же способом, что остальные проектные пути; бизнес-код не дублирует строку `p/units/neso/meta/core` и не собирает target вручную;
- каждый BPM-модуль, которому нужен broker, обязан иметь server-only wrapper над core broker API; бизнес-логика вызывает методы wrapper-а (`publish`, `poll`, `ack`, `fail`, registration helpers), а не импортирует `runAppFunction` напрямую;
- handler `app.function()` получает `callerInfo`; core сохраняет это как diagnostic/audit context, но не считает секретом и не использует вместо проверки `BrokerModules`;
- `producerModule` и `consumerModule` задаются trusted server-side wrapper-ом как `moduleKey`, равный `PROJECT_ROOT` модуля из его `config/routes.tsx`, например `p/units/neso/meta/core/sample-module`;
- browser/client payload не может передать или переопределить module identity;
- каждый internal call сверяет `moduleKey` с `BrokerModules`, `enabled=true`, `adminDisabled=false` и allowed publish/subscribe patterns;
- `callerInfo` сохраняется как audit/diagnostics context; он не является секретом и не заменяет проверку `BrokerModules`;
- Admin diagnostics/ops routes могут читать broker state и выполнять только явно описанные admin ops actions: enable/disable module, enable/disable subscription, retry notification, requeue `failed`/`dead_letter` delivery, skip poison delivery and raw payload view. Admin routes не публикуют broker events, не редактируют payload/metadata и не делают ack/fail от имени consumer-а без claim token.

## 5. Маршруты и URL

`config/routes.tsx` задает:

```ts
PROJECT_ROOT = 'p/units/neso/meta/core'
ROUTES = {
  index: './',
  admin: './web/admin',
  profile: './web/profile',
  login: './web/login',
  tests: './web/tests'
}
ROUTE_PATHS = {
  index: '/',
  admin: '/web/admin',
  profile: '/web/profile',
  login: '/web/login',
  tests: '/web/tests'
}
```

Нормативное поведение helper-ов:

- `getFullUrl('./')`, `getFullUrl('/')`, `getFullUrl('')` возвращают `/p/units/neso/meta/core/`.
- `getFullUrl('./web/admin')`, `getFullUrl('/web/admin')`, `getFullUrl('web/admin')` возвращают `/p/units/neso/meta/core/web/admin`.
- `withProjectRoot('./web/admin')` и `withProjectRoot('web/admin')` возвращают `./p/units/neso/meta/core/web/admin`.
- `withProjectRoot('./')` и `withProjectRoot('')` возвращают `./p/units/neso/meta/core/`.
- `withProjectRootAndSubroute('./web/admin', 'edit')` возвращает `./p/units/neso/meta/core/web/admin~edit`.
- `withProjectRootAndSubroute('./web/admin', '/edit')` возвращает `./p/units/neso/meta/core/web/admin~edit`.
- `withProjectRootAndSubroute('./web/admin', 'users/123')` возвращает `./p/units/neso/meta/core/web/admin~users/123`.

Все значения `ROUTES` должны начинаться с `./`. Все публичные ссылки во Vue props должны быть без домена.

`config/project.tsx` задает:

```ts
DEFAULT_PROJECT_TITLE = 'NESO Meta'
INDEX_PAGE_NAME = 'Главная'
PROFILE_PAGE_NAME = 'Профиль'
ADMIN_PAGE_NAME = 'Админка'
TESTS_PAGE_NAME = 'Тесты'
BODY_TEXT = 'NESO Meta'
BODY_SUBTEXT = 'В разработке'
```

`getPageTitle(pageName, projectName)` всегда возвращает `${pageName} - ${projectName}` без trim/fallback. `getHeaderText(pageName, projectName)` всегда возвращает `${projectName} / ${pageName}` без trim/fallback. Пустые строки и спецсимволы сохраняются как переданы.

## 6. SSR-страницы

Все SSR-страницы обязаны:

- иметь `<meta charset="UTF-8">` и viewport;
- инжектить `window.__BOOT__.logLevel` через `getLogLevelScript(await getLogLevelForPage(ctx))`;
- использовать `getPageTitle(pageName, projectName)` для `<title>`, кроме login, где title равен `Вход`;
- использовать `getHeaderText(pageName, projectName)` для заголовка в Header, кроме login;
- подключать `/s/metric/clarity.js`;
- не хардкодить внутренние URL вручную.

Preloader подключается на `/`, `/web/profile`, `/web/admin`, `/web/tests`; `/web/login` без preloader, Tailwind, FontAwesome и remote logging, но с `window.__BOOT__.logLevel` и `/s/metric/clarity.js`.

Защищенные SSR-redirects:

- `/web/profile` и `/web/tests` при отсутствии real user возвращают `htmlRedirect(ctx, '../login?back=' + encodeURIComponent(req.url))`.
- `/web/admin` при отсутствии Admin возвращает HTML fallback с title `Вход`, clarity, meta refresh и `window.location.href` на `loginPageRoute.url() + '?back=' + encodeURIComponent(req.url)`.
- `htmlRedirect(ctx, location, statusCode?)` централизует типовое приведение результата `ctx.resp.redirect()` и не должен размножаться по entrypoint-файлам.

### 6.1 Главная `/`

Файл: `index.tsx`.  
Компонент: `pages/HomePage.vue`.  
Доступ: все.

Сервер обязан вычислить:

- `isAuthenticated = !!ctx.user`;
- `isAdmin = ctx.user?.is('Admin') ?? false`;
- `loginUrl = getFullUrl(ROUTES.login)`;
- `adminUrl = isAdmin ? getFullUrl(ROUTES.admin) : ''`;
- `testsUrl = isAuthenticated ? getFullUrl(ROUTES.tests) : ''`;
- `projectName = getSettingString(ctx, PROJECT_NAME)`;
- `projectTitle = getHeaderText('Главная', projectName)`.

`HomePage` получает:

- `projectName = BODY_TEXT`, сейчас `NESO Meta`;
- `projectDescription = BODY_SUBTEXT`, сейчас `В разработке`;
- `projectTitle`, `indexUrl`, `profileUrl`, `loginUrl`, `isAuthenticated`, `isAdmin`, `adminUrl`, `testsUrl`.

На главной `projectName` в props - это hero-текст `BODY_TEXT`, а не настройка `project_name`. Настройка `project_name` используется сервером только для `<title>` и `projectTitle` Header через `getHeaderText('Главная', projectNameFromSettings)`.

Клиентское поведение:

- после `bootloader-complete` запускается печать заголовка и описания;
- на mount подключается `browserRemoteLogger`;
- `setLogSink` передает локальные логи в remote logger;
- при unmount выполняется `flush`, снимается sink, очищаются интервалы и обработчик `bootloader-complete`;
- ссылка Chatium открывается в новой вкладке после локального glitch-эффекта.

`HomePage` хранит интервалы печати отдельно для title/description, начинает анимацию сразу, если `window.bootLoaderComplete === true`, и слушает `bootloader-complete` иначе. На `onBeforeUnmount` выполняется `flush`, на `onUnmounted` - `setLogSink(null)`, `teardown()`, удаление listener-а и очистка интервалов.

### 6.2 Login `/web/login`

Файл: `web/login/index.tsx`.  
Компонент: `pages/LoginPage.vue`.  
Доступ: все.

Сервер обязан:

- взять `back` из `req.query.back`;
- если `back` не задан, использовать `/${PROJECT_ROOT}/`;
- передать `back` в `LoginPage`;
- не подключать browser remote logging на клиенте.

Клиент обязан строить URL входа как:

```ts
;`/s/auth/signin?back=${encodeURIComponent(back)}`
```

`LoginPage` логирует mount/unmount через `shared/logger`, но не устанавливает `browserRemoteLogger`, не регистрирует sink и не вызывает `/api/logger/browser`. Это связано с тем, что browser logger endpoint требует `AnyUser`, а login доступен гостю.

### 6.3 Profile `/web/profile`

Файл: `web/profile/index.tsx`.  
Компонент: `pages/ProfilePage.vue`.  
Доступ: RealUser, Admin.

Сервер обязан:

- проверить `requireRealUser(ctx)`;
- при ошибке вернуть HTML-redirect на `../login?back=<current-url>`;
- передать в Vue `user.displayName`, `user.confirmedEmail`, `user.confirmedPhone`;
- передать `adminUrl` только если user is Admin;
- передать `testsUrl = getFullUrl(ROUTES.tests)`;
- подключить boot loader, scrollbar, header CSS и profile CSS.

Клиент обязан:

- показать Header после boot loader;
- печатать `Профиль пользователя` и `Информация о вашем аккаунте`;
- показать display name, confirmed email и confirmed phone, используя fallback-тексты, если значения отсутствуют;
- подключить `browserRemoteLogger` и снять его при unmount.

Fallback-тексты профиля: display name - `Не указано`, email - `Не подтвержден`, phone - `Не подтвержден`. Анимация печатает `Профиль пользователя`, затем `Информация о вашем аккаунте`; контент карточки показывается только после завершения печати описания.

### 6.4 Admin `/web/admin`

Файл: `web/admin/index.tsx`.  
Компонент: `pages/AdminPage.vue`.  
Доступ: Admin.

Сервер обязан:

- проверить `requireAccountRole(ctx, 'Admin')`;
- при ошибке вернуть HTML с meta refresh и `window.location.href` на login route с `back=<current-url>`;
- вычислить `logsSocketId = getAdminLogsSocketId(ctx)`;
- передать `encodedLogsSocketId = await genSocketId(ctx, logsSocketId)`;
- передать `isAuthenticated=true`, `isAdmin=true`, `adminUrl`, `testsUrl`, `profileUrl`, `loginUrl`.

Клиент обязан содержать:

- статус-бар `/web/admin`, название проекта, текущий log level, состояние live-канала (`LIVE`, `OFFLINE`, `...` или `LOGS`);
- карточку счетчиков ошибок и предупреждений;
- карточки настроек проекта и уровня логирования;
- монитор логов с фильтрами, пагинацией, clear и раскрытием строк;
- broker ops panel с модулями, подписками, событиями, deliveries, notification attempts, raw payload viewer и admin ops actions;
- live-инкремент счетчиков для входящих логов не старее `dashboardResetAt`;
- загрузку счетчиков через `GET /api/admin/dashboard/counts`;
- сброс счетчиков через `POST /api/admin/dashboard/reset`;
- загрузку broker diagnostics через `GET /api/admin/broker/diagnostics`;
- выполнение broker ops actions только через admin routes `/api/admin/broker/*` с reason/comment и audit;
- `useRemoteLogging({ enabled: true, onLocalEntry: ingestLocalEntry })`;
- `useLogStream({ trackConnection: true })`.

`AdminPage`:

- вычисляет `initialProjectName` из `projectTitle.split(' / ')[0]`;
- хранит статус-бар `statusProjectName` и `statusLogLevel`, обновляемые событиями `AdminSettings`;
- грузит `GET /api/admin/dashboard/counts` при mount;
- считает live-входящие логи через `countEntry(entry)`, увеличивая error для severity `0..3`, warn для severity `4`, только если `entry.timestamp >= dashboardResetAt`;
- при сбросе вызывает `POST /api/admin/dashboard/reset`, выставляет counters из ответа и логирует notice;
- вызывает `startLogStream()` на mount и удаляет только listener `bootloader-complete` на unmount; cleanup socket/listeners выполняется внутри `useLogStream.onBeforeUnmount`.

### 6.5 Tests `/web/tests`

Файл: `web/tests/index.tsx`.  
Компонент: `pages/TestsPage.vue`.  
Доступ: RealUser, Admin.

Сервер обязан:

- проверить `requireRealUser(ctx)`;
- при ошибке вернуть HTML-redirect на `../login?back=<current-url>`;
- передать `isAdmin = user.is('Admin')`;
- передать `encodedLogsSocketId` только Admin;
- добавить `<meta name="neso-meta-page" content="web-tests" />`.

Клиент обязан:

- иметь вкладки `unit`, `integration`, `http`;
- показывать метрики активной вкладки: всего, пройдено, провалено, без прогона;
- запускать текущую вкладку, полный прогон и отдельный тест из строки;
- блокировать групповой прогон, пока идет одиночный прогон этой группы;
- раскрывать/сворачивать категории, первая категория каждой вкладки открыта по умолчанию;
- при наличии `encodedLogsSocketId` показывать монитор логов, подключить remote logging и дедуплицировать echo browser-sink записей из socket;
- без `encodedLogsSocketId` не поднимать remote logging и не показывать лог-сайдбар.

HTTP-вкладка `/web/tests` не имеет отдельного API endpoint. Она выполняется клиентом через `fetch` SSR-страниц по `HTTP_PATH_BY_TEST_ID` из `shared/testSuiteHelpers.ts`: `/`, `/web/admin`, `/web/profile`, `/web/login`, `/web/tests`. Base URL вычисляется из `indexUrl`/`testsUrl` и `window.location.origin`.

`TestsPage`:

- использует `useTestSuites({ indexUrl, testsUrl })` как единственный источник состояния вкладок, метрик, результатов, loading flags и single-run блокировок;
- использует `useLogStream({ encodedLogsSocketId, dedupSocketEcho: true, loggerName: 'TestsPage' })`;
- вызывает `useRemoteLogging({ enabled: !!encodedLogsSocketId, onLocalEntry: ingestLocalEntry })`;
- вызывает `startLogStream()` на mount, но без `encodedLogsSocketId` поток и history fetch не поднимаются;
- показывает `<aside class="tp-side">` с `TestsLogMonitor` только Admin, потому что только Admin получает `encodedLogsSocketId`.

## 7. Общие UI-компоненты

### Header

`components/Header.vue` обязан:

- показывать логотип и `projectTitle`;
- обновлять часы каждую секунду в формате `HH:mm:ss`;
- показывать кнопку админки только если `isAdmin && adminUrl`;
- показывать кнопку тестов, если задан `testsUrl`;
- показывать профиль для авторизованного и login для гостя;
- кнопка glitch добавляет `global-glitch-active` на `.app-layout` на 500 ms;
- кнопка close для авторизованного открывает `LogoutModal`, скрывает основной контент и footer;
- кнопка close для гостя не открывает modal, а запускает glitch;
- подтверждение logout отправляет на `/s/logout`;
- Escape закрывает logout modal.

Props `Header`: `projectTitle`, `indexUrl`, `profileUrl`, `loginUrl`, `isAuthenticated`, опциональные `isAdmin`, `adminUrl`, `testsUrl`. `pageName` допускается типом для обратной совместимости, но не используется в разметке. При открытом logout modal header получает класс `header-hidden`, `.app-layout` получает `content-hidden`, `.content-wrapper` и `.app-footer` получают `hidden-for-modal`; при отмене классы снимаются.

### LogoutModal

`components/LogoutModal.vue` обязан:

- принимать только prop `visible: boolean`;
- при `visible=true` показывать overlay с текстом `Выйти из аккаунта?` и кнопками `Нет`/`Да`;
- клик по overlay или `Нет` эмитит `cancel`;
- клик по `Да` эмитит `confirm`;
- клик внутри `.logout-modal` не закрывает modal;
- логировать показ modal через watcher и не обращаться к API/Heap/router напрямую.

### GlobalGlitch

Компонент отвечает только за глобальный glitch-эффект страницы и не должен содержать бизнес-логики. Разметка - скрытый anchor `global-glitch-style-anchor`; CSS задает `.global-glitch-active` на 500 ms и отключает pointer-events для дочерних элементов во время эффекта.

### AppFooter

Footer отображает брендовый низ страницы и логирует mount. Он не должен зависеть от auth, Heap или API. Текст: `ИП Худолей Андрей Германович`, `Все права сохранены © 2018-<currentYear>`, кнопка `Сделано с ... на Chatium`. Кнопка эмитит `chatium-click`; родитель открывает `https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start` в новой вкладке.

### AdminCounters

`components/admin/AdminCounters.vue` является презентационным:

- props: `errorCount: number`, `warnCount: number`;
- событие: `reset`;
- не вызывает API, не считает логи, не хранит состояние сброса;
- показывает две метрики: ошибки и предупреждения, и кнопку `Сброс`.

### AdminSettings

Компонент обязан:

- на mount загрузить `project_name` через `getSettingRoute.query({ key: 'project_name' }).run(ctx)`;
- инициализировать log level из `window.__BOOT__.logLevel`;
- автосохранять `project_name` через 300 ms debounce, только если trim-значение отличается от последнего сохраненного;
- сохранять `log_level` немедленно при клике;
- эмитить `update:projectName` и `update:logLevel` для статус-бара;
- показывать transient `OK` или `ERR` 1500 ms;
- при ошибке сохранения `project_name` возвращать значение, захваченное в начале `saveProjectName()`, и показывать ошибку; это не гарантирует откат к `lastSavedProjectName`;
- при ошибке сохранения `log_level` откатывать локальный уровень к значению до клика.
- на unmount очищать debounce/status timers.

Допустимые UI-значения уровня логирования в `AdminSettings`: `debug`, `info`, `warn`, `error`, `disable`. При сохранении они отправляются как lowercase; `api/settings/save` нормализует их в `Debug`, `Info`, `Warn`, `Error`, `Disable`.

### AdminLogMonitor и TestsLogMonitor

Компоненты являются презентационными. Состояние, загрузка, фильтры, clear, pagination и expand/collapse приходят из `useLogStream`.

`AdminLogMonitor`:

- props: `displayedLogs`, `logsLoading`, `logsError`, `logsHasMore`, `selectedLogStream`, `selectedLogStreamLabel`, `currentLogCount`, `expandedLogRows`, `logStreamKeys`, `logStreamLabels`;
- events: `load-more`, `clear`, `toggle-filter`, `toggle-row`;
- не имеет кнопки expand/collapse all.

`TestsLogMonitor`:

- имеет тот же контракт, плюс prop `hasAnyExpandedLogRow` и event `toggle-all`;
- показывает кнопку `Развернуть все`/`Свернуть все`, если есть хотя бы одна log-строка;
- не отображается на `/web/tests` без `encodedLogsSocketId`.

### Broker admin components

`BrokerOpsPanel`:

- загружает `GET /api/admin/broker/diagnostics`;
- отображает модули, подписки, события, deliveries and notification attempts во вкладках или плотных таблицах;
- вызывает ops actions только через `/api/admin/broker/*` routes;
- требует reason/comment для mutating actions через `BrokerOpsConfirmModal`;
- не держит raw payload в общем состоянии списка дольше открытой карточки/диалога.

`BrokerRawPayloadViewer`:

- получает raw payload только через `POST /api/admin/broker/events/raw`;
- показывает primary summary до раскрытия raw JSON;
- поддерживает collapse/expand вложенных объектов, поиск и ограниченную высоту;
- не предоставляет редактирование payload/metadata и не выполняет manual publish.

### TestSuiteTab

`components/tests/TestSuiteTab.vue` является презентационной панелью вкладки тестов:

- props: `tab`, `heading`, `headingIcon`, `codeLabel`, `blocksView`, `loading`, `runLabel`, `groupBlocked`, `isSuiteSectionExpanded`, `isSingleRunning`;
- events: `run-suite`, `run-single(id)`, `toggle-section(blockId, blockIndex)`;
- кнопки одиночного запуска disabled при `loading || groupBlocked`;
- состояние результатов, раскрытия секций и single-run хранится только в `useTestSuites`.

## 8. Модель данных

### 8.1 Settings

Heap table: `t__neso-meta__setting__7Fk2Qw`.  
Файл: `tables/settings.table.ts`.

Поля:

| Поле    | Тип           | Требование                                                        |
| ------- | ------------- | ----------------------------------------------------------------- |
| `key`   | `Heap.String` | Уникальный ключ настройки, searchable ru/en, embeddings disabled. |
| `value` | `Heap.Any`    | Значение настройки.                                               |

Repo: `repos/settings.repo.ts`.

Операции:

- `findByKey(ctx, key)` возвращает row или `null`;
- `findAll(ctx)` возвращает все rows;
- `upsert(ctx, key, value)` вызывает `createOrUpdateBy(ctx, 'key', { key, value })`;
- `deleteByKey(ctx, key)` удаляет row, если найден.

Repo настроек не логирует через `logger.lib`, потому что `writeServerLog -> getLogLevel/getLogWebhook -> getSetting -> findByKey` иначе создает рекурсию.

### 8.2 Logs

Heap table: `t__neso-meta__log__9Xm3Kp`.  
Файл: `tables/logs.table.ts`.

Поля:

| Поле        | Тип           | Требование                                                                       |
| ----------- | ------------- | -------------------------------------------------------------------------------- |
| `message`   | `Heap.String` | Текст сообщения, searchable ru/en, embeddings disabled.                          |
| `payload`   | `Heap.Any`    | `null`, строка или JSON-string payload.                                          |
| `severity`  | `Heap.Number` | Syslog severity `0..7`.                                                          |
| `level`     | `Heap.String` | `emergency`, `alert`, `critical`, `error`, `warning`, `notice`, `info`, `debug`. |
| `timestamp` | `Heap.Number` | Unix time в миллисекундах.                                                       |

Repo: `repos/logs.repo.ts`.

Операции:

- `create(ctx, data)` создает row и не логирует через `writeServerLog`;
- `findAll(ctx, { limit = 1000, offset = 0, severities? })` сортирует `timestamp desc`, фильтрует по `severity in severities`, если фильтр задан;
- `findById(ctx, id)` возвращает row или `null`;
- `findBeforeTimestamp(ctx, beforeTimestamp, limit, severities?)` возвращает rows с `timestamp < beforeTimestamp`, сортировка `timestamp desc`;
- `countBySeverityAfter(ctx, sinceTimestamp, severity)` использует `Logs.countBy(ctx, { timestamp: { $gt: sinceTimestamp }, severity })`;
- `countErrorsAfter(ctx, sinceTimestamp)` суммирует severities `0,1,2,3`;
- `countWarningsAfter(ctx, sinceTimestamp)` считает severity `4`.

### 8.3 BrokerModules

Heap table: `t__neso-meta__broker_module__3Mn7Qx`.
Файл: `tables/brokerModules.table.ts`.

Назначение таблицы - registry модулей, которым разрешено публиковать события, регистрировать подписки и опрашивать deliveries.

Поля:

| Поле                    | Тип            | Требование                                                                                                                                          |
| ----------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `moduleKey`             | `Heap.String`  | Уникальный стабильный ключ модуля: значение `PROJECT_ROOT` из `config/routes.tsx`, например `p/units/neso/meta/core/sample-module`, searchable off. |
| `displayName`           | `Heap.String`  | Человекочитаемое имя модуля.                                                                                                                        |
| `kind`                  | `Heap.String`  | `core`, `interface`, `domain`, `worker`, `external`.                                                                                                |
| `enabled`               | `Heap.Boolean` | Declared-enabled флаг, которым управляет регистрация/bootstrap модуля.                                                                              |
| `adminDisabled`         | `Heap.Boolean` | Admin emergency stop. Если true, module effective-disabled независимо от `enabled`.                                                                 |
| `adminDisabledAt`       | `Heap.Number`  | Unix time в миллисекундах или `0`, если admin stop снят.                                                                                            |
| `adminDisableReason`    | `Heap.String`  | Последняя активная причина admin stop или пустая строка.                                                                                            |
| `allowedPublishTypes`   | `Heap.Any`     | Array event type patterns, пустой массив = publish запрещен.                                                                                        |
| `allowedSubscribeTypes` | `Heap.Any`     | Array event type patterns, пустой массив = subscribe запрещен.                                                                                      |
| `createdAt`             | `Heap.Number`  | Unix time в миллисекундах.                                                                                                                          |
| `updatedAt`             | `Heap.Number`  | Unix time в миллисекундах.                                                                                                                          |
| `metadata`              | `Heap.Any`     | JSON-compatible служебные данные без секретов.                                                                                                      |

Repo: `repos/brokerModules.repo.ts`.

Операции:

- `findByModuleKey(ctx, moduleKey)` возвращает row или `null`;
- `upsert(ctx, data)` вызывает `createOrUpdateBy(ctx, 'moduleKey', data)`;
- `findEnabled(ctx)` возвращает effective-enabled modules: `enabled=true && adminDisabled=false`;
- `assertEnabled(ctx, moduleKey)` возвращает effective-enabled row или бросает semantic error.

Registry lifecycle:

- `BrokerModules` rows создаются и изменяются только через `/broker/modules/register` из trusted server-side wrapper-а модуля, core admin/API или core-owned bootstrap/config job-ом;
- publish/poll/ack/fail и subscription registration не создают module row неявно;
- новая регистрация создает row с `adminDisabled=false`, `adminDisabledAt=0`, `adminDisableReason=''`;
- повторная регистрация того же `moduleKey` обновляет `displayName`, `kind`, `enabled`, `allowedPublishTypes`, `allowedSubscribeTypes`, `metadata`, сохраняет исходный `createdAt` и меняет `updatedAt`;
- повторная регистрация никогда не меняет `adminDisabled`, `adminDisabledAt` и `adminDisableReason`;
- фактическая доступность module считается как `effectiveEnabled = enabled && !adminDisabled`;
- при `effectiveEnabled=false` модуль не может publish, poll, ack, fail или менять subscriptions; существующие events/deliveries не удаляются, а notification retry для deliveries этого consumer-а пропускается до повторного включения;
- Admin disable сильнее bootstrap/register: если Admin отключил module через broker ops panel, следующий bootstrap может обновить metadata/contracts/permissions, но не может вернуть module в effective-enabled состояние;
- изменение `allowedPublishTypes` применяется к новым publish calls и не отзывает уже сохраненные events/deliveries;
- изменение `allowedSubscribeTypes` применяется к регистрации/изменению subscriptions и будущему matching-у; существующие deliveries остаются durable audit.

### 8.4 BrokerEventContracts

Heap table: `t__neso-meta__broker_event_contract__4Qr9Tx`.
Файл: `tables/brokerEventContracts.table.ts`.

Назначение таблицы - versioned registry контрактов событий. Core хранит не бизнес-типы каждого модуля, а универсальный каталог контрактов, которые модули регистрируют сами. Владельцем контракта является модуль, которому принадлежит событие; добавление нового события или версии не требует правки core-кода.

Поля:

| Поле                  | Тип           | Требование                                                                                                             |
| --------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `contractKey`         | `Heap.String` | Уникальный ключ `<eventType>@<eventVersion>`, searchable off.                                                          |
| `ownerModule`         | `Heap.String` | `moduleKey` владельца события; обычно равен producer module.                                                           |
| `eventType`           | `Heap.String` | Dot/kebab namespace события, например `sample.note.created`.                                                           |
| `eventVersion`        | `Heap.Number` | Positive integer version. Новая несовместимая или любая schema-правка требует новой версии.                            |
| `status`              | `Heap.String` | `active`, `deprecated`, `retired`. `retired` запрещает новые publish, но не удаляет старые events/deliveries.          |
| `payloadSchemaFormat` | `Heap.String` | Фиксированное значение `json-schema-subset-v1`.                                                                        |
| `payloadSchema`       | `Heap.Any`    | JSON-compatible schema snapshot, зарегистрированный владельцем.                                                        |
| `schemaHash`          | `Heap.String` | SHA-256 от canonical JSON `payloadSchema`; неизменяем для пары `eventType + eventVersion`.                             |
| `sourceRef`           | `Heap.Any`    | `{ moduleKey, path:'contracts/brokerEvents.ts', exportName, docsPath? }`, где смотреть исходный module-owned контракт. |
| `display`             | `Heap.Any`    | `{ summaryFields?: Array<{ path:string, label:string, maxLength?:number }> }`, подсказки owner-модуля для ops UI.      |
| `examples`            | `Heap.Any`    | Array JSON-compatible примеров payload без секретов.                                                                   |
| `description`         | `Heap.String` | Короткое человекочитаемое описание события.                                                                            |
| `createdAt`           | `Heap.Number` | Unix time в миллисекундах.                                                                                             |
| `updatedAt`           | `Heap.Number` | Unix time в миллисекундах.                                                                                             |
| `deprecatedAt`        | `Heap.Number` | Unix time в миллисекундах или `0`, если не deprecated/retired.                                                         |
| `metadata`            | `Heap.Any`    | JSON-compatible служебные данные без секретов.                                                                         |

Repo: `repos/brokerEventContracts.repo.ts`.

Операции:

- `findByContractKey(ctx, contractKey)` возвращает row или `null`;
- `findByTypeVersion(ctx, eventType, eventVersion)` возвращает row или `null`;
- `findActiveByOwner(ctx, ownerModule)` возвращает active/deprecated contracts владельца;
- `registerManyForOwner(ctx, ownerModule, contracts)` регистрирует/обновляет manifest владельца;
- `assertPublishableContract(ctx, ownerModule, eventType, eventVersion, payload)` возвращает contract row или бросает semantic error.

Contract ownership and versioning:

- каждый BPM-модуль, публикующий события, хранит module-owned manifest в `contracts/brokerEvents.ts`;
- manifest экспортируется из `contracts/brokerEvents.ts` как `BROKER_EVENT_CONTRACTS`;
- manifest регистрируется в core через `/broker/modules/register` вместе с module registry payload или повторно тем же endpoint-ом при изменении каталога событий модуля;
- core не импортирует файлы чужого модуля во время publish и не содержит event-specific TypeScript signatures; `sourceRef` нужен для диагностики, ревью и тестов, а источником runtime-валидации является сохраненный `payloadSchema` snapshot;
- `eventType` принадлежит одному `ownerModule`; повторная регистрация того же `eventType` другим модулем запрещена;
- `eventVersion` монотонно растет внутри одного `eventType`; первая версия равна `1`;
- существующая пара `eventType + eventVersion` immutable: повторная регистрация разрешена только с тем же `schemaHash`; изменение `description`, `display`, `examples`, `metadata`, `sourceRef` и `status` допускается без изменения `schemaHash`;
- любое изменение `payloadSchema`, включая добавление optional field, требует новой `eventVersion`; это убирает спор о backward compatibility из core;
- publish разрешен только для `active` и `deprecated` contracts, а `retired` блокирует новые публикации с этой версией;
- старые `BrokerEvents` продолжают ссылаться на тот `contractKey` и `schemaHash`, с которыми были опубликованы, даже если позже появилась новая версия или старая версия retired;
- потребитель обязан быть готов получить несколько версий одного `eventType` и выбирать handler по `eventType + eventVersion`.

Display summary contract:

- `display.summaryFields` задается только module-owned manifest-ом владельца события в `contracts/brokerEvents.ts`; core не содержит event-specific эвристик и не знает payload-ы sample/производных модулей на уровне кода;
- каждый summary field обязан иметь `path` и человекочитаемый `label`; UI показывает label как основной ключ, а path оставляет для diagnostics/tooltip;
- порядок `summaryFields` является порядком отображения в `BrokerEventSafe.primarySummary`;
- `path` поддерживает dot-path по JSON object/array payload: `message.text`, `chat.id`, `items.0.title`; wildcards, expressions, functions и deep scan не поддерживаются;
- `label` нормализуется trim, ограничивается 1..80 символов; `path` ограничивается 1..160 символов; `maxLength` optional integer `20..500`, default `160`;
- если path отсутствует, ведет к `null`, пустой строке, пустому массиву или пустому объекту, поле не попадает в summary;
- scalar values (`string`, `number`, `boolean`) показываются как есть, строки trim-ятся и усекаются до `maxLength` с признаком `truncated=true`;
- object/array values в summary не раскрываются полностью: показывается compact descriptor `{ kind:'object', keys:number }` или `{ kind:'array', length:number }`;
- summary никогда не включает поля, путь или final segment которых выглядит как secret/noisy key: `token`, `secret`, `password`, `authorization`, `cookie`, `raw`, `headers`, `signature`, `accessToken`, `refreshToken`;
- если `display.summaryFields` отсутствует или после фильтрации не дал ни одного поля, core строит generic fallback: берет до 6 простых top-level scalar fields payload-а, исключая secret/noisy keys, в исходном порядке object keys, с label равным path;
- полный raw payload остается доступен только через auditируемый `POST /api/admin/broker/events/raw`.

Supported `json-schema-subset-v1`:

- `type`: `object`, `array`, `string`, `number`, `integer`, `boolean`, `null`;
- `required`, `properties`, `items`, `additionalProperties`, `enum`, `const`;
- nested objects/arrays допустимы;
- `$ref`, `oneOf`, `anyOf`, `allOf`, custom functions/classes and TypeScript-only types не поддерживаются;
- unknown schema keywords отклоняются при регистрации, чтобы runtime validation была детерминированной.

### 8.5 BrokerSubscriptions

Heap table: `t__neso-meta__broker_subscription__6Vp4Ld`.
Файл: `tables/brokerSubscriptions.table.ts`.

Назначение таблицы - registry того, какие события нужны каждому модулю-потребителю и как их доставлять.

Поля:

| Поле                        | Тип            | Требование                                                                                                                |
| --------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `subscriptionKey`           | `Heap.String`  | Уникальный ключ подписки `<consumerModule>:<name>`, searchable off.                                                       |
| `consumerModule`            | `Heap.String`  | `moduleKey` потребителя.                                                                                                  |
| `displayName`               | `Heap.String`  | Человекочитаемое имя подписки.                                                                                            |
| `enabled`                   | `Heap.Boolean` | Declared-enabled флаг, которым управляет registration payload подписки.                                                   |
| `adminDisabled`             | `Heap.Boolean` | Admin emergency stop. Если true, subscription effective-disabled независимо от `enabled`.                                 |
| `adminDisabledAt`           | `Heap.Number`  | Unix time в миллисекундах или `0`, если admin stop снят.                                                                  |
| `adminDisableReason`        | `Heap.String`  | Последняя активная причина admin stop или пустая строка.                                                                  |
| `sourceModules`             | `Heap.Any`     | Array moduleKey/pattern; пустой массив = любые источники.                                                                 |
| `eventTypes`                | `Heap.Any`     | Array event type/pattern; пустой массив = все разрешенные для потребителя типы.                                           |
| `targetedOnly`              | `Heap.Boolean` | Если true, подписка получает только события, где `targetModules` содержит consumerModule.                                 |
| `notificationMode`          | `Heap.String`  | `none`, `internal`, `socket`, `both`. Уведомления best-effort и не заменяют poll/ack.                                     |
| `notificationHandlerKey`    | `Heap.String`  | Server-only handler key потребителя для `internal`; пустая строка для `none/socket`.                                      |
| `notificationSocketKey`     | `Heap.String`  | Stable socket/channel key для interactive consumers; пустая строка, если не используется.                                 |
| `notificationBatchWindowMs` | `Heap.Number`  | Window coalescing уведомлений `0..60000`, чтобы не слать callback на каждую delivery в бурсте.                            |
| `maxBatchSize`              | `Heap.Number`  | Default poll limit для подписки, нормализуется в `1..broker_max_batch_size`.                                              |
| `ackTimeoutMs`              | `Heap.Number`  | Visibility timeout claimed delivery до повторной выдачи.                                                                  |
| `retryPolicy`               | `Heap.Any`     | Partial или full `{ maxAttempts?, initialDelayMs?, backoffMultiplier? }`; runtime использует normalized effective policy. |
| `createdAt`                 | `Heap.Number`  | Unix time в миллисекундах.                                                                                                |
| `updatedAt`                 | `Heap.Number`  | Unix time в миллисекундах.                                                                                                |
| `metadata`                  | `Heap.Any`     | JSON-compatible служебные данные без секретов.                                                                            |

Repo: `repos/brokerSubscriptions.repo.ts`.

Операции:

- `findBySubscriptionKey(ctx, subscriptionKey)` возвращает row или `null`;
- `findEnabledForConsumer(ctx, consumerModule)` возвращает effective-enabled subscriptions потребителя;
- `findMatching(ctx, event)` возвращает effective-enabled subscriptions, подходящие событию;
- `upsert(ctx, data)` вызывает `createOrUpdateBy(ctx, 'subscriptionKey', data)`.

Subscription lifecycle:

- новая registration создает row с `adminDisabled=false`, `adminDisabledAt=0`, `adminDisableReason=''`;
- повторная registration того же `subscriptionKey` обновляет `consumerModule`, `displayName`, `enabled`, filters, notification policy, batch/retry настройки и `metadata`, но не меняет `adminDisabled`, `adminDisabledAt` и `adminDisableReason`;
- registration выполняется batch-ом через `RegisterBrokerSubscriptionsRequest.subscriptions`; каждый item регистрируется независимо и возвращает per-item result;
- `subscriptionKey` строится core-ом как `${consumerModule}:${name}`, где `consumerModule` задается server-side wrapper-ом, а `name` приходит из item-а запроса;
- если request содержит top-level `consumerModule`, он обязан совпадать с server-side `consumerModule`; иначе registration возвращает `invalid_request`;
- фактическая доступность subscription считается как `effectiveEnabled = enabled && !adminDisabled && consumerModuleEffectiveEnabled`;
- Admin disable сильнее subscription registration: если Admin отключил subscription через broker ops panel, следующий bootstrap/register может обновить ее декларативный контракт, но не может вернуть subscription в effective-enabled состояние;
- при `effectiveEnabled=false` subscription не получает новые deliveries; существующие deliveries остаются durable и обрабатываются только после повторного effective-enable;
- подписки, отсутствующие в новом bootstrap manifest, не удаляются и не выключаются автоматически; отключение выполняется только явным item-ом `enabled:false` или admin toggle.

Retry policy:

- `retryPolicy` в subscription registration может быть неполным объектом; отсутствующие поля дополняются из global defaults `broker_default_retry_max_attempts`, `broker_default_retry_initial_delay_ms`, `broker_default_retry_backoff_multiplier`;
- effective policy нормализуется перед сохранением/использованием: `maxAttempts` integer `0..100`, `initialDelayMs` integer `0..86400000`, `backoffMultiplier` number `1..10`;
- default `backoffMultiplier` равен `2`;
- после explicit fail номер попытки увеличивается на `1`, и если retry еще разрешен, следующий `availableAt` считается как `now + initialDelayMs * backoffMultiplier^(attempts - 1)`;
- `maxAttempts=0` означает, что первая обработка разрешена, но первый explicit fail сразу переводит delivery в `dead_letter` без повторной выдачи;
- consumer logic обязана быть идемпотентной по `eventId`, `deliveryId` или собственному бизнес-ключу, потому что logic failure, lease timeout, повторный poll или ручной requeue могут привести к повторной обработке той же delivery.

Notification policy:

- `none` - потребитель узнает о событиях только через poll;
- если global setting `broker_notification_enabled=false`, notification policy всех подписок эффективно считается `none`: `publishBrokerEvent` не создает `BrokerNotificationAttempts` rows и не планирует dispatch job;
- `internal` - core создает `BrokerNotificationAttempts` row с `mode='internal'`, а отправку выполняет только `jobs/broker/notifications-dispatch.ts`;
- `socket` - core создает `BrokerNotificationAttempts` row с `mode='socket'`, а отправку в Chatium socket/channel выполняет только `jobs/broker/notifications-dispatch.ts`, если такой runtime доступен потребителю;
- `both` - core создает две независимые `BrokerNotificationAttempts` rows: одну `internal`, одну `socket`; failure одного канала не меняет status другого и не отменяет delivery;
- `notificationBatchWindowMs` является per-subscription coalescing window; если item registration не задает `notification.batchWindowMs`, core сохраняет текущий global default `broker_notification_batch_window_ms`;
- `publishBrokerEvent` никогда не вызывает notification handler/socket inline;
- notification payload не содержит `BrokerEvents.payload`, секретов или raw user data; он содержит только hint, что нужно выполнить internal poll.

Internal notification payload:

```ts
{
  type: 'broker.deliveries.available',
  notificationId: string,
  consumerModule: string,
  subscriptionKey: string,
  availableCount: number,
  latestEventType: string,
  latestPublishedAt: number,
  pollContract: 'lib/broker/internalApi.pollBrokerDeliveries'
}
```

Notification handler потребителя должен считать notification недоверенной подсказкой. Даже если handler был вызван повторно, потребитель не получает данные события без последующего server-side `pollBrokerDeliveries(ctx, consumerModule, request)` внутри core broker-а.

Notification coalescing:

- при `notificationBatchWindowMs=0` coalescing отключен: каждый publish создает новую `BrokerNotificationAttempts` row для каждого нужного канала;
- при `notificationBatchWindowMs>0` первая delivery для пары `subscriptionKey + mode + handlerKey` создает pending attempt с `nextAttemptAt = now + notificationBatchWindowMs`;
- последующие deliveries для той же пары до `nextAttemptAt` не создают новую row, а добавляются в существующую pending attempt;
- coalescing допускается только для `status='pending'`; `failed`, `sent` и `skipped` attempts не переиспользуются;
- `deliveryIds` append-ятся с дедупликацией и сохраняют порядок первого появления;
- если `deliveryIds.length` в coalesced attempt достиг `broker_max_batch_size`, следующий publish создает новую pending attempt, даже если окно еще не истекло;
- при append `nextAttemptAt` не сдвигается, чтобы непрерывный поток событий не откладывал notification бесконечно;
- `availableCount` в notification payload считается по текущему числу pending/failed deliveries подписки на момент dispatch, а не только по `deliveryIds` в attempt.

Новая подписка не получает backfill старых событий автоматически. Backfill допускается только отдельным будущим API, чтобы не создавать большие materialized deliveries случайно.

Pattern matching contract:

- broker patterns поддерживают только exact match, глобальный `*` и suffix wildcard вида `namespace.*`;
- `**`, middle wildcard, regexp, escaping и negative patterns не поддерживаются;
- `eventType` и `moduleKey` не могут содержать `*`, пробелы, управляющие символы и пустые сегменты;
- `BrokerModules.allowedPublishTypes=[]` означает publish запрещен;
- `BrokerModules.allowedSubscribeTypes=[]` означает subscribe запрещен;
- `BrokerSubscriptions.sourceModules=[]` означает любой source module, но только после проверки `allowedSubscribeTypes`;
- `BrokerSubscriptions.eventTypes=[]` означает все разрешенные для consumer-а event types;
- `BrokerEvents.targetModules=[]` означает broadcast по matching subscriptions;
- `targetedOnly=true` получает только events, где `targetModules` явно содержит `consumerModule`; broadcast events не попадают в такую подписку.

### 8.6 BrokerEvents

Heap table: `t__neso-meta__broker_event__8Kf2Hn`.
Файл: `tables/brokerEvents.table.ts`.

Назначение таблицы - immutable event log фактов, опубликованных модулями сервиса.

Поля:

| Поле                     | Тип           | Требование                                                                                                         |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `eventId`                | `Heap.String` | Stable generated id `evt_<timestamp>_<random>`, уникальный.                                                        |
| `producerModule`         | `Heap.String` | `moduleKey` публикатора.                                                                                           |
| `eventType`              | `Heap.String` | Dot/kebab namespace, например `sample.note.created` или `sample.task.completed`.                                   |
| `eventVersion`           | `Heap.Number` | Positive integer contract version; publish request обязан указать версию явно.                                     |
| `occurredAt`             | `Heap.Number` | Время факта у источника, Unix ms.                                                                                  |
| `publishedAt`            | `Heap.Number` | `Date.now()` при записи в broker, Unix ms.                                                                         |
| `targetModules`          | `Heap.Any`    | Array moduleKey; пустой массив = broadcast по matching subscriptions.                                              |
| `aggregateType`          | `Heap.String` | Optional business aggregate type; пустая строка, если не применимо.                                                |
| `aggregateId`            | `Heap.String` | Optional business aggregate id; пустая строка, если не применимо.                                                  |
| `correlationId`          | `Heap.String` | Optional trace/correlation id для цепочки событий.                                                                 |
| `causationId`            | `Heap.String` | Optional parent `eventId`.                                                                                         |
| `idempotencyKey`         | `Heap.String` | Optional key от producer-а; уникальность в паре `producerModule + idempotencyKey`.                                 |
| `idempotencyFingerprint` | `Heap.String` | SHA-256 canonical fingerprint publish-запроса для проверки duplicate/conflict; пустая строка без `idempotencyKey`. |
| `payload`                | `Heap.Any`    | JSON-compatible payload события без token/secret/password/authorization/cookie.                                    |
| `contractKey`            | `Heap.String` | `<eventType>@<eventVersion>` из `BrokerEventContracts`.                                                            |
| `schemaHash`             | `Heap.String` | Hash payload schema snapshot, использованный при publish.                                                          |
| `metadata`               | `Heap.Any`    | JSON-compatible служебные данные без секретов.                                                                     |

Repo: `repos/brokerEvents.repo.ts`.

Операции:

- `create(ctx, data)` создает immutable row и не обновляет существующие события;
- `findByEventId(ctx, eventId)` возвращает row или `null`;
- `findByIdempotencyKey(ctx, producerModule, idempotencyKey)` возвращает row или `null`;
- `findRecent(ctx, { producerModule?, eventType?, limit = 100 })` сортирует `publishedAt desc`, limit clamp `1..500`.

Idempotency fingerprint:

- fingerprint считается только если producer передал non-empty `idempotencyKey`;
- fingerprint включает canonical JSON объект `{ eventType, eventVersion, occurredAt, targetModules, aggregateType, aggregateId, correlationId, causationId, payload }`;
- `targetModules` перед hash сортируется как массив строк, чтобы порядок targets не ломал идемпотентность;
- `metadata` не входит в fingerprint, потому что содержит диагностические/служебные поля и не должно менять бизнес-смысл повторной публикации;
- exact duplicate: если `producerModule + idempotencyKey` найден и `idempotencyFingerprint` совпадает, publish возвращает существующий `eventId` без создания новых `BrokerEvents`, `BrokerDeliveries` и `BrokerNotificationAttempts`;
- conflicting duplicate: если key найден, но fingerprint отличается, publish возвращает `{ success:false, code:'invalid_request', error, details:{ reason:'idempotency_fingerprint_conflict', eventId } }` и не создает новых rows.

### 8.7 BrokerDeliveries

Heap table: `t__neso-meta__broker_delivery__5Dw9Rt`.
Файл: `tables/brokerDeliveries.table.ts`.

Назначение таблицы - materialized delivery state: какие события должен опросить и обработать конкретный потребитель.

Поля:

| Поле               | Тип           | Требование                                                                               |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------- |
| `deliveryId`       | `Heap.String` | Stable generated id `dlv_<timestamp>_<random>`, уникальный.                              |
| `eventId`          | `Heap.String` | Ссылка на `BrokerEvents.eventId`.                                                        |
| `subscriptionKey`  | `Heap.String` | Ссылка на `BrokerSubscriptions.subscriptionKey`.                                         |
| `consumerModule`   | `Heap.String` | `moduleKey` потребителя.                                                                 |
| `eventPublishedAt` | `Heap.Number` | Materialized `BrokerEvents.publishedAt` для hot polling sort.                            |
| `eventType`        | `Heap.String` | Materialized `BrokerEvents.eventType`.                                                   |
| `eventVersion`     | `Heap.Number` | Materialized `BrokerEvents.eventVersion`.                                                |
| `contractKey`      | `Heap.String` | Materialized `BrokerEvents.contractKey`.                                                 |
| `schemaHash`       | `Heap.String` | Materialized `BrokerEvents.schemaHash`.                                                  |
| `producerModule`   | `Heap.String` | Materialized `BrokerEvents.producerModule`.                                              |
| `aggregateType`    | `Heap.String` | Materialized `BrokerEvents.aggregateType`.                                               |
| `aggregateId`      | `Heap.String` | Materialized `BrokerEvents.aggregateId`.                                                 |
| `status`           | `Heap.String` | `pending`, `claimed`, `acked`, `failed`, `dead_letter`, `skipped`.                       |
| `attempts`         | `Heap.Number` | Количество явных fail attempts; lease timeout не увеличивает attempts.                   |
| `availableAt`      | `Heap.Number` | Когда delivery снова можно выдавать poll-ом, Unix ms.                                    |
| `claimedAt`        | `Heap.Number` | Время claim или `0`.                                                                     |
| `claimedUntil`     | `Heap.Number` | Visibility deadline claim-а; expired claimed delivery возвращается в poll lazy под lock. |
| `claimTokenHash`   | `Heap.String` | Hash одноразового claim token; raw token возвращается только в poll response.            |
| `lastError`        | `Heap.String` | Безопасная ошибка без stack trace с секретами.                                           |
| `ackedAt`          | `Heap.Number` | Время ack или `0`.                                                                       |
| `createdAt`        | `Heap.Number` | Unix time в миллисекундах.                                                               |
| `updatedAt`        | `Heap.Number` | Unix time в миллисекундах.                                                               |

Repo: `repos/brokerDeliveries.repo.ts`.

Операции:

- `createManyForEvent(ctx, event, subscriptions)` создает pending deliveries для matching subscriptions;
- `findAvailableForConsumer(ctx, consumerModule, { subscriptionKey?, limit })` lazily возвращает expired `claimed` rows в доступное состояние, затем ищет `status=pending` и retry-waiting `status=failed`, `availableAt <= Date.now()`, сортировка `availableAt asc`, `eventPublishedAt asc`, `createdAt asc`;
- `claim(ctx, deliveryIds, claimTokenHash, now, ackTimeoutMs)` переводит `pending`/`failed` rows в `claimed`, ставит `claimedAt=now`, `claimedUntil=now+ackTimeoutMs`;
- `ack(ctx, deliveryId, claimTokenHash)` переводит row в `acked`;
- `fail(ctx, deliveryId, claimTokenHash, error)` увеличивает attempts и переводит row в retry-waiting `failed` с будущим `availableAt` или в `dead_letter`;
- `requeue(ctx, deliveryId, reason)` переводит `failed`/`dead_letter` row в fresh `pending` admin ops action-ом без изменения event payload/hot fields;
- `skip(ctx, deliveryId, reason)` переводит `pending`/`claimed`/`failed` row в `skipped` admin/system action-ом;
- все claim/ack/fail операции выполняются внутри `runWithExclusiveLock`.

Allowed status transitions:

- `pending -> claimed`;
- `failed -> claimed` после `availableAt <= Date.now()`;
- `claimed -> acked`;
- `claimed -> failed` при retryable explicit fail;
- `claimed -> dead_letter` при exhausted/non-retryable explicit fail;
- `claimed -> pending` при lease timeout;
- `failed/dead_letter -> pending` через admin requeue;
- `pending/claimed/failed -> skipped` только internal admin/system action.

Retry state semantics:

- `failed` не означает финальную поломку delivery; это retry-waiting state до `availableAt`;
- `failed` row с `availableAt > Date.now()` недоступна для `poll`;
- после `availableAt <= Date.now()` `pollBrokerDeliveries` может напрямую перевести delivery `failed -> claimed` без промежуточного `failed -> pending`;
- повторный claim после retry заменяет `claimTokenHash`, `claimedAt`, `claimedUntil` и `updatedAt` новыми значениями;
- `attempts` при retry claim сохраняется и увеличивается только при следующем explicit `fail`;
- `lastError` при retry claim сохраняется как диагностика последней ошибки и очищается только admin requeue/skip или отдельной явно описанной операцией.

Admin requeue semantics:

- requeue разрешен только для `status=failed` и `status=dead_letter`; остальные статусы возвращают `delivery_not_requeueable`;
- requeue для `failed` и `dead_letter` работает одинаково и считается fresh retry той же durable delivery;
- requeue ставит `status='pending'`;
- requeue ставит `availableAt=now`, чтобы delivery стала доступна ближайшему `poll`;
- requeue сбрасывает `attempts=0`, `lastError=''`, `claimTokenHash=''`, `claimedAt=0`, `claimedUntil=0`, `ackedAt=0`;
- requeue обновляет только служебные поля retry/claim lifecycle и `updatedAt`;
- requeue не меняет `deliveryId`, `eventId`, `subscriptionKey`, `consumerModule`, materialized event hot fields, `createdAt`, `BrokerEvents.payload` или `BrokerEvents.metadata`;
- причина requeue и снимок `before/after` сохраняются в `BrokerOpsAudit`; `BrokerDeliveries.lastError` после requeue остается пустым.

Admin skip semantics:

- skip разрешен для `status=pending`, `status=claimed`, `status=failed` и `status=dead_letter`;
- skip запрещен для `status=acked` и уже `status=skipped`; такие запросы возвращают `delivery_not_skippable`;
- skip считается terminal operator stop для конкретной delivery и не удаляет event/payload;
- skip ставит `status='skipped'`, `availableAt=0`, `lastError='skipped_by_admin'`, `ackedAt=0`;
- skip claimed delivery аннулирует active claim: `claimTokenHash=''`, `claimedAt=0`, `claimedUntil=0`; последующий ack/fail старым claim token должен вернуть `delivery_not_claimed`;
- skip pending/failed/dead_letter также очищает `claimTokenHash`, `claimedAt`, `claimedUntil`;
- skip сохраняет `attempts` как диагностический счетчик уже произошедших explicit fail attempts;
- skip обновляет только служебные поля delivery lifecycle и `updatedAt`;
- skip не меняет `deliveryId`, `eventId`, `subscriptionKey`, `consumerModule`, materialized event hot fields, `createdAt`, `BrokerEvents.payload` или `BrokerEvents.metadata`;
- причина skip и снимок `before/after` сохраняются в `BrokerOpsAudit`; `BrokerDeliveries.lastError` содержит только safe marker `skipped_by_admin`, не raw reason.

### 8.8 BrokerNotificationAttempts

Heap table: `t__neso-meta__broker_notification_attempt__2Ps8Na`.
Файл: `tables/brokerNotificationAttempts.table.ts`.

Назначение таблицы - audit best-effort notification attempts. Записи уведомлений помогают диагностировать, почему потребитель не получил wake-up, но не являются очередью доставки событий.

Поля:

| Поле              | Тип           | Требование                                                                                                            |
| ----------------- | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `notificationId`  | `Heap.String` | Stable generated id `ntf_<timestamp>_<random>`, уникальный.                                                           |
| `consumerModule`  | `Heap.String` | `moduleKey` потребителя.                                                                                              |
| `subscriptionKey` | `Heap.String` | Подписка, для которой появились deliveries.                                                                           |
| `deliveryIds`     | `Heap.Any`    | Array delivery ids, из-за которых создан notification hint; payload событий не включается.                            |
| `mode`            | `Heap.String` | `internal` или `socket`.                                                                                              |
| `handlerKey`      | `Heap.String` | Для `mode='internal'` копия `notificationHandlerKey`, для `mode='socket'` копия `notificationSocketKey`; без secrets. |
| `status`          | `Heap.String` | `pending`, `sent`, `failed`, `skipped`.                                                                               |
| `attempts`        | `Heap.Number` | Количество попыток отправки уведомления.                                                                              |
| `nextAttemptAt`   | `Heap.Number` | Когда можно повторить failed/pending notification, Unix ms.                                                           |
| `lastError`       | `Heap.String` | Безопасная ошибка без secret/token/header values.                                                                     |
| `createdAt`       | `Heap.Number` | Unix time в миллисекундах.                                                                                            |
| `updatedAt`       | `Heap.Number` | Unix time в миллисекундах.                                                                                            |

Repo: `repos/brokerNotificationAttempts.repo.ts`.

Операции:

- `create(ctx, data)` создает notification attempt и не отправляет network request сам;
- `findCoalescable(ctx, { consumerModule, subscriptionKey, mode, handlerKey, now })` возвращает pending attempt той же пары с `nextAttemptAt > now` и `deliveryIds.length < broker_max_batch_size` или `null`;
- `appendDeliveries(ctx, notificationId, deliveryIds)` добавляет delivery ids в pending attempt с dedupe и без сдвига `nextAttemptAt`;
- `findPending(ctx, { limit = 100 })` возвращает `status=pending|failed`, `nextAttemptAt <= Date.now()`;
- `markSent(ctx, notificationId)` ставит `status=sent`;
- `markFailed(ctx, notificationId, error, nextAttemptAt)` увеличивает `attempts`, ставит `status=failed` и задает следующий `nextAttemptAt`;
- `markSkipped(ctx, notificationId, reason)` ставит `skipped`, если notificationMode выключен, handlerKey invalid или delivery уже acked.

Для `notificationMode='both'` создаются две независимые rows с разными `notificationId`: `mode='internal'` и `mode='socket'`. Retry, attempts, `lastError` и final status считаются отдельно по каждому каналу.

Notification attempts не содержат event payload. Если потребителю нужны данные, он обязан выполнить `poll`.

Notification lifecycle:

- `pending` означает, что hint еще не отправлялся и может быть выбран dispatch job после `nextAttemptAt <= Date.now()`;
- `failed` означает, что предыдущая отправка hint-а завершилась ошибкой, но retry еще разрешен после `nextAttemptAt <= Date.now()`;
- `sent` означает успешную отправку hint-а и является финальным статусом;
- `skipped` означает, что core больше не будет отправлять этот hint автоматически; это финальный статус notification attempt, но не delivery;
- если `broker_notification_enabled=false` в момент publish, `BrokerNotificationAttempts` rows не создаются;
- если `broker_notification_enabled=false` во время dispatch, job не отправляет selected `pending/failed` attempts, а помечает их `skipped` с `lastError='notification_disabled'`;
- `attempts` увеличивается только перед реальной попыткой отправить internal/socket hint; skip без отправки не увеличивает `attempts`;
- `broker_notification_max_attempts` считает реальные попытки отправки hint-а;
- если `broker_notification_max_attempts=0`, selected attempt сразу получает `status='skipped'`, `lastError='max_attempts_zero'` и не отправляется;
- после failed send dispatch job увеличивает `attempts`; если новое значение `attempts < broker_notification_max_attempts`, attempt получает `status='failed'`, safe `lastError` и `nextAttemptAt = now + broker_notification_retry_delay_ms`;
- если failed send исчерпал лимит `attempts >= broker_notification_max_attempts`, attempt получает `status='skipped'` и safe `lastError`;
- exhausted/skipped notification не меняет `BrokerDeliveries.status` и не откатывает publish;
- manual `retryBrokerNotifications` разрешен только для `status=failed|skipped`, global notifications enabled и валидного `handlerKey`; он сбрасывает `attempts=0`, `status='pending'`, `nextAttemptAt=now`, очищает `lastError` и планирует dispatch job;
- `retryBrokerNotifications` возвращает `notification_not_retryable` для `sent`, уже `pending`, global disabled, invalid handlerKey или неизвестного mode.

### 8.9 BrokerOpsAudit

Heap table: `t__neso-meta__broker_ops_audit__7Rt8Lm`.
Файл: `tables/brokerOpsAudit.table.ts`.

Назначение таблицы - append-only audit log admin broker ops actions and raw payload views.

Поля:

| Поле          | Тип           | Требование                                                                                                                                |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `auditId`     | `Heap.String` | Stable generated id `boa_<timestamp>_<random>`, уникальный.                                                                               |
| `action`      | `Heap.String` | `raw_payload_view`, `module_toggle`, `subscription_toggle`, `notification_retry`, `delivery_requeue`, `delivery_skip`.                    |
| `targetType`  | `Heap.String` | `event`, `module`, `subscription`, `notification`, `notification_bulk`, `delivery`.                                                       |
| `targetId`    | `Heap.String` | `eventId`, `moduleKey`, `subscriptionKey`, `notificationId`, `deliveryId` или stable bulk id вроде `notification_retry_bulk:<timestamp>`. |
| `adminUserId` | `Heap.String` | Stable user id/string из `ctx.user`; пустая строка запрещена.                                                                             |
| `reason`      | `Heap.String` | Причина действия; обязательна для mutating ops, optional для raw payload view.                                                            |
| `before`      | `Heap.Any`    | Safe snapshot состояния до действия без raw payload/secrets.                                                                              |
| `after`       | `Heap.Any`    | Safe snapshot состояния после действия без raw payload/secrets.                                                                           |
| `createdAt`   | `Heap.Number` | Unix time в миллисекундах.                                                                                                                |
| `metadata`    | `Heap.Any`    | JSON-compatible служебные данные без secrets.                                                                                             |

Repo: `repos/brokerOpsAudit.repo.ts`.

Операции:

- `create(ctx, data)` append-only создает audit row;
- `findRecent(ctx, { action?, targetType?, targetId?, limit = 100 })` сортирует `createdAt desc`, limit clamp `1..500`;
- audit rows не удаляются admin ops routes.

## 9. Настройки

Ключи и значения по умолчанию задаются в `lib/settings.lib.ts`.

| Key                                       | Default                      | Нормализация/валидация                                                                             |
| ----------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `project_name`                            | `NESO Meta`                  | На save приводится к string и `trim()`.                                                            |
| `project_title`                           | `NESO Meta`                  | На save приводится к string и `trim()`.                                                            |
| `log_level`                               | `Info`                       | Только `Debug`, `Info`, `Warn`, `Error`, `Disable`.                                                |
| `logs_limit`                              | `100`                        | Parse positive integer; на save допустимо `1..10000`, хранится строкой.                            |
| `log_webhook`                             | `{ enable: false, url: '' }` | Объект; `enable` boolean, `url` string.                                                            |
| `dashboard_reset_at`                      | `null`                       | На чтение `null/invalid` дает `0`; на save требуется неотрицательное число, хранится `Math.floor`. |
| `broker_enabled`                          | `true`                       | Boolean. Если false, publish/poll/ack/fail возвращают semantic error.                              |
| `broker_max_batch_size`                   | `100`                        | Integer `1..500`, верхняя граница poll batch.                                                      |
| `broker_default_ack_timeout_ms`           | `300000`                     | Integer `10000..3600000`, visibility timeout claimed deliveries по умолчанию.                      |
| `broker_default_retry_max_attempts`       | `5`                          | Integer `0..100`, после превышения delivery уходит в `dead_letter`.                                |
| `broker_default_retry_initial_delay_ms`   | `60000`                      | Integer `0..86400000`, начальная задержка retry.                                                   |
| `broker_default_retry_backoff_multiplier` | `2`                          | Number `1..10`, множитель exponential backoff для retry delivery.                                  |
| `broker_notification_enabled`             | `true`                       | Boolean. Глобально включает best-effort notifications.                                             |
| `broker_notification_timeout_ms`          | `5000`                       | Integer `1000..30000`, timeout internal notification handler.                                      |
| `broker_notification_max_attempts`        | `3`                          | Integer `0..20`, max попыток отправки notification hint.                                           |
| `broker_notification_retry_delay_ms`      | `60000`                      | Integer `0..86400000`, задержка перед повторной отправкой failed notification hint.                |
| `broker_notification_batch_window_ms`     | `1000`                       | Integer `0..60000`, default coalescing window уведомлений.                                         |

Runtime-использование настроек:

- `project_name` используется SSR entrypoints для `<title>`, Header `projectTitle` и `AdminSettings`.
- `project_title` присутствует как шаблонная настройка и проверяется интеграционными тестами, но текущие SSR entrypoints не читают его для UI.
- `log_level` используется серверным `logger.lib`, клиентским `window.__BOOT__.logLevel`, `AdminSettings` и всеми log sinks.
- `logs_limit` нормализуется `settings.lib.getLogsLimit`, но текущие API истории логов используют query `limit` и не читают `logs_limit`.
- `log_webhook` используется только `writeServerLog`.
- `dashboard_reset_at` используется `dashboard.lib` для счетчиков после сброса.
- `broker_enabled`, `broker_max_batch_size`, `broker_default_*`, `broker_notification_*` используются только server-side broker libs и не попадают в клиентский boot.

`getSetting(ctx, key)` возвращает:

- row value, если row найден и `value` не `undefined/null`;
- default для известного key;
- `null` для неизвестного key без row.

`setSetting(ctx, key, value)`:

- валидирует известные ключи;
- неизвестные ключи сохраняет как есть;
- пишет через `settings.repo.upsert`;
- логирует вход/ветку/выход, кроме функций, вызываемых из `logger.lib`.

Дополнительные контракты `settings.lib`:

- `SETTING_KEYS` содержит ключи из таблицы выше, включая broker settings.
- `SECRET_SETTING_KEYS` пустой в шаблоне; модульные секреты добавляются в конкретном производном проекте.
- `LOG_LEVELS` строго `['Debug', 'Info', 'Warn', 'Error', 'Disable']`.
- `getSettingString(ctx, key)` возвращает row value, если это string; иначе `String(DEFAULTS[key] ?? '')`.
- `getLogLevel(ctx)` возвращает только значение из `LOG_LEVELS`; invalid/unknown fallback - `Info`.
- `getLogsLimit(ctx)` принимает positive finite number или `parseInt(string, 10) > 0`; иначе возвращает `100`.
- `getLogWebhook(ctx)` возвращает объект `{ enable:boolean, url:string }`; invalid value заменяется default `{ enable:false, url:'' }`.
- `getDashboardResetAt(ctx)` возвращает `Math.floor(value)`, если value finite number `>=0`; иначе `0`.
- `getAllSettings(ctx)` возвращает объект defaults plus Heap rows, где row с `value !== undefined && value !== null` перекрывает default.
- `getRawSecretSettingString(ctx, key)` является server-only helper-ом для future module secrets; в базовом шаблоне без `SECRET_SETTING_KEYS` вызов для любого key отклоняется.
- `setSetting(LOG_LEVEL)` принимает только exact `Debug`, `Info`, `Warn`, `Error`, `Disable`; lowercase нормализуется не здесь, а в `api/settings/save`.
- `setSetting(LOGS_LIMIT)` хранит строку нормализованного positive integer и запрещает результат вне `1..10000`.
- `setSetting(PROJECT_NAME|PROJECT_TITLE)` приводит значение к string и `trim()`.
- `setSetting(LOG_WEBHOOK)` требует object, затем нормализует `enable` к boolean with fallback `false`, `url` к string with fallback `''`.
- `setSetting(DASHBOARD_RESET_AT)` требует finite non-negative number-like value and stores `Math.floor`.
- `setSetting(BROKER_ENABLED|BROKER_NOTIFICATION_ENABLED)` нормализует boolean.
- `setSetting(BROKER_MAX_BATCH_SIZE)` нормализует integer `1..500`.
- `setSetting(BROKER_DEFAULT_ACK_TIMEOUT_MS)` нормализует integer `10000..3600000`.
- `setSetting(BROKER_DEFAULT_RETRY_MAX_ATTEMPTS)` нормализует integer `0..100`.
- `setSetting(BROKER_DEFAULT_RETRY_INITIAL_DELAY_MS)` нормализует integer `0..86400000`.
- `setSetting(BROKER_DEFAULT_RETRY_BACKOFF_MULTIPLIER)` нормализует number `1..10`.
- `setSetting(BROKER_NOTIFICATION_TIMEOUT_MS)` нормализует integer `1000..30000`.
- `setSetting(BROKER_NOTIFICATION_MAX_ATTEMPTS)` нормализует integer `0..20`.
- `setSetting(BROKER_NOTIFICATION_RETRY_DELAY_MS)` нормализует integer `0..86400000`.
- `setSetting(BROKER_NOTIFICATION_BATCH_WINDOW_MS)` нормализует integer `0..60000`.

Broker settings validation rules:

- `getAllSettings(ctx)` возвращает все broker settings из таблицы defaults, даже если соответствующих rows еще нет в Heap;
- `POST /api/settings/save` и `settings.lib.setSetting` используют одинаковую normalization/validation модель для broker settings;
- boolean broker settings (`broker_enabled`, `broker_notification_enabled`) принимают только реальные boolean `true`/`false`; строки `'true'`, `'false'`, числа, пустые строки, `null`, arrays и objects отклоняются;
- integer broker settings (`broker_max_batch_size`, `broker_default_ack_timeout_ms`, `broker_default_retry_max_attempts`, `broker_default_retry_initial_delay_ms`, `broker_notification_timeout_ms`, `broker_notification_max_attempts`, `broker_notification_retry_delay_ms`, `broker_notification_batch_window_ms`) принимают integer number или integer string;
- integer broker settings отклоняют decimal strings вроде `'2.5'`, decimal numbers, `NaN`, `Infinity`, пустые строки, objects и значения вне своего диапазона;
- number broker settings (`broker_default_retry_backoff_multiplier`) принимают finite number или numeric string, включая decimal values вроде `2.5` и `'2.5'`;
- number broker settings отклоняют `NaN`, `Infinity`, пустые строки, objects и значения вне своего диапазона;
- validation failure возвращает settings/API validation error и не создает/не обновляет Heap row.

## 10. Логирование

### 10.1 Severity и log level

Syslog severity:

| Severity | Level       |
| -------- | ----------- |
| `0`      | `emergency` |
| `1`      | `alert`     |
| `2`      | `critical`  |
| `3`      | `error`     |
| `4`      | `warning`   |
| `5`      | `notice`    |
| `6`      | `info`      |
| `7`      | `debug`     |

Порог настроек:

| `log_level` | Max severity | Что проходит |
| ----------- | ------------ | ------------ |
| `Disable`   | `-1`         | Ничего.      |
| `Error`     | `3`          | `0..3`.      |
| `Warn`      | `4`          | `0..4`.      |
| `Info`      | `6`          | `0..6`.      |
| `Debug`     | `7`          | `0..7`.      |

Лог проходит, если `severity >= 0 && severity <= maxSeverity`.

`logger.lib.shouldLogByLevel(configuredLevel, messageSeverity)` и `shared/logger.shouldLog(severity)` обязаны использовать одну и ту же матрицу порогов. Значения severity за пределами `0..7` не логируются клиентским logger-ом; серверный `writeServerLog` фильтрует по фактическому `entry.severity`, но имя level для вывода clamped в `0..7`.

### 10.2 Серверный pipeline

Единый вход: `writeServerLog(ctx, { severity, message, payload? })`.

При проходе порога функция обязана:

1. Вычислить `timestamp = Date.now()` и `level`.
2. Отформатировать строку `[DD.MM.YYYY HH:mm:ss.SSS] [LEVEL] message`.
3. Записать в `ctx.log` только formatted message.
4. Записать в `ctx.account.log(formattedMessage, { level, json })`, где `json.message` всегда содержит исходное message.
5. Записать в Heap `logs`.
6. Отправить WebSocket-событие `{ type: 'new-log', data: LogEntry }` на `getAdminLogsSocketId(ctx)`.
7. Если включен `log_webhook`, отправить fire-and-forget POST.

Payload policy:

- при `Debug` object payload включается в `ctx.account.log(..., { json })` как поля объекта плюс `message`; non-object payload в `ctx.account.log` не разворачивается, но сохраняется ниже;
- при `Debug` payload включается в Heap, WebSocket и webhook;
- при `Info`, `Warn`, `Error` payload не включается: `ctx.account.log` получает `json: { message }`, Heap получает `payload=null`, WebSocket получает `args=[message]`, webhook получает `{ severity, message, timestamp, level }`;
- object payload для Heap сериализуется через `JSON.stringify`, чтобы не получить `[object Object]`;
- string payload для Heap сохраняется строкой;
- отсутствующий payload сохраняется как `null`.

Маппинг `ctx.account.log` level:

| Severity      | Account level |
| ------------- | ------------- |
| `0`, `1`, `2` | `fatal`       |
| `3`           | `error`       |
| `4`           | `warn`        |
| `5`, `6`      | `info`        |
| `7`           | `debug`       |

`getAdminLogsSocketId(ctx)` возвращает стабильный `admin-logs-2f5b8c91`. Перед передачей на клиент он кодируется через `genSocketId`.

Webhook:

- key `log_webhook`;
- если `enable === true` и `url.trim() !== ''`, URL без схемы получает префикс `https://`;
- метод `POST`;
- body `{ log: { severity, message, timestamp, level, ...payloadPolicy } }`;
- `throwHttpErrors: false`, timeout 10000 ms;
- ошибка webhook не ломает пользовательский request.

### 10.3 Клиентский logger

Файл: `shared/logger.ts`.

Клиент обязан читать `window.__BOOT__.logLevel`; если `window` отсутствует или значение мусорное, применяется `Info`; `-1`, `'-1'` и `LOG_LEVEL_OFF` означают `Disable`.

Экспортируются:

- `LOG_LEVEL_OFF = -1`;
- `SYSLOG_SEVERITY`;
- `shouldLog(severity)`;
- `setLogSink(sink | null)`;
- `logEmergency`, `logAlert`, `logCritical`, `logError`, `logWarning`, `logNotice`, `logInfo`, `logDebug`;
- alias `logWarn = logWarning`;
- `createComponentLogger(componentName)`.

При `Debug` logger передает в console и sink все args. При остальных уровнях оставляет только string args, чтобы payload не утекал в non-debug режим.

`shared/logger.ts` хранит native console до возможного патча `browserRemoteLogger`, чтобы собственные log-функции не зацикливались через перехваченный console. `setLogSink` может вызвать `logDebug` о смене sink; ошибка sink проглатывается и не должна ломать console.

`createComponentLogger(name)` обязан префиксовать все записи первым аргументом `[name]`.

### 10.4 Browser remote logger

Файл: `shared/browserRemoteLogger.ts`.

Remote logger обязан:

- патчить `console.log/info/warn/error/debug`;
- сохранять исходный console и восстанавливать его при teardown;
- перехватывать `window.onerror` и `unhandledrejection`;
- принимать sink entries через `pushSinkEntry`;
- буферизовать логи;
- отправлять batch каждые 2500 ms или при достижении 50 записей;
- хранить максимум 400 записей в буфере, отбрасывая самые старые;
- обрезать client message до 11000 символов;
- включать `clrtUid`, если `window.clrtUid` задан.

Severity для перехваченного console:

| Method                | Severity |
| --------------------- | -------- |
| `error`               | `3`      |
| `warn`                | `4`      |
| `debug`               | `7`      |
| `log`, `info`, другое | `6`      |

`window.onerror` и `unhandledrejection` отправляются как severity `3`, `channel='console'`, methods `window.onerror` и `unhandledrejection`. `pushSinkEntry` отправляет `channel='sink'`, `method=entry.level`. `flush()` не бросает наружу сетевые ошибки. `teardown()` восстанавливает console, `window.onerror`, снимает `unhandledrejection` listener и запускает финальный async flush. Listener `pagehide` добавляется при install и не снимается отдельно.

Payload POST:

```ts
{
  clrtUid?: string | null,
  entries: Array<{
    severity: number,
    message: string,
    timestamp: number,
    channel: 'console' | 'sink',
    method?: string
  }>
}
```

### 10.5 Log stream UI

Файлы: `shared/useLogStream.ts`, `shared/logStreamUtils.ts`, `shared/logStreamSocket.ts`.

Нормативное поведение:

- `start()` без `encodedLogsSocketId` ничего не делает, кроме текущего состояния composable; история не загружается;
- история загружается через `GET /api/admin/logs/recent` с `limit=50` только при наличии `encodedLogsSocketId`;
- догрузка использует `GET /api/admin/logs/before` с `beforeTimestamp=<oldest>` и `limit=50`;
- клиент хранит максимум 500 записей;
- отображение сортируется свежими сверху;
- при смене фильтра список очищается и история загружается заново;
- clear очищает локальный список, ставит `oldestLogTimestamp = Date.now()`, `logsHasMore = true`;
- WebSocket поднимается только при наличии `encodedLogsSocketId`;
- online/visibility возвращают попытку переподключения;
- offline или disconnect переводят индикатор в disconnected state;
- ошибки socket/listen не должны ломать страницу.

Дополнительные правила `useLogStream`:

- `selectedLogStream` по умолчанию `all`;
- при фильтре `all` query `severities` не передается;
- `currentLogCount` считает только хранимые `logEntries`, без date divider-ов;
- `displayedLogs` строится через `buildDisplayedLogs`, сортирует записи по `timestamp desc` и вставляет date divider при смене календарного дня;
- `loadMoreLogs()` без `oldestLogTimestamp` не делает запрос и пишет warning;
- параллельные/устаревшие запросы отбрасываются через `logsRequestId`;
- `ingestLocalEntry` всегда вызывает `onEntry` до фильтрации отображения;
- `ingestSocketEntry` при `dedupSocketEcho=true` пропускает записи, где payload выглядит как `{ source:'browser', channel:'sink' }`;
- `toggleExpandCollapseAllLogs()` работает только по строкам типа `log`, не по date divider-ам;
- `stop()` снимает browser listeners, socket lifecycle listeners, subscription listener и subscription `unsubscribe`.

Фильтры:

| Stream  | Severities        | Label            |
| ------- | ----------------- | ---------------- |
| `all`   | `0,1,2,3,4,5,6,7` | `Весь поток`     |
| `info`  | `5,6,7`           | `Инфо`           |
| `warn`  | `4`               | `Предупреждения` |
| `error` | `0,1,2,3`         | `Ошибки`         |

### 10.6 Remote logging composable

Файл: `shared/useRemoteLogging.ts`.

`useRemoteLogging({ enabled = true, onLocalEntry? })`:

- на mount при `enabled=true` создает `createBrowserRemoteLogger({ post: payload => postBrowserLogsRoute.run(ctx, payload) })`;
- устанавливает console/global handlers;
- регистрирует `setLogSink`, который сначала вызывает `onLocalEntry(entry)`, затем `browserRemoteLogger.pushSinkEntry(entry)`;
- на unmount при `enabled=true` вызывает `setLogSink(null)` и `browserRemoteLogger.teardown()`;
- не делает отдельный pre-unmount `flush`; финальный flush выполняется внутри `teardown`;
- при `enabled=false` не трогает console, sink и API.

## 11. API contracts

Реальный URL каждого API равен `/${PROJECT_ROOT}` плюс путь ниже. Все обычные HTTP semantic errors возвращаются JSON с `success: false` и `error`, кроме auth, где управление у платформенного auth helper. Broker internal/admin contracts используют расширенный формат `{ success:false, code:string, error:string, details?:Record<string, unknown> }`.

Все route-файлы ниже являются file-based route entrypoints с `app.get('/', ...)` или `app.post('/', ...)`. Клиентские Vue-компоненты вызывают их через импортированные `route.run(ctx, body?)` или `route.query(query).run(ctx)`; при таком использовании контракт ответа такой же, как у HTTP-вызова.

Auth:

- `Admin` = первая исполняемая строка handler-а `requireAccountRole(ctx, 'Admin')`;
- `AnyUser` = первая исполняемая строка handler-а `requireAnyUser(ctx)`;
- guest-запрос к AnyUser/Admin API не обязан возвращать JSON из этого раздела, потому что ответ формирует платформенный auth helper.

### 11.1 Settings

| Method/path                     | Auth  | Request                                | Success response                                       | Validation errors                                |
| ------------------------------- | ----- | -------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| `GET /api/settings/list`        | Admin | none                                   | `{ success: true, settings: Record<string, unknown> }` | Catch: `{ success:false, error:String(error) }`. |
| `GET /api/settings/get?key=...` | Admin | query `key: string`                    | `{ success:true, key, value }`                         | `Параметр key обязателен`; catch string.         |
| `POST /api/settings/save`       | Admin | body `{ key: string, value: unknown }` | `{ success:true, key, value: saved }`                  | `Поле key обязательно`; lib validation errors.   |

`POST /api/settings/save` нормализует `log_level`:

| Input                           | Stored    |
| ------------------------------- | --------- |
| `-1`, `0`, `disable`, `Disable` | `Disable` |
| `1`, `info`, `Info`             | `Info`    |
| `2`, `warn`, `Warn`             | `Warn`    |
| `3`, `error`, `Error`           | `Error`   |
| `4`, `debug`, `Debug`           | `Debug`   |

Пустая строка `log_level` передается как `Info`.

Для `POST /api/settings/save` пустой/отсутствующий/non-string `key` возвращает `{ success:false, error:'Поле key обязательно' }`. Для известных ключей дальнейшая нормализация и validation выполняются `settings.lib.setSetting`; unknown key сохраняется как есть.

Для broker settings `POST /api/settings/save` обязан возвращать тот же normalized `value`, который сохранен `settings.lib.setSetting`, и обязан не писать Heap row при validation failure. API не вводит отдельные coercion rules поверх раздела 9: boolean строки не превращаются в boolean, decimal strings для integer settings отклоняются, а decimal strings для `broker_default_retry_backoff_multiplier` принимаются как number.

В базовом шаблоне `SECRET_SETTING_KEYS` пустой. Если производный модуль добавляет secret setting, generic settings API обязан возвращать только `{ configured:boolean }` и не отдавать raw secret в list/get/save responses, SSR props, browser boot, logs, broker payload/metadata или notification payload.

### 11.2 Logger

| Method/path                | Auth    | Request                                                     | Success response                   | Validation errors                                                               |
| -------------------------- | ------- | ----------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `POST /api/logger/log`     | AnyUser | `{ message: string, severity?: number, payload?: unknown }` | `{ success:true }`                 | `Поле message обязательно`; catch string.                                       |
| `POST /api/logger/browser` | AnyUser | browser batch payload                                       | `{ success:true, written:number }` | `entries` must be non-empty array; max 80 entries; invalid entries are skipped. |

`POST /api/logger/log` clamps numeric severity into `0..7`, default `6`. Empty/blank message is rejected.

`POST /api/logger/log` преобразует non-string `message` через `String(body.message ?? '')`, затем trim. `payload` передается в `writeServerLog` без route-level validation и попадает в выходы только при текущем `log_level=Debug`.

`POST /api/logger/browser`:

- accepts at most 80 entries per request;
- truncates each accepted message to 12000 chars;
- returns `{ success:false, error:'Поле entries должно быть непустым массивом' }`, если `entries` отсутствует, не массив или пустой массив;
- returns `{ success:false, error:'Не более 80 записей за запрос' }`, если `entries.length > 80`;
- skips entries with invalid severity, invalid object shape or blank message;
- clamps numeric severity into `0..7`;
- uses `Date.now()` when entry `timestamp` is absent/invalid;
- coerces non-string `clrtUid` to string, while `null/undefined` become `null`;
- defaults missing/blank `channel` to `console`;
- writes accepted entries as `[browser:<channel>[:method]] <message>`;
- payload contains `{ source:'browser', clrtUid, channel, method, clientTimestamp }`.

### 11.3 Broker

Broker обслуживает event-driven обмен модулей как internal server-side контур. Module-facing HTTP endpoints отсутствуют: внешние пользователи, browser/Vue и публичные интеграции не могут напрямую publish/poll/ack/fail broker events. Наружу смотрят только интерфейсные модули сервиса, а они уже вызывают broker из server-side кода.

Internal contracts регистрируются через `app.function()` в `functions/broker/*`. Handler-ы тонкие: принимают typed params, получают `callerInfo`, добавляют audit context и вызывают реализацию из `lib/broker/internalApi.lib.ts`. Для межмодульного вызова используется только `@app/app.runAppFunction(ctx, targetApp, path, params)`, не `runAppFunctionInCurrentAccount`, не `request`, не `fetch` и не обычный HTTP route `.run(ctx)`.

Caller-side wrapper является обязательной частью интеграции любого BPM-модуля с broker-ом. Канонический путь wrapper-а внутри модуля: `lib/broker/coreBrokerClient.lib.ts`. Wrapper живет в server-only слое модуля-потребителя/публикатора, импортирует `runAppFunction`, берет `targetApp` из `PROJECT_ROOT` core-проекта (`p/units/neso/meta/core/config/routes.tsx`) и берет `producerModule`/`consumerModule` из `PROJECT_ROOT` своего модуля. Для `app.function` вызовов не используются `getFullUrl`, `route.url()` и HTTP URL: `targetApp` - это project root/slug core, а function path - один из `/broker/*`. Wrapper предоставляет узкие generic методы `registerCoreBrokerModule`, `publishCoreBrokerEvent`, `pollCoreBrokerDeliveries`, `ackCoreBrokerDeliveries`, `failCoreBrokerDeliveries`, `registerCoreBrokerSubscription`. Event-specific typed helpers живут в модуле-владельце события и вызывают generic wrapper, core не содержит signatures конкретных событий. В прикладной бизнес-логике запрещены прямые вызовы `runAppFunction` к broker-у: это нужно, чтобы module identity, базовый путь core и contracts оставались в одном контролируемом месте.

Broker semantic error result:

```ts
{ success:false, code:string, error:string, details?:Record<string, unknown> }
```

Для broker internal functions и admin broker routes `code` является машинным контрактом. UI, tests и callers не парсят `error`; человекочитаемый `error` можно менять без смены контракта. Field-level details, bounds, invalid fields, ids and reasons передаются через `details`.

Auth errors не нормализуются этим контрактом: `requireAccountRole`/`requireAnyUser` остаются платформенным control-flow Chatium.

Stable broker error codes:

| Code                          | Значение                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid_request`             | Некорректное тело запроса, отсутствующее поле, неверный type/value, конфликт idempotency или недопустимая операция без более точного broker code. |
| `invalid_filter`              | Некорректные diagnostics/list filters, limit, status или query-параметры.                                                                         |
| `not_found`                   | Generic entity not found, когда более точный code не требуется caller-у.                                                                          |
| `broker_disabled`             | Broker глобально выключен настройкой `broker_enabled=false`.                                                                                      |
| `module_not_registered`       | Module key отсутствует в `BrokerModules`.                                                                                                         |
| `module_disabled`             | Module зарегистрирован, но effective-disabled.                                                                                                    |
| `forbidden_event_type`        | Module не имеет права publish/subscribe requested event type по allowed patterns.                                                                 |
| `subscription_not_registered` | Subscription key отсутствует в `BrokerSubscriptions`.                                                                                             |
| `subscription_disabled`       | Subscription зарегистрирована, но effective-disabled.                                                                                             |
| `contract_not_registered`     | `eventType + eventVersion` отсутствует в `BrokerEventContracts`.                                                                                  |
| `contract_owner_mismatch`     | Contract принадлежит другому owner module.                                                                                                        |
| `contract_version_conflict`   | Повторная регистрация существующей версии пытается изменить immutable `payloadSchema`/`schemaHash`.                                               |
| `contract_retired`            | Publish запрещен, потому что contract version имеет status `retired`.                                                                             |
| `invalid_contract_schema`     | Module регистрирует unsupported/invalid `json-schema-subset-v1` или display hints.                                                                |
| `invalid_event_payload`       | Payload publish не проходит registered contract schema или sanitization constraints.                                                              |
| `delivery_not_claimed`        | Delivery не находится в claim-состоянии для данного consumer-а.                                                                                   |
| `invalid_claim_token`         | Claim token отсутствует, неверен или не соответствует delivery.                                                                                   |
| `delivery_not_requeueable`    | Admin/system пытается requeue delivery в неподходящем status.                                                                                     |
| `delivery_not_skippable`      | Admin/system пытается skip delivery в неподходящем status.                                                                                        |
| `notification_not_found`      | Notification attempt не найден.                                                                                                                   |
| `notification_not_retryable`  | Notification attempt нельзя retry: status/max attempts/settings не позволяют.                                                                     |
| `raw_payload_unavailable`     | Raw event payload недоступен для audit-view route.                                                                                                |
| `admin_reason_required`       | Mutating admin ops action вызван без non-empty `reason`.                                                                                          |

`broker_disabled` применяется только к module-facing runtime operations `publish`, `poll`, `ack`, `fail`. Registry/bootstrap, diagnostics, raw payload audit и admin ops остаются доступны, чтобы систему можно было обслуживать и включать обратно.

| Function path                    | File                                         | Lib operation                 | Caller                              | Request                                                         | Success response                                                                      | Error codes                                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------- | ----------------------------- | ----------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/broker/publish`                | `functions/broker/publish.ts`                | `publishBrokerEvent`          | InternalModule                      | `producerModule`, `PublishEventRequest`                         | `{ success:true, eventId, deliveriesCreated, notificationsQueued }`                   | `broker_disabled`, `invalid_request`, `module_not_registered`, `module_disabled`, `forbidden_event_type`, `contract_not_registered`, `contract_owner_mismatch`, `contract_retired`, `invalid_event_payload` |
| `/broker/poll`                   | `functions/broker/poll.ts`                   | `pollBrokerDeliveries`        | InternalModule                      | `consumerModule`, `{ subscriptionKey?, limit? }`                | `{ success:true, deliveries: ClaimedDelivery[] }`                                     | `broker_disabled`, `invalid_request`, `module_not_registered`, `module_disabled`, `subscription_not_registered`, `subscription_disabled`, `invalid_filter`                                                  |
| `/broker/ack`                    | `functions/broker/ack.ts`                    | `ackBrokerDeliveries`         | InternalModule                      | `consumerModule`, `AckDeliveriesRequest`                        | `{ success:true, acked:number, results:DeliveryActionResult[] }`                      | `broker_disabled`, `invalid_request`, `module_not_registered`, `module_disabled`; item codes: `delivery_not_claimed`, `invalid_claim_token`, `invalid_request`                                              |
| `/broker/fail`                   | `functions/broker/fail.ts`                   | `failBrokerDeliveries`        | InternalModule                      | `consumerModule`, `FailDeliveriesRequest`                       | `{ success:true, failed:number, deadLetter:number, results:DeliveryActionResult[] }`  | `broker_disabled`, `invalid_request`, `module_not_registered`, `module_disabled`; item codes: `delivery_not_claimed`, `invalid_claim_token`, `invalid_request`                                              |
| `/broker/modules/register`       | `functions/broker/modules/register.ts`       | `registerBrokerModule`        | InternalModule/core admin/bootstrap | module registration payload + optional event contracts manifest | `{ success:true, module, contractsRegistered }`                                       | `invalid_request`, `forbidden_event_type`, `contract_owner_mismatch`, `contract_version_conflict`, `invalid_contract_schema`                                                                                |
| `/broker/subscriptions/register` | `functions/broker/subscriptions/register.ts` | `registerBrokerSubscriptions` | InternalModule/admin config         | `consumerModule`, `RegisterBrokerSubscriptionsRequest`          | `{ success:true, registered:number, results:SubscriptionRegistrationResult[] }`       | `invalid_request`, `module_not_registered`; item codes: `forbidden_event_type`, `invalid_filter`, `invalid_request`                                                                                         |
| `/broker/diagnostics`            | `functions/broker/diagnostics.ts`            | `getBrokerDiagnostics`        | Admin-only server code              | filters for events/deliveries/modules/subscriptions             | `{ success:true, ...diagnostics }`                                                    | `invalid_filter`                                                                                                                                                                                            |
| `/broker/notifications/retry`    | `functions/broker/notifications/retry.ts`    | `retryBrokerNotifications`    | Admin-only server code              | `RetryBrokerNotificationsRequest`                               | `{ success:true, retried:number, skipped:number, results:NotificationRetryResult[] }` | `invalid_request`, `notification_not_found`, `notification_not_retryable`                                                                                                                                   |

Admin broker routes описаны в разделе 11.5. Они являются admin-only read/ops shell поверх broker libs/internal contracts, не становятся module-facing broker API и не принимают publish/poll/ack/fail от внешнего клиента.

`PublishEventRequest`:

```ts
{
  eventType: string,
  eventVersion: number,
  occurredAt?: number,
  targetModules?: string[],
  aggregateType?: string,
  aggregateId?: string,
  correlationId?: string,
  causationId?: string,
  idempotencyKey?: string,
  payload: unknown,
  metadata?: Record<string, unknown>
}
```

`RegisterBrokerModuleRequest`:

```ts
{
  module: {
    moduleKey: string,
    displayName: string,
    kind: 'core' | 'interface' | 'domain' | 'worker' | 'external',
    enabled: boolean,
    allowedPublishTypes: string[],
    allowedSubscribeTypes: string[],
    metadata?: Record<string, unknown>
  },
  eventContracts?: Array<{
    eventType: string,
    eventVersion: number,
    status?: 'active' | 'deprecated' | 'retired',
    description: string,
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: Record<string, unknown>,
    sourceRef: {
      moduleKey: string,
      path: 'contracts/brokerEvents.ts',
      exportName: string,
      docsPath?: string
    },
    display?: {
      summaryFields?: Array<{
        path: string,
        label: string,
        maxLength?: number
      }>
    },
    examples?: unknown[],
    metadata?: Record<string, unknown>
  }>
}
```

`RegisterBrokerSubscriptionsRequest`:

```ts
type RegisterBrokerSubscriptionsRequest = {
  consumerModule?: string
  subscriptions: Array<{
    name: string
    displayName: string
    enabled: boolean
    sourceModules?: string[]
    eventTypes?: string[]
    targetedOnly?: boolean
    notification?: {
      mode: 'none' | 'internal' | 'socket' | 'both'
      handlerKey?: string
      socketKey?: string
      batchWindowMs?: number
    }
    delivery?: {
      maxBatchSize?: number
      ackTimeoutMs?: number
      retryPolicy?: {
        maxAttempts?: number
        initialDelayMs?: number
        backoffMultiplier?: number
      }
    }
    metadata?: Record<string, unknown>
  }>
}

type SubscriptionRegistrationResult = {
  name: string
  subscriptionKey?: string
  success: boolean
  subscription?: BrokerSubscriptionSafe
  code?: 'forbidden_event_type' | 'invalid_filter' | 'invalid_request'
  error?: string
}
```

`RetryBrokerNotificationsRequest`, `NotificationRetryResult`:

```ts
type RetryBrokerNotificationsRequest = {
  notificationId?: string
  filters?: {
    consumerModule?: string
    subscriptionKey?: string
    mode?: 'internal' | 'socket'
    status?: Array<'failed' | 'skipped'>
    limit?: number
  }
  reason?: string
}

type NotificationRetryResult = {
  notificationId: string
  success: boolean
  status?: 'pending'
  code?: 'notification_not_found' | 'notification_not_retryable' | 'invalid_request'
  error?: string
}
```

`registerBrokerModule(ctx, moduleKey, request)`:

- `moduleKey` задается server-side wrapper-ом как `PROJECT_ROOT` текущего модуля;
- требует `request.module.moduleKey === moduleKey`;
- создает или обновляет `BrokerModules` row по правилам раздела 8.3;
- если передан `eventContracts`, валидирует каждый contract как принадлежащий `moduleKey`;
- требует `sourceRef.moduleKey === moduleKey`, `sourceRef.path === 'contracts/brokerEvents.ts'` и непустой `sourceRef.exportName`;
- валидирует `display.summaryFields`: обязательные `path` и `label`, допустимый dot-path без expressions/functions, лимиты длины и запрет secret/noisy keys;
- вычисляет canonical JSON hash для `payloadSchema` и сохраняет его как `schemaHash`;
- создает новую версию contract-а или обновляет mutable поля существующей версии, если `schemaHash` не изменился;
- возвращает `{ success:true, module: BrokerModuleSafe, contractsRegistered: Array<{ contractKey, status, schemaHash }> }`;
- не удаляет contracts, отсутствующие в новом manifest; отключение старой версии выполняется сменой `status` на `deprecated` или `retired`.

`registerBrokerSubscriptions(ctx, consumerModule, request)`:

- `consumerModule` задается server-side wrapper-ом как `PROJECT_ROOT` текущего модуля;
- если `request.consumerModule` передан, требует `request.consumerModule === consumerModule`;
- требует существующий `BrokerModules` row для `consumerModule`; если module row отсутствует, возвращает top-level `module_not_registered`;
- registration разрешена, даже если consumer module сейчас declared-disabled или admin-disabled: она обновляет декларативные поля подписок, но effective availability остается false до включения модуля;
- требует корректный envelope: `subscriptions` - non-empty array, `subscriptions.length <= broker_max_batch_size`;
- batch выполняется как partial success: каждый item валидируется и upsert-ится независимо, ошибка одного item-а не откатывает успешные item-ы;
- duplicate `name` внутри одного request: первый item обрабатывается, последующие item-ы с тем же `name` возвращают item-level `invalid_request`;
- `name` должен быть stable коротким именем подписки: lowercase ASCII letters/digits/dot/dash/underscore, длина `1..128`, без `:`, `/`, whitespace и control chars;
- core строит `subscriptionKey = consumerModule + ':' + name`; `subscriptionKey` не принимается из body;
- `displayName` обязателен, приводится к trimmed string `1..200`;
- `enabled` обязателен и должен быть boolean;
- `sourceModules` и `eventTypes` default `[]`; элементы проходят pattern validation из раздела 8.5;
- `targetedOnly` default `false`;
- `eventTypes` item-а должны укладываться в `BrokerModules.allowedSubscribeTypes` consumer-а; нарушение возвращает item-level `forbidden_event_type`;
- `eventTypes=[]` означает все event types, разрешенные `allowedSubscribeTypes`; если `allowedSubscribeTypes=[]`, подписка невозможна и возвращает item-level `forbidden_event_type`;
- `sourceModules=[]` означает любые producer modules, но только для event types, разрешенных consumer-у;
- `notification` default `{ mode:'none' }`;
- для `notification.mode='none'` `handlerKey` и `socketKey` должны отсутствовать или быть empty string; в row сохраняются empty strings;
- для `notification.mode='internal'` обязателен non-empty `handlerKey`, `socketKey` должен отсутствовать или быть empty string;
- для `notification.mode='socket'` обязателен non-empty `socketKey`, `handlerKey` должен отсутствовать или быть empty string;
- для `notification.mode='both'` обязательны non-empty `handlerKey` и `socketKey`;
- `notification.batchWindowMs` optional; если не задан, сохраняется current `broker_notification_batch_window_ms`; если задан, нормализуется integer `0..60000`;
- `delivery.maxBatchSize` optional; если не задан, сохраняется current `broker_max_batch_size`; если задан, нормализуется integer `1..broker_max_batch_size`;
- `delivery.ackTimeoutMs` optional; если не задан, сохраняется current `broker_default_ack_timeout_ms`; если задан, нормализуется integer `10000..3600000`;
- `delivery.retryPolicy` optional/partial; отсутствующие поля дополняются из global defaults `broker_default_retry_max_attempts`, `broker_default_retry_initial_delay_ms`, `broker_default_retry_backoff_multiplier`;
- `retryPolicy.maxAttempts` нормализуется integer `0..100`, `initialDelayMs` integer `0..86400000`, `backoffMultiplier` number `1..10`;
- `metadata` должна быть JSON-compatible safe object без secret/token/password/authorization/cookie keys;
- успешный item создает или обновляет `BrokerSubscriptions` row по `subscriptionKey`, но не меняет `adminDisabled`, `adminDisabledAt`, `adminDisableReason`;
- отсутствующие в request подписки того же consumer-а не удаляются и не выключаются автоматически;
- response для валидного envelope всегда содержит `success:true`, `registered` равен количеству successful item-ов, `results[]` сохраняет порядок входных item-ов.

`publishBrokerEvent(ctx, producerModule, request)`:

- проверяет `broker_enabled`;
- сверяет `producerModule` с `BrokerModules`, `enabled=true`, `adminDisabled=false` и internal caller context;
- валидирует `eventType` по allowed publish patterns модуля;
- требует явный `eventVersion`;
- находит `BrokerEventContracts` по `eventType + eventVersion`;
- проверяет, что contract принадлежит `producerModule`, имеет status `active` или `deprecated` и payload проходит `json-schema-subset-v1`;
- sanitizes `payload`/`metadata`, удаляя `token`, `secret`, `password`, `authorization`, `cookie`;
- при `idempotencyKey` вычисляет `idempotencyFingerprint` по правилам раздела 8.6;
- если `producerModule + idempotencyKey` уже существует с тем же fingerprint, возвращает существующий `eventId` без создания новых deliveries/notifications;
- если `producerModule + idempotencyKey` уже существует с другим fingerprint, возвращает `invalid_request` с `details.reason='idempotency_fingerprint_conflict'`;
- создает immutable `BrokerEvents` row;
- записывает в event `contractKey` и `schemaHash`, актуальные на момент publish;
- находит matching enabled subscriptions;
- создает `BrokerDeliveries` rows;
- если `broker_notification_enabled=true`, создает `BrokerNotificationAttempts` rows для подписок с `notificationMode != 'none'`: одну row для `internal`, одну row для `socket`, две независимые rows для `both`;
- если `broker_notification_enabled=false`, не создает notification attempts, `notificationsQueued=0` и не планирует dispatch job;
- если notification attempts созданы, планирует `jobs/broker/notifications-dispatch.ts` для best-effort отправки notification hints;
- failure notification не откатывает publish и не меняет delivery status.

`ClaimedDelivery`:

```ts
{
  deliveryId: string,
  claimToken: string,
  subscriptionKey: string,
  event: {
    eventId: string,
    producerModule: string,
    eventType: string,
    eventVersion: number,
    contractKey: string,
    schemaHash: string,
    occurredAt: number,
    publishedAt: number,
    payload: unknown,
    metadata?: Record<string, unknown>
  }
}
```

`AckDeliveriesRequest`, `FailDeliveriesRequest`, `DeliveryActionResult`:

```ts
type AckDeliveryItem = {
  deliveryId: string
  claimToken: string
}

type FailDeliveryItem = {
  deliveryId: string
  claimToken: string
  error: unknown
}

type AckDeliveriesRequest = AckDeliveryItem | { items: AckDeliveryItem[] }

type FailDeliveriesRequest = FailDeliveryItem | { items: FailDeliveryItem[] }

type DeliveryActionResult = {
  deliveryId: string
  success: boolean
  status?: 'acked' | 'failed' | 'dead_letter'
  code?: 'delivery_not_claimed' | 'invalid_claim_token' | 'invalid_request'
  error?: string
}
```

`pollBrokerDeliveries(ctx, consumerModule, request)`:

- сверяет `consumerModule` с `BrokerModules`, `enabled=true`, `adminDisabled=false` и internal caller context;
- выбирает только deliveries этого consumer-а;
- внутри `runWithExclusiveLock` возвращает expired `claimed` rows в доступное состояние, если `claimedUntil <= Date.now()`;
- берет pending/failed rows с `availableAt <= Date.now()`;
- выполняет claim внутри `runWithExclusiveLock`;
- возвращает raw `claimToken` только в response poll;
- claimed delivery недоступна другим poll до ack/fail или истечения `claimedUntil`;
- lease timeout не увеличивает `attempts`;
- пустой результат `{ deliveries: [] }` является нормальным ответом.

`ackBrokerDeliveries(ctx, consumerModule, request)`:

- принимает single shorthand `{ deliveryId, claimToken }` или batch `{ items: [{ deliveryId, claimToken }] }`;
- нормализует single shorthand в batch из одного элемента;
- требует, чтобы batch envelope был корректным: `items` - non-empty array, `items.length <= broker_max_batch_size`, каждый item содержит non-empty `deliveryId` и `claimToken`;
- malformed envelope, empty batch и batch больше `broker_max_batch_size` возвращают top-level `invalid_request`;
- batch выполняется как partial success: каждый item проверяется и применяется независимо, ошибка одного item не откатывает успешные item-ы;
- duplicate `deliveryId` внутри одного batch: первый item обрабатывается по обычным правилам, последующие item-ы с тем же `deliveryId` возвращают item-level `invalid_request`;
- для каждого item сверяет `consumerModule` и `claimTokenHash`;
- обычный success допустим только для `status=claimed`;
- item-level ошибки возвращаются в `results[]` с `success=false` и code `delivery_not_claimed`, `invalid_claim_token` или `invalid_request`;
- успешный item переводит delivery в `acked`, пишет `ackedAt`;
- повторный ack уже acked delivery возвращает item-level semantic success только если consumer/module совпадает;
- `pending`, `failed`, `dead_letter` и claimed другим consumer-ом возвращают item-level `delivery_not_claimed`;
- response для валидного envelope всегда содержит `success:true`, `acked` равен количеству item-ов с успешным status `acked`, а `results[]` сохраняет порядок входных item-ов.

`failBrokerDeliveries(ctx, consumerModule, request)`:

- принимает single shorthand `{ deliveryId, claimToken, error }` или batch `{ items: [{ deliveryId, claimToken, error }] }`;
- нормализует single shorthand в batch из одного элемента;
- использует те же правила envelope validation, partial success, duplicate `deliveryId` и сохранения порядка `results[]`, что `ackBrokerDeliveries`;
- требует safe `error` на каждом item-е; отсутствие `error` у item-а возвращает item-level `invalid_request`;
- для каждого item сверяет `claimTokenHash`, `consumerModule`, `status=claimed`;
- item-level ошибки возвращаются в `results[]` с `success=false` и code `delivery_not_claimed`, `invalid_claim_token` или `invalid_request`;
- увеличивает attempts только для item-а, который успешно прошел проверку и явно failed;
- читает effective retry policy подписки на момент fail;
- если `maxAttempts=0`, первый explicit fail переводит delivery в `dead_letter`;
- если `attempts < maxAttempts`, переводит delivery в retry state с `status='failed'` и `availableAt = now + initialDelayMs * backoffMultiplier^(attempts - 1)`;
- если `attempts >= maxAttempts`, переводит delivery в `dead_letter`;
- response для валидного envelope всегда содержит `success:true`, `failed` равен количеству item-ов с успешным status `failed`, `deadLetter` равен количеству item-ов с успешным status `dead_letter`;
- raw stack trace, token и payload secrets не пишутся в `lastError` и `results[].error`.

Notification behavior:

- notification отправляется только после durable записи event и delivery rows;
- `publishBrokerEvent` не отправляет notifications inline; если `broker_notification_enabled=true`, он только создает attempts и планирует dispatch job;
- если `broker_notification_enabled=false` на момент publish, `publishBrokerEvent` не создает notification attempts и не планирует dispatch job;
- `jobs/broker/notifications-dispatch.ts` обрабатывает pending/failed attempts batch-ами до 50 записей, проверяет elapsed time и завершает итерацию до 10 секунд;
- если `broker_notification_enabled=false` во время dispatch, job помечает selected pending/failed attempts как `skipped` с `lastError='notification_disabled'`, не отправляет hint и не меняет deliveries;
- dispatch job выбирает канал по `BrokerNotificationAttempts.mode`: `internal` вызывает server-only handler по `handlerKey`, `socket` отправляет lightweight hint в socket/channel по `handlerKey`;
- для `notificationMode='both'` dispatch job видит две отдельные rows и обрабатывает их независимо;
- internal notification handler выполняется best-effort с timeout `broker_notification_timeout_ms`;
- socket notification выполняется только если Chatium socket/channel доступен в текущем runtime;
- notification содержит только hint `broker.deliveries.available`, без event payload;
- потребитель после notification всегда делает internal `pollBrokerDeliveries`;
- `broker_notification_max_attempts=0` означает, что dispatch job сразу переводит selected attempt в `skipped` без отправки;
- failed notification attempts автоматически повторяются следующей итерацией dispatch job после `nextAttemptAt = now + broker_notification_retry_delay_ms`;
- если failed send исчерпал `broker_notification_max_attempts`, attempt переводится в `skipped`;
- manual `retryBrokerNotifications` возвращает failed/skipped attempt в `pending`, сбрасывает `attempts=0`, `nextAttemptAt=now` и планирует dispatch job;
- manual retry возвращает `notification_not_retryable`, если notification уже `sent`, уже `pending`, global notifications disabled, `handlerKey` invalid или `mode` неизвестен;
- частые события могут coalesce по `subscriptionKey` в пределах сохраненного `BrokerSubscriptions.notificationBatchWindowMs`.

`retryBrokerNotifications(ctx, request)`:

- требует, чтобы `broker_notification_enabled=true`; иначе возвращает top-level `notification_not_retryable`;
- `notificationId` и `filters` взаимоисключающие: если переданы оба, возвращает top-level `invalid_request`;
- single retry с `notificationId` ищет ровно одну row; если row не найдена, возвращает top-level `notification_not_found`;
- single retry разрешен только для `status='failed'` или `status='skipped'`, валидного `mode` и non-empty `handlerKey`; иначе возвращает top-level `notification_not_retryable`;
- single retry сбрасывает row в `status='pending'`, `attempts=0`, `nextAttemptAt=now`, `lastError=''`, планирует dispatch job и возвращает один successful `NotificationRetryResult`;
- bulk retry используется, когда `notificationId` не передан;
- bulk retry filters optional: `consumerModule`, `subscriptionKey`, `mode`, `status`, `limit`;
- `status` в bulk filters допускает только `failed` и `skipped`; default `['failed', 'skipped']`;
- `limit` нормализуется integer `1..200`, default `50`;
- bulk retry выбирает retryable rows по filters, сортировка `updatedAt asc`, затем `createdAt asc`, не более `limit`;
- bulk retry пропускает rows, которые после выборки стали не retryable; такие rows попадают в `results[]` с `success=false`, `code='notification_not_retryable'`, а счетчик `skipped` увеличивается;
- response для валидного bulk envelope всегда содержит `success:true`, `retried`, `skipped`, `results[]` в порядке выбранных rows;
- если bulk filters не нашли rows, возвращает `{ success:true, retried:0, skipped:0, results:[] }`;
- admin route `POST /api/admin/broker/notifications/retry` пишет один `BrokerOpsAudit` row `notification_retry` на request: для single retry `targetType='notification'`, `targetId=notificationId`; для bulk retry `targetType='notification_bulk'`, `targetId='notification_retry_bulk:<timestamp>'`;
- bulk audit row хранит `metadata.notificationIds`, `metadata.retried`, `metadata.skipped`, `metadata.filters`; отдельная audit row на каждую notification не создается.

### 11.4 Sample module API

Sample module показывает, как производный метапроект подключает отдельный модуль к локальному broker-у без MAX-зависимостей и без HTTP broker URL.

| Method/path                            | Auth  | Request                                                                                                          | Success response                                | Validation errors                               |
| -------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `POST /sample-module/api/register`     | Admin | empty                                                                                                            | `{ success, moduleResult, subscriptionResult }` | Broker semantic errors.                         |
| `POST /sample-module/api/publish-note` | Admin | `{ noteId?, title?, body?, authorId?, targetModules? }`                                                          | Broker publish result.                          | Broker semantic errors; invalid payload schema. |
| `POST /sample-module/api/poll`         | Admin | `{ limit?: number }`                                                                                             | Broker poll result with claimed deliveries.     | Broker semantic errors.                         |
| `POST /sample-module/api/ack`          | Admin | Broker ack request                                                                                               | Broker ack result.                              | Invalid claim token/status.                     |
| `POST /sample-module/api/fail`         | Admin | Broker fail request                                                                                              | Broker fail result.                             | Invalid claim token/status.                     |
| `POST /api/module/register`            | Admin | empty                                                                                                            | `{ success, moduleResult }`                     | Broker semantic errors.                         |
| `POST /api/module/publish-event`       | Admin | `{ rawEventId?, eventType?, source?, accountName?, objectId?, userId?, payloadJson?, payload?, targetModules? }` | Broker publish result.                          | Broker semantic errors; invalid payload schema. |

Sample module:

- регистрирует module key `p/units/neso/meta/core/sample-module`;
- публикует `sample.note.created@1` с module-owned schema/display/examples из `sample-module/contracts/brokerEvents.ts`;
- регистрирует подписку `sample-note-reader` на собственное событие;
- вызывает broker только через `@app/app.runAppFunction` target `p/units/neso/meta/core`;
- защищает все sample API через `requireAccountRole(ctx, 'Admin')`.

GetCourse interface module:

- регистрирует module key `p/units/neso/meta/interfaces/getcourse`;
- публикует `getcourse.raw_event.accepted@1` с module-owned schema/display/examples из `../interfaces/getcourse/contracts/brokerEvents.ts`;
- хранит raw GetCourse payload в строковом `payloadJson`, чтобы не расширять текущий `json-schema-subset-v1` произвольными объектами;
- вызывает broker только через `@app/app.runAppFunction` target `p/units/neso/meta/core`;
- защищает все GetCourse interface API через `requireAccountRole(ctx, 'Admin')`.

### 11.5 Admin broker ops

Все routes ниже требуют `requireAccountRole(ctx, 'Admin')` первой исполняемой строкой handler-а. Они вызываются только admin UI, не являются module-facing broker API и не принимают publish/poll/ack/fail от внешнего клиента.

Admin broker routes используют тот же error shape `{ success:false, code, error, details? }`, что broker internal functions. Исключение только auth: ответ формирует Chatium auth helper до входа в route body.

| Method/path                                   | Auth  | Request                                        | Success response                                                                      | Error codes                                                                                        |
| --------------------------------------------- | ----- | ---------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET /api/admin/broker/diagnostics`           | Admin | query filters                                  | `{ success:true, modules, subscriptions, events, deliveries, notifications }`         | `invalid_filter`                                                                                   |
| `POST /api/admin/broker/events/raw`           | Admin | `{ eventId, reason? }`                         | `{ success:true, eventId, payload, metadata? }`                                       | `invalid_request`, `not_found`, `raw_payload_unavailable`                                          |
| `POST /api/admin/broker/modules/toggle`       | Admin | `{ moduleKey, enabled, reason }`               | `{ success:true, module: BrokerModuleSafe }`                                          | `invalid_request`, `admin_reason_required`, `module_not_registered`                                |
| `POST /api/admin/broker/subscriptions/toggle` | Admin | `{ subscriptionKey, enabled, reason }`         | `{ success:true, subscription: BrokerSubscriptionSafe }`                              | `invalid_request`, `admin_reason_required`, `subscription_not_registered`                          |
| `POST /api/admin/broker/deliveries/requeue`   | Admin | `{ deliveryId, reason }`                       | `{ success:true, delivery: BrokerDeliverySafe }`                                      | `invalid_request`, `admin_reason_required`, `not_found`, `delivery_not_requeueable`                |
| `POST /api/admin/broker/deliveries/skip`      | Admin | `{ deliveryId, reason }`                       | `{ success:true, delivery: BrokerDeliverySafe }`                                      | `invalid_request`, `admin_reason_required`, `not_found`, `delivery_not_skippable`                  |
| `POST /api/admin/broker/notifications/retry`  | Admin | `RetryBrokerNotificationsRequest & { reason }` | `{ success:true, retried:number, skipped:number, results:NotificationRetryResult[] }` | `invalid_request`, `admin_reason_required`, `notification_not_found`, `notification_not_retryable` |

`GET /api/admin/broker/diagnostics`:

- поддерживает фильтры `moduleKey`, `eventType`, `eventId`, `subscriptionKey`, `deliveryStatus`, `notificationStatus`, `limit`;
- clamp `limit` в `1..200`, default `50`;
- возвращает safe DTOs без secrets: `BrokerModuleSafe`, `BrokerSubscriptionSafe`, `BrokerEventSafe`, `BrokerDeliverySafe`, `BrokerNotificationAttemptSafe`;
- `BrokerEventSafe` включает `primarySummary`, построенный через `lib/broker/eventSummary.lib.ts` по `BrokerEventContracts.display.summaryFields` с generic fallback, `eventType`, `eventVersion`, `contractKey`, `schemaHash`, но не включает raw `payload`;
- raw payload доступен только через `POST /api/admin/broker/events/raw`, чтобы просмотр был явным и auditируемым.

Admin toggle semantics:

- `POST /api/admin/broker/modules/toggle` не меняет declared `BrokerModules.enabled`; `enabled=false` в request ставит `adminDisabled=true`, `adminDisabledAt=now`, `adminDisableReason=reason`, а `enabled=true` снимает admin stop и очищает `adminDisabledAt/adminDisableReason`;
- `POST /api/admin/broker/subscriptions/toggle` работает аналогично и не меняет declared `BrokerSubscriptions.enabled`;
- module/subscription registration после admin disable может обновлять декларативные поля, но не меняет admin stop и не создает `BrokerOpsAudit` row;
- каждый принятый admin toggle создает `BrokerOpsAudit` row `module_toggle` или `subscription_toggle` с `before`, `after` и обязательным `reason`; если состояние уже было таким же, action считается no-op и отражается в `metadata.noop=true`.

Safe DTOs:

```ts
type BrokerModuleSafe = {
  moduleKey: string
  displayName: string
  kind: string
  enabled: boolean
  declaredEnabled: boolean
  adminDisabled: boolean
  allowedPublishTypes: string[]
  allowedSubscribeTypes: string[]
  createdAt: number
  updatedAt: number
}

type BrokerSubscriptionSafe = {
  subscriptionKey: string
  consumerModule: string
  displayName: string
  enabled: boolean
  declaredEnabled: boolean
  adminDisabled: boolean
  adminDisabledAt: number
  adminDisableReason: string
  sourceModules: string[]
  eventTypes: string[]
  targetedOnly: boolean
  notificationMode: 'none' | 'internal' | 'socket' | 'both'
  notificationBatchWindowMs: number
  handlerKeyConfigured: boolean
  socketKeyConfigured: boolean
  maxBatchSize: number
  ackTimeoutMs: number
  retryPolicy: {
    maxAttempts: number
    initialDelayMs: number
    backoffMultiplier: number
  }
  createdAt: number
  updatedAt: number
}

type BrokerPrimarySummaryItem = {
  label: string
  path: string
  value:
    | string
    | number
    | boolean
    | null
    | { kind: 'object'; keys: number }
    | { kind: 'array'; length: number }
  truncated?: boolean
}

type BrokerEventSafe = {
  eventId: string
  producerModule: string
  eventType: string
  eventVersion: number
  contractKey: string
  schemaHash: string
  occurredAt: number
  publishedAt: number
  targetModules: string[]
  aggregateType: string
  aggregateId: string
  correlationId: string
  causationId: string
  primarySummary: BrokerPrimarySummaryItem[]
}

type BrokerDeliverySafe = {
  deliveryId: string
  eventId: string
  subscriptionKey: string
  consumerModule: string
  eventPublishedAt: number
  eventType: string
  eventVersion: number
  contractKey: string
  schemaHash: string
  producerModule: string
  aggregateType: string
  aggregateId: string
  status: string
  attempts: number
  availableAt: number
  claimedAt: number
  claimedUntil: number
  lastError: string
  ackedAt: number
  createdAt: number
  updatedAt: number
}

type BrokerNotificationAttemptSafe = {
  notificationId: string
  consumerModule: string
  subscriptionKey: string
  deliveryIds: string[]
  mode: 'internal' | 'socket'
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  attempts: number
  nextAttemptAt: number
  lastError: string
  createdAt: number
  updatedAt: number
}
```

В `BrokerModuleSafe` и `BrokerSubscriptionSafe` поле `enabled` означает effective-enabled состояние для UI и diagnostics. Поле `declaredEnabled` показывает значение из registration payload, а `adminDisabled` показывает операторский stop-флаг. `BrokerSubscriptionSafe` не раскрывает raw `notificationHandlerKey`/`notificationSocketKey`; UI получает только `handlerKeyConfigured` и `socketKeyConfigured`.

Mutating ops actions:

- требуют non-empty `reason`;
- выполняются внутри `runWithExclusiveLock`, если меняют delivery state;
- пишут `BrokerOpsAudit` row с `action`, `targetType`, `targetId`, `adminUserId`, `reason`, safe `before/after`;
- не удаляют `BrokerEvents`, `BrokerDeliveries`, `BrokerNotificationAttempts`;
- не редактируют `BrokerEvents.payload`/`metadata`;
- не публикуют broker events и не делают ack/fail от имени consumer-а без claim token.

Delivery requeue semantics:

- `POST /api/admin/broker/deliveries/requeue` принимает только deliveries в `status=failed` или `status=dead_letter`;
- `failed` и `dead_letter` requeue выполняются одинаково;
- route переводит delivery в `pending`, ставит `availableAt=now` и возвращает updated `BrokerDeliverySafe`;
- route сбрасывает `attempts=0`, `lastError=''`, `claimTokenHash=''`, `claimedAt=0`, `claimedUntil=0`, `ackedAt=0`;
- route не меняет event/payload, subscription, consumer, materialized event hot fields, `deliveryId`, `createdAt`;
- route пишет `BrokerOpsAudit` action `delivery_requeue` с `metadata.before`, `metadata.after` и `metadata.resetFields`;
- `reason` сохраняется в `BrokerOpsAudit.reason` и не пишется в `BrokerDeliveries.lastError`;
- после requeue delivery доступна ближайшему `poll` без ожидания старого `availableAt`.

Delivery skip semantics:

- `POST /api/admin/broker/deliveries/skip` принимает deliveries в `status=pending`, `status=claimed`, `status=failed` или `status=dead_letter`;
- route возвращает `delivery_not_skippable` для `acked`, уже `skipped` или неизвестного status;
- route переводит delivery в `skipped`, ставит `availableAt=0`, `lastError='skipped_by_admin'`, `ackedAt=0`;
- route очищает claim state: `claimTokenHash=''`, `claimedAt=0`, `claimedUntil=0`;
- route сохраняет `attempts`, event/payload, subscription, consumer, materialized event hot fields, `deliveryId`, `createdAt`;
- route пишет `BrokerOpsAudit` action `delivery_skip` с `metadata.before`, `metadata.after` и `metadata.resetFields`;
- `reason` сохраняется в `BrokerOpsAudit.reason` и не пишется raw-значением в `BrokerDeliveries.lastError`;
- skip claimed delivery делает старый claim token недействительным; последующий consumer ack/fail должен получить `delivery_not_claimed`.

`POST /api/admin/broker/events/raw`:

- возвращает exact `BrokerEvents.payload` и safe `metadata`, сохраненные в Heap;
- пишет `BrokerOpsAudit` action `raw_payload_view`;
- не возвращает notification payload, потому что notifications не содержат event payload.

### 11.6 Admin logs and dashboard

| Method/path                       | Auth  | Request                                          | Success response                                         | Validation errors                                                                      |
| --------------------------------- | ----- | ------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET /api/admin/logs/recent`      | Admin | query `limit?`, `severities?`                    | `{ success:true, entries: LogEntry[] }`                  | Invalid `severities`: `Параметр severities должен содержать числа 0..7 через запятую`. |
| `GET /api/admin/logs/before`      | Admin | query `beforeTimestamp`, `limit?`, `severities?` | `{ success:true, entries: LogEntry[], hasMore:boolean }` | Missing/invalid `beforeTimestamp`; invalid `severities`.                               |
| `GET /api/admin/dashboard/counts` | Admin | none                                             | `{ success:true, errorCount, warnCount, resetAt }`       | Catch string.                                                                          |
| `POST /api/admin/dashboard/reset` | Admin | none                                             | `{ success:true, errorCount:0, warnCount:0, resetAt }`   | Catch string.                                                                          |

`limit` for log history is clamped to `1..200`, default `50`. `severities` is comma-separated integers `0..7`; empty/missing means no severity filter. Non-integer parts are ignored during parsing; ошибка возвращается только если после парсинга есть значения вне `0..7`.

`GET /api/admin/logs/before`:

- missing/blank `beforeTimestamp` -> `{ success:false, error:'Параметр beforeTimestamp обязателен' }`;
- `Number(beforeTimestamp)` is `NaN` или `<=0` -> `{ success:false, error:'Параметр beforeTimestamp должен быть положительным числом' }`;
- `hasMore` равен `entries.length === limit`.

`LogEntry` returned to client:

```ts
{
  id?: string,
  severity: number,
  level: string,
  timestamp: number,
  args: unknown[]
}
```

Rows map to `args = [message, payload]` when payload exists, otherwise `[message]`.

Dashboard:

- `GET /api/admin/dashboard/counts` возвращает counts после `dashboard_reset_at`;
- `POST /api/admin/dashboard/reset` записывает `Date.now()` в `dashboard_reset_at` через `settings.lib.setSetting` и возвращает нулевые counters;
- оба endpoint-а catch-ят ошибки как `{ success:false, error:String(error) }`.

### 11.7 Tests

| Method/path                  | Auth    | Request | Response                                                |
| ---------------------------- | ------- | ------- | ------------------------------------------------------- |
| `GET /api/tests/list`        | AnyUser | none    | `{ success:true, categories, at }`                      |
| `GET /api/tests/unit`        | AnyUser | none    | `{ success, kind:'unit', results, summary, at }`        |
| `GET /api/tests/integration` | AnyUser | none    | `{ success, kind:'integration', results, summary, at }` |

`GET /api/tests/list` возвращает три категории:

- `unit`: `UNIT_TEST_BLOCKS`, `tests=flattenCatalogBlocks(UNIT_TEST_BLOCKS)`;
- `integration-server`: `INTEGRATION_SERVER_TEST_BLOCKS`;
- `integration-http`: `[INTEGRATION_HTTP_TEST_BLOCK]`.

`/api/tests/http` не существует. HTTP-проверки страниц выполняются только клиентом `/web/tests`.

`results` rows:

```ts
{ id: string, title: string, passed: boolean, error?: string }
```

`summary`:

```ts
{ passed: number, failed: number, total: number }
```

Каждый failed row из unit/integration прогонов логируется через `logTestRunFailures` с severity `3`.

`GET /api/tests/integration` после `runTemplateIntegrationChecks(ctx)` добавляет meta-row `api_tests_integration_shape`. Для non-admin ctx проверки admin-branch в `integrationApiSuite` возвращаются как failed rows с текстом `нужна роль Admin (ctx.user.is("Admin"))`, а не пропускаются. Текущее поведение: `api_tests_list_shape` тоже находится в admin-branch раннера, хотя сам endpoint `GET /api/tests/list` имеет доступ `AnyUser`.

## 12. Тестовый каталог

`shared/testCatalog.ts` является runtime-каталогом, а этот раздел - нормативным описанием его состава. `api/tests/list`, `TestsPage` и раннеры обязаны оставаться синхронизированными.

Каталог состоит из блоков `{ id, title, description?, tests }`, где каждый test имеет `{ id, title }`. `flattenCatalogBlocks(blocks)` обязан сохранять порядок блоков и порядок тестов внутри блоков.

### 12.1 Unit blocks

| Block                | Test IDs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unit-routes`        | `routes_getFullUrl_dot_slash`, `routes_getFullUrl_slash`, `routes_getFullUrl_web_admin_rel`, `routes_getFullUrl_web_admin_abs`, `routes_getFullUrl_web_admin_bare`, `routes_getFullUrl_empty`, `routes_withProjectRoot_rel`, `routes_withProjectRoot_bare`, `routes_withProjectRoot_dot`, `routes_withProjectRoot_empty`, `routes_subroute_omit`, `routes_subroute_slash`, `routes_subroute_edit`, `routes_subroute_slash_edit`, `routes_subroute_nested`, `routes_PROJECT_ROOT`, `routes_ROUTES_KEYS_match_PATHS`, `routes_no_domain_in_urls`, `routes_internal_start_with_dot`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `unit-project`       | `project_getPageTitle_basic`, `project_getPageTitle_empty_page`, `project_getPageTitle_empty_project`, `project_getPageTitle_unicode`, `project_getHeaderText_basic`, `project_getHeaderText_empty`, `project_getHeaderText_special`, `project_constants_non_empty`, `project_page_names_distinct`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `unit-log-level`     | `logLevel_script_Debug`, `logLevel_script_Info`, `logLevel_script_Warn`, `logLevel_script_Error`, `logLevel_script_Disable`, `logLevel_script_preserves_boot`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `unit-logger-lib`    | `loggerLib_getAdminLogsSocketId_format`, `loggerLib_getAdminLogsSocketId_stable`, `loggerLib_shouldLogByLevel_matrix`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `unit-shared-logger` | `shared_shouldLog_Disable_all`, `shared_shouldLog_Error`, `shared_shouldLog_Warn`, `shared_shouldLog_Info`, `shared_shouldLog_Debug`, `shared_shouldLog_no_window`, `shared_shouldLog_invalid_numeric`, `shared_shouldLog_invalid_string`, `shared_setLogSink_roundtrip`, `shared_setLogSink_throw_keeps_console`, `shared_componentLogger_prefix`, `shared_logWarn_alias`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `unit-broker`        | `broker_event_type_validation`, `broker_pattern_exact_star_suffix`, `broker_pattern_reject_unsupported_wildcards`, `broker_contract_schema_hash_stable`, `broker_contract_version_immutable`, `broker_payload_schema_validation`, `broker_payload_sanitization`, `broker_subscription_request_validation`, `broker_subscription_key_from_name`, `broker_subscription_consumer_module_guard`, `broker_subscription_matching`, `broker_subscription_notification_policy_validation`, `broker_subscription_delivery_policy_defaults`, `broker_subscription_missing_manifest_does_not_delete`, `broker_subscription_safe_policy_fields`, `broker_effective_enabled_admin_disabled`, `broker_idempotency_key`, `broker_idempotency_fingerprint_stable`, `broker_idempotency_fingerprint_ignores_metadata`, `broker_retry_policy_defaults_merge`, `broker_retry_backoff`, `broker_retry_max_attempts_zero_dead_letter`, `broker_retry_failed_is_waiting_state`, `broker_retry_claim_preserves_attempts`, `broker_retry_invalid_transitions`, `broker_notification_payload_no_event_payload`, `broker_notification_mode_both_creates_two_attempts`, `broker_notification_no_inline_dispatch`, `broker_notification_coalescing`, `broker_notification_coalescing_append_dedupe`, `broker_notification_coalescing_cap_creates_new_attempt`, `broker_notification_disabled_no_attempts`, `broker_notification_retry_delay`, `broker_notification_max_attempts_zero_skipped`, `broker_notification_manual_retry_rules`, `broker_notification_bulk_retry_filters`, `broker_primary_summary_from_contract_display`, `broker_primary_summary_generic_fallback`, `broker_primary_summary_excludes_noisy_keys`, `broker_error_codes_catalog`, `broker_error_codes_shape` |
| `unit-catalog`       | `catalog_block_ids_unique`, `catalog_test_ids_unique`, `catalog_blocks_have_tests`, `catalog_flatten_order`, `catalog_unit_ids_match_runner`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

`catalog_unit_ids_match_runner` требует, чтобы множество unit IDs в каталоге совпадало с IDs, которые реально создает `runTemplateUnitChecks`, за исключением самого sync-check ID.

`runTemplateUnitChecks(extraRunnerIds = [])`:

- запускает `runRoutesChecks`, project checks, logLevel script checks, logger.lib pure checks, shared/logger checks и catalog integrity checks;
- не обращается к Heap и не требует реального `ctx`;
- временно мокает `globalThis.window` только для проверки browser logger и очищает его после проверок;
- возвращает только строки `{ id, title, passed, error? }`;
- не пишет серверные логи сам; логирование failed rows делает API wrapper `/api/tests/unit`.

Unit checks покрывают:

- route normalization и отсутствие домена в `getFullUrl`;
- `getPageTitle`, `getHeaderText` и непустоту page constants;
- однострочный script `window.__BOOT__.logLevel` без перезаписи существующего `__BOOT__`;
- `getAdminLogsSocketId` и матрицу `shouldLogByLevel`;
- клиентскую матрицу `shouldLog`, `setLogSink`, устойчивость к sink error, component logger prefix и alias `logWarn`.
- pure broker validation: event types, pattern matching, payload sanitization, subscription matching, idempotency, retry backoff, error code shape and notification hints.

### 12.2 Server integration blocks

| Block                  | Test IDs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `int-settings-lib`     | `settings_get_project_name`, `settings_get_log_level`, `settings_getSetting_branches`, `settings_getLogsLimit_parse`, `settings_getLogWebhook`, `settings_getDashboardResetAt`, `settings_getAllSettings`, `settings_broker_defaults`, `settings_setSetting_log_level`, `settings_setSetting_logs_limit`, `settings_setSetting_project_fields`, `settings_setSetting_webhook`, `settings_setSetting_dashboard_reset`, `settings_setSetting_broker_booleans`, `settings_setSetting_broker_integers`, `settings_setSetting_broker_numbers`, `settings_broker_out_of_range`, `settings_setSetting_unknown_key`, `regression_getLogLevel_no_recursion`, `regression_getSetting_no_recursion`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `int-settings-repo`    | `settings_repo_findAll`, `settings_repo_findByKey`, `settings_repo_upsert_create_update`, `settings_repo_deleteByKey`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `int-logs-repo`        | `logs_repo_findAll`, `logs_repo_create_and_read`, `logs_repo_findBeforeTimestamp_where`, `logs_repo_count_severities`, `regression_logs_create_no_recursion`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `int-broker-repo`      | `broker_modules_upsert_find`, `broker_event_contracts_register_find`, `broker_event_contracts_reject_mutated_version`, `broker_subscriptions_upsert_match`, `broker_events_create_idempotency`, `broker_deliveries_create_claim_ack_fail`, `broker_deliveries_materialized_hot_fields`, `broker_notifications_create_mark_sent_failed`, `broker_ops_audit_create_query`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `int-broker-flow`      | `broker_publish_requires_registered_contract`, `broker_publish_validates_payload_schema`, `broker_publish_stores_contract_key_hash`, `broker_publish_creates_deliveries`, `broker_publish_queues_notifications`, `broker_publish_notifications_disabled_no_attempts`, `broker_publish_both_queues_two_notification_attempts`, `broker_poll_claim_ack`, `broker_claimed_until_timeout_requeues`, `broker_retry_failed_not_available_before_available_at`, `broker_retry_failed_direct_claim_after_available_at`, `broker_ack_batch_partial_success`, `broker_fail_batch_partial_success`, `broker_batch_empty_invalid_request`, `broker_batch_duplicate_delivery_id_item_error`, `broker_fail_retry_dead_letter`, `broker_fail_max_attempts_zero_dead_letter`, `broker_notification_dispatch_job_batch`, `broker_notification_disabled_after_publish_skips_attempts`, `broker_notification_retry_delay_and_max_attempts`, `broker_notification_max_attempts_zero_skipped`, `broker_notification_failure_does_not_rollback_delivery`, `broker_duplicate_idempotency_key_returns_existing_event`, `broker_conflicting_idempotency_key_returns_invalid_request` |
| `int-broker-function`  | `broker_function_register_module_with_contracts`, `broker_function_register_subscriptions_batch`, `broker_function_register_subscriptions_partial_success`, `broker_function_register_subscription_forbidden_event_type`, `broker_function_publish`, `broker_function_poll`, `broker_function_ack`, `broker_function_fail`, `broker_function_caller_info_audit`, `broker_function_error_codes`, `broker_function_error_code_mapping`, `broker_no_http_routes`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `int-broker-admin-ops` | `broker_admin_diagnostics_shape`, `broker_admin_event_primary_summary_shape`, `broker_admin_error_codes`, `broker_admin_raw_payload_audit`, `broker_admin_module_toggle_audit`, `broker_admin_subscription_toggle_audit`, `broker_admin_module_disable_survives_register`, `broker_admin_subscription_disable_survives_register`, `broker_admin_delivery_requeue_failed_resets_fields`, `broker_admin_delivery_requeue_dead_letter_resets_fields`, `broker_admin_delivery_requeue_immediate_poll`, `broker_admin_delivery_requeue_audit_snapshot`, `broker_admin_delivery_skip_pending`, `broker_admin_delivery_skip_claimed_invalidates_token`, `broker_admin_delivery_skip_failed`, `broker_admin_delivery_skip_dead_letter`, `broker_admin_delivery_skip_rejects_acked`, `broker_admin_delivery_skip_audit_snapshot`, `broker_admin_notification_retry_single`, `broker_admin_notification_retry_bulk`, `broker_admin_notification_retry_not_retryable`, `broker_admin_notification_retry_audit_snapshot`, `broker_admin_ops_require_reason`                                                                                                             |
| `int-logger-lib-ctx`   | `logger_admin_socket`, `logger_writeServerLog_filter`, `logger_writeServerLog_socket`, `logger_writeServerLog_webhook_url`, `regression_payload_not_object_object`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `int-dashboard`        | `dashboard_get_counts`, `dashboard_reset`, `dashboard_flow_logs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `int-api-contract`     | `api_settings_list`, `api_settings_get`, `api_settings_save_validation`, `api_settings_save_broker_validation`, `api_settings_secret_redaction`, `api_logger_log`, `api_test_fixtures_max_init_data`, `api_admin_logs_recent`, `api_admin_logs_before`, `api_admin_dashboard_counts`, `api_tests_list_shape`, `api_tests_unit_shape`, `api_tests_integration_shape`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `int-e2e`              | `e2e_settings_name_roundtrip`, `e2e_log_level_filters_storage`, `e2e_logs_pagination`, `e2e_dashboard_reset_flow`, `e2e_log_payload_roundtrip`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

`runTemplateIntegrationChecks(ctx)`:

- выполняется с реальным `ctx`, Heap и route `.run(ctx)`;
- вычисляет `admin = ctx.user?.is?.('Admin') === true`;
- проверяет settings lib/repo, logs repo, broker repos/internal `app.function` contracts/flows, dashboard lib, logger lib и API contracts;
- временно создает тестовые rows/settings и удаляет только те settings, для которых есть explicit cleanup;
- может оставлять служебные log rows, потому что logs table является runtime журналом;
- для non-admin не вызывает admin-branch проверок и добавляет failed rows с текстом `нужна роль Admin (ctx.user.is("Admin"))`;
- `api_tests_unit_shape` проверяет `runTemplateUnitChecks()` локально, не делает HTTP/route вызов `/api/tests/unit`;
- `e2e_logs_pagination` и `e2e_log_payload_roundtrip` для non-admin возвращают passed=true без Admin API;
- `logTestRunFailures(ctx, logPath, results)` пишет каждый failed row с severity `3`, message `[<logPath>] FAIL <id>: <title> — <error>`.

### 12.3 HTTP integration block

Block `int-http-pages`:

| Test ID       | Path           | Required fragments                                                                              |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| `index`       | `/`            | `window.__BOOT__`, `NESO Meta`                                                                  |
| `web-admin`   | `/web/admin`   | If final URL is admin: `window.__BOOT__`, `Админка`; otherwise login/redirect text is accepted. |
| `web-profile` | `/web/profile` | If final URL is profile: `window.__BOOT__`, `Профиль`; otherwise login text is accepted.        |
| `web-login`   | `/web/login`   | `Вход`                                                                                          |
| `web-tests`   | `/web/tests`   | `window.__BOOT__`, `neso-meta-page`                                                             |

HTTP helper behavior:

- `HTTP_PATH_BY_TEST_ID` задает path для всех пяти test ID;
- `HTTP_HTML_SNIPPETS` задает минимальные fragments для обычных страниц;
- `httpPagePassed(testId, res, html)` сначала требует `res.ok`, иначе `HTTP <status>`;
- для `web-admin`, если final URL содержит `/web/admin`, требуются `__BOOT__` и `Админка`; иначе принимается `Вход` или `Перенаправление`;
- для `web-profile`, если final URL содержит `/web/profile`, требуются `__BOOT__` и `Профиль`; иначе принимается `Вход` или `login`;
- неизвестный test ID без snippets считается passed, если HTTP status ok.

### 12.4 Test UI state

`shared/useTestSuites.ts`:

- default tab: `unit`;
- хранит отдельные result arrays для `unit`, `integration`, `http`;
- group loading flags: `unitLoading`, `integrationLoading`, `httpPagesLoading`;
- global loading flags: `runAllTestsLoading`, `runTabTestsLoading`;
- single-run lock: `{ group, id } | null`;
- section open state keyed as `<tab>:<blockId>`, первая секция каждой вкладки раскрыта по умолчанию;
- метрики считаются из каталога и результатов: `total`, `passed`, `failed`, `skipped`;
- `runAllTestsOnCurrentTab()` запускает только активную вкладку;
- `runAllTests()` запускает unit, затем server integration, затем HTTP pages;
- при fetch/route error добавляет failed row `fetch` или failed row конкретного `testId`;
- одиночный запуск unit/integration фактически получает полный API response и upsert-ит одну строку по `testId`;
- HTTP group fetch-ит все страницы последовательно; одиночный HTTP fetch-ит один path.

`shared/testSuiteHelpers.ts`:

- `rowVisual` мапит отсутствие result в `pending`/`ОЖИД`, success в `OK`, fail в `FAIL`;
- `blockRollup` формирует labels `не запускали`, `N пройдено, M с ошибкой`, `N/M пройдено, K без прогона`, `все N пройдены`;
- `upsertTestResults` заменяет строки по `id`, сохраняя Map insertion order;
- `summarizeRows` возвращает `{ total, passed, failed, todo: 0 }`.

## 13. Tooling и type shims

Служебные файлы проекта также входят в область действия спеки.

| Файл              | Нормативное назначение                                                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.json`   | TypeScript/Vue конфигурация проекта: `target/module ESNext`, `moduleResolution bundler`, `rootDir/baseUrl .`, path alias `/* -> ./*`, `jsx preserve`, `strict false`, include `**/*.ts`, `**/*.tsx`, `**/*.vue`, `vue-shim.d.ts`. |
| `jsx.d.ts`        | Локальные определения Chatium JSX, `*.vue`, глобального `window.__BOOT__` и минимального `app.html/get/post/job`.                                                                                                                 |
| `vue-shim.d.ts`   | Локальные Vue type shims и минимальные `app.Req`, `app.Ctx`, `RichUgcCtx` для проекта.                                                                                                                                            |
| `.dir.json`       | Метаданные каталога в workspace; текущее `name` равно `[INWORK] p/units/neso/meta/core`.                                                                                                                                          |
| `.workspace.json` | Включает workspace feature `heap`; не удалять, пока проект использует Heap tables.                                                                                                                                                |
| `.CHATIUM-LLM.md` | Краткий LLM-контекст; должен ссылаться на этот spec-as-source как источник истины.                                                                                                                                                |

Эти файлы не должны становиться местом бизнес-логики. Их изменения требуют проверки импорта Vue/TSX и, если меняется runtime-поведение или доступность Heap, обновления соответствующих разделов спеки.

`tsconfig.json` дополнительно обязан сохранять `lib: ["ESNext", "DOM", "DOM.Iterable"]`, `allowJs:false`, `allowSyntheticDefaultImports:true`, `experimentalDecorators:true`, `esModuleInterop:true`, `skipLibCheck:true`, `forceConsistentCasingInFileNames:true`, `noUncheckedIndexedAccess:false`, `vueCompilerOptions.target:3.5`, `globalTypesPath:"./node_modules/.volar/vue-global-temp.d.ts"`, `exclude: []`.

Type shims не должны подменять реальные runtime imports. Они нужны только для локальной проверки проекта без полных типов Chatium/Vue:

- `jsx.d.ts` расширяет JSX intrinsic elements, объявляет `*.vue`, `Window.__BOOT__`, глобальный `app.html/get/post/job`;
- `vue-shim.d.ts` объявляет минимальные Vue composition API функции, `app.Req`, `app.Ctx`, `RichUgcCtx`.

## 14. Стили, boot и assets

Визуальный язык: темный CRT-интерфейс с нейтральными темными фонами, мягким красным акцентом, FontAwesome icons и моноширинным шрифтом `Share Tech Mono`.

Общие требования:

- Tailwind CDN `/s/static/lib/tailwind.3.4.16.min.js` и FontAwesome CDN `/s/static/lib/fontawesome/6.7.2/css/all.min.css` подключаются в страницах, где их использует UI.
- Google font `Share Tech Mono` подключается через `fonts.googleapis.com`/`fonts.gstatic.com` на страницах с CRT UI.
- Header logo использует внешний thumbnail `https://fs-thb03.getcourse.ru/fileservice/file/thumbnail/h/246c9167ba22ef571b50a2a795ee1186.png/s/300x/a/565681/sc/95`.
- `styles.tsx -> baseHtmlStyles` используется login page и задает светлый tiled background image `https://fs.cdn-chatium.io/thumbnail/image_bXkpfHZFGu.2393x2250.png/s/400x400`.
- Scrollbar styling живет в `styles.tsx -> customScrollbarStyles`.
- `AdminPage` и `TestsPage` используют fixed viewport layout: корневой `.app-layout`, `<main>` и `.ap`/`.tp` занимают полную ширину; основной вертикальный скролл находится в левой колонке content-wrapper, лог-монитор скроллится отдельно.
- На узких экранах layout может переходить в одноколоночный режим и возвращать скролл основному `<main>`.
- Boot loader обязан скрываться через `window.hideAppLoader`, после чего страницы реагируют на `bootloader-complete`.
- Страницы не должны показывать Header до завершения boot loader.

`shared/preloader.ts`:

- экспортирует `getPreloaderStyles()`, `getPreloaderScript()`, `getPreloaderHTML()`;
- boot sequence пишет строки `Инициализация системы...`, `Парсинг HTML документа...`, отслеживает Tailwind, FontAwesome, Google Fonts, затем `Компоненты загружены`, `Инициализация Vue.js...`, `Проверка аутентификации...`, `Система готова к работе`;
- completion запускается на `window.load` или fallback timeout 3000 ms;
- `hideBootLoader()` добавляет `#boot-loader.collapsing`, `body.boot-complete`, через 400 ms скрывает loader, выставляет `window.bootLoaderComplete = true` и dispatch-ит `bootloader-complete`.

CSS-фрагменты `pagecss/*`:

- `headerCss1.ts`, `headerCss2.ts` - Header, logout modal visibility classes and responsive header layout;
- `homeBootCss.ts`, `homePageCss1.ts`, `homePageCss2.ts` - главная, hero typing, geometric/crt фон;
- `profilePageCss1.ts`, `profilePageCss2.ts` - profile page layout/card;
- `adminPageCss1.ts`, `adminPageCss2.ts`, `adminPageCss3.ts` - admin layout, cards, counters, settings, log monitor;
- `testsPageCss1.ts`..`testsPageCss4.ts` - tests toolbar, metrics, tab panels, log monitor.

CSS-фрагменты не импортируют runtime code. Если UI-класс удаляется из Vue template, соответствующий CSS-фрагмент должен быть проверен на мертвые правила.

## 15. Правила изменений

Любое изменение проекта должно поддерживать этот порядок истинности:

1. Обновить этот spec-as-source файл, если меняется поведение, контракт, данные, права, UI-flow, тесты или структура.
2. Обновить код.
3. Обновить старые docs только если они остаются пользовательской навигацией или operational how-to.
4. Запустить релевантные проверки.

Минимальные проверки по типу изменения:

| Изменение            | Проверки                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Routes/links         | `GET /api/tests/unit`, HTTP-вкладка `/web/tests`.                                                        |
| Settings/data        | `GET /api/tests/integration` под Admin.                                                                  |
| Logging              | `GET /api/tests/integration` под Admin, ручная проверка admin log monitor.                               |
| UI pages             | Открыть затронутые SSR pages, проверить boot, Header, auth redirects.                                    |
| Tests catalog        | `GET /api/tests/list`, `GET /api/tests/unit`, визуально `/web/tests`.                                    |
| Browser logging      | Авторизованная страница с remote logger, проверка `/api/logger/browser` и echo/dedup в мониторе.         |
| Admin dashboard      | `GET /api/admin/dashboard/counts`, `POST /api/admin/dashboard/reset`, live increment error/warn.         |
| Broker data/internal | `app.function('/broker/*')`, poll/ack/fail flow, idempotency, retry/dead-letter.                         |
| Broker notification  | Publish with internal/socket subscription, notification attempt row, failure does not rollback delivery. |
| Broker admin ops     | `/api/admin/broker/*`, audit row, reason validation, safe DTOs, raw payload view audit.                  |
| Copy-template docs   | Проверить раздел 15, README и legacy docs, которые остаются навигацией.                                  |

Запрещено:

- добавлять новый API без строки в разделе 11;
- добавлять новую настройку без строки в разделе 9;
- менять Heap schema/table ID без раздела 8 и миграционного комментария;
- добавлять новый broker event type без module-owned `contracts/brokerEvents.ts`, versioned `BrokerEventContracts` registration, payload schema snapshot, `display.summaryFields`, examples and tests;
- добавлять secret setting без redaction в settings list/get responses, SSR props, browser boot, logs, broker event payload/metadata или notification payload;
- включать `BrokerEvents.payload` или secrets в notification payload;
- считать notification доставкой события: обработка всегда должна начинаться с internal poll/claim;
- ack/fail delivery без проверки `claimTokenHash`, `consumerModule` и claimed status;
- добавлять broker admin ops action без `BrokerOpsAudit`, reason/comment, safe DTO, Admin auth and tests;
- отдавать raw `BrokerEvents.payload` в diagnostics list responses; raw payload доступен только отдельным audited route;
- импортировать серверные слои в Vue;
- отключать remote logging на защищенных страницах без явного изменения раздела 10;
- удалять тест ID из раннера или каталога без синхронного изменения раздела 12;
- добавлять CSS runtime logic в `pagecss/*`;
- добавлять новый shared composable без описания его ownership/lifecycle в этой спецификации;
- добавлять retention/pruning/rate limiting логов без явного контракта и тестов.

## 16. Границы реализации

Core реализует системный broker, настройки, логи, тестовую инфраструктуру и admin ops UI. Он не содержит event-specific бизнес-обработчики и не хранит TypeScript signatures конкретных событий: эти контракты принадлежат модулям-владельцам и попадают в core только как `BrokerEventContracts` snapshots.

Внешние интеграции не вызывают core broker напрямую. Наружу смотрят интерфейсные модули, а core остается внутренним серверным слоем.

## 17. Остаточные ограничения

- Login page не подключает browser remote logger, потому что `/api/logger/browser` требует AnyUser.
- Home page публичная и всё равно устанавливает browser remote logger; для Guest отправка `/api/logger/browser` может получить auth-ответ платформы и должна быть проглочена без поломки страницы.
- API semantic errors возвращают JSON `success:false`; HTTP status code платформой явно не нормализован в этой спецификации.
- Некоторые server integration checks зависят от роли Admin и состояния Heap.
- WebSocket lifecycle callbacks зависят от возможностей платформенного socket client; если callbacks недоступны, offline state поддерживается через browser events и ошибки подключения.
- Logs Heap table не имеет retention/pruning. История API ограничивается query `limit`, клиентским MAX 500 и buffer MAX 400, но серверные rows не чистятся автоматически.
- Browser logger не имеет отдельного rate limit, кроме batch max 80 на сервере, batch max 50 и buffer max 400 на клиенте.
- `useRemoteLogging` не использует `sendBeacon`; финальный flush при teardown async и может не завершиться при жестком закрытии вкладки.
- `project_title` и `logs_limit` существуют как настройки шаблона и покрыты тестами, но текущий UI/runtime почти не использует их напрямую.
- HTTP-проверки страниц выполняются в браузере `/web/tests`; отдельного server-side `/api/tests/http` нет.
- Старые документы `docs/architecture.md`, `docs/api.md`, `docs/data.md`, `docs/imports.md`, `docs/ADR/*` остаются полезными справочниками, но не являются источником истины при расхождении с этой спецификацией.
- Broker реализован поверх Heap и polling/claim модели, а не через внешний message broker. Он дает durable at-least-once delivery, но не гарантирует exactly-once, глобальный порядок, мгновенную доставку или постоянное соединение с потребителями.
- Broker notifications являются best-effort wake-up hints. Потеря notification не является потерей события; consumer обязан периодически иметь fallback poll или poll после каждого notification.
- Notification handler потребителя получает только hint без payload события. Данные события доступны только после internal poll в core.

## 18. TODO перед реализацией

По итогам повторного аудита цельности основные broker contracts и admin ops decisions закрыты в нормативных разделах. Перед runtime-реализацией остается технический checklist и post-implementation ревизия выбранной retry-модели.

### 18.1 Runtime implementation checklist

Технический checklist перед написанием runtime-кода:

- создать файлы строго по инвентарю раздела 3.1, включая broker tables/repos/libs/functions/job/admin routes/components;
- реализовать generic broker DTOs и stable semantic error codes из раздела 11.3/11.5 без event-specific payload signatures в core;
- реализовать module-owned convention `contracts/brokerEvents.ts` в потребляющих модулях, а в core - регистрацию immutable `BrokerEventContracts`;
- реализовать `BrokerDeliveries` с materialized hot polling fields и `claimedUntil`;
- реализовать `jobs/broker/notifications-dispatch.ts` как единственное место отправки notification hints;
- реализовать broker ops panel через `/api/admin/broker/*`, `BrokerOpsAudit`, raw payload viewer и safety guards;
- синхронизировать `shared/testCatalog.ts` и runners с тестами раздела 12;
- после кода проверить разделы README, `.CHATIUM-LLM.md`, `docs/architecture.md`, `docs/api.md`, `docs/data.md` и legacy ADR, потому что этот spec теперь является источником истины.

### 18.2 Post-implementation retry state revision

После первой реализации broker-а нужно отдельно пересмотреть выбранную модель delivery retry state machine:

- проверить по runtime-поведению и ops UI, достаточно ли понятен статус `failed` как retry-waiting state;
- оценить, не нужна ли явная модель `retry_waiting` или lazy `failed -> pending`;
- проверить, что прямой переход `failed -> claimed` не усложняет diagnostics, metrics, admin requeue и alerting;
- по итогам ревизии либо подтвердить вариант A как постоянный контракт, либо обновить разделы 8.7, 11.3, 12 и этот TODO.

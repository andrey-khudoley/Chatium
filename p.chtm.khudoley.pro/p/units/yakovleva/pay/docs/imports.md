# Импорты страниц и схема зависимостей

## 1) Страницы‑роуты (TSX entrypoints)

### `./config/routes.tsx`

- нет внутренних импортов (только экспорт PROJECT_ROOT, ROUTES, getFullUrl, withProjectRoot, withProjectRootAndSubroute)

### `./config/project.tsx`

- нет внутренних импортов (только экспорт DEFAULT_PROJECT_TITLE, INDEX_PAGE_NAME, PROFILE_PAGE_NAME, ADMIN_PAGE_NAME, TESTS_PAGE_NAME, getPageTitle, getHeaderText, BODY_TEXT, BODY_SUBTEXT)
- удалены: `PANEL_PAGE_NAME`, `CREATE_BILL_PAGE_NAME` (перенесены: `PANEL_PAGE_NAME` локально в `index.tsx`; `CREATE_BILL_PAGE_NAME` не использовался)

### `./index.tsx`

- `@app/html-jsx` → `jsx`
- `./pages/HomePage.vue` (компонент `ClientHomePage`)
- `./pagecss/sbpHomeCss1` .. `./pagecss/sbpHomeCss4` (инжект через `<style>`)
- локальная константа `PANEL_PAGE_NAME = 'Панель'` (перенесена из `config/project.tsx`)
- `./lib/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `./styles` → `customScrollbarStyles`
- `./lib/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `./lib/htmlRedirect` → `htmlRedirect`
- `./config/routes` → `getFullUrl`, `ROUTES`
- `./config/project` → `INDEX_PAGE_NAME`, `BODY_TEXT`, `BODY_SUBTEXT`, `getPageTitle`, `getHeaderText`
- `./lib/logger.lib` → `*`
- `./lib/settings.lib` → `*`

### `./web/admin/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireAccountRole`
- `@app/socket` → `genSocketId`
- `../../pages/AdminPage.vue`
- `../../pagecss/sbpAdminCss1` .. `../../pagecss/sbpAdminCss4` (инжект через `<style>`)
- `../login` → `loginPageRoute`
- `../../lib/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../lib/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../styles` → `customScrollbarStyles`
- `../../lib/logger.lib` → `getAdminLogsSocketId`, `writeServerLog` (и др.)
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `ADMIN_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`

### `./web/profile/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `../../pages/ProfilePage.vue`
- `../../lib/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../lib/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../lib/htmlRedirect` → `htmlRedirect`
- `../../styles` → `customScrollbarStyles`
- `../../lib/logger.lib` → `*`
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `PROFILE_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`

### `./web/tests/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`, `requireAccountRole` (страница только для роли Admin)
- `@app/socket` → `genSocketId`
- `../../lib/logger.lib` → `getAdminLogsSocketId`
- `../../pages/TestsPage.vue`
- `../../pagecss/sbpTestsCss1` .. `../../pagecss/sbpTestsCss3` (инжект через `<style>`)
- `../../lib/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../lib/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../lib/htmlRedirect` → `htmlRedirect`
- `../../styles` → `customScrollbarStyles`
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `TESTS_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`

### `./web/login/index.tsx`

- `@app/html-jsx` → `jsx`
- `../../pages/LoginPage.vue`
- `../../styles` → `baseHtmlStyles`, `customScrollbarStyles`
- `../../config/routes` → `PROJECT_ROOT`
- `../../lib/logger.lib` → `*`

## 2) Страницы‑компоненты (Vue)

### `./pages/HomePage.vue` (компонент `ClientHomePage`)

- `vue` → `onMounted`, `onUnmounted`, `ref` и др. (через mixin)
- `./sbpHomePageMixin` → mixin с логикой вкладок, реактивным состоянием, fetch-вызовами
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../components/home/HomeStatusStrip.vue`, `HomeToolbar.vue`, `HomeSearchResult.vue`, `HomeOverviewTab.vue`, `HomeRequestsTab.vue`, `HomeWebhooksTab.vue`, `HomeCreateRequestTab.vue`, `HomeAccessTab.vue`, `HomeRawModal.vue`, `HomeCreateInviteModal.vue`
- `../shared/sbpHomeFormat` → форматтеры/хелперы вкладок
- `../shared/operationsClientCatalog` → `buildInitialRequestState` (начальное состояние формы «Создать запрос»)
- `../shared/logger` → `createComponentLogger`

### `./pages/sbpHomePageMixin.ts`

- `vue` → Options API mixin
- `../shared/sbpHomeFormat` → форматтеры и helpers (чистые, без Heap/ctx)
- `../shared/correlation` → `generateCorrelationId`, `appendCorrelationId` (для специального кейса LifePay.createBill в submitRequest)
- `../shared/operationsClientCatalog` → `findClientOperation`, `validateForm`, `buildArgs`, `buildEmptyForm` (универсальный submitRequest / onChangeOperationKey)

### `./pages/AdminPage.vue`

- `vue` → `onMounted`, `onBeforeUnmount`, `onUnmounted`, `ref`, `computed`, `watch`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../components/LogStreamPanel.vue` → `LogStreamPanel` (лог-панель; `enable-expand-all=false`)
- `../components/admin/AdminCounters.vue`, `AdminProjectSettings.vue`, `AdminLogLevel.vue`, `AdminLifePaySettings.vue`
- `../shared/useLogsSocket` → composable управления WebSocket-потоком логов
- `../shared/logger` → `createComponentLogger`, `setLogSink`, `LogEntry`

### `./pages/ProfilePage.vue`

- `vue` → `onMounted`, `onUnmounted`, `ref`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../shared/logger` → `createComponentLogger`

### `./pages/TestsPage.vue`

- `vue` → `onMounted`, `onBeforeUnmount`, `onUnmounted`, `ref`, `computed`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../components/LogStreamPanel.vue` → `LogStreamPanel` (лог-панель; `enable-expand-all=true`)
- `../components/tests/TestsToolbar.vue`, `TestsMetrics.vue`, `TestSuiteTab.vue`
- `../shared/useTestSuites` → composable управления прогонами тест-наборов
- `../shared/testSuiteHelpers` → чистые хелперы форматирования результатов
- `../shared/logger` → `createComponentLogger`, `setLogSink`, `LogEntry`

### `./pages/LoginPage.vue`

- `vue` → `computed`, `onMounted`
- `../shared/logger` → `createComponentLogger`

## 3) Компоненты (components/)

### `./components/home/*` (11 файлов)

Подкомпоненты главной страницы: `HomeStatusStrip.vue`, `HomeToolbar.vue`, `HomeSearchResult.vue`, `HomeOverviewTab.vue`, `HomeRequestsTab.vue`, `HomeWebhooksTab.vue`, `HomeCreateRequestTab.vue`, `HomeAccessTab.vue`, `HomeRawModal.vue`, `HomeCreateInviteModal.vue`, `HomePaymentPageTab.vue`.

- `vue` → Composition API / Options API; `watch` — в `HomeSettingsTab.vue`, `HomeWidgetSettings.vue`, `HomePaymentPageTab.vue`
- `../shared/logger` → `createComponentLogger` (где используется)
- `../shared/sbpHomeFormat` (где нужна форматировка)
- `../../shared/operationsClientCatalog` → `groupOperationsForUi`, `findClientOperation`, `gatewayLabel`, `operationKey`, `validateForm` (только HomeCreateRequestTab)
- `../shared/useSettingsAutoSave` → `useSettingsAutoSave`, тип `AutoSaveResult` — в `HomeSettingsTab.vue`, `HomeWidgetSettings.vue`, `HomePaymentPageTab.vue`

### `./components/admin/*` (4 файла)

Подкомпоненты страницы AdminPage: `AdminCounters.vue`, `AdminProjectSettings.vue`, `AdminLogLevel.vue`, `AdminLifePaySettings.vue`.

- `vue` → Composition API
- `../shared/logger` → `createComponentLogger`

### `./components/tests/*` (3 файла)

Подкомпоненты страницы TestsPage: `TestsToolbar.vue`, `TestsMetrics.vue`, `TestSuiteTab.vue`.

- `vue` → Composition API
- `../shared/logger` → `createComponentLogger`
- `../shared/testCatalog` (TestSuiteTab — блоки каталога)

### `./components/LogStreamPanel.vue`

- `vue` → `ref`, `computed`, `defineExpose`
- `../shared/logger` → `LogEntry`
- публичный контракт через `defineExpose`: `pushEntry(entry)` — добавить запись в панель; `loadRecent()` — загрузить последние записи с сервера
- пропсы: `recentLogsRoute`, `logsBeforeRoute`, `enableExpandAll` (bool, default false)
- используется в: `pages/AdminPage.vue` (`enable-expand-all=false`), `pages/TestsPage.vue` (`enable-expand-all=true`)

### `./components/Header.vue`

- `vue` → `ref`, `onMounted`, `onUnmounted`
- `./LogoutModal.vue`
- `../shared/logger` → `createComponentLogger`

### `./components/LogoutModal.vue`

- `vue` → `watch`, `onMounted`
- `../shared/logger` → `createComponentLogger`

### `./components/AppFooter.vue`

- `vue` → `onMounted`
- `../shared/logger` → `createComponentLogger`

### `./components/GlobalGlitch.vue`

- `vue` → `onMounted`
- `../shared/logger` → `createComponentLogger`

## 4) Shared (общий код)

### `./styles.tsx`

- нет внутренних импортов (только экспорт `baseHtmlStyles`, `customScrollbarStyles`)

### `./shared/testCatalog.ts`

- первая строка: `// @shared`
- реэкспортирует из `./testCatalogUnit` и `./testCatalogIntegration`
- содержит: общие типы (`TestBlock`, `TestEntry`, `flattenCatalogBlocks`), `INTEGRATION_HTTP_TEST_BLOCK`

### `./shared/testCatalogUnit.ts`

- первая строка: `// @shared`
- нет импортов — юнит-блоки каталога (`UNIT_TEST_BLOCKS`): unit-settings, unit-logger, unit-gateway, unit-access, unit-correlation и др.

### `./shared/testCatalogIntegration.ts`

- первая строка: `// @shared`
- нет импортов — интеграционные блоки (`INTEGRATION_SERVER_TEST_BLOCKS`): int-core, int-api, int-e2e, int-date-filter, int-access и др.

### `./shared/sbpHomeFormat.ts`

- первая строка: `// @shared`
- нет импортов (чистые форматтеры и helpers без Heap/ctx)
- используется в: `pages/sbpHomePageMixin.ts`, `components/home/*`

### `./shared/useSettingsAutoSave.ts`

- `vue` → Composition API (composable)
- нет внутренних импортов
- экспортирует: `useSettingsAutoSave` (composable), типы `AutoSaveResult`, `AutoSaveFn`, `UseSettingsAutoSaveOptions`
- используется в: `components/home/HomeSettingsTab.vue`, `components/home/HomeWidgetSettings.vue`, `components/home/HomePaymentPageTab.vue`

### `./shared/useLogsSocket.ts`

- `vue` → Composition API (composable)
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `./logger` → `LogEntry`, `createComponentLogger`
- используется в: `pages/AdminPage.vue`

### `./shared/useTestSuites.ts`

- `vue` → Composition API (composable)
- `./testCatalog` → блоки каталога
- `./logger` → `createComponentLogger`
- используется в: `pages/TestsPage.vue`

### `./shared/testSuiteHelpers.ts`

- первая строка: `// @shared`
- нет импортов (чистые хелперы форматирования результатов тест-прогонов)
- используется в: `shared/useTestSuites.ts`, `components/tests/*`

### `./shared/logger.ts`

- нет импортов (клиентский логгер по syslog RFC 5424: severity -1…7, LOG_LEVEL_OFF=-1, читает window.**BOOT**.logLevel; createComponentLogger, setLogSink, LogEntry)

### `./shared/correlation.ts`

- первая строка: `// @shared`
- нет внутренних импортов — чистые функции без Heap/ctx/сети
- экспортирует: `generateCorrelationId`, `appendCorrelationId`, `extractCorrelationId`, `mergeWebhooksById`
- используется в: `pages/PanelHomePage.vue` (generateCorrelationId + appendCorrelationId), `api/gateways/invoke.ts` (extractCorrelationId), `webhooks/lifepay/index.tsx` (extractCorrelationId), `api/gateways/search-by-request-id.ts` (mergeWebhooksById), `lib/tests/lifepayUnitSuite.ts` (все четыре функции)

## 5) pagecss/ (CSS-модули)

Каталог `pagecss/` содержит 18 файлов (каждый ≤350 строк), экспортирующих строковые константы CSS. Нет внутренних импортов. Импортируются **только** из TSX-роутов (`index.tsx`, `web/admin/index.tsx`, `web/profile/index.tsx`, `web/tests/index.tsx`) через инжект `<style>{cssConst}</style>`. В `.vue`-файлы импортировать запрещено.

| Группа файлов            | TSX-роут                                     |
| ------------------------ | -------------------------------------------- |
| `sbpHomeCss1..4.ts`      | `index.tsx`                                  |
| `sbpAdminCss1..4.ts`     | `web/admin/index.tsx`                        |
| `sbpTestsCss1..3.ts`     | `web/tests/index.tsx`                        |
| `sbpProfileCss1.ts`      | `web/profile/index.tsx`                      |
| `sbpHeaderCss1..2.ts`    | все роуты, где есть Header.vue               |
| `sbpLogStreamCss1..2.ts` | `web/admin/index.tsx`, `web/tests/index.tsx` |

## 7) Таблицы (tables/)

### `./tables/settings.table.ts`

- `@app/heap` → `Heap`

### `./tables/logs.table.ts`

- `@app/heap` → `Heap`

## 8) Репозитории (repos/)

### `./repos/settings.repo.ts`

- `../tables/settings.table` → `Settings`, `SettingsRow`
- (не импортирует logger.lib — иначе рекурсия: writeServerLog → getLogLevel → getSetting → findByKey → writeServerLog)

### `./repos/logs.repo.ts`

- `../tables/logs.table` → `Logs`, `LogsRow`
- `../lib/logger.lib` → `*`
- экспортирует: `create`, `findAll`, `findById`, `findBeforeTimestamp`, `countBySeverityAfter`, `countErrorsAfter`, `countWarningsAfter`

### `./repos/requestLog.repo.ts`

- `../tables/requestLog.table` → `RequestLog`, `RequestLogRow`
- `../lib/logger.lib` → `*`
- экспортирует: `create`, `findById`, `findByOrderNumber`, `findByRequestId`, `countSince`, `countOkSince`, `findInRange`, `countInRange`, `countOkInRange` (диапазон `$gte/$lt` по `requestedAt`, cursor-пагинация ≤ 1000); `@deprecated`: `findRecent`, `findBeforeRequestedAt`, `findRecentSince`

### `./repos/webhookLog.repo.ts`

- `../tables/webhookLog.table` → `WebhookLog`, `WebhookLogRow`
- `../lib/logger.lib` → `*`
- экспортирует: `create`, `findById`, `findByOrderNumber`, `findByOrderNumberInRange`, `countSince`, `countStatusSuccessSince`, `countTokenValidSince`, `findInRange`, `countInRange`, `countStatusSuccessInRange`, `countTokenValidInRange` (диапазон `$gte/$lt` по `processedAt`); `@deprecated`: `findRecent`, `findRecentSince`

## 9) Библиотеки (lib/)

### `./lib/preloader.ts`

- нет импортов (перенесён из `shared/preloader.ts`; серверный SSR-хелпер, не импортируется из .vue)
- экспортирует: `getPreloaderStyles`, `getPreloaderScript`

### `./lib/logLevel.ts`

- `./settings.lib` → `getLogLevel`, `LogLevel`
- `./logger.lib` → `*`
- перенесён из `shared/logLevel.ts`; серверный хелпер, не импортируется из .vue
- в `shared/testCatalog.ts` заголовок блока обновлён на `lib/logLevel`
- в `lib/tests/templateUnitSuite.ts` импорт: `../logLevel`

### `./lib/htmlRedirect.ts`

- нет внутренних импортов
- экспортирует: `htmlRedirect(ctx, location, statusCode?)` — типобезопасный редирект из `app.html`-роутов через `ctx.resp`; используется в `index.tsx`, `web/access/invite`, `web/forbidden`, `web/panel`, `web/profile`, `web/tests`

### `./lib/settings.lib.ts`

- `../repos/settings.repo` → `*` (findByKey, findAll, upsert, deleteByKey)
- `./logger.lib` → `*` (только для функций, не вызываемых из logger.lib: getSettingString, getLogsLimit, getDashboardResetAt, getAllSettings)
- `./settings.mutations` → `setSetting` (re-export для обратной совместимости импортов)

### `./lib/settings.mutations.ts`

- `../repos/settings.repo` → `*` (upsert, deleteByKey)
- `./logger.lib` → `*`
- экспортирует: `setSetting` (запись/сброс значения настройки)
- **Зависимость:** `settings.lib` → `settings.mutations` (re-export); прямой импорт `settings.mutations` из `settings.lib` допустим, цикла нет (mutations не импортирует settings.lib)

### `./lib/admin/dashboard.lib.ts`

- `../settings.lib` → `*` (getDashboardResetAt, setSetting, SETTING_KEYS)
- `../../repos/logs.repo` → `*` (countErrorsAfter, countWarningsAfter)
- `../logger.lib` → `*`

### `./lib/logger.lib.ts`

- `./settings.lib` → `*` (getLogLevel, getLogWebhook, LogLevel)
- `../repos/logs.repo` → `*` (create)
- `@app/socket` → `sendDataToSocket`
- `@app/request` → `request`
- экспортирует дополнительно: `severityToPlatformLogLevel` (маппинг syslog severity → платформенный LogLevel для `ctx.account.log`)

## 10) API (api/)

### `./api/settings/list.ts`

- `@app/auth` → `requireAccountRole`
- `../../lib/settings.lib` → `*`
- `../../lib/logger.lib` → `*`

### `./api/settings/get.ts`

- `@app/auth` → `requireAccountRole`
- `../../lib/settings.lib` → `*`
- `../../lib/logger.lib` → `*`

### `./api/settings/save.ts`

- `@app/auth` → `requireAccountRole`
- `../../lib/settings.lib` → `*`
- `../../lib/logger.lib` → `*`

### `./api/logger/log.ts`

- `@app/auth` → `requireAnyUser`
- `../../lib/logger.lib` → `*`

### `./api/admin/logs/recent.ts`

- `@app/auth` → `requireAccountRole`
- `../../../repos/logs.repo` → `*`
- `../../../lib/logger.lib` → `*`
- `../../../tables/logs.table` → `LogsRow` (type)

### `./api/admin/logs/before.ts`

- `@app/auth` → `requireAccountRole`
- `../../../repos/logs.repo` → `*`
- `../../../lib/logger.lib` → `*`
- `../../../tables/logs.table` → `LogsRow` (type)

### `./api/admin/dashboard/counts.ts`

- `@app/auth` → `requireAccountRole`
- `../../../lib/admin/dashboard.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/admin/dashboard/reset.ts`

- `@app/auth` → `requireAccountRole`
- `../../../lib/admin/dashboard.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/gateways/analytics/filter-save.ts` (новый — глобальный фильтр панели)

- `../../../lib/access/apiGuard` → `guardInternalApi`
- `../../../lib/logger.lib` → `*`
- `../../../lib/settings.lib` → `*` (`setSetting`, `SETTING_KEYS`, `DateFilter`)
- `../../../repos/settings.repo` → `*` (`deleteByKey` для сброса)
- POST `/`; тело `{ from?, to? }` (Unix ms), сброс при отсутствии обеих границ; ответ `{ success, filter }`

### `./api/gateways/analytics/summary.ts`, `./api/gateways/recent-requests.ts`, `./api/gateways/recent-webhooks.ts`, `./api/gateways/search-by-request-id.ts`

- общий паттерн: `../../../lib/access/apiGuard`→`guardInternalApi`, `../../../lib/logger.lib`, `repos/*` (`requestLog.repo`, `webhookLog.repo`)
- читают глобальный фильтр через `lib/settings.lib`→`getPanelDateFilter` и применяют `findInRange`/`countInRange*` (диапазон `$gte/$lt`)

### `./api/tests/list.ts`

- `@app/auth` → `requireAccountRole` (Admin-only)
- `../../lib/logger.lib` → `*`
- `../../shared/testCatalog` → `UNIT_TEST_BLOCKS`, `INTEGRATION_SERVER_TEST_BLOCKS`, `INTEGRATION_HTTP_TEST_BLOCK`, `flattenCatalogBlocks`

### `./api/tests/unit/index.ts`

- `@app/auth` → `requireAccountRole` (Admin-only)
- `../../../lib/logger.lib` → `*`
- `../../../lib/tests/templateUnitSuite` → `runTemplateUnitChecks`, `TemplateUnitTestResult`
- `../../../lib/tests/logTestRunFailures` → `logTestRunFailures`

### `./api/tests/integration/index.ts`

- `@app/auth` → `requireAccountRole` (Admin-only)
- `../../../lib/logger.lib` → `*`
- `../../../lib/tests/integrationSuite` → `runTemplateIntegrationChecks`
- `../../../lib/tests/logTestRunFailures` → `logTestRunFailures`

### `./lib/tests/logTestRunFailures.ts`

- `../logger.lib` → `writeServerLog` — поштучное логирование провалов тестов (severity 3)

### `./lib/tests/templateUnitSuite.ts` + helpers

- `templateUnitSuite.ts` (точка входа, re-export `runTemplateUnitChecks`): импортирует `./templateUnitSuiteHelpers` и `./templateUnitRoutesChecks`
- `templateUnitSuiteHelpers.ts` (55 строк): общие хелперы прогона шаблонных тестов
- `templateUnitRoutesChecks.ts` (179 строк): проверки роутинга и конфига
- Все три: `../logger.lib`, `../settings.lib`, `../logLevel`, `config/*`, `shared/*`, `shared/testCatalog`

### `./lib/tests/integrationSuite.ts` + разделы

- `integrationSuite.ts` (точка входа, 31 строка, re-export `runTemplateIntegrationChecks`)
- `integrationSuiteHelpers.ts` (39 строк): хелперы
- `integrationCoreSuite.ts` (277 строк): базовые Heap-тесты
- `integrationApiSuite.ts` (86 строк): API-тесты
- `integrationE2eSuite.ts` (106 строк): сквозные тесты
- `integrationDateFilterSuite.ts` (122 строки): тесты фильтра панели
- `integrationAccessSuite.ts` (196 строк): тесты жизненного цикла инвайта/гранта
- Общие зависимости: `../settings.lib`, `repos/*`, `../admin/dashboard.lib`, `../logger.lib`, `api/*`

### `./lib/tests/lifepayUnitSuite.ts` + фазы

- `lifepayUnitSuite.ts` (53 строки, точка входа, re-export `runLifepayUnitChecks`): импортирует все фазы
- `lifepayUnitHelpers.ts` (50 строк): общие хелперы
- `lifepayUnitPhase1Catalog.ts` (89 строк): тесты каталога gateway-операций
- `lifepayUnitPhase2Redaction.ts` (234 строки): тесты redact/redactRaw
- `lifepayUnitPhase3Settings.ts` (174 строки): тесты валидации настроек
- `lifepayUnitPhase4Webhook.ts` (298 строк): тесты обработки webhook
- `lifepayUnitPhase5Correlation.ts` (156 строк): тесты correlationId-связки (7 тестов блока `unit-correlation`)
- Общие зависимости: `../gateway/buildInvokeUrl`, `../../shared/redact`, `../../shared/redactRaw`, `../../shared/gatewayContract`, `../settings.lib`, `../webhook/processWebhook`, `../access/*`, `../../shared/correlation`

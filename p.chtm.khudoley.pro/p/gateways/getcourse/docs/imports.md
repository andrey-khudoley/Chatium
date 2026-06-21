# Импорты страниц и схема зависимостей

## 1) Страницы‑роуты (TSX entrypoints)

### `./config/routes.tsx`

- нет внутренних импортов (только экспорт PROJECT_ROOT, ROUTES, getFullUrl, withProjectRoot, withProjectRootAndSubroute)

### `./config/project.tsx`

- нет внутренних импортов (только экспорт DEFAULT_PROJECT_TITLE, INDEX_PAGE_NAME, PROFILE_PAGE_NAME, ADMIN_PAGE_NAME, TESTS_PAGE_NAME, getPageTitle, getHeaderText, BODY_TEXT, BODY_SUBTEXT)

### `./index.tsx`

- `@app/html-jsx` → `jsx`
- `./pages/HomePage.vue`
- `./lib/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `./styles` → `customScrollbarStyles`
- `./lib/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `./config/routes` → `getFullUrl`, `ROUTES`
- `./config/project` → `INDEX_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `./lib/logger.lib` → `*`
- `./lib/settings.lib` → `*` (включая `getPanelDateFilter`)
- `./lib/access/requireInternalAccess` → `requireInternalAccess`
- `./lib/gateway/operationsCatalog` → `toOperationSummaries` (передаётся как SSR-проп в `web/tests/index.tsx`)

### `./web/admin/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireAccountRole`
- `@app/socket` → `genSocketId`
- `../../pages/AdminPage.vue`
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
- `../../styles` → `customScrollbarStyles`
- `../../lib/logger.lib` → `*`
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `PROFILE_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`

### `./web/tests/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `@app/socket` → `genSocketId`
- `../../lib/logger.lib` → `getAdminLogsSocketId`
- `../../pages/TestsPage.vue`
- `../../lib/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../lib/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
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

### `./pages/HomePage.vue` (главная панель)

- `vue` → `onMounted`, `onBeforeUnmount`, `onUnmounted`, `ref`, `computed`, `watch`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../shared/logger` → `createComponentLogger`, `setLogSink`, `LogEntry`
- Данные через `fetch` по `props.apiUrls`: recentRequests, recentUpstream, rawRequest, rawUpstream, counts, filterSave

### `./pages/AdminPage.vue`

- `vue` → `onMounted`, `onBeforeUnmount`, `onUnmounted`, `ref`, `computed`, `watch`
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../api/settings/get` → `getSettingRoute`
- `../api/settings/save` → `saveSettingRoute`
- `../shared/gatewaySettingKeys` → `GC_DEVELOPER_API_KEY`, `GC_TEST_SCHOOL_API_KEY`, `GC_TEST_SCHOOL_HOST`
- `../shared/gcSchoolHostValidation` → `getGcSchoolHostFieldError`
- `../api/admin/logs/recent` → `getRecentLogsRoute`
- `../api/admin/logs/before` → `getLogsBeforeRoute`
- `../api/admin/dashboard/counts` → `getDashboardCountsRoute`
- `../api/admin/dashboard/reset` → `resetDashboardRoute`
- `../shared/logger` → `createComponentLogger`, `setLogSink`, `LogEntry`
- (секция «Аналитика вызовов /v1/{op}» и `gatewayAnalyticsInvocationsRoute` удалены)

### `./pages/ProfilePage.vue`

- `vue` → `onMounted`, `onUnmounted`, `ref`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../shared/logger` → `createComponentLogger`

### `./pages/TestsPage.vue`

- `vue` → `onMounted`, `onBeforeUnmount`, `onUnmounted`, `ref`, `computed`
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../shared/logger` → `createComponentLogger`, `setLogSink`, `LogEntry`
- `../shared/testCatalog` → блоки и тесты каталога (`UNIT_TEST_BLOCKS`, …)
- `../api/admin/logs/recent` → `getRecentLogsRoute`
- `../api/admin/logs/before` → `getLogsBeforeRoute`

### `./pages/LoginPage.vue`

- `vue` → `computed`, `onMounted`
- `../shared/logger` → `createComponentLogger`

## 3) Компоненты (components/)

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

### `./shared/gatewaySettingKeys.ts`

- первая строка: `// @shared`
- нет импортов — строковые ключи Heap для gateway (`GC_DEVELOPER_API_KEY`, `GC_TEST_SCHOOL_API_KEY`, `GC_TEST_SCHOOL_HOST` и далее по плану)

### `./shared/gcSchoolHostValidation.ts`

- первая строка: `// @shared`
- нет импортов — `validateGcSchoolHostTrimmed`, `GcSchoolHostValidationError`, `normalizeGcTestSchoolHost`, `getGcSchoolHostFieldError`, `assertValidGcSchoolHostTrimmed` (deprecated; хост / `X-Gc-School-Host`, manual §2.5)

### `./shared/redactRaw.ts`

- первая строка: `// @shared`
- нет импортов — `redactRawDeep`: маскирование секретов GC (`gc_developer_api_key`, `x-gc-school-api-key` и др.) и PII; лимит 64 KiB; защита от циклических ссылок

### `./shared/operationsCatalogShared.ts`

- первая строка: `// @shared`
- нет импортов — тип `OperationSummary` и `OperationSummaryField` для wire-формата `GET /v1/operations` (`fields[]`)

### `./shared/testCatalog.ts`

- первая строка: `// @shared`
- нет импортов — каталог блоков для `/api/tests/list` и UI тестов (заголовок блока logLevel ссылается на `lib/logLevel`)

### `./shared/logger.ts`

- нет импортов (клиентский логгер по syslog RFC 5424: severity -1…7, LOG_LEVEL_OFF=-1, читает window.**BOOT**.logLevel; createComponentLogger, setLogSink, LogEntry)

## 5) Таблицы (tables/)

### `./tables/settings.table.ts`

- `@app/heap` → `Heap`

### `./tables/logs.table.ts`

- `@app/heap` → `Heap`

### `./tables/gatewayRequestLog.table.ts`

- `@app/heap` → `Heap`

### `./tables/gatewayUpstreamLog.table.ts`

- `@app/heap` → `Heap`

## 6) Репозитории (repos/)

### `./repos/settings.repo.ts`

- `../tables/settings.table` → `Settings`, `SettingsRow`
- (не импортирует logger.lib — иначе рекурсия: writeServerLog → getLogLevel → getSetting → findByKey → writeServerLog)

### `./repos/logs.repo.ts`

- `../tables/logs.table` → `Logs`, `LogsRow`
- `../lib/logger.lib` → `*`
- экспортирует: `create`, `findAll`, `findById`, `findBeforeTimestamp`, `countBySeverityAfter`, `countErrorsAfter`, `countWarningsAfter`

### `./repos/gatewayRequestLog.repo.ts`

- `../tables/gatewayRequestLog.table` → `GatewayRequestLog`, `GatewayRequestLogRow`
- экспортирует: `create`, `findRecent`, `findRecentFiltered`, `findById`, `countSince`, `countErrorsSince`

### `./repos/gatewayUpstreamLog.repo.ts`

- `../tables/gatewayUpstreamLog.table` → `GatewayUpstreamLog`, `GatewayUpstreamLogRow`
- экспортирует: `create`, `findRecent`, `findByRequestId`, `countSince`, `countOkSince`

## 7) Библиотеки (lib/)

### `./lib/preloader.ts`

- нет импортов — SSR-хелперы `getPreloaderStyles`, `getPreloaderScript` (серверный код; перенесён из `shared/` для соблюдения слоёв)

### `./lib/logLevel.ts`

- `./settings.lib` → `getLogLevel`, `LogLevel`
- `./logger.lib` → `*`
- экспортирует `getLogLevelForPage`, `getLogLevelScript` (серверные SSR-хелперы; перенесён из `shared/` для соблюдения слоёв; `LOG_PATH = 'lib/logLevel'`)

### `./lib/settings.lib.ts`

- `../shared/gatewaySettingKeys` → `GC_DEVELOPER_API_KEY`, `GC_TEST_SCHOOL_API_KEY`, `GC_TEST_SCHOOL_HOST`
- `../shared/gcSchoolHostValidation` → `validateGcSchoolHostTrimmed`
- `../repos/settings.repo` → `*` (findByKey, findAll, upsert, deleteByKey)
- `./logger.lib` → `*` (только для функций, не вызываемых из logger.lib: getSettingString, getLogsLimit, getDashboardResetAt, getAllSettings, setSetting)

### `./lib/admin/dashboard.lib.ts`

- `../settings.lib` → `*` (getDashboardResetAt, setSetting, SETTING_KEYS)
- `../../repos/logs.repo` → `*` (countErrorsAfter, countWarningsAfter)
- `../logger.lib` → `*`

### `./lib/logger.lib.ts`

- `./settings.lib` → `*` (getLogLevel, getLogWebhook, LogLevel)
- `../repos/logs.repo` → `*` (create)
- `@app/socket` → `sendDataToSocket`
- `@app/request` → `request`
- экспортирует: `writeServerLog`, `throwLoggedServerError`, `ThrowLoggedServerErrorOptions`, `SERVER_ERROR_ALREADY_LOGGED`, `isServerErrorAlreadyLogged`, `getAdminLogsSocketId`, `shouldLogByLevel`, `ServerLogEntry`

## 8) API (api/)

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

### `./api/v1/{op}.ts` (59 операций, рукописные per-op хендлеры)

- `../../lib/gateway/handleV1Op` → `handleV1Op` / `handleV1OpWithGcDiagnostic`
- `../../lib/gateway/newGcApiClient` или `legacyGcImportClient` / `legacyGcExportGet` (зависит от контура op)
- экспорт: `{op}Handler: V1GcHandler`, `{op}Route`

### `./api/v1/operations.ts`

- `../../lib/gateway/operationsCatalog` → `toOperationSummaries`, `CATALOG_SCHEMA_VERSION`
- `../../lib/gateway/requestId`, `v1TuneResponse`, `logger.lib`
- (gatewayWorkspaceEvents и serializeArgsSchemaForCatalog — удалены)

### `./api/admin/raw/requests/recent.ts`, `./api/admin/raw/requests/get.ts`

- `../../../../lib/access/apiGuard` → `guardInternalApi`
- `../../../../repos/gatewayRequestLog.repo` → `*`
- `../../../../lib/logger.lib` → `*`

### `./api/admin/raw/upstream/recent.ts`, `./api/admin/raw/upstream/get.ts`

- `../../../../lib/access/apiGuard` → `guardInternalApi`
- `../../../../repos/gatewayUpstreamLog.repo` → `*`
- `../../../../lib/logger.lib` → `*`

### `./api/admin/dashboard/gatewayCounts.ts`

- `../../../../lib/access/apiGuard` → `guardInternalApi`
- `../../../../repos/gatewayRequestLog.repo` → `countSince`, `countErrorsSince`
- `../../../../repos/gatewayUpstreamLog.repo` → `countOkSince`
- `../../../../lib/logger.lib` → `*`

### `./api/admin/analytics/filter-save.ts`

- `../../../../lib/access/apiGuard` → `guardInternalApi`
- `../../../../lib/settings.lib` → `getPanelDateFilter`, `setSetting`, `SETTING_KEYS`
- `../../../../lib/logger.lib` → `*`

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

### `./api/tests/list.ts`

- `@app/auth` → `requireAnyUser`
- `../../lib/logger.lib` → `*`
- `../../shared/testCatalog` → `UNIT_TEST_BLOCKS`, `INTEGRATION_SERVER_TEST_BLOCKS`, `INTEGRATION_HTTP_TEST_BLOCK`, `flattenCatalogBlocks`

### `./api/tests/unit/index.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/tests/templateUnitSuite` → `runTemplateUnitChecks`, `TemplateUnitTestResult`
- `../../../lib/tests/logTestRunFailures` → `logTestRunFailures`

### `./api/tests/integration/index.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/tests/integrationSuite` → `runTemplateIntegrationChecks`
- `../../../lib/tests/logTestRunFailures` → `logTestRunFailures`

### `./lib/tests/logTestRunFailures.ts`

- `../logger.lib` → `writeServerLog` — поштучное логирование провалов тестов (severity 3)

### `./lib/tests/templateUnitSuite`

- `../logger.lib`, `../settings.lib`, `../logLevel` (`../logLevel` — после переноса из `shared/`), `config/*`, `shared/*`, `shared/testCatalog`, `./gatewayUnitSuite` (`runGatewayUnitChecks`) — юнит-прогон без Heap

### `./lib/gateway/utf8Base64.ts`

- нет импортов — UTF-8 ↔ стандартный Base64 для Legacy GetCourse `params` (см. `inner/docs/047-base64.md`)

### `./lib/gateway/legacyGcFormBody.ts`

- `./utf8Base64` → `utf8StringToBase64`

### `./lib/tests/gatewayUnitSuite.ts`

- `../gateway/*` — чистые функции gateway (без Heap, без сети); в т.ч. `utf8Base64` → `base64ToUtf8String`

### `./lib/tests/integrationSuite`

- `../settings.lib`, `../gateway/v1AddUserHandler` → `handleV1AddUserPost`, `repos/*`, `../admin/dashboard.lib`, `../logger.lib`, `api/settings/*`, `api/logger/log`, `api/admin/*`, `api/tests/list`, `shared/gatewayHttpHeaders`, `shared/gcSchoolHostValidation`, `./templateUnitSuite` (`runTemplateUnitChecks`)

### `./lib/gateway/v1AddUserHandler.ts`

- `./handleV1OpRoute`, `./v1TuneResponse` — тонкая обёртка для тестов (`handleV1AddUserPost`)

### `./lib/gateway/handleV1Op.ts` (НОВЫЙ; основной обработчик)

- `logger.lib`, `settings.lib`, `interpretGcV1Response`, `legacyGcExportGet`, `legacyGcImportClient`, `newGcApiClient`, `pathTemplate`, `operationsCatalog` (`findOperationCatalogEntry`, `OperationCatalogEntry`), `requestId`, `v1IncomingPost` (`readHeaderInsensitive`), `v1GatewayQuery`, `v1TuneResponse`, `constants`, `../../shared/gatewayHttpHeaders`, `../../repos/gatewayRequestLog.repo`, `../../repos/gatewayUpstreamLog.repo`, `../../shared/redactRaw`
- Экспорт: **`handleV1Op`** (публичные роуты), **`handleV1OpWithGcDiagnostic`** + тип **`V1GcDiagnostic`** (для раннера), переэкспорт `V1IncomingLike`

### `./lib/gateway/v1OpHandlers.ts` (НОВЫЙ; реестр хендлеров)

- 59 файлов `../../api/v1/{op}` → `{op}Handler`
- Экспорт: `V1_OP_HANDLERS`, `findV1OpHandler`, тип `V1GcHandler`

### `./lib/gateway/handleV1OpRoute.ts` (совместимостный shim)

- `./handleV1Op` → `handleV1Op`, `handleV1OpWithGcDiagnostic`
- `./v1OpHandlers` → `findV1OpHandler`
- Экспорт: **`handleV1OpRoute`**, **`handleV1OpRouteWithGcDiagnostic`** (через реестр + handleV1Op)
- (весь прежний inline-код удалён; gatewayWorkspaceEvents — не импортируется)

### `./lib/tests/gateway/v1OpsSuiteRunner.ts`

- `../../gateway/handleV1OpRoute` → **`handleV1OpRouteWithGcDiagnostic`**, `V1IncomingLike`; `../../gateway/operationsCatalog` → `findOperationCatalogEntry`; `../../logger.lib`, `../../settings.lib`, `../../../shared/gatewayHttpHeaders`, `./v1OpsRunContext`, `./v1OpsScenarios`

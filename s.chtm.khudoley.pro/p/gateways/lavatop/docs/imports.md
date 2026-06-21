# Импорты страниц и схема зависимостей

## 1) Страницы‑роуты (TSX entrypoints)

### `./config/routes.tsx`

- нет внутренних импортов (только экспорт PROJECT_ROOT, ROUTES, getFullUrl, withProjectRoot, withProjectRootAndSubroute)

### `./config/project.tsx`

- нет внутренних импортов (только экспорт DEFAULT_PROJECT_TITLE, INDEX_PAGE_NAME, PROFILE_PAGE_NAME, ADMIN_PAGE_NAME, TESTS_PAGE_NAME, getPageTitle, getHeaderText, BODY_TEXT, BODY_SUBTEXT)

### `./index.tsx`

- `@app/html-jsx` → `jsx`
- `./pages/HomePage.vue`
- `./shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `./styles` → `customScrollbarStyles`
- `./shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `./config/routes` → `getFullUrl`, `ROUTES`
- `./config/project` → `INDEX_PAGE_NAME`, `BODY_TEXT`, `BODY_SUBTEXT`, `getPageTitle`, `getHeaderText`
- `./lib/logger.lib` → `*`
- `./lib/settings.lib` → `*`

### `./web/admin/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireAccountRole`
- `@app/socket` → `genSocketId`
- `../../pages/AdminPage.vue`
- `../login` → `loginPageRoute`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../styles` → `customScrollbarStyles`
- `../../lib/logger.lib` → `getAdminLogsSocketId`, `writeServerLog` (и др.)
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `ADMIN_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`

### `./web/profile/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `../../pages/ProfilePage.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
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
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
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

### `./pages/HomePage.vue`

- `vue` → `onMounted`, `onUnmounted`, `ref`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../shared/logger` → `createComponentLogger`

### `./pages/AdminPage.vue`

- `vue` → `onMounted`, `onBeforeUnmount`, `onUnmounted`, `ref`, `computed`, `watch`
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../api/settings/get` → `getSettingRoute`
- `../api/settings/save` → `saveSettingRoute`
- `../api/admin/logs/recent` → `getRecentLogsRoute`
- `../api/admin/logs/before` → `getLogsBeforeRoute`
- `../api/admin/dashboard/counts` → `getDashboardCountsRoute`
- `../api/admin/dashboard/reset` → `resetDashboardRoute`
- `../shared/logger` → `createComponentLogger`, `setLogSink`, `LogEntry`

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

### `./shared/preloader.ts`

- нет импортов

### `./shared/logLevel.ts`

- `../lib/settings.lib` → `getLogLevel`, `LogLevel`
- `../lib/logger.lib` → `*`

### `./shared/testCatalog.ts`

- первая строка: `// @shared`
- нет импортов — каталог блоков для `/api/tests/list` и UI тестов

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

### `./tables/lavatopWebhookEvent.table.ts`

- `@app/heap` → `Heap`

### `./tables/lavatopWebhookMapping.table.ts`

- `@app/heap` → `Heap`

### `./tables/panelAccess.table.ts`

- `@app/heap` → `Heap`

### `./tables/panelInvites.table.ts`

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
- `../lib/logger.lib` → `*`

### `./repos/gatewayUpstreamLog.repo.ts`

- `../tables/gatewayUpstreamLog.table` → `GatewayUpstreamLog`, `GatewayUpstreamLogRow`
- `../lib/logger.lib` → `*`

### `./repos/lavatopWebhookEvent.repo.ts`

- `../tables/lavatopWebhookEvent.table` → `LavatopWebhookEvent`, `LavatopWebhookEventRow`
- `../lib/logger.lib` → `*`

### `./repos/lavatopWebhookMapping.repo.ts`

- `../tables/lavatopWebhookMapping.table` → `LavatopWebhookMapping`, `LavatopWebhookMappingRow`
- `@app/sync` → `runWithExclusiveLock`

### `./repos/panelAccess.repo.ts`

- `../tables/panelAccess.table` → `PanelAccess`, `PanelAccessRow`

### `./repos/panelInvites.repo.ts`

- `../tables/panelInvites.table` → `PanelInvites`, `PanelInvitesRow`

## 7) Библиотеки (lib/)

### `./lib/settings.lib.ts`

- `../repos/settings.repo` → `*` (findByKey, findAll, upsert, deleteByKey)
- `./logger.lib` → `*` (только для функций, не вызываемых из logger.lib)
- `../shared/gatewaySettingKeys` → константы ключей gateway-настроек

### `./lib/admin/dashboard.lib.ts`

- `../settings.lib` → `*` (getDashboardResetAt, setSetting, SETTING_KEYS)
- `../../repos/logs.repo` → `*` (countErrorsAfter, countWarningsAfter)
- `../logger.lib` → `*`

### `./lib/logger.lib.ts`

- `./settings.lib` → `*` (getLogLevel, getLogWebhook, LogLevel)
- `../repos/logs.repo` → `*` (create)
- `@app/socket` → `sendDataToSocket`
- `@app/request` → `request`

### `./lib/gateway/handleV1Op.ts`

- `../logger.lib` → `*`
- `./operationsCatalog` → `findOperation`, `OperationEntry`
- `./requestId`, `./gatewayResponse`, `./lavaCredentials`, `./constants`, `./lavaTopClient` (types)
- `./invoicesV1Semantic` (types)
- `../../shared/redactRaw` → `redactRawDeep`
- `../../repos/gatewayRequestLog.repo`, `../../repos/gatewayUpstreamLog.repo`

### `./lib/gateway/lavaTopClient.ts`

- `@app/request` → `request`
- `../logger.lib` → `*`
- `./constants` → тайм-аут, лимиты

### `./lib/gateway/operationsCatalog.ts`

- `@app/schema` → `s` (рантайм-валидатор, @ts-ignore системный модуль)

### `./lib/webhook/webhookRelay.service.ts`

- `@app/sync` → `runWithExclusiveLock`
- `@app/request` → `request`
- `../logger.lib` → `*`
- `../settings.lib` → `getLavaWebhookSecret`
- `../../repos/lavatopWebhookEvent.repo`, `../../repos/lavatopWebhookMapping.repo`
- `../gateway/lavaTypes` → `LavaWebhookPayload`
- `../gateway/constants` → `GW_FORWARD_TIMEOUT_MS`

### `./lib/access/requireInternalAccess.ts`, `apiGuard.ts`

- `../logger.lib` → `*`
- `../../repos/panelAccess.repo` → `*`

### `./lib/access/invites.ts`

- `@app/sync` → `runWithExclusiveLock`
- `../../repos/panelInvites.repo`, `../../repos/panelAccess.repo`
- `../logger.lib` → `*`

## 8) API (api/)

### `./api/settings/list.ts`, `./api/settings/get.ts`, `./api/settings/save.ts`

- `@app/auth` → `requireAccountRole`
- `../../lib/settings.lib`, `../../lib/logger.lib`

### `./api/logger/log.ts`

- `@app/auth` → `requireAnyUser`
- `../../lib/logger.lib`

### `./api/admin/logs/recent.ts`, `./api/admin/logs/before.ts`

- `@app/auth` → `requireAccountRole`
- `../../../repos/logs.repo`, `../../../lib/logger.lib`, `../../../tables/logs.table` (type)

### `./api/admin/dashboard/counts.ts`, `./api/admin/dashboard/reset.ts`

- `@app/auth` → `requireAccountRole`
- `../../../lib/admin/dashboard.lib`, `../../../lib/logger.lib`

### `./api/admin/dashboard/gatewayCounts.ts`

- `../../lib/access/apiGuard` → `guardInternalApi`
- `../../../repos/gatewayRequestLog.repo`, `../../../repos/lavatopWebhookEvent.repo`
- `../../../lib/settings.lib` → `getPanelDateFilter`

### `./api/admin/raw/requests/recent.ts`, `./api/admin/raw/requests/get.ts`

- `../../lib/access/apiGuard`, `../../../../repos/gatewayRequestLog.repo`, `../../../../lib/logger.lib`

### `./api/admin/raw/upstream/recent.ts`, `./api/admin/raw/upstream/get.ts`

- `../../lib/access/apiGuard`, `../../../../repos/gatewayUpstreamLog.repo`, `../../../../lib/logger.lib`

### `./api/admin/webhooks/recent.ts`

- `../../lib/access/apiGuard`, `../../../../repos/lavatopWebhookEvent.repo`, `../../../../lib/logger.lib`

### `./api/admin/webhooks/reforward.ts`

- `../../lib/access/apiGuard`, `../../../../lib/webhook/webhookRelay.service` → `reforwardEvent`

### `./api/admin/analytics/filter-save.ts`

- `../../lib/access/apiGuard`, `../../../../lib/settings.lib` → `setPanelDateFilter`

### `./api/v1/createInvoice.ts`

- `../../../lib/gateway/handleV1Op`, `../../../lib/gateway/lavaTopClient`, `../../../lib/gateway/buildCreateInvoiceBody`, `../../../lib/gateway/invoicesV1Semantic`
- `../../../repos/lavatopWebhookMapping.repo` → `upsertByContractId`

### `./api/v1/getInvoiceStatus.ts`, `./api/v1/listProducts.ts`, `./api/v1/updateOfferPrice.ts`

- `../../../lib/gateway/handleV1Op`, `../../../lib/gateway/lavaTopClient`, `../../../lib/gateway/invoicesV1Semantic`

### `./api/v1/operations.ts`

- `../../../lib/gateway/operationsCatalog` → `toOperationSummaries`

### `./webhooks/index.ts`

- `../../lib/logger.lib`, `../../lib/settings.lib`
- `../../lib/webhook/webhookRelay.service` → `processWebhook`
- `../../lib/gateway/lavaTypes` → `LavaWebhookPayload` (type)

### `./api/access/generate-invite.ts`, `consume-invite.ts`, `invites.ts`, `grants.ts`, `revoke-invite.ts`, `revoke-grant.ts`

- `../../lib/access/*`, `../../lib/logger.lib`

### `./api/tests/list.ts`

- `@app/auth` → `requireAnyUser`
- `../../lib/logger.lib`
- `../../shared/testCatalog`

### `./api/tests/unit/index.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib`
- `../../../lib/tests/templateUnitSuite` → `runTemplateUnitChecks`
- `../../../lib/gateway/gatewayUnitSuite` → `runGatewayUnitChecks`
- `../../../lib/tests/logTestRunFailures`

### `./api/tests/integration/index.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib`
- `../../../lib/tests/integrationSuite` → `runTemplateIntegrationChecks`
- `../../../lib/tests/logTestRunFailures`

### `./lib/tests/logTestRunFailures.ts`

- `../logger.lib` → `writeServerLog`

### `./lib/tests/templateUnitSuite`

- `../logger.lib`, `../settings.lib`, `config/*`, `shared/*`, `shared/testCatalog`

### `./lib/tests/integrationSuite`

- `../settings.lib`, `repos/*`, `../admin/dashboard.lib`, `../logger.lib`, `api/settings/*`, `api/logger/log`, `api/admin/*`, `api/tests/list`, `./templateUnitSuite`
- `../../repos/lavatopWebhookMapping.repo` → roundtrip-тест маппинга

### `./lib/gateway/gatewayUnitSuite.ts`

- `./operationsCatalog`, `./gatewayErrors`, `./lavaCredentials`, `./invoicesV1Semantic`, `./requestId`
- `../logger.lib` → `writeServerLog` (логирование провалов)

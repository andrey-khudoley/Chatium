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
- `./lib/logLevel.lib` → `getLogLevelForPage`, `getLogLevelScript`
- `./config/routes` → `getFullUrl`, `ROUTES`
- `./config/project` → `INDEX_PAGE_NAME`, `BODY_TEXT`, `BODY_SUBTEXT`, `getPageTitle`, `getHeaderText`
- `./lib/logger.lib` → `*`
- `./lib/settings.lib` → `*`

### `./web/admin/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireAccountRole`
- `@app/socket` → `genSocketId`
- `../../pages/AdminPage.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../lib/logLevel.lib` → `getLogLevelForPage`, `getLogLevelScript`
- `../../styles` → `customScrollbarStyles`
- `../../pagecss/adminPageCss1`, `../../pagecss/adminPageCss2`, `../../pagecss/adminPageCss3`
- `../../pagecss/adminBrokerOpsCss` → `adminBrokerOpsCss`
- `../../pagecss/headerCss1`, `../../pagecss/headerCss2`
- `../../lib/logger.lib` → `getAdminLogsSocketId`, `writeServerLog` (и др.)
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `ADMIN_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`

### `./web/profile/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `../../pages/ProfilePage.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../lib/logLevel.lib` → `getLogLevelForPage`, `getLogLevelScript`
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
- `../../lib/logLevel.lib` → `getLogLevelForPage`, `getLogLevelScript`
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

- `vue` → `onMounted`, `onUnmounted`, `ref`, `computed`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../components/admin/AdminCounters.vue`
- `../components/admin/AdminSettings.vue`
- `../components/admin/AdminLogMonitor.vue`
- `../components/admin/broker/BrokerOpsPanel.vue`
- `../api/admin/dashboard/counts` → `getDashboardCountsRoute`
- `../api/admin/dashboard/reset` → `resetDashboardRoute`
- `../shared/logger` → `createComponentLogger`, `LogEntry` (type)
- `../shared/useLogStream` → `useLogStream`
- `../shared/useRemoteLogging` → `useRemoteLogging`

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

### `./components/admin/AdminCounters.vue`

- нет импортов (props/emits only)

### `./components/admin/AdminSettings.vue`

- `vue` → `onMounted`, `onBeforeUnmount`, `ref`, `watch`
- `../../api/settings/get` → `getSettingRoute`
- `../../api/settings/save` → `saveSettingRoute`
- `../../shared/logger` → `createComponentLogger`

### `./components/admin/AdminLogMonitor.vue`

- `vue` → `ref`
- `../../shared/useLogStream` → `LogDisplayItem`, `LogStreamKey` (type)

### `./components/admin/broker/BrokerOpsPanel.vue`

- `vue` → `computed`, `onMounted`, `reactive`, `ref`
- `../../../api/admin/broker/diagnostics` → `adminBrokerDiagnosticsRoute`
- `../../../api/admin/broker/events/raw` → `adminBrokerEventRawRoute`
- `../../../api/admin/broker/modules/toggle` → `adminBrokerModuleToggleRoute`
- `../../../api/admin/broker/subscriptions/toggle` → `adminBrokerSubscriptionToggleRoute`
- `../../../api/admin/broker/deliveries/requeue` → `adminBrokerDeliveryRequeueRoute`
- `../../../api/admin/broker/deliveries/skip` → `adminBrokerDeliverySkipRoute`
- `../../../api/admin/broker/notifications/retry` → `adminBrokerNotificationsRetryRoute`
- `../../../shared/logger` → `createComponentLogger`
- `./BrokerModulesTable.vue`, `./BrokerSubscriptionsTable.vue`, `./BrokerEventsTable.vue`, `./BrokerDeliveriesTable.vue`, `./BrokerNotificationsTable.vue` → табличные компоненты и row types
- `./BrokerOpsConfirmModal.vue`
- `./BrokerRawPayloadViewer.vue`
- `./brokerOpsPanelModel` → `BROKER_TABS`, статусы фильтров, `BrokerDiagnosticsResult`, `BrokerTab`, `ConfirmAction`
- Важно: Vue broker components используют только `// @shared-route` API и `shared/*`; они не импортируют `lib/`, `repos/`, `tables/`.

### `./components/admin/broker/brokerOpsPanelModel.ts`

- `./BrokerModulesTable.vue`, `./BrokerSubscriptionsTable.vue`, `./BrokerEventsTable.vue`, `./BrokerDeliveriesTable.vue`, `./BrokerNotificationsTable.vue` → row types
- нет серверных импортов; локальные типы/константы панели broker ops

### `./components/admin/broker/BrokerModulesTable.vue`

- нет импортов (props/emits only, экспортирует `BrokerModuleRow`)

### `./components/admin/broker/BrokerSubscriptionsTable.vue`

- нет импортов (props/emits only, экспортирует `BrokerSubscriptionRow`)

### `./components/admin/broker/BrokerEventsTable.vue`

- нет импортов (props/emits only, экспортирует `BrokerEventRow`)

### `./components/admin/broker/BrokerDeliveriesTable.vue`

- нет импортов (props/emits only, экспортирует `BrokerDeliveryRow`)

### `./components/admin/broker/BrokerNotificationsTable.vue`

- нет импортов (props/emits only, экспортирует `BrokerNotificationRow`)

### `./components/admin/broker/BrokerOpsConfirmModal.vue`

- `vue` → `ref`, `watch`

### `./components/admin/broker/BrokerRawPayloadViewer.vue`

- `vue` → `computed`

## 4) Shared (общий код)

### `./styles.tsx`

- нет внутренних импортов (только экспорт `baseHtmlStyles`, `customScrollbarStyles`)

### `./shared/preloader.ts`

- нет импортов

### `./shared/logLevel.ts`

- первая строка: `// @shared`
- нет импортов (экспортирует `getLogLevelScript`, `LogLevel`)

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

## 6) Репозитории (repos/)

### `./repos/settings.repo.ts`

- `../tables/settings.table` → `Settings`, `SettingsRow`
- (не импортирует logger.lib — иначе рекурсия: writeServerLog → getLogLevel → getSetting → findByKey → writeServerLog)

### `./repos/logs.repo.ts`

- `../tables/logs.table` → `Logs`, `LogsRow`
- `../lib/logger.lib` → `*`
- экспортирует: `create`, `findAll`, `findById`, `findBeforeTimestamp`, `countBySeverityAfter`, `countErrorsAfter`, `countWarningsAfter`

## 7) Библиотеки (lib/)

### `./lib/settings.lib.ts`

- `../repos/settings.repo` → `*` (findByKey, findAll, upsert, deleteByKey)
- `./logger.lib` → `*` (только для функций, не вызываемых из logger.lib: getSettingString, getLogsLimit, getDashboardResetAt, getAllSettings, setSetting)

### `./lib/logLevel.lib.ts`

- `./settings.lib` → `getLogLevel`, `LogLevel` (type)
- `./logger.lib` → `*`
- `../shared/logLevel` → `getLogLevelScript`

### `./lib/admin/dashboard.lib.ts`

- `../settings.lib` → `*` (getDashboardResetAt, setSetting, SETTING_KEYS)
- `../../repos/logs.repo` → `*` (countErrorsAfter, countWarningsAfter)
- `../logger.lib` → `*`

### `./lib/logger.lib.ts`

- `./settings.lib` → `*` (getLogLevel, getLogWebhook, LogLevel)
- `../repos/logs.repo` → `*` (create)
- `@app/socket` → `sendDataToSocket`
- `@app/request` → `request`

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

### `./api/admin/broker/diagnostics.ts`

- первая строка обработчика: `requireAccountRole(ctx, 'Admin')`
- `@app/auth` → `requireAccountRole`
- `../../../lib/broker/internalApi.lib` → `getBrokerDiagnostics`

### `./api/admin/broker/modules/toggle.ts`

- первая строка обработчика: `requireAccountRole(ctx, 'Admin')`
- `@app/auth` → `requireAccountRole`
- `../../../../lib/broker/internalApi.lib` → `toggleBrokerModule`

### `./api/admin/broker/subscriptions/toggle.ts`

- первая строка обработчика: `requireAccountRole(ctx, 'Admin')`
- `@app/auth` → `requireAccountRole`
- `../../../../lib/broker/internalApi.lib` → `toggleBrokerSubscription`

### `./api/admin/broker/events/raw.ts`

- первая строка обработчика: `requireAccountRole(ctx, 'Admin')`
- `@app/auth` → `requireAccountRole`
- `../../../../lib/broker/internalApi.lib` → `getBrokerEventRaw`

### `./api/admin/broker/deliveries/requeue.ts`

- первая строка обработчика: `requireAccountRole(ctx, 'Admin')`
- `@app/auth` → `requireAccountRole`
- `../../../../lib/broker/internalApi.lib` → `requeueBrokerDelivery`

### `./api/admin/broker/deliveries/skip.ts`

- первая строка обработчика: `requireAccountRole(ctx, 'Admin')`
- `@app/auth` → `requireAccountRole`
- `../../../../lib/broker/internalApi.lib` → `skipBrokerDelivery`

### `./api/admin/broker/notifications/retry.ts`

- первая строка обработчика: `requireAccountRole(ctx, 'Admin')`
- `@app/auth` → `requireAccountRole`
- `../../../../lib/broker/internalApi.lib` → `retryBrokerNotifications`
- `../../../../lib/broker/types.lib` → `RetryBrokerNotificationsRequest` (type)

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

- `../logger.lib`, `../settings.lib`, `config/*`, `shared/*`, `shared/testCatalog` — юнит-прогон без Heap

### `./lib/tests/integrationSuite`

- `../settings.lib`, `repos/*`, `../admin/dashboard.lib`, `../logger.lib`, `api/settings/*`, `api/logger/log`, `api/admin/*`, `api/tests/list`, `./templateUnitSuite` (`runTemplateUnitChecks`)

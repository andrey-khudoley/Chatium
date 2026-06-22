# Импорты страниц и схема зависимостей

## 1) Страницы‑роуты (TSX entrypoints)

### `./config/routes.tsx`

- нет внутренних импортов (только экспорт PROJECT_ROOT, ROUTES, getFullUrl, withProjectRoot, withProjectRootAndSubroute)

### `./config/project.tsx`

- нет внутренних импортов (только экспорт DEFAULT_PROJECT_TITLE, INDEX_PAGE_NAME, PROFILE_PAGE_NAME, ADMIN_PAGE_NAME, TESTS_PAGE_NAME, getPageTitle, getHeaderText, BODY_TEXT, BODY_SUBTEXT)

### `./index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/nanoid` → `nanoid`
- `@app/socket` → `genSocketId`
- `./pages/HomePage.vue`
- `./pages/CheckoutPage.vue`
- `./shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `./styles` → `customScrollbarStyles`
- `./shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `./config/routes` → `getFullUrl`, `ROUTES`
- `./config/project` → `INDEX_PAGE_NAME`, `BODY_TEXT`, `BODY_SUBTEXT`, `getPageTitle`, `getHeaderText`
- `./lib/logger.lib` → `*`
- `./lib/settings.lib` → `*`
- `./lib/checkout/constants` → `*`

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

### `./pages/CheckoutPage.vue`

- `vue` → `onMounted`, `onUnmounted`, `ref` (и др.)
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `../api/checkout/submit` → `submitCheckoutRoute`
- `../api/checkout/status` → `checkoutStatusRoute`
- `../shared/checkoutClient` → типы (// @shared)
- (НЕ импортирует tables/, repos/, lib/ — только shared и api-роуты)

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

### `./shared/checkoutClient.ts`

- первая строка: `// @shared`
- нет внутренних импортов — только типы checkout-клиента (используется в CheckoutPage.vue и lib/checkout/socketMessages.lib)

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

### `./tables/checkoutRequests.table.ts`

- `@app/heap` → `Heap`

## 6) Репозитории (repos/)

### `./repos/checkoutRequests.repo.ts`

- `../tables/checkoutRequests.table` → `CheckoutRequests`, `CheckoutRequestRow`

### `./repos/settings.repo.ts`

- `../tables/settings.table` → `Settings`, `SettingsRow`
- (не импортирует logger.lib — иначе рекурсия: writeServerLog → getLogLevel → getSetting → findByKey → writeServerLog)

### `./repos/logs.repo.ts`

- `../tables/logs.table` → `Logs`, `LogsRow`
- `../lib/logger.lib` → `*`
- экспортирует: `create`, `findAll`, `findById`, `findBeforeTimestamp`, `countBySeverityAfter`, `countErrorsAfter`, `countWarningsAfter`

## 7) Библиотеки (lib/)

### `./lib/checkout/constants.ts`

- нет внутренних импортов (листовой модуль; экспортирует константы checkout)

### `./lib/checkout/normalizeForm.lib.ts`

- `./constants` → `*`

### `./lib/checkout/socketMessages.lib.ts`

- `../../shared/checkoutClient` → типы (// @shared)

### `./lib/checkout/processOrderCreated.lib.ts`

- `../logger.lib` → `*`
- `../../repos/checkoutRequests.repo` → `*`
- `./constants` → `*`
- `./socketMessages.lib` → `*`
- `../broker/coreBrokerClient.lib` → `*`
- `@app/sync` → `*`
- `@app/socket` → `*`

### `./lib/broker/coreBrokerClient.lib.ts`

- `../../config/routes` → `PROJECT_ROOT`
- `../../contracts/brokerEvents` → типы/константы событий
- `../logger.lib` → `*`

### `./contracts/brokerEvents.ts`

- `../config/routes` → `PROJECT_ROOT`
- нет других внутренних импортов (листовой контракт; экспортирует типы событий брокера)

### `./lib/settings.lib.ts`

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

## 8) Jobs (jobs/)

### `./jobs/broker/poll.ts`

- `../../lib/checkout/processOrderCreated.lib` → `*`
- `../../repos/checkoutRequests.repo` → `*`
- `../../lib/checkout/constants` → `*`
- `../../lib/logger.lib` → `*`

## 9) API (api/)

### `./api/checkout/submit.ts`

- `@app/sync` → `*`
- `@app/socket` → `*`
- `../../lib/logger.lib` → `*`
- `../../repos/checkoutRequests.repo` → `*`
- `../../lib/checkout/normalizeForm.lib` → `*`
- `../../lib/checkout/constants` → `*`
- `../../lib/checkout/socketMessages.lib` → `*`
- `../../lib/broker/coreBrokerClient.lib` → `*`
- `../../jobs/broker/poll` → `brokerPollJob`

### `./api/checkout/status.ts`

- `../../lib/logger.lib` → `*`
- `../../repos/checkoutRequests.repo` → `*`
- `../../lib/checkout/processOrderCreated.lib` → `*`
- `../../lib/checkout/constants` → `*`

### `./api/module/register.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/logger.lib` → `*`
- `../../lib/broker/coreBrokerClient.lib` → `*`

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
- `./checkoutUnitSuite` → `runCheckoutUnitChecks` (подключена)

### `./lib/tests/integrationSuite`

- `../settings.lib`, `repos/*`, `../admin/dashboard.lib`, `../logger.lib`, `api/settings/*`, `api/logger/log`, `api/admin/*`, `api/tests/list`, `./templateUnitSuite` (`runTemplateUnitChecks`)
- `./checkoutIntegrationSuite` → `runCheckoutIntegrationChecks` (подключена)

### `./lib/tests/checkoutUnitSuite.ts`

- `../../contracts/brokerEvents` → типы событий
- `../../lib/checkout/normalizeForm.lib` → `*`
- `../../lib/checkout/socketMessages.lib` → `*`
- `../../lib/checkout/constants` → `*`

### `./lib/tests/checkoutIntegrationSuite.ts`

- `../../api/checkout/submit` → route-хендлер
- `../../api/checkout/status` → route-хендлер
- `../../lib/checkout/processOrderCreated.lib` → `*`
- `../../lib/broker/coreBrokerClient.lib` → `_setRunAppFn`
- `../../repos/checkoutRequests.repo` → `*`

## 10) Топологический порядок и отсутствие циклов

Граф ацикличен. Топологический порядок (листья → зависимые):

```
config/routes, config/project          (нет внутренних импортов)
contracts/brokerEvents                 → config/routes
lib/checkout/constants                 (лист)
shared/checkoutClient                  (лист, @shared)
lib/broker/coreBrokerClient.lib        → config/routes, contracts/brokerEvents, lib/logger.lib
lib/checkout/normalizeForm.lib         → lib/checkout/constants
lib/checkout/socketMessages.lib        → shared/checkoutClient (типы)
tables/checkoutRequests.table          → @app/heap
repos/checkoutRequests.repo            → tables/checkoutRequests.table
lib/checkout/processOrderCreated.lib   → lib/logger.lib, repos/checkoutRequests.repo,
                                         lib/checkout/constants, lib/checkout/socketMessages.lib,
                                         lib/broker/coreBrokerClient.lib, @app/sync, @app/socket
jobs/broker/poll                       → lib/checkout/processOrderCreated.lib,
                                         repos/checkoutRequests.repo, lib/checkout/constants,
                                         lib/logger.lib
api/checkout/submit                    → jobs/broker/poll, repos/checkoutRequests.repo,
                                         lib/checkout/*, lib/broker/coreBrokerClient.lib,
                                         @app/sync, @app/socket, lib/logger.lib
api/checkout/status                    → repos/checkoutRequests.repo,
                                         lib/checkout/processOrderCreated.lib,
                                         lib/checkout/constants, lib/logger.lib
api/module/register                    → @app/auth, lib/logger.lib,
                                         lib/broker/coreBrokerClient.lib
index.tsx                              → pages/CheckoutPage.vue, lib/checkout/constants, ...
pages/CheckoutPage.vue                 → api/checkout/submit, api/checkout/status,
                                         shared/checkoutClient, @app/socket, vue
```

Потенциальных циклов нет: `config/routes` ничего из проекта не импортирует, поэтому цепочка `api/checkout/submit → jobs/broker/poll → ... → config/routes` не замыкается обратно.

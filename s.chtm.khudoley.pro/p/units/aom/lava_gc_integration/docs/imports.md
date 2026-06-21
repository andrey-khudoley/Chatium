# Импорты страниц и схема зависимостей

Роль **`ctx`** в тестах и запуск проверок со страницы тестов — [testing.md](./testing.md).

Актуально для реализованной интеграции GetCourse + Lava: таблицы `lava_*`, репозитории в `repos/`, `lib/lava-types.ts`, `lib/heap-create-input.lib.ts` (тип `HeapCreateInput` для `Table.create` без служебных полей Heap), `lib/app-public-url.lib.ts` (абсолютный URL к своему UGC для `request()`), `lib/lava-api.client.ts`, `lib/cbr-rates.client.ts`, `lib/lava-amount-limits.lib.ts`, `lib/getcourse-api.client.ts`, `lib/settings-save-credentials.lib.ts`, `lib/lava-payment.service.ts`, `lib/lava-webhook.service.ts`, эндпоинты `api/integrations/lava/*`, тесты в `api/tests/endpoints-check/` — в т.ч. `integration-gc-credentials.ts`, `integration-gc-order-pl-api.ts`, `integration-lava-credentials.ts`, `integration-credentials-both.ts`, `settings-save-credentials-unit.ts`, `page-routes-unit.ts`, `lava-settings-getters.ts`, `lava-repos.ts`, `lava-webhook-service.ts`, `lava-webhook-route.ts`, `getcourse-deal-update.ts`, `lava-api-catalog.ts`, `lava-payment-link-route.ts`, `lava-amount-limits-unit.ts`, `payment-link-dry-run-unit.ts`, `payment-link-http-integration.ts`, `payment-link-heap-settings-read.ts`, `payment-link-full-route-run.ts`, `payment-link-full-http-integration.ts`, `webhook-live-test-arm.ts`, `webhook-live-test-status.ts`, `lib/payment-link-live-test.lib.ts`, `lib/webhook-live-test.lib.ts`, `lava-api-client.ts`, `payment-link.ts`.

### `./shared/pageRouteProbe.ts`

- первая строка: `// @shared`
- `evaluatePageRouteResponse` — разбор ответа HTML-маршрута для интеграционных проверок на вкладке «Интеграция» (`TestsPage.vue`, `fetch` из браузера).

## 1) Страницы‑роуты (TSX entrypoints)

### `./shared/projectRoot.ts`

- первая строка: `// @shared`
- экспорт `PROJECT_ROOT` — единственная константа для Vue/страниц, которым нужен корень пути **без** импорта всего `config/routes.tsx` (иначе сборщик мог подтягивать API-модули).

### `./config/routes.tsx`

- первая строка: `// @shared` (нужна для импорта из `web/**/index.tsx` с `// @shared`)
- импорт `PROJECT_ROOT` из `../shared/projectRoot`, реэкспорт; **`ROUTES`** / **`ROUTE_PATHS`** — только страницы (без `/api/integrations/...`); `getFullUrl`, `withProjectRoot`, …

### `./config/project.tsx`

- первая строка: `// @shared` (как у `routes.tsx`, импортируется из тех же shared-роутов)
- нет внутренних импортов (только экспорт DEFAULT_PROJECT_TITLE, INDEX_PAGE_NAME, PROFILE_PAGE_NAME, ADMIN_PAGE_NAME, TESTS_PAGE_NAME, ORDERS_PAGE_NAME, getPageTitle, getHeaderText, BODY_TEXT)

### `./index.tsx`

- `@app/html-jsx` → `jsx`
- `./pages/HomePage.vue`
- `./shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `./styles` → `customScrollbarStyles`
- `./shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `./config/routes` → `getFullUrl`, `ROUTES`
- `./config/project` → `INDEX_PAGE_NAME`, `BODY_TEXT`, `getPageTitle`, `getHeaderText`
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

### `./web/orders/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireAccountRole`
- `../../pages/OrdersPage.vue`
- `../login` → `loginPageRoute`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../styles` → `customScrollbarStyles`
- `../../lib/logger.lib` → `*`
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `ORDERS_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`

### `./web/login/index.tsx`

- `@app/html-jsx` → `jsx`
- `../../pages/LoginPage.vue`
- `../../styles` → `baseHtmlStyles`, `customScrollbarStyles`
- `../../shared/projectRoot` → `PROJECT_ROOT`
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
- `../api/admin/lava/catalog` → `lavaCatalogRoute`
- `../api/admin/getcourse/verify` → `getcourseVerifyRoute`
- `../shared/gcSettingKeys` → `GC_SETTING_KEYS`
- `../shared/lavaSettingKeys` → `LAVA_SETTING_KEYS` (в т.ч. UI `lava_webhook_secret`: генерация, показ)
- `../shared/lavaBaseUrl` → `normalizeLavaBaseUrlInput`
- `../api/admin/logs/recent` → `getRecentLogsRoute`
- `../api/admin/logs/before` → `getLogsBeforeRoute`
- `../api/admin/dashboard/counts` → `getDashboardCountsRoute`
- `../api/admin/dashboard/reset` → `resetDashboardRoute`
- `../shared/logger` → `createComponentLogger`, `setLogSink`, `LogEntry`

### `./pages/OrdersPage.vue`

- `vue` → `computed`, `onMounted`, `onUnmounted`, `ref`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../api/admin/orders-metrics` → `getOrdersMetricsRoute`
- `../api/admin/orders-filter-options` → `getOrdersFilterOptionsRoute`
- `../api/admin/orders-list` → `getOrdersListRoute`
- `../shared/logger` → `createComponentLogger`

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
- `../api/admin/logs/recent` → `getRecentLogsRoute`
- `../api/admin/logs/before` → `getLogsBeforeRoute`
- `../shared/projectRoot` → `PROJECT_ROOT`

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

### `./shared/logger.ts`

- нет импортов (клиентский логгер по syslog RFC 5424: severity -1…7, LOG_LEVEL_OFF=-1, читает window.**BOOT**.logLevel; createComponentLogger, setLogSink, LogEntry)

## 5) Таблицы (tables/)

### `./tables/settings.table.ts`

- `@app/heap` → `Heap`

### `./tables/logs.table.ts`

- `@app/heap` → `Heap`

### `./tables/lava_payment_contract.table.ts`

- `@app/heap` → `Heap`

### `./tables/lava_webhook_event.table.ts`

- `@app/heap` → `Heap`

### `./tables/lava_lock_log.table.ts`

- `@app/heap` → `Heap`

## 6) Репозитории (repos/)

### `./repos/settings.repo.ts`

- `../tables/settings.table` → `Settings`, `SettingsRow`
- (не импортирует logger.lib — иначе рекурсия: writeServerLog → getLogLevel → getSetting → findByKey → writeServerLog)

### `./repos/logs.repo.ts`

- `../tables/logs.table` → `Logs`, `LogsRow`
- `../lib/logger.lib` → `*`
- экспортирует: `create`, `findAll`, `findById`, `findBeforeTimestamp`, `countBySeverityAfter`, `countErrorsAfter`, `countWarningsAfter`

### `./repos/lava_payment_contract.repo.ts`

- `../tables/lava_payment_contract.table` → `LavaPaymentContract`, `LavaPaymentContractRow`
- `../lib/heap-create-input.lib` → `HeapCreateInput` (тип-only)
- `../lib/logger.lib` → `writeServerLog` (severity 7: вход/выход каждой операции; не создаёт рекурсии с `logs.repo`)
- внутри `create`: `LavaPaymentContract.create(ctx, data as Parameters<typeof LavaPaymentContract.create>[1])` — typings `@app/heap` требуют служебные поля; публичный вход — `LavaPaymentContractCreateInput`
- экспортирует: `create`, `LavaPaymentContractCreateInput`, `ActiveContractByOrderAmountLookup`, `findByGcOrderId`, `findByLavaContractId`, `updateStatus`, `findActiveByGcOrderAmountAndCurrency`, `deactivateActiveContractsForGcOrderId`

### `./repos/lava_webhook_event.repo.ts`

- `../tables/lava_webhook_event.table` → `LavaWebhookEvent`, `LavaWebhookEventRow`
- `../lib/heap-create-input.lib` → `HeapCreateInput` (тип-only)
- `../lib/logger.lib` → `writeServerLog` (severity 7 на каждый метод)
- внутри `create`: приведение второго аргумента к `Parameters<typeof LavaWebhookEvent.create>[1]` (как у контракта)
- экспортирует: `create`, `LavaWebhookEventCreateInput`, `findByDedupeKey`, `markProcessed`, `findUnprocessed`

### `./repos/lava_lock_log.repo.ts`

- `../tables/lava_lock_log.table` → `LavaLockLog`, `LavaLockLogRow`
- `../lib/heap-create-input.lib` → `HeapCreateInput` (тип-only)
- `../lib/logger.lib` → `writeServerLog` (severity 7 на каждый метод)
- внутри `create`: приведение второго аргумента к `Parameters<typeof LavaLockLog.create>[1]`
- экспортирует: `create`, `LavaLockLogCreateInput`, `updateReleased`, `updateAcquiredAt`

## 7) Библиотеки (lib/)

### `./lib/lava-types.ts`

- нет внутренних импортов (типы TypeScript: валюта, webhook, payment-link request/response)

### `./lib/lava-currency.lib.ts`

- `./lava-types` → `LavaCurrency` (type)
- экспортирует: `normalizeLavaCurrency` (строка → RUB/USD/EUR или `null`)

### `./lib/heap-create-input.lib.ts`

- нет внутренних импортов
- экспортирует: `HeapSystemRowKeys`, `HeapCreateInput<Row>` (`Omit<Row, …>` по служебным ключам; в репозиториях к `Table.create` добавлено приведение к `Parameters<typeof Table.create>[1]` из‑за typings `@app/heap`)

### `./lib/settings.lib.ts`

- `../repos/settings.repo` → `*` (findByKey, findAll, upsert, deleteByKey)
- `../shared/lavaSettingKeys` → `LAVA_SETTING_KEYS` (spread в `SETTING_KEYS`)
- `../shared/gcSettingKeys` → `GC_SETTING_KEYS` (spread в `SETTING_KEYS`)
- `../shared/lavaBaseUrl` → `normalizeLavaBaseUrlInput` (ветка `setSetting` для `lava_base_url`)
- `./logger.lib` → `*` (только для функций, не вызываемых из logger.lib: getSettingString, getLogsLimit, getDashboardResetAt, getAllSettings, setSetting)
- экспортирует также: `SETTING_KEYS`, интеграционные геттеры (`getLavaApiKey`, `getLavaBaseUrl`, …) без `writeServerLog` (аналогично `getLogLevel` / `getLogWebhook`)

### `./lib/lava-api.client.ts`

- `@app/request` → `request`
- `../shared/lavaBaseUrl` → `normalizeLavaBaseUrlInput`
- `./lava-types` → `LavaCurrency` (type)
- `./logger.lib` → `*`
- `./settings.lib` → `*` (геттеры Lava: base URL, API key, product/offer id)
- экспортирует: `updateOfferPrice` (опционально `offerDisplayName` → `offers[].name` в PATCH), `createContract`, `fetchLavaProductsFirstPage`, `verifyLavaCredentials`, `getProducts`, `CreateContractParams`, `fetchLavaProductsCatalog`, `LavaCatalogRow`

### `./lib/getcourse-api.client.ts`

- `@app/request` → `request`
- `./logger.lib` → `*`
- `./settings.lib` → `*` (`getGcApiKey`, `getGcAccountDomain`)
- экспортирует: `normalizeGcAccountDomain`, `verifyGcPlApiAccess`, `VerifyGcPlApiParams`, `updateDealStatus`, `UpdateDealStatusParams`

### `./lib/integration-credentials.lib.ts`

- `./getcourse-api.client` → `verifyGcPlApiAccess`
- `./lava-api.client` → `verifyLavaCredentials`
- `./settings.lib` → геттеры ключей интеграции
- экспортирует: `runGcCredentialCheckFromSettings`, `runLavaCredentialCheckFromSettings`, `runIntegrationCredentialChecksFromSettings`, типы `GcCredentialCheckFromSettings`, `LavaCredentialCheckFromSettings`

### `./lib/payment-link-live-test.lib.ts`

- `./settings.lib` → геттеры Lava (`getLavaApiKey`, `getLavaBaseUrl`, `getLavaProductId`, `getLavaOfferId`)
- экспортирует: константы `PAYMENT_LINK_LIVE_TEST_*`, `maskLavaApiKeyForTests`, `readLavaPaymentHeapSettings`, тип `LavaPaymentHeapSettingsRead`

### `./lib/settings-save-credentials.lib.ts`

- `../shared/lavaBaseUrl` → `normalizeLavaBaseUrlInput`
- `../shared/gcSettingKeys` → `GC_SETTING_KEYS`
- `../shared/lavaSettingKeys` → `LAVA_SETTING_KEYS`
- экспортирует: `resolveGcCredentialsForSave`, `resolveLavaCredentialsForSave`, `shouldVerifyCredentialPair`, типы `GcCredentialsResolved`, `LavaCredentialsResolved`

### `./lib/lava-payment.service.ts`

- `@app/sync` → `runWithExclusiveLock`, `LockAcquisitionError`
- `./lava-types` → `PaymentLinkRequest`, `PaymentLinkResponse` (types)
- `./lava-api.client` → `*` (`updateOfferPrice`, `createContract`)
- `./cbr-rates.client` → `convertRubToCurrency` (RUB → USD/EUR по актуальному курсу ЦБ перед PATCH/contract)
- `./lava-amount-limits.lib` → `getLavaOfferAmountLimits`, `isAmountWithinLavaOfferLimits`, `buildLavaOfferAmountOutOfRangeMessage` (до Lava: `AMOUNT_OUT_OF_RANGE` с непустым `message`)
- `./logger.lib` → `*`
- `./settings.lib` → `*` (`getLavaProductId`, `getLavaOfferId`)
- `../repos/lava_payment_contract.repo` → `create` (как `createLavaPaymentContract`), `deactivateActiveContractsForGcOrderId`, `findActiveByGcOrderAmountAndCurrency`
- `../repos/lava_lock_log.repo` → `*`
- экспортирует: `createPaymentLink`

### `./lib/cbr-rates.client.ts`

- `@app/request` → `request` (внешний GET `https://www.cbr-xml-daily.ru/daily_json.js`)
- `./lava-types` → `LavaCurrency` (type)
- `./logger.lib` → `*`
- экспортирует: `convertRubToCurrency` (конвертация рублей в `USD`/`EUR` по курсу ЦБ)

### `./lib/lava-amount-limits.lib.ts`

- `./lava-types` → `LavaCurrency` (type)
- экспортирует: `LAVA_OFFER_AMOUNT_LIMITS`, `getLavaOfferAmountLimits`, `isAmountWithinLavaOfferLimits`, `buildLavaOfferAmountOutOfRangeMessage` (лимиты PATCH-цены Lava; USD/EUR 5…10000)

### `./lib/lava-webhook.service.ts`

- `./lava-types` → `LavaWebhookPayload`, `LocalContractStatus` (types)
- `./getcourse-api.client` → `*` (`updateDealStatus`)
- `./logger.lib` → `*`
- `./payment-link-live-test.lib` → `isPaymentLinkLiveTestGcOrderId`
- `./settings.lib` → `*` (`getLavaWebhookSecret`)
- `./webhook-live-test.lib` → `recordWebhookLiveTestAfterContract`, `recordWebhookLiveTestContractNotFound`, `recordWebhookLiveTestDuplicate`
- `../repos/lava_payment_contract.repo` → `*`
- `../repos/lava_webhook_event.repo` → `*`
- `../tables/lava_webhook_event.table` → `LavaWebhookEventRow` (type)
- экспортирует: `processWebhook`, `ProcessWebhookResult`

### `./lib/webhook-live-test.lib.ts`

- `./lava-types` → типы для payload
- `../repos/settings.repo` → `findByKey`, `upsert` (служебный ключ состояния лайв-проверки)
- `../tables/lava_payment_contract.table` → `LavaPaymentContractRow` (type)
- экспортирует: `armWebhookLiveTest`, `getWebhookLiveTestState`, `WebhookLiveTestState`, функции `recordWebhookLiveTest*`

### `./shared/lavaBaseUrl.ts`

- нет внутренних импортов (файл с `// @shared`)

### `./shared/lavaSettingKeys.ts`

- нет внутренних импортов (файл с `// @shared`; ключи Lava для клиента и `SETTING_KEYS` на сервере)

### `./shared/gcSettingKeys.ts`

- нет внутренних импортов (файл с `// @shared`; ключи `gc_api_key` / `gc_account_domain` для админки и `SETTING_KEYS`)

### `./lib/admin/dashboard.lib.ts`

- `../settings.lib` → `*` (getDashboardResetAt, setSetting, SETTING_KEYS)
- `../../repos/logs.repo` → `*` (countErrorsAfter, countWarningsAfter)
- `../logger.lib` → `*`

### `./lib/admin/orders-metrics.lib.ts`

- `../../tables/lava_payment_contract.table` → `LavaPaymentContract`
- `../logger.lib` → `*`
- экспортирует: `buildPaymentContractWhere`, `getOrdersMetrics`, `getContractFilterOptions`, типы фильтра/результата
- вызовы Heap: `countBy(ctx, where)` — условия **без** обёртки `{ where }`; `findAll(ctx, { where, limit, offset, order })` — с `where`, `limit` ≤ 1000 (`queryHeapRecords`)

### `./lib/admin/orders-list.lib.ts`

- `../../tables/lava_payment_contract.table` → `LavaPaymentContract`, тип строки
- `./orders-metrics.lib` → `buildPaymentContractWhere`, тип `OrdersMetricsFilter`
- `../logger.lib` → `*`
- экспортирует: `ORDERS_LIST_PAGE_SIZE` (50), `getOrdersListPage`, тип `OrderListItem`

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
- `../../lib/getcourse-api.client` → `verifyGcPlApiAccess`
- `../../lib/lava-api.client` → `verifyLavaCredentials`
- `../../lib/settings-save-credentials.lib` → `resolveGcCredentialsForSave`, `resolveLavaCredentialsForSave`, `shouldVerifyCredentialPair`
- `../../lib/settings.lib` → `*`
- `../../lib/logger.lib` → `*`
- перед `setSetting`: при сохранении `gc_api_key` / `gc_account_domain` (если оба непусты после слияния с Heap) — проверка PL API; при `lava_api_key` / `lava_base_url` — GET Lava `/api/v2/products` (HTTP 200); слияние полей — `settings-save-credentials.lib`

### `./api/admin/lava/catalog/index.ts`

- `@app/auth` → `requireAccountRole`
- `../../../../lib/lava-api.client` → `*`
- `../../../../lib/logger.lib` → `*`

### `./api/admin/getcourse/verify/index.ts`

- `@app/auth` → `requireAccountRole`
- `../../../../lib/getcourse-api.client` → `verifyGcPlApiAccess`
- `../../../../lib/logger.lib` → `*`
- экспорт: `getcourseVerifyRoute`

### `./api/integrations/lava/payment-link/index.ts`

- `../../../../lib/logger.lib` → `*`
- `../../../../lib/lava-currency.lib` → `normalizeLavaCurrency`
- `../../../../lib/lava-payment.service` → `createPaymentLink`
- `../../../../lib/lava-types` → `PaymentLinkRequest` (type)
- `../../../../lib/normalize-string-record.lib` → `normalizeStringRecord` (поле `utm`: `s.optional(s.unknown())`, не `s.record` — в UGC падает схема)
- валидация body: алиасы GetCourse `orderNumber`/`email`, поля `offer`/`product`; опционально `integrationTestDryRun`; экспорт: `lavaPaymentLinkRoute`

### `./lib/app-public-url.lib.ts`

- `../config/routes` → `getFullUrl`
- `getAbsoluteUrlForAppPath(ctx, pathFromProjectRoot)` — origin/host из `ctx.req.headers`

### `./api/tests/endpoints-check/payment-link-dry-run-unit.ts`

- `@app/auth` → `requireAnyUser`
- `../../../api/integrations/lava/payment-link/index` → `lavaPaymentLinkRoute`
- `../../../lib/logger.lib`

### `./api/tests/endpoints-check/lava-amount-limits-unit.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/lava-amount-limits.lib` → `LAVA_OFFER_AMOUNT_LIMITS`, `getLavaOfferAmountLimits`, `isAmountWithinLavaOfferLimits`, `buildLavaOfferAmountOutOfRangeMessage`
- `../../../lib/logger.lib`
- экспорт: `lavaAmountLimitsUnitTestRoute`

### `./api/tests/endpoints-check/lava-payment-link-route.ts`

- `@app/auth` → `requireAnyUser`
- `../../../api/integrations/lava/payment-link/index` → `lavaPaymentLinkRoute`
- `../../../lib/lava-payment.service` → `createPaymentLink` (кейс `AMOUNT_OUT_OF_RANGE` для 49 RUB)
- `../../../lib/logger.lib`
- экспорт: `lavaPaymentLinkRouteTestRoute`

### `./api/tests/endpoints-check/payment-link-http-integration.ts`

- `@app/request` → `request`
- `@app/auth` → `requireAnyUser`
- `../../../lib/app-public-url.lib`, `../../../lib/logger.lib`
- `app.body` — опционально `paymentLinkOverrides`; **без** `@shared-route`

### `./api/tests/endpoints-check/payment-link-heap-settings-read.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib`, `../../../lib/payment-link-live-test.lib` → `readLavaPaymentHeapSettings`

### `./api/tests/endpoints-check/payment-link-full-route-run.ts`

- `@app/auth` → `requireAnyUser`
- `../../../api/integrations/lava/payment-link/index` → `lavaPaymentLinkRoute`
- `../../../lib/logger.lib`, `../../../lib/payment-link-live-test.lib`, `../../../repos/lava_payment_contract.repo` → `deactivateActiveContractsForGcOrderId`

### `./api/tests/endpoints-check/payment-link-full-http-integration.ts`

- `@app/request` → `request`
- `@app/auth` → `requireAnyUser`
- `../../../lib/app-public-url.lib`, `../../../lib/logger.lib`, `../../../lib/payment-link-live-test.lib`, `../../../repos/lava_payment_contract.repo`

### `./api/tests/endpoints-check/webhook-live-test-arm.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib`, `../../../lib/webhook-live-test.lib` → `armWebhookLiveTest`
- `app.body` — `expectedLavaContractId`, опционально `paymentUrl`

### `./api/tests/endpoints-check/webhook-live-test-status.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/app-public-url.lib`, `../../../lib/logger.lib`, `../../../lib/webhook-live-test.lib` → `getWebhookLiveTestState`

### `./api/integrations/lava/webhook/index.ts`

- `../../../../lib/logger.lib` → `*`
- `../../../../lib/settings.lib` → `getLavaWebhookSecret` (GET-проба: флаг `webhookSecretConfigured`)
- `../../../../lib/lava-webhook.service` → `processWebhook`
- `../../../../lib/lava-types` → `LavaWebhookPayload` (type)
- `../../../../lib/normalize-string-record.lib` → `normalizeStringRecord` для `clientUtm`
- валидация body через `.body((s) => …)` (`@app/schema`); при неверном `X-Api-Key` — `ctx.resp.json({ success: false }, 401)`; экспорт: `lavaWebhookInfoRoute` (GET `/`), `lavaWebhookRoute` (POST `/`)

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

### `./api/admin/orders-metrics/index.ts`

- `@app/auth` → `requireAccountRole`
- `../../../lib/admin/orders-metrics.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/admin/orders-filter-options/index.ts`

- `@app/auth` → `requireAccountRole`
- `../../../lib/admin/orders-metrics.lib` → `getContractFilterOptions`
- `../../../lib/logger.lib` → `*`

### `./api/admin/orders-list/index.ts`

- `@app/auth` → `requireAccountRole`
- `../../../lib/admin/orders-list.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/tests/list.ts`

- `@app/auth` → `requireAnyUser`
- `../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/health.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/ping.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/config.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../config/routes` → `getFullUrl`, `ROUTES`
- `../../../config/project` → `TESTS_PAGE_NAME`, `getPageTitle`, `getHeaderText`

### `./api/tests/endpoints-check/settings-lib.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/settings.lib` → `*`

### `./api/tests/endpoints-check/settings-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/settings.lib` → `SETTING_KEYS`
- `../../../repos/settings.repo` → `*`

### `./api/tests/endpoints-check/logger-lib.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/logs-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/logs.repo` → `*`

### `./api/tests/endpoints-check/dashboard-lib.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/admin/dashboard.lib` → `*`

### `./api/tests/endpoints-check/integration-gc-credentials.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/integration-credentials.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/integration-lava-credentials.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/integration-credentials.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/integration-credentials-both.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/integration-credentials.lib` → `runIntegrationCredentialChecksFromSettings`
- `../../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/settings-save-credentials-unit.ts`

- `@app/auth` → `requireAnyUser`
- `../../../shared/gcSettingKeys` → `GC_SETTING_KEYS`
- `../../../shared/lavaSettingKeys` → `LAVA_SETTING_KEYS`
- `../../../lib/settings-save-credentials.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/page-routes-unit.ts`

- **без** `@shared-route` (импорты `app.html`-роутов с Vue)
- `@app/auth` → `requireRealUser`
- `../../../index` → `indexPageRoute`
- `../../../web/admin/index` → `adminPageRoute`
- `../../../web/profile/index` → `profilePageRoute`
- `../../../web/login/index` → `loginPageRoute`
- `../../../web/tests/index` → `testsPageRoute`
- `../../../web/orders/index` → `ordersPageRoute`
- `../../../shared/projectRoot` → `PROJECT_ROOT`
- `../../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/lava-api-client.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/lava-api.client` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/tests/endpoints-check/payment-link.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/lava-payment.service` → `*`
- `../../../lib/logger.lib` → `*`

# Импорты страниц и схема зависимостей

## 1) Страницы‑роуты (TSX entrypoints)

### `./config/routes.tsx`

- нет внутренних импортов (только экспорт PROJECT_ROOT, REDIRECT_SUBROUTE, ROUTES, ROUTE_PATHS, getFullUrl, withProjectRoot, withProjectRootAndSubroute, getBaseUrl, getPartnerRedirectUrl, getRedirectTestLandingUrlTemplate, getTelegramWebhookUrl, getInvitePageUrl, getCampaignPageUrl, parseTildeParam)

### `./config/project.tsx`

- нет внутренних импортов (только экспорт DEFAULT_PROJECT_TITLE, INDEX_PAGE_NAME, PROFILE_PAGE_NAME, ADMIN_PAGE_NAME, TESTS_PAGE_NAME, getPageTitle, getHeaderText, BODY_TEXT, BODY_SUBTEXT)

### `./index.tsx`

- `@app/html-jsx` → `jsx`
- `./pages/HomePage.vue`
- `./pages/IndexPage.vue`
- `./shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `./styles` → `customScrollbarStyles`
- `./shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `./config/routes` → `getFullUrl`, `ROUTES`
- `./config/project` → `INDEX_PAGE_NAME`, `BODY_TEXT`, `BODY_SUBTEXT`, `getPageTitle`, `getHeaderText`
- `./lib/logger.lib` → `*`
- `./lib/settings.lib` → `*`

### `./r.tsx`

- `./lib/repo/linkRepo` → `findLinkByPublicSlug`
- `./lib/repo/pageRepo` → `getPageById`
- `./lib/repo/visitRepo` → `createVisit`
- `./lib/core/fingerprint` → `computeFingerprint`
- `./lib/core/urlBuilder` → `substituteRef`
- GET `/r?linkId=…` (file-based: путь `/`), редирект по партнёрской ссылке (визит + redirect на urlTemplate с ref)

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

### `./web/tests/redirect-landing/index.tsx`

- `@app/html-jsx` → `jsx`
- Страница-заглушка для тестов роута редиректа (GET /web/tests/redirect-landing?ref=…), без внутренних импортов проекта.

### `./web/login/index.tsx`

- `@app/html-jsx` → `jsx`
- `../../pages/LoginPage.vue`
- `../../styles` → `baseHtmlStyles`, `customScrollbarStyles`
- `../../config/routes` → `PROJECT_ROOT`
- `../../lib/logger.lib` → `*`

### `./web/invite/index.tsx`

- `@app/html-jsx` → `jsx`
- `../../pages/InvitePage.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../lib/logger.lib` → `*`
- `../../config/routes` → `getFullUrl`, `ROUTES`, `ROUTE_PATHS`, `parseTildeParam`
- `../../config/project` → `getPageTitle`
- `../../lib/settings.lib` → `*`
- `../../styles` → `customScrollbarStyles`

### `./web/campaign/index.tsx`

- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `../../lib/repo/campaignRepo` → `*`
- `../../lib/repo/memberRepo` → `*`
- `../../pages/CampaignPageShell.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../lib/logger.lib` → `*`
- `../../config/routes` → `getFullUrl`, `ROUTES`, `getCampaignPageUrl`
- `../../config/project` → `getPageTitle`
- `../../lib/settings.lib` → `*`
- `../../styles` → `customScrollbarStyles`
- `../login` → `loginPageRoute`

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
- `../api/admin/recalc-referral-aggregates` → `recalcReferralAggregatesRoute`
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
- `../api/admin/logs/recent` → `getRecentLogsRoute`
- `../api/admin/logs/before` → `getLogsBeforeRoute`

### `./pages/LoginPage.vue`

- `vue` → `computed`, `onMounted`
- `../shared/logger` → `createComponentLogger`

### `./pages/IndexPage.vue`

- `vue` → `ref`, `onMounted`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../components/Forms/CampaignForm.vue`
- `../shared/logger` → `createComponentLogger`

### `./pages/InvitePage.vue`

- `vue` → `ref`, `onMounted`, `watch`
- `../shared/logger` → `createComponentLogger`

### `./pages/CampaignPage.vue`

- `vue` → `ref`, `computed`, `onMounted`
- `../components/Charts/StatsCard.vue`

### `./pages/CampaignPageShell.vue`

- `vue` → `ref`, `onMounted`, `onUnmounted`, `computed`
- `../components/GlobalGlitch.vue`
- `../components/Layout/Sidebar.vue`
- `../components/Layout/PageContainer.vue`
- `./CampaignPage.vue`
- `./PagesPage.vue`
- `./BotPage.vue`
- `./PartnersPage.vue`
- `./PartnerProfilePage.vue`
- `./ReferralsPage.vue`
- `./AboutCampaignPage.vue`

### `./pages/AboutCampaignPage.vue`

- `vue` → `ref`
- `../components/Modals/ConfirmModal.vue`
- `../shared/logger` → `createComponentLogger`

### `./pages/BotPage.vue`

- `vue` → `ref`, `onMounted`, `computed`
- `../components/Forms/BotForm.vue`

### `./pages/PagesPage.vue`

- `vue` → `ref`, `onMounted`, `watch`
- `../components/Forms/PageForm.vue`
- `../components/Modals/ConfirmModal.vue`
- `../components/Modals/WebhookInfoModal.vue`

### `./pages/PartnersPage.vue`

- `vue` → `ref`, `onMounted`, `watch`, `computed`
- `../components/Tables/DataTable.vue` → `DataTable`, `DataTableColumn` (type)
- `../components/Tables/Pagination.vue`

### `./pages/PartnerProfilePage.vue`

- `vue` → `ref`, `onMounted`, `watch`

### `./pages/ReferralsPage.vue`

- `vue` → `ref`, `onMounted`, `watch`
- `../components/Tables/Pagination.vue`
- `../components/Modals/EventLogModal.vue` → `EventLogModal`, `EventLogItem` (type)

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

### `./components/Forms/CampaignForm.vue`

- нет внутренних импортов (только defineProps/defineEmits)

### `./components/Forms/BotForm.vue`

- `vue` → `ref`, `watch`

### `./components/Forms/PageForm.vue`

- `vue` → `ref`, `watch`

### `./components/Modals/ConfirmModal.vue`

- нет внутренних импортов (только defineProps/defineEmits)

### `./components/Modals/WebhookInfoModal.vue`

- `vue` → `computed`, `ref`

### `./components/Modals/EventLogModal.vue`

- нет внутренних импортов (defineProps, defineEmits)

### `./components/Charts/StatsCard.vue`

- нет внутренних импортов (defineProps)

### `./components/Tables/DataTable.vue`

- нет внутренних импортов (defineProps, форматирование в script setup)

### `./components/Tables/Pagination.vue`

- `vue` → `computed`
- нет других внутренних импортов

### `./components/Layout/Sidebar.vue`

- нет внутренних импортов (только defineProps)

### `./components/Layout/PageContainer.vue`

- `../Header.vue`

## 4) Shared (общий код)

### `./styles.tsx`

- нет внутренних импортов (только экспорт `baseHtmlStyles`, `customScrollbarStyles`)

### `./shared/preloader.ts`

- нет импортов

### `./shared/logLevel.ts`

- `../lib/settings.lib` → `getLogLevel`, `LogLevel`
- `../lib/logger.lib` → `*`

### `./shared/types.ts`

- `../tables/visits.table` → `TSaasRefVisit1Vw7KxRow` (type, алиас VisitRow)
- `../tables/partners.table` → `TSaasRefProgramPartner3Ab7CdRow` (type, алиас PartnerRow)
- `../tables/bots.table` → `TSaasTgRefBotX7pQ2mRow` (type, алиас BotRow)
- `../tables/bot_updates.table` → `TSaasRefBotUpdate7Pq3RsRow` (type, алиас BotUpdateRow)
- `../tables/referrals.table` → `TSaasRefReferral9Xy2ZkRow` (type, алиас ReferralRow)
- `../tables/referral_aggregates.table` → `ReferralAggregatesRow` (type, алиас ReferralAggregateRow)
- `../tables/registrations.table` → `TSaasRefProgramRegistration4Ab3CdRow` (type, алиас RegistrationRow)
- `../tables/orders.table` → `TSaasRefOrderTg5De6FgRow` (type, алиас OrderRow)
- `../tables/payments.table` → `TSaasRefProgramPayment7Hi8JkRow` (type, алиас PaymentRow)
- экспорт: CampaignSettings, CampaignRow, MemberRow, PageRow, PartnerLinkRow, VisitRow, PartnerRow, PartnerStats, ReferralRow, RegistrationRow, OrderRow, PaymentRow, BotRow, BotUpdateRow, TelegramUser, TelegramChat, TelegramMessage, TelegramUpdate, CallbackQuery и др.

### `./shared/constants.ts`

- `./types` → `CampaignSettings` (type)

### `./shared/logger.ts`

- нет импортов (клиентский логгер по syslog RFC 5424: severity -1…7, LOG_LEVEL_OFF=-1, читает window.**BOOT**.logLevel; createComponentLogger, setLogSink, LogEntry)

## 5) Таблицы (tables/)

### `./tables/settings.table.ts`

- `@app/heap` → `Heap`

### `./tables/logs.table.ts`

- `@app/heap` → `Heap`

### `./tables/campaigns.table.ts`

- `@app/heap` → `Heap`

### `./tables/campaign_members.table.ts`

- `@app/heap` → `Heap`

### `./tables/campaign_invites.table.ts`

- `@app/heap` → `Heap`

### `./tables/partners.table.ts`

- `@app/heap` → `Heap`

### `./tables/pages.table.ts`

- `@app/heap` → `Heap`

### `./tables/partner_links.table.ts`

- `@app/heap` → `Heap`

### `./tables/visits.table.ts`

- `@app/heap` → `Heap`

### `./tables/bots.table.ts`

- `@app/heap` → `Heap`

### `./tables/bot_updates.table.ts`

- `@app/heap` → `Heap`

### `./tables/referrals.table.ts`

- `@app/heap` → `Heap`

### `./tables/registrations.table.ts`

- `@app/heap` → `Heap`

### `./tables/orders.table.ts`

- `@app/heap` → `Heap`

### `./tables/payments.table.ts`

- `@app/heap` → `Heap`

## 6) Репозитории (repos/)

### `./repos/settings.repo.ts`

- `../tables/settings.table` → `Settings`, `SettingsRow`

### `./repos/logs.repo.ts`

- `../tables/logs.table` → `Logs`, `LogsRow`
- экспортирует: `create`, `findAll`, `findById`, `findBeforeTimestamp`, `countBySeverityAfter`, `countErrorsAfter`, `countWarningsAfter`

## 7) Библиотеки (lib/)

### `./lib/settings.lib.ts`

- `../repos/settings.repo` → `*` (findByKey, findAll, upsert, deleteByKey)

### `./lib/admin/dashboard.lib.ts`

- `../settings.lib` → `*` (getDashboardResetAt, setSetting, SETTING_KEYS)
- `../../repos/logs.repo` → `*` (countErrorsAfter, countWarningsAfter)

### `./lib/logger.lib.ts`

- `./settings.lib` → `*` (getLogLevel, getLogWebhook, LogLevel)
- `../repos/logs.repo` → `*` (create)
- `@app/socket` → `sendDataToSocket`
- `@app/request` → `request`

### `./lib/repo/memberRepo.ts`

- `../../shared/constants` → `CampaignRole` (type)
- `../../tables/campaign_members.table` → `CampaignMembers`

### `./lib/repo/campaignRepo.ts`

- `../core/refGenerator` → `generateCampaignSecret`
- `./memberRepo` → `*`
- `../../shared/constants` → `DEFAULT_CAMPAIGN_SETTINGS`
- `../../shared/types` → `CampaignSettings` (type)
- `../../tables/campaigns.table` → `Campaigns`
- `../../tables/campaign_members.table` → `CampaignMembers`

### `./lib/repo/inviteRepo.ts`

- `../core/refGenerator` → `generateInviteToken`
- `./memberRepo` → `*`
- `../../tables/campaign_invites.table` → `CampaignInvites` (default)
- `../../tables/campaigns.table` → `Campaigns`

### `./lib/repo/pageRepo.ts`

- `../core/refGenerator` → `generateCampaignSecret`
- `../../tables/pages.table` → `Pages`

### `./lib/repo/linkRepo.ts`

- `../core/refGenerator` → `generateLinkSlug`
- `../../tables/partner_links.table` → `PartnerLinks`

### `./lib/repo/visitRepo.ts`

- `../core/fingerprint` → `FingerprintData` (type), `hashFingerprintParts`
- `../core/refGenerator` → `generateUrlSafeId`
- `../../tables/visits.table` → `Visits`

### `./lib/repo/partnerRepo.ts`

- `../../shared/types` → `PartnerRow`, `PartnerStats`, `TelegramUser` (types)
- `../../tables/partners.table` → `Partners` (default)
- экспортирует: getOrCreatePartner, getPartnerById, updatePartnerStats, listPartners, ListPartnersInput

### `./lib/core/attribution.ts`

- `../../shared/types` → `VisitRow` (type)
- `../repo/visitRepo` → `*`

### `./lib/repo/referralRepo.ts`

- `@app/sync` → `runWithExclusiveLock`
- `../../tables/referrals.table` → `Referrals` (default)
- `../../tables/referral_aggregates.table` → `ReferralAggregates` (default)
- экспортирует: createOrUpdateReferral, incrementReferralStats, listReferrals, ListReferralsInput, ReferralWithAggregates

### `./lib/repo/eventRepo.ts`

- `../core/attribution` → `*`
- `./visitRepo` → `*`
- `./referralRepo` → `*`
- `./partnerRepo` → `*`
- `../../tables/registrations.table` → `Registrations` (default)
- `../../tables/orders.table` → `Orders` (default)
- `../../tables/payments.table` → `Payments` (default)
- экспортирует: processRegistration, processOrder, processPayment, getReferralEventLog, ReferralEventType, ReferralEventItem

### `./lib/repo/botRepo.ts`

- `@app/request` → `request`
- `../../shared/types` → `BotRow`, `TelegramUpdate` (types)
- `../../tables/bots.table` → `Bots` (default)
- `../../tables/bot_updates.table` → `BotUpdates` (default)
- `../../config/routes` → `getTelegramWebhookUrl`

### `./lib/core/urlBuilder.ts`

- `../../config/routes` → `getPartnerRedirectUrl`

### `./lib/core/fingerprint.ts`

- нет импортов (использует глобальный namespace `app` для типа `app.Req`; экспорт: `FingerprintData`, `FingerprintResult`, `computeFingerprint`)

### `./lib/telegram/messages.ts`

- `../../shared/types` → `PartnerRow` (type)

### `./lib/telegram/keyboards.ts`

- нет внутренних импортов (экспорт: `TelegramReplyButton`, `TelegramInlineButton`, `getMainKeyboard`, `getWelcomeInlineButtons`)

### `./lib/telegram/sendTelegram.ts`

- `@app/request` → `request`
- `./keyboards` → `TelegramInlineButton` (type)

### `./lib/telegram/botHandler.ts`

- `../../shared/types` → `BotRow`, `PartnerRow`, `TelegramUpdate` (types)
- `../repo/botRepo` → `*`
- `../repo/partnerRepo` → `*`
- `../repo/campaignRepo` → `*`
- `../repo/pageRepo` → `*`
- `../repo/linkRepo` → `*`
- `../../config/routes` → `getPartnerRedirectUrl`
- `./messages` → `buildWelcomeMessage`, `buildStatsMessage`
- `./keyboards` → `getWelcomeInlineButtons`
- `./sendTelegram` → `sendTelegramMessage`, `inlineKeyboardFromButtons`

## 7.1) Hook (webhook)

### `./hook/telegram.ts`

- `../lib/repo/botRepo` → `*`
- `../lib/telegram/botHandler` → `handleTelegramUpdate`
- POST `/` с query `botId` — приём апдейтов Telegram Bot API (путь hook/telegram, без тильды; URL: getTelegramWebhookUrl(botId))

### `./hook/register.ts`

- `../lib/repo/pageRepo` → `*`
- `../lib/repo/eventRepo` → `*`
- GET и POST `/` — webhook регистрации (key, ref, tg_id, gc_id, name, email, phone)

### `./hook/order.ts`

- `../lib/repo/pageRepo` → `*`
- `../lib/repo/eventRepo` → `*`
- GET и POST `/` — webhook заказа (key, ref, order_id, product_name, order_sum)

### `./hook/payment.ts`

- `../lib/repo/pageRepo` → `*`
- `../lib/repo/eventRepo` → `*`
- GET и POST `/` — webhook оплаты (key, ref, order_id, payment_sum)

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

### `./api/admin/recalc-referral-aggregates.ts`

- `@app/auth` → `requireAccountRole`
- `../../jobs/recalc-referral-aggregates.job` → `recalcReferralAggregatesJob`

### `./jobs/recalc-referral-aggregates.job.ts`

- `@app/sync` → `runWithExclusiveLock`
- `../tables/referrals.table` → `Referrals` (default)
- `../tables/referral_aggregates.table` → `ReferralAggregates` (default)
- `../tables/orders.table` → `Orders` (default)
- `../tables/payments.table` → `Payments` (default)
- `../tables/campaigns.table` → `Campaigns` (default)

### `./api/campaigns/list.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/campaignRepo` → `*`

### `./api/campaigns/create.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/campaignRepo` → `*`

### `./api/campaigns/get.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/campaignRepo` → `*`
- `../../lib/repo/memberRepo` → `*`

### `./api/campaigns/update.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/campaignRepo` → `*`
- `../../lib/repo/memberRepo` → `*`
- `../../shared/types` → `CampaignSettings` (type)

### `./api/campaigns/delete.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/campaignRepo` → `*`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/logger.lib` → `*`

### `./api/members/list.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`

### `./api/invites/create.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/inviteRepo` → `*`

### `./api/invites/get-by-token.ts`

- `../../lib/repo/inviteRepo` → `*`

### `./api/invites/accept.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/inviteRepo` → `*`

### `./api/pages/list.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/pageRepo` → `*`

### `./api/pages/create.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/pageRepo` → `*`

### `./api/pages/update.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/pageRepo` → `*`

### `./api/pages/delete.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/pageRepo` → `*`

### `./api/links/list.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/pageRepo` → `*`
- `../../lib/repo/partnerRepo` → `*`
- `../../lib/repo/linkRepo` → `*`
- `../../lib/core/urlBuilder` → `buildPartnerLinkUrl`

### `./api/analytics/dashboard.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/referralRepo` → `*`
- `../../tables/partners.table` → `Partners` (default)
- `../../tables/referrals.table` → `Referrals` (default)

### `./api/partners/list.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/partnerRepo` → `*`

### `./api/partners/get.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/partnerRepo` → `*`
- `../../lib/repo/linkRepo` → `*`
- `../../shared/types` → `PartnerStats` (type)
- `../../lib/core/urlBuilder` → `buildPartnerLinkUrl`
- `../../lib/repo/pageRepo` → `*`

### `./api/referrals/list.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/referralRepo` → `*`

### `./api/referrals/events.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/memberRepo` → `*`
- `../../lib/repo/eventRepo` → `*`

### `./api/bot/get.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/botRepo` → `*`
- `../../lib/repo/memberRepo` → `*`
- GET /api/bot/get?campaignId= — бот кампании

### `./api/bot/add.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/botRepo` → `*`
- `../../lib/repo/memberRepo` → `*`
- POST /api/bot/add — подключить бота (campaignId, token)

### `./api/bot/reinstall-webhook.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/botRepo` → `*`
- `../../lib/repo/memberRepo` → `*`
- POST /api/bot/reinstall-webhook — переустановить webhook бота (campaignId)

### `./api/bot/updates.ts`

- `@app/auth` → `requireRealUser`
- `../../lib/repo/botRepo` → `*`
- `../../lib/repo/memberRepo` → `*`
- GET /api/bot/updates?campaignId=&limit= — последние апдейты бота

### `./api/tests/list.ts`

- `@app/auth` → `requireAnyUser`
- `../../lib/logger.lib` → `*`

### `./api/tests/cleanup-campaign.ts`

- `@app/auth` → `requireAnyUser`
- `../../tables/campaigns.table` → `Campaigns`
- `../../tables/campaign_members.table` → `CampaignMembers`

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
- `../../../tables/logs.table` → `Logs`

### `./api/tests/endpoints-check/dashboard-lib.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/admin/dashboard.lib` → `*`

### `./api/tests/endpoints-check/ref-generator.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/core/refGenerator` → `generateUrlSafeId`, `generateCampaignSecret`

### `./api/tests/endpoints-check/fingerprint.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/core/fingerprint` → `computeFingerprint`

### `./api/tests/endpoints-check/member-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/core/refGenerator` → `generateCampaignSecret`
- `../../../lib/repo/memberRepo` → `*`
- `../../../shared/constants` → `DEFAULT_CAMPAIGN_SETTINGS`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`

### `./api/tests/endpoints-check/campaign-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/memberRepo` → `*`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`

### `./api/tests/endpoints-check/url-builder.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/core/urlBuilder` → `substituteRef`, `buildPartnerLinkUrl`

### `./api/tests/endpoints-check/page-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/pageRepo` → `*`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`
- `../../../tables/pages.table` → `Pages`

### `./api/tests/endpoints-check/link-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/pageRepo` → `*`
- `../../../lib/repo/linkRepo` → `*`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`
- `../../../tables/partners.table` → `Partners`
- `../../../tables/pages.table` → `Pages`
- `../../../tables/partner_links.table` → `PartnerLinks`

### `./api/tests/endpoints-check/visit-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/core/fingerprint` → тип `FingerprintData`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/pageRepo` → `*`
- `../../../lib/repo/linkRepo` → `*`
- `../../../lib/repo/visitRepo` → `*`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`
- `../../../tables/partners.table` → `Partners`
- `../../../tables/pages.table` → `Pages`
- `../../../tables/partner_links.table` → `PartnerLinks`
- `../../../tables/visits.table` → `Visits`

### `./api/tests/endpoints-check/redirect-route.ts`

- `@app/auth` → `requireAnyUser`
- `@app/request` → `request`
- `../../../config/routes` → `getPartnerRedirectUrl`, `getRedirectTestLandingUrlTemplate`
- `../../../lib/logger.lib` → `*`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/pageRepo` → `*`
- `../../../lib/repo/linkRepo` → `*`
- (вызов GET /r?linkId= через HTTP request к getPartnerRedirectUrl(slug), urlTemplate тестовой страницы — getRedirectTestLandingUrlTemplate(), без .run(ctx), чтобы ответ API не подменялся на 302)
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`
- `../../../tables/partners.table` → `Partners`
- `../../../tables/pages.table` → `Pages`
- `../../../tables/partner_links.table` → `PartnerLinks`
- `../../../tables/visits.table` → `Visits`

### `./api/tests/endpoints-check/partner-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/partnerRepo` → `*`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`
- `../../../tables/partners.table` → `Partners`
- `../../../shared/types` → `TelegramUser` (type)

### `./api/tests/endpoints-check/bot-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/botRepo` → `*`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`
- `../../../tables/bots.table` → `Bots`
- `../../../tables/bot_updates.table` → `BotUpdates`
- `../../../shared/types` → `TelegramUpdate` (type)

### `./api/tests/endpoints-check/telegram-bot.ts`

- `@app/auth` → `requireAnyUser`
- `@app/request` → `request`
- `../../../lib/logger.lib` → `*`
- `../../../lib/settings.lib` → `*`
- `../../../config/routes` → `getTelegramWebhookUrl`
- `../../../lib/telegram/messages` → `buildWelcomeMessage`, `buildStatsMessage`
- `../../../shared/types` → `PartnerRow` (type)

### `./api/tests/endpoints-check/telegram-hook.ts`

- `@app/auth` → `requireAnyUser`
- `@app/request` → `request`
- `../../../lib/logger.lib` → `*`
- `../../../config/routes` → `getTelegramWebhookUrl`

### `./api/tests/endpoints-check/referral-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/referralRepo` → `*`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`
- `../../../tables/partners.table` → `Partners`
- `../../../tables/referrals.table` → `Referrals`

### `./api/tests/endpoints-check/attribution.ts`

- пустой файл; категория «Атрибуция (resolveByRef)» в api/tests/list.

### `./api/tests/endpoints-check/event-repo.ts`

- `@app/auth` → `requireAnyUser`
- `../../../lib/logger.lib` → `*`
- `../../../lib/core/fingerprint` → тип `FingerprintData`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/pageRepo` → `*`
- `../../../lib/repo/linkRepo` → `*`
- `../../../lib/repo/visitRepo` → `*`
- `../../../lib/repo/eventRepo` → `*`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`
- `../../../tables/partners.table` → `Partners`
- `../../../tables/pages.table` → `Pages`
- `../../../tables/partner_links.table` → `PartnerLinks`
- `../../../tables/visits.table` → `Visits`
- `../../../tables/referrals.table` → `Referrals`
- `../../../tables/registrations.table` → `Registrations`
- `../../../tables/orders.table` → `Orders`
- `../../../tables/payments.table` → `Payments`

### `./api/tests/endpoints-check/webhooks-feature5.ts`

- `@app/auth` → `requireAnyUser`
- `@app/request` → `request`
- `../../../config/routes` → `getBaseUrl`, `getFullUrl`
- `../../../lib/logger.lib` → `*`
- `../../../lib/core/fingerprint` → тип `FingerprintData`
- `../../../lib/repo/campaignRepo` → `*`
- `../../../lib/repo/pageRepo` → `*`
- `../../../lib/repo/linkRepo` → `*`
- `../../../lib/repo/visitRepo` → `*`
- `../../../tables/campaigns.table` → `Campaigns`
- `../../../tables/campaign_members.table` → `CampaignMembers`
- `../../../tables/partners.table` → `Partners`
- `../../../tables/pages.table` → `Pages`
- `../../../tables/partner_links.table` → `PartnerLinks`
- `../../../tables/visits.table` → `Visits`
- `../../../tables/referrals.table` → `Referrals`
- `../../../tables/registrations.table` → `Registrations`
- `../../../tables/orders.table` → `Orders`
- `../../../tables/payments.table` → `Payments`

# Реферальная программа

## Оглавление

1. [Общая архитектура проекта](#общая-архитектура-проекта)
2. [Платформа и ограничения](#платформа-и-ограничения)
3. [Ключевые сущности и сценарии](#ключевые-сущности-и-сценарии)
4. [Структура файлов](#структура-файлов)
5. [Слои данных и API](#слои-данных-и-api)
6. [Кампании и участники](#кампании-и-участники)
7. [Страницы, ссылки и редирект](#страницы-ссылки-и-редирект)
8. [Визиты и атрибуция](#визиты-и-атрибуция)
9. [Telegram-бот](#telegram-бот)
10. [Рефералы и события (webhooks)](#рефералы-и-события-webhooks)
11. [Настройки, логи и админка](#настройки-логи-и-админка)
12. [Таблицы данных](#таблицы-данных)
13. [API и роуты](#api-и-роуты)
14. [Тесты](#тесты)
15. [Навигация по документации](#навигация-по-документации)

---

## Общая архитектура проекта

Проект представляет собой **реферальную программу** на базе Chatium с поддержкой:

- **Кампаний** — владелец и участники (роли campaign-owner / campaign-member)
- **Целевых страниц** — URL-шаблоны с плейсхолдером `{ref}` и webhook secret для событий
- **Партнёрских ссылок** — уникальный slug на пару (страница + партнёр), редирект через GET /r?linkId=
- **Визитов** — клики по ссылкам с fingerprint для дедупликации
- **Telegram-бота** — приветствие, статистика, выдача партнёрской ссылки; webhook без тильды (hook/telegram?botId=)
- **Рефералов и событий** — регистрация, заказы, оплаты через webhooks (hook/register, hook/order, hook/payment) с key = page.webhookSecret
- **Настроек и логов** — key-value в Heap, серверные логи с уровнем, дашборд админки, WebSocket для логов в реальном времени
- **Приглашений в кампанию** — токен, страница приглашения, принятие (добавление в campaign_members)

Поток данных: **HTTP → API → lib → repos → Heap**. Роутинг file-based: один файл — один роут с путём `/`. Ссылки формируются через `withProjectRoot(route.url())`.

---

## Платформа и ограничения

- **Платформа:** Chatium. Серверная часть управляется платформой.
- **Стек** фиксирован платформой; новые npm-зависимости не добавляем.
- **Деплой** — автоматически после пуша.
- **Глобальные объекты:** `ctx` и `app` — глобальные, не импортировать.
- **Логирование:** использовать `ctx.account.log` / проектную обёртку (lib/logger.lib, shared/logger для клиента).
- **Документация платформы:** inner/docs; навигатор — 000-summ.md.

---

## Ключевые сущности и сценарии

### Кампания

- Владелец (ownerUserId) и участники в `campaign_members` (роль: campaign-owner | campaign-member).
- Настройки кампании: `CampaignSettings` (requireNewClient, products, attributionDays, botUpdatesLimit, logLevel).
- Создание кампании добавляет владельца в campaign_members. Удаление — мягкое (isDeleted).

### Партнёр

- Привязка к кампании и Telegram (tgId, username, fullName). Создаётся при первом обращении к боту или через getOrCreatePartner.
- Статистика в поле stats; инкремент при событиях (registrations, orders, payments).

### Страница кампании

- `urlTemplate` обязан содержать `{ref}`. При создании страницы генерируется `webhookSecret` (для webhooks событий).
- По key (webhook secret) ищется страница через `findPageBySecret`; campaignId берётся из page.

### Партнёрская ссылка

- Одна запись на пару (partner + page). `publicSlug` — короткий идентификатор для редиректа.
- URL редиректа: GET /r?linkId={publicSlug}. По slug ищется ссылка, загружается страница, создаётся визит, редирект 302 на urlTemplate с подставленным ref.

### Визит

- Создаётся при переходе по редиректу. Поля: campaignId, partnerLinkId, partnerId, pageId, ref, fingerprintHash, fingerprintParts, clickedAt, registeredAt.
- Дедупликация по fingerprint (lib/core/fingerprint). ref используется для атрибуции в webhooks.

### Реферал

- Один реферал на пару (campaignId + ref). События (регистрация, заказ, оплата) приходят через webhooks; key = page.webhookSecret; идемпотентность по campaignId+orderId для order/payment и по campaignId+ref для register.

---

## Структура файлов

```
/ref-program/
├── index.tsx                    # Главная (SSR + Vue)
├── r.tsx                        # Публичный редирект GET /r?linkId=
├── styles.tsx                   # Глобальные стили
│
├── config/
│   ├── routes.tsx               # PROJECT_ROOT, ROUTES, getFullUrl, getPartnerRedirectUrl, getTelegramWebhookUrl
│   └── project.tsx              # getPageTitle, getHeaderText
│
├── web/                         # Браузерные роуты
│   ├── admin/index.tsx          # Админка (requireAccountRole('Admin'))
│   ├── profile/index.tsx        # Профиль (requireRealUser)
│   ├── login/index.tsx          # Вход (редирект на /s/auth/signin)
│   ├── invite/index.tsx         # Страница приглашения по токену
│   ├── campaign/index.tsx      # Оболочка кампании (hash: #partners, #referrals, #pages, #bot, #about)
│   └── tests/
│       ├── index.tsx            # Страница тестов
│       └── redirect-landing/index.tsx  # Заглушка для тестов редиректа (?ref=)
│
├── api/                         # File-based API (один файл — один эндпоинт с /)
│   ├── settings/                # list, get, save
│   ├── campaigns/               # list, create, get, update, delete
│   ├── members/                 # list
│   ├── invites/                 # create, get-by-token, accept
│   ├── pages/                   # list, create, update, delete
│   ├── links/                   # list
│   ├── analytics/               # dashboard
│   ├── partners/                # list, get
│   ├── referrals/               # list, events
│   ├── bot/                     # get, add, reinstall-webhook, updates
│   ├── logger/log.ts            # POST запись лога
│   ├── admin/logs/              # recent, before
│   ├── admin/dashboard/         # counts, reset
│   ├── admin/recalc-referral-aggregates.ts   # POST — поставить в очередь пересчёт агрегатов (джоб)
│   └── tests/                   # list, cleanup-campaign, endpoints-check/*
│
├── jobs/                        # Отложенные задачи (app.job)
│   └── recalc-referral-aggregates.job.ts     # Цепочка батчей по 1000 записей (scheduleJobAsap)
│
├── hook/                        # Webhooks (без авторизации)
│   ├── telegram.ts              # POST hook/telegram?botId=
│   ├── register.ts              # GET/POST key + ref (+ tg_id, gc_id, name, email, phone)
│   ├── order.ts                 # GET/POST key, ref, order_id, product_name, order_sum
│   └── payment.ts               # GET/POST key, ref, order_id, payment_sum
│
├── lib/                         # Бизнес-логика
│   ├── settings.lib.ts          # Настройки (getLogLevel, getLogWebhook, getDashboardResetAt, ...)
│   ├── logger.lib.ts            # Запись логов (Heap, WebSocket, вебхук)
│   ├── admin/dashboard.lib.ts   # getDashboardCounts, resetDashboard
│   ├── core/
│   │   ├── refGenerator.ts      # generateUrlSafeId, generateCampaignSecret, generateLinkSlug, generateInviteToken
│   │   ├── urlBuilder.ts        # substituteRef, buildPartnerLinkUrl
│   │   ├── fingerprint.ts       # computeFingerprint (дедупликация визитов)
│   │   └── attribution.ts       # resolveByRef → visit, partnerId, campaignId
│   ├── repo/                    # Репозитории (campaignRepo, memberRepo, pageRepo, linkRepo, visitRepo, partnerRepo, referralRepo, eventRepo, botRepo, inviteRepo)
│   └── telegram/                # messages, keyboards, sendTelegram, botHandler, partnerNotify
│
├── repos/                       # Слой БД (только Heap)
│   ├── settings.repo.ts
│   └── logs.repo.ts
│
├── tables/                      # Heap-таблицы (схемы)
│   ├── settings.table.ts
│   ├── logs.table.ts
│   ├── campaigns.table.ts
│   ├── campaign_members.table.ts
│   ├── campaign_invites.table.ts
│   ├── partners.table.ts
│   ├── pages.table.ts
│   ├── partner_links.table.ts
│   ├── visits.table.ts
│   ├── bots.table.ts
│   ├── bot_updates.table.ts
│   ├── referrals.table.ts
│   ├── registrations.table.ts
│   ├── orders.table.ts
│   └── payments.table.ts
│
├── pages/                       # Vue-страницы
│   ├── IndexPage.vue
│   ├── HomePage.vue
│   ├── AdminPage.vue
│   ├── ProfilePage.vue
│   ├── LoginPage.vue
│   ├── InvitePage.vue
│   ├── TestsPage.vue
│   ├── CampaignPageShell.vue
│   ├── CampaignPage.vue         # Дашборд кампании
│   ├── PartnersPage.vue
│   ├── PartnerProfilePage.vue
│   ├── ReferralsPage.vue
│   ├── PagesPage.vue
│   ├── BotPage.vue
│   └── AboutCampaignPage.vue    # Удаление кампании
│
├── components/
│   ├── Header.vue, AppFooter.vue, GlobalGlitch.vue, LogoutModal.vue
│   ├── Layout/Sidebar.vue, PageContainer.vue
│   ├── Forms/CampaignForm.vue, BotForm.vue, PageForm.vue
│   ├── Charts/StatsCard.vue
│   ├── Tables/DataTable.vue, Pagination.vue
│   └── Modals/ConfirmModal.vue, EventLogModal.vue, WebhookInfoModal.vue
│
├── shared/
│   ├── types.ts                 # CampaignSettings, CampaignRow, MemberRow, PageRow, VisitRow, PartnerRow, ReferralRow, ...
│   ├── constants.ts             # CAMPAIGN_ROLES, DEFAULT_CAMPAIGN_SETTINGS
│   ├── logLevel.ts              # Передача уровня логирования на клиент
│   ├── logger.ts                # Клиентский логгер (syslog-уровни, createComponentLogger, setLogSink)
│   └── preloader.ts
│
└── docs/                        # Документация
    ├── architecture.md
    ├── api.md
    ├── data.md
    ├── run.md
    ├── imports.md
    ├── ADR/
    └── LLM/
```

---

## Слои данных и API

| Слой              | Каталог               | Ответственность                                        |
| ----------------- | --------------------- | ------------------------------------------------------ |
| **Таблицы**       | `tables/`             | Схемы Heap (поля, типы). Только определение структуры. |
| **Репозитории**   | `repos/`, `lib/repo/` | Работа с БД: CRUD, запросы. Без бизнес-логики.         |
| **Бизнес-логика** | `lib/`                | Правила, дефолты, валидация. Вызывает репозитории.     |
| **API**           | `api/`                | HTTP-эндпоинты, валидация, права. Вызывает lib.        |

Поток: **HTTP → API → lib → repos → Heap**.

---

## Кампании и участники

### Роли (shared/constants.ts)

- `campaign-owner` — владелец; может удалить кампанию.
- `campaign-member` — участник; доступ к данным кампании.

### Основные операции

- **Создание кампании:** POST /api/campaigns/create, body: `{ title }` (≥ 2 символов). Владелец добавляется в campaign_members.
- **Доступ:** memberRepo.checkCampaignAccess(ctx, campaignId, userId) → { hasAccess, role }.
- **Удаление:** POST /api/campaigns/delete (только owner), мягкое (isDeleted=true).

### Приглашения

- POST /api/invites/create (campaignId, expiresInDays?) → токен.
- GET /api/invites/get-by-token?token= — публично (название кампании, expiresAt).
- POST /api/invites/accept (token) — добавление в campaign_members, инвайт помечается использованным.

---

## Страницы, ссылки и редирект

### Страницы (api/pages/, pageRepo)

- **urlTemplate** обязан содержать `{ref}`. При создании страницы генерируется **webhookSecret** (для hook/register, hook/order, hook/payment).
- list, create, update, delete с проверкой доступа к кампании.

### Партнёрские ссылки (linkRepo)

- getOrCreatePartnerLink(campaignId, partnerId, pageId) — одна ссылка на пару; publicSlug = generateLinkSlug().
- findLinkByPublicSlug(publicSlug) — для роута редиректа.
- Полный URL ссылки: buildPartnerLinkUrl(linkSlug) из config/routes (getBaseUrl + getFullUrl(REDIRECT_SUBROUTE) + ?linkId=).

### Роут редиректа (r.tsx)

- GET /r?linkId={publicSlug}. Без авторизации.
- По publicSlug ищется партнёрская ссылка и страница; создаётся визит (fingerprint + ref); ответ 302 на urlTemplate с подставленным ref (substituteRef).
- При отсутствии ссылки/страницы — 404.

---

## Визиты и атрибуция

### Визиты (visitRepo)

- createVisit(ctx, data) → { visit, ref, isNew }. Дедупликация по fingerprint (lib/core/fingerprint).
- findVisitByRef(ctx, ref), markVisitRegistered(ctx, ref).

### Атрибуция (lib/core/attribution.ts)

- resolveByRef(ctx, ref) → { visit, partnerId, campaignId } | null. Используется в eventRepo при обработке webhooks.

### Fingerprint (lib/core/fingerprint.ts)

- computeFingerprint(ctx) → { hash, parts }. Используется при создании визита для дедупликации.

---

## Telegram-бот

### Подключение бота (api/bot/)

- GET /api/bot/get?campaignId= — бот кампании (без токена и webhookUrl).
- POST /api/bot/add — body: { campaignId, token }. Проверка getMe, запись в bots, установка webhook. URL webhook не отдаётся клиенту.
- POST /api/bot/reinstall-webhook — body: { campaignId }. Переустановка webhook (если перезаписали снаружи).
- GET /api/bot/updates?campaignId=&limit= — последние апдейты.

### Webhook Telegram (hook/telegram.ts)

- POST hook/telegram?botId=. Без тильды в пути. Body — Telegram Update. Всегда 200 { ok: true }. URL: getTelegramWebhookUrl(botId) из config/routes.

### Логика бота (lib/telegram/botHandler.ts)

- /start → getOrCreatePartner, партнёрская ссылка, приветствие + кнопки (ссылка, статистика).
- /stats и callback «Статистика» → buildStatsMessage(partner).

---

## Рефералы и события (webhooks)

### Webhooks событий (key = page.webhookSecret)

- **hook/register** — GET/POST: key, ref (обяз.), tg_id, gc_id, name, email, phone. findPageBySecret(key) → campaignId; eventRepo.processRegistration. Идемпотентность по campaignId+ref.
- **hook/order** — GET/POST: key, ref, order_id, product_name, order_sum. processOrder. Идемпотентность по campaignId+orderId.
- **hook/payment** — GET/POST: key, ref, order_id, payment_sum. processPayment. Идемпотентность по campaignId+orderId.

### Репозитории

- **referralRepo:** createOrUpdateReferral, incrementReferralStats(campaignId, ref, { ordersCount?, ordersSum?, paymentsCount?, paymentsSum? }), listReferrals, getReferralEventLog.
- **eventRepo:** processRegistration, processOrder, processPayment (идемпотентность), getReferralEventLog(campaignId, ref).

### Атрибуция

- По ref через resolveByRef получаем visit, partnerId, campaignId. Реферал привязывается к партнёру; счётчики партнёра и реферала обновляются.

---

## Настройки, логи и админка

### Настройки (api/settings/, settings.repo, lib/settings.lib)

- Key-value в Heap (tables/settings.table). getSettingString, getLogLevel, getLogsLimit, getLogWebhook, getDashboardResetAt, getAllSettings.
- GET /api/settings/list, GET /api/settings/get?key=, POST /api/settings/save (body: { key, value }). Auth: Admin.

### Логи (api/logger/log, api/admin/logs/, logs.repo, lib/logger.lib)

- POST /api/logger/log — body: { message, severity?, payload? }. Уровень сверяется с log_level; запись в ctx.log, ctx.account.log, Heap, WebSocket (admin-logs), опционально вебхук.
- GET /api/admin/logs/recent?limit=, GET /api/admin/logs/before?beforeTimestamp=&limit= — пагинация. Auth: Admin.
- Админка: подписка на new-log (encodedLogsSocketId), при монтировании — recent, кнопка «Загрузить ещё 50» — before, «Очистить логи» — сдвиг таймштампа.

### Дашборд админки (api/admin/dashboard/, lib/admin/dashboard.lib)

- GET /api/admin/dashboard/counts — errorCount, warnCount после dashboard_reset_at (настройка в ms).
- POST /api/admin/dashboard/reset — записать текущий таймштамп в настройки. При новых логах (WebSocket) инкремент только если timestamp >= dashboardResetAt.

### Клиентский логгер (shared/logger.ts)

- Уровни по RFC 5424 (Emergency…Debug). createComponentLogger(name), setLogSink, LogEntry. Порог из window.**BOOT**.logLevel (передаётся с сервера через shared/logLevel.ts).

---

## Таблицы данных

| Таблица             | Файл                                | Назначение                    | Основные поля                                                              |
| ------------------- | ----------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| settings            | tables/settings.table.ts            | Настройки проекта (key-value) | key, value                                                                 |
| logs                | tables/logs.table.ts                | Серверные логи                | message, payload, severity, level, timestamp                               |
| campaigns           | tables/campaigns.table.ts           | Кампании                      | title, ownerUserId, settings, isDeleted                                    |
| campaign_members    | tables/campaign_members.table.ts    | Участники кампаний            | campaignId, userId, role                                                   |
| campaign_invites    | tables/campaign_invites.table.ts    | Приглашения по токену         | campaignId, token, expiresAt, acceptedAt                                   |
| partners            | tables/partners.table.ts            | Партнёры (Telegram)           | campaignId, tgId, username, fullName, stats                                |
| pages               | tables/pages.table.ts               | Целевые страницы              | campaignId, title, urlTemplate, webhookSecret                              |
| partner_links       | tables/partner_links.table.ts       | Партнёрские ссылки            | campaignId, partnerId, pageId, publicSlug                                  |
| visits              | tables/visits.table.ts              | Визиты по ссылкам             | campaignId, partnerLinkId, ref, fingerprintHash, clickedAt, registeredAt   |
| bots                | tables/bots.table.ts                | Telegram-боты                 | campaignId, tgBotId, username, webhookUrl, webhookStatus                   |
| bot_updates         | tables/bot_updates.table.ts         | Апдейты ботов                 | botId, updateId, tgUserId, updateType, payloadJson                         |
| referrals           | tables/referrals.table.ts           | Рефералы                      | campaignId, partnerId, ref, registeredAt, tgId, gcId, name, email, phone   |
| referral_aggregates | tables/referral_aggregates.table.ts | Агрегаты рефералов            | referralId, campaignId, ordersCount, ordersSum, paymentsCount, paymentsSum |
| registrations       | tables/registrations.table.ts       | События регистрации           | campaignId, ref, tgId, gcId, name, email, phone                            |
| orders              | tables/orders.table.ts              | События заказов               | campaignId, ref, orderId, productName, orderSum                            |
| payments            | tables/payments.table.ts            | События оплат                 | campaignId, ref, orderId, paymentSum                                       |

Типы: shared/types.ts (CampaignRow, MemberRow, PageRow, PartnerRow, ReferralRow, VisitRow, …). Константы: shared/constants.ts (CAMPAIGN_ROLES, DEFAULT_CAMPAIGN_SETTINGS).

---

## API и роуты

### Кампании

- GET /api/campaigns/list — список кампаний пользователя.
- POST /api/campaigns/create — body: { title }.
- GET /api/campaigns/get?campaignId=
- POST /api/campaigns/update — body: { campaignId, settings }.
- POST /api/campaigns/delete — body: { campaignId } (только owner).

### Участники и приглашения

- GET /api/members/list?campaignId=
- POST /api/invites/create, GET /api/invites/get-by-token?token=, POST /api/invites/accept

### Страницы и ссылки

- GET /api/pages/list?campaignId=, POST /api/pages/create, POST /api/pages/update, POST /api/pages/delete
- GET /api/links/list?campaignId=

### Аналитика, партнёры, рефералы

- GET /api/analytics/dashboard?campaignId= — агрегаты и последние рефералы.
- GET /api/partners/list?campaignId=&limit=&offset=&sortBy=&order=
- GET /api/partners/get?campaignId=&partnerId=
- GET /api/referrals/list?campaignId=&partnerId=&…, GET /api/referrals/events?campaignId=&ref=

### Бот

- GET /api/bot/get?campaignId=, POST /api/bot/add, POST /api/bot/reinstall-webhook, GET /api/bot/updates?campaignId=&limit=

### Настройки, логи, дашборд

- GET/POST api/settings/\*, POST /api/logger/log, GET api/admin/logs/recent|before, GET/POST api/admin/dashboard/counts|reset, POST api/admin/recalc-referral-aggregates (поставить в очередь пересчёт агрегатов; выполняется джобами батчами по 1000)

### Публичные

- GET /r?linkId= — редирект по партнёрской ссылке (r.tsx).
- GET /web/tests/redirect-landing?ref= — заглушка для тестов редиректа.

Подробные таблицы методов и путей — в `docs/api.md`.

---

## Тесты

- **Каталог:** api/tests/. GET /api/tests/list — список категорий и тестов.
- **Категория endpoints-check:** по одному файлу на тест (health, ping, config, settings-lib, settings-repo, logger-lib, logs-repo, dashboard-lib, ref-generator, fingerprint, member-repo, campaign-repo, url-builder, page-repo, link-repo, visit-repo, redirect-route, partner-repo, bot-repo, telegram-bot, telegram-hook, referral-repo, event-repo, webhooks-feature5, …).
- **Страница тестов:** web/tests, TestsPage.vue — блоки по категориям, кнопка «Запустить все тесты». POST /api/tests/cleanup-campaign — удаление тестовой кампании после campaigns-create.

---

## Навигация по документации

- **Архитектура:** `docs/architecture.md`
- **API (подробно):** `docs/api.md`
- **Данные и репозитории:** `docs/data.md`
- **Запуск и деплой:** `docs/run.md`
- **Импорты и циклы:** `docs/imports.md`
- **Решения (ADR):** `docs/ADR/`
- **История диалогов LLM:** `docs/LLM/`

Для точечных правок смотри конкретные файлы из структуры выше; при добавлении фич соблюдай 001-standards.md и 006-arch.md.

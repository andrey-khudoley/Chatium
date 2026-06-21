# Architecture

## Назначение

Базовый шаблон проекта Chatium с минимальным набором страниц и документации.

## Ограничения платформы

- Серверная инфраструктура предоставляется Chatium.
- Нельзя менять стек и зависимости.
- Деплой — автоматически при пуше.

## Основные сценарии

- Открыть главную страницу.
- Авторизоваться и попасть в профиль.
- Открыть админку (только роль Admin).

## Роутинг

- `index.tsx` — главная (SSR + Vue).
- `r.tsx` — публичный редирект GET /r?linkId= по партнёрской ссылке (фича 3): визит + редирект на urlTemplate с ref.
- `web/admin/index.tsx` — админка, `requireAccountRole('Admin')`.
- `web/profile/index.tsx` — профиль, `requireRealUser()`.
- `web/tests/index.tsx` — страница тестов, `requireRealUser()`.
- `web/tests/redirect-landing/index.tsx` — посадочная-заглушка для тестов роута редиректа (GET /web/tests/redirect-landing?ref=…), без авторизации.
- `web/login/index.tsx` — вход (редирект на системный `/s/auth/signin`).
- `web/campaign/index.tsx` — оболочка кампании (requireRealUser), навигация по hash: дашборд (#), партнёры (#partners), рефералы (#referrals), страницы (#pages), бот (#bot), о кампании (#about); удаление кампании только в разделе «О кампании» (POST /api/campaigns/delete, владелец).

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
- `web/` — браузерные роуты модулей (admin, profile, tests, login).
- `pages/` — Vue‑страницы (минимальные).
- `components/` — переиспользуемые Vue‑компоненты: Header, LogoutModal, AppFooter, GlobalGlitch; Forms (CampaignForm, BotForm, PageForm); Modals (ConfirmModal, EventLogModal, WebhookInfoModal); Charts/StatsCard; Tables (DataTable, Pagination); Layout (Sidebar, PageContainer).
- `api/` — API‑эндпоинты (получение и валидация входных данных). File-based: один файл — один эндпоинт с `/`. Пример: `api/settings/list.ts`, `api/settings/get.ts`, `api/settings/save.ts`, `api/campaigns/list.ts`, `api/campaigns/create.ts`, `api/logger/log.ts`, `api/admin/logs/recent.ts`, `api/admin/logs/before.ts`, `api/tests/list.ts`, `api/tests/endpoints-check/health.ts`, `api/tests/endpoints-check/ping.ts`, `api/tests/endpoints-check/ref-generator.ts`.
- `jobs/` — отложенные задачи (app.job): пересчёт агрегатов рефералов (`recalc-referral-aggregates.job.ts`) — цепочка батчей по 1000 записей через scheduleJobAsap.
- `tables/` — Heap‑таблицы (схемы: settings, logs, campaigns, campaign_members, campaign_invites, partners, pages, partner_links, visits, bots, bot_updates, referrals, registrations, orders, payments).
- `repos/` — репозитории (работа с БД: settings, logs; logs.repo включает findBeforeTimestamp для пагинации).
- `lib/` — бизнес‑логика (settings.lib, logger.lib: проверка уровня, запись в ctx/Heap/WebSocket/вебхук; lib/core/refGenerator: generateUrlSafeId, generateCampaignSecret, base62).
- `shared/` — общий код (preloader, logLevel для передачи уровня логирования на клиент, logger — уровни syslog RFC 5424, createComponentLogger, setLogSink/LogEntry для дашборда, logEmergency…logDebug в браузере с проверкой порога; types — CampaignSettings, CampaignRow, MemberRow; constants — роли кампании и DEFAULT_CAMPAIGN_SETTINGS).
- `docs/` — документация проекта.

## Интеграции

- Внешние сервисы: нет.
- Внутренние SDK: стандартные модули Chatium.

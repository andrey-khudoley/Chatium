# Architecture

## Назначение

Приложение Chatium: шаблонные страницы (главная, админка, профиль, логин, тесты, **текущие заказы** для Admin) плюс **реализованная** интеграция GetCourse ↔ Lava.top (ссылка на оплату, webhook, клиенты API). Сквозное описание потока — [integration-full-flow.md](./integration-full-flow.md). Подробная спецификация продукта и HTTP — в [README.md](./README.md) и `docs/integration-*.md`.

## Ограничения платформы

- Серверная инфраструктура предоставляется Chatium.
- Нельзя менять стек и зависимости.
- Деплой — автоматически при пуше.

## Основные сценарии

- Открыть главную страницу.
- Авторизоваться и попасть в профиль.
- Открыть админку (только роль Admin).
- Открыть страницу заказов с метриками по контрактам (только Admin).

## Роутинг

- `index.tsx` — главная (SSR + Vue), единственный роут в корне.
- `web/admin/index.tsx` — админка, `requireAccountRole('Admin')`.
- `web/profile/index.tsx` — профиль, `requireRealUser()`.
- `web/orders/index.tsx` — «Текущие заказы», `requireAccountRole('Admin')`; `OrdersPage.vue` — метрики по `lava_payment_contract`, фильтры по `created_at` и product/offer (`lib/admin/orders-metrics.lib`, API `api/admin/orders-metrics`, `api/admin/orders-filter-options`).
- `web/tests/index.tsx` — страница тестов, `requireRealUser()`; `TestsPage.vue` — вкладки «Юнит» (слияние ключей save без сети; шесть страниц — GET `page-routes-unit`, серверный `route.run`), «Интеграция» (те же шесть HTML-маршрутов — браузерный `fetch` + `shared/pageRouteProbe.ts`, затем два GET: GetCourse и Lava из Heap отдельно), «Устаревшее» (полный прежний набор), логи справа (CRT-оформление).
- `web/login/index.tsx` — вход (редирект на системный `/s/auth/signin`).

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

- `config/` — `routes.tsx` и `project.tsx` (оба с `// @shared` в первой строке — для импорта в Vue и shared-роуты), маршруты и `PROJECT_ROOT`.
- `web/` — браузерные роуты модулей (admin, profile, tests, orders, login).
- `pages/` — Vue‑страницы (минимальные).
- `components/` — переиспользуемые Vue‑компоненты (Header, AppFooter, GlobalGlitch, LogoutModal).
- `api/` — API‑эндпоинты (получение и валидация входных данных). File-based: один файл — один эндпоинт с `/`. Примеры: `api/settings/*`, `api/logger/log.ts`, `api/admin/logs/*`, `api/admin/lava/catalog`, **`api/admin/getcourse/verify`**, **`api/admin/orders-metrics`**, **`api/admin/orders-filter-options`**, **`api/integrations/lava/payment-link`**, **`api/integrations/lava/webhook`**, `api/tests/*`.
- `tables/` — Heap‑таблицы: `settings`, `logs`, **`lava_payment_contract`**, **`lava_webhook_event`**, **`lava_lock_log`**.
- `repos/` — репозитории для всех таблиц выше (в т.ч. `logs.repo` — findBeforeTimestamp для пагинации; репозитории интеграции — см. [data.md](./data.md)). Репозитории `lava_*` дополнительно пишут трассировку в Heap через `logger.lib` (`severity: 7` на вход/выход методов).
- `lib/` — бизнес‑логика: `settings.lib`, `logger.lib`, `admin/dashboard.lib`, **`admin/orders-metrics.lib`**, **`lava-api.client`**, **`getcourse-api.client`**, **`lava-payment.service`**, **`lava-webhook.service`**, **`lava-types.ts`**.
- `shared/lavaBaseUrl.ts` — нормализация базового URL Lava для форм и сервера.
- `shared/` — общий код (preloader, logLevel для передачи уровня логирования на клиент, logger — уровни syslog RFC 5424, createComponentLogger, setLogSink/LogEntry для дашборда, logEmergency…logDebug в браузере с проверкой порога).
- `docs/` — документация проекта.

## Интеграции

### GetCourse + Lava.top (реализовано)

Полное описание сценариев и оглавление — **[docs/README.md](./README.md)** и файлы `integration-*.md`. В коде:

- **Входящие API:** `POST …/payment-link` (без обязательных заголовков авторизации; опционально `integrationTestDryRun` для проверок без Lava), `POST …/webhook` (секрет Lava в `X-Api-Key`); file-based под `api/integrations/lava/`.
- **Критическая секция** обновления цены оффера и создания контракта — **`runWithExclusiveLock`** (`@app/sync`), журнал в `lava_lock_log`.
- **Исходящие вызовы** к Lava и GetCourse — **`@app/request`** (`lava-api.client`, `getcourse-api.client`); при уровне Debug — пошаговая трассировка (`writeServerLog`, `severity: 7`) по сервисам и клиентам интеграции.
- **Данные** — Heap (`lava_payment_contract`, `lava_webhook_event`, `lava_lock_log`), секреты и URL — в `settings` (`SETTING_KEYS` в `settings.lib`).

Контракты HTTP и приёмка — [integration-http-contracts.md](./integration-http-contracts.md), [integration-readiness-decisions-open-questions.md](./integration-readiness-decisions-open-questions.md). Lava API — [reference/lavatop-openapi3.yaml](./reference/lavatop-openapi3.yaml), [integration-lava-openapi-reference.md](./integration-lava-openapi-reference.md). GetCourse PL API — [reference/getcourse-pl-api-spec.md](./reference/getcourse-pl-api-spec.md).

### Платформа

- Внутренние SDK: стандартные модули Chatium (`@app/request`, `@app/sync`, `@app/heap`, и т.д.).

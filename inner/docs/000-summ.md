@chatium

# Навигатор по документации Chatium

Централизованный индекс для быстрого поиска информации по разработке в Chatium. Используйте ключевые слова для поиска нужного раздела.

> 🔎 **Семантический поиск.** Эти доки проиндексированы MCP `docs-search` (obsidian-hybrid-search: BM25 + эмбеддинги). Для поиска темы по смыслу формулируй запрос естественным языком в `mcp__docs-search__search`, документ читай через `mcp__docs-search__read` (напр. `003-auth.md`). Эта таблица ключевых слов — обзор и фоллбэк, когда нужен точный номер темы или MCP недоступен. Настройка и ребилд индекса — `README.md` корня.

## 📚 Структура документации

### Специализированные инструкции

| Файл                                    | Тема                             | Ключевые слова                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **001-standards.md**                    | Стандарты кода                   | TailwindCSS, FontAwesome, форматирование, best practices                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **002-routing.md**                      | Входящий роутинг                 | роутинг, маршруты, app.get, app.post, app.html, HTTP обработчики, URL, file-based, тильда (~), слеш, параметры пути, query параметры, route.url(), PROJECT_ROOT, withProjectRoot, относительные пути `./`                                                                                                                                                                                                                                                                      |
| **003-auth.md**                         | Авторизация                      | авторизация, пользователи, роли, requireAccountRole, requireRealUser, requireAnyUser, ctx.user, проверка прав, кастомная форма входа, LoginPage, PhoneAuthForm, EmailAuthForm, Telegram OAuth                                                                                                                                                                                                                                                                                  |
| **004-request.md**                      | Исходящий роутинг                | HTTP клиент, request, внешние API, GET запросы, POST запросы, headers, @app/request                                                                                                                                                                                                                                                                                                                                                                                            |
| **005-jobs.md**                         | Отложенные задачи и очереди       | задачи, джобы, app.job, scheduleJobAfter, scheduleJobAsap, scheduleJobAt, отложенное выполнение, Custom Job Queue, очередь задач, pushToCustomJobQueue, pickFromCustomJobQueue, воркер, FIFO, пакетная обработка                                                                                                                                                                                                                                                                                                                                                                                |
| **006-arch.md**                         | Архитектура проекта              | структура, директории, организация файлов, именование, best practices, папки, индекс, индекс-файл, корень модуля, один эндпоинт рядом с индексом, composables                                                                                                                                                                                                                                                                                                                  |
| **007-vue.md**                          | Vue компоненты                   | Vue, компоненты, страницы, рендеринг, `<script setup>`, реактивность, шаблоны, composables, use\*, 🚨 КРИТИЧЕСКОЕ: клиент vs сервер, Heap таблицы только на сервере, fetch() на клиенте, SSR, props, tsconfig.json, extends, jsx preserve, типовая ошибка: $event в шаблоне (не e), inline не полный TypeScript, запрет `as`/`satisfies` в атрибутах шаблона, Unexpected token expected comma, частые ошибки (события и шаблоны), TypeError element is not a function, UGC ERR |
| **008-heap.md**                         | База данных Heap                 | Heap, таблицы, CRUD, create, findAll, update, delete, Money, RefLink, поиск, фильтры, транзакции, race condition, runWithExclusiveLock, блокировки, id, createdAt, updatedAt, зарезервированные поля                                                                                                                                                                                                                                                                           |
| **022-getcourse-heap.md**               | Heap.Table() TypeScript API      | Heap.Table(), TypeScript таблицы, Heap.String, Heap.Number, Heap.Boolean, Heap.DateTime, Heap.Optional, Heap.Any, customMeta, searchable, embeddings, типизация, экспорт типов                                                                                                                                                                                                                                                                                                 |
| **009-files.md**                        | Работа с файлами                 | файлы, загрузка, изображения, obtainStorageFilePutUrl, getThumbnailUrl, hash, storage, видео, Kinescope                                                                                                                                                                                                                                                                                                                                                                        |
| **010-agents.md**                       | AI-агенты                        | агенты, AI, боты, startCompletion, pushMessageToChain, tools, инструменты, Telegram. ⚠️ **При создании/изменении тулов (tools/) — обязательно подключать 010 в контекст** (см. раздел «AI-агенты и боты» ниже).                                                                                                                                                                                                                                                                |
| **011-i18n.md**                         | Интернационализация              | переводы, i18n, ctx.t(), ctx.lang, мультиязычность, плюралы, YAML                                                                                                                                                                                                                                                                                                                                                                                                              |
| **012-sender.md**                       | Модуль @sender                   | мессенджеры, чаты, Telegram, VK, Email, sendMessageToChat, каналы, Person, теги                                                                                                                                                                                                                                                                                                                                                                                                |
| **013-config.md**                       | Конфигурация                     | config.json, readWorkspaceFile, updateWorkspaceFile, настройки                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **014-socket.md**                       | WebSocket                        | real-time, сокеты, sendDataToSocket, обновления, прогресс, чат                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **015-notifications.md**                | Уведомления админов              | sendNotificationToAccountOwners, уведомления, HTML, Markdown                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **016-analytics-workspace.md**          | ⭐ События workspace             | writeWorkspaceEvent, @start/after-event-write, события workspace, UTM метки, clrtTrack, clrtUid                                                                                                                                                                                                                                                                                                                                                                                |
| **016-analytics-traffic.md**            | ⭐ События трафика               | queryAi, Traffic SDK, pageview, клики, видео, scroll, HTTP/HTTPS группировка по action, ClickHouse, 8 базовых + 13 расширенных событий                                                                                                                                                                                                                                                                                                                                         |
| **016-analytics-getcourse.md**          | ⭐ GetCourse аналитика           | gcQueryAi, GetCourse SDK, dealCreated, dealPaid, user/created, ClickHouse, resolved_user_id, SQL запросы, 34 события, urlPattern, LIKE фильтрация, категории (5), EventDefinition, динамическая фильтрация                                                                                                                                                                                                                                                                     |
| **016-analytics-subscriptions.md**      | ⭐ Подписки на события           | subscribeToMetricEvents, metric-event хук, Heap подписки, WebSocket мониторинг, Events Subscribe проект                                                                                                                                                                                                                                                                                                                                                                        |
| **016-analytics-attribution.md**        | ⭐ Атрибуция пользователей       | uid → user_id маппинг, first-touch, last-touch, form/sent, session_id, AnalyticsUidMappings, AnalyticsSessionAttribution, parseUrlParams, utm-метки, промокоды, GetCourse регистрация                                                                                                                                                                                                                                                                                          |
| **017-payments.md**                     | Платежи                          | runAttemptPayment, attemptAutoCharge, getSavedCards, подписки, автосписание                                                                                                                                                                                                                                                                                                                                                                                                    |
| **018-preloader.md**                    | 🎨 Прелоадеры                    | boot sequence, системная загрузка, терминальный стиль, Performance API, мониторинг ресурсов, typing animation, geometric background, preloader types, спиннер, классический, инициализация темы                                                                                                                                                                                                                                                                                |
| **019-feed.md**                         | Модуль @app/feed                 | фиды, чаты, лента сообщений, createFeedMessage, getChat, external_id, origin_id, origin_type, омниканальность, Participant, inbox, getInboxInfo                                                                                                                                                                                                                                                                                                                                |
| **020-testing.md**                      | ⚠️ Unit тестирование             | тестирование, unit tests, реальный ctx (не мок), /web/tests, /web/tests/ai, /api/tests/run-tests, api/tests/endpoints-check, api/tests/list, pages/TestsPage, HTTP тесты, route.run внутри тестового роута, автоматизация, покрытие кода, JSON API, docs/testing.md                                                                                                                                                                                                            |
| **021-getcourse-events.md**             | ⚠️ Подписка на события GetCourse | subscribeToMetricEvents, metric-event, app.accountHook, app.pluginHook, transformGcEventParams, event://getcourse, metric-event-event://getcourse, realtime события, lesson answers, conversation, deals, contacts, ⚠️ ТОЛЬКО Chatium на стороне GetCourse                                                                                                                                                                                                                     |
| **024-project-docs.md**                 | 📄 Документация проекта          | README.md, docs/, ADR, LLM, правила документации, структура файлов                                                                                                                                                                                                                                                                                                                                                                                                             |
| **025-app-modules.md**                  | Сводка по модулям @app           | все 30 пакетов @app, index.d.ts, назначение модулей                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **025-inbox.md**                        | Модуль @app/inbox                | getInboxData, updateInbox, resetInboxBadge, UgcInboxData, связь с фидами                                                                                                                                                                                                                                                                                                                                                                                                       |
| **026-users.md**                        | @app/users и граница с @app/auth | updateUser, deprecated getOrCreate*, find*, 003-auth                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **027-storage.md**                      | Модуль @app/storage              | obtainStorageFilePutUrl, getThumbnailUrl, загрузка, превью, типы файлов                                                                                                                                                                                                                                                                                                                                                                                                        |
| **028-sync.md**                         | Модуль @app/sync                 | runWithExclusiveLock, tryRunWithExclusiveLock, блокировки, 008-heap                                                                                                                                                                                                                                                                                                                                                                                                            |
| **029-account.md**                      | Модуль @app/account              | настройки аккаунта, seats, баланс токенов, installApp                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **030-errors.md**                       | Модуль @app/errors               | NotFoundError, AccessDeniedError, ValidationError, CustomError                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **031-security.md**                     | Модуль @app/security             | CSRF, generateDynamicCsrfToken, verifyDynamicCsrfToken                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **032-ugc.md**                          | Модуль @app/ugc                  | UGC-файлы, findUgcFile, updateUgcFileSource, права на файлы                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **033-app.md**                          | Модуль @app/app                  | runAppFunction, runInterAppCall, вызовы между приложениями                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **034-hooks.md**                        | Модуль @app/hooks                | runHook, execHook, CustomHookRegistration                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **035-html-jsx.md**                     | @app/html-jsx и @app/html        | jsx, renderHtml, portal, бандлы, InitializerComponent                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **036-form-storage.md**                 | Модуль @app/form-storage         | setItem, getItem, addToSet, listSet, данные форм                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **037-iap.md**                          | Модуль @app/iap                  | In-App Purchases, hasPurchasedProduct, findAllIapsByUser                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **038-metric.md**                       | Модуль @app/metric               | writeMetricEvent, subscribeToMetricEvents, writeAccessLog                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **039-mobile-app.md**                   | Модуль @app/mobile-app           | getMobileAppLink, generateMobileAppRunActionUrlPath                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **040-responsive.md**                   | Модуль @app/responsive           | responsiveState, адаптивная вёрстка                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **041-schema.md**                       | Модуль @app/schema               | ZType, s, схемы Heap, валидация                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **042-solid-js.md**                     | Модуль @app/solid-js             | Solid.js, createSignal, createEffect, JSX                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **043-types.md**                        | Модуль @app/types                | RichUgcCtxDef, RouteApi, FunctionRouteRef, jsx                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **044-ui.md**                           | Модуль @app/ui                   | блоки UI, jsx, Fragment, attachMedia                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **045-nanoid.md**                       | Модуль @app/nanoid               | accountNanoid, nanoid, генерация ID                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **046-isolated-eval.md**                | Модуль @app/isolated-eval        | isolatedEval, безопасное выполнение кода                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **047-base64.md**                       | Base64 UTF-8 в UGC               | самописный `utf8StringToBase64` / `base64ToUtf8String` (образец liveahalf); **не** `base64Encode`/`base64Decode`; без `Buffer`/`btoa`/`atob`; GetCourse Legacy `params`                                                                                                                                                                                                                                                                                                        |
| **048-chatium-http-response-probes.md** | ⚠️ Фактические HTTP-ответы UGC   | HTTP 200 при ctx.resp.json 4xx, редирект JSON body, rawHttpBody статусы, интеграционные тесты, temp пробы, fetch response.ok                                                                                                                                                                                                                                                                                                                                                   |
| **049-clickhouse.md**                   | 🗄️ ClickHouse (аналитическая БД, runtime-верифиц.) | ClickHouse, chatium_ai.access_log, behaviour2_log, traffic_source_statistics, account_logs, writeMetricEvent, writeWorkspaceEvent, captureCustomerEvent (@crm/sdk/v2), ctx.account.log, queryAi, MetricEventData (type-only), сквозная аналитика, CAC/ROAS, matched_traffic_source_ids, getAccountEvents, getWorkspaceEvents, payloadMapping, ContactType, частые ошибки, ⚠️ queryAccountLogs/listAccountLogs НЕ работают в runtime (чтение account_logs — через queryAi)                     |

---

## 🔍 Быстрый поиск по темам

### Роутинг и маршруты

**Файл**: `002-routing.md`

- ⚠️ **Эмпирические форматы HTTP** (200 vs реальный 4xx, редиректы): **`048-chatium-http-response-probes.md`**
- Создание роутов (app.get, app.post, app.html)
- File-based архитектура (`/` и `~` в URL, `~` если путь не `'/'`)
- URL всегда относительный `./` + `PROJECT_ROOT`
- `withProjectRoot(route.url())` для клиента
- Параметры пути (:id, :slug)
- Query параметры (?key=value)
- Генерация ссылок (route.url() + withProjectRoot)
- ⚠️ **КРИТИЧЕСКИ ВАЖНО**: Никогда не используйте хардкод URL!
- Всегда импортируйте роуты и вызывайте .url()
- Форматирование ответов (JSON, HTML, ошибки)
- Контекст (ctx) и запрос (req)

### Авторизация и безопасность

**Файл**: `003-auth.md`

- requireAccountRole(ctx, 'Admin') — проверка роли
- requireRealUser(ctx) — только реальные пользователи
- requireAnyUser(ctx) — гарантия наличия пользователя
- ctx.user — текущий пользователь
- Роли: Admin, Staff, User
- Проверки в роутах и API
- **Кастомная форма входа** — LoginPage.vue, PhoneAuthForm, EmailAuthForm
- Структура формы: поле ввода → пароль → Войти → или → Отправить код → или → Telegram
- Telegram OAuth через getTelegramOauthUrl()

### HTTP запросы к внешним API

**Файл**: `004-request.md`

- import { request } from "@app/request"
- GET, POST, PUT, DELETE запросы
- Headers и авторизация
- Обработка ошибок
- responseType: 'json' | 'text'
- throwHttpErrors: true | false
- **GetCourse Legacy**, поле формы **`params`** (Base64 от UTF-8 JSON): см. **`047-base64.md`** → раздел про Legacy GetCourse

### Отложенные задачи и планирование

**Файл**: `005-jobs.md`

- app.job() — определение задачи
- scheduleJobAfter(ctx, N, 'unit', params) — через время
- scheduleJobAsap(ctx, params) — асинхронно
- scheduleJobAt(ctx, date, params) — в дату
- cancelScheduledJob(ctx, taskId) — отмена
- **Custom Job Queue** — очереди кастомных задач (FIFO, пакетная обработка воркером): pushToCustomJobQueue / pushToCustomJobQueueMulti / pickFromCustomJobQueue / deleteFromCustomJobQueue / scheduleNextCustomJobQueueRunAfter

### Структура проекта

**Файл**: `006-arch.md`

- Организация папок (/api/, /web/, /pages/, /components/, /composables/, /tables/, /config/)
- `/config/routes.tsx`, `PROJECT_ROOT`, `withProjectRoot()`
- **composables/** — переиспользуемая клиентская логика (Vue composables, use\*), см. 007-vue.md
- Правила именования (camelCase, PascalCase)
- Один файл — один роут
- Shared файлы (// @shared)
- Комментарии // @shared-route

### Vue компоненты и страницы

**Файл**: `007-vue.md`

- `<script setup>` — Composition API
- ⚠️ **КРИТИЧЕСКИ ВАЖНО**: Использование роут-объектов, не хардкода URL!
- Рендеринг на сервере (SSR)
- Глобальный ctx
- Реактивность (ref, reactive, computed)
- Импорт роутов в компонентах
- `route.url()` + `withProjectRoot()` в темплейтах, относительные URL `./`
- ⚠️ **Типовая ошибка**: в инлайновом обработчике в шаблоне событие — только **`$event`**, не `e`. Иначе **`TypeError: element is not a function`** (UGC ERR, стек `at app.html(/) @ .../index.tsx`). См. 007-vue.md → «Частые ошибки (события и шаблоны)».
- ⚠️ **Инлайн шаблона ≠ TypeScript**: не использовать **`as`**, **`satisfies`** и другой чисто TS-синтаксис в выражениях `@...` / `:...` / `{{ }}` — иначе часто **`Unexpected token, expected ","`** (строка в логе может смещаться). Приведение типов и работа с `event.target` — в методе в `<script setup>`. См. 007-vue.md → «Критично: inline-выражения шаблона не являются полным TypeScript».

### База данных Heap

**Файл**: `008-heap.md` (JSON-таблицы)

- Heap.Table() — создание таблицы через JSON
- CRUD операции (create, findAll, update, delete)
- Фильтрация (where, операторы)
- Сортировка (order)
- Подсчёт (countBy)
- Полнотекстовый поиск (searchBy)
- Money — работа с деньгами
- RefLink — связи между таблицами
- Транзакции
- ⚠️ **Race condition**: При работе с БД следите за возможностью race condition. Используйте `runWithExclusiveLock` из `@app/sync` для предотвращения проблем при параллельных запросах

**Файл**: `022-getcourse-heap.md` (TypeScript API)

- Heap.Table() — создание таблицы через TypeScript
- Типы полей (Heap.String, Heap.Number, Heap.Boolean, Heap.DateTime, Heap.Any)
- Heap.Optional() — опциональные поля
- customMeta — метаданные полей
- searchable — настройки поиска (embeddings: false по умолчанию)
- Экспорт типов (TableRow, TableRowJson)
- Типизация TypeScript
- Сравнение с JSON-таблицами

### Работа с файлами

**Файл**: `009-files.md`

- obtainStorageFilePutUrl() — получение URL загрузки
- Загрузка с клиента (FormData)
- getThumbnailUrl() — получение изображений
- getVideoInfo() — информация о видео
- Типы файлов (ImageFile, VideoFile, AudioFile)
- Хранение hash в таблицах

### AI-агенты и боты

**Файл**: `010-agents.md`

**Когда обязательно подключать 010-agents.md в контекст (читать/держать в контексте):**

- Создание или изменение **инструмента агента (tool)** — любой код в каталоге `tools/`, добавление нового тула, workspace tool.
- Регистрация инструмента через `app.accountHook('@start/agent/tools', ...)` или подключение в `enabledTools`.
- Задачи со словами: «тул», «инструмент агента», «добавить задачу через агента», «tool для агента», «workspace tool», «tools/tasks».
- Интеграция агента с Telegram (хук `@sender/message-received`, pushMessageToChain).
- Реализация веб-чата с агентом (sendChatResponse, WebSocket).

Если задача касается агентов или инструментов — перед реализацией откройте **010-agents.md** и сверяйтесь с разделами «Создание инструментов», «Регистрация инструмента» и «Паттерны и антипаттерны при создании инструмента».

- getOrCreateAgentForWorkspace() — создание агента
- pushMessageToChain() — отправка сообщений
- startCompletion() — AI генерация
- Создание инструментов (tools)
- Callbacks (onCompletionCompleted, onCompletionFailed)
- Интеграция с Telegram

### Интернационализация (i18n)

**Файл**: `011-i18n.md`

- ctx.lang — текущий язык
- ctx.t() — функция перевода
- YAML файлы переводов (\*.lang.yml)
- Плюралы и формы слов
- Переключение языка
- Использование в Vue и API

### Модуль @sender (мессенджеры и чаты)

**Файл**: `012-sender.md`

- getChannels() — список каналов
- sendMessageToChat() — отправка сообщений
- findPersons() — поиск профилей
- Работа с Telegram, VK, Email
- Теги и сегментация
- Бакеты и стартовые параметры

### Модуль @app/feed (фиды и чаты)

**Файл**: `019-feed.md`

- getFeedById(), createFeed(), updateFeed(), deleteFeed()
- getChat() — конфигурация чата для веб-клиента
- createFeedMessage(), findFeedMessages(), findMessagesByExternalId()
- Участники (Participant), inbox-хуки (getInboxInfo)
- external_id, origin_id, origin_type — омниканальность (веб + Telegram и др.)

### Модули @app (сводный справочник)

**Файл**: `025-app-modules.md`

- Таблица всех 30 пакетов @app с назначением и ссылками на документы
- Детальные документы: inbox (025-inbox), users/auth (026-users), storage (027-storage), sync (028-sync), account (029), errors (030), security (031), ugc (032), app (033), hooks (034), html-jsx/html (035), form-storage (036), iap (037), metric (038), mobile-app (039), responsive (040), schema (041), solid-js (042), types (043), ui (044), nanoid (045), isolated-eval (046)
- Типизации: node_modules/@app/<module>/index.d.ts

### Конфигурация

**Файл**: `013-config.md`

- readWorkspaceFile() — чтение config.json
- updateWorkspaceFile() — запись config.json
- Типизированная конфигурация
- Валидация и безопасность

### WebSocket

**Файл**: `014-socket.md`

- sendDataToSocket() — отправка с сервера
- getOrCreateBrowserSocketClient() — подключение
- subscribeToData() — подписка на обновления
- Real-time прогресс и уведомления

### Уведомления администраторов

**Файл**: `015-notifications.md`

- sendNotificationToAccountOwners() — отправка уведомлений
- HTML, Markdown, Plain text форматы
- Уведомления о заявках и заказах

### ⭐ Аналитика: События workspace

**Файл**: `016-analytics-workspace.md`

- writeWorkspaceEvent() — запись событий приложения
- getWorkspaceEventUrl() — регистрация типов событий
- Хук @start/after-event-write — автоматическая обработка
- Клиентские события (window.clrtTrack, window.clrtUid)
- UTM метки и параметры
- Примеры: регистрация, формы, заявки, заказы
- **НОВОЕ**: Пагинация событий - `/api/events` POST endpoint
- Режимы: 'list' (пагинация) и 'poll' (real-time)
- Фиксация maxTimestamp для стабильной пагинации
- app.body() для POST, дедупликация только в poll режиме

### ⭐ Аналитика: События трафика (8 базовых + 13 расширенных)

**Файл**: `016-analytics-traffic.md`

- queryAi() — SQL запросы к ClickHouse
- ⚠️ HTTP/HTTPS события группируются по `action`, а не по URL
- События трафика из chatium_ai.access_log
- pageview — просмотры страниц
- Клики (button_click, link_click)
- Видео (video_play, video_pause, video_complete)
- E-commerce (add_to_cart, checkout, purchase)
- Метрики: DAU/MAU, Bounce Rate, Session Duration

### ⭐ Аналитика: GetCourse события (34 типа + 5 категорий)

**Файл**: `016-analytics-getcourse.md`

- gcQueryAi() — SQL запросы к GetCourse событиям
- EventDefinition — TypeScript типизация событий
- urlPattern — паттерны для LIKE фильтрации (event://getcourse/%)
- EVENT_CATEGORIES — гибкие категории для группировки
- dealCreated, dealPaid — заказы и оплаты
- user/created — регистрация пользователей
- user/chatbot/\* — привязка мессенджеров
- ВАЖНО: resolved_user_id vs user_id
- SQL примеры: воронки, LTV, когорты

### ⭐ Аналитика: Подписки на события

**Файл**: `016-analytics-subscriptions.md`

- subscribeToMetricEvents() — подписка на события
- Хук metric-event — обработка (⚠️ не работает стабильно)
- Events Subscribe проект — рабочая реализация
- Heap таблица subscriptions
- WebSocket мониторинг через Job
- Real-time события в браузере

### ⭐ Аналитика: Атрибуция пользователей

**Файл**: `016-analytics-attribution.md`

- Связка анонимных uid с реальными user_id GetCourse
- First-touch и last-touch attribution
- Событие-мост: event://getcourse/form/sent
- Таблицы: AnalyticsUidMappings, AnalyticsSessionAttribution
- Флаги isFirst/isLast для оптимизации O(1)
- parseUrlParams() — парсинг utm-меток и промокодов
- processAttributionJob — автоматическая обработка
- API: POST /api/attribution

### 🗄️ ClickHouse — аналитическая база данных

**Файл**: `049-clickhouse.md`

- Архитектура ClickHouse в Chatium (platform-managed, только SELECT, нет DDL)
- Таблицы: `chatium_ai.access_log`, `behaviour2_log`, `traffic_source_statistics`, `account_logs`, `sender_app.messages_log`
- Запись: `writeMetricEvent` (@app/metric), `writeWorkspaceEvent` (@start/sdk), `captureCustomerEvent` (**@crm/sdk/v2**), `ctx.account.log`
- Чтение: `queryAi` (@traffic/sdk), полная структура `access_log` (сверена с `MetricEventRecord`)
- Сквозная аналитика: `matched_traffic_source_ids`, CAC/ROAS, fallback по UTM, readable label источника
- Декларация событий: `getAccountEvents` (поле `type` объявлено, но в runtime `undefined`) / `getWorkspaceEvents` (EventDeclaration), `payloadMapping`
- ⚠️ Чтение логов приложения: только через `queryAi` (SQL к `chatium_ai.account_logs`); `queryAccountLogs`/`listAccountLogs` из `@app/ugc` объявлены, но НЕ работают в runtime
- Частые ошибки + чек-лист + раздел «Результаты runtime-верификации»
- ⚠️ Раздел «Сверка с тайпингами» — исправленные расхождения исходника (импорты, `ctx.account.log`, contact-типы)

### ⚠️ Подписка на события GetCourse

**Файл**: `021-getcourse-events.md`

- ⚠️ **ТОЛЬКО для Chatium на стороне GetCourse**
- subscribeToMetricEvents() — подписка на metric-события
- app.accountHook('metric-event', ...) — общий хук для всех подписанных событий
- app.accountHook('metric-event-event://getcourse/...', ...) — хук для конкретного события
- app.pluginHook() — хуки в плагинах GetCourse Store
- transformGcEventParams() — нормализация событий
- Поддерживаемые события: lesson answers, conversation, deals, contacts, forms, surveys, chatbots
- Разница между event:// и metric-event-event://
- ⚠️ **ВАЖНО**: Не использовать без явной ссылки на инструкцию

### Платежи

**Файл**: `017-payments.md`

- runAttemptPayment() — создание платежа
- getSavedCards() — сохранённые карты
- attemptAutoCharge() — автосписание
- Подписки и реккурентные платежи
- Callback функции

### Стандарты кодирования

**Файл**: `001-standards.md`

- TailwindCSS 3.4.16
- FontAwesome 6.7.2
- Форматирование (2 пробела)
- Организация файлов
- Частые ошибки

---

## 📖 Дополнительная документация

### Внешние SDK и API (E-серия)

| Файл                           | Тема                            | Ключевые слова                                                                                 |
| ------------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| **E01-gc-sdk.md**              | GetCourse SDK                   | GetCourse, SDK, тренинги, уроки, пользователи, заказы, группы, баланс, методы API              |
| **E02-gc-analytics-legacy.md** | ⚠️ GetCourse аналитика (старая) | УСТАРЕЛО! См. 016-analytics-getcourse.md                                                       |
| **E03-amocrm.md**              | AmoCRM интеграция               | AmoCRM, Kommo, CRM, OAuth, сделки, контакты, компании, воронки, неразобранное, вебхуки, задачи |
| **E04-notion.md**              | Notion интеграция               | Notion, страницы, базы данных, блоки, комментарии, вебхуки, Data Source, properties            |

---

## 🎯 Типичные задачи

### Создать новую страницу

1. Изучите `002-routing.md` → "Чек-лист создания новой страницы"
2. Изучите `007-vue.md` → "Создание Vue компонента"
3. Изучите `007-vue.md` → "🚨 КРИТИЧЕСКОЕ ПРАВИЛО: Клиент vs Сервер"
4. Изучите `006-arch.md` → "Организация файлов"

### Создать API endpoint

1. Изучите `002-routing.md` → "Чек-лист создания API роута"
2. Изучите `003-auth.md` → "Проверка авторизации в API"
3. Изучите `006-arch.md` → "API роуты в /api/"
4. Изучите `008-heap.md` → "CRUD операции" (если работаете с БД)

### Загрузить данные в Vue компоненте

1. Изучите `007-vue.md` → "🚨 КРИТИЧЕСКОЕ ПРАВИЛО: Клиент vs Сервер"
2. Изучите `007-vue.md` → "Загрузка данных (ПРАВИЛЬНЫЕ ПАТТЕРНЫ)"
3. Изучите `007-vue.md` → "Рендеринг на сервере (SSR)"
4. **ВАЖНО**: Heap таблицы НЕ работают на клиенте - используйте SSR или fetch()

### Сделать запрос к внешнему API

1. Изучите `004-request.md` → "Базовое использование"
2. Изучите `004-request.md` → "Обработка ошибок"

### Запланировать задачу

1. Изучите `005-jobs.md` → "Определение задачи"
2. Изучите `005-jobs.md` → "Планирование выполнения"

### Защитить страницу авторизацией

1. Изучите `003-auth.md` → "Методы авторизации"
2. Изучите `002-routing.md` → "Использование в роутах"

### Работать с базой данных

1. Изучите `008-heap.md` → "Создание таблицы" (JSON-таблицы)
2. Изучите `022-getcourse-heap.md` → "Базовый синтаксис Heap.Table()" (TypeScript API)
3. Изучите `008-heap.md` → "CRUD операции"
4. Изучите `008-heap.md` → "Фильтрация и поиск"
5. ⚠️ **ВАЖНО**: Изучите `008-heap.md` → "Предотвращение race condition" — при работе с параллельными запросами используйте `runWithExclusiveLock`

### Загрузить и сохранить файлы

1. Изучите `009-files.md` → "Загрузка файлов с клиента"
2. Изучите `009-files.md` → "Хранение файлов в таблицах"
3. Изучите `008-heap.md` → "Типы файлов в Heap"

### Работать с GetCourse

1. Изучите `E01-gc-sdk.md` → "GetCourse SDK методы"
2. Изучите `016-analytics-getcourse.md` → "Аналитика и события"
3. Изучите `016-analytics-getcourse.md` → "SQL запросы и gcQueryAi"

### Интегрировать AmoCRM

1. Изучите `E03-amocrm.md` → "Авторизация OAuth 2.0"
2. Изучите `E03-amocrm.md` → "Сделки и контакты"
3. Изучите `E03-amocrm.md` → "Вебхуки и неразобранное"
4. Изучите `004-request.md` → "@app/request для API запросов"

### Интегрировать Notion

1. Изучите `E04-notion.md` → "Авторизация и токены"
2. Изучите `E04-notion.md` → "Страницы и базы данных"
3. Изучите `E04-notion.md` → "Блоки и контент"
4. Изучите `E04-notion.md` → "Вебхуки"

### Создать AI-агента или инструмент (tool)

1. **Подключите 010-agents.md в контекст** — при любой задаче про тулы, инструменты агента или каталог `tools/`.
2. Изучите `010-agents.md` → "Быстрый старт: Telegram агент"
3. Изучите `010-agents.md` → "Создание агента"
4. Изучите `010-agents.md` → "Создание инструментов" и **"Паттерны и антипаттерны при создании инструмента"**
5. Изучите `010-agents.md` → "Регистрация инструмента"
6. Изучите `010-agents.md` → "Отправка сообщений"

### Добавить мультиязычность

1. Изучите `011-i18n.md` → "Создание YAML файлов"
2. Изучите `011-i18n.md` → "Использование ctx.t()"
3. Изучите `011-i18n.md` → "Плюралы и формы слов"
4. Изучите `011-i18n.md` → "Переключение языка"

### Отправить сообщение в мессенджер

1. Изучите `012-sender.md` → "Работа с каналами"
2. Изучите `012-sender.md` → "Отправка сообщений"
3. Изучите `012-sender.md` → "Подписка на обновления"

### Реализовать чат с фидом или омниканальный чат (веб + Telegram)

1. Изучите `019-feed.md` → "Основные концепции" и "Работа с фидами"
2. Изучите `019-feed.md` → "getChat" и "HTTP-обработчики для чата"
3. Изучите `019-feed.md` → "Внешние ID и омниканальность", "Связь с @sender"
4. При интеграции с Telegram — `012-sender.md` и привязка external*id / origin*\* к сообщениям фида

### Добавить real-time обновления

1. Изучите `014-socket.md` → "Серверная часть"
2. Изучите `014-socket.md` → "Клиентская часть"
3. Изучите `014-socket.md` → "Практические примеры"

### Принять платёж

1. Изучите `017-payments.md` → "Создание платежа"
2. Изучите `017-payments.md` → "Callback функции"
3. Изучите `017-payments.md` → "Обработка ошибок"

### Настроить автосписание

1. Изучите `017-payments.md` → "Работа с сохранёнными картами"
2. Изучите `017-payments.md` → "Реккурентные платежи"
3. Изучите `005-jobs.md` → "Планирование выполнения"

### Записать событие workspace

1. Изучите `016-analytics-workspace.md` → "Запись событий"
2. Изучите `016-analytics-workspace.md` → "Регистрация типов событий"
3. Изучите `016-analytics-workspace.md` → "Хук @start/after-event-write"

### Анализировать трафик

1. Изучите `016-analytics-traffic.md` → "Выполнение запросов queryAi"
2. Изучите `016-analytics-traffic.md` → "Типы событий трафика"
3. Изучите `016-analytics-traffic.md` → "SQL примеры запросов"

### Работать с ClickHouse (аналитическая БД)

1. Изучите `049-clickhouse.md` → "Основные концепции" и "Доступные таблицы"
2. Изучите `049-clickhouse.md` → "Запись событий" (writeMetricEvent / writeWorkspaceEvent / captureCustomerEvent)
3. Изучите `049-clickhouse.md` → "Структура access_log" и другие таблицы
4. Изучите `049-clickhouse.md` → "Расходы на рекламу и сквозная аналитика" (CAC/ROAS)
5. ⚠️ Изучите `049-clickhouse.md` → "Частые ошибки" и "Чек-лист при добавлении аналитического события"

### Анализировать GetCourse

1. Изучите `016-analytics-getcourse.md` → "Выполнение запросов gcQueryAi"
2. Изучите `016-analytics-getcourse.md` → "События GetCourse"
3. Изучите `016-analytics-getcourse.md` → "resolved_user_id vs user_id"

### Подписаться на события GetCourse (⚠️ ТОЛЬКО Chatium на стороне GetCourse)

1. Изучите `021-getcourse-events.md` → "Подписка на metric-события"
2. Изучите `021-getcourse-events.md` → "Типы хуков и когда что использовать"
3. Изучите `021-getcourse-events.md` → "Прямые событийные хуки"
4. Изучите `021-getcourse-events.md` → "Рекомендуемый паттерн интеграции"
5. ⚠️ **ВАЖНО**: Используйте только при явной ссылке на инструкцию

### Подписаться на события (общая аналитика)

1. Изучите `016-analytics-subscriptions.md` → "subscribeToMetricEvents"
2. Изучите `016-analytics-subscriptions.md` → "Events Subscribe проект"
3. Изучите `016-analytics-subscriptions.md` → "WebSocket мониторинг"

### Связать анонимных пользователей с GetCourse

1. Изучите `016-analytics-attribution.md` → "Цепочка событий"
2. Изучите `016-analytics-attribution.md` → "Архитектура: две таблицы"
3. Изучите `016-analytics-attribution.md` → "API для получения параметров"
4. Изучите `016-analytics-attribution.md` → "Примеры использования"

### Создать пагинацию для событий

1. Изучите `016-analytics-workspace.md` → "Чтение событий с пагинацией"
2. Изучите `016-analytics-workspace.md` → "Единый API endpoint /api/events"
3. Изучите `016-analytics-workspace.md` → "Важные детали реализации"
4. Изучите `016-analytics-workspace.md` → "Типичные ошибки и решения"

### ⚠️ Создать unit тесты для проекта

1. Изучите `020-testing.md` → "Создание системы тестирования"
2. Изучите `020-testing.md` → "Единый источник истины"
3. Изучите `020-testing.md` → "Тесты API (внутренние и HTTP)"
4. Изучите `020-testing.md` → "Unit-AI: Автоматическое тестирование"
5. Изучите `020-testing.md` → "Требования к покрытию"
6. Если добавляете тесты — используйте структуру и правила из `020-testing.md`

---

## ⚡ Ключевые слова для поиска

### Роутинг

`app.get`, `app.post`, `app.html`, `route.url()`, `withProjectRoot`, `ctx`, `req`, `params`, `query`, `body`, `file-based`, `тильда`, `слеш`, `:id`, `/:slug`

### Авторизация

`requireAccountRole`, `requireRealUser`, `requireAnyUser`, `ctx.user`, `Admin`, `Staff`, `User`, `роли`, `права`

### HTTP клиент

`request`, `@app/request`, `GET`, `POST`, `headers`, `Authorization`, `Bearer`, `responseType`, `throwHttpErrors`

### Задачи

`app.job`, `scheduleJobAfter`, `scheduleJobAsap`, `scheduleJobAt`, `cancelScheduledJob`, `minutes`, `hours`, `days`

### Архитектура

`структура`, `/web/`, `/api/`, `/pages/`, `/tables/`, `/docs/`, `index.tsx`, `// @shared`, `// @shared-route`, `именование`, `один файл = один роут`

### Vue

`<script setup>`, `ref`, `reactive`, `computed`, `onMounted`, `ctx`, `route.url()`, `withProjectRoot`, `SSR`, `fetch()`, `клиент vs сервер`, `Heap таблицы`, `props`, `initialData`, `tsconfig.json`, `extends`, `jsx preserve`, `Module '"vue"' has no exported member`, `$event` (не `e` в инлайне), inline-шаблон без TypeScript `as`/`satisfies`, `Unexpected token`

### База данных

`Heap.Table`, `create`, `findAll`, `findById`, `update`, `updateAll`, `delete`, `deleteAll`, `createOrUpdateBy`, `countBy`, `searchBy`, `Money`, `RefLink`, `where`, `order`, `CAS`, `оптимистичная блокировка`, `mass-delete protection`, `limit`, `формат id`, `Heap.String`, `Heap.Number`, `Heap.Boolean`, `Heap.DateTime`, `Heap.Optional`, `Heap.Any`, `customMeta`, `searchable`, `embeddings`, `defaultValue`, `типизация`, `TypeScript таблицы`, `runWithExclusiveLock`, `race condition`, `блокировка`, `параллельные запросы`, `атомарность`

### Файлы

`obtainStorageFilePutUrl`, `getThumbnailUrl`, `getVideoInfo`, `hash`, `upload`, `FormData`, `ImageFile`, `VideoFile`

### GetCourse SDK

`getAvailableTrainings`, `getUserTrainings`, `getDealInfo`, `createDeal`, `updateUserFields`, `addUserToGroup`, `getBalance`, `isUserInSegment`

### GetCourse Аналитика

`gcQueryAi`, `ClickHouse`, `access_log`, `dealCreated`, `dealPaid`, `user/created`, `resolved_user_id`, `SQL`, `события`, `30 типов`, `воронки`, `LTV`, `когорты`

### Traffic Аналитика

`queryAi`, `@traffic/sdk`, `pageview`, `button_click`, `video_play`, `scroll`, `add_to_cart`, `purchase`, `DAU`, `MAU`, `bounce rate`, `21 тип`

### ClickHouse (аналитическая БД)

`ClickHouse`, `chatium_ai.access_log`, `behaviour2_log`, `traffic_source_statistics`, `account_logs`, `writeMetricEvent`, `MetricEventData`, `writeWorkspaceEvent`, `captureCustomerEvent`, `@crm/sdk/v2`, `CaptureCustomerEventInput`, `getCustomerEventUrl`, `ctx.account.log`, `LogParams`, `queryAi`, `queryAccountLogs`, `listAccountLogs`, `UgcAccountLogRow`, `getAccountEvents`, `getWorkspaceEvents`, `EventDeclaration`, `payloadMapping`, `matched_traffic_source_ids`, `CAC`, `ROAS`, `сквозная аналитика`, `action_param8_float`, `ContactType`, `resolved_user_id`, `нет DDL`, `нет INSERT`

### Подписки на события

`subscribeToMetricEvents`, `unsubscribeFromMetricEvents`, `metric-event`, `Heap подписки`, `WebSocket`, `sendDataToSocket`, `real-time`, `Events Subscribe`, `мониторинг`

### Подписка на события GetCourse (⚠️ ТОЛЬКО Chatium на стороне GetCourse)

`subscribeToMetricEvents`, `app.accountHook`, `app.pluginHook`, `metric-event-event://getcourse`, `event://getcourse`, `transformGcEventParams`, `lesson answers`, `conversation/addedMessage`, `dealCreated`, `dealPaid`, `contact/created`, `form/sent`, `survey/answerCreated`, `chatbot/vk_enabled`, `chatbot/telegram_enabled`, `LessonAnswerEvent`, `ConversationAddedMessageEvent`, `realtime события GetCourse`, `⚠️ ТОЛЬКО Chatium на стороне GetCourse`

### Атрибуция пользователей

`атрибуция`, `uid`, `user_id`, `маппинг`, `first-touch`, `last-touch`, `attribution`, `form/sent`, `session_id`, `AnalyticsUidMappings`, `AnalyticsSessionAttribution`, `parseUrlParams`, `utm_source`, `utm_campaign`, `промокоды`, `GetCourse регистрация`, `isFirst`, `isLast`, `gcQueryAi`

### AmoCRM

`AmoCRM`, `OAuth 2.0`, `leads`, `contacts`, `companies`, `pipelines`, `unsorted`, `webhooks`, `tasks`, `access_token`, `refresh_token`

### Notion

`Notion`, `Page`, `Block`, `Database`, `Data Source`, `properties`, `rich_text`, `query`, `filter`, `comments`, `webhooks`

### AI-агенты

`AI`, `агенты`, `боты`, `getOrCreateAgentForWorkspace`, `pushMessageToChain`, `startCompletion`, `tools`, `инструменты`, `chainKey`, `wakeAgent`, `Telegram`

### Интернационализация

`i18n`, `переводы`, `ctx.t()`, `ctx.lang`, `мультиязычность`, `lang.yml`, `YAML`, `плюралы`, `формы слов`, `language`, `локализация`

### Модуль @sender

`мессенджеры`, `чаты`, `Telegram`, `VK`, `Email`, `sendMessageToChat`, `findPersons`, `getChannels`, `Person`, `теги`, `бакеты`, `runTelegramApi`, `sendMessageToUser`

### Модуль @app/feed

`фиды`, `лента сообщений`, `чат`, `createFeedMessage`, `getChat`, `external_id`, `origin_id`, `origin_type`, `омниканальность`, `Participant`, `inbox`, `getInboxInfo`, `findMessagesByExternalId`, `Feed`

### Модули @app (документация по типингам)

`025-app-modules`, `@app/inbox`, `getInboxData`, `updateInbox`, `resetInboxBadge`, `@app/users`, `updateUser`, `@app/storage`, `obtainStorageFilePutUrl`, `getThumbnailUrl`, `@app/sync`, `runWithExclusiveLock`, `@app/account`, `@app/errors`, `@app/security`, `@app/ugc`, `@app/app`, `@app/hooks`, `@app/html-jsx`, `@app/html`, `@app/form-storage`, `@app/iap`, `@app/metric`, `@app/mobile-app`, `@app/responsive`, `@app/schema`, `@app/solid-js`, `@app/types`, `@app/ui`, `@app/nanoid`, `@app/isolated-eval`, `index.d.ts`

### Конфигурация

`config.json`, `readWorkspaceFile`, `updateWorkspaceFile`, `настройки`, `конфигурация`, `settings`

### WebSocket

`WebSocket`, `real-time`, `socket`, `sendDataToSocket`, `getOrCreateBrowserSocketClient`, `subscribeToData`, `обновления`, `прогресс`, `live`

### Уведомления

`уведомления`, `sendNotificationToAccountOwners`, `@user-notifier/sdk`, `админы`, `HTML`, `Markdown`, `заявки`

### Аналитика workspace

`аналитика`, `события workspace`, `writeWorkspaceEvent`, `getWorkspaceEventUrl`, `@start/after-event-write`, `UTM метки`, `clrtTrack`, `clrtUid`, `tracking`, `метрики`, `пагинация`, `pagination`, `/api/events`, `mode='list'`, `mode='poll'`, `maxTimestamp`, `OFFSET`, `дедупликация`, `deduplicateEvents`

### Платежи

`платежи`, `runAttemptPayment`, `attemptAutoCharge`, `getSavedCards`, `@pay/sdk`, `подписки`, `автосписание`, `реккурентные`, `чек`, `items`

### Стандарты кодирования

`стандарты`, `TailwindCSS`, `FontAwesome`, `форматирование`, `best practices`, `JSX`, `TypeScript`, `стили`

---

## 🚀 Быстрый старт

### Для начинающих

1. **Стандарты**: Начните с `001-standards.md` для понимания подхода
2. **Роутинг**: Прочитайте `002-routing.md` для создания страниц и API
3. **Vue компоненты**: Изучите `007-vue.md` для работы с интерфейсом
4. **Безопасность**: Ознакомьтесь с `003-auth.md` для защиты роутов

### Для интеграций

- **GetCourse**: `E01-gc-sdk.md` + `E02-gc-analytics.md`
- **AmoCRM**: `E03-amocrm.md`
- **Notion**: `E04-notion.md`

---

## 📝 Важные замечания

- ✅ Используйте `ctx.account.log()` вместо `console.log()`
- ✅ Всегда импортируйте методы авторизации из `@app/auth`
- ✅ Используйте `withProjectRoot(route.url())` вместо хардкода путей
- ✅ Следуйте file-based архитектуре (/ для папок, ~ для явных путей)
- ✅ Один файл = один роут
- ✅ Храните Vue компоненты в `/pages/`
- ✅ Храните API роуты в `/api/`
- 🚨 **КРИТИЧЕСКИ ВАЖНО**: В Vue компонентах (клиент) **НЕЛЬЗЯ** импортировать Heap таблицы - Heap таблицы работают только на сервере!
- 🚨 **КРИТИЧЕСКИ ВАЖНО**: Используйте SSR (загрузка данных на сервере → props) или `fetch()` для HTTP запросов на клиенте
- 🚨 **КРИТИЧЕСКИ ВАЖНО**: Heap таблицы доступны **ТОЛЬКО НА СЕРВЕРЕ** (.tsx файлы)
- ❌ **НИКОГДА**: Не используйте `alert()` для отображения результатов операций - создавайте UI компоненты для уведомлений (success/error сообщения)
- ⚠️ `confirm()` допустим только для простых подтверждений действий (удаление, сброс)
- ⚠️ **ОБЯЗАТЕЛЬНО**: Тестируйте API двумя способами: `route.run()` и HTTP `request()`
- ⚠️ **ОБЯЗАТЕЛЬНО**: Поддерживайте покрытие тестами минимум 80%
- ⚠️ **ОБЯЗАТЕЛЬНО**: Обновляйте тесты при каждом изменении кода
- ⚠️ **Vue модули**: Требуют локальный `tsconfig.json` с `"extends": "путь/к/корню/tsconfig.json"` — при переносе модуля обновите путь (см. `007-vue.md`)
- ⚠️ **Race condition**: При работе с БД следите за возможностью race condition при параллельных запросах. Если между `findOneBy` и `createOrUpdateBy` может произойти другой запрос — используйте `runWithExclusiveLock` из `@app/sync` (см. `008-heap.md` → "Предотвращение race condition")
- ⚠️ **Инструменты агента (tools)**: При создании или изменении любого тула (файлы в `tools/`, workspace tool, инструмент агента) **обязательно подключайте в контекст 010-agents.md** и сверяйтесь с разделами «Создание инструментов», «Регистрация инструмента» и «Паттерны и антипаттерны при создании инструмента». Без этого легко допустить ошибки: тул не регистрируется, неверный формат ответа, ручная JSON Schema вместо `.body()`.

## 🔄 История миграции документации

Все устаревшие файлы были **удалены** и заменены структурированной документацией:

**Базовая документация** (✅ удалена):

- ~~000-Index.md~~ → Вся информация распределена по специализированным файлам 001-018

**GetCourse** (✅ удалены):

- ~~001-gc-analytics.md~~ → **E02-gc-analytics.md**
- ~~010-GetcourseAnalytics.md~~ → **E02-gc-analytics.md**
- ~~014-Traffic.md~~ → **E02-gc-analytics.md**

**AmoCRM** (✅ удалены):

- Документы по тегу `amocrm` → **E03-amocrm.md**

**Notion** (✅ удалены):

- ~~notion-api.md~~ → **E04-notion.md**
- ~~notion-about.md~~ → **E04-notion.md**

**AI-агенты** (✅ удалены):

- ~~003-SimleAgentTelegram.md~~ → **010-agents.md**
- ~~004-AgentProcess.md~~ → **010-agents.md**
- ~~005-AiGeneration.md~~ → **010-agents.md**
- ~~006-AiGenerationTool.md~~ → **010-agents.md**
- ~~018-CreateAgent.md~~ → **010-agents.md**

**Jobs и файлы** (✅ удалены):

- ~~011-Jobs.md~~ → **005-jobs.md**
- ~~008-FilestorageUpload.md~~ → **009-files.md**
- ~~009-GetcourseFormScript.md~~ → **007-vue.md** (раздел "Интеграция внешних скриптов")

**Интернационализация** (✅ удалена):

- ~~019-i18n.md~~ → **011-i18n.md**

**Sender и мессенджеры** (✅ удалены):

- ~~012-SenderUserByTelegramUsername.md~~ → **012-sender.md**
- ~~017-SenderFullDocs.md~~ → **012-sender.md**

**Видео** (✅ удалены):

- ~~015-Videoplayer.md~~ → **009-files.md** (раздел "Встраивание видеоплеера")
- ~~016-kinescope.md~~ → **009-files.md** (раздел "Интеграция Kinescope")

**Конфигурация** (✅ удалена):

- ~~007-Config.md~~ → **013-config.md**

**WebSocket** (✅ удален):

- ~~013-Socket.md~~ → **014-socket.md**

**Итого удалено**: 27 устаревших файлов (включая 000-Index.md)  
**Создано**: 21 файл (001-017 + E01-E04)  
**Обновлено**: Аналитика разделена на 4 специализированных файла (016-analytics-\*)

Все файлы являются **единственными источниками истины** для своих тем.

---

**Версия**: 3.6  
**Дата**: 2026-07-18  
**Последнее обновление**: Runtime-верификация из `qna1807/*-corrected.md` — обновлены `049-clickhouse.md`, `038-metric.md`, `016-analytics-traffic/workspace/subscriptions.md`. Ключевые runtime-факты: `queryAccountLogs`/`listAccountLogs` (`@app/ugc`) НЕ работают (чтение account_logs — через `queryAi`); хук `@start/after-event-write` не системный (не вызывается автоматически); `writeEventLog`/`writeAppHostEventLog` — deprecated noop; `getAccountEvents.type` в runtime `undefined`; типы метрик — type-only

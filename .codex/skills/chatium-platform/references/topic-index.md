# Chatium Topic Index

Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-*`. These files are quick topic guides. `inner/docs/` remains authoritative; use CodeGraph to confirm live code patterns before editing.

| Topic | Use for | Authoritative docs |
| --- | --- | --- |
| [`chatium-account`](topics/chatium-account.md) | Модуль @app/account в Chatium — настройки аккаунта, seats, баланс токенов, installApp. Использовать для управления аккаунтом UGC. | `inner/docs/025-app-modules.md; inner/docs/029-account.md` |
| [`chatium-agents`](topics/chatium-agents.md) | AI-агенты в Chatium — getOrCreateAgentForWorkspace, pushMessageToChain, startCompletion. Использовать при создании агента и чата с ним (инструменты — см. chatium-agent-tool). | `inner/docs/010-agents.md` |
| [`chatium-agent-tool`](topics/chatium-agent-tool.md) | Создаёт инструмент (tool) для AI-агента Chatium — app.function, meta, body, handle, регистрация через хук. Использовать при добавлении новых инструментов агента. | `inner/docs/010-agents.md` |
| [`chatium-amocrm`](topics/chatium-amocrm.md) | Интеграция AmoCRM (Kommo) в Chatium — OAuth 2.0, сделки, контакты, компании, воронки, вебхуки. Использовать с @app/request для API-запросов. | `inner/docs/E03-amocrm.md` |
| [`chatium-analytics-attribution`](topics/chatium-analytics-attribution.md) | Атрибуция пользователей в Chatium — связка uid с user_id, first-touch/last-touch, AnalyticsUidMappings, parseUrlParams. Использовать для маппинга анонимных посетителей к GetCourse user_id. | `inner/docs/016-analytics-attribution.md` |
| [`chatium-analytics-getcourse`](topics/chatium-analytics-getcourse.md) | Аналитика GetCourse в Chatium — gcQueryAi, события GetCourse (dealCreated, dealPaid, user/created), SQL к ClickHouse. Использовать для воронок, LTV, когорт. | `inner/docs/016-analytics-getcourse.md` |
| [`chatium-analytics-subscriptions`](topics/chatium-analytics-subscriptions.md) | Подписки на события в Chatium — subscribeToMetricEvents, metric-event хук, Heap-подписки, WebSocket. Использовать для real-time получения событий (GetCourse и др.). | `inner/docs/016-analytics-subscriptions.md` |
| [`chatium-analytics-traffic`](topics/chatium-analytics-traffic.md) | Аналитика трафика в Chatium — queryAi, события из access_log, pageview, клики, видео. Использовать для анализа поведения пользователей на сайте через ClickHouse. | `inner/docs/016-analytics-traffic.md` |
| [`chatium-analytics-workspace`](topics/chatium-analytics-workspace.md) | События workspace в Chatium — writeWorkspaceEvent, регистрация типов, хук @start/after-event-write, UTM. Использовать для записи конверсионных и пользовательских событий. | `inner/docs/016-analytics-workspace.md` |
| [`chatium-api-endpoint`](topics/chatium-api-endpoint.md) | chatium-api-endpoint | `inner/docs/002-routing.md; inner/docs/041-schema.md` |
| [`chatium-app-calls`](topics/chatium-app-calls.md) | Вызовы между приложениями в Chatium — runAppFunction, runInterAppCall из @app/app. Использовать для межприложенных и внутренних вызовов по пути. | `inner/docs/025-app-modules.md` |
| [`chatium-auth`](topics/chatium-auth.md) | chatium-auth | `inner/docs/003-auth.md` |
| [`chatium-config`](topics/chatium-config.md) | Конфигурация workspace в Chatium — readWorkspaceFile, updateWorkspaceFile, config.json. Использовать для настроек приложения. | `inner/docs/013-config.md` |
| [`chatium-docs-project`](topics/chatium-docs-project.md) | chatium-docs-project | `inner/docs/024-project-docs.md` |
| [`chatium-errors`](topics/chatium-errors.md) | Типы ошибок в Chatium — NotFoundError, AccessDeniedError, ValidationError, CustomError из @app/errors. Использовать для единообразных ответов API. | `inner/docs/030-errors.md` |
| [`chatium-feed`](topics/chatium-feed.md) | chatium-feed | `inner/docs/019-feed.md; inner/docs/025-inbox.md` |
| [`chatium-form-storage`](topics/chatium-form-storage.md) | Модуль @app/form-storage в Chatium — setItem, getItem, addToSet, listSet. Использовать для черновиков и временных данных форм. | `inner/docs/036-form-storage.md` |
| [`chatium-getcourse-events`](topics/chatium-getcourse-events.md) | Подписка на события GetCourse в Chatium — subscribeToMetricEvents, metric-event хуки. Только для Chatium на стороне GetCourse. | `inner/docs/021-getcourse-events.md` |
| [`chatium-heap-table`](topics/chatium-heap-table.md) | Создаёт Heap-таблицу в Chatium — определение в tables/, типизация, CRUD-операции, фильтрация, Money, RefLink. Использовать при добавлении новых сущностей данных. | `inner/docs/008-heap.md; inner/docs/022-getcourse-heap.md` |
| [`chatium-hooks`](topics/chatium-hooks.md) | Модуль @app/hooks в Chatium — runHook, execHook, выполнение кастомных хуков по имени. Использовать для вызова зарегистрированных хуков из кода. | `inner/docs/034-hooks.md` |
| [`chatium-html-jsx`](topics/chatium-html-jsx.md) | Модули @app/html-jsx и @app/html в Chatium — jsx, renderHtml, portal, бандлы. Использовать для серверных роутов и тестов без Vue. | `inner/docs/035-html-jsx.md` |
| [`chatium-i18n`](topics/chatium-i18n.md) | Интернационализация в Chatium — ctx.t(), ctx.lang, YAML-файлы переводов, плюралы. Использовать при мультиязычных приложениях. | `inner/docs/011-i18n.md` |
| [`chatium-iap`](topics/chatium-iap.md) | In-App Purchases в Chatium — hasPurchasedProduct, getIapExpirationDateByUser, findAllIapsByUser из @app/iap. Использовать для проверки покупок и подписок. | `inner/docs/037-iap.md` |
| [`chatium-inbox`](topics/chatium-inbox.md) | Модуль @app/inbox в Chatium — getInboxData, updateInbox, resetInboxBadge. Использовать для ленты инбокса и пуш-уведомлений (в т.ч. без фида). | `inner/docs/025-inbox.md` |
| [`chatium-isolated-eval`](topics/chatium-isolated-eval.md) | Модуль @app/isolated-eval в Chatium — isolatedEval для безопасного выполнения кода в изоляции. Использовать с осторожностью для конфигурируемого кода. | `inner/docs/046-isolated-eval.md` |
| [`chatium-jobs`](topics/chatium-jobs.md) | Отложенные задачи в Chatium — app.job(), scheduleJobAfter, scheduleJobAsap, scheduleJobAt, cancelScheduledJob. Использовать при планировании выполнения кода с задержкой или на время. | `inner/docs/005-jobs.md` |
| [`chatium-metric`](topics/chatium-metric.md) | Модуль @app/metric в Chatium — writeMetricEvent, writeAccessLog, subscribeToMetricEvents. Использовать для низкоуровневых метрик и подписки на события. | `inner/docs/038-metric.md` |
| [`chatium-mobile-app`](topics/chatium-mobile-app.md) | Модуль @app/mobile-app в Chatium — getMobileAppLink, generateMobileAppRunActionUrlPath. Использовать для ссылок на мобильное приложение. | `inner/docs/039-mobile-app.md` |
| [`chatium-nanoid`](topics/chatium-nanoid.md) | Модуль @app/nanoid в Chatium — accountNanoid, nanoid для генерации уникальных ID. Использовать для сущностей, токенов, ключей. | `inner/docs/045-nanoid.md` |
| [`chatium-notifications`](topics/chatium-notifications.md) | Уведомления администраторов в Chatium — sendNotificationToAccountOwners из @user-notifier/sdk. Использовать для оповещения владельцев аккаунта. | `inner/docs/015-notifications.md` |
| [`chatium-notion`](topics/chatium-notion.md) | Интеграция Notion в Chatium — авторизация, страницы, блоки, базы данных, вебхуки. Использовать с @app/request для Notion API. | `inner/docs/E04-notion.md` |
| [`chatium-payments`](topics/chatium-payments.md) | chatium-payments | `inner/docs/017-payments.md` |
| [`chatium-preloader`](topics/chatium-preloader.md) | Прелоадер приложения в Chatium — встраивание в HTML до загрузки Vue, типы (спиннер, boot sequence, skeleton). Использовать для устранения белого экрана и FOUC. | `inner/docs/018-preloader.md` |
| [`chatium-realtime`](topics/chatium-realtime.md) | chatium-realtime | `inner/docs/014-socket.md` |
| [`chatium-request`](topics/chatium-request.md) | HTTP-клиент к внешним API в Chatium — request() из @app/request, GET/POST/PUT/DELETE, headers, обработка ошибок. Использовать при интеграции с внешними API. | `inner/docs/004-request.md` |
| [`chatium-responsive`](topics/chatium-responsive.md) | Модуль @app/responsive в Chatium — responsiveState для адаптивной вёрстки. Использовать для breakpoints и состояния экрана. | `inner/docs/040-responsive.md` |
| [`chatium-scaffold`](topics/chatium-scaffold.md) | chatium-scaffold | `inner/docs/006-arch.md; inner/docs/024-project-docs.md` |
| [`chatium-schema`](topics/chatium-schema.md) | Модуль @app/schema в Chatium — ZType, s, схемы Heap и валидация. Использовать для валидации body/параметров и типов Heap. | `inner/docs/041-schema.md` |
| [`chatium-security`](topics/chatium-security.md) | CSRF в Chatium — generateDynamicCsrfToken, verifyDynamicCsrfToken из @app/security. Использовать для защиты запросов с клиента. | `inner/docs/031-security.md` |
| [`chatium-sender`](topics/chatium-sender.md) | Модуль @sender в Chatium — каналы, чаты, Person, sendMessageToChat, теги, хуки входящих сообщений. Использовать при работе с мессенджерами (Telegram, VK, Email). | `inner/docs/012-sender.md` |
| [`chatium-shared-imports`](topics/chatium-shared-imports.md) | Клиентский бандл Chatium — метка // @shared, запрет импорта lib/repos/tables из Vue; вынос констант в shared/. Использовать при правках pages/*.vue, компонентов админки, форм с ключами настроек. | `inner/docs/007-vue.md; inner/docs/001-standards.md` |
| [`chatium-solid-js`](topics/chatium-solid-js.md) | Модуль @app/solid-js в Chatium — Solid.js, createSignal, createEffect, JSX. Использовать при компонентах на Solid (в т.ч. через html-jsx). | `inner/docs/042-solid-js.md` |
| [`chatium-starter-kit`](topics/chatium-starter-kit.md) | chatium-starter-kit | `inner/docs/006-arch.md; inner/docs/024-project-docs.md` |
| [`chatium-storage`](topics/chatium-storage.md) | Файлы и хранилище в Chatium — obtainStorageFilePutUrl, getThumbnailUrl, загрузка с клиента, типы ImageFile/VideoFile. Использовать при загрузке и отображении файлов. | `inner/docs/027-storage.md; inner/docs/009-files.md` |
| [`chatium-sync`](topics/chatium-sync.md) | Эксклюзивные блокировки в Chatium — runWithExclusiveLock, tryRunWithExclusiveLock из @app/sync. Использовать для предотвращения race condition при параллельных операциях. | `inner/docs/028-sync.md` |
| [`chatium-telegram`](topics/chatium-telegram.md) | Интеграция Chatium с Telegram — Web App с авторизацией, хуки для обработки сообщений, отправка через @sender или напрямую. Использовать при работе с Telegram. | `inner/docs/012-sender.md; inner/docs/010-agents.md` |
| [`chatium-testing`](topics/chatium-testing.md) | chatium-testing | `inner/docs/020-testing.md` |
| [`chatium-ugc`](topics/chatium-ugc.md) | Модуль @app/ugc в Chatium — UGC-файлы, findUgcFile, updateUgcFileSource, права на файлы. Использовать для работы с кодом приложения и правами доступа. | `inner/docs/032-ugc.md` |
| [`chatium-vue-page`](topics/chatium-vue-page.md) | chatium-vue-page | `inner/docs/007-vue.md; inner/docs/002-routing.md` |

# Spec-as-source: `p/units/aley/bpm/interfaces/max`

Статус: источник истины для проекта.  
Последнее обновление: 2026-06-19.
Область действия: весь каталог `p/units/aley/bpm/interfaces/max`.

Этот файл описывает требуемое состояние проекта целиком: продуктовую роль модуля, маршруты, страницы, API, данные, логи, тесты, UI-поведение, права доступа и правила эволюции. Если код, README, ADR или старые документы расходятся с этой спецификацией, приоритет у этого файла. Контракты и ошибки встроены сюда, потому что текущий объем не требует отдельных файлов.

Спецификация намеренно покрывает проект с избытком: кроме публичного поведения она фиксирует внутренние helper-ы, composable-слои, презентационные компоненты, тестовые раннеры и известные платформенные допущения. Это нужно, чтобы проект можно было поддерживать без обратного восстановления правил из кода.

## 0. Правило предварительной спецификации

Редактировать код проекта запрещено, если требуемое изменение еще не описано в этой спецификации.

Перед любым изменением runtime-кода, UI, API, данных, прав, тестов, маршрутов, логирования или структуры нужно сначала обновить этот файл так, чтобы новое поведение, контракт и критерии проверки были явно зафиксированы. Только после этого можно менять код.

Если во время реализации обнаружено, что нужен дополнительный кодовый шаг, не покрытый текущей спецификацией, работу с кодом нужно остановить, дописать спецификацию и только затем продолжить реализацию. Проверка или ревью должны считать кодовые изменения без предварительного описания в `docs/spec/spec.md` нарушением процесса, даже если сами изменения технически корректны.

## 1. Назначение

`p/units/aley/bpm/interfaces/max` - интерфейсный модуль BPM для первого слоя взаимодействия пользователя с системой через мессенджер MAX.

Продуктовая задача модуля: реализовать первый интерфейсный слой взаимодействия пользователя с системой. В этот слой входят прием входящих событий/сообщений от MAX-бота, регистрация фактов о входных данных в core broker, отображение web-страниц в MAX Mini Apps, прием данных из интерфейсов этих miniapp-страниц и сохранение входных пользовательских данных во внутреннем Heap в сыром виде, без бизнес-нормализации и без потери исходных полей. Сценарии, где система должна вернуть пользователю данные через MAX, моделируются через event-driven контракты core broker-а; собственная очередь доставки в этом модуле не создается.

Модуль остается интерфейсным уровнем: он валидирует технический контекст MAX, сохраняет raw payload и публикует в core broker легковесное событие со ссылкой на raw row и минимальными индексами для подписчиков. Интерпретация, маршрутизация, доменная обработка, формирование системных ответов и межмодульная доставка выполняются downstream BPM-модулями и core broker-ом. Доменная обработка и хранение бизнес-состояния не входят в ответственность этого проекта.

### 1.1 Внешний контракт MAX Bot API

Контракт приема основан на официальной документации MAX Bot API, актуальной на 2026-06-18:

- `https://dev.max.ru/docs-api` - общий раздел API;
- `https://dev.max.ru/docs-api/methods/GET/subscriptions` - список Webhook-подписок;
- `https://dev.max.ru/docs-api/methods/POST/subscriptions` - подписка Webhook;
- `https://dev.max.ru/docs-api/methods/DELETE/subscriptions` - удаление Webhook-подписки;
- `https://dev.max.ru/docs-api/methods/GET/updates` - Long Polling для разработки и тестирования;
- `https://dev.max.ru/docs-api/methods/GET/chats` - исторический метод списка чатов и его ограничение;
- `https://dev.max.ru/docs-api/methods/GET/chats/-chatId-` - получение информации о чате/канале/диалоге по `chat_id`;
- `https://dev.max.ru/docs-api/methods/GET/messages` - получение сообщений по `chat_id` или `message_ids`;
- `https://dev.max.ru/docs-api/objects/Update` - объект входящего события;
- `https://dev.max.ru/docs-api/objects/User` - пользователь/бот;
- `https://dev.max.ru/docs-api/objects/Message` - сообщение.
- `https://dev.max.ru/docs/webapps/introduction` - подключение мини-приложения;
- `https://dev.max.ru/docs/webapps/bridge` - MAX Bridge и `window.WebApp`;
- `https://dev.max.ru/docs/webapps/validation` - server-side валидация `WebApp.initData`;
- `https://dev.max.ru/help/miniapps` - требования к URL и управлению ссылкой мини-приложения;
- `https://dev.max.ru/help/deeplinks` - deep links `startapp`.

Нормативные факты MAX API для этого проекта:

- production-прием событий выполняется через Webhook; Long Polling допускается только для локальной разработки, диагностики и ручной сверки;
- при активной Webhook-подписке Long Polling не работает, поэтому проект обязан хранить явный режим приема и не пытаться использовать оба transport-а одновременно;
- подписка создается в MAX через `POST /subscriptions` с `url`, опциональным `update_types` и опциональным `secret`;
- список текущих Webhook-подписок читается через `GET /subscriptions`, удаление подписки выполняется через `DELETE /subscriptions?url=<webhook-url>`;
- MAX отправляет на Webhook-endpoint HTTPS `POST` с телом объекта `Update`;
- endpoint должен вернуть HTTP 200 в течение 30 секунд, иначе доставка считается неуспешной и MAX запускает повторы;
- если при подписке указан `secret`, MAX передает его в заголовке `X-Max-Bot-Api-Secret`, а проект обязан сверить заголовок до записи payload;
- Long Polling `GET /updates` принимает `limit` в диапазоне `1..1000`, `timeout` в диапазоне `0..90`, `marker` и `types`; ответ возвращает массив `updates` и следующий `marker`;
- если `marker` не передан или передан `null`, MAX возвращает только последнее обновление; после передачи конкретного `marker` предыдущие обновления считаются прочитанными;
- `Update.update_type` является явным типом события; известные на 2026-06-18 значения: `bot_added`, `bot_started`, `bot_stopped`, `bot_removed`, `chat_title_changed`, `dialog_cleared`, `dialog_muted`, `dialog_unmuted`, `dialog_removed`, `message_callback`, `message_created`, `message_edited`, `message_removed`, `user_added`, `user_removed`;
- `Update.timestamp` хранит Unix-время события от MAX; единица измерения не нормализуется на входе и сохраняется как получена;
- внешние идентификаторы MAX (`chat_id`, `user_id`, `message_id` и аналоги из будущих объектов) в app-owned полях, DTO и broker payload нормализуются в string, чтобы не терять точность int64 в JavaScript; исходные типы остаются только внутри raw JSON payload;
- для сообщений `Update` может содержать объект `message`, который соответствует объекту `Message` с `sender`, `recipient`, `timestamp`, `body`, `link`, `stat`, `url`;
- для пользователей в составе `Update`/`Message` используется объект `User` с `user_id`, `first_name`, `last_name`, `username`, `is_bot`, `last_activity_time`, `name`;
- начиная с июня 2026 метод `GET /chats` не поддерживается как готовый список всех групповых чатов/каналов бота; MAX рекомендует поддерживать собственное хранилище `chat_id`, получая их из Webhook-событий, а Long Polling не предназначен для получения такого списка;
- `GET /chats/{chatId}` возвращает информацию о конкретном чате, канале или диалоге по известному `chat_id`: `type`, `status`, `title`, `last_event_time`, `participants_count`, `dialog_with_user`, `messages_count` и другие поля, если бот имеет доступ;
- `GET /messages` с `chat_id` возвращает массив сообщений из указанного чата в обратном порядке, где последние сообщения идут первыми; `count` ограничен диапазоном `1..100`, default `50`, а `from`/`to` задают timestamp-границы истории;
- новые поля и новые `update_type`, которые появятся в MAX API позднее, не должны ломать прием: проект хранит исходный payload целиком.

### 1.2 Внешний контракт MAX Mini Apps

Нормативные факты MAX Mini Apps для этого проекта:

- мини-приложения работают внутри MAX и подключаются к чат-боту через URL в расширенных настройках бота;
- URL мини-приложения должен быть `https://`, валидным, без пробелов, длиной не более 1024 символов;
- опубликованное мини-приложение можно обновлять без смены ссылки, если URL остается стабильным;
- открыть мини-приложение можно через deep link `https://max.ru/<botName>?startapp=<payload>`, где `payload` необязательный и ограничен 512 символами;
- внутри клиента MAX страница получает `window.WebApp` после подключения `https://app.max.ru/sdk/max-web-app.js`;
- `window.WebApp.initData` является URL-encoded строкой для server-side валидации; `window.WebApp.initDataUnsafe` допустим только как UI-подсказка и не является доверенным источником;
- `window.WebApp.initDataUnsafe` может содержать `query_id`, `auth_date`, `hash`, `user`, `chat`, `start_param`;
- `window.WebApp.platform` принимает значения `ios`, `android`, `desktop`, `web`;
- `auth_date` должен проверяться на сервере; нормативный TTL этого проекта - настройка `max_miniapp_init_data_ttl_sec` с default `600` секунд;
- MAX Bridge может использоваться клиентскими miniapp-страницами для UX-интеграции, но серверная бизнес-валидация и передача данных в другие BPM-модули выполняются только через API этого проекта.

Проект обязан предоставлять:

- публичную главную страницу;
- публичную страницу входа;
- страницу профиля для авторизованного пользователя;
- админку для роли `Admin`;
- страницу тестов для авторизованного пользователя;
- отдельную от админской страницы оперативную панель управления MAX-модулем на главной странице для роли `Admin`;
- каталог web-страниц для MAX Mini Apps и механизм их отображения внутри MAX;
- верхний интерфейсный слой бизнес-логики miniapp-страниц, который принимает данные страницы и регистрирует broker-события для других BPM-модулей;
- технический прием входящих payload от MAX-бота;
- технический прием payload из интерфейсов MAX Mini Apps;
- регистрацию broker-событий после приема данных; локальная доставка исходящих сообщений/действий в этом модуле отсутствует;
- выбор transport-а приема: `webhook`, `long_polling` или `disabled`;
- внутреннее raw-хранилище входящих MAX payload в Heap;
- внутреннее raw/audit-хранилище пользовательских событий MAX Mini Apps в Heap;
- реестр известных MAX-диалогов, групповых чатов и каналов, доступных боту по уже полученным событиям;
- history-cache сообщений по известным чатам с ручным обновлением батчами через MAX API;
- настройки проекта в Heap;
- серверное и браузерное логирование с уровнями;
- live-монитор логов через WebSocket для администратора;
- счетчики ошибок и предупреждений в админке;
- каталог и раннеры шаблонных юнит, серверных интеграционных и HTTP-проверок;
- документацию, достаточную для сопровождения проекта.

Проект не является самостоятельным Node/Vite-приложением. Он работает внутри Chatium, где `app`, `ctx`, file-based routing, Heap, auth, socket и серверная публикация предоставляются платформой.

## 2. Платформенные инварианты

- `app` и `ctx` являются глобальными объектами Chatium и не импортируются из локальных файлов.
- Новые внешние зависимости не добавляются. Используются платформенные модули и CDN-ассеты, уже применяемые в шаблоне.
- File-based routing: один файл route entrypoint = один route, предпочтительный путь внутри файла - `'/'`.
- Ссылки между маршрутами строятся через `config/routes.tsx`, route helpers или route `.url()`. Домен не хардкодится.
- Heap, repos и lib являются серверными слоями. Vue-компоненты не импортируют `tables/`, `repos/` или `lib/`; допустимы `shared/*` с `// @shared` и `api/*` route-модули с `// @shared-route`.
- Доступ к Heap идет через repos; бизнес-правила живут в `lib/`; HTTP-валидация и auth - в `api/` и SSR entrypoints.
- Логирование серверного кода идет через `ctx.log()` и `ctx.account.log()` внутри `lib/logger.lib.ts`; прикладной код использует `writeServerLog`.
- В Heap для подсчетов используется `countBy`, для фильтрации - `where`.
- `// @ts-ignore` допустим только для системных модулей Chatium без локальных типов.

## 3. Структура проекта

Обязательная структура:

| Путь                   | Ответственность                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `index.tsx`            | SSR entrypoint главной страницы `/`.                                                                              |
| `web/*/index.tsx`      | SSR entrypoints страниц `/web/admin`, `/web/profile`, `/web/login`, `/web/tests`.                                 |
| `miniapps/*/index.tsx` | SSR entrypoints web-страниц MAX Mini Apps; один каталог = одна miniapp-страница.                                  |
| `pages/*.vue`          | Компоненты страниц, получающие SSR props.                                                                         |
| `components/`          | Переиспользуемые UI-компоненты страниц.                                                                           |
| `api/`                 | HTTP/API routes. Каждый файл экспортирует route-константу.                                                        |
| `jobs/`                | Chatium `app.job` entrypoints для долгих операций, разбитых на короткие итерации.                                 |
| `tables/`              | Схемы Heap-таблиц.                                                                                                |
| `repos/`               | CRUD и запросы к Heap без бизнес-логики.                                                                          |
| `lib/`                 | Бизнес-логика, валидация, вычисления, тестовые раннеры.                                                           |
| `shared/`              | Код, допустимый для клиента; файлы должны быть чистыми для браузера или явно совместимыми с Chatium shared-route. |
| `pagecss/`             | CSS-фрагменты страниц, вынесенные из TSX entrypoints.                                                             |
| `config/`              | Константы проекта, маршрутов и заголовков.                                                                        |
| `docs/spec/spec.md`    | Этот spec-as-source документ.                                                                                     |

Нормативная детализация структуры:

- `components/admin/` содержит только компоненты админки: `AdminCounters`, `AdminSettings`, `AdminLogMonitor`.
- `components/max/` содержит operational UI MAX-модуля, который показывается на admin page для Admin.
- `components/tests/` содержит только компоненты страницы тестов: `TestSuiteTab`, `TestsLogMonitor`.
- `miniapps/<pageKey>/index.tsx` - каталог пользовательских miniapp-страниц. Именно здесь размещаются web-страницы, которые будут открываться внутри MAX.
- `<pageKey>` задается lower-kebab-case, совпадает с `MINIAPP_PAGE_REGISTRY[pageKey].pageKey` и участвует в URL `/miniapps/<pageKey>`.
- Верхняя бизнес-логика miniapp-страниц размещается в `lib/miniappPageEvents.lib.ts`; это orchestration слой интерфейса, а не доменная обработка.
- Registry miniapp-страниц и action allowlist размещаются в `lib/miniapps/registry.lib.ts`; Vue и `shared/` не импортируют registry напрямую.
- `shared/*` обязан быть помечен `// @shared`, если импортируется из Vue или shared-route кода. Исключение - серверно-используемые helper-ы, которые не попадают в браузерный bundle.
- `api/*` route-модули, импортируемые из Vue через `.run(ctx)` или `.query(...).run(ctx)`, должны быть помечены `// @shared-route`.
- `jobs/*` не импортируются из Vue и не являются HTTP API; запуск выполняется только через server-side orchestration.
- `lib/htmlRedirect.ts` является единственной точкой приведения `ctx.resp.redirect()` к результату html-route; новые SSR redirect helper-ы не добавляются без явной причины.
- `pagecss/*.ts` не содержит бизнес-логики, API-вызовов, Heap-доступа или состояния. Это только строковые CSS-фрагменты для SSR injection.
- `docs/ADR/*`, `docs/api.md`, `docs/data.md`, `docs/imports.md` остаются справочниками. При расхождении с этим файлом правится либо этот файл, либо старый документ, но не код “под старый документ”.

### 3.1 Полный инвентарь файлов

Этот инвентарь является нормативным. Любой новый, удаленный или переименованный файл в `p/units/aley/bpm/interfaces/max` требует синхронного изменения таблицы.

| Файл                                             | Нормативная роль                                                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `.CHATIUM-LLM.md`                                | Краткий LLM-контекст проекта и ссылки на документы; не источник истины.                                                 |
| `.dir.json`                                      | Метаданные каталога Chatium workspace.                                                                                  |
| `.workspace.json`                                | Workspace feature flags, сейчас `heap`.                                                                                 |
| `README.md`                                      | Человеческое описание проекта и быстрые ссылки; не источник истины при расхождении со spec.                             |
| `index.tsx`                                      | SSR route `/`, экспорт `indexPageRoute`.                                                                                |
| `web/admin/index.tsx`                            | SSR route `/web/admin`, экспорт `adminPageRoute`.                                                                       |
| `web/login/index.tsx`                            | SSR route `/web/login`, экспорт `loginPageRoute`.                                                                       |
| `web/profile/index.tsx`                          | SSR route `/web/profile`, экспорт `profilePageRoute`.                                                                   |
| `web/tests/index.tsx`                            | SSR route `/web/tests`, экспорт `testsPageRoute`.                                                                       |
| `miniapps/<pageKey>/index.tsx`                   | SSR route miniapp-страницы `/miniapps/<pageKey>`; каждый конкретный pageKey добавляется отдельной строкой при создании. |
| `miniapps/root/index.tsx`                        | SSR route `/miniapps/root`, корневая MAX Mini App page с заголовком проекта `A/Ley BPM`.                                |
| `pages/HomePage.vue`                             | Vue page главной.                                                                                                       |
| `pages/LoginPage.vue`                            | Vue page входа.                                                                                                         |
| `pages/ProfilePage.vue`                          | Vue page профиля.                                                                                                       |
| `pages/AdminPage.vue`                            | Vue page админки.                                                                                                       |
| `pages/TestsPage.vue`                            | Vue page тестов.                                                                                                        |
| `components/Header.vue`                          | Общий header и logout orchestration.                                                                                    |
| `components/LogoutModal.vue`                     | Презентационный modal выхода.                                                                                           |
| `components/GlobalGlitch.vue`                    | Глобальные CSS-правила glitch effect.                                                                                   |
| `components/AppFooter.vue`                       | Общий footer и событие `chatium-click`.                                                                                 |
| `components/admin/AdminCounters.vue`             | Презентационная карточка error/warn counters.                                                                           |
| `components/admin/AdminSettings.vue`             | UI настроек `project_name` и `log_level`.                                                                               |
| `components/admin/AdminLogMonitor.vue`           | Презентационный монитор логов админки.                                                                                  |
| `components/max/MaxControlPanel.vue`             | Оперативная панель MAX-модуля на admin page: settings, secret statuses, webhook/poll/history/retry actions and chats.   |
| `components/tests/TestSuiteTab.vue`              | Презентационная вкладка test suite.                                                                                     |
| `components/tests/TestsLogMonitor.vue`           | Презентационный монитор логов страницы тестов.                                                                          |
| `config/routes.tsx`                              | `PROJECT_ROOT`, route constants and URL helpers.                                                                        |
| `config/project.tsx`                             | Project/page constants and title/header helpers.                                                                        |
| `api/miniapps/bootstrap.ts`                      | `POST /api/miniapps/bootstrap`, проверка `WebApp.initData` и выдача initial state страницы.                             |
| `api/miniapps/action.ts`                         | `POST /api/miniapps/action`, прием действия miniapp-страницы и регистрация события через верхний orchestration слой.    |
| `api/settings/list.ts`                           | `GET /api/settings/list`, экспорт `listSettingsRoute`.                                                                  |
| `api/settings/get.ts`                            | `GET /api/settings/get`, экспорт `getSettingRoute`.                                                                     |
| `api/settings/save.ts`                           | `POST /api/settings/save`, экспорт `saveSettingRoute`.                                                                  |
| `api/logger/log.ts`                              | `POST /api/logger/log`, экспорт `logRoute`.                                                                             |
| `api/logger/browser.ts`                          | `POST /api/logger/browser`, экспорт `postBrowserLogsRoute`.                                                             |
| `api/max/control/get.ts`                         | `GET /api/max/control/get`, оперативная конфигурация и статус MAX без секретов.                                         |
| `api/max/control/save.ts`                        | `POST /api/max/control/save`, сохранение оперативных настроек MAX.                                                      |
| `api/max/poll/once.ts`                           | `POST /api/max/poll/once`, ручной запуск одного Long Polling цикла.                                                     |
| `api/max/poll/reset-marker.ts`                   | `POST /api/max/poll/reset-marker`, сброс marker Long Polling.                                                           |
| `api/max/chats/list.ts`                          | `GET /api/max/chats/list`, список известных чатов/диалогов с history counters.                                          |
| `api/max/chats/refresh.ts`                       | `POST /api/max/chats/refresh`, постановка refresh истории одного или всех известных чатов.                              |
| `jobs/max/history-refresh.ts`                    | `app.job` итерации refresh истории: batched delete старых rows и batched fetch новых сообщений из MAX.                  |
| `api/max/broker/retry.ts`                        | `POST /api/max/broker/retry`, ручной retry регистрации raw events в core broker.                                        |
| `api/max/secrets/get.ts`                         | `GET /api/max/secrets/get`, статус наличия секретов MAX без значений.                                                   |
| `api/max/secrets/save.ts`                        | `POST /api/max/secrets/save`, сохранение bot token и webhook secret.                                                    |
| `api/max/subscription/apply.ts`                  | `POST /api/max/subscription/apply`, создание/обновление Webhook-подписки MAX.                                           |
| `api/max/subscription/delete.ts`                 | `POST /api/max/subscription/delete`, удаление Webhook-подписки MAX.                                                     |
| `api/max/webhook.ts`                             | `POST /api/max/webhook`, прием `Update` от MAX Webhook.                                                                 |
| `api/admin/logs/recent.ts`                       | `GET /api/admin/logs/recent`, экспорт `getRecentLogsRoute`.                                                             |
| `api/admin/logs/before.ts`                       | `GET /api/admin/logs/before`, экспорт `getLogsBeforeRoute`.                                                             |
| `api/admin/dashboard/counts.ts`                  | `GET /api/admin/dashboard/counts`, экспорт `getDashboardCountsRoute`.                                                   |
| `api/admin/dashboard/reset.ts`                   | `POST /api/admin/dashboard/reset`, экспорт `resetDashboardRoute`.                                                       |
| `api/tests/list.ts`                              | `GET /api/tests/list`, экспорт `listTestsRoute`.                                                                        |
| `api/tests/unit/index.ts`                        | `GET /api/tests/unit`, экспорт `templateUnitTestsRoute`.                                                                |
| `api/tests/integration/index.ts`                 | `GET /api/tests/integration`, экспорт `templateIntegrationTestsRoute`.                                                  |
| `tables/settings.table.ts`                       | Heap schema `Settings`.                                                                                                 |
| `tables/logs.table.ts`                           | Heap schema `Logs`.                                                                                                     |
| `tables/maxRawUpdates.table.ts`                  | Heap schema `MaxRawUpdates` для сырого хранения входящих `Update` от MAX.                                               |
| `tables/miniappPageEvents.table.ts`              | Heap schema `MiniappPageEvents` для audit/raw событий miniapp-страниц до передачи дальше.                               |
| `tables/maxChats.table.ts`                       | Heap schema `MaxChats`, реестр известных MAX-диалогов, групповых чатов и каналов.                                       |
| `tables/maxChatMessages.table.ts`                | Heap schema `MaxChatMessages`, replaceable history-cache сообщений по известным `chat_id`.                              |
| `tables/maxHistoryRefreshRuns.table.ts`          | Heap schema `MaxHistoryRefreshRuns`, состояние batched refresh jobs.                                                    |
| `tables/.gitkeep`                                | Placeholder каталога tables; не содержит поведения.                                                                     |
| `repos/settings.repo.ts`                         | CRUD repository для settings без logger recursion.                                                                      |
| `repos/logs.repo.ts`                             | CRUD/query repository для logs.                                                                                         |
| `repos/maxRawUpdates.repo.ts`                    | Append/query repository для `MaxRawUpdates`.                                                                            |
| `repos/miniappPageEvents.repo.ts`                | Append/query repository для `MiniappPageEvents`.                                                                        |
| `repos/maxChats.repo.ts`                         | Upsert/query repository для `MaxChats`.                                                                                 |
| `repos/maxChatMessages.repo.ts`                  | Replace/query repository для `MaxChatMessages`, включая batched delete по `chatId`.                                     |
| `repos/maxHistoryRefreshRuns.repo.ts`            | CRUD/query repository для `MaxHistoryRefreshRuns`.                                                                      |
| `lib/settings.lib.ts`                            | Settings business logic and validation.                                                                                 |
| `lib/logger.lib.ts`                              | Server logging pipeline.                                                                                                |
| `lib/logLevel.lib.ts`                            | Server-only helper for reading and injecting `window.__BOOT__.logLevel`.                                                |
| `lib/max/apiClient.lib.ts`                       | Единая server-only обертка над MAX API: polling, webhook subscriptions and messages.                                    |
| `lib/max/safe.lib.ts`                            | Safe JSON/redaction/id helpers для MAX payload/logging/broker state.                                                    |
| `lib/maxRawUpdates.lib.ts`                       | Валидация MAX update, dedup under lock, chat discovery and publish state for raw updates.                               |
| `lib/maxHistory.lib.ts`                          | Orchestration refresh истории: создание runs, pagination, preflight fetch, delete/replace and counters.                 |
| `lib/miniappPageEvents.lib.ts`                   | Запись miniapp bootstrap/action events и server-only публикация в core broker.                                          |
| `lib/broker/coreBrokerClient.lib.ts`             | Server-only `@app/app.runAppFunction` client для регистрации MAX module contracts и публикации событий в core broker.   |
| `lib/miniapps/initData.lib.ts`                   | Server-side валидация `WebApp.initData`, TTL и построение `MiniappLaunchContext`.                                       |
| `lib/miniapps/registry.lib.ts`                   | Registry miniapp pages and allowed actions.                                                                             |
| `lib/htmlRedirect.ts`                            | Typed wrapper around `ctx.resp.redirect` for html routes.                                                               |
| `lib/admin/dashboard.lib.ts`                     | Dashboard counters and reset logic.                                                                                     |
| `lib/tests/templateUnitSuite.ts`                 | Unit runner orchestrator.                                                                                               |
| `lib/tests/templateUnitRoutesChecks.ts`          | Unit checks for route helpers.                                                                                          |
| `lib/tests/templateUnitSuiteHelpers.ts`          | Sync unit result helpers.                                                                                               |
| `lib/tests/integrationSuite.ts`                  | Integration runner orchestrator.                                                                                        |
| `lib/tests/integrationApiSuite.ts`               | API/e2e integration checks.                                                                                             |
| `lib/tests/integrationSuiteHelpers.ts`           | Async integration result helpers and `isAdmin`.                                                                         |
| `lib/tests/logTestRunFailures.ts`                | Failure-to-log bridge for test API wrappers.                                                                            |
| `lib/.gitkeep`                                   | Placeholder каталога lib; не содержит поведения.                                                                        |
| `shared/logger.ts`                               | Browser logger, severity matrix and log sink.                                                                           |
| `shared/browserRemoteLogger.ts`                  | Browser remote batching and console/global handlers.                                                                    |
| `shared/useRemoteLogging.ts`                     | Vue lifecycle composable for remote browser logging.                                                                    |
| `shared/useLogStream.ts`                         | Vue lifecycle/state composable for log history and WebSocket.                                                           |
| `shared/logStreamUtils.ts`                       | Pure log stream formatting/filter helpers.                                                                              |
| `shared/logStreamSocket.ts`                      | Optional socket lifecycle listener adapter.                                                                             |
| `shared/useTestSuites.ts`                        | Vue state/actions for test tabs and runners.                                                                            |
| `shared/testSuiteHelpers.ts`                     | Pure test UI and HTTP check helpers.                                                                                    |
| `shared/testCatalog.ts`                          | Runtime test catalog shared by UI/API/runners.                                                                          |
| `shared/logLevel.ts`                             | SSR helper for reading/injecting `window.__BOOT__.logLevel`.                                                            |
| `shared/preloader.ts`                            | SSR CSS/script/html snippets for boot loader.                                                                           |
| `shared/.gitkeep`                                | Placeholder каталога shared; не содержит поведения.                                                                     |
| `styles.tsx`                                     | Shared CSS strings `baseHtmlStyles`, `customScrollbarStyles`.                                                           |
| `pagecss/adminPageCss1.ts`                       | Admin page CSS part 1.                                                                                                  |
| `pagecss/adminPageCss2.ts`                       | Admin page CSS part 2.                                                                                                  |
| `pagecss/adminPageCss3.ts`                       | Admin page CSS part 3.                                                                                                  |
| `pagecss/headerCss1.ts`                          | Header CSS part 1.                                                                                                      |
| `pagecss/headerCss2.ts`                          | Header CSS part 2.                                                                                                      |
| `pagecss/homeBootCss.ts`                         | Home boot/CRT CSS.                                                                                                      |
| `pagecss/homePageCss1.ts`                        | Home page CSS part 1.                                                                                                   |
| `pagecss/homePageCss2.ts`                        | Home page CSS part 2.                                                                                                   |
| `pagecss/profilePageCss1.ts`                     | Profile page CSS part 1.                                                                                                |
| `pagecss/profilePageCss2.ts`                     | Profile page CSS part 2.                                                                                                |
| `pagecss/testsPageCss1.ts`                       | Tests page CSS part 1.                                                                                                  |
| `pagecss/testsPageCss2.ts`                       | Tests page CSS part 2.                                                                                                  |
| `pagecss/testsPageCss3.ts`                       | Tests page CSS part 3.                                                                                                  |
| `pagecss/testsPageCss4.ts`                       | Tests page CSS part 4.                                                                                                  |
| `docs/spec/spec.md`                              | Spec-as-source, этот документ.                                                                                          |
| `docs/architecture.md`                           | Legacy architecture reference.                                                                                          |
| `docs/api.md`                                    | Legacy API reference.                                                                                                   |
| `docs/data.md`                                   | Legacy data reference.                                                                                                  |
| `docs/imports.md`                                | Legacy imports reference.                                                                                               |
| `docs/ADR/0001-initial-structure.md`             | Legacy ADR initial structure.                                                                                           |
| `docs/ADR/0002-settings-heap-and-layered-api.md` | Legacy ADR settings/layering.                                                                                           |
| `tsconfig.json`                                  | Local TS/Vue compiler config.                                                                                           |
| `jsx.d.ts`                                       | Local JSX/Chatium type shim.                                                                                            |
| `vue-shim.d.ts`                                  | Local Vue/Chatium type shim.                                                                                            |

## 4. Роли и доступ

Роли:

- `Guest`: нет `ctx.user`.
- `AnyUser`: авторизованный пользователь любого типа, прошедший `requireAnyUser(ctx)`. Это не `Guest`; guest-запросы к AnyUser API обрабатываются платформенным auth helper.
- `RealUser`: пользователь прошел авторизацию, доступен через `requireRealUser(ctx)`.
- `Admin`: `ctx.user.is('Admin') === true`, проверяется через `requireAccountRole(ctx, 'Admin')`.

Правила доступа:

| Поверхность               | Доступ                 | Поведение без доступа                                                                    |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| `/`                       | Guest, RealUser, Admin | Доступна всем; набор ссылок зависит от auth state.                                       |
| `/web/login`              | Guest, RealUser, Admin | Доступна всем; строит ссылку `/s/auth/signin?back=...`.                                  |
| `/web/profile`            | RealUser, Admin        | Редирект на `../login?back=<current-url>`.                                               |
| `/web/admin`              | Admin                  | Редирект на login с `back=<current-url>`.                                                |
| `/web/tests`              | RealUser, Admin        | Редирект на `../login?back=<current-url>`.                                               |
| `/miniapps/*`             | External MAX Mini App  | Рендер shell без персональных данных; рабочие данные только после `initData` validation. |
| `/api/miniapps/*`         | External MAX Mini App  | `{ success:false, error:'Invalid MAX initData' }`.                                       |
| `/api/settings/*`         | Admin                  | Платформенная ошибка auth.                                                               |
| `/api/admin/*`            | Admin                  | Платформенная ошибка auth.                                                               |
| `/api/logger/*`           | AnyUser                | Платформенная ошибка auth.                                                               |
| `/api/tests/*`            | AnyUser                | Платформенная ошибка auth.                                                               |
| `/api/max/control/*`      | Admin                  | Платформенная ошибка auth.                                                               |
| `/api/max/poll/*`         | Admin                  | Платформенная ошибка auth.                                                               |
| `/api/max/chats/*`        | Admin                  | Платформенная ошибка auth.                                                               |
| `/api/max/broker/*`       | Admin                  | Платформенная ошибка auth.                                                               |
| `/api/max/secrets/*`      | Admin                  | Платформенная ошибка auth.                                                               |
| `/api/max/subscription/*` | Admin                  | Платформенная ошибка auth.                                                               |
| `/api/max/webhook`        | External MAX Webhook   | `{ success:false, error:'Invalid MAX webhook secret' }`.                                 |

На `/web/tests` non-admin пользователь видит тестовую страницу без админского live-канала логов. Серверная интеграция может возвращать failed-строки для проверок admin-branch с текстом `нужна роль Admin (ctx.user.is("Admin"))`.

Auth helper должен быть первой исполняемой строкой защищенного API-handler после объявления route callback: `requireAccountRole(ctx, 'Admin')` для Admin API и `requireAnyUser(ctx)` для AnyUser API. Для SSR entrypoints допускается предварительное диагностическое логирование, после чего `requireRealUser`/`requireAccountRole` выполняется до вычисления защищенных данных.

`/api/max/webhook` является исключением из пользовательского Chatium-auth, потому что MAX вызывает его как внешний сервер. Первая исполняемая операция handler-а после объявления route callback - проверка `X-Max-Bot-Api-Secret` через `lib/maxRawUpdates.lib.ts`; при несовпадении payload не пишется в Heap и не логируется целиком.

`/miniapps/*` и `/api/miniapps/*` являются исключениями из пользовательского Chatium-auth, потому что открываются из клиента MAX и не обязаны иметь Chatium-сессию. Первая доверенная операция miniapp API - server-side валидация `WebApp.initData` через `lib/miniapps/initData.lib.ts`; `initDataUnsafe`, query params и client-side user/chat данные не дают доступа сами по себе.

## 5. Маршруты и URL

`config/routes.tsx` задает:

```ts
PROJECT_ROOT = 'p/units/aley/bpm/interfaces/max'
ROUTES = {
  index: './',
  admin: './web/admin',
  profile: './web/profile',
  login: './web/login',
  tests: './web/tests',
  miniappsRoot: './miniapps'
}
ROUTE_PATHS = {
  index: '/',
  admin: '/web/admin',
  profile: '/web/profile',
  login: '/web/login',
  tests: '/web/tests',
  miniappsRoot: '/miniapps'
}
```

Нормативное поведение helper-ов:

- `getFullUrl('./')`, `getFullUrl('/')`, `getFullUrl('')` возвращают `/p/units/aley/bpm/interfaces/max/`.
- `getFullUrl('./web/admin')`, `getFullUrl('/web/admin')`, `getFullUrl('web/admin')` возвращают `/p/units/aley/bpm/interfaces/max/web/admin`.
- `withProjectRoot('./web/admin')` и `withProjectRoot('web/admin')` возвращают `./p/units/aley/bpm/interfaces/max/web/admin`.
- `withProjectRoot('./')` и `withProjectRoot('')` возвращают `./p/units/aley/bpm/interfaces/max/`.
- `withProjectRootAndSubroute('./web/admin', 'edit')` возвращает `./p/units/aley/bpm/interfaces/max/web/admin~edit`.
- `withProjectRootAndSubroute('./web/admin', '/edit')` возвращает `./p/units/aley/bpm/interfaces/max/web/admin~edit`.
- `withProjectRootAndSubroute('./web/admin', 'users/123')` возвращает `./p/units/aley/bpm/interfaces/max/web/admin~users/123`.
  Все значения `ROUTES` должны начинаться с `./`. Все публичные ссылки во Vue props должны быть без домена.

`lib/miniapps/registry.lib.ts` задает `MINIAPP_PAGE_REGISTRY`:

```ts
type MiniappPageDefinition = {
  pageKey: string
  title: string
  routePath: string
  allowedActions: string[]
}
```

Правила реестра:

- `pageKey` lower-kebab-case, уникален и совпадает с каталогом `miniapps/<pageKey>`;
- `routePath` задает route внутри проекта, без домена;
- `allowedActions` является allowlist действий страницы для `POST /api/miniapps/action`;
- targetModules не принимаются из browser payload; routing выполняется core broker subscriptions.

Initial registry:

| pageKey | title       | routePath        | allowedActions |
| ------- | ----------- | ---------------- | -------------- |
| `root`  | `A/Ley BPM` | `/miniapps/root` | `[]`           |

Root miniapp page contract:

- `root` - единственная конкретная miniapp-страница начального релиза; остальные miniapp-страницы считаются заделом на будущее и добавляются отдельным изменением спеки;
- публичный route: `/p/units/aley/bpm/interfaces/max/miniapps/root`;
- `max_miniapp_default_page` по умолчанию равен `root`;
- UI отображает заголовок проекта `A/Ley BPM`; дополнительных форм, списков, команд и пользовательских actions в начальном релизе нет;
- `allowedActions=[]`, поэтому `POST /api/miniapps/action` для `pageKey='root'` всегда возвращает semantic error `Action is not allowed`;
- bootstrap root page пишет `MiniappPageEvents` row с `pageKey='root'`, `eventType='bootstrap'`, `action=''`, sanitized empty payload и broker event `max.miniapp.root.bootstrap`;
- `brokerTargetModules=[]`: root bootstrap является broadcast-фактом для подписок broker-а, но не требует конкретного consumer-а.

`config/project.tsx` задает:

```ts
DEFAULT_PROJECT_TITLE = 'BPM Interfaces Max'
INDEX_PAGE_NAME = 'Главная'
PROFILE_PAGE_NAME = 'Профиль'
ADMIN_PAGE_NAME = 'Админка'
TESTS_PAGE_NAME = 'Тесты'
BODY_TEXT = 'BPM Interfaces Max'
BODY_SUBTEXT = 'В разработке'
```

`getPageTitle(pageName, projectName)` всегда возвращает `${pageName} - ${projectName}` без trim/fallback. `getHeaderText(pageName, projectName)` всегда возвращает `${projectName} / ${pageName}` без trim/fallback. Пустые строки и спецсимволы сохраняются как переданы.

## 6. SSR-страницы

Все SSR-страницы обязаны:

- иметь `<meta charset="UTF-8">` и viewport;
- инжектить `window.__BOOT__.logLevel` через `getLogLevelScript(await getLogLevelForPage(ctx))`;
- использовать `getPageTitle(pageName, projectName)` для `<title>`, кроме login, где title равен `Вход`;
- использовать `getHeaderText(pageName, projectName)` для заголовка в Header, кроме login;
- подключать `/s/metric/clarity.js`;
- не хардкодить внутренние URL вручную.

Preloader подключается на `/`, `/web/profile`, `/web/admin`, `/web/tests`; `/web/login` без preloader, Tailwind, FontAwesome и remote logging, но с `window.__BOOT__.logLevel` и `/s/metric/clarity.js`.

Защищенные SSR-redirects:

- `/web/profile` и `/web/tests` при отсутствии real user возвращают `htmlRedirect(ctx, '../login?back=' + encodeURIComponent(req.url))`.
- `/web/admin` при отсутствии Admin возвращает HTML fallback с title `Вход`, clarity, meta refresh и `window.location.href` на `loginPageRoute.url() + '?back=' + encodeURIComponent(req.url)`.
- `htmlRedirect(ctx, location, statusCode?)` централизует типовое приведение результата `ctx.resp.redirect()` и не должен размножаться по entrypoint-файлам.

### 6.1 Главная `/`

Файл: `index.tsx`.  
Компонент: `pages/HomePage.vue`.  
Доступ: все.

Сервер обязан вычислить:

- `isAuthenticated = !!ctx.user`;
- `isAdmin = ctx.user?.is('Admin') ?? false`;
- `loginUrl = getFullUrl(ROUTES.login)`;
- `adminUrl = isAdmin ? getFullUrl(ROUTES.admin) : ''`;
- `testsUrl = isAuthenticated ? getFullUrl(ROUTES.tests) : ''`;
- `projectName = getSettingString(ctx, PROJECT_NAME)`;
- `projectTitle = getHeaderText('Главная', projectName)`.
- MAX operational state не кладется в SSR props главной страницы.

`HomePage` получает:

- `projectName = BODY_TEXT`, сейчас `BPM Interfaces Max`;
- `projectDescription = BODY_SUBTEXT`, сейчас `В разработке`;
- `projectTitle`, `indexUrl`, `profileUrl`, `loginUrl`, `isAuthenticated`, `isAdmin`, `adminUrl`, `testsUrl`.

На главной `projectName` в props - это hero-текст `BODY_TEXT`, а не настройка `project_name`. Настройка `project_name` используется сервером только для `<title>` и `projectTitle` Header через `getHeaderText('Главная', projectNameFromSettings)`.

Главная страница остается публичным authenticated surface проекта. Оперативная панель управления MAX-модулем живет на `/web/admin`, рядом с системными настройками, логами и счетчиками.

Клиентское поведение:

- после `bootloader-complete` запускается печать заголовка и описания;
- на mount подключается `browserRemoteLogger`;
- `setLogSink` передает локальные логи в remote logger;
- оперативные MAX controls на главной не рендерятся и не делают запросы к `/api/max/control/*`;
- при unmount выполняется `flush`, снимается sink, очищаются интервалы и обработчик `bootloader-complete`;
- ссылка Chatium открывается в новой вкладке после локального glitch-эффекта.

`HomePage` хранит интервалы печати отдельно для title/description, начинает анимацию сразу, если `window.bootLoaderComplete === true`, и слушает `bootloader-complete` иначе. На `onBeforeUnmount` выполняется `flush`, на `onUnmounted` - `setLogSink(null)`, `teardown()`, удаление listener-а и очистка интервалов.

### 6.1.1 MAX Mini App pages `/miniapps/<pageKey>`

Файлы: `miniapps/<pageKey>/index.tsx`.
Компоненты: root miniapp реализован прямо в `miniapps/root/index.tsx` с минимальным client bootstrap script.
Доступ: External MAX Mini App.

Назначение: отображать web-страницы внутри MAX Mini Apps и принимать действия пользователя как интерфейсный слой. Эти страницы не являются доменным BPM-модулем; они собирают контекст MAX, валидируют его на сервере и передают данные в другие модули через верхнюю бизнес-логику `lib/miniappPageEvents.lib.ts`.

Серверный route `miniapps/<pageKey>/index.tsx` обязан:

- не использовать `requireAnyUser`, `requireRealUser` или `requireAccountRole`;
- найти страницу в `MINIAPP_PAGE_REGISTRY` по `pageKey`;
- если страница неизвестна или выключена, вернуть HTML-заглушку без персональных данных;
- подключить `https://app.max.ru/sdk/max-web-app.js`;
- передать в browser boot только публичные `pageKey`, `title`, `bootstrapUrl`;
- не передавать bot token, webhook secret, raw `initData`, parsed user/chat или любые секреты в SSR props;
- не подключать общий Header, Footer, CRT home layout и browser remote logger, потому что miniapp-запуск не обязан иметь Chatium-auth.

Клиент miniapp-страницы обязан:

- читать `window.WebApp.initData` как raw string только для отправки на сервер;
- не доверять `window.WebApp.initDataUnsafe`;
- вызвать `POST /api/miniapps/bootstrap` с `{ pageKey, initData, payload:{} }`;
- после successful bootstrap отображать server-provided page title;
- отправлять пользовательские действия только через `POST /api/miniapps/action` с `{ pageKey, initData, action, payload }`, если action разрешен registry;
- не импортировать `tables/`, `repos/`, `lib/miniapps/*` или server-only code в browser bundle;
- не хранить bot token, webhook secret, broker token или downstream credentials в browser storage.

`MiniappLaunchContext` после server-side validation:

```ts
{
  pageKey: string,
  queryId: string | null,
  authDate: number,
  maxUser: {
    id: string,
    firstName?: string,
    lastName?: string,
    username?: string,
    languageCode?: string,
    photoUrl?: string
  } | null,
  chat: { id: string, type: 'DIALOG' | 'CHAT' | 'CHANNEL' } | null,
  startParam: string,
  platform: 'ios' | 'android' | 'desktop' | 'web' | 'unknown',
  version: string,
  initDataHash: string
}
```

Контракт верхней бизнес-логики страницы `lib/miniappPageEvents.lib.ts`:

```ts
export async function bootstrapMiniappPage(ctx, request: MiniappBootstrapRequest)
export async function acceptMiniappAction(ctx, request: MiniappActionRequest)
```

`MiniappActionRequest`:

```ts
{
  pageKey?: string,
  action?: string,
  initData?: string,
  payload?: unknown
}
```

Правила верхнего слоя:

- это orchestration/business facade интерфейсного проекта, а не место доменной обработки;
- слой валидирует MAX `initData`, page/action allowlist и нормализует только интерфейсные поля;
- вся доменная обработка, маршрутизация BPM, изменение бизнес-состояния и тяжелые вычисления выполняются в других модулях;
- передача факта в другие модули идет только через `lib/miniappPageEvents.lib.ts` и `lib/broker/coreBrokerClient.lib.ts` после записи `MiniappPageEvents`;
- `lib/miniapps/registry.lib.ts` задает allowed actions; browser payload не может расширить allowlist или target modules;
- при ошибке broker publish страница возвращает пользователю безопасный статус приема, а техническую ошибку пишет в server log без raw `initData` и без секретов.

`GET /api/max/control/get` возвращает форму:

```ts
{
  success: true,
  settings: Record<string, unknown>,
  status: {
    botTokenConfigured: boolean,
    webhookSecretConfigured: boolean,
    brokerModuleTokenConfigured: boolean,
    knownChats: number,
    brokerPending: number,
    latestRuns: MaxHistoryRefreshRuns[]
  },
  at: number
}
```

`POST /api/max/control/save` принимает subset operational settings из раздела 9:

```ts
{
  core_broker_publish_enabled?: boolean,
  core_broker_module_key?: string,
  max_receive_mode?: 'webhook' | 'long_polling' | 'disabled',
  max_update_types?: string[],
  max_polling_limit?: number,
  max_polling_timeout_sec?: number,
  max_polling_interval_sec?: number,
  max_polling_marker?: number | null,
  max_raw_dedup_policy?: 'none' | 'fingerprint',
  max_chat_discovery_enabled?: boolean,
  max_history_refresh_enabled?: boolean,
  max_history_batch_size?: number,
  max_history_delete_batch_size?: number,
  max_history_job_budget_ms?: number,
  max_history_max_batches_per_job?: number,
  max_miniapps_enabled?: boolean,
  max_miniapp_default_page?: string,
  max_miniapp_init_data_ttl_sec?: number
}
```

Нормативное UI-поведение панели:

- основной control выбора режима - segmented control `Webhook` / `Polling` / `Off`;
- при выборе `Webhook` доступны: computed public webhook URL, optional override URL, update types, auto-subscribe toggle, кнопки `Apply subscription`, `Delete subscription`, `Copy URL`, индикатор `webhookSecretConfigured`;
- при выборе `Polling` доступны: update types, `limit`, `timeout`, `interval`, `marker`, toggle auto-run, кнопки `Poll now` и `Reset marker`;
- при выборе `Off` прием новых событий через внутренние задачи/polling не выполняется, но внешний webhook endpoint продолжает отвечать на запросы и отклоняет их только по secret/validation rules;
- update types управляются multiselect-ом по известным типам MAX API; пустой список означает “все типы” для Webhook и Long Polling;
- секреты не отображаются и не редактируются на главной: вместо значений показываются только booleans `botTokenConfigured`, `webhookSecretConfigured` и `brokerModuleTokenConfigured` со ссылкой на `/web/admin`;
- сохранение оперативных настроек идет через `POST /api/max/control/save`, после чего панель перезагружает `GET /api/max/control/get`;
- ручные действия показывают transient `OK`/`ERR`, не раскрывают raw payload и не пишут секреты в browser logger.

### 6.2 Login `/web/login`

Файл: `web/login/index.tsx`.  
Компонент: `pages/LoginPage.vue`.  
Доступ: все.

Сервер обязан:

- взять `back` из `req.query.back`;
- если `back` не задан, использовать `/${PROJECT_ROOT}/`;
- передать `back` в `LoginPage`;
- не подключать browser remote logging на клиенте.

Клиент обязан строить URL входа как:

```ts
;`/s/auth/signin?back=${encodeURIComponent(back)}`
```

`LoginPage` логирует mount/unmount через `shared/logger`, но не устанавливает `browserRemoteLogger`, не регистрирует sink и не вызывает `/api/logger/browser`. Это связано с тем, что browser logger endpoint требует `AnyUser`, а login доступен гостю.

### 6.3 Profile `/web/profile`

Файл: `web/profile/index.tsx`.  
Компонент: `pages/ProfilePage.vue`.  
Доступ: RealUser, Admin.

Сервер обязан:

- проверить `requireRealUser(ctx)`;
- при ошибке вернуть HTML-redirect на `../login?back=<current-url>`;
- передать в Vue `user.displayName`, `user.confirmedEmail`, `user.confirmedPhone`;
- передать `adminUrl` только если user is Admin;
- передать `testsUrl = getFullUrl(ROUTES.tests)`;
- подключить boot loader, scrollbar, header CSS и profile CSS.

Клиент обязан:

- показать Header после boot loader;
- печатать `Профиль пользователя` и `Информация о вашем аккаунте`;
- показать display name, confirmed email и confirmed phone, используя fallback-тексты, если значения отсутствуют;
- подключить `browserRemoteLogger` и снять его при unmount.

Fallback-тексты профиля: display name - `Не указано`, email - `Не подтвержден`, phone - `Не подтвержден`. Анимация печатает `Профиль пользователя`, затем `Информация о вашем аккаунте`; контент карточки показывается только после завершения печати описания.

### 6.4 Admin `/web/admin`

Файл: `web/admin/index.tsx`.  
Компонент: `pages/AdminPage.vue`.  
Доступ: Admin.

Сервер обязан:

- проверить `requireAccountRole(ctx, 'Admin')`;
- при ошибке вернуть HTML с meta refresh и `window.location.href` на login route с `back=<current-url>`;
- вычислить `logsSocketId = getAdminLogsSocketId(ctx)`;
- передать `encodedLogsSocketId = await genSocketId(ctx, logsSocketId)`;
- передать `isAuthenticated=true`, `isAdmin=true`, `adminUrl`, `testsUrl`, `profileUrl`, `loginUrl`.

Клиент обязан содержать:

- статус-бар `/web/admin`, название проекта, текущий log level, состояние live-канала (`LIVE`, `OFFLINE`, `...` или `LOGS`);
- карточку счетчиков ошибок и предупреждений;
- карточки настроек проекта и уровня логирования;
- карточку секретов MAX: bot token и webhook secret, только status/masked write controls;
- монитор логов с фильтрами, пагинацией, clear и раскрытием строк;
- live-инкремент счетчиков для входящих логов не старее `dashboardResetAt`;
- загрузку счетчиков через `GET /api/admin/dashboard/counts`;
- сброс счетчиков через `POST /api/admin/dashboard/reset`;
- `useRemoteLogging({ enabled: true, onLocalEntry: ingestLocalEntry })`;
- `useLogStream({ trackConnection: true })`.

`AdminPage`:

- вычисляет `initialProjectName` из `projectTitle.split(' / ')[0]`;
- хранит статус-бар `statusProjectName` и `statusLogLevel`, обновляемые событиями `AdminSettings`;
- хранит только признаки наличия секретов MAX, но не значения секретов;
- грузит `GET /api/admin/dashboard/counts` при mount;
- считает live-входящие логи через `countEntry(entry)`, увеличивая error для severity `0..3`, warn для severity `4`, только если `entry.timestamp >= dashboardResetAt`;
- при сбросе вызывает `POST /api/admin/dashboard/reset`, выставляет counters из ответа и логирует notice;
- вызывает `startLogStream()` на mount и удаляет только listener `bootloader-complete` на unmount; cleanup socket/listeners выполняется внутри `useLogStream.onBeforeUnmount`.

### 6.5 Tests `/web/tests`

Файл: `web/tests/index.tsx`.  
Компонент: `pages/TestsPage.vue`.  
Доступ: RealUser, Admin.

Сервер обязан:

- проверить `requireRealUser(ctx)`;
- при ошибке вернуть HTML-redirect на `../login?back=<current-url>`;
- передать `isAdmin = user.is('Admin')`;
- передать `encodedLogsSocketId` только Admin;
- добавить `<meta name="units-aley-bpm-interfaces-max-page" content="web-tests" />`.

Клиент обязан:

- иметь вкладки `unit`, `integration`, `http`;
- показывать метрики активной вкладки: всего, пройдено, провалено, без прогона;
- запускать текущую вкладку, полный прогон и отдельный тест из строки;
- блокировать групповой прогон, пока идет одиночный прогон этой группы;
- раскрывать/сворачивать категории, первая категория каждой вкладки открыта по умолчанию;
- при наличии `encodedLogsSocketId` показывать монитор логов, подключить remote logging и дедуплицировать echo browser-sink записей из socket;
- без `encodedLogsSocketId` не поднимать remote logging и не показывать лог-сайдбар.

HTTP-вкладка `/web/tests` не имеет отдельного API endpoint. Она выполняется клиентом через `fetch` SSR-страниц по `HTTP_PATH_BY_TEST_ID` из `shared/testSuiteHelpers.ts`: `/`, `/web/admin`, `/web/profile`, `/web/login`, `/web/tests`. Base URL вычисляется из `indexUrl`/`testsUrl` и `window.location.origin`.

`TestsPage`:

- использует `useTestSuites({ indexUrl, testsUrl })` как единственный источник состояния вкладок, метрик, результатов, loading flags и single-run блокировок;
- использует `useLogStream({ encodedLogsSocketId, dedupSocketEcho: true, loggerName: 'TestsPage' })`;
- вызывает `useRemoteLogging({ enabled: !!encodedLogsSocketId, onLocalEntry: ingestLocalEntry })`;
- вызывает `startLogStream()` на mount, но без `encodedLogsSocketId` поток и history fetch не поднимаются;
- показывает `<aside class="tp-side">` с `TestsLogMonitor` только Admin, потому что только Admin получает `encodedLogsSocketId`.

## 7. Общие UI-компоненты

### Header

`components/Header.vue` обязан:

- показывать логотип и `projectTitle`;
- обновлять часы каждую секунду в формате `HH:mm:ss`;
- показывать кнопку админки только если `isAdmin && adminUrl`;
- показывать кнопку тестов, если задан `testsUrl`;
- показывать профиль для авторизованного и login для гостя;
- кнопка glitch добавляет `global-glitch-active` на `.app-layout` на 500 ms;
- кнопка close для авторизованного открывает `LogoutModal`, скрывает основной контент и footer;
- кнопка close для гостя не открывает modal, а запускает glitch;
- подтверждение logout отправляет на `/s/logout`;
- Escape закрывает logout modal.

Props `Header`: `projectTitle`, `indexUrl`, `profileUrl`, `loginUrl`, `isAuthenticated`, опциональные `isAdmin`, `adminUrl`, `testsUrl`. `pageName` допускается типом для обратной совместимости, но не используется в разметке. При открытом logout modal header получает класс `header-hidden`, `.app-layout` получает `content-hidden`, `.content-wrapper` и `.app-footer` получают `hidden-for-modal`; при отмене классы снимаются.

### LogoutModal

`components/LogoutModal.vue` обязан:

- принимать только prop `visible: boolean`;
- при `visible=true` показывать overlay с текстом `Выйти из аккаунта?` и кнопками `Нет`/`Да`;
- клик по overlay или `Нет` эмитит `cancel`;
- клик по `Да` эмитит `confirm`;
- клик внутри `.logout-modal` не закрывает modal;
- логировать показ modal через watcher и не обращаться к API/Heap/router напрямую.

### GlobalGlitch

Компонент отвечает только за глобальный glitch-эффект страницы и не должен содержать бизнес-логики. Разметка - скрытый anchor `global-glitch-style-anchor`; CSS задает `.global-glitch-active` на 500 ms и отключает pointer-events для дочерних элементов во время эффекта.

### AppFooter

Footer отображает брендовый низ страницы и логирует mount. Он не должен зависеть от auth, Heap или API. Текст: `ИП Худолей Андрей Германович`, `Все права сохранены © 2018-<currentYear>`, кнопка `Сделано с ... на Chatium`. Кнопка эмитит `chatium-click`; родитель открывает `https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start` в новой вкладке.

### AdminCounters

`components/admin/AdminCounters.vue` является презентационным:

- props: `errorCount: number`, `warnCount: number`;
- событие: `reset`;
- не вызывает API, не считает логи, не хранит состояние сброса;
- показывает две метрики: ошибки и предупреждения, и кнопку `Сброс`.

### AdminSettings

Компонент обязан:

- на mount загрузить `project_name` через `getSettingRoute.query({ key: 'project_name' }).run(ctx)`;
- инициализировать log level из `window.__BOOT__.logLevel`;
- автосохранять `project_name` через 300 ms debounce, только если trim-значение отличается от последнего сохраненного;
- сохранять `log_level` немедленно при клике;
- эмитить `update:projectName` и `update:logLevel` для статус-бара;
- показывать transient `OK` или `ERR` 1500 ms;
- при ошибке сохранения `project_name` возвращать значение, захваченное в начале `saveProjectName()`, и показывать ошибку; это не гарантирует откат к `lastSavedProjectName`;
- при ошибке сохранения `log_level` откатывать локальный уровень к значению до клика.
- на unmount очищать debounce/status timers.

Допустимые UI-значения уровня логирования в `AdminSettings`: `debug`, `info`, `warn`, `error`, `disable`. При сохранении они отправляются как lowercase; `api/settings/save` нормализует их в `Debug`, `Info`, `Warn`, `Error`, `Disable`.

### MaxControlPanel

`components/max/MaxControlPanel.vue` является stateful container admin-панели:

- на mount параллельно загружает `GET /api/max/control/get`, `GET /api/max/secrets/get` и `GET /api/max/chats/list`;
- хранит draft operational settings отдельно от последнего сохраненного состояния и сохраняет их через `POST /api/max/control/save`;
- показывает только признаки secret configured; raw `max_bot_access_token`, `max_webhook_secret` и `core_broker_module_token` не отображаются;
- принимает новые secret values через password inputs, отправляет их в `POST /api/max/secrets/save`, после success очищает локальные inputs;
- дает clear action для каждого секрета отдельно;
- запускает Admin-only actions: `Apply subscription`, `Delete subscription`, `Poll once`, `Reset marker`, `Retry broker`, `Refresh history`;
- после действий перезагружает control/chats state;
- показывает operational индекс известных `MaxChats` и последние `MaxHistoryRefreshRuns` без raw MAX payload/message bodies.

### Miniapp Root Page

`miniapps/root/index.tsx` является минимальным SSR surface MAX Mini App:

- подключает MAX Web App SDK;
- кладет в `window.__MINIAPP_BOOT__` только `pageKey`, `title` and `bootstrapUrl`;
- читает `window.WebApp.initData` только для передачи в `POST /api/miniapps/bootstrap`;
- не доверяет `initDataUnsafe` и не пишет raw `initData` в logs/browser console;
- отображает compact loading/error/result state без Header/Footer.

### AdminLogMonitor и TestsLogMonitor

Компоненты являются презентационными. Состояние, загрузка, фильтры, clear, pagination и expand/collapse приходят из `useLogStream`.

`AdminLogMonitor`:

- props: `displayedLogs`, `logsLoading`, `logsError`, `logsHasMore`, `selectedLogStream`, `selectedLogStreamLabel`, `currentLogCount`, `expandedLogRows`, `logStreamKeys`, `logStreamLabels`;
- events: `load-more`, `clear`, `toggle-filter`, `toggle-row`;
- не имеет кнопки expand/collapse all.

`TestsLogMonitor`:

- имеет тот же контракт, плюс prop `hasAnyExpandedLogRow` и event `toggle-all`;
- показывает кнопку `Развернуть все`/`Свернуть все`, если есть хотя бы одна log-строка;
- не отображается на `/web/tests` без `encodedLogsSocketId`.

### TestSuiteTab

`components/tests/TestSuiteTab.vue` является презентационной панелью вкладки тестов:

- props: `tab`, `heading`, `headingIcon`, `codeLabel`, `blocksView`, `loading`, `runLabel`, `groupBlocked`, `isSuiteSectionExpanded`, `isSingleRunning`;
- events: `run-suite`, `run-single(id)`, `toggle-section(blockId, blockIndex)`;
- кнопки одиночного запуска disabled при `loading || groupBlocked`;
- состояние результатов, раскрытия секций и single-run хранится только в `useTestSuites`.

## 8. Модель данных

### 8.1 Settings

Heap table: `t__units-aley-bpm-interfaces-max__setting__7Fk2Qw`.  
Файл: `tables/settings.table.ts`.

Поля:

| Поле    | Тип           | Требование                                                        |
| ------- | ------------- | ----------------------------------------------------------------- |
| `key`   | `Heap.String` | Уникальный ключ настройки, searchable ru/en, embeddings disabled. |
| `value` | `Heap.Any`    | Значение настройки.                                               |

Repo: `repos/settings.repo.ts`.

Операции:

- `findByKey(ctx, key)` возвращает row или `null`;
- `findAll(ctx)` возвращает все rows;
- `upsert(ctx, key, value)` вызывает `createOrUpdateBy(ctx, 'key', { key, value })`;
- `deleteByKey(ctx, key)` удаляет row, если найден.

Repo настроек не логирует через `logger.lib`, потому что `writeServerLog -> getLogLevel/getLogWebhook -> getSetting -> findByKey` иначе создает рекурсию.

### 8.2 Logs

Heap table: `t__units-aley-bpm-interfaces-max__log__9Xm3Kp`.  
Файл: `tables/logs.table.ts`.

Поля:

| Поле        | Тип           | Требование                                                                       |
| ----------- | ------------- | -------------------------------------------------------------------------------- |
| `message`   | `Heap.String` | Текст сообщения, searchable ru/en, embeddings disabled.                          |
| `payload`   | `Heap.Any`    | `null`, строка или JSON-string payload.                                          |
| `severity`  | `Heap.Number` | Syslog severity `0..7`.                                                          |
| `level`     | `Heap.String` | `emergency`, `alert`, `critical`, `error`, `warning`, `notice`, `info`, `debug`. |
| `timestamp` | `Heap.Number` | Unix time в миллисекундах.                                                       |

Repo: `repos/logs.repo.ts`.

Операции:

- `create(ctx, data)` создает row и не логирует через `writeServerLog`;
- `findAll(ctx, { limit = 1000, offset = 0, severities? })` сортирует `timestamp desc`, фильтрует по `severity in severities`, если фильтр задан;
- `findById(ctx, id)` возвращает row или `null`;
- `findBeforeTimestamp(ctx, beforeTimestamp, limit, severities?)` возвращает rows с `timestamp < beforeTimestamp`, сортировка `timestamp desc`;
- `countBySeverityAfter(ctx, sinceTimestamp, severity)` использует `Logs.countBy(ctx, { timestamp: { $gt: sinceTimestamp }, severity })`;
- `countErrorsAfter(ctx, sinceTimestamp)` суммирует severities `0,1,2,3`;
- `countWarningsAfter(ctx, sinceTimestamp)` считает severity `4`.

### 8.3 MaxRawUpdates

Heap table: `t__units-aley-bpm-interfaces-max__max_raw_update__R4w9Mx`.
Файл: `tables/maxRawUpdates.table.ts`.

Назначение таблицы - raw inbox входящих событий MAX. Raw-поля являются append-only: таблица не является бизнес-моделью сообщений, чатов, пользователей или BPM-задач; она хранит входной `Update` так, чтобы отдельный обработчик мог позже безопасно нормализовать данные повторно. Служебные поля broker-публикации могут обновляться после записи raw payload и не считаются изменением первичного события.

Поля:

| Поле                  | Тип           | Требование                                                                                                                                      |
| --------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`              | `Heap.String` | Источник доставки: `webhook` для production-приема, `long_polling` только для ручной разработки/диагностики.                                    |
| `updateType`          | `Heap.String` | Значение `Update.update_type` как пришло от MAX; searchable ru/en, embeddings disabled. Unknown future values сохраняются без ошибки.           |
| `maxTimestamp`        | `Heap.Number` | Значение `Update.timestamp` как пришло от MAX, без пересчета секунд/миллисекунд.                                                                |
| `receivedAt`          | `Heap.Number` | `Date.now()` в момент успешной проверки webhook-secret и принятия payload, Unix time в миллисекундах.                                           |
| `chatId`              | `Heap.String` | Optional extracted id как string: `Update.chat_id` или другой официальный chat id location.                                                     |
| `userId`              | `Heap.String` | Optional extracted id как string: первый найденный `user_id` из `Update.user`, `Update.message.sender` или другого официального `User`-объекта. |
| `fingerprint`         | `Heap.String` | Stable hash сырого `Update` для optional dedup policy; searchable disabled.                                                                     |
| `rawUpdate`           | `Heap.Any`    | Полный JSON-compatible объект `Update` без удаления, переименования и бизнес-нормализации полей.                                                |
| `rawMeta`             | `Heap.Any`    | Технические метаданные приема без секретов: `{ headersSeen?: string[], remoteIp?: string \| null, marker?: number \| null }`.                   |
| `brokerEventType`     | `Heap.String` | Event type, который должен быть опубликован в core broker, например `max.message.created`.                                                      |
| `brokerEventId`       | `Heap.String` | `BrokerEvents.eventId`, если публикация успешно зарегистрирована; пустая строка до успеха.                                                      |
| `brokerPublishStatus` | `Heap.String` | `not_published`, `published`, `failed` или `disabled`.                                                                                          |
| `brokerPublishedAt`   | `Heap.Number` | Unix ms успешной публикации в core broker; `0`, если публикации еще не было.                                                                    |
| `brokerPublishError`  | `Heap.String` | Последняя безопасная ошибка publish/retry без secret, token, Authorization, cookie, raw `Update` и stack trace с секретами.                     |

Repo: `repos/maxRawUpdates.repo.ts`.

Операции:

- `create(ctx, data)` создает новую row с `brokerPublishStatus='not_published'` или `disabled` и никогда не изменяет raw-поля существующих записей;
- `findByFingerprint(ctx, fingerprint)` возвращает первую row с таким fingerprint или `null`;
- `findRecent(ctx, { limit = 100, updateTypes? })` сортирует `receivedAt desc`, ограничивает `limit` диапазоном `1..500`, фильтрует по `updateType in updateTypes`, если фильтр задан;
- `findById(ctx, id)` возвращает row или `null`;
- `countByUpdateTypeAfter(ctx, updateType, sinceReceivedAt)` использует `MaxRawUpdates.countBy(ctx, { updateType, receivedAt: { $gt: sinceReceivedAt } })`;
- `findBrokerPublishPending(ctx, { limit = 100 })` возвращает rows со статусом `not_published` или `failed`, сортировка `receivedAt asc`;
- `markBrokerPublished(ctx, id, { eventId, eventType, publishedAt })` обновляет только `brokerEvent*`, `brokerPublishStatus`, `brokerPublishedAt`, `brokerPublishError`;
- `markBrokerPublishFailed(ctx, id, { eventType, error })` обновляет только `brokerEventType`, `brokerPublishStatus='failed'` и redacted error;
- repo не вызывает `writeServerLog` для каждого payload, чтобы не дублировать сырые данные MAX в таблицу логов.

Validation в `lib/maxRawUpdates.lib.ts`:

- принимает только object payload, не `null` и не array;
- требует non-empty string `update_type`;
- требует finite numeric `timestamp`;
- не валидирует `update_type` по закрытому enum, потому что MAX API может добавить новые события;
- внешние id (`chat_id`, `user_id`, `message_id`) нормализует в string, если исходное значение string/number; не выполняет арифметику над id и не приводит int64 к JS number;
- не извлекает текст сообщения, callback payload, attachments или данные пользователя в отдельные бизнес-поля;
- не сохраняет `X-Max-Bot-Api-Secret`, `Authorization`, cookies и другие секретные заголовки в `rawMeta`;
- при `max_raw_dedup_policy='fingerprint'` считает fingerprint до записи и пропускает повтор, если row с таким fingerprint уже есть;
- при dedup-повторе не публикует второе broker-событие; если существующая row имеет `brokerPublishStatus='failed'`, повторная публикация выполняется только через retry-контракт;
- после successful raw save при `max_chat_discovery_enabled=true` извлекает `chat_id`/`user_id` и обновляет `MaxChats` через `repos/maxChats.repo.ts`;
- при ошибке валидации не создает row в Heap.

### 8.4 MiniappPageEvents

Heap table: `t__units-aley-bpm-interfaces-max__miniapp_page_event__M8n2Wp`.
Файл: `tables/miniappPageEvents.table.ts`.

Назначение таблицы - audit/raw inbox входящих bootstrap/action событий miniapp-страниц и результата регистрации broker-события. Таблица не является бизнес-хранилищем страниц, не хранит доменное состояние и не выполняет межмодульную доставку.

Поля:

| Поле                  | Тип           | Требование                                                                                         |
| --------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `pageKey`             | `Heap.String` | Ключ miniapp-страницы из `MINIAPP_PAGE_REGISTRY`, searchable disabled.                             |
| `eventType`           | `Heap.String` | `bootstrap` или `action`.                                                                          |
| `action`              | `Heap.String` | Action name для `eventType='action'`, иначе пустая строка.                                         |
| `receivedAt`          | `Heap.Number` | `Date.now()` при приеме события, Unix time в миллисекундах.                                        |
| `maxUserId`           | `Heap.String` | Optional id пользователя из валидированного `WebApp.initData.user.id`, нормализованный в string.   |
| `chatId`              | `Heap.String` | Optional id чата из валидированного `WebApp.initData.chat.id`, нормализованный в string.           |
| `startParam`          | `Heap.String` | `start_param` после server-side validation, обрезается до 512 символов.                            |
| `initDataHash`        | `Heap.String` | Значение `hash` из `WebApp.initData`; raw `initData` не сохраняется.                               |
| `payload`             | `Heap.Any`    | JSON-compatible payload действия, очищенный от `initData`, token, secret и credential-like полей.  |
| `brokerEventType`     | `Heap.String` | Event type для core broker, например `max.miniapp.request.action.submit`.                          |
| `brokerEventId`       | `Heap.String` | `BrokerEvents.eventId`, если публикация успешно зарегистрирована; пустая строка до успеха.         |
| `brokerTargetModules` | `Heap.Any`    | Optional array moduleKey для targeted broker publish; пустой массив = выбор подписчиков broker-ом. |
| `brokerPublishStatus` | `Heap.String` | `not_published`, `published`, `failed` или `disabled`.                                             |
| `brokerPublishedAt`   | `Heap.Number` | Unix ms успешной публикации в core broker; `0`, если публикации еще не было.                       |
| `brokerPublishError`  | `Heap.String` | Последняя безопасная ошибка publish/retry без secret, token, Authorization, cookie и raw initData. |

Repo: `repos/miniappPageEvents.repo.ts`.

Операции:

- `create(ctx, data)` создает новую row и не изменяет payload/context существующих записей;
- `findRecent(ctx, { pageKey?, eventType?, limit = 100 })` сортирует `receivedAt desc`, limit clamp `1..500`;
- `countByPageAfter(ctx, pageKey, sinceReceivedAt)` использует `MiniappPageEvents.countBy`;
- `findBrokerPublishPending(ctx, { limit = 100 })` возвращает rows со статусом `not_published` или `failed`, сортировка `receivedAt asc`;
- `markBrokerPublished(ctx, id, { eventId, eventType, publishedAt })` обновляет только broker-служебные поля;
- `markBrokerPublishFailed(ctx, id, { eventType, error })` обновляет только broker-служебные поля и redacted error;
- repo не вызывает broker API, downstream adapters и не содержит бизнес-логики страниц.

Sanitization:

- raw `WebApp.initData` не пишется в Heap;
- `initDataUnsafe` не пишется в Heap;
- `payload` рекурсивно удаляет keys `token`, `secret`, `password`, `authorization`, `cookie`, `initData`;
- большие payload поля обрезаются до 12000 символов на строку.

### 8.5 MaxChats

Heap table: `t__units-aley-bpm-interfaces-max__max_chat__C7h4Rt`.
Файл: `tables/maxChats.table.ts`.

Назначение таблицы - технический реестр известных MAX-диалогов, групповых чатов и каналов, где бот уже получил хотя бы одно событие или где `chat_id` был явно сохранен через будущий import. MAX API не предоставляет готовый список всех доступных боту чатов, поэтому этот реестр поддерживается проектом самостоятельно.

Поля:

| Поле                       | Тип           | Требование                                                                                                     |
| -------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| `chatId`                   | `Heap.String` | Stable `chat_id` как string, чтобы не терять точность int64; searchable disabled.                              |
| `chatType`                 | `Heap.String` | `dialog`, `chat`, `channel` или `unknown`.                                                                     |
| `status`                   | `Heap.String` | `active`, `removed`, `left`, `closed` или `unknown`.                                                           |
| `title`                    | `Heap.String` | Display title из `GET /chats/{chatId}`, `dialog_with_user`, event payload или fallback `Chat <chatId>`.        |
| `dialogUserId`             | `Heap.String` | Optional user id для direct dialog, если MAX вернул `dialog_with_user` или событие содержит пользователя.      |
| `lastEventTime`            | `Heap.Number` | Последний `Update.timestamp` или `Chat.last_event_time` как пришел от MAX, без нормализации единицы измерения. |
| `lastMessageAt`            | `Heap.Number` | Timestamp последнего сообщения из `MaxChatMessages`; `0`, если история не загружалась.                         |
| `historyMessageCount`      | `Heap.Number` | Материализованный count локального history-cache по `chatId`.                                                  |
| `maxMessagesCount`         | `Heap.Number` | Optional `Chat.messages_count` из MAX; `0`, если неизвестно или неприменимо.                                   |
| `lastHistoryRefreshRunId`  | `Heap.String` | Последний `MaxHistoryRefreshRuns.runId` для этого chatId или пустая строка.                                    |
| `lastHistoryRefreshStatus` | `Heap.String` | `never`, `queued`, `deleting`, `fetching`, `succeeded`, `failed`, `cancelled`.                                 |
| `discoveredAt`             | `Heap.Number` | Unix ms первого обнаружения chatId в этом проекте.                                                             |
| `updatedAt`                | `Heap.Number` | Unix ms последнего обновления registry row.                                                                    |
| `rawChat`                  | `Heap.Any`    | Последний безопасный JSON-compatible объект `Chat`/фрагмент discovery без token/secret/authorization/cookie.   |
| `lastError`                | `Heap.String` | Последняя безопасная ошибка enrichment/refresh без raw token, Authorization header и stack trace с секретами.  |

Repo: `repos/maxChats.repo.ts`.

Операции:

- `upsert(ctx, data)` создает/обновляет `MaxChats` по `chatId`, полученному из raw update или history refresh;
- `upsertFromChatInfo(ctx, chat)` обновляет metadata из `GET /chats/{chatId}`;
- `findRecent(ctx, { limit = 100, status?, type? })` сортирует `updatedAt desc`, limit clamp `1..500`;
- `findByChatId(ctx, chatId)` возвращает row или `null`;
- `countKnown(ctx)` использует `MaxChats.countBy(ctx, {})`;
- `markHistoryRefreshStatus(ctx, chatId, data)` обновляет только refresh/status/counter поля;
- `updateCounters(ctx, chatId, { historyMessageCount, lastMessageAt })` обновляет материализованные counters после batched delete/fetch.

Discovery policy:

- `chat_id` сохраняется при каждом входящем `Update`, где он есть на верхнем уровне, внутри `message.recipient`, `message.chat`, `chat`, `dialog` или другом официальном/будущем объекте MAX с явным `chat_id`;
- события `bot_added`, `bot_started`, `message_created`, `message_callback`, `chat_title_changed`, `user_added` создают или активируют registry row;
- события `bot_removed`, `bot_stopped`, `dialog_removed` помечают row как `removed`/`left`/`closed`, но не удаляют его и не удаляют историю;
- если `GET /chats/{chatId}` возвращает 404/403/removed, row остается в registry с соответствующим status/error, чтобы UI показывал, почему история недоступна;
- Long Polling не используется как способ получить полный список чатов; он может только дать события, из которых также извлекается `chat_id`.

### 8.6 MaxChatMessages

Heap table: `t__units-aley-bpm-interfaces-max__max_chat_message__H6p2Qz`.
Файл: `tables/maxChatMessages.table.ts`.

Назначение таблицы - replaceable history-cache сообщений по известным `chat_id`. Это не источник истины raw-входа: raw события MAX остаются в `MaxRawUpdates`, а `MaxChatMessages` может быть полностью удалена и пересобрана по кнопке `Обновить историю`.

Поля:

| Поле           | Тип           | Требование                                                                                       |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| `chatId`       | `Heap.String` | `chat_id` как string.                                                                            |
| `messageId`    | `Heap.String` | ID сообщения из MAX, если есть; иначе stable fingerprint.                                        |
| `maxTimestamp` | `Heap.Number` | `Message.timestamp` как пришел от MAX, без пересчета секунд/миллисекунд.                         |
| `fetchedAt`    | `Heap.Number` | Unix ms записи в history-cache.                                                                  |
| `source`       | `Heap.String` | `history_refresh` или `webhook_copy`.                                                            |
| `refreshRunId` | `Heap.String` | `MaxHistoryRefreshRuns.runId` для `history_refresh`, иначе пустая строка.                        |
| `senderUserId` | `Heap.String` | Optional sender user id как string.                                                              |
| `fingerprint`  | `Heap.String` | Stable hash raw message для dedup при отсутствии message id или при повторе батча.               |
| `rawMessage`   | `Heap.Any`    | Полный JSON-compatible объект `Message` без удаления будущих полей, но без token/secret headers. |
| `safePreview`  | `Heap.String` | Optional короткий redacted preview для будущего UI; пустая строка, если preview не нужен.        |

Repo: `repos/maxChatMessages.repo.ts`.

Операции:

- `insertManyForRun(ctx, runId, chatId, messages)` вставляет только deduped messages по `chatId + messageId/fingerprint`;
- `findRecentByChat(ctx, chatId, { limit = 100 })` сортирует `maxTimestamp desc`, limit clamp `1..500`;
- `countByChat(ctx, chatId)` использует `MaxChatMessages.countBy(ctx, { chatId })`;
- `findOldestByChat(ctx, chatId)` возвращает самое старое сообщение по `maxTimestamp asc` или `null`;
- `deleteBatchByChat(ctx, chatId, { limit = 500 })` удаляет только rows этого chatId и возвращает `{ deleted, hasMore }`;
- repo не вызывает MAX API и не пишет логи с raw message bodies.

Refresh deletion policy:

- кнопка `Обновить историю` удаляет прежние rows `MaxChatMessages` для выбранного chatId перед загрузкой новой истории;
- удаление выполняется job-итерациями батчами, а не целиком в HTTP handler-е, потому что операция может превысить 10 секунд;
- `MaxRawUpdates` никогда не удаляется history refresh-ем.

### 8.7 MaxHistoryRefreshRuns

Heap table: `t__units-aley-bpm-interfaces-max__max_history_refresh_run__L9r5Bn`.
Файл: `tables/maxHistoryRefreshRuns.table.ts`.

Назначение таблицы - durable state machine для обновления истории MAX сообщений через Chatium jobs.

Поля:

| Поле              | Тип           | Требование                                                                                         |
| ----------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `runId`           | `Heap.String` | Stable id `mhr_<timestamp>_<random>`.                                                              |
| `scope`           | `Heap.String` | `chat` или `all_known`.                                                                            |
| `chatId`          | `Heap.String` | Chat id для `scope='chat'`; пустая строка для aggregate run `all_known`.                           |
| `status`          | `Heap.String` | `queued`, `deleting`, `fetching`, `succeeded`, `failed`, `cancelled`.                              |
| `phase`           | `Heap.String` | `delete_old_messages`, `fetch_messages`, `done`.                                                   |
| `requestedAt`     | `Heap.Number` | Unix ms создания run.                                                                              |
| `startedAt`       | `Heap.Number` | Unix ms первого job execution; `0`, если еще не стартовал.                                         |
| `finishedAt`      | `Heap.Number` | Unix ms завершения; `0`, если не завершен.                                                         |
| `cursorTimestamp` | `Heap.Number` | Timestamp boundary для следующего `GET /messages` batch; `0` для первого запроса.                  |
| `batchSize`       | `Heap.Number` | `1..100`, default `max_history_batch_size`.                                                        |
| `deleted`         | `Heap.Number` | Количество удаленных old cache rows.                                                               |
| `fetched`         | `Heap.Number` | Количество сообщений, полученных от MAX.                                                           |
| `inserted`        | `Heap.Number` | Количество новых rows в `MaxChatMessages`.                                                         |
| `batches`         | `Heap.Number` | Количество выполненных fetch batches.                                                              |
| `lastJobAt`       | `Heap.Number` | Unix ms последней job-итерации.                                                                    |
| `nextJobAt`       | `Heap.Number` | Unix ms следующей запланированной итерации; `0`, если не требуется.                                |
| `lastError`       | `Heap.String` | Безопасная ошибка без bot token, Authorization header, raw message body и stack trace с секретами. |
| `metadata`        | `Heap.Any`    | JSON-compatible counters/diagnostics без секретов.                                                 |

Repo: `repos/maxHistoryRefreshRuns.repo.ts`.

Операции:

- `createQueued(ctx, { scope, chatId?, batchSize })` создает run;
- `findActiveByChat(ctx, chatId)` возвращает последний `queued|deleting|fetching` run;
- `claimNext(ctx, now)` выбирает run с `status=queued|deleting|fetching`, `nextJobAt <= now`, под exclusive lock;
- `markProgress(ctx, runId, patch)` обновляет phase/status/counters/cursor;
- `markSucceeded(ctx, runId)` и `markFailed(ctx, runId, error)` завершают run.

### 8.8 Broker event publication state

MAX-модуль является producer-ом core broker-а с moduleKey `units/aley/bpm/interfaces/max`. После успешной записи raw/audit row он обязан синхронно попытаться зарегистрировать событие через `POST /p/units/aley/bpm/core/api/broker/events/publish`. Межмодульная доставка, подписки, retry consumer-а, notifications и dead-letter находятся в ответственности core broker-а, а не этого проекта.

Публикация в broker не является источником raw-данных. `BrokerEvents.payload` содержит безопасную ссылку на row этого проекта и минимальные индексы для маршрутизации; полный `rawUpdate`, raw `WebApp.initData`, bot token, webhook secret, broker token, cookies и Authorization headers в broker payload/metadata не попадают.

События `MaxRawUpdates`:

```ts
{
  eventType: 'max.<normalized update_type>',
  eventVersion: 1,
  occurredAt: receivedAt,
  aggregateType: 'max.raw_update',
  aggregateId: rawUpdateId,
  idempotencyKey: `max-raw:${fingerprint}`,
  payload: {
    rawUpdateId: string,
    source: 'webhook' | 'long_polling',
    updateType: string,
    maxTimestamp: number,
    receivedAt: number,
    chatId?: string,
    userId?: string,
    fingerprint: string,
    rawRef: { projectRoot: 'p/units/aley/bpm/interfaces/max', table: 'MaxRawUpdates', id: string }
  },
  metadata: { module: 'max' }
}
```

`BrokerEvents.occurredAt` для MAX `Update` использует `receivedAt`, потому что core broker ожидает Unix time в миллисекундах. Оригинальный `Update.timestamp` не нормализуется и передается только как `payload.maxTimestamp`.

`normalized update_type` строится из `Update.update_type`: lowercase, последовательности символов вне `[a-z0-9]` заменяются точкой, повторные точки схлопываются, крайние точки удаляются. Например, `message_created` становится `max.message.created`; unknown future type сохраняется тем же алгоритмом, чтобы подписчики могли матчить `max.*` или более узкий namespace.

События `MiniappPageEvents`:

```ts
{
  eventType: `max.miniapp.${normalizedPageKey}.${eventType === 'bootstrap' ? 'bootstrap' : normalizedAction}`,
  eventVersion: 1,
  occurredAt: receivedAt,
  targetModules: brokerTargetModules,
  aggregateType: 'max.miniapp_page_event',
  aggregateId: miniappPageEventId,
  idempotencyKey: `max-miniapp:${miniappPageEventId}`,
  payload: {
    miniappEventId: string,
    pageKey: string,
    action?: string,
    receivedAt: number,
    maxUserId?: string,
    chatId?: string,
    startParam: string,
    payloadRef: { projectRoot: 'p/units/aley/bpm/interfaces/max', table: 'MiniappPageEvents', id: string }
  },
  metadata: { module: 'max-miniapp' }
}
```

Publish lifecycle:

- если `core_broker_publish_enabled=false`, row сохраняется со статусом `disabled`, событие не публикуется и это не считается ошибкой приема;
- если broker token или module key не настроены, row сохраняется, статус становится `failed`, в лог пишется warning без raw payload и секретов;
- если broker возвращает success, row получает `brokerPublishStatus='published'`, `brokerEventId`, `brokerPublishedAt` и очищенный `brokerPublishError`;
- если broker недоступен или возвращает semantic error, row получает `brokerPublishStatus='failed'`, а внешний webhook/miniapp endpoint все равно возвращает success приема после сохранения raw row;
- retry выполняется только через Admin-only API `POST /api/max/broker/retry` или будущую scheduled job; повторный webhook от MAX не должен создавать второй broker event для того же fingerprint;
- `lib/broker/coreBrokerClient.lib.ts` использует idempotency key core broker-а, поэтому повторный retry одного и того же raw row должен получить существующий `eventId`, а не создать новый факт.

## 9. Настройки

Ключи и значения по умолчанию задаются в `lib/settings.lib.ts`.

| Key                               | Default                           | Нормализация/валидация                                                                                               |
| --------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `project_name`                    | `BPM Interfaces Max`              | На save приводится к string и `trim()`.                                                                              |
| `project_title`                   | `BPM Interfaces Max`              | На save приводится к string и `trim()`.                                                                              |
| `log_level`                       | `Info`                            | Только `Debug`, `Info`, `Warn`, `Error`, `Disable`.                                                                  |
| `logs_limit`                      | `100`                             | Parse positive integer; на save допустимо `1..10000`, хранится строкой.                                              |
| `log_webhook`                     | `{ enable: false, url: '' }`      | Объект; `enable` boolean, `url` string.                                                                              |
| `dashboard_reset_at`              | `null`                            | На чтение `null/invalid` дает `0`; на save требуется неотрицательное число, хранится `Math.floor`.                   |
| `max_bot_access_token`            | `''`                              | Secret. На save trim string; пустое значение означает “не настроено”. Не возвращается клиентам как raw value.        |
| `max_webhook_secret`              | `''`                              | Secret. На save trim string; production webhook reject-ит запросы, если secret не настроен.                          |
| `core_broker_module_token`        | `''`                              | Secret. ModuleAuth token для публикации в core broker; raw value доступен только server-side publisher-у.            |
| `core_broker_publish_enabled`     | `true`                            | Operational boolean. Если false, raw rows сохраняются со статусом broker publish `disabled`.                         |
| `core_broker_module_key`          | `p/units/aley/bpm/interfaces/max` | Operational stable moduleKey, который передается в internal core broker function params.                             |
| `max_receive_mode`                | `webhook`                         | Operational. Только `webhook`, `long_polling`, `disabled`.                                                           |
| `max_update_types`                | `[]`                              | Operational. Array of strings из known MAX update types; пустой массив означает “все события”.                       |
| `max_polling_limit`               | `100`                             | Operational integer `1..1000`, соответствует `GET /updates?limit`.                                                   |
| `max_polling_timeout_sec`         | `30`                              | Operational integer `0..90`, соответствует `GET /updates?timeout`.                                                   |
| `max_polling_interval_sec`        | `5`                               | Operational integer `1..300`, пауза между автоматическими polling cycle.                                             |
| `max_polling_marker`              | `null`                            | Operational nullable int64 marker MAX; `null` означает “получить только последнее обновление”.                       |
| `max_raw_dedup_policy`            | `fingerprint`                     | Operational. Только `none` или `fingerprint`; fingerprint пропускает повторную запись под exclusive lock.            |
| `max_chat_discovery_enabled`      | `true`                            | Operational boolean. Если true, входящие updates обновляют `MaxChats`.                                               |
| `max_history_refresh_enabled`     | `true`                            | Operational boolean. Если false, `POST /api/max/chats/refresh` возвращает semantic error.                            |
| `max_history_batch_size`          | `50`                              | Operational integer `1..100`, соответствует MAX `GET /messages?count`.                                               |
| `max_history_delete_batch_size`   | `500`                             | Operational integer `1..1000`, размер batched delete old cache rows за одну job-итерацию.                            |
| `max_history_job_budget_ms`       | `8000`                            | Operational integer `1000..9000`; одна job-итерация обязана завершаться до Chatium 10s lifetime limit.               |
| `max_history_max_batches_per_job` | `3`                               | Operational integer `1..20`, дополнительный предохранитель от долгих сетевых циклов в одной job-итерации.            |
| `max_miniapps_enabled`            | `true`                            | Operational boolean. Глобально включает SSR/API miniapp-страниц.                                                     |
| `max_miniapp_default_page`        | `root`                            | Operational string. Default miniapp page; пустая строка допустима как “нет default redirect”, иначе key из registry. |
| `max_miniapp_init_data_ttl_sec`   | `600`                             | Operational integer `60..3600`; максимальный возраст `WebApp.initData.auth_date`.                                    |

Runtime-использование настроек:

- `project_name` используется SSR entrypoints для `<title>`, Header `projectTitle` и `AdminSettings`.
- `project_title` присутствует как шаблонная настройка и проверяется интеграционными тестами, но текущие SSR entrypoints не читают его для UI.
- `log_level` используется серверным `logger.lib`, клиентским `window.__BOOT__.logLevel`, `AdminSettings` и всеми log sinks.
- `logs_limit` нормализуется `settings.lib.getLogsLimit`, но текущие API истории логов используют query `limit` и не читают `logs_limit`.
- `log_webhook` используется только `writeServerLog`.
- `dashboard_reset_at` используется `dashboard.lib` для счетчиков после сброса.
- `max_bot_access_token` используется только server-side вызовами MAX API: Long Polling и управление Webhook-подпиской.
- `max_webhook_secret` используется только `POST /api/max/webhook` и управление Webhook-подпиской; значение не пишется в логи, не попадает в `rawMeta` и не должно отправляться в клиентский boot.
- `core_broker_module_token` используется только `lib/broker/coreBrokerClient.lib.ts` для ModuleAuth и не пишется в логи, broker payload, SSR props или browser boot.
- `core_broker_publish_enabled`, `core_broker_module_key`, `max_receive_mode`, `max_update_types`, `max_polling_*`, `max_raw_dedup_policy`, `max_chat_discovery_enabled`, `max_history_*` используются Admin control API и runtime libs.
- `max_miniapps_enabled`, `max_miniapp_default_page`, `max_miniapp_init_data_ttl_sec` используются `lib/miniapps/initData.lib.ts`, `lib/miniapps/registry.lib.ts`, `lib/miniappPageEvents.lib.ts` и SSR entrypoints `miniapps/*/index.tsx`.

Secret keys:

- `max_bot_access_token`;
- `max_webhook_secret`;
- `core_broker_module_token`.

Secret keys не должны возвращаться raw-значениями из `GET /api/settings/list`, `GET /api/settings/get`, `GET /api/max/control/get`, SSR props или browser boot. Для них допускаются только признаки `configured` и validation status.

`getSetting(ctx, key)` возвращает:

- row value, если row найден и `value` не `undefined/null`;
- default для известного key;
- `null` для неизвестного key без row.

`setSetting(ctx, key, value)`:

- валидирует известные ключи;
- неизвестные ключи сохраняет как есть;
- пишет через `settings.repo.upsert`;
- логирует вход/ветку/выход, кроме функций, вызываемых из `logger.lib`.

Дополнительные контракты `settings.lib`:

- `SETTING_KEYS` содержит ключи из таблицы выше, включая secret, MAX operational settings, chat/history settings и broker publish settings.
- `SECRET_SETTING_KEYS` строго содержит `max_bot_access_token`, `max_webhook_secret` и `core_broker_module_token`.
- `LOG_LEVELS` строго `['Debug', 'Info', 'Warn', 'Error', 'Disable']`.
- `getSettingString(ctx, key)` возвращает row value, если это string; иначе `String(DEFAULTS[key] ?? '')`.
- `getLogLevel(ctx)` возвращает только значение из `LOG_LEVELS`; invalid/unknown fallback - `Info`.
- `getLogsLimit(ctx)` принимает positive finite number или `parseInt(string, 10) > 0`; иначе возвращает `100`.
- `getLogWebhook(ctx)` возвращает объект `{ enable:boolean, url:string }`; invalid value заменяется default `{ enable:false, url:'' }`.
- `getDashboardResetAt(ctx)` возвращает `Math.floor(value)`, если value finite number `>=0`; иначе `0`.
- `getAllSettings(ctx)` возвращает объект defaults plus Heap rows, где row с `value !== undefined && value !== null` перекрывает default; для secret keys возвращается только redacted `{ configured:boolean }`.
- `getRawSecretSettingString(ctx, key)` является server-only helper-ом для `SECRET_SETTING_KEYS`, возвращает raw string или `''`, не экспортируется в shared-route и не используется Vue.
- `setSetting(LOG_LEVEL)` принимает только exact `Debug`, `Info`, `Warn`, `Error`, `Disable`; lowercase нормализуется не здесь, а в `api/settings/save`.
- `setSetting(LOGS_LIMIT)` хранит строку нормализованного positive integer и запрещает результат вне `1..10000`.
- `setSetting(PROJECT_NAME|PROJECT_TITLE)` приводит значение к string и `trim()`.
- `setSetting(LOG_WEBHOOK)` требует object, затем нормализует `enable` к boolean with fallback `false`, `url` к string with fallback `''`.
- `setSetting(DASHBOARD_RESET_AT)` требует finite non-negative number-like value and stores `Math.floor`.
- `setSetting(MAX_BOT_ACCESS_TOKEN)` принимает string, trim, хранит raw secret только server-side; пустая строка очищает значение.
- `setSetting(MAX_WEBHOOK_SECRET)` принимает string, trim, пустая строка очищает значение.
- `setSetting(CORE_BROKER_MODULE_TOKEN)` принимает string, trim, хранит raw secret только server-side; пустая строка очищает значение.
- `setSetting(CORE_BROKER_PUBLISH_ENABLED)` нормализует boolean.
- `setSetting(CORE_BROKER_MODULE_KEY)` принимает non-empty moduleKey `p/units/aley/bpm/interfaces/max` по умолчанию.
- `setSetting(MAX_RECEIVE_MODE)` принимает только `webhook`, `long_polling`, `disabled`.
- `setSetting(MAX_UPDATE_TYPES)` принимает array strings, приводит элементы к string и удаляет дубли.
- `setSetting(MAX_POLLING_LIMIT)` нормализует integer `1..1000`.
- `setSetting(MAX_POLLING_TIMEOUT_SEC)` нормализует integer `0..90`.
- `setSetting(MAX_POLLING_INTERVAL_SEC)` нормализует integer `1..300`.
- `setSetting(MAX_POLLING_MARKER)` принимает `null` или finite non-negative integer.
- `setSetting(MAX_RAW_RETENTION_DAYS)` нормализует integer `0..3650`.
- `setSetting(MAX_RAW_DEDUP_POLICY)` принимает только `none` или `fingerprint`.
- `setSetting(MAX_RAW_META_MODE)` принимает только `minimal` или `headers_allowlist`.
- `setSetting(MAX_CHAT_DISCOVERY_ENABLED|MAX_HISTORY_REFRESH_ENABLED)` нормализует boolean.
- `setSetting(MAX_HISTORY_BATCH_SIZE)` нормализует integer `1..100`.
- `setSetting(MAX_HISTORY_DELETE_BATCH_SIZE)` нормализует integer `1..1000`.
- `setSetting(MAX_HISTORY_JOB_BUDGET_MS)` нормализует integer `1000..9000`.
- `setSetting(MAX_HISTORY_MAX_BATCHES_PER_JOB)` нормализует integer `1..20`.
- `setSetting(MAX_MINIAPPS_ENABLED)` нормализует boolean.
- `setSetting(MAX_MINIAPP_DEFAULT_PAGE)` принимает пустую строку или существующий key из `MINIAPP_PAGE_REGISTRY`.
- `setSetting(MAX_MINIAPP_INIT_DATA_TTL_SEC)` нормализует integer `60..3600`.

## 10. Логирование

### 10.1 Severity и log level

Syslog severity:

| Severity | Level       |
| -------- | ----------- |
| `0`      | `emergency` |
| `1`      | `alert`     |
| `2`      | `critical`  |
| `3`      | `error`     |
| `4`      | `warning`   |
| `5`      | `notice`    |
| `6`      | `info`      |
| `7`      | `debug`     |

Порог настроек:

| `log_level` | Max severity | Что проходит |
| ----------- | ------------ | ------------ |
| `Disable`   | `-1`         | Ничего.      |
| `Error`     | `3`          | `0..3`.      |
| `Warn`      | `4`          | `0..4`.      |
| `Info`      | `6`          | `0..6`.      |
| `Debug`     | `7`          | `0..7`.      |

Лог проходит, если `severity >= 0 && severity <= maxSeverity`.

`logger.lib.shouldLogByLevel(configuredLevel, messageSeverity)` и `shared/logger.shouldLog(severity)` обязаны использовать одну и ту же матрицу порогов. Значения severity за пределами `0..7` не логируются клиентским logger-ом; серверный `writeServerLog` фильтрует по фактическому `entry.severity`, но имя level для вывода clamped в `0..7`.

### 10.2 Серверный pipeline

Единый вход: `writeServerLog(ctx, { severity, message, payload? })`.

При проходе порога функция обязана:

1. Вычислить `timestamp = Date.now()` и `level`.
2. Отформатировать строку `[DD.MM.YYYY HH:mm:ss.SSS] [LEVEL] message`.
3. Записать в `ctx.log` только formatted message.
4. Записать в `ctx.account.log(formattedMessage, { level, json })`, где `json.message` всегда содержит исходное message.
5. Записать в Heap `logs`.
6. Отправить WebSocket-событие `{ type: 'new-log', data: LogEntry }` на `getAdminLogsSocketId(ctx)`.
7. Если включен `log_webhook`, отправить fire-and-forget POST.

Payload policy:

- при `Debug` object payload включается в `ctx.account.log(..., { json })` как поля объекта плюс `message`; non-object payload в `ctx.account.log` не разворачивается, но сохраняется ниже;
- при `Debug` payload включается в Heap, WebSocket и webhook;
- при `Info`, `Warn`, `Error` payload не включается: `ctx.account.log` получает `json: { message }`, Heap получает `payload=null`, WebSocket получает `args=[message]`, webhook получает `{ severity, message, timestamp, level }`;
- object payload для Heap сериализуется через `JSON.stringify`, чтобы не получить `[object Object]`;
- string payload для Heap сохраняется строкой;
- отсутствующий payload сохраняется как `null`.

Маппинг `ctx.account.log` level:

| Severity      | Account level |
| ------------- | ------------- |
| `0`, `1`, `2` | `fatal`       |
| `3`           | `error`       |
| `4`           | `warn`        |
| `5`, `6`      | `info`        |
| `7`           | `debug`       |

`getAdminLogsSocketId(ctx)` возвращает стабильный `admin-logs-c2d1e3ce`. Перед передачей на клиент он кодируется через `genSocketId`.

Webhook:

- key `log_webhook`;
- если `enable === true` и `url.trim() !== ''`, URL без схемы получает префикс `https://`;
- метод `POST`;
- body `{ log: { severity, message, timestamp, level, ...payloadPolicy } }`;
- `throwHttpErrors: false`, timeout 10000 ms;
- ошибка webhook не ломает пользовательский request.

### 10.3 Клиентский logger

Файл: `shared/logger.ts`.

Клиент обязан читать `window.__BOOT__.logLevel`; если `window` отсутствует или значение мусорное, применяется `Info`; `-1`, `'-1'` и `LOG_LEVEL_OFF` означают `Disable`.

Экспортируются:

- `LOG_LEVEL_OFF = -1`;
- `SYSLOG_SEVERITY`;
- `shouldLog(severity)`;
- `setLogSink(sink | null)`;
- `logEmergency`, `logAlert`, `logCritical`, `logError`, `logWarning`, `logNotice`, `logInfo`, `logDebug`;
- alias `logWarn = logWarning`;
- `createComponentLogger(componentName)`.

При `Debug` logger передает в console и sink все args. При остальных уровнях оставляет только string args, чтобы payload не утекал в non-debug режим.

`shared/logger.ts` хранит native console до возможного патча `browserRemoteLogger`, чтобы собственные log-функции не зацикливались через перехваченный console. `setLogSink` может вызвать `logDebug` о смене sink; ошибка sink проглатывается и не должна ломать console.

`createComponentLogger(name)` обязан префиксовать все записи первым аргументом `[name]`.

### 10.4 Browser remote logger

Файл: `shared/browserRemoteLogger.ts`.

Remote logger обязан:

- патчить `console.log/info/warn/error/debug`;
- сохранять исходный console и восстанавливать его при teardown;
- перехватывать `window.onerror` и `unhandledrejection`;
- принимать sink entries через `pushSinkEntry`;
- буферизовать логи;
- отправлять batch каждые 2500 ms или при достижении 50 записей;
- хранить максимум 400 записей в буфере, отбрасывая самые старые;
- обрезать client message до 11000 символов;
- включать `clrtUid`, если `window.clrtUid` задан.

Severity для перехваченного console:

| Method                | Severity |
| --------------------- | -------- |
| `error`               | `3`      |
| `warn`                | `4`      |
| `debug`               | `7`      |
| `log`, `info`, другое | `6`      |

`window.onerror` и `unhandledrejection` отправляются как severity `3`, `channel='console'`, methods `window.onerror` и `unhandledrejection`. `pushSinkEntry` отправляет `channel='sink'`, `method=entry.level`. `flush()` не бросает наружу сетевые ошибки. `teardown()` восстанавливает console, `window.onerror`, снимает `unhandledrejection` listener и запускает финальный async flush. Listener `pagehide` добавляется при install и не снимается отдельно.

Miniapp logging policy:

- miniapp-страницы не используют `shared/browserRemoteLogger.ts`, потому что `/api/logger/browser` требует AnyUser;
- server routes `/api/miniapps/*` пишут только факт bootstrap/action, `pageKey`, `action`, `maxUserId`, `chatId`, broker publish status и sanitized error;
- raw `WebApp.initData`, `initDataUnsafe`, bot token, webhook secret, broker module token и credential-like поля payload запрещено писать в `logs`, `ctx.account.log`, WebSocket и external log webhook;
- client-side miniapp shell не пишет raw `initData` в console.

Payload POST:

```ts
{
  clrtUid?: string | null,
  entries: Array<{
    severity: number,
    message: string,
    timestamp: number,
    channel: 'console' | 'sink',
    method?: string
  }>
}
```

### 10.5 Log stream UI

Файлы: `shared/useLogStream.ts`, `shared/logStreamUtils.ts`, `shared/logStreamSocket.ts`.

Нормативное поведение:

- `start()` без `encodedLogsSocketId` ничего не делает, кроме текущего состояния composable; история не загружается;
- история загружается через `GET /api/admin/logs/recent` с `limit=50` только при наличии `encodedLogsSocketId`;
- догрузка использует `GET /api/admin/logs/before` с `beforeTimestamp=<oldest>` и `limit=50`;
- клиент хранит максимум 500 записей;
- отображение сортируется свежими сверху;
- при смене фильтра список очищается и история загружается заново;
- clear очищает локальный список, ставит `oldestLogTimestamp = Date.now()`, `logsHasMore = true`;
- WebSocket поднимается только при наличии `encodedLogsSocketId`;
- online/visibility возвращают попытку переподключения;
- offline или disconnect переводят индикатор в disconnected state;
- ошибки socket/listen не должны ломать страницу.

Дополнительные правила `useLogStream`:

- `selectedLogStream` по умолчанию `all`;
- при фильтре `all` query `severities` не передается;
- `currentLogCount` считает только хранимые `logEntries`, без date divider-ов;
- `displayedLogs` строится через `buildDisplayedLogs`, сортирует записи по `timestamp desc` и вставляет date divider при смене календарного дня;
- `loadMoreLogs()` без `oldestLogTimestamp` не делает запрос и пишет warning;
- параллельные/устаревшие запросы отбрасываются через `logsRequestId`;
- `ingestLocalEntry` всегда вызывает `onEntry` до фильтрации отображения;
- `ingestSocketEntry` при `dedupSocketEcho=true` пропускает записи, где payload выглядит как `{ source:'browser', channel:'sink' }`;
- `toggleExpandCollapseAllLogs()` работает только по строкам типа `log`, не по date divider-ам;
- `stop()` снимает browser listeners, socket lifecycle listeners, subscription listener и subscription `unsubscribe`.

Фильтры:

| Stream  | Severities        | Label            |
| ------- | ----------------- | ---------------- |
| `all`   | `0,1,2,3,4,5,6,7` | `Весь поток`     |
| `info`  | `5,6,7`           | `Инфо`           |
| `warn`  | `4`               | `Предупреждения` |
| `error` | `0,1,2,3`         | `Ошибки`         |

### 10.6 Remote logging composable

Файл: `shared/useRemoteLogging.ts`.

`useRemoteLogging({ enabled = true, onLocalEntry? })`:

- на mount при `enabled=true` создает `createBrowserRemoteLogger({ post: payload => postBrowserLogsRoute.run(ctx, payload) })`;
- устанавливает console/global handlers;
- регистрирует `setLogSink`, который сначала вызывает `onLocalEntry(entry)`, затем `browserRemoteLogger.pushSinkEntry(entry)`;
- на unmount при `enabled=true` вызывает `setLogSink(null)` и `browserRemoteLogger.teardown()`;
- не делает отдельный pre-unmount `flush`; финальный flush выполняется внутри `teardown`;
- при `enabled=false` не трогает console, sink и API.

## 11. API contracts

Реальный URL каждого API равен `/${PROJECT_ROOT}` плюс путь ниже. Все semantic errors возвращаются JSON с `success: false` и `error`, кроме auth, где управление у платформенного auth helper.

Все route-файлы ниже являются file-based route entrypoints с `app.get('/', ...)` или `app.post('/', ...)`. Клиентские Vue-компоненты вызывают их через импортированные `route.run(ctx, body?)` или `route.query(query).run(ctx)`; при таком использовании контракт ответа такой же, как у HTTP-вызова.

Auth:

- `Admin` = первая исполняемая строка handler-а `requireAccountRole(ctx, 'Admin')`;
- `AnyUser` = первая исполняемая строка handler-а `requireAnyUser(ctx)`;
- guest-запрос к AnyUser/Admin API не обязан возвращать JSON из этого раздела, потому что ответ формирует платформенный auth helper.

### 11.1 Settings

| Method/path                     | Auth  | Request                                | Success response                                       | Validation errors                                |
| ------------------------------- | ----- | -------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| `GET /api/settings/list`        | Admin | none                                   | `{ success: true, settings: Record<string, unknown> }` | Catch: `{ success:false, error:String(error) }`. |
| `GET /api/settings/get?key=...` | Admin | query `key: string`                    | `{ success:true, key, value }`                         | `Параметр key обязателен`; catch string.         |
| `POST /api/settings/save`       | Admin | body `{ key: string, value: unknown }` | `{ success:true, key, value: saved }`                  | `Поле key обязательно`; lib validation errors.   |

`POST /api/settings/save` нормализует `log_level`:

| Input                           | Stored    |
| ------------------------------- | --------- |
| `-1`, `0`, `disable`, `Disable` | `Disable` |
| `1`, `info`, `Info`             | `Info`    |
| `2`, `warn`, `Warn`             | `Warn`    |
| `3`, `error`, `Error`           | `Error`   |
| `4`, `debug`, `Debug`           | `Debug`   |

Пустая строка `log_level` передается как `Info`.

Для `POST /api/settings/save` пустой/отсутствующий/non-string `key` возвращает `{ success:false, error:'Поле key обязательно' }`. Для известных ключей дальнейшая нормализация и validation выполняются `settings.lib.setSetting`; unknown key сохраняется как есть.

Secret keys в generic settings API:

- `GET /api/settings/list` возвращает для secret keys только `{ configured:boolean }`, не raw value;
- `GET /api/settings/get?key=max_bot_access_token|max_webhook_secret|core_broker_module_token` возвращает `{ success:true, key, value: { configured:boolean } }`;
- `POST /api/settings/save` не принимает secret keys напрямую и возвращает `{ success:false, error:'Secret settings must be changed through /api/max/secrets/save' }`;
- значения secret keys меняются только через `POST /api/max/secrets/save`.

### 11.2 Logger

| Method/path                | Auth    | Request                                                     | Success response                   | Validation errors                                                               |
| -------------------------- | ------- | ----------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `POST /api/logger/log`     | AnyUser | `{ message: string, severity?: number, payload?: unknown }` | `{ success:true }`                 | `Поле message обязательно`; catch string.                                       |
| `POST /api/logger/browser` | AnyUser | browser batch payload                                       | `{ success:true, written:number }` | `entries` must be non-empty array; max 80 entries; invalid entries are skipped. |

`POST /api/logger/log` clamps numeric severity into `0..7`, default `6`. Empty/blank message is rejected.

`POST /api/logger/log` преобразует non-string `message` через `String(body.message ?? '')`, затем trim. `payload` передается в `writeServerLog` без route-level validation и попадает в выходы только при текущем `log_level=Debug`.

`POST /api/logger/browser`:

- accepts at most 80 entries per request;
- truncates each accepted message to 12000 chars;
- returns `{ success:false, error:'Поле entries должно быть непустым массивом' }`, если `entries` отсутствует, не массив или пустой массив;
- returns `{ success:false, error:'Не более 80 записей за запрос' }`, если `entries.length > 80`;
- skips entries with invalid severity, invalid object shape or blank message;
- clamps numeric severity into `0..7`;
- uses `Date.now()` when entry `timestamp` is absent/invalid;
- coerces non-string `clrtUid` to string, while `null/undefined` become `null`;
- defaults missing/blank `channel` to `console`;
- writes accepted entries as `[browser:<channel>[:method]] <message>`;
- payload contains `{ source:'browser', clrtUid, channel, method, clientTimestamp }`.

### 11.3 Miniapp pages

Miniapp API вызывается только страницами `/miniapps/<pageKey>` внутри MAX. Эти endpoints не используют Chatium-auth и всегда начинают с проверки `WebApp.initData`.

| Method/path                    | Auth                  | Request                                                                | Success response                                       | Validation errors                                                       |
| ------------------------------ | --------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `POST /api/miniapps/bootstrap` | MAX Mini App initData | `{ pageKey:string, initData:string, payload?:unknown }`                | `{ success:true, page, context, brokerPublishStatus }` | Unknown page; missing token; invalid initData; expired initData.        |
| `POST /api/miniapps/action`    | MAX Mini App initData | `{ pageKey:string, initData:string, action:string, payload?:unknown }` | `{ success:true, eventId, brokerPublishStatus }`       | Unknown page; action not allowed; invalid initData; payload validation. |

`lib/miniapps/initData.lib.ts`:

- читает raw `initData` из request body, а не из `initDataUnsafe`;
- требует configured `max_bot_access_token`;
- разбивает `WebAppData` по `&`, требует ровно один `hash`;
- URL-decode всех значений выполняет до сортировки payload строки;
- сортирует параметры по key `a..z`, исключая `hash`;
- строит `launch_params` через `\n`;
- вычисляет `secret_key = HMAC-SHA256('WebAppData', max_bot_access_token)`;
- вычисляет `hex(HMAC-SHA256(secret_key, launch_params))`;
- сравнивает подпись constant-time сравнением;
- парсит `user`, `chat`, `auth_date`, `query_id`, `start_param`;
- требует `auth_date` в Unix seconds и проверяет возраст `Date.now()/1000 - auth_date <= max_miniapp_init_data_ttl_sec`;
- возвращает `MiniappLaunchContext` без raw `initData`.

`POST /api/miniapps/bootstrap`:

- проверяет глобальную настройку `max_miniapps_enabled`;
- находит page definition в `MINIAPP_PAGE_REGISTRY`;
- создает `MiniappPageEvents` row с `eventType='bootstrap'`, `brokerPublishStatus='not_published'` или `disabled`;
- вызывает `publishCoreBrokerEvent(ctx, request)` через `lib/miniappPageEvents.lib.ts`/`lib/broker/coreBrokerClient.lib.ts` и обновляет только broker-служебные поля row;
- возвращает только serializable page metadata, safe launch context и broker publish status;
- не возвращает raw `initData`, hash, bot token, broker token или downstream credentials.

`POST /api/miniapps/action`:

- проверяет `action` по `MINIAPP_PAGE_REGISTRY[pageKey].allowedActions`;
- создает `MiniappPageEvents` row до broker publish со статусом `not_published` или `disabled`;
- публикует событие через `lib/miniappPageEvents.lib.ts`; прямые вызовы доменных BPM-модулей из `api/miniapps/action` запрещены;
- обновляет только broker-служебные поля row: `brokerEventId`, `brokerPublishStatus`, `brokerPublishedAt`, `brokerPublishError`;
- возвращает пользователю event id и broker publish status;
- не выполняет доменную обработку внутри API route.

### 11.4 MAX control and secrets

Оперативные настройки MAX редактируются на главной панели, но все endpoints остаются Admin-only.

| Method/path                         | Auth  | Request                                  | Success response                                                                             | Validation errors                                                      |
| ----------------------------------- | ----- | ---------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `GET /api/max/control/get`          | Admin | none                                     | `{ success:true, settings, status }`                                                         | Catch string.                                                          |
| `POST /api/max/control/save`        | Admin | operational settings subset              | `{ success:true, settings }`                                                                 | Invalid mode/update types/polling/raw/broker settings.                 |
| `POST /api/max/poll/once`           | Admin | none                                     | `{ success:true, accepted, skipped, marker }`                                                | Missing bot token; wrong mode.                                         |
| `POST /api/max/poll/reset-marker`   | Admin | none                                     | `{ success:true, marker:null }`                                                              | Catch string.                                                          |
| `GET /api/max/chats/list`           | Admin | query `limit?, status?, type?`           | `{ success:true, chats, runs, at }`                                                          | Invalid limit/status/type.                                             |
| `POST /api/max/chats/refresh`       | Admin | `{ scope, chatId?: string, batchSize? }` | `{ success:true, runId?, runsCreated, status }`                                              | Missing bot token; disabled history refresh; unknown chat; active run. |
| `POST /api/max/broker/retry`        | Admin | `{ source?, ids?, limit? }`              | `{ success:true, retried, published, failed, skipped }`                                      | Invalid source/ids/limit; missing broker token; broker disabled.       |
| `GET /api/max/secrets/get`          | Admin | none                                     | `{ success:true, botTokenConfigured, webhookSecretConfigured, brokerModuleTokenConfigured }` | Catch string.                                                          |
| `POST /api/max/secrets/save`        | Admin | secret save/clear payload                | `{ success:true, botTokenConfigured, webhookSecretConfigured, brokerModuleTokenConfigured }` | Invalid token/secret/broker token.                                     |
| `POST /api/max/subscription/apply`  | Admin | none                                     | `{ success:true, effectiveWebhookUrl }`                                                      | Missing bot token; missing webhook secret; invalid URL; MAX API error. |
| `POST /api/max/subscription/delete` | Admin | none                                     | `{ success:true, effectiveWebhookUrl }`                                                      | Missing bot token; invalid URL; MAX API error.                         |

`GET /api/max/control/get`:

- возвращает operational settings из раздела 9;
- возвращает status без raw secret values;
- определяет `botTokenConfigured`, `webhookSecretConfigured` и `brokerModuleTokenConfigured` через secret status;
- возвращает broker pending count по `MaxRawUpdates` и `MiniappPageEvents`;
- возвращает chat/history summary: known chat count and latest refresh runs;
- может выполнять `GET /subscriptions` к MAX только если bot token настроен и это не замедляет ответ; при ошибке ставит `subscriptionKnown=null`, а не ломает панель.

`POST /api/max/control/save`:

- не принимает `max_bot_access_token`, `max_webhook_secret` и `core_broker_module_token`;
- нормализует только operational fields;
- при `receiveMode='long_polling'` и известной активной Webhook-подписке возвращает semantic error с подсказкой удалить подписку;
- при `receiveMode='webhook'` не создает подписку автоматически, если `webhookAutoSubscribe !== true`;
- сохраняет пустой `updateTypes` как “all events”.

`POST /api/max/poll/once`:

- разрешен только при `max_receive_mode='long_polling'`;
- требует configured `max_bot_access_token`;
- вызывает MAX `GET /updates` с Authorization header, `limit`, `timeout`, `marker` и `types` из operational settings;
- каждый `Update` передает в `acceptMaxUpdate(ctx, { source:'long_polling', update, marker })`;
- после успешного ответа сохраняет returned `marker` в `max_polling_marker`;
- возвращает количество записанных updates, skipped/dedup updates и publish итоги `brokerPublished/brokerFailed`;
- не запускается параллельно сам с собой; при конкуренции используется exclusive lock.

`POST /api/max/poll/reset-marker` сохраняет `max_polling_marker=null`. Следующий polling cycle по правилам MAX получит только последнее обновление, поэтому UI обязан явно предупреждать о возможном пропуске накопленной очереди.

`GET /api/max/chats/list`:

- первая исполняемая строка handler-а - `requireAccountRole(ctx, 'Admin')`;
- возвращает только registry/cache metadata, без raw message bodies;
- `limit` clamp `1..500`, default `100`;
- `status` допускает `active`, `removed`, `left`, `closed`, `unknown`; пустое значение означает все статусы;
- `type` допускает `dialog`, `chat`, `channel`, `unknown`; пустое значение означает все типы;
- каждая строка `chats[]` содержит `{ chatId, title, type, status, historyMessageCount, maxMessagesCount, lastMessageAt, lastEventTime, lastHistoryRefreshStatus, lastHistoryRefreshRunId, lastError }`;
- `runs[]` содержит последние `MaxHistoryRefreshRuns` для отображения progress в `MaxControlPanel`.

`POST /api/max/chats/refresh`:

- первая исполняемая строка handler-а - `requireAccountRole(ctx, 'Admin')`;
- требует `max_history_refresh_enabled=true`;
- требует configured `max_bot_access_token`, потому что history refresh вызывает MAX `GET /messages`;
- request body: `{ scope:'chat' | 'all_known', chatId?: string, batchSize?: number }`; если legacy client передал numeric `chatId`, route обязан превратить его в string до поиска;
- для `scope='chat'` требует существующий `MaxChats.chatId`; для `scope='all_known'` создает отдельный chat-run для каждого известного `status=active|unknown` chatId;
- если для chatId уже есть active run `queued|deleting|fetching`, возвращает existing `runId` и не создает дубль;
- нормализует `batchSize` в `1..100`, default `max_history_batch_size`;
- не удаляет сообщения и не вызывает MAX API внутри HTTP request; handler только создает `MaxHistoryRefreshRuns`, обновляет `MaxChats.lastHistoryRefreshStatus='queued'` и планирует `jobs/max/history-refresh.ts`;
- success response для одного чата: `{ success:true, runId, runsCreated:1, status:'queued' }`;
- success response для `all_known`: `{ success:true, runId:null, runsCreated, status:'queued' }`;
- ошибки MAX API, batched delete и pagination фиксируются только в run/job status, а не выполняются синхронно в route.

`jobs/max/history-refresh.ts`:

- реализуется через `app.job` и работает итерациями, потому что lifetime одной операции Chatium ограничен 10 секундами;
- каждая итерация вычисляет deadline `Date.now() + max_history_job_budget_ms`, где настройка не может быть больше `9000`;
- захватывает один runnable `MaxHistoryRefreshRuns` через `runWithExclusiveLock` по ключу `max-history-refresh:<chatId>`;
- phase `delete_old_messages`: вызывает `deleteBatchByChat` до исчерпания old rows, достижения deadline или `max_history_delete_batch_size`; только после полного удаления переводит run в `fetch_messages`;
- phase `fetch_messages`: вызывает `GET /messages?chat_id=<chatId>&count=<batchSize>` и последующие страницы с timestamp cursor по официальным `from/to` параметрам MAX; за одну итерацию выполняет не больше `max_history_max_batches_per_job` network batches и останавливается раньше при приближении deadline;
- так как MAX возвращает сообщения в обратном порядке, job считает oldest timestamp в batch и использует его как boundary для следующего older batch; дубли между batches отбрасываются по `messageId` или `fingerprint`;
- termination condition: MAX вернул меньше `batchSize`, batch пустой, все сообщения batch уже были deduped, либо API вернул ошибку доступа к chatId;
- после каждого batch обновляет `MaxHistoryRefreshRuns.fetched/inserted/batches/cursorTimestamp` и `MaxChats.historyMessageCount/lastMessageAt`;
- если работа не завершена до deadline, ставит `nextJobAt=Date.now()` и self-reschedules без busy loop;
- при success ставит run `succeeded`, `phase='done'`, `finishedAt`, `MaxChats.lastHistoryRefreshStatus='succeeded'`;
- при ошибке ставит run `failed`, сохраняет redacted `lastError`, `MaxChats.lastHistoryRefreshStatus='failed'`, не восстанавливает удаленные old rows;
- job никогда не удаляет `MaxRawUpdates` и не пишет raw message bodies в logs.

`POST /api/max/subscription/apply`:

- требует configured bot token и webhook secret;
- вызывает MAX `POST /subscriptions` с `url=effectiveWebhookUrl`, `secret=max_webhook_secret`, `update_types=max_update_types`, если список не пустой;
- при успехе переводит `max_receive_mode` в `webhook`;
- не пишет bot token/webhook secret в логи.

`POST /api/max/subscription/delete`:

- вызывает MAX `DELETE /subscriptions?url=<effectiveWebhookUrl>`;
- при успехе не меняет `max_receive_mode` автоматически, но обновляет status панели;
- после удаления подписки Long Polling становится доступным на стороне MAX.

`POST /api/max/secrets/save`:

- сохраняет/очищает bot token и webhook secret только server-side;
- сохраняет/очищает `core_broker_module_token` только server-side;
- request body принимает `botAccessToken`, `webhookSecret`, `brokerModuleToken` и clear-флаги `clearBotAccessToken`, `clearWebhookSecret`, `clearBrokerModuleToken`;
- не возвращает значения секретов;
- валидирует `webhookSecret` тем же regex, который требует MAX API;
- не валидирует bot token и broker token сетевым запросом при save, чтобы не раскрывать timing/ошибки в UI; проверка выполняется при explicit MAX/Core API action.

### 11.5 MAX Webhook

Webhook endpoint:

| Method/path             | Auth               | Request                                             | Success response                                        | Validation errors                                                                                                  |
| ----------------------- | ------------------ | --------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `POST /api/max/webhook` | MAX webhook secret | header `X-Max-Bot-Api-Secret`, body object `Update` | `{ success:true, id, receivedAt, brokerPublishStatus }` | Secret not configured; invalid secret; payload must be object; `update_type` required; `timestamp` must be number. |

Нормативный публичный URL для подписки MAX строится как `https://<published-domain>/p/units/aley/bpm/interfaces/max/api/max/webhook`.

`POST /api/max/webhook`:

- не использует `requireAnyUser`/`requireRealUser`, потому что вызывается внешним сервером MAX;
- первым действием сверяет `ctx.req.headers['x-max-bot-api-secret']` с настройкой `max_webhook_secret`;
- если `max_webhook_secret` пустой, возвращает `{ success:false, error:'MAX webhook secret is not configured' }` и не пишет row;
- если заголовок отсутствует или не совпадает, возвращает `{ success:false, error:'Invalid MAX webhook secret' }` и не пишет row;
- после успешной проверки валидирует тело как `Update` и вызывает `lib/maxRawUpdates.lib.acceptMaxUpdate(ctx, { source:'webhook', update })`;
- успешный путь обязан завершаться быстрее 30 секунд, сохранять raw row и делать только короткую попытку broker publish; бизнес-обработка входящего события внутри webhook-request не запускается;
- сохраняет `Update` в `MaxRawUpdates.rawUpdate` целиком, включая неизвестные поля и будущие `update_type`;
- после raw save вызывает internal publish из `lib/maxRawUpdates.lib.ts`; failure broker-а не отменяет raw save и не превращает ответ webhook-а в ошибку MAX;
- если в `Update` найден `chat_id`, successful path также обновляет `MaxChats`; failure enrichment-а не отменяет raw save и broker publish;
- возвращает id созданной Heap row, `receivedAt` и итоговый `brokerPublishStatus`;
- пишет краткий server log без raw payload: `MAX update accepted: <updateType>`.

Long Polling реализуется только как server-side transport за Admin-only control API и фоновые/ручные polling cycle. Он не имеет публичного внешнего route; все полученные updates обязаны попадать в тот же `lib/maxRawUpdates.lib.acceptMaxUpdate(ctx, { source:'long_polling', update, marker? })`, чтобы Heap-контракт был единым.

### 11.6 Broker publish retry

`POST /api/max/broker/retry`:

- первая исполняемая строка handler-а - `requireAccountRole(ctx, 'Admin')`;
- request body: `{ source?: 'max_raw_update' | 'miniapp_page_event' | 'all', ids?: string[], limit?: number }`;
- `source` по умолчанию `all`; `limit` нормализуется в диапазон `1..100`, default `50`;
- если `ids` передан, retry выполняется только для этих rows и source должен быть не `all`;
- retry берет только rows со статусами `not_published` или `failed`; `published` и `disabled` учитываются как `skipped`;
- использует exclusive lock, чтобы два admin-запуска не публиковали один raw row одновременно;
- не читает новые события из MAX, не вызывает downstream BPM-модули и не выполняет consumer delivery;
- на success core broker-а обновляет row через `markBrokerPublished`, на ошибку - через `markBrokerPublishFailed`;
- возвращает агрегированные counters `{ retried, published, failed, skipped }` без raw payload и без секретов.

### 11.7 Admin logs and dashboard

| Method/path                       | Auth  | Request                                          | Success response                                         | Validation errors                                                                      |
| --------------------------------- | ----- | ------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET /api/admin/logs/recent`      | Admin | query `limit?`, `severities?`                    | `{ success:true, entries: LogEntry[] }`                  | Invalid `severities`: `Параметр severities должен содержать числа 0..7 через запятую`. |
| `GET /api/admin/logs/before`      | Admin | query `beforeTimestamp`, `limit?`, `severities?` | `{ success:true, entries: LogEntry[], hasMore:boolean }` | Missing/invalid `beforeTimestamp`; invalid `severities`.                               |
| `GET /api/admin/dashboard/counts` | Admin | none                                             | `{ success:true, errorCount, warnCount, resetAt }`       | Catch string.                                                                          |
| `POST /api/admin/dashboard/reset` | Admin | none                                             | `{ success:true, errorCount:0, warnCount:0, resetAt }`   | Catch string.                                                                          |

`limit` for log history is clamped to `1..200`, default `50`. `severities` is comma-separated integers `0..7`; empty/missing means no severity filter. Non-integer parts are ignored during parsing; ошибка возвращается только если после парсинга есть значения вне `0..7`.

`GET /api/admin/logs/before`:

- missing/blank `beforeTimestamp` -> `{ success:false, error:'Параметр beforeTimestamp обязателен' }`;
- `Number(beforeTimestamp)` is `NaN` или `<=0` -> `{ success:false, error:'Параметр beforeTimestamp должен быть положительным числом' }`;
- `hasMore` равен `entries.length === limit`.

`LogEntry` returned to client:

```ts
{
  id?: string,
  severity: number,
  level: string,
  timestamp: number,
  args: unknown[]
}
```

Rows map to `args = [message, payload]` when payload exists, otherwise `[message]`.

Dashboard:

- `GET /api/admin/dashboard/counts` возвращает counts после `dashboard_reset_at`;
- `POST /api/admin/dashboard/reset` записывает `Date.now()` в `dashboard_reset_at` через `settings.lib.setSetting` и возвращает нулевые counters;
- оба endpoint-а catch-ят ошибки как `{ success:false, error:String(error) }`.

### 11.8 Tests

| Method/path                  | Auth    | Request | Response                                                |
| ---------------------------- | ------- | ------- | ------------------------------------------------------- |
| `GET /api/tests/list`        | AnyUser | none    | `{ success:true, categories, at }`                      |
| `GET /api/tests/unit`        | AnyUser | none    | `{ success, kind:'unit', results, summary, at }`        |
| `GET /api/tests/integration` | AnyUser | none    | `{ success, kind:'integration', results, summary, at }` |

`GET /api/tests/list` возвращает три категории:

- `unit`: `UNIT_TEST_BLOCKS`, `tests=flattenCatalogBlocks(UNIT_TEST_BLOCKS)`;
- `integration-server`: `INTEGRATION_SERVER_TEST_BLOCKS`;
- `integration-http`: `[INTEGRATION_HTTP_TEST_BLOCK]`.

`/api/tests/http` не существует. HTTP-проверки страниц выполняются только клиентом `/web/tests`.

`results` rows:

```ts
{ id: string, title: string, passed: boolean, error?: string }
```

`summary`:

```ts
{ passed: number, failed: number, total: number }
```

Каждый failed row из unit/integration прогонов логируется через `logTestRunFailures` с severity `3`.

`GET /api/tests/integration` после `runTemplateIntegrationChecks(ctx)` добавляет meta-row `api_tests_integration_shape`. Для non-admin ctx проверки admin-branch в `integrationApiSuite` возвращаются как failed rows с текстом `нужна роль Admin (ctx.user.is("Admin"))`, а не пропускаются. Текущее поведение: `api_tests_list_shape` тоже находится в admin-branch раннера, хотя сам endpoint `GET /api/tests/list` имеет доступ `AnyUser`.

## 12. Тестовый каталог

`shared/testCatalog.ts` является runtime-каталогом, а этот раздел - нормативным описанием его состава. `api/tests/list`, `TestsPage` и раннеры обязаны оставаться синхронизированными.

Каталог состоит из блоков `{ id, title, description?, tests }`, где каждый test имеет `{ id, title }`. `flattenCatalogBlocks(blocks)` обязан сохранять порядок блоков и порядок тестов внутри блоков.

### 12.1 Unit blocks

| Block                | Test IDs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unit-routes`        | `routes_getFullUrl_dot_slash`, `routes_getFullUrl_slash`, `routes_getFullUrl_web_admin_rel`, `routes_getFullUrl_web_admin_abs`, `routes_getFullUrl_web_admin_bare`, `routes_getFullUrl_empty`, `routes_withProjectRoot_rel`, `routes_withProjectRoot_bare`, `routes_withProjectRoot_dot`, `routes_withProjectRoot_empty`, `routes_subroute_omit`, `routes_subroute_slash`, `routes_subroute_edit`, `routes_subroute_slash_edit`, `routes_subroute_nested`, `routes_PROJECT_ROOT`, `routes_ROUTES_KEYS_match_PATHS`, `routes_no_domain_in_urls`, `routes_internal_start_with_dot` |
| `unit-project`       | `project_getPageTitle_basic`, `project_getPageTitle_empty_page`, `project_getPageTitle_empty_project`, `project_getPageTitle_unicode`, `project_getHeaderText_basic`, `project_getHeaderText_empty`, `project_getHeaderText_special`, `project_constants_non_empty`, `project_page_names_distinct`                                                                                                                                                                                                                                                                               |
| `unit-log-level`     | `logLevel_script_Debug`, `logLevel_script_Info`, `logLevel_script_Warn`, `logLevel_script_Error`, `logLevel_script_Disable`, `logLevel_script_preserves_boot`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `unit-logger-lib`    | `loggerLib_getAdminLogsSocketId_format`, `loggerLib_getAdminLogsSocketId_stable`, `loggerLib_shouldLogByLevel_matrix`                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `unit-shared-logger` | `shared_shouldLog_Disable_all`, `shared_shouldLog_Error`, `shared_shouldLog_Warn`, `shared_shouldLog_Info`, `shared_shouldLog_Debug`, `shared_shouldLog_no_window`, `shared_shouldLog_invalid_numeric`, `shared_shouldLog_invalid_string`, `shared_setLogSink_roundtrip`, `shared_setLogSink_throw_keeps_console`, `shared_componentLogger_prefix`, `shared_logWarn_alias`                                                                                                                                                                                                       |
| `unit-max-control`   | `max_settings_defaults`, `max_settings_receive_mode_validation`, `max_settings_update_types_empty_all`, `max_settings_polling_bounds`, `max_settings_secret_redaction`, `max_effective_webhook_url`, `max_raw_fingerprint_stable`, `max_chat_id_extraction`, `max_history_settings_bounds`, `max_history_pagination_cursor`, `max_broker_event_type_mapping`, `max_broker_payload_redaction`                                                                                                                                                                                     |
| `unit-miniapps`      | `miniapp_registry_keys_valid`, `miniapp_registry_routes_match_keys`, `miniapp_root_page_contract`, `miniapp_core_fixture_contract`, `miniapp_init_data_hash_valid`, `miniapp_init_data_hash_invalid`, `miniapp_init_data_expired`, `miniapp_sanitize_payload_removes_secrets`, `miniapp_action_allowlist`, `miniapp_broker_event_type_mapping`                                                                                                                                                                                                                                   |
| `unit-catalog`       | `catalog_block_ids_unique`, `catalog_test_ids_unique`, `catalog_blocks_have_tests`, `catalog_flatten_order`, `catalog_unit_ids_match_runner`                                                                                                                                                                                                                                                                                                                                                                                                                                     |

`catalog_unit_ids_match_runner` требует, чтобы множество unit IDs в каталоге совпадало с IDs, которые реально создает `runTemplateUnitChecks`, за исключением самого sync-check ID.

`runTemplateUnitChecks(extraRunnerIds = [])`:

- запускает `runRoutesChecks`, project checks, logLevel script checks, logger.lib pure checks, shared/logger checks и catalog integrity checks;
- не обращается к Heap и не требует реального `ctx`;
- временно мокает `globalThis.window` только для проверки browser logger и очищает его после проверок;
- возвращает только строки `{ id, title, passed, error? }`;
- не пишет серверные логи сам; логирование failed rows делает API wrapper `/api/tests/unit`.

Unit checks покрывают:

- route normalization и отсутствие домена в `getFullUrl`;
- `getPageTitle`, `getHeaderText` и непустоту page constants;
- однострочный script `window.__BOOT__.logLevel` без перезаписи существующего `__BOOT__`;
- `getAdminLogsSocketId` и матрицу `shouldLogByLevel`;
- клиентскую матрицу `shouldLog`, `setLogSink`, устойчивость к sink error, component logger prefix и alias `logWarn`.
- нормализацию operational MAX/broker/history settings, redaction secret keys, стабильность raw fingerprint, chat id extraction, history pagination cursor, broker event type mapping и payload redaction.
- miniapp registry, root page contract, core fixture contract, server-side validation `WebApp.initData`, payload sanitization, action allowlist и broker event mapping.

### 12.2 Server integration blocks

| Block                | Test IDs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `int-settings-lib`   | `settings_get_project_name`, `settings_get_log_level`, `settings_getSetting_branches`, `settings_getLogsLimit_parse`, `settings_getLogWebhook`, `settings_getDashboardResetAt`, `settings_getAllSettings`, `settings_setSetting_log_level`, `settings_setSetting_logs_limit`, `settings_setSetting_project_fields`, `settings_setSetting_webhook`, `settings_setSetting_dashboard_reset`, `settings_setSetting_unknown_key`, `regression_getLogLevel_no_recursion`, `regression_getSetting_no_recursion`                                                         |
| `int-settings-repo`  | `settings_repo_findAll`, `settings_repo_findByKey`, `settings_repo_upsert_create_update`, `settings_repo_deleteByKey`                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `int-logs-repo`      | `logs_repo_findAll`, `logs_repo_create_and_read`, `logs_repo_findBeforeTimestamp_where`, `logs_repo_count_severities`, `regression_logs_create_no_recursion`                                                                                                                                                                                                                                                                                                                                                                                                     |
| `int-logger-lib-ctx` | `logger_admin_socket`, `logger_writeServerLog_filter`, `logger_writeServerLog_socket`, `logger_writeServerLog_webhook_url`, `regression_payload_not_object_object`                                                                                                                                                                                                                                                                                                                                                                                               |
| `int-dashboard`      | `dashboard_get_counts`, `dashboard_reset`, `dashboard_flow_logs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `int-max-raw`        | `max_raw_create_webhook`, `max_raw_create_long_polling`, `max_raw_reject_invalid_update`, `max_raw_find_recent`, `max_raw_count_by_type`, `max_raw_dedup_fingerprint`, `max_raw_discovers_chat`, `max_raw_broker_publish_success`, `max_raw_broker_publish_failure_marks_row`                                                                                                                                                                                                                                                                                    |
| `int-max-control`    | `max_control_get_redacts_secrets`, `max_control_save_receive_mode`, `max_control_save_polling_bounds`, `max_control_save_broker_settings`, `max_control_save_history_settings`, `max_chats_list_returns_counters`, `max_chats_refresh_creates_run`, `max_history_refresh_job_deletes_then_fetches_batches`, `max_history_refresh_reschedules_before_10s`, `max_secrets_get_redacted`, `max_secrets_save_clear`, `max_poll_once_requires_token`, `max_poll_once_requires_long_polling`, `max_broker_retry_failed_rows`, `max_subscription_apply_requires_secrets` |
| `int-miniapps`       | `miniapp_bootstrap_requires_valid_init_data`, `miniapp_bootstrap_uses_core_fixture_init_data`, `miniapp_root_bootstrap_returns_aley_bpm_title`, `miniapp_bootstrap_returns_view_model`, `miniapp_bootstrap_publishes_broker_event`, `miniapp_action_requires_allowed_action`, `miniapp_action_writes_audit_event`, `miniapp_action_publishes_broker_event`, `miniapp_broker_publish_failure_marks_event`, `miniapp_no_raw_init_data_in_logs`                                                                                                                     |
| `int-api-contract`   | `api_settings_list`, `api_settings_get`, `api_settings_save_validation`, `api_logger_log`, `api_miniapps_bootstrap`, `api_miniapps_action`, `api_max_control_get`, `api_max_control_save`, `api_max_chats_list`, `api_max_chats_refresh`, `api_max_broker_retry`, `api_max_secrets_get`, `api_max_secrets_save`, `api_admin_logs_recent`, `api_admin_logs_before`, `api_admin_dashboard_counts`, `api_tests_list_shape`, `api_tests_unit_shape`, `api_tests_integration_shape`                                                                                   |
| `int-e2e`            | `e2e_settings_name_roundtrip`, `e2e_log_level_filters_storage`, `e2e_logs_pagination`, `e2e_dashboard_reset_flow`, `e2e_log_payload_roundtrip`                                                                                                                                                                                                                                                                                                                                                                                                                   |

`runTemplateIntegrationChecks(ctx)`:

- выполняется с реальным `ctx`, Heap и route `.run(ctx)`;
- вычисляет `admin = ctx.user?.is?.('Admin') === true`;
- проверяет settings lib/repo, logs repo, MAX raw/control/chat/history layers, broker publisher, miniapp layers, dashboard lib, logger lib и API contracts;
- временно создает тестовые rows/settings и удаляет только те settings, для которых есть explicit cleanup;
- может оставлять служебные log rows, потому что logs table является runtime журналом;
- для non-admin не вызывает admin-branch проверок и добавляет failed rows с текстом `нужна роль Admin (ctx.user.is("Admin"))`;
- `api_tests_unit_shape` проверяет `runTemplateUnitChecks()` локально, не делает HTTP/route вызов `/api/tests/unit`;
- `e2e_logs_pagination` и `e2e_log_payload_roundtrip` для non-admin возвращают passed=true без Admin API;
- `logTestRunFailures(ctx, logPath, results)` пишет каждый failed row с severity `3`, message `[<logPath>] FAIL <id>: <title> — <error>`.

### 12.3 HTTP integration block

Block `int-http-pages`:

| Test ID       | Path           | Required fragments                                                                                                       |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `index`       | `/`            | `window.__BOOT__`, `BPM Interfaces Max`                                                                                  |
| `web-admin`   | `/web/admin`   | If final URL is admin: `window.__BOOT__`, `Админка`; otherwise login/redirect text is accepted.                          |
| `web-profile` | `/web/profile` | If final URL is profile: `window.__BOOT__`, `Профиль`; otherwise login text is accepted.                                 |
| `web-login`   | `/web/login`   | `Вход`                                                                                                                   |
| `web-tests`   | `/web/tests`   | `window.__BOOT__`, `units-aley-bpm-interfaces-max-page`                                                                  |
| `miniapp-*`   | registry route | For each enabled `MINIAPP_PAGE_REGISTRY` page: `max-web-app.js`, `window.__MINIAPP_BOOT__`; for `root` also `A/Ley BPM`. |

HTTP helper behavior:

- `HTTP_PATH_BY_TEST_ID` задает path для базовых страниц, а miniapp HTTP checks добавляются из `MINIAPP_PAGE_REGISTRY`;
- `HTTP_HTML_SNIPPETS` задает минимальные fragments для обычных страниц;
- `httpPagePassed(testId, res, html)` сначала требует `res.ok`, иначе `HTTP <status>`;
- для `web-admin`, если final URL содержит `/web/admin`, требуются `__BOOT__` и `Админка`; иначе принимается `Вход` или `Перенаправление`;
- для `web-profile`, если final URL содержит `/web/profile`, требуются `__BOOT__` и `Профиль`; иначе принимается `Вход` или `login`;
- для enabled miniapp pages требуются shell fragments, но не требуется successful bootstrap без реального `WebApp.initData`;
- для `miniapps/root` SSR HTML обязан содержать `A/Ley BPM`;
- неизвестный test ID без snippets считается passed, если HTTP status ok.

### 12.4 Test UI state

`shared/useTestSuites.ts`:

- default tab: `unit`;
- хранит отдельные result arrays для `unit`, `integration`, `http`;
- group loading flags: `unitLoading`, `integrationLoading`, `httpPagesLoading`;
- global loading flags: `runAllTestsLoading`, `runTabTestsLoading`;
- single-run lock: `{ group, id } | null`;
- section open state keyed as `<tab>:<blockId>`, первая секция каждой вкладки раскрыта по умолчанию;
- метрики считаются из каталога и результатов: `total`, `passed`, `failed`, `skipped`;
- `runAllTestsOnCurrentTab()` запускает только активную вкладку;
- `runAllTests()` запускает unit, затем server integration, затем HTTP pages;
- при fetch/route error добавляет failed row `fetch` или failed row конкретного `testId`;
- одиночный запуск unit/integration фактически получает полный API response и upsert-ит одну строку по `testId`;
- HTTP group fetch-ит все страницы последовательно; одиночный HTTP fetch-ит один path.

`shared/testSuiteHelpers.ts`:

- `rowVisual` мапит отсутствие result в `pending`/`ОЖИД`, success в `OK`, fail в `FAIL`;
- `blockRollup` формирует labels `не запускали`, `N пройдено, M с ошибкой`, `N/M пройдено, K без прогона`, `все N пройдены`;
- `upsertTestResults` заменяет строки по `id`, сохраняя Map insertion order;
- `summarizeRows` возвращает `{ total, passed, failed, todo: 0 }`.

## 13. Tooling и type shims

Служебные файлы проекта также входят в область действия спеки.

| Файл              | Нормативное назначение                                                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.json`   | TypeScript/Vue конфигурация проекта: `target/module ESNext`, `moduleResolution bundler`, `rootDir/baseUrl .`, path alias `/* -> ./*`, `jsx preserve`, `strict false`, include `**/*.ts`, `**/*.tsx`, `**/*.vue`, `vue-shim.d.ts`. |
| `jsx.d.ts`        | Локальные определения Chatium JSX, `*.vue`, глобального `window.__BOOT__` и минимального `app.html/get/post/job`.                                                                                                                 |
| `vue-shim.d.ts`   | Локальные Vue type shims и минимальные `app.Req`, `app.Ctx`, `RichUgcCtx` для проекта.                                                                                                                                            |
| `.dir.json`       | Метаданные каталога в workspace; текущее `name` равно `[INWORK] p/units/aley/bpm/interfaces/max`.                                                                                                                                 |
| `.workspace.json` | Включает workspace feature `heap`; не удалять, пока проект использует Heap tables.                                                                                                                                                |
| `.CHATIUM-LLM.md` | Краткий LLM-контекст; должен ссылаться на этот spec-as-source как источник истины.                                                                                                                                                |

Эти файлы не должны становиться местом бизнес-логики. Их изменения требуют проверки импорта Vue/TSX и, если меняется runtime-поведение или доступность Heap, обновления соответствующих разделов спеки.

`tsconfig.json` дополнительно обязан сохранять `lib: ["ESNext", "DOM", "DOM.Iterable"]`, `allowJs:false`, `allowSyntheticDefaultImports:true`, `experimentalDecorators:true`, `esModuleInterop:true`, `skipLibCheck:true`, `forceConsistentCasingInFileNames:true`, `noUncheckedIndexedAccess:false`, `vueCompilerOptions.target:3.5`, `globalTypesPath:"./node_modules/.volar/vue-global-temp.d.ts"`, `exclude: []`.

Type shims не должны подменять реальные runtime imports. Они нужны только для локальной проверки проекта без полных типов Chatium/Vue:

- `jsx.d.ts` расширяет JSX intrinsic elements, объявляет `*.vue`, `Window.__BOOT__`, глобальный `app.html/get/post/job`;
- `vue-shim.d.ts` объявляет минимальные Vue composition API функции, `app.Req`, `app.Ctx`, `RichUgcCtx`.

## 14. Стили, boot и assets

Визуальный язык: темный CRT-интерфейс с нейтральными темными фонами, мягким красным акцентом, FontAwesome icons и моноширинным шрифтом `Share Tech Mono`.

Общие требования:

- Tailwind CDN `/s/static/lib/tailwind.3.4.16.min.js` и FontAwesome CDN `/s/static/lib/fontawesome/6.7.2/css/all.min.css` подключаются в страницах, где их использует UI.
- Google font `Share Tech Mono` подключается через `fonts.googleapis.com`/`fonts.gstatic.com` на страницах с CRT UI.
- Header logo использует внешний thumbnail `https://fs-thb03.getcourse.ru/fileservice/file/thumbnail/h/246c9167ba22ef571b50a2a795ee1186.png/s/300x/a/565681/sc/95`.
- `styles.tsx -> baseHtmlStyles` используется login page и задает светлый tiled background image `https://fs.cdn-chatium.io/thumbnail/image_bXkpfHZFGu.2393x2250.png/s/400x400`.
- Scrollbar styling живет в `styles.tsx -> customScrollbarStyles`.
- `AdminPage` и `TestsPage` используют fixed viewport layout: корневой `.app-layout`, `<main>` и `.ap`/`.tp` занимают полную ширину; основной вертикальный скролл находится в левой колонке content-wrapper, лог-монитор скроллится отдельно.
- Miniapp pages используют compact mobile-first layout без CRT hero, Header и Footer; основной shell обязан корректно работать от 375 px ширины, учитывать safe-area и не требовать desktop viewport.
- На узких экранах layout может переходить в одноколоночный режим и возвращать скролл основному `<main>`.
- Boot loader обязан скрываться через `window.hideAppLoader`, после чего страницы реагируют на `bootloader-complete`.
- Страницы не должны показывать Header до завершения boot loader.

`shared/preloader.ts`:

- экспортирует `getPreloaderStyles()`, `getPreloaderScript()`, `getPreloaderHTML()`;
- boot sequence пишет строки `Инициализация системы...`, `Парсинг HTML документа...`, отслеживает Tailwind, FontAwesome, Google Fonts, затем `Компоненты загружены`, `Инициализация Vue.js...`, `Проверка аутентификации...`, `Система готова к работе`;
- completion запускается на `window.load` или fallback timeout 3000 ms;
- `hideBootLoader()` добавляет `#boot-loader.collapsing`, `body.boot-complete`, через 400 ms скрывает loader, выставляет `window.bootLoaderComplete = true` и dispatch-ит `bootloader-complete`.

CSS-фрагменты `pagecss/*`:

- `headerCss1.ts`, `headerCss2.ts` - Header, logout modal visibility classes and responsive header layout;
- `homeBootCss.ts`, `homePageCss1.ts`, `homePageCss2.ts` - главная, hero typing, geometric/crt фон;
- `miniappPageCss.ts` - общий miniapp shell, compact layout, safe-area, loading/error states;
- `profilePageCss1.ts`, `profilePageCss2.ts` - profile page layout/card;
- `adminPageCss1.ts`, `adminPageCss2.ts`, `adminPageCss3.ts` - admin layout, cards, counters, settings, log monitor;
- `testsPageCss1.ts`..`testsPageCss4.ts` - tests toolbar, metrics, tab panels, log monitor.

CSS-фрагменты не импортируют runtime code. Если UI-класс удаляется из Vue template, соответствующий CSS-фрагмент должен быть проверен на мертвые правила.

## 15. Правила изменений

Любое изменение проекта должно поддерживать этот порядок истинности:

1. Обновить этот spec-as-source файл, если меняется поведение, контракт, данные, права, UI-flow, тесты или структура.
2. Обновить код.
3. Обновить старые docs только если они остаются пользовательской навигацией или operational how-to.
4. Запустить релевантные проверки.

Минимальные проверки по типу изменения:

| Изменение            | Проверки                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes/links         | `GET /api/tests/unit`, HTTP-вкладка `/web/tests`.                                                                                                              |
| Settings/data        | `GET /api/tests/integration` под Admin.                                                                                                                        |
| Logging              | `GET /api/tests/integration` под Admin, ручная проверка admin log monitor.                                                                                     |
| UI pages             | Открыть затронутые SSR pages, проверить boot, Header, auth redirects.                                                                                          |
| Tests catalog        | `GET /api/tests/list`, `GET /api/tests/unit`, визуально `/web/tests`.                                                                                          |
| Browser logging      | Авторизованная страница с remote logger, проверка `/api/logger/browser` и echo/dedup в мониторе.                                                               |
| Admin dashboard      | `GET /api/admin/dashboard/counts`, `POST /api/admin/dashboard/reset`, live increment error/warn.                                                               |
| MAX control panel    | Admin-view `/web/admin`, `GET/POST /api/max/control/*`, `POST /api/max/broker/retry`, secret redaction, переключение `webhook`/`long_polling`/`disabled`.      |
| MAX webhook/raw data | `POST /api/max/webhook` с valid/invalid `X-Max-Bot-Api-Secret`, проверка row в `MaxRawUpdates`, broker publish status/event id, отсутствие raw payload в logs. |
| MAX chats/history    | `GET /api/max/chats/list`, `POST /api/max/chats/refresh`, job iteration, batched delete/fetch, 10s lifetime guard, counters in UI.                             |
| Miniapp page         | SSR `/miniapps/<pageKey>`, `POST /api/miniapps/bootstrap`, `POST /api/miniapps/action`, valid/invalid `WebApp.initData`, audit row, broker event registration. |
| Copy-template docs   | Проверить раздел 15, README и legacy docs, которые остаются навигацией.                                                                                        |

Запрещено:

- добавлять новый API без строки в разделе 11;
- добавлять новую настройку без строки в разделе 9;
- добавлять miniapp-страницу без строки в `MINIAPP_PAGE_REGISTRY`, route `miniapps/<pageKey>/index.tsx` и broker event contract;
- менять Heap schema/table ID без раздела 8 и миграционного комментария;
- отдавать `max_bot_access_token`, `max_webhook_secret` или `core_broker_module_token` raw-значением в SSR props, browser boot, logs, generic settings API или operational control API;
- доверять `window.WebApp.initDataUnsafe` без server-side validation `WebApp.initData`;
- размещать доменную BPM-обработку внутри `miniapps/*`, browser/shared code или route-файлов `api/miniapps/*`;
- передавать данные miniapp-страниц в другие модули минуя `lib/miniappPageEvents.lib.ts`, `lib/broker/coreBrokerClient.lib.ts` и core broker;
- добавлять локальную очередь исходящей доставки MAX-сообщений/действий в этом модуле без отдельного изменения продуктового и broker-контракта;
- вызывать доменные BPM-модули напрямую из MAX webhook, polling cycle или miniapp API вместо публикации события в core broker;
- выполнять refresh истории сообщений синхронно внутри HTTP route вместо `jobs/max/history-refresh.ts`;
- удалять `MaxRawUpdates` или broker events при обновлении `MaxChatMessages`;
- использовать deprecated `GET /chats` как источник списка чатов; список строится из сохраненных `chat_id` и enrichment по `GET /chats/{chatId}`;
- импортировать серверные слои в Vue;
- отключать remote logging на защищенных страницах без явного изменения раздела 10;
- удалять тест ID из раннера или каталога без синхронного изменения раздела 12;
- добавлять CSS runtime logic в `pagecss/*`;
- добавлять новый shared composable без описания его ownership/lifecycle в этой спецификации;
- добавлять retention/pruning/rate limiting логов без явного контракта и тестов.

## 16. Границы реализации

MAX-модуль реализует интерфейсный adapter между MAX Bot/Mini Apps и event-driven контуром Aley BPM. Его зона ответственности - принять внешний технический payload, проверить транспортный/miniapp-контекст, сохранить raw/audit row, извлечь безопасные индексы, зарегистрировать факт в core broker и дать Admin-у operational controls для диагностики приема.

Модуль владеет:

- MAX Webhook endpoint и Long Polling control cycle;
- server-side вызовами MAX API для webhook subscriptions, polling, `GET /chats/{chatId}` и `GET /messages`;
- raw inbox `MaxRawUpdates` и audit inbox `MiniappPageEvents`;
- техническим registry известных MAX чатов/диалогов/каналов и replaceable history-cache сообщений;
- MAX Mini Apps root page, registry and page event interface logic;
- публикацией безопасных producer events в core broker;
- Admin-only controls для режима приема, подписки, polling, broker retry, секретов, истории и логов.

Модуль не владеет:

- доменной BPM-обработкой входящих сообщений, callback-ов или miniapp actions;
- бизнес-состоянием задач, заявок, процессов, пользователей BPM или решений downstream-модулей;
- межмодульной delivery queue, consumer retry, dead-letter, subscriptions и notification lifecycle;
- локальной очередью исходящих MAX-сообщений/действий от системы пользователю;
- авторизацией Chatium-пользователей за пределами стандартных `requireAnyUser`, `requireRealUser`, `requireAccountRole`;
- хранением raw MAX token, webhook secret, broker module token, raw `WebApp.initData`, Authorization/cookie headers в browser-visible данных, broker payload или логах.

Связь с `p/units/aley/bpm/core` выполняется только через публичный broker publish contract core-а. MAX-модуль не импортирует tables/repos/lib из core, не пишет напрямую в core Heap и не пытается самостоятельно вычислять подписчиков. При недоступности core broker-а raw/audit row остается сохраненной, а retry выполняется через Admin-only `POST /api/max/broker/retry` или будущий явно описанный scheduled retry.

Новая miniapp-страница добавляется только как интерфейсный surface: строка в `MINIAPP_PAGE_REGISTRY`, route `miniapps/<pageKey>/index.tsx`, payload/event contract, тесты и обновление этого раздела при изменении границ. Если странице нужен доменный workflow, он описывается как broker event/consumer contract в отдельном BPM-модуле, а не реализуется внутри miniapp page.

Новая функция отправки данных пользователю через MAX не может появиться как “утилита отправки сообщения” внутри webhook, polling или miniapp API. Она требует отдельного command/event contract: кто публикует команду, какой moduleKey ее исполняет, какие MAX API methods вызываются, где хранится результат и как core broker delivery lifecycle связан с MAX API response.

## 17. Остаточные ограничения

- Login page не подключает browser remote logger, потому что `/api/logger/browser` требует AnyUser.
- Home page публичная и всё равно устанавливает browser remote logger; для Guest отправка `/api/logger/browser` может получить auth-ответ платформы и должна быть проглочена без поломки страницы.
- API semantic errors возвращают JSON `success:false`; HTTP status code платформой явно не нормализован в этой спецификации.
- Некоторые server integration checks зависят от роли Admin и состояния Heap.
- WebSocket lifecycle callbacks зависят от возможностей платформенного socket client; если callbacks недоступны, offline state поддерживается через browser events и ошибки подключения.
- Logs Heap table не имеет retention/pruning. История API ограничивается query `limit`, клиентским MAX 500 и buffer MAX 400, но серверные rows не чистятся автоматически.
- Browser logger не имеет отдельного rate limit, кроме batch max 80 на сервере, batch max 50 и buffer max 400 на клиенте.
- `useRemoteLogging` не использует `sendBeacon`; финальный flush при teardown async и может не завершиться при жестком закрытии вкладки.
- `project_title` и `logs_limit` существуют как настройки шаблона и покрыты тестами, но текущий UI/runtime почти не использует их напрямую.
- HTTP-проверки страниц выполняются в браузере `/web/tests`; отдельного server-side `/api/tests/http` нет.
- Старые документы `docs/architecture.md`, `docs/api.md`, `docs/data.md`, `docs/imports.md`, `docs/ADR/*` остаются полезными справочниками, но не являются источником истины при расхождении с этой спецификацией.
- Long Polling в MAX ограничен скоростью и сроком хранения событий, поэтому режим `long_polling` считается диагностическим/резервным; production-default остается `webhook`.
- Главная operational panel показывает только статус секретов, поэтому диагностика ошибок MAX/Core API должна быть достаточно подробной без раскрытия bot token, webhook secret или broker module token.
- Miniapp pages зависят от запуска внутри MAX: вне MAX они рендерят shell/debug error, но не получают доверенный `MiniappLaunchContext`.
- Ссылка miniapp в MAX настраивается в платформе MAX для партнёров вручную; проект формирует стабильный URL и deep link helpers, но не управляет этой настройкой через Bot API.
- MAX API не предоставляет готовый список всех чатов/каналов бота после deprecation `GET /chats`; поэтому UI показывает все известные этому модулю чаты/диалоги, обнаруженные из Webhook/Long Polling событий или будущего import-а `chat_id`, а не магически все исторические чаты до установки модуля.

## 18. TODO перед реализацией

По итогам повторного аудита основные архитектурные решения по outbound delivery, handoff в core broker, root miniapp page и test fixtures закрыты в нормативных разделах. Перед runtime-реализацией остается технический checklist и post-implementation ревизия интеграции MAX/Core.

### 18.1 Runtime implementation checklist

Технический checklist перед написанием runtime-кода:

- создать файлы строго по инвентарю раздела 3.1, включая MAX tables/repos/libs, miniapp registry/root route, `jobs/max/history-refresh.ts` и operational `MaxControlPanel`;
- реализовать `config/routes.tsx` и route helpers без хардкода домена; miniapp URLs строить только через helper-ы;
- реализовать secret-aware `settings.lib`: defaults, validation, `SECRET_SETTING_KEYS`, redaction в generic settings API и отдельный save/get flow для MAX/core broker секретов;
- реализовать Admin control/secrets DTO из разделов 6.1.1, 9 и 11.4, включая broker publish counters, chat/history summary и только boolean/status поля секретов;
- реализовать нормализацию внешних MAX id в string во всех app-owned полях, DTO и broker payload, не меняя типы внутри raw JSON payload;
- реализовать redaction helper для token/secret/password/authorization/cookie/initData полей и использовать его в logs, rawMeta, broker errors, history errors and sanitized miniapp payload;
- реализовать `MaxRawUpdates` append-only inbox, validation, optional fingerprint dedup, chat discovery и broker publish state без записи raw payload в logs;
- реализовать `MiniappPageEvents`, server-side `WebApp.initData` HMAC validation, TTL, root page logic и action allowlist так, чтобы `initDataUnsafe` никогда не был доверенным источником;
- реализовать `MaxChats`, `MaxChatMessages`, `MaxHistoryRefreshRuns` и `jobs/max/history-refresh.ts` с batched delete/fetch, 10s lifetime guard, exclusive lock и safe error storage;
- реализовать `lib/max/apiClient.lib.ts` как единственное место вызовов MAX API: subscriptions, long polling and messages; bot token не должен попадать в логи и responses;
- реализовать webhook handler с проверкой `X-Max-Bot-Api-Secret` до записи payload, короткой попыткой broker publish и гарантией, что broker failure не превращает сохраненный MAX update в ошибку webhook-приема;
- реализовать Long Polling только за Admin-only control API/задачей, с учетом взаимоисключения с active webhook subscription и сохранением `max_polling_marker`;
- реализовать `lib/broker/coreBrokerClient.lib.ts`, `lib/maxRawUpdates.lib.ts` и `lib/miniappPageEvents.lib.ts`: ModuleAuth token, idempotency keys, event type normalization, safe payload refs, `published/failed/disabled` state transitions и Admin retry lock;
- реализовать `MaxControlPanel` без чтения raw secrets и raw MAX payload в браузере;
- синхронизировать `shared/testCatalog.ts` и runners с разделом 12, включая unit проверки id normalization/redaction, integration checks MAX control/raw/broker/miniapps/history и dynamic HTTP checks для miniapp registry;
- после кода проверить README, `.CHATIUM-LLM.md`, `docs/architecture.md`, `docs/api.md`, `docs/data.md` и legacy ADR, потому что этот spec теперь является источником истины.

### 18.2 Post-implementation MAX/Core integration revision

После первой реализации нужно отдельно пересмотреть интеграционные решения:

- проверить на реальном или sandbox MAX Bot API, что Webhook subscription apply/delete, `X-Max-Bot-Api-Secret`, 30s response rule и retry MAX не противоречат текущей реализации;
- проверить, что Long Polling не запускается при active webhook subscription, корректно сохраняет marker и не теряет понятное предупреждение при reset marker;
- проверить history refresh на чатах с большим числом сообщений: batched delete, pagination cursor, duplicate boundary и self-reschedule до 10s limit;
- проверить core broker publish/idempotency/retry с реальным core endpoint: повторный retry не создает второй event, broker semantic errors безопасно redacted, raw payload не утекает в core payload/metadata;
- проверить miniapp root внутри MAX и вне MAX: outside-MAX shell не получает trusted context, внутри MAX bootstrap проходит только с valid signed `WebApp.initData`;
- проверить, что string id policy не ломает UI-сортировки, filters, chat refresh body, broker consumers и test fixtures;
- решить, нужен ли scheduled retry для failed broker publish rows или начальный контракт `Admin-only retry` остается достаточным;
- по итогам ревизии либо подтвердить текущие разделы 8, 11, 12 и 16 как постоянный контракт, либо обновить этот spec до следующей runtime-правки.

### 18.3 Закрытые архитектурные решения

#### 18.3.1 Outbound delivery

Локальная исходящая доставка данных от системы к пользователю через MAX в этом модуле не реализуется.

Решение:

- интерфейсный модуль не содержит Heap queue исходящих сообщений/действий и не владеет delivery lifecycle;
- надежная межмодульная доставка, retry consumer-а, notifications и dead-letter являются ответственностью `p/units/aley/bpm/core`;
- если в будущем появится конкретная функция отправки сообщения, callback response или открытия miniapp из системы к пользователю, она должна быть описана как отдельный broker command/consumer contract: кто публикует команду, какой модуль ее исполняет, какие MAX API методы вызываются и какие статусы результата пишутся;
- до появления такого отдельного контракта этот проект гарантирует только raw-сохранение входных пользовательских данных и регистрацию факта в core broker.

#### 18.3.2 Incoming MAX event handoff

Передача входящих событий в другие BPM-модули выполняется не локальным downstream adapter-ом, а публикацией broker event после raw-save.

Решение:

- `acceptMaxUpdate` сохраняет `Update` в `MaxRawUpdates`, затем вызывает `publishMaxRawUpdateAccepted`;
- miniapp bootstrap/action сохраняются в `MiniappPageEvents`, затем вызывают `publishMiniappPageEvent`;
- выбор downstream-потребителей выполняется подписками core broker-а по `producerModule`, `eventType` и optional `targetModules`;
- статус handoff заменен на `brokerPublishStatus`: `not_published`, `published`, `failed`, `disabled`;
- ошибка broker publish хранится в `brokerPublishError`, но не откатывает raw-save;
- повторная регистрация события выполняется через `POST /api/max/broker/retry` с exclusive lock и idempotency key broker-а;
- unknown future `update_type` сохраняется raw и публикуется как `max.<normalized update_type>`;
- тесты для webhook, long polling, unknown update type, broker failure и retry зафиксированы в разделе 12.

#### 18.3.3 Concrete miniapp pages

Начальный релиз содержит одну конкретную miniapp-страницу `root`.

Решение:

- `pageKey='root'`, route `miniapps/root/index.tsx`, registry `lib/miniapps/registry.lib.ts`, logic `lib/miniappPageEvents.lib.ts`;
- registry title и UI-заголовок: `A/Ley BPM`;
- `allowedActions=[]`, action payload schemas отсутствуют;
- client bootstrap получает page metadata `{ pageKey:'root', title:'A/Ley BPM', allowedActions: [] }`;
- bootstrap broker event: `max.miniapp.root.bootstrap`;
- `brokerTargetModules=[]`, конкретных обязательных consumers нет;
- пользовательские состояния ограничены inline root script: loading, ready с заголовком, error для invalid/expired `WebApp.initData`;
- `MiniappPageEvents` пишет bootstrap audit row; action rows для root не создаются при корректной работе, потому что действия запрещены allowlist-ом;

#### 18.3.4 Test fixtures

Нормативный fixture contract:

- sample MAX `Update` для `message_created`, `message_callback`, unknown future update type;
- valid/invalid `WebApp.initData` генерируется через core fixture contract, а не через hard-coded token в этом модуле;
- токен тестового MAX-бота предоставляет Admin в админке `p/units/aley/bpm/core` и сохраняет в core Heap table `Settings` под secret key `max_test_bot_token`;
- MAX-модуль не хранит `max_test_bot_token` в своих settings/Heap tables, не выводит его в логи и не передает в broker events;
- core endpoint `POST /p/units/aley/bpm/core/api/test-fixtures/max-init-data` возвращает signed `initData`/`initDataUnsafe` для тестов, но не возвращает raw token;
- тесты `lib/miniapps/initData.lib.ts`, которым нужна проверка HMAC, используют test-only token source, связанный с core `max_test_bot_token`; production runtime продолжает использовать только MAX secret `max_bot_access_token`;
- если `max_test_bot_token` не настроен в core, интеграционные проверки, которым нужен real signed `WebApp.initData`, должны возвращать failed/precondition row с понятным текстом `max_test_bot_token is not configured in core`, а не использовать production `max_bot_access_token`;
- sample miniapp action payloads для начального релиза ограничены negative fixture для `pageKey='root'`, потому что `allowedActions=[]`;
- sample core broker publish success/idempotent/failure responses;
- expected broker event payloads для `MaxRawUpdates` и root `MiniappPageEvents`, включая `max.miniapp.root.bootstrap`;
- expected sanitized payloads без token, secret, authorization, cookie и raw initData.

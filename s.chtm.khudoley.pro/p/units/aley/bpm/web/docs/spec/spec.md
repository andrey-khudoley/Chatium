# Spec-as-source: `p/units/aley/bpm/web`

Статус: источник истины для проекта.  
Последнее обновление: 2026-06-17.  
Область действия: весь каталог `p/units/aley/bpm/web`.

Этот файл описывает требуемое состояние проекта целиком: продуктовую роль шаблона, маршруты, страницы, API, данные, логи, тесты, UI-поведение, права доступа и правила эволюции. Если код, README, ADR или старые документы расходятся с этой спецификацией, приоритет у этого файла. Контракты и ошибки встроены сюда, потому что текущий объем не требует отдельных файлов.

Спецификация намеренно покрывает проект с избытком: кроме публичного поведения она фиксирует внутренние helper-ы, composable-слои, презентационные компоненты, тестовые раннеры и известные платформенные допущения. Это нужно, чтобы проект можно было поддерживать без обратного восстановления правил из кода.

## 0. Правило предварительной спецификации

Редактировать код проекта запрещено, если требуемое изменение еще не описано в этой спецификации.

Перед любым изменением runtime-кода, UI, API, данных, прав, тестов, маршрутов, логирования или структуры нужно сначала обновить этот файл так, чтобы новое поведение, контракт и критерии проверки были явно зафиксированы. Только после этого можно менять код.

Если во время реализации обнаружено, что нужен дополнительный кодовый шаг, не покрытый текущей спецификацией, работу с кодом нужно остановить, дописать спецификацию и только затем продолжить реализацию. Проверка или ревью должны считать кодовые изменения без предварительного описания в `docs/spec/spec.md` нарушением процесса, даже если сами изменения технически корректны.

## 1. Назначение

`p/units/aley/bpm/web` - самостоятельный Chatium-проект на базе исходного шаблона, который можно развивать без добавления платформенных зависимостей.

Проект обязан предоставлять:

- публичную главную страницу;
- публичную страницу входа;
- страницу профиля для авторизованного пользователя;
- админку для роли `Admin`;
- страницу тестов для авторизованного пользователя;
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

| Путь                | Ответственность                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `index.tsx`         | SSR entrypoint главной страницы `/`.                                                                              |
| `web/*/index.tsx`   | SSR entrypoints страниц `/web/admin`, `/web/profile`, `/web/login`, `/web/tests`.                                 |
| `pages/*.vue`       | Компоненты страниц, получающие SSR props.                                                                         |
| `components/`       | Переиспользуемые UI-компоненты страниц.                                                                           |
| `api/`              | HTTP/API routes. Каждый файл экспортирует route-константу.                                                        |
| `tables/`           | Схемы Heap-таблиц.                                                                                                |
| `repos/`            | CRUD и запросы к Heap без бизнес-логики.                                                                          |
| `lib/`              | Бизнес-логика, валидация, вычисления, тестовые раннеры.                                                           |
| `shared/`           | Код, допустимый для клиента; файлы должны быть чистыми для браузера или явно совместимыми с Chatium shared-route. |
| `pagecss/`          | CSS-фрагменты страниц, вынесенные из TSX entrypoints.                                                             |
| `config/`           | Константы проекта, маршрутов и заголовков.                                                                        |
| `docs/spec/spec.md` | Этот spec-as-source документ.                                                                                     |

Нормативная детализация структуры:

- `components/admin/` содержит только компоненты админки: `AdminCounters`, `AdminSettings`, `AdminLogMonitor`.
- `components/tests/` содержит только компоненты страницы тестов: `TestSuiteTab`, `TestsLogMonitor`.
- `shared/*` обязан быть помечен `// @shared`, если импортируется из Vue или shared-route кода. Исключение - серверно-используемые helper-ы, которые не попадают в браузерный bundle.
- `api/*` route-модули, импортируемые из Vue через `.run(ctx)` или `.query(...).run(ctx)`, должны быть помечены `// @shared-route`.
- `lib/htmlRedirect.ts` является единственной точкой приведения `ctx.resp.redirect()` к результату html-route; новые SSR redirect helper-ы не добавляются без явной причины.
- `pagecss/*.ts` не содержит бизнес-логики, API-вызовов, Heap-доступа или состояния. Это только строковые CSS-фрагменты для SSR injection.
- `docs/ADR/*`, `docs/api.md`, `docs/data.md`, `docs/imports.md` остаются справочниками. При расхождении с этим файлом правится либо этот файл, либо старый документ, но не код “под старый документ”.

### 3.1 Полный инвентарь файлов

Этот инвентарь является нормативным. Любой новый, удаленный или переименованный файл в `p/units/aley/bpm/web` требует синхронного изменения таблицы.

| Файл                                             | Нормативная роль                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `.CHATIUM-LLM.md`                                | Краткий LLM-контекст проекта и ссылки на документы; не источник истины.                     |
| `.dir.json`                                      | Метаданные каталога Chatium workspace.                                                      |
| `.workspace.json`                                | Workspace feature flags, сейчас `heap`.                                                     |
| `README.md`                                      | Человеческое описание проекта и быстрые ссылки; не источник истины при расхождении со spec. |
| `index.tsx`                                      | SSR route `/`, экспорт `indexPageRoute`.                                                    |
| `web/admin/index.tsx`                            | SSR route `/web/admin`, экспорт `adminPageRoute`.                                           |
| `web/login/index.tsx`                            | SSR route `/web/login`, экспорт `loginPageRoute`.                                           |
| `web/profile/index.tsx`                          | SSR route `/web/profile`, экспорт `profilePageRoute`.                                       |
| `web/tests/index.tsx`                            | SSR route `/web/tests`, экспорт `testsPageRoute`.                                           |
| `pages/HomePage.vue`                             | Vue page главной.                                                                           |
| `pages/LoginPage.vue`                            | Vue page входа.                                                                             |
| `pages/ProfilePage.vue`                          | Vue page профиля.                                                                           |
| `pages/AdminPage.vue`                            | Vue page админки.                                                                           |
| `pages/TestsPage.vue`                            | Vue page тестов.                                                                            |
| `components/Header.vue`                          | Общий header и logout orchestration.                                                        |
| `components/LogoutModal.vue`                     | Презентационный modal выхода.                                                               |
| `components/GlobalGlitch.vue`                    | Глобальные CSS-правила glitch effect.                                                       |
| `components/AppFooter.vue`                       | Общий footer и событие `chatium-click`.                                                     |
| `components/admin/AdminCounters.vue`             | Презентационная карточка error/warn counters.                                               |
| `components/admin/AdminSettings.vue`             | UI настроек `project_name` и `log_level`.                                                   |
| `components/admin/AdminLogMonitor.vue`           | Презентационный монитор логов админки.                                                      |
| `components/tests/TestSuiteTab.vue`              | Презентационная вкладка test suite.                                                         |
| `components/tests/TestsLogMonitor.vue`           | Презентационный монитор логов страницы тестов.                                              |
| `config/routes.tsx`                              | `PROJECT_ROOT`, route constants and URL helpers.                                            |
| `config/project.tsx`                             | Project/page constants and title/header helpers.                                            |
| `api/settings/list.ts`                           | `GET /api/settings/list`, экспорт `listSettingsRoute`.                                      |
| `api/settings/get.ts`                            | `GET /api/settings/get`, экспорт `getSettingRoute`.                                         |
| `api/settings/save.ts`                           | `POST /api/settings/save`, экспорт `saveSettingRoute`.                                      |
| `api/logger/log.ts`                              | `POST /api/logger/log`, экспорт `logRoute`.                                                 |
| `api/logger/browser.ts`                          | `POST /api/logger/browser`, экспорт `postBrowserLogsRoute`.                                 |
| `api/admin/logs/recent.ts`                       | `GET /api/admin/logs/recent`, экспорт `getRecentLogsRoute`.                                 |
| `api/admin/logs/before.ts`                       | `GET /api/admin/logs/before`, экспорт `getLogsBeforeRoute`.                                 |
| `api/admin/dashboard/counts.ts`                  | `GET /api/admin/dashboard/counts`, экспорт `getDashboardCountsRoute`.                       |
| `api/admin/dashboard/reset.ts`                   | `POST /api/admin/dashboard/reset`, экспорт `resetDashboardRoute`.                           |
| `api/tests/list.ts`                              | `GET /api/tests/list`, экспорт `listTestsRoute`.                                            |
| `api/tests/unit/index.ts`                        | `GET /api/tests/unit`, экспорт `templateUnitTestsRoute`.                                    |
| `api/tests/integration/index.ts`                 | `GET /api/tests/integration`, экспорт `templateIntegrationTestsRoute`.                      |
| `tables/settings.table.ts`                       | Heap schema `Settings`.                                                                     |
| `tables/logs.table.ts`                           | Heap schema `Logs`.                                                                         |
| `tables/.gitkeep`                                | Placeholder каталога tables; не содержит поведения.                                         |
| `repos/settings.repo.ts`                         | CRUD repository для settings без logger recursion.                                          |
| `repos/logs.repo.ts`                             | CRUD/query repository для logs.                                                             |
| `lib/settings.lib.ts`                            | Settings business logic and validation.                                                     |
| `lib/logger.lib.ts`                              | Server logging pipeline.                                                                    |
| `lib/htmlRedirect.ts`                            | Typed wrapper around `ctx.resp.redirect` for html routes.                                   |
| `lib/admin/dashboard.lib.ts`                     | Dashboard counters and reset logic.                                                         |
| `lib/tests/templateUnitSuite.ts`                 | Unit runner orchestrator.                                                                   |
| `lib/tests/templateUnitRoutesChecks.ts`          | Unit checks for route helpers.                                                              |
| `lib/tests/templateUnitSuiteHelpers.ts`          | Sync unit result helpers.                                                                   |
| `lib/tests/integrationSuite.ts`                  | Integration runner orchestrator.                                                            |
| `lib/tests/integrationApiSuite.ts`               | API/e2e integration checks.                                                                 |
| `lib/tests/integrationSuiteHelpers.ts`           | Async integration result helpers and `isAdmin`.                                             |
| `lib/tests/logTestRunFailures.ts`                | Failure-to-log bridge for test API wrappers.                                                |
| `lib/.gitkeep`                                   | Placeholder каталога lib; не содержит поведения.                                            |
| `shared/logger.ts`                               | Browser logger, severity matrix and log sink.                                               |
| `shared/browserRemoteLogger.ts`                  | Browser remote batching and console/global handlers.                                        |
| `shared/useRemoteLogging.ts`                     | Vue lifecycle composable for remote browser logging.                                        |
| `shared/useLogStream.ts`                         | Vue lifecycle/state composable for log history and WebSocket.                               |
| `shared/logStreamUtils.ts`                       | Pure log stream formatting/filter helpers.                                                  |
| `shared/logStreamSocket.ts`                      | Optional socket lifecycle listener adapter.                                                 |
| `shared/useTestSuites.ts`                        | Vue state/actions for test tabs and runners.                                                |
| `shared/testSuiteHelpers.ts`                     | Pure test UI and HTTP check helpers.                                                        |
| `shared/testCatalog.ts`                          | Runtime test catalog shared by UI/API/runners.                                              |
| `shared/logLevel.ts`                             | SSR helper for reading/injecting `window.__BOOT__.logLevel`.                                |
| `shared/preloader.ts`                            | SSR CSS/script/html snippets for boot loader.                                               |
| `shared/.gitkeep`                                | Placeholder каталога shared; не содержит поведения.                                         |
| `styles.tsx`                                     | Shared CSS strings `baseHtmlStyles`, `customScrollbarStyles`.                               |
| `pagecss/adminPageCss1.ts`                       | Admin page CSS part 1.                                                                      |
| `pagecss/adminPageCss2.ts`                       | Admin page CSS part 2.                                                                      |
| `pagecss/adminPageCss3.ts`                       | Admin page CSS part 3.                                                                      |
| `pagecss/headerCss1.ts`                          | Header CSS part 1.                                                                          |
| `pagecss/headerCss2.ts`                          | Header CSS part 2.                                                                          |
| `pagecss/homeBootCss.ts`                         | Home boot/CRT CSS.                                                                          |
| `pagecss/homePageCss1.ts`                        | Home page CSS part 1.                                                                       |
| `pagecss/homePageCss2.ts`                        | Home page CSS part 2.                                                                       |
| `pagecss/profilePageCss1.ts`                     | Profile page CSS part 1.                                                                    |
| `pagecss/profilePageCss2.ts`                     | Profile page CSS part 2.                                                                    |
| `pagecss/testsPageCss1.ts`                       | Tests page CSS part 1.                                                                      |
| `pagecss/testsPageCss2.ts`                       | Tests page CSS part 2.                                                                      |
| `pagecss/testsPageCss3.ts`                       | Tests page CSS part 3.                                                                      |
| `pagecss/testsPageCss4.ts`                       | Tests page CSS part 4.                                                                      |
| `docs/spec/spec.md`                              | Spec-as-source, этот документ.                                                              |
| `docs/architecture.md`                           | Legacy architecture reference.                                                              |
| `docs/api.md`                                    | Legacy API reference.                                                                       |
| `docs/data.md`                                   | Legacy data reference.                                                                      |
| `docs/imports.md`                                | Legacy imports reference.                                                                   |
| `docs/ADR/0001-initial-structure.md`             | Legacy ADR initial structure.                                                               |
| `docs/ADR/0002-settings-heap-and-layered-api.md` | Legacy ADR settings/layering.                                                               |
| `tsconfig.json`                                  | Local TS/Vue compiler config.                                                               |
| `jsx.d.ts`                                       | Local JSX/Chatium type shim.                                                                |
| `vue-shim.d.ts`                                  | Local Vue/Chatium type shim.                                                                |

## 4. Роли и доступ

Роли:

- `Guest`: нет `ctx.user`.
- `AnyUser`: авторизованный пользователь любого типа, прошедший `requireAnyUser(ctx)`. Это не `Guest`; guest-запросы к AnyUser API обрабатываются платформенным auth helper.
- `RealUser`: пользователь прошел авторизацию, доступен через `requireRealUser(ctx)`.
- `Admin`: `ctx.user.is('Admin') === true`, проверяется через `requireAccountRole(ctx, 'Admin')`.

Правила доступа:

| Поверхность       | Доступ                 | Поведение без доступа                                   |
| ----------------- | ---------------------- | ------------------------------------------------------- |
| `/`               | Guest, RealUser, Admin | Доступна всем; набор ссылок зависит от auth state.      |
| `/web/login`      | Guest, RealUser, Admin | Доступна всем; строит ссылку `/s/auth/signin?back=...`. |
| `/web/profile`    | RealUser, Admin        | Редирект на `../login?back=<current-url>`.              |
| `/web/admin`      | Admin                  | Редирект на login с `back=<current-url>`.               |
| `/web/tests`      | RealUser, Admin        | Редирект на `../login?back=<current-url>`.              |
| `/api/settings/*` | Admin                  | Платформенная ошибка auth.                              |
| `/api/admin/*`    | Admin                  | Платформенная ошибка auth.                              |
| `/api/logger/*`   | AnyUser                | Платформенная ошибка auth.                              |
| `/api/tests/*`    | AnyUser                | Платформенная ошибка auth.                              |

На `/web/tests` non-admin пользователь видит тестовую страницу без админского live-канала логов. Серверная интеграция может возвращать failed-строки для проверок admin-branch с текстом `нужна роль Admin (ctx.user.is("Admin"))`.

Auth helper должен быть первой исполняемой строкой защищенного API-handler после объявления route callback: `requireAccountRole(ctx, 'Admin')` для Admin API и `requireAnyUser(ctx)` для AnyUser API. Для SSR entrypoints допускается предварительное диагностическое логирование, после чего `requireRealUser`/`requireAccountRole` выполняется до вычисления защищенных данных.

## 5. Маршруты и URL

`config/routes.tsx` задает:

```ts
PROJECT_ROOT = 'p/units/aley/bpm/web'
ROUTES = {
  index: './',
  admin: './web/admin',
  profile: './web/profile',
  login: './web/login',
  tests: './web/tests'
}
ROUTE_PATHS = {
  index: '/',
  admin: '/web/admin',
  profile: '/web/profile',
  login: '/web/login',
  tests: '/web/tests'
}
```

Нормативное поведение helper-ов:

- `getFullUrl('./')`, `getFullUrl('/')`, `getFullUrl('')` возвращают `/p/units/aley/bpm/web/`.
- `getFullUrl('./web/admin')`, `getFullUrl('/web/admin')`, `getFullUrl('web/admin')` возвращают `/p/units/aley/bpm/web/web/admin`.
- `withProjectRoot('./web/admin')` и `withProjectRoot('web/admin')` возвращают `./p/units/aley/bpm/web/web/admin`.
- `withProjectRoot('./')` и `withProjectRoot('')` возвращают `./p/units/aley/bpm/web/`.
- `withProjectRootAndSubroute('./web/admin', 'edit')` возвращает `./p/units/aley/bpm/web/web/admin~edit`.
- `withProjectRootAndSubroute('./web/admin', '/edit')` возвращает `./p/units/aley/bpm/web/web/admin~edit`.
- `withProjectRootAndSubroute('./web/admin', 'users/123')` возвращает `./p/units/aley/bpm/web/web/admin~users/123`.

Все значения `ROUTES` должны начинаться с `./`. Все публичные ссылки во Vue props должны быть без домена.

`config/project.tsx` задает:

```ts
DEFAULT_PROJECT_TITLE = 'BPM Web'
INDEX_PAGE_NAME = 'Главная'
PROFILE_PAGE_NAME = 'Профиль'
ADMIN_PAGE_NAME = 'Админка'
TESTS_PAGE_NAME = 'Тесты'
BODY_TEXT = 'BPM Web'
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

`HomePage` получает:

- `projectName = BODY_TEXT`, сейчас `BPM Web`;
- `projectDescription = BODY_SUBTEXT`, сейчас `В разработке`;
- `projectTitle`, `indexUrl`, `profileUrl`, `loginUrl`, `isAuthenticated`, `isAdmin`, `adminUrl`, `testsUrl`.

На главной `projectName` в props - это hero-текст `BODY_TEXT`, а не настройка `project_name`. Настройка `project_name` используется сервером только для `<title>` и `projectTitle` Header через `getHeaderText('Главная', projectNameFromSettings)`.

Клиентское поведение:

- после `bootloader-complete` запускается печать заголовка и описания;
- на mount подключается `browserRemoteLogger`;
- `setLogSink` передает локальные логи в remote logger;
- при unmount выполняется `flush`, снимается sink, очищаются интервалы и обработчик `bootloader-complete`;
- ссылка Chatium открывается в новой вкладке после локального glitch-эффекта.

`HomePage` хранит интервалы печати отдельно для title/description, начинает анимацию сразу, если `window.bootLoaderComplete === true`, и слушает `bootloader-complete` иначе. На `onBeforeUnmount` выполняется `flush`, на `onUnmounted` - `setLogSink(null)`, `teardown()`, удаление listener-а и очистка интервалов.

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
- монитор логов с фильтрами, пагинацией, clear и раскрытием строк;
- live-инкремент счетчиков для входящих логов не старее `dashboardResetAt`;
- загрузку счетчиков через `GET /api/admin/dashboard/counts`;
- сброс счетчиков через `POST /api/admin/dashboard/reset`;
- `useRemoteLogging({ enabled: true, onLocalEntry: ingestLocalEntry })`;
- `useLogStream({ trackConnection: true })`.

`AdminPage`:

- вычисляет `initialProjectName` из `projectTitle.split(' / ')[0]`;
- хранит статус-бар `statusProjectName` и `statusLogLevel`, обновляемые событиями `AdminSettings`;
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
- добавить `<meta name="units-aley-bpm-web-page" content="web-tests" />`.

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

Heap table: `t__units-aley-bpm-web__setting__7Fk2Qw`.  
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

Heap table: `t__units-aley-bpm-web__log__9Xm3Kp`.  
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

## 9. Настройки

Ключи и значения по умолчанию задаются в `lib/settings.lib.ts`.

| Key                  | Default                      | Нормализация/валидация                                                                             |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `project_name`       | `BPM Web`                    | На save приводится к string и `trim()`.                                                            |
| `project_title`      | `BPM Web`                    | На save приводится к string и `trim()`.                                                            |
| `log_level`          | `Info`                       | Только `Debug`, `Info`, `Warn`, `Error`, `Disable`.                                                |
| `logs_limit`         | `100`                        | Parse positive integer; на save допустимо `1..10000`, хранится строкой.                            |
| `log_webhook`        | `{ enable: false, url: '' }` | Объект; `enable` boolean, `url` string.                                                            |
| `dashboard_reset_at` | `null`                       | На чтение `null/invalid` дает `0`; на save требуется неотрицательное число, хранится `Math.floor`. |

Runtime-использование настроек:

- `project_name` используется SSR entrypoints для `<title>`, Header `projectTitle` и `AdminSettings`.
- `project_title` присутствует как шаблонная настройка и проверяется интеграционными тестами, но текущие SSR entrypoints не читают его для UI.
- `log_level` используется серверным `logger.lib`, клиентским `window.__BOOT__.logLevel`, `AdminSettings` и всеми log sinks.
- `logs_limit` нормализуется `settings.lib.getLogsLimit`, но текущие API истории логов используют query `limit` и не читают `logs_limit`.
- `log_webhook` используется только `writeServerLog`.
- `dashboard_reset_at` используется `dashboard.lib` для счетчиков после сброса.

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

- `SETTING_KEYS` содержит только `PROJECT_NAME`, `PROJECT_TITLE`, `LOG_LEVEL`, `LOGS_LIMIT`, `LOG_WEBHOOK`, `DASHBOARD_RESET_AT` с ключами из таблицы выше.
- `LOG_LEVELS` строго `['Debug', 'Info', 'Warn', 'Error', 'Disable']`.
- `getSettingString(ctx, key)` возвращает row value, если это string; иначе `String(DEFAULTS[key] ?? '')`.
- `getLogLevel(ctx)` возвращает только значение из `LOG_LEVELS`; invalid/unknown fallback - `Info`.
- `getLogsLimit(ctx)` принимает positive finite number или `parseInt(string, 10) > 0`; иначе возвращает `100`.
- `getLogWebhook(ctx)` возвращает объект `{ enable:boolean, url:string }`; invalid value заменяется default `{ enable:false, url:'' }`.
- `getDashboardResetAt(ctx)` возвращает `Math.floor(value)`, если value finite number `>=0`; иначе `0`.
- `getAllSettings(ctx)` возвращает объект defaults plus Heap rows, где row с `value !== undefined && value !== null` перекрывает default.
- `setSetting(LOG_LEVEL)` принимает только exact `Debug`, `Info`, `Warn`, `Error`, `Disable`; lowercase нормализуется не здесь, а в `api/settings/save`.
- `setSetting(LOGS_LIMIT)` хранит строку нормализованного positive integer и запрещает результат вне `1..10000`.
- `setSetting(PROJECT_NAME|PROJECT_TITLE)` приводит значение к string и `trim()`.
- `setSetting(LOG_WEBHOOK)` требует object, затем нормализует `enable` к boolean with fallback `false`, `url` к string with fallback `''`.
- `setSetting(DASHBOARD_RESET_AT)` требует finite non-negative number-like value and stores `Math.floor`.

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

`getAdminLogsSocketId(ctx)` возвращает стабильный `admin-logs-8d4a7e32`. Перед передачей на клиент он кодируется через `genSocketId`.

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

### 11.3 Admin logs and dashboard

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

### 11.4 Tests

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

### 12.2 Server integration blocks

| Block                | Test IDs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `int-settings-lib`   | `settings_get_project_name`, `settings_get_log_level`, `settings_getSetting_branches`, `settings_getLogsLimit_parse`, `settings_getLogWebhook`, `settings_getDashboardResetAt`, `settings_getAllSettings`, `settings_setSetting_log_level`, `settings_setSetting_logs_limit`, `settings_setSetting_project_fields`, `settings_setSetting_webhook`, `settings_setSetting_dashboard_reset`, `settings_setSetting_unknown_key`, `regression_getLogLevel_no_recursion`, `regression_getSetting_no_recursion` |
| `int-settings-repo`  | `settings_repo_findAll`, `settings_repo_findByKey`, `settings_repo_upsert_create_update`, `settings_repo_deleteByKey`                                                                                                                                                                                                                                                                                                                                                                                    |
| `int-logs-repo`      | `logs_repo_findAll`, `logs_repo_create_and_read`, `logs_repo_findBeforeTimestamp_where`, `logs_repo_count_severities`, `regression_logs_create_no_recursion`                                                                                                                                                                                                                                                                                                                                             |
| `int-logger-lib-ctx` | `logger_admin_socket`, `logger_writeServerLog_filter`, `logger_writeServerLog_socket`, `logger_writeServerLog_webhook_url`, `regression_payload_not_object_object`                                                                                                                                                                                                                                                                                                                                       |
| `int-dashboard`      | `dashboard_get_counts`, `dashboard_reset`, `dashboard_flow_logs`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `int-api-contract`   | `api_settings_list`, `api_settings_get`, `api_settings_save_validation`, `api_logger_log`, `api_admin_logs_recent`, `api_admin_logs_before`, `api_admin_dashboard_counts`, `api_tests_list_shape`, `api_tests_unit_shape`, `api_tests_integration_shape`                                                                                                                                                                                                                                                 |
| `int-e2e`            | `e2e_settings_name_roundtrip`, `e2e_log_level_filters_storage`, `e2e_logs_pagination`, `e2e_dashboard_reset_flow`, `e2e_log_payload_roundtrip`                                                                                                                                                                                                                                                                                                                                                           |

`runTemplateIntegrationChecks(ctx)`:

- выполняется с реальным `ctx`, Heap и route `.run(ctx)`;
- вычисляет `admin = ctx.user?.is?.('Admin') === true`;
- проверяет settings lib/repo, logs repo, dashboard lib, logger lib и API contracts;
- временно создает тестовые rows/settings и удаляет только те settings, для которых есть explicit cleanup;
- может оставлять служебные log rows, потому что logs table является runtime журналом;
- для non-admin не вызывает admin-branch проверок и добавляет failed rows с текстом `нужна роль Admin (ctx.user.is("Admin"))`;
- `api_tests_unit_shape` проверяет `runTemplateUnitChecks()` локально, не делает HTTP/route вызов `/api/tests/unit`;
- `e2e_logs_pagination` и `e2e_log_payload_roundtrip` для non-admin возвращают passed=true без Admin API;
- `logTestRunFailures(ctx, logPath, results)` пишет каждый failed row с severity `3`, message `[<logPath>] FAIL <id>: <title> — <error>`.

### 12.3 HTTP integration block

Block `int-http-pages`:

| Test ID       | Path           | Required fragments                                                                              |
| ------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| `index`       | `/`            | `window.__BOOT__`, `BPM Web`                                                                    |
| `web-admin`   | `/web/admin`   | If final URL is admin: `window.__BOOT__`, `Админка`; otherwise login/redirect text is accepted. |
| `web-profile` | `/web/profile` | If final URL is profile: `window.__BOOT__`, `Профиль`; otherwise login text is accepted.        |
| `web-login`   | `/web/login`   | `Вход`                                                                                          |
| `web-tests`   | `/web/tests`   | `window.__BOOT__`, `units-aley-bpm-web-page`                                                    |

HTTP helper behavior:

- `HTTP_PATH_BY_TEST_ID` задает path для всех пяти test ID;
- `HTTP_HTML_SNIPPETS` задает минимальные fragments для обычных страниц;
- `httpPagePassed(testId, res, html)` сначала требует `res.ok`, иначе `HTTP <status>`;
- для `web-admin`, если final URL содержит `/web/admin`, требуются `__BOOT__` и `Админка`; иначе принимается `Вход` или `Перенаправление`;
- для `web-profile`, если final URL содержит `/web/profile`, требуются `__BOOT__` и `Профиль`; иначе принимается `Вход` или `login`;
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
| `.dir.json`       | Метаданные каталога в workspace; текущее `name` равно `[INWORK] p/units/aley/bpm/web`.                                                                                                                                            |
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

| Изменение          | Проверки                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Routes/links       | `GET /api/tests/unit`, HTTP-вкладка `/web/tests`.                                                |
| Settings/data      | `GET /api/tests/integration` под Admin.                                                          |
| Logging            | `GET /api/tests/integration` под Admin, ручная проверка admin log monitor.                       |
| UI pages           | Открыть затронутые SSR pages, проверить boot, Header, auth redirects.                            |
| Tests catalog      | `GET /api/tests/list`, `GET /api/tests/unit`, визуально `/web/tests`.                            |
| Browser logging    | Авторизованная страница с remote logger, проверка `/api/logger/browser` и echo/dedup в мониторе. |
| Admin dashboard    | `GET /api/admin/dashboard/counts`, `POST /api/admin/dashboard/reset`, live increment error/warn. |
| Copy-template docs | Проверить раздел 15, README и legacy docs, которые остаются навигацией.                          |

Запрещено:

- добавлять новый API без строки в разделе 11;
- добавлять новую настройку без строки в разделе 9;
- менять Heap schema/table ID без раздела 8 и миграционного комментария;
- импортировать серверные слои в Vue;
- отключать remote logging на защищенных страницах без явного изменения раздела 10;
- удалять тест ID из раннера или каталога без синхронного изменения раздела 12;
- добавлять CSS runtime logic в `pagecss/*`;
- добавлять новый shared composable без описания его ownership/lifecycle в этой спецификации;
- добавлять retention/pruning/rate limiting логов без явного контракта и тестов.

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

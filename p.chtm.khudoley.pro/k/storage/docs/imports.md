# Импорты и схема зависимостей (p/kht/storage)

## 1) Страницы-роуты (TSX entrypoints)

### `./config/routes.tsx`
- нет внутренних импортов (только экспорт PROJECT_ROOT, ROUTES, ROUTE_PATHS, getFullUrl, withProjectRoot)

### `./config/project.tsx`
- нет внутренних импортов (только экспорт PROJECT_TITLE, BODY_SUBTEXT)

### `./index.tsx`
- `@app/html-jsx` → `jsx`
- `./pages/HomePage.vue`
- `./shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `./styles` → `customScrollbarStyles`
- `./config/routes` → `getFullUrl`, `ROUTES`
- `./config/project` → `PROJECT_TITLE`, `BODY_SUBTEXT`

### `./web/ui/index.tsx`
- `@app/html-jsx` → `jsx`
- `../../pages/UIPage.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../styles` → `customScrollbarStyles`
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `PROJECT_TITLE`

### `./web/tests/index.tsx`
- `@app/html-jsx` → `jsx`
- `../../tests/pages/UnitTestsPage.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../styles` → `customScrollbarStyles`
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `PROJECT_TITLE`

### `./web/tests/ai/index.tsx`
- `@app/html-jsx` → `jsx`
- `../../../tests/api/run-tests` → `apiRunAllTestsRoute`

### `./api/scripts/serve.ts`
- `../../repos/scripts.repo` → `*` (отдача скриптов/стилей по ?file=; внешние обращения без интерфейса в api)

## 2) Страницы-компоненты (Vue)

### `./pages/HomePage.vue`
- `vue` → `onMounted`, `onUnmounted`, `ref`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../shared/logger` → `createComponentLogger`

### `./pages/UIPage.vue`
- `vue` → `ref`, `onMounted`
- `../api/scripts/list` → `listScriptsRoute`
- `../api/scripts/update` → `updateScriptRoute`
- `../api/scripts/delete` → `deleteScriptRoute`
- `../api/scripts/upload` → `uploadScriptRoute`
- пропсы: `indexUrl`, `serveBaseUrl` (URL для встраивания скриптов/стилей формируется на клиенте из `serveBaseUrl`)
- в компоненте используется глобальный `ctx` и вызовы `.run(ctx)` / `.run(ctx, body)`
- не импортирует `lib/scripts.lib` и repo/table (только @shared-route API)

### `./tests/pages/UnitTestsPage.vue`
- `vue` → `ref`, `reactive`, `computed`, `onMounted`
- `../api/run-tests` → `apiGetTestsListRoute`, `apiRunSingleTestRoute`

## 3) Компоненты (components/)

### `./components/Header.vue`
- `vue` → `ref`, `onMounted`, `onUnmounted`
- `../shared/logger` → `createComponentLogger`

### `./components/AppFooter.vue`
- `vue` → `onMounted`
- `../shared/logger` → `createComponentLogger`

### `./components/GlobalGlitch.vue`
- `vue` → `onMounted`
- `../shared/logger` → `createComponentLogger`

### `./components/LogoutModal.vue`
- `vue` → `watch`, `onMounted`
- `../shared/logger` → `createComponentLogger`

## 4) Shared

### `./styles.tsx`
- нет внутренних импортов (экспорт `baseHtmlStyles`, `customScrollbarStyles`)

### `./shared/preloader.ts`
- нет импортов

### `./shared/logLevel.ts`
- нет внутренних импортов (экспорт `getLogLevelForPage`, `getLogLevelScript`)

### `./shared/logger.ts`
- нет импортов (клиентский логгер, createComponentLogger и др.)

## 5) Таблицы

### `./tables/scripts.table.ts`
- `@app/heap` → `Heap`

## 6) Репозитории

### `./repos/scripts.repo.ts`
- `../tables/scripts.table` → `ScriptsTable` (default), типы

## 7) Библиотеки

### `./lib/scripts.lib.ts`
- `../repos/scripts.repo` → `*`
- `../config/routes` → `getFullUrl`, `ROUTES`

## 8) API

### `./api/scripts/list.ts`
- `@app/auth` → `requireAnyUser`
- `../../lib/scripts.lib` → `*`

### `./api/scripts/create.ts`
- `@app/auth` → `requireAnyUser`
- `../../lib/scripts.lib` → `*`

### `./api/scripts/update.ts`
- `@app/auth` → `requireAnyUser`
- `../../lib/scripts.lib` → `*`

### `./api/scripts/delete.ts`
- `@app/auth` → `requireAnyUser`
- `../../lib/scripts.lib` → `*`

### `./api/scripts/upload.ts`
- `@app/auth` → `requireAnyUser`
- `../../lib/scripts.lib` → `*`

### `./api/scripts/get.ts`
- `@app/auth` → `requireAnyUser`
- `../../lib/scripts.lib` → `*`
- `../../repos/scripts.repo` → `*`

### `./api/scripts/serve.ts`
- `../../repos/scripts.repo` → `*` (GET ?file=name.js|css → rawHttpBody; без @shared-route, вызов по URL)

## 9) Тесты

### `./tests/api/run-tests.ts`
- `@app/auth` → `requireAnyUser`
- `@app/request` → `request`
- `../../tables/scripts.table` → `ScriptsTable`
- `../shared/test-definitions` → `TEST_CATEGORIES`
- `../../api/scripts/list` → `listScriptsRoute`
- `../../api/scripts/create` → `createScriptRoute`
- `../../api/scripts/update` → `updateScriptRoute`
- `../../api/scripts/delete` → `deleteScriptRoute`
- `../../api/scripts/upload` → `uploadScriptRoute`
- `../../config/routes` → `getFullUrl`, `ROUTES`

### `./tests/shared/test-definitions.ts`
- нет импортов (экспорт TEST_CATEGORIES и описание тестов)

---

## Проверка циклических зависимостей

Граф (только внутренние пути проекта):

- `index.tsx` → HomePage, preloader, styles, config/routes, config/project
- `web/ui/index.tsx` → UIPage, preloader, styles, config/routes, config/project
- `web/tests/index.tsx` → UnitTestsPage, preloader, styles, config/routes, config/project
- `web/tests/ai/index.tsx` → tests/api/run-tests
- `pages/HomePage.vue` → Header, GlobalGlitch, AppFooter, shared/logger
- `pages/UIPage.vue` → api/scripts/list, update, delete, upload (без lib/repo/table)
- `tests/pages/UnitTestsPage.vue` → tests/api/run-tests
- `api/scripts/*` → lib/scripts.lib (get — ещё repos/scripts.repo)
- `lib/scripts.lib` → repos/scripts.repo, config/routes
- `repos/scripts.repo` → tables/scripts.table
- `api/scripts/serve.ts` → repos/scripts.repo
- `tests/api/run-tests` → tables, test-definitions, api/scripts/*, config/routes

**Циклов не обнаружено.**

UIPage.vue вызывает API только через `.run(ctx)`; URL для встраивания получает пропсом `serveBaseUrl` с сервера, чтобы не тянуть в клиентский бандл lib/scripts.lib и Heap (repo, table). Lib и repo без @shared — только сервер.

---

## Соответствие 001-standards / 006-arch

- **api/** — все внешние обращения без интерфейса (в т.ч. отдача скриптов/стилей) идут через api: `api/scripts/list`, `create`, `update`, `delete`, `get`, `upload`, **serve**.
- **config/** — есть обязательный `routes.tsx`; `project.tsx` — метаданные проекта (допустимо).
- **web/** — браузерные роуты: `web/ui`, `web/tests`, `web/tests/ai`.
- **Один файл — один роут** в api соблюдён (каждый эндпоинт в отдельном файле с путём `'/'`).
- **Замечание**: `tests/api/run-tests.ts` экспортирует три роута (`/list`, `/run-single`, `/run-all`) — по 006-arch предпочтительно один файл = один роут; при рефакторинге можно вынести в `api/tests/list.ts`, `api/tests/run-single.ts`, `api/tests/run-all.ts`.

# Архитектура проекта GetCourse Docs

## Назначение
Публичный просмотр документации GetCourse Tech API из OpenAPI-спецификации. Один маршрут, SSR, без авторизации, без Heap и без собственных API-эндпоинтов.

## Ограничения платформы
- Серверная инфраструктура предоставляется Chatium.
- Нельзя менять стек и зависимости.
- Деплой — автоматически при пуше.

## Основной сценарий
- Пользователь открывает главную страницу проекта (например `/p/getcourse_docs/`).
- Сервер читает OpenAPI из файла `data/openapi-schema.json`, нормализует в структуру для UI и передаёт в Vue-компонент DocsPage через SSR.
- На странице отображаются разделы по тегам, внутри — операции (метод, путь, summary) в виде спойлеров; при раскрытии — описание, параметры, тело запроса, ответы, авторизация.

## Роутинг
- `index.tsx` — единственная точка входа: `app.html('/', ...)`. Без проверок авторизации.

## Поток данных
1. Браузер: GET `/p/getcourse_docs/`
2. `index.tsx`: вызов `loadOpenApiSchema(ctx)` из `lib/openapi.lib.ts`
3. `lib/openapi.lib.ts`: `readWorkspaceFile(ctx, "p/getcourse_docs/data/openapi-schema.json")` → JSON.parse → `normalizeOpenApi(parsed)` → возврат `ApiDocs`
4. `index.tsx`: рендер HTML с Vue-компонентом `<DocsPage apiDocs={...} projectTitle={...} />`
5. DocsPage → ApiSection → ApiOperation → SchemaView (отображение схем)

## Структура каталогов
- `config/` — PROJECT_ROOT, ROUTES (только index), getFullUrl, withProjectRoot; project.tsx (название, BODY_TEXT, BODY_SUBTEXT).
- `data/` — `openapi-schema.json` (копия OpenAPI 3.0.0).
- `lib/` — `openapi.lib.ts`: типы (ApiInfo, ApiOperation, ApiGroup, ApiDocs, SchemaObject и др.), loadOpenApiSchema, normalizeOpenApi, resolveRef, parseSchema, parseRequestBody, parseResponses.
- `shared/` — preloader.ts (упрощённый, без CRT: getPreloaderStyles, getPreloaderScript, getPreloaderHTML).
- `pages/` — DocsPage.vue (главная страница документации).
- `components/` — ApiSection.vue, ApiOperation.vue, SchemaView.vue, AppFooter.vue.
- `styles.tsx` — customScrollbarStyles, lightThemeVariables (светлая тема, цвета HTTP-методов).
- `docs/` — architecture.md, imports.md, api.md (при необходимости), LLM/.

## Отсутствующие слои
- Нет Heap (таблиц, репозиториев).
- Нет API-эндпоинтов приложения (только отдача HTML страницы).
- Нет авторизации (requireAccountRole/requireRealUser/requireAnyUser не используются).

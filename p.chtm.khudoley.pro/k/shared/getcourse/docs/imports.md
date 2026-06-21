# Импорты проекта GetCourse Docs

## 1) Точка входа и конфигурация

### `./config/routes.tsx`
- Нет внутренних импортов (экспорт PROJECT_ROOT, ROUTES, getFullUrl, withProjectRoot, withProjectRootAndSubroute)

### `./config/project.tsx`
- Нет внутренних импортов (экспорт DEFAULT_PROJECT_TITLE, INDEX_PAGE_NAME, getPageTitle, BODY_TEXT, BODY_SUBTEXT)

### `./index.tsx`
- `@app/html-jsx` → `jsx`
- `./pages/DocsPage.vue`
- `./shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `./styles` → `customScrollbarStyles`, `lightThemeVariables`
- `./config/project` → `INDEX_PAGE_NAME`, `getPageTitle`, `DEFAULT_PROJECT_TITLE`
- `./lib/openapi.lib` → `loadOpenApiSchema`

## 2) Страницы (Vue)

### `./pages/DocsPage.vue`
- `vue` → `ref`, `computed`
- `../components/ApiSection.vue`
- `../components/AppFooter.vue`
- `../lib/openapi.lib` → типы ApiDocs, ApiGroup

## 3) Компоненты (components/)

### `./components/ApiSection.vue`
- `./ApiOperation.vue`
- `../lib/openapi.lib` → типы ApiOperation, SchemaObject

### `./components/ApiOperation.vue`
- `vue` → `computed`
- `./SchemaView.vue`
- `../lib/openapi.lib` → типы ApiOperation, SchemaObject

### `./components/SchemaView.vue`
- `../lib/openapi.lib` → тип SchemaObject

### `./components/AppFooter.vue`
- `vue` → `defineEmits` (нет внешних импортов)

## 4) Shared и стили

### `./styles.tsx`
- Нет внутренних импортов (экспорт `customScrollbarStyles`, `lightThemeVariables`)

### `./shared/preloader.ts`
- Нет импортов

## 5) Библиотеки (lib/)

### `./lib/openapi.lib.ts`
- `@start/sdk` → `readWorkspaceFile`
- Экспорт: типы ApiInfo, ApiParameter, SchemaProperty, SchemaObject, ApiResponse, ApiOperation, ApiGroup, ApiDocs; функции loadOpenApiSchema, normalizeOpenApi, resolveRef, parseSchema, parseRequestBody, parseResponses

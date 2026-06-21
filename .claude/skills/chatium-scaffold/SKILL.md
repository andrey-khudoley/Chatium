---
name: chatium-scaffold
description: Создаёт каркас нового Chatium-приложения — index.tsx, .workspace.json, .dir.json, config/routes.tsx, структуру каталогов, базовые конфиги. Использовать при создании нового приложения с нуля.
---

## Обязательная структура нового приложения

- **index.tsx** — точка входа (`app.html('/')` или `app.get('/')`), импорт jsx из `@app/html-jsx`, подключение Tailwind 3.4.16, FontAwesome 6.7.2, метатеги viewport, Clarity
- **config/routes.tsx** — `PROJECT_ROOT`, `ROUTES`, `withProjectRoot()` — **обязателен** в каждом проекте
- **.workspace.json** — `{"features":{"tools":["heap"]}}` (если нужен Heap)
- **.dir.json** — описание приложения для IDE
- **.CHATIUM-LLM.md** — словарь для LLM
- **README.md** — описание проекта
- **tsconfig.json** — с `"extends"` на корневой tsconfig
- **Каталоги:** `api/`, `pages/`, `tables/`, `docs/`, `config/`; при необходимости: `components/`, `lib/`, `repos/`, `shared/`, `tests/`, `transport/`, `tools/`, `web/`

## Шаблон index.tsx

```tsx
import { jsx } from '@app/html-jsx'
import HomePage from './pages/HomePage.vue'

export const indexRoute = app.html('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="/s/metric/clarity.js"></script>
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <link
          rel="stylesheet"
          href="/s/static/lib/fontawesome/6.7.2/css/all.min.css"
        />
      </head>
      <body>
        <HomePage />
      </body>
    </html>
  )
})
```

## Шаблон config/routes.tsx

```typescript
// config/routes.tsx
// PROJECT_ROOT — путь от корня воркспэйса до проекта (БЕЗ домена)
export const PROJECT_ROOT = 'dev/myproject'

export const ROUTES = {
  index: './',
  // ... другие роуты
} as const

export function withProjectRoot(route: string): string {
  const clean = route.startsWith('./') ? route.slice(2) : route
  return `./${PROJECT_ROOT}/${clean}`
}

// Использовать только если путь внутри файла не '/' (URL строится через ~)
export function withProjectRootAndSubroute(route: string, subroute?: string): string {
  if (!subroute || subroute === '/') return withProjectRoot(route)
  const clean = subroute.startsWith('/') ? subroute.slice(1) : subroute
  return `${withProjectRoot(route)}~${clean}`
}
```

## Структура каталогов (полная)

```
project/
├── index.tsx              # Единственный корневой роут (./)
├── config/
│   └── routes.tsx         # PROJECT_ROOT, ROUTES, withProjectRoot()
├── web/                   # Остальные браузерные роуты (кроме index.tsx)
│   └── admin/
│       └── index.tsx
├── pages/                 # Vue компоненты страниц (PascalCase + суффикс Page)
│   └── HomePage.vue
├── components/            # Переиспользуемые Vue компоненты
├── api/                   # API endpoints (один файл — один роут с '/')
├── tables/                # Heap-таблицы (*.table.ts, импорт без .ts)
├── repos/                 # Репозитории: CRUD, без бизнес-логики
├── lib/                   # Бизнес-логика: правила, дефолты, валидация
├── shared/                # Общий код (помечать // @shared)
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── data.md
│   ├── imports.md
│   ├── run.md
│   ├── adr/
│   └── LLM/
├── styles.tsx             # Общие стили (tailwindScript, cssVariables, preloaderStyles)
├── .CHATIUM-LLM.md
├── .workspace.json
├── .dir.json
└── README.md
```

## Правила именования

- **Файлы роутов:** camelCase, `index.tsx` только для корня проекта или модуля
- **Константы роутов:** camelCase + суффикс `Route` (`indexPageRoute`, `adminLogsRoute`)
- **Vue компоненты:** PascalCase + суффикс `Page` для страниц (`HomePage.vue`, `SettingsPage.vue`)
- **Таблицы:** множественное число + `.table.ts` (`users.table.ts`), импорт без `.ts`
- **Shared файлы:** добавлять комментарий `// @shared` в начало
- **API роуты:** добавлять комментарий `// @shared-route`, путь всегда `'/'`

## Правило размещения файлов

- В корне проекта из роутов — **только `index.tsx`**. Все остальные браузерные роуты — в `/web/`.
- Один эндпоинт в модуле — файл **рядом с индексом** (`web/app/tasks.tsx`), не `web/app/tasks/index.tsx`.
- Несколько эндпоинтов или отдельная подсистема — каталог с `index.tsx`.

## Поток данных

```
HTTP → api/ → lib/ → repos/ → Heap
```

Правила слоёв:
- `api/` — парсинг запроса, проверка прав, вызов `lib/`
- `lib/` — бизнес-логика, вызывает `repos/`
- `repos/` — только CRUD к Heap, без логики
- `tables/` — только схема данных

## Антипаттерны

- Не использовать CDN для FontAwesome — подключать локально `/s/static/lib/fontawesome/6.7.2/css/all.min.css`
- Не хардкодить URL: использовать `withProjectRoot(route.url())` из `config/routes.tsx`
- Не импортировать `tables/`, `repos/`, `lib/` в `.vue` компоненты
- Не использовать `console.log` — только `ctx.account.log()`
- Не использовать `.length` на `findAll` для подсчёта — использовать `countBy`
- Не использовать `filter:` в Heap-запросах — только `where:`
- Не использовать обычную арифметику с `Money` — только `.add()`, `.subtract()`, `.multiply()`
- Не использовать `// @ts-ignore` на собственном коде

## Прелоадер (если нужен)

Создать `styles.tsx` с `cssVariables`, `preloaderStyles`, `loaderScript`.
Прелоадер встраивается в HTML **до** Vue компонентов — не как Vue компонент.
CSS переменные подключать через `<style>` **без** `type="text/tailwindcss"`.
Скрытие вызывать из `onMounted()` через `window.hideAppLoader()`.

## Ссылки на документацию

- **006-arch.md** — структура проекта, правила размещения файлов, `config/routes.tsx`
- **001-standards.md** — стили, Tailwind, FontAwesome, правила именования
- **018-preloader.md** — прелоадер

## Примеры

- `inner/samples/new_project/` — полный шаблон с auth, admin, tests
- `inner/samples/design/` — многостраничный шаблон

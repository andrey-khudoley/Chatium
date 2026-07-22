@chatium

# Архитектура проекта в Chatium

Исчерпывающее руководство по организации файлов, структуре директорий и правилам именования в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные принципы](#основные-принципы)
  - [Разделение слоёв](#разделение-слоёв-при-работе-с-данными)
- [Структура директорий](#структура-директорий)
  - [Базовая структура](#базовая-структура)
  - [Полная структура](#полная-структура)
  - [Модульная организация](#модульная-организация)
- [Правила именования](#правила-именования)
  - [Файлы роутов](#файлы-роутов)
  - [Vue компоненты](#vue-компоненты)
  - [Константы и переменные](#константы-и-переменные)
  - [Таблицы](#таблицы)
- [Комментарии и директивы](#комментарии-и-директивы)
  - [@shared](#shared)
  - [@shared-route](#shared-route)
- [Организация по папкам](#организация-по-папкам)
  - [/web/ - Браузерные роуты](#web---браузерные-роуты)
  - [/config/ - Конфигурация проекта](#config---конфигурация-проекта)
  - [/api/ - API роуты](#api---api-роуты)
  - [/pages/ - Vue страницы](#pages---vue-страницы)
  - [/components/ - Переиспользуемые компоненты](#components---переиспользуемые-компоненты)
  - [/composables/ - Vue composables](#composables---vue-composables)
  - [/tables/ - Определения таблиц](#tables---определения-таблиц)
  - [/shared/ - Общий код](#shared---общий-код)
  - [/repos/ - Репозитории](#repos---репозитории)
  - [/lib/ - Бизнес-логика](#lib---бизнес-логика)
  - [/docs/ - Проектная документация](#docs---проектная-документация)
- [Один файл — один роут](#один-файл--один-роут)
- [Индекс-файлы и размещение эндпоинтов](#индекс-файлы-и-размещение-эндпоинтов)
- [Избегание циклических импортов](#избегание-циклических-импортов)
- [Окружения stage/prod: два каталога проекта](#окружения-stageprod-два-каталога-проекта)
- [Примеры организации](#примеры-организации)
- [Лучшие практики](#лучшие-практики)

---

## Основные принципы

### Золотые правила

1. **Один файл — один роут**
2. **Keep files small and maintainable** (держите файлы маленькими и поддерживаемыми)
3. **Структурируйте по функциональности**, а не по типу
4. **Избегайте циклических импортов**
5. **Используйте file-based роутинг**
6. **Максимально избегайте `~` в URL** (если маршрут внутри файла не `'/'`, URL станет `~...`)

### Философия организации

- ✅ Группируйте связанные файлы вместе
- ✅ Используйте понятные имена
- ✅ Следуйте единому стилю
- ✅ Документируйте сложную логику
- ❌ Не создавайте глубокие вложенности
- ❌ Не дублируйте код

### Разделение слоёв при работе с данными

Принцип разделения ответственности:

| Слой              | Каталог   | Ответственность                                                                      |
| ----------------- | --------- | ------------------------------------------------------------------------------------ |
| **Таблицы**       | `tables/` | Схемы Heap (поля, типы). Только определение структуры данных.                        |
| **Репозитории**   | `repos/`  | Работа с БД: CRUD, запросы. Никакой бизнес‑логики, только вызовы Heap API.           |
| **Бизнес‑логика** | `lib/`    | Правила, дефолты, валидация значений, вычисления. Вызывает репозитории.              |
| **API**           | `api/`    | HTTP‑эндпоинты, парсинг и первичная валидация запросов, проверка прав. Вызывает lib. |

Поток данных: `HTTP → API → lib → repos → Heap`.

---

## Структура директорий

### Базовая структура

Минимальная структура для простого приложения:

```
project/
├── index.tsx              # Единственный корневой роут (./)
├── config/                # Конфигурация проекта
│   └── routes.tsx
└── pages/                 # Vue компоненты
    └── HomePage.vue
```

Если появляются внутренние разделы, все браузерные роуты выносите в `/web/`.

### Полная структура

Рекомендуемая структура для полноценного проекта:

```
project/
├── index.tsx              # Единственный корневой роут (./)
│
├── config/                # Конфигурация проекта
│   └── routes.tsx
│
├── web/                   # Внутренние модули (браузерные роуты)
│   ├── admin/
│   │   ├── index.tsx      # корень модуля ./web/admin
│   │   └── logs.tsx       # один эндпоинт ./web/admin/logs
│   ├── app/
│   │   ├── index.tsx      # корень модуля ./web/app
│   │   └── tasks.tsx      # один эндпоинт рядом с индексом ./web/app/tasks
│   ├── settings/
│   │   └── index.tsx      # ./web/settings
│   └── profile/
│       └── index.tsx      # ./web/profile
│
├── pages/                 # Vue компоненты страниц
│   ├── HomePage.vue
│   ├── AdminPage.vue
│   ├── AdminLogsPage.vue
│   ├── SettingsPage.vue
│   └── ProfilePage.vue
│
├── components/            # Переиспользуемые компоненты
│   ├── Button.vue
│   ├── Header.vue
│   └── Footer.vue
│
├── composables/           # Переиспользуемая клиентская логика (Vue composables)
│   ├── useApiUrl.ts
│   ├── useTheme.ts
│   └── useMessageSync.ts
│
├── api/                   # API: один файл — один эндпоинт с /
│   ├── settings/
│   │   ├── list.ts
│   │   ├── get.ts
│   │   └── save.ts
│   └── users/
│       ├── list.ts
│       └── create.ts
│
├── tables/                # Схемы Heap-таблиц
│   ├── users.table.ts
│   ├── products.table.ts
│   └── orders.table.ts
│
├── repos/                 # Репозитории: работа с БД (CRUD)
│   ├── user.repo.ts
│   └── product.repo.ts
│
├── shared/                # Общий код для frontend и backend
│   ├── utils.ts
│   ├── constants.ts
│   └── types.ts
│
├── lib/                   # Бизнес-логика (правила, дефолты, валидация)
│   ├── user.lib.ts
│   └── product.lib.ts
│
├── docs/                  # Проектная документация (как в new_project)
│   ├── architecture.md
│   ├── api.md
│   ├── data.md
│   ├── imports.md
│   ├── run.md
│   ├── adr/
│   └── LLM/
│
├── styles.tsx             # Общие стили
└── .CHATIUM-LLM.md        # Документация проекта
```

### Модульная организация

Для крупных проектов используйте модульную структуру:

```
project/
├── index.tsx              # Единственный корневой роут (./)
│
├── web/                   # Внутренние модули (браузерные роуты)
│   ├── admin/
│   │   ├── index.tsx
│   │   ├── users.tsx
│   │   └── logs.tsx
│   ├── user/
│   │   ├── index.tsx
│   │   └── profile.tsx
│   └── tests/
│       ├── index.tsx
│       └── ai.tsx
│
├── pages/
│   ├── admin/
│   ├── user/
│   └── tests/
│
├── lib/
│   └── modules/
│       ├── admin/
│       ├── user/
│       └── tests/
│
└── shared/
    └── modules/
        ├── admin/
        ├── user/
        └── tests/
```

Роут-файлы в `/web/` содержат только маршрутизацию и SSR. Бизнес-логика должна жить в `/lib/modules/`, а общие типы и утилиты — в `/shared/modules/`.

---

## Правила именования

### Файлы роутов

**TSX файлы** (роуты и страницы):

- ✅ **camelCase** для файлов: `userProfile.tsx`, `productList.tsx`
- ✅ **Короткие, но описательные**: `settings.tsx`, `profile.tsx`
- ✅ **index.tsx** — только для **корня** проекта или корня модуля (не «по индексу на каждый эндпоинт»)
- ✅ В корне проекта из роутов лежит только `index.tsx`, остальные страницы — в `/web/`
- ✅ Один эндпоинт в рамках модуля — файл **рядом с индексом** (например `web/app/tasks.tsx`), а не отдельный каталог `web/app/tasks/index.tsx`. Отдельный каталог с индексом — для модулей с несколькими эндпоинтами или функционально выделенных подмодулей.

```
project/
├── index.tsx              # Единственный корневой роут (./)
└── web/
    ├── settings/
    │   └── index.tsx      # ./web/settings
    ├── app/
    │   ├── index.tsx      # корень модуля app (./web/app)
    │   └── tasks.tsx       # один эндпоинт модуля (./web/app/tasks), не app/tasks/index.tsx
    └── products/
        └── list.tsx       # ./web/products/list
```

**Константы роутов**:

- ✅ **camelCase** с суффиксом **Route**
- ✅ Начинайте с типа страницы/функции

```typescript
// ✅ Правильно
export const indexPageRoute = app.get('/', ...)
export const settingsPageRoute = app.get('/', ...)
export const userProfileRoute = app.get('/', ...)
export const apiCreateProductRoute = app.post('/create', ...)

// ❌ Неправильно
export const index = app.get('/', ...)
export const Settings = app.get('/', ...)
export const route1 = app.get('/', ...)
```

### Vue компоненты

**Файлы Vue**:

- ✅ **PascalCase**: `HomePage.vue`, `UserProfile.vue`
- ✅ Суффикс **Page** для страниц: `SettingsPage.vue`
- ✅ Суффикс **Component** опционален: `Button.vue` или `ButtonComponent.vue`

```
pages/
├── HomePage.vue           # Страница
├── SettingsPage.vue       # Страница
└── ProfilePage.vue        # Страница

components/
├── Button.vue             # Компонент
├── Header.vue             # Компонент
└── ProductCard.vue        # Компонент
```

### Константы и переменные

**TypeScript/JavaScript**:

- ✅ **camelCase** для переменных и функций
- ✅ **PascalCase** для классов и типов
- ✅ **UPPER_SNAKE_CASE** для констант

```typescript
// ✅ Правильно
const userName = 'John'
const calculateTotal = (items) => { ... }
const MAX_RETRIES = 3

interface UserProfile { ... }
class ProductService { ... }
type ApiResponse = { ... }

// ❌ Неправильно
const UserName = 'John'
const CalculateTotal = (items) => { ... }
const maxRetries = 3  // для констант используйте UPPER_SNAKE_CASE
```

### Таблицы

**Файлы таблиц**:

- ✅ **camelCase** с суффиксом **.table.ts** (файл С `.ts`)
- ✅ Импорт БЕЗ `.ts`: `import { TableName } from '../tables/tableName.table'`
- ✅ Множественное число: `users.table.ts`, `products.table.ts`

```
tables/
├── users.table.ts            # Таблица пользователей
├── products.table.ts         # Таблица продуктов
├── orders.table.ts           # Таблица заказов
└── orderItems.table.ts       # Таблица элементов заказа
```

**Импорт таблиц**:

```typescript
// ✅ Правильно - именованный импорт БЕЗ .ts
import { Users } from '../tables/users.table'
import { Products } from '../tables/products.table'

// ❌ Неправильно - импорт с .ts
import { Users } from '../tables/users.table.ts'
import { Products } from '../tables/products.table.ts'

// ❌ Неправильно - default импорт может не работать
import Users from '../tables/users.table'
```

---

## Комментарии и директивы

### @shared

Используется для кода, который нужен и на frontend, и на backend:

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import HomePage from './pages/HomePage.vue'

export const indexPageRoute = app.get('/', async (ctx) => {
  return <html>...</html>
})
```

**Когда использовать**:

- ✅ Утилиты, хелперы, типы и константы в `/shared/`
- ✅ Роут-файлы, если их нужно импортировать в Vue (например, для `.url()`)

**Правила**:

- Функции должны быть переносимыми, без прямого доступа к Heap-таблицам
- `ctx` передаётся явно, если нужен

### @shared-route

Используется для API роутов, которые должны вызываться с клиента через `.run()`:

```typescript
// @shared-route
import { Products } from '../tables/products.table'

export const apiProductsRoute = app.get('/', async (ctx) => {
  const products = await Products.findAll(ctx, { limit: 100 })
  return products
})
```

**Когда использовать**:

- ✅ API endpoints в `/api/`
- ✅ Роуты, вызываемые через `.run()` из Vue

**Правила**:

- Один файл = один роут
- Внутри файла используйте путь `'/'` (иначе URL будет через `~`)

---

## Организация по папкам

### /web/ - Браузерные роуты

В корне проекта из роутов лежит только `index.tsx`. Все остальные браузерные страницы и модули — в `/web/`.

**Правила**:

- ✅ Один файл = один роут
- ✅ **Индекс** — корень модуля (проекта или подмодуля). Один эндпоинт в модуле — файл **рядом с индексом** (например `web/app/tasks.tsx`), не отдельная папка с `index.tsx`.
- ✅ Внутри файла используйте `app.get('/')` или `app.html('/')` (без явных путей)
- ✅ Файл содержит только маршрутизацию и SSR
- ✅ Бизнес-логика — в `/lib/`, общие типы/утилиты — в `/shared/`

```
web/
├── admin/
│   ├── index.tsx          # корень модуля ./web/admin
│   └── logs.tsx           # один эндпоинт модуля ./web/admin/logs
├── app/
│   ├── index.tsx          # корень модуля ./web/app
│   └── tasks.tsx          # один эндпоинт рядом с индексом ./web/app/tasks (не app/tasks/index.tsx)
└── reports/
    └── index.tsx          # ./web/reports
```

**ВАЖНО**: URL всегда относительный (через `./`), фактически это `./${PROJECT_ROOT}/...`. Если путь внутри файла отличается от `'/'`, URL будет строиться через `~` (например, `./${PROJECT_ROOT}/web/admin/logs~example`). Такие случаи нужно **максимально избегать**.

### /config/ - Конфигурация проекта

**⚠️ ОБЯЗАТЕЛЬНАЯ** папка с конфигурационными файлами.

**КРИТИЧЕСКИ ВАЖНО**: Файл `/config/routes.tsx` **ОБЯЗАТЕЛЕН** в каждом проекте!

```
config/
└── routes.tsx             # PROJECT_ROOT, ROUTES, withProjectRoot()
```

**Структура `/config/routes.tsx`**:

```typescript
// config/routes.tsx
// PROJECT_ROOT — путь от корня воркспэйса до проекта (БЕЗ домена)
export const PROJECT_ROOT = 'dev/myproject'

// Все маршруты внутри проекта задаются ОТНОСИТЕЛЬНО (через ./)
export const ROUTES = {
  index: './',
  admin: './web/admin',
  profile: './web/profile'
  // ... другие роуты
} as const

export function withProjectRoot(route: string): string {
  const clean = route.startsWith('./') ? route.slice(2) : route
  return `./${PROJECT_ROOT}/${clean}`
}

// ⚠️ Старайтесь избегать. Если путь внутри файла НЕ '/', URL строится через ~
export function withProjectRootAndSubroute(route: string, subroute?: string): string {
  if (!subroute || subroute === '/') return withProjectRoot(route)
  const clean = subroute.startsWith('/') ? subroute.slice(1) : subroute
  return `${withProjectRoot(route)}~${clean}`
}
```

**Использование**:

```typescript
// web/admin/index.tsx - при циклических зависимостях
import { withProjectRoot, ROUTES } from '../../config/routes'

export const adminRoute = app.get('/', async (ctx) => {
  // ✅ Правильно - используем переменные
  const indexUrl = withProjectRoot(ROUTES.index)

  // ❌ КРИТИЧЕСКАЯ ОШИБКА - хардкод URL
  // const indexUrl = './dev/myproject/'

  return ctx.resp.redirect(indexUrl)
})
```

**Почему это обязательно**:

- Избегает циклических зависимостей между роутами
- Запрещает хардкод доменов (динамические домены)
- Единая точка конфигурации путей проекта и `PROJECT_ROOT`
- Всегда формирует относительные URL `./${PROJECT_ROOT}/...`

---

### /api/ - API роуты

Слой получения и валидации входных данных. API endpoints располагаются в `/api/`. Ответственность: парсинг запросов, первичная проверка формата, проверка прав, вызов lib.

**File-based структура**: один файл = один эндпоинт. Внутри файла путь всегда `'/'` — URL формируется путём к файлу, без `~`.

```
api/
└── settings/
    ├── list.ts            # GET  ./api/settings/list
    ├── get.ts             # GET  ./api/settings/get
    └── save.ts            # POST ./api/settings/save
```

**⚠️ ОЧЕНЬ ВАЖНО**: если внутри файла путь не `'/'`, URL будет через `~` (например, `./${PROJECT_ROOT}/api/settings~list`). Используйте `app.get('/')` или `app.post('/')` — тогда URL = путь к файлу.

**Пример файла**:

```typescript
// api/users/list.ts
// @shared-route

// ✅ ПРАВИЛЬНО: API вызывает lib, не таблицы напрямую
import * as userLib from '../../lib/user.lib'

export const apiGetUsersRoute = app.get('/', async (ctx, req) => {
  const limit = parseInt(req.query.limit as string) || 100
  if (limit < 1 || limit > 500) {
    return { success: false, error: 'limit должен быть от 1 до 500' }
  }
  const users = await userLib.listUsers(ctx, { limit })
  return { success: true, users }
})
```

### /pages/ - Vue страницы

Vue компоненты, рендерящиеся на страницах:

```
pages/
├── HomePage.vue
├── SettingsPage.vue
├── ProfilePage.vue
└── ProductListPage.vue
```

**Правило**: Каждому роуту — своя Vue страница.

### /components/ - Переиспользуемые компоненты

Общие Vue компоненты:

```
components/
├── Button.vue
├── Header.vue
├── Footer.vue
├── ProductCard.vue
└── UserAvatar.vue
```

**Правило**: Компоненты должны быть переиспользуемыми и независимыми.

### /composables/ - Vue composables

Переиспользуемая **клиентская** логика на Vue Composition API: функции с префиксом `use*`, инкапсулирующие состояние и поведение для использования в компонентах.

**Когда использовать**:

- Логика с `ref`/`reactive`/подписками, нужная в нескольких компонентах — выносить в composables.
- Логика только в одном компоненте — можно оставить внутри компонента.

**Правила**:

- Только клиентский код: не импортировать Heap-таблицы и серверные модули с прямым доступом к БД. Вызов API через роуты с `@shared-route` и `.run(ctx, ...)` допустим.
- Именование файлов: `use*.ts` (например `useTheme.ts`, `useApiUrl.ts`).
- Подробнее см. **007-vue.md** → раздел «Composables».

```
composables/
├── useApiUrl.ts
├── useTheme.ts
├── useMessageSync.ts
└── useClientLogger.ts
```

### /tables/ - Определения таблиц

Схемы Heap-таблиц. Только определение структуры данных (поля, типы):

```
tables/
├── users.table.ts
├── products.table.ts
├── orders.table.ts
└── orderItems.table.ts
```

**Важно**:

- ✅ Файлы С расширением `.table.ts`
- ✅ Импорт БЕЗ `.ts`: `import { Users } from '../tables/users.table'`
- ❌ Таблицы доступны **только на backend**
- ✅ Для клиента создавайте API роуты
- ✅ Для окружений stage/prod — пары таблиц с общим объектом полей и статическим селектором, см. [Окружения stage/prod: два каталога проекта](#окружения-stageprod-два-каталога-проекта)

### /repos/ - Репозитории

Слой работы с БД. Только CRUD и запросы к Heap, без бизнес-логики:

```
repos/
├── user.repo.ts
├── product.repo.ts
└── settings.repo.ts
```

**Правило**: Репозитории вызывают только таблицы (Heap API), не содержат валидации и дефолтов.

### /shared/ - Общий код

Код, используемый и на frontend, и на backend:

```
shared/
├── utils.ts               # Общие утилиты
├── constants.ts           # Константы
├── types.ts               # TypeScript типы
└── formatters.ts          # Форматирование данных
```

**Пример**:

```typescript
// shared/constants.ts
// @shared

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_EXTENSIONS = ['jpg', 'png', 'pdf']
export const DEFAULT_PAGE_SIZE = 20
```

### /lib/ - Бизнес-логика

Правила, дефолты, валидация значений, вычисления. Вызывает репозитории, не обращается к таблицам напрямую:

```
lib/
├── user.lib.ts
├── product.lib.ts
└── settings.lib.ts
```

**Пример**:

```typescript
// lib/user.lib.ts
import * as userRepo from '../repos/user.repo'

const DEFAULTS = { role: 'guest' }

export async function getUserWithDefaults(ctx, id: string) {
  const user = await userRepo.findById(ctx, id)
  return user ? { ...DEFAULTS, ...user } : DEFAULTS
}

export async function updateUserRole(ctx, id: string, role: string) {
  if (!['admin', 'user', 'guest'].includes(role)) {
    throw new Error('Недопустимая роль')
  }
  await userRepo.update(ctx, id, { role })
}
```

### /docs/ - Проектная документация

Храним документацию проекта в структуре, аналогичной `new_project/docs`:

```
docs/
├── architecture.md
├── api.md
├── data.md
├── imports.md
├── run.md
├── adr/
└── LLM/
```

---

## Один файл — один роут

### Правило

Каждый TS/TSX файл экспортирует **ровно один маршрут**. Для дополнительных путей создавайте отдельные файлы (включая `/api/`).

**⚠️ ОЧЕНЬ ВАЖНО**: если в файле маршрут отличается от `'/'`, URL будет строиться через `~` (например, `./${PROJECT_ROOT}/web/admin/logs~example`). Такое следует **максимально избегать**. Вместо `/:id` по возможности используйте `?id=...` для GET или `body` для POST.

✅ **Правильно**:

```
project/
├── index.tsx              # export const indexPageRoute
└── web/
    └── admin/
        ├── index.tsx      # export const adminPageRoute
        └── logs.tsx       # export const adminLogsRoute
```

```typescript
// web/admin/logs.tsx
export const adminLogsRoute = app.get('/', async (ctx) => {
  return <html>...</html>
})
```

❌ **Неправильно** (несколько роутов в одном файле):

```typescript
// web/admin/index.tsx  ❌ Плохо
export const adminRoute = app.get('/', ...)
export const adminLogsRoute = app.get('/logs', ...)
```

---

## Индекс-файлы и размещение эндпоинтов

**Индекс-файл** (`index.tsx` / `index.ts`) — это **корень** чего-либо: проекта, функционального модуля или приложения. Не «один индекс на каждый эндпоинт», а один индекс на логическую единицу.

- **Правило «один файл — один эндпоинт»** сохраняется: каждый HTTP-обработчик или роут живёт в одном файле.
- **Модуль с одним эндпоинтом** — размещается **рядом с индексом** того уровня, к которому относится, одним файлом с говорящим именем.  
  Пример: страница «Список задач» в мини-приложении — один эндпоинт → файл `web/app/tasks.tsx` рядом с `web/app/index.tsx`. Каталог `web/app/tasks/` с отдельным `index.tsx` не создаётся.
- **Модуль с несколькими эндпоинтами** или **функционально выделенный подмодуль** (собственная логика, несколько страниц/роутов) — оформляется **отдельным каталогом с индекс-файлом**.  
  Пример: `api/connect/` — несколько эндпоинтов (telegram.ts, agent.ts, save-channels.ts), каталог с группой файлов; `web/app/` — корень мини-приложения, индекс `web/app/index.tsx` как точка входа модуля.

**Итого**: индекс = корень проекта или функционального модуля; один эндпоинт в одном файле; один эндпоинт в рамках существующего модуля — файл рядом с индексом (например `web/app/tasks.tsx`); несколько эндпоинтов или отдельная подсистема — свой каталог с индексом.

**Пример**:

```
web/
└── app/                      # модуль мини-приложения
    ├── index.tsx             # корень модуля (главная мини-приложения)
    └── tasks.tsx             # один эндпоинт модуля (страница «Список задач»)
```

Не создавайте `web/app/tasks/index.tsx` для одной страницы — используйте `web/app/tasks.tsx`.

---

## Избегание циклических импортов

### Проблема

Циклические импорты возникают когда файл A импортирует B, а B импортирует A:

```
HomePage.vue → imports settingsRoute
                          ↓
             web/settings/index.tsx → imports HomePage.vue (❌ ЦИКЛ!)
```

### Правильная модель

Однонаправленные зависимости: **UI → Routes → Shared/Core/Repo**

```
Vue компоненты (pages/)
         ↓
      Роуты (/web/*.tsx)
         ↓
  Shared/Lib (utils, repo)
```

### Примеры

✅ **Правильно**:

```typescript
// HomePage.vue
import { settingsRoute } from '../web/settings'
import { profileRoute } from '../web/profile'

// settingsRoute и profileRoute не импортируют HomePage
```

```typescript
// web/settings/index.tsx
import SettingsPage from '../../pages/SettingsPage.vue'
// НЕ импортируем другие роуты
```

❌ **Неправильно**:

```typescript
// HomePage.vue
import { settingsRoute } from '../web/settings'

// web/settings/index.tsx
import HomePage from '../../pages/HomePage.vue' // ❌ HomePage импортирует settingsRoute!
```

### Решение

Выносите общие константы и типы в отдельные файлы:

```typescript
// shared/types.ts
export interface UserData { ... }

// HomePage.vue
import type { UserData } from '../shared/types'

// web/settings/index.tsx
import type { UserData } from '../../shared/types'
```

**⚠️ ОЧЕНЬ ВАЖНО**: после каждого изменения импортов обновляйте `docs/imports.md` и сразу проверяйте по нему отсутствие циклических зависимостей. Циклы недопустимы.

---

## Окружения stage/prod: два каталога проекта

Паттерн для проекта, которому нужны раздельные данные для разработки и прода **в одном аккаунте**: две копии проекта (например, `d/project` — stage и `p/project` — prod), код переносится между ними копированием, данные разделены на уровне таблиц.

Основа — три факта:

1. **Идентичность Heap-таблицы — её строковый id, глобальный на аккаунт.** Каталог, где объявлена таблица, значения не имеет: обе копии проекта, объявляющие таблицу с одним id, работают с одной физической таблицей.
2. **Динамические имена таблиц невозможны** — id в `Heap.Table()` только литеральный, вычислить его в рантайме нельзя.
3. Поэтому переключаются не имена, а **статически объявленные репо-объекты**: каждая сущность объявляется парой таблиц (`*_stage` / `*_prod`) с общим объектом полей, наружу из `.table.ts` экспортируется один выбранный репозиторий. Детали и код — `008-heap.md` → «Окружения stage/prod: пары таблиц и селектор».

**Привязка «каталог = окружение»** — через `config/env.ts`, селектор выводится из `PROJECT_ROOT` (а `config/routes.tsx` — единственный файл, который и так правится при копировании):

```typescript
// config/env.ts
import { PROJECT_ROOT } from './routes'

export const IS_PROD = PROJECT_ROOT.startsWith('p/')
```

Копирование `d/project` → `p/project` не требует ручного тумблера: копия в `p/` автоматически привязана к prod-набору таблиц, копия в `d/` — к stage-набору. Ошибиться негде — окружение определяется тем, где лежит код.

**Правила слоёв** (без них паттерн разваливается):

- Весь доступ к данным — через `repos/` (`HTTP → API → lib → repos → Heap`); таблицы не импортируются в обход селектора.
- Файл `.table.ts` экспортирует **только выбранный** репозиторий пары, не `*Stage`/`*Prod` по отдельности.
- Общие для окружений таблицы (например, настройки) объявляются без пары — одинаковый id в обеих копиях = одна таблица.
- Изменения схемы: аддитивные (добавить поле) — безопасны; переименования/удаления полей — только синхронно с копированием кода между каталогами (обе копии объявляют оба id, схема привязана к id глобально).

---

## Примеры организации

### Простое приложение

```
simple-app/
├── index.tsx              # Главная страница
├── web/
│   ├── about/
│   │   └── index.tsx      # О нас
│   └── contact/
│       └── index.tsx      # Контакты
│
├── pages/
│   ├── HomePage.vue
│   ├── AboutPage.vue
│   └── ContactPage.vue
│
└── api/
    └── contact.ts         # API для формы контакта
```

### Блог

```
blog/
├── index.tsx              # Список статей
├── web/
│   └── blog/
│       ├── index.tsx      # Список статей
│       ├── post.tsx       # Одна статья (/:id)
│       ├── editPost.tsx   # Редактирование (/:id)
│       └── admin.tsx      # Админка
│
├── pages/
│   ├── BlogListPage.vue
│   ├── PostPage.vue
│   ├── EditPostPage.vue
│   └── AdminPage.vue
│
├── api/
│   ├── posts.ts           # CRUD для статей
│   └── comments.ts        # CRUD для комментариев
│
└── tables/
    ├── posts.table.ts
    └── comments.table.ts
```

### E-commerce

```
shop/
├── index.tsx              # Главная
├── web/
│   └── shop/
│       ├── catalog.tsx    # Каталог
│       ├── product.tsx    # Товар (/:id)
│       ├── cart.tsx       # Корзина
│       └── checkout.tsx   # Оформление
│
├── pages/
│   ├── HomePage.vue
│   ├── CatalogPage.vue
│   ├── ProductPage.vue
│   ├── CartPage.vue
│   └── CheckoutPage.vue
│
├── api/
│   ├── products.ts
│   ├── cart.ts
│   ├── orders.ts
│   └── payment.ts
│
├── tables/
│   ├── products.table.ts
│   ├── categories.table.ts
│   ├── orders.table.ts
│   └── orderItems.table.ts
│
├── repos/
│   ├── product.repo.ts
│   └── order.repo.ts
│
├── lib/
│   └── cart.lib.ts
│
└── components/
    ├── ProductCard.vue
    ├── CartItem.vue
    └── OrderSummary.vue
```

---

## Лучшие практики

### Организация файлов

✅ **Группируйте по функциональности**:

- Связанные файлы держите рядом
- Используйте модульную структуру для крупных проектов

✅ **Держите файлы маленькими**:

- Один файл — одна ответственность
- Разбивайте большие файлы на части

✅ **Используйте понятные имена**:

- Имя файла должно отражать его функцию
- Избегайте абстрактных имен (file1.tsx, temp.tsx)

### Именование

✅ **Следуйте конвенциям**:

- camelCase для файлов роутов и переменных
- PascalCase для Vue компонентов и типов
- UPPER_SNAKE_CASE для констант

✅ **Добавляйте суффиксы**:

- `Route` для констант роутов
- `Page` для Vue страниц
- `.table.ts` для таблиц (файл С `.ts`, импорт БЕЗ `.ts`)

### Импорты

✅ **Используйте относительные пути**:

```typescript
import HomePage from './pages/HomePage.vue'
import { getUserData } from './lib/user.lib'
```

✅ **Группируйте импорты**:

```typescript
// Системные модули
import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'

// Локальные модули
import HomePage from './pages/HomePage.vue'
import { settingsRoute } from './settings'
```

### Документация

✅ **Создавайте .CHATIUM-LLM.md**:

- Документируйте структуру проекта
- Описывайте основные таблицы и API
- Обновляйте при изменениях

✅ **Добавляйте комментарии к сложной логике**:

```typescript
// Рассчитываем скидку на основе количества товаров
// и статуса пользователя (VIP получает +5%)
const discount = calculateDiscount(items, user)
```

---

## Связанные документы

- **002-routing.md** — Роутинг и file-based архитектура
- **007-vue.md** — Vue компоненты
- **001-standards.md** — Стандарты кодирования
- **008-heap.md** — База данных Heap; пары таблиц stage/prod и селектор окружения

---

**Версия**: 1.1  
**Дата**: 2025-11-02  
**Последнее обновление**: 2026-07-22 (новый раздел «Окружения stage/prod: два каталога проекта» — привязка «каталог = окружение» через config/env.ts из PROJECT_ROOT, правила слоёв для пар таблиц)

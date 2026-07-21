@chatium

# Стандарты кодирования в Chatium

Исчерпывающее руководство по стандартам кодирования, форматированию и стилям в Chatium.

## Содержание

- [Основные принципы](#основные-принципы)
- [Форматирование кода](#форматирование-кода)
- [Организация файлов](#организация-файлов)
- [JSX и HTML](#jsx-и-html)
- [TypeScript](#typescript)
- [Стили](#стили)
  - [TailwindCSS](#tailwindcss)
  - [Шрифты](#шрифты)
  - [Иконки (FontAwesome)](#иконки-fontawesome)
  - [Переиспользование стилей](#переиспользование-стилей)
- [Комментарии](#комментарии)
- [Импорты](#импорты)
- [Изображения](#изображения)
- [Частые ошибки](#частые-ошибки)

---

## Основные принципы

### KEEP FILES SMALL AND MAINTAINABLE

✅ **Структурируйте код по секциям и компонентам**:

- Каждая секция в отдельном файле
- Каждый компонент в отдельном файле
- Не создавайте файлы > 300-400 строк

❌ **Не делайте монолитные файлы**:

- Не пихайте всё в один корневой файл
- Не создавайте огромные компоненты

### Минимализм

✅ **Делайте только то, что просят**:

- Не изобретайте лишний функционал
- Не создавайте ненужные файлы
- Не добавляйте функции "на будущее"

### DRY (Don't Repeat Yourself)

✅ **Переиспользуйте код**:

- Выносите общую логику в `/shared/`
- Создавайте компоненты для повторяющихся UI
- Используйте `/styles.tsx` для общих стилей

---

## Форматирование кода

### Отступы

✅ **Используйте 2 пробела** для отступов:

```typescript
// Правильно
export const myRoute = app.get('/', async (ctx, req) => {
  const data = await loadData()
  return {
    success: true,
    data
  }
})
```

❌ **НЕ используйте табы**:

```typescript
// Неправильно
export const myRoute = app.get('/', async (ctx, req) => {
  const data = await loadData()
  return { success: true }
})
```

### Точки с запятой

✅ **Не обязательны, но можно использовать**:

```typescript
// Используйте `;` в конце строк
const x = 1
const y = 2
```

### Кавычки

✅ **Используйте одинарные** для строк:

```typescript
// Правильно
const message = 'Hello world'
const html = '<div>Content</div>'

// Для интерполяции - backticks
const greeting = `Hello, ${name}!`
```

---

## Организация файлов

### Структура проекта

```
/
├── index.tsx              # Единственный корневой роут (/)
├── web/                   # Браузерные роуты
│   ├── shop/
│   │   ├── index.tsx
│   │   └── cart.tsx
│   └── account/
│       └── index.tsx
├── styles.tsx             # Общие стили
│
├── pages/                 # Vue страницы
│   ├── HomePage.vue
│   ├── ProductPage.vue
│   └── CheckoutPage.vue
│
├── components/            # Переиспользуемые компоненты
│   ├── Header.vue
│   ├── Footer.vue
│   └── Button.vue
│
├── api/                   # API endpoints
│   └── products/
│       ├── list.ts
│       └── create.ts
│
├── tables/                # Heap таблицы (файлы .table.ts)
│   ├── products.table.ts
│   ├── orders.table.ts
│   └── users.table.ts
│
├── shared/                # Общий код
│   ├── utils.ts
│   ├── constants.ts
│   └── types.ts
│
├── lib/                   # Серверная логика
│   └── modules/
│       └── shop/
│           └── pricing.ts
│
├── docs/                  # Проектная документация
│   ├── architecture.md
│   ├── api.md
│   ├── data.md
│   ├── imports.md
│   ├── run.md
│   ├── adr/
│   └── LLM/
│
└── tools/                 # Инструменты для агентов
    ├── createOrder.ts
    └── searchProducts.ts
```

### Правила

1. **Каждый файл встречается только один раз** - не дублируйте
2. **Если импортируете - убедитесь что создан**
3. **Shared файлы** начинаются с `// @shared`
4. **API маршруты** используют `// @shared-route`
5. **Только .ts файлы** - не создавайте .js
6. **⚠️ Heap Tables**: Файлы таблиц С расширением `.table.ts`, а импорт **БЕЗ** `.ts` (`import Users from '../tables/users.table'`)
7. **Роуты**: в корне проекта только `index.tsx`, остальные страницы — в `/web/` и по одному роуту на файл

---

## JSX и HTML

### Закрывайте все теги

✅ **Правильно**:

```typescript
export default app.html('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Page Title</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  )
})
```

❌ **Неправильно** (незакрытые теги):

```typescript
<html>
  <head>
    <title>Page Title
    <meta name="viewport" content="width=device-width, initial-scale=1">
  <body>
    <Component />
```

### НЕ используйте HTML комментарии

❌ **Неправильно**:

```typescript
<html>
  <body>
    <!-- Это комментарий -->
    <Component />
  </body>
</html>
```

✅ **Правильно** (используйте JS комментарии):

```typescript
<html>
  <body>
    {/* Это комментарий */}
    <Component />
  </body>
</html>
```

### Экранирование в inline скриптах

✅ **Используйте backticks с экранированием**:

```typescript
<html>
  <head>
    <script type="text/javascript">{`
      // JavaScript код
      const config = {
        theme: 'dark',
        version: '1.0'
      }
    `}</script>
  </head>
</html>
```

---

## TypeScript

### Определяйте типы

✅ **Правильно**:

```typescript
interface Product {
  id: string
  title: string
  price: Money
  inStock: boolean
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
}

function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
```

### Используйте type для параметров

✅ **Правильно**:

```typescript
type CreateOrderParams = {
  items: OrderItem[]
  customerEmail: string
  customerPhone: string
}

export const apiCreateOrderRoute = app.post('/create', async (ctx, req) => {
  const params = req.body as CreateOrderParams
  // ...
})
```

---

## Стили

### TailwindCSS

**Версия**: 3.4.16 (обязательно эта версия!)

**Подключение**:

```typescript
export default app.html('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>My App</title>

        {/* TailwindCSS */}
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>

        {/* Конфигурация */}
        <script>{`
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  primary: '#3b82f6',
                  secondary: '#8b5cf6',
                  accent: '#10b981'
                }
              }
            }
          }
        `}</script>

        {/* CSS переменные */}
        <style type="text/tailwindcss">{`
          body {
            --color-primary: #1E40AF;
            --color-secondary: #1E3A8A;
            --color-accent: #3B82F6;
            --color-dark: #111827;
            --color-light: #F3F4F6;
          }
        `}</style>
      </head>
      <body>
        <HomePage />
      </body>
    </html>
  )
})
```

**Использование в Vue**:

```vue
<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold text-primary mb-4">Заголовок</h1>

    <button class="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      Кнопка
    </button>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="item in items" :key="item.id" class="border rounded-lg p-4">
        {{ item.title }}
      </div>
    </div>
  </div>
</template>
```

### Шрифты

**Google Fonts**:

```html
<head>
  <link
    href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
    rel="stylesheet"
  />

  <style type="text/tailwindcss">
    {`
        body {
          --font-sans: Roboto, sans-serif;
          --font-serif: Merriweather, serif;
          --font-mono: 'Courier New', monospace;
        }
      `}
  </style>
</head>
```

**Использование**:

```vue
<template>
  <h1 class="font-sans text-4xl">Sans-serif заголовок</h1>

  <p class="font-serif">Serif текст</p>

  <code class="font-mono"> Моноширинный код </code>
</template>
```

### Иконки (FontAwesome)

**Версия**: 6.7.2

**Подключение**:

```html
<head>
  <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

  <style type="text/tailwindcss">
    {`
        body {
          --font-sans: 'Font Awesome 6 Free', Roboto, sans-serif;
        }
      `}
  </style>
</head>
```

**Использование**:

```vue
<template>
  <div>
    {/* Solid иконки */}
    <i class="fas fa-heart"></i>
    <i class="fas fa-shopping-cart"></i>
    <i class="fas fa-user"></i>

    {/* Regular иконки */}
    <i class="far fa-heart"></i>
    <i class="far fa-star"></i>

    {/* Brand иконки */}
    <i class="fab fa-telegram"></i>
    <i class="fab fa-vk"></i>
    <i class="fab fa-github"></i>

    {/* С Tailwind классами */}
    <i class="fas fa-check text-green-500 text-2xl"></i>
    <i class="fas fa-times text-red-500 text-xl"></i>
  </div>
</template>
```

**⚠️ Важно**:

- Используйте FontAwesome, не пишите SVG иконки вручную
- Всегда добавляйте link в head
- Классы: `fas` (solid), `far` (regular), `fab` (brands)

### Переиспользование стилей

**Создайте styles.tsx**:

```typescript
// styles.tsx

export const tailwindScript = `
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          accent: '#10b981'
        }
      }
    }
  }
`

export const cssVariables = `
  body {
    --color-primary: #1E40AF;
    --color-secondary: #1E3A8A;
    --color-accent: #3B82F6;
    --color-dark: #111827;
    --color-light: #F3F4F6;
  }
`

export const commonStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Roboto', sans-serif;
    line-height: 1.6;
    color: #333;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
    margin-bottom: 1rem;
  }
`
```

**Использование**:

```typescript
// index.tsx
import { tailwindScript, cssVariables, commonStyles } from './styles'

export default app.html('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>My App</title>

        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script>{tailwindScript}</script>

        <style type="text/tailwindcss">{cssVariables}</style>
        <style>{commonStyles}</style>
      </head>
      <body>
        <HomePage />
      </body>
    </html>
  )
})
```

---

## Комментарии

### Когда писать

✅ **Пишите комментарии**:

- Для сложной бизнес-логики
- Для неочевидных решений
- Для временных workaround

❌ **НЕ пишите комментарии**:

- Для очевидного кода
- "Тут будет кнопка"
- "TODO: сделать позже" (лучше сделайте сейчас)

**Примеры**:

```typescript
// ✅ Хорошо
// Используем ROW_NUMBER для получения последнего статуса каждого заказа
// потому что один заказ может иметь несколько изменений статуса
const query = `...`

// ❌ Плохо
// Получаем продукты
const products = await ProductsTable.findAll(ctx, {})

// ❌ Плохо
// Тут будет кнопка

// ❌ Плохо
// TODO: добавить валидацию
```

---

## Импорты

### Относительные пути

✅ **Используйте относительные пути**:

```typescript
// Из текущей директории
import Component from './components/Component.vue'
import { helper } from './shared/utils'

// Из родительской
import Table from '../tables/products.table'

// Из корня
import { indexPageRoute } from '../../index'
```

**⚠️ ОЧЕНЬ ВАЖНО**: после любого изменения импортов обновляйте `docs/imports.md` и сразу проверяйте по нему, что **нет циклических зависимостей**. Циклы недопустимы.

### Системные модули

✅ **Импортируйте системные модули**:

```typescript
// HTML и JSX
import { jsx } from '@app/html-jsx'

// База данных
import { Money, Heap } from '@app/heap'

// Запросы
import { request } from '@app/request'

// Авторизация
import { requireRealUser } from '@app/auth'

// Хранилище
import { getThumbnailUrl, obtainStorageFilePutUrl } from '@app/storage'

// SDK
import { writeWorkspaceEvent } from '@start/sdk'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import { runAttemptPayment } from '@pay/sdk'
import { sendMessageToChat } from '@sender/sdk'
```

### Shared файлы

✅ **Обязательно добавляйте комментарий**:

```typescript
// @shared
// shared/calculate.ts

export function calculate(a: number, b: number): number {
  return a + b
}
```

✅ **Создавайте отдельный файл для каждой функции**:

```
shared/
├── calculate.ts         # Одна функция
├── formatDate.ts        # Одна функция
└── validateEmail.ts     # Одна функция
```

---

## Изображения

### Правила работы с изображениями

❌ **НИКОГДА не используйте**:

- `via.placeholder.com` (не работает)
- Придуманные URL
- Изображения из интернета без проверки

✅ **ВСЕГДА используйте**:

- Инструмент поиска изображений
- Реальные URL, предоставленные инструментом
- Проверенные источники

**Пример**:

```vue
<template>
  <!-- ❌ Плохо -->
  <img src="https://via.placeholder.com/300" />

  <!-- ✅ Хорошо -->
  <img :src="getThumbnailUrl(productImage, 300, 300)" />
</template>

<script setup>
import { getThumbnailUrl } from "@app/storage"

const props = defineProps<{
  productImage: string
}>()
</script>
```

---

## Частые ошибки

### ❌ НЕ делайте так

**1. Хардкод URL**:

```typescript
// Плохо
<a href="./product/123">Product</a>

// Хорошо
<a :href="productRoute({ id: '123' }).url()">Product</a>
```

**2. Использование таблиц на клиенте**:

```vue
<!-- Плохо -->
<script setup>
import ProductsTable from '../tables/products.table'
const products = await ProductsTable.findAll(ctx, {})
</script>

<!-- Хорошо -->
<script setup>
import { apiProductsListRoute } from '../api/products/list'
const products = ref([])
onMounted(async () => {
  products.value = await apiProductsListRoute.run(ctx)
})
</script>
```

**3. Подсчёт через findAll**:

```typescript
// Плохо (неправильный результат при > 1000 записей!)
const count = (await ProductsTable.findAll(ctx, {})).length

// Хорошо
const count = await ProductsTable.countBy(ctx, {})
```

**4. Использование process**:

```typescript
// Плохо (process не существует!)
if (process.env.NODE_ENV === 'production') {
}

// Хорошо (используйте конфигурацию)
const config = await getAppConfig(ctx)
if (config.environment === 'production') {
}
```

**5. UserRefLinkKind как строка**:

```typescript
// Плохо
const userId = order.customer // Это объект!

// Хорошо
const userId = order.customer.id
const user = await order.customer.get(ctx)
```

**6. Обычная математика на Money**:

```typescript
// Плохо
const total = product.price + 100

// Хорошо
const total = product.price.add(new Money(100, 'RUB'))
```

**7. НЕ используйте console.log**:

```typescript
// Плохо
console.log('Debug info')

// Хорошо
ctx.account.log('Debug info', {
  level: 'info',
  json: { data }
})
```

⚠️ **Не путайте с `ctx.console`.** Рядом существует `ctx.console.log()` (в части контекстов — `ctx.log()`), и это **не логирование**: вывод уходит в консоль браузера разработчика, ничего не сохраняется и в проде не видно.

Логирование целиком — [050-logging.md](050-logging.md).

**8. Heap Tables с неправильным расширением/импортом**:

```typescript
// ❌ Плохо - файл без .ts
// tables/products.table

// ✅ Хорошо - файл с .table.ts и импорт без .ts
// tables/products.table.ts
import { Heap } from '@app/heap'
export const Products = Heap.Table('products', { ... })
// import { Products } from '../tables/products.table'
```

**9. Неправильный синтаксис order в запросах**:

```typescript
// ❌ Плохо - синтаксис других ORM
const items = await Table.findAll(ctx, {
  order: [{ field: 'title', direction: 'asc' }]
})

// ✅ Хорошо - синтаксис Chatium
const items = await Table.findAll(ctx, {
  order: [{ title: 'asc' }]
})
```

**10. Использование filter вместо where**:

```typescript
// ❌ Плохо - параметр filter не существует
const items = await Table.findAll(ctx, {
  filter: { status: 'active' }
})

// ✅ Хорошо - используйте where
const items = await Table.findAll(ctx, {
  where: { status: 'active' }
})
```

---

## Валидация данных (@app/validation)

### Обзор

`@app/validation` — это модуль для валидации данных в роутах и API endpoints. Основан на библиотеке Zod и предоставляет удобный способ проверки входящих данных.

**ВАЖНО:** Этот модуль используется в некоторых примерах кода, но не является обязательным для всех проектов.

### Базовое использование

```typescript
import { z } from '@app/validation'

// Определение схемы валидации
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(18).optional()
})

// Использование в роуте
export const createUserRoute = app.post('/users', async (ctx, req) => {
  try {
    // Валидация данных
    const validatedData = userSchema.parse(req.body)

    // Дальнейшая обработка
    return {
      success: true,
      user: validatedData
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors
      }
    }
    throw error
  }
})
```

### Встроенная валидация в роутах

Chatium поддерживает встроенную валидацию через метод `.body()`:

```typescript
// Рекомендуемый способ - встроенная валидация
export const createUserRoute = app
  .body((s) => ({
    name: s.string(),
    email: s.string(),
    age: s.number().optional()
  }))
  .post('/users', async (ctx, req) => {
    // req.body уже валидирован
    return {
      success: true,
      user: req.body
    }
  })
```

### Примеры валидации

#### Базовые типы

```typescript
import { z } from '@app/validation'

// Строки
z.string()
z.string().min(5).max(100)
z.string().email()
z.string().url()

// Числа
z.number()
z.number().positive()
z.number().min(0).max(100)

// Булевы значения
z.boolean()

// Даты
z.date()
z.string().datetime()

// Опциональные поля
z.string().optional()
z.number().nullable()
```

#### Сложные типы

```typescript
import { z } from '@app/validation'

// Массивы
z.array(z.string())
z.array(z.number()).min(1).max(10)

// Объекты
z.object({
  name: z.string(),
  settings: z.object({
    theme: z.enum(['light', 'dark']),
    notifications: z.boolean()
  })
})

// Enum
z.enum(['active', 'inactive', 'pending'])

// Union
z.union([z.string(), z.number()])
```

#### Кастомная валидация

```typescript
import { z } from '@app/validation'

// Кастомная проверка
const passwordSchema = z.string().refine((val) => val.length >= 8 && /[A-Z]/.test(val), {
  message: 'Пароль должен содержать минимум 8 символов и одну заглавную букву'
})

// Трансформация данных
const trimmedString = z.string().transform((val) => val.trim())
```

### Использование в примерах

В проекте templates `@app/validation` используется в следующих примерах:

```typescript
// examples/api/rest-endpoints/route-params.tsx
import { z } from '@app/validation'

// Пример валидации параметров
const paramsSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['user', 'post', 'comment'])
})
```

### Когда использовать

✅ **Используйте @app/validation когда:**

- Нужна сложная валидация с кастомными правилами
- Требуется валидация вложенных объектов
- Нужна трансформация данных при валидации
- Хотите использовать все возможности Zod

✅ **Используйте встроенную валидацию .body() когда:**

- Простая валидация полей формы
- Базовые типы (string, number, boolean)
- Не требуется кастомная логика

### Обработка ошибок валидации

```typescript
import { z } from '@app/validation'

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18)
})

export const validateRoute = app.post('/validate', async (ctx, req) => {
  try {
    const data = schema.parse(req.body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
    }

    return {
      success: false,
      error: 'Ошибка валидации'
    }
  }
})
```

### Примечание

**Документация:** `@app/validation` основан на Zod. Для подробной информации о всех возможностях валидации см. [документацию Zod](https://zod.dev/).

**Альтернативы:** Для простых случаев используйте встроенную валидацию Chatium через `.body()` метод роутов.

**Примеры:** См. `examples/api/rest-endpoints/route-params.tsx` в проекте templates.

---

## Связанные документы

- **006-arch.md** — Архитектура проекта
- **007-vue.md** — Vue компоненты
- **002-routing.md** — Маршрутизация

---

**Версия**: 1.1  
**Дата**: 2025-11-08  
**Последнее обновление**: Добавлена документация @app/validation для валидации данных

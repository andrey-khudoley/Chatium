@chatium

# Входящий роутинг в Chatium

Исчерпывающее руководство по обработке входящих HTTP запросов в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [File-based архитектура роутинга](#file-based-архитектура-роутинга)
  - [Навигация через слеш и тильду](#навигация-через-слеш-и-тильду)
  - [Примеры формирования URL](#примеры-формирования-url)
  - [Рекомендации по использованию](#рекомендации-по-использованию)
- [Типы роутов](#типы-роутов)
  - [app.get - GET запросы](#appget---get-запросы)
  - [app.post - POST запросы](#apppost---post-запросы)
  - [app.html - HTML страницы](#apphtml---html-страницы)
  - [app.put и app.delete](#appput-и-appdelete)
- [Структура обработчика](#структура-обработчика)
  - [Параметр ctx (контекст)](#параметр-ctx-контекст)
  - [Параметр req (запрос)](#параметр-req-запрос)
- [Параметры маршрутов](#параметры-маршрутов)
  - [Параметры пути (:id)](#параметры-пути-id)
  - [Query параметры (?key=value)](#query-параметры-keyvalue)
  - [Body параметры (POST/PUT)](#body-параметры-postput)
- [Форматирование ответов](#форматирование-ответов)
  - [Возврат JSON](#возврат-json)
  - [Возврат HTML](#возврат-html)
  - [Возврат с кастомными заголовками](#возврат-с-кастомными-заголовками)
  - [Обработка ошибок](#обработка-ошибок)
  - [Перенаправления](#перенаправления)
- [Генерация ссылок](#генерация-ссылок)
  - [Базовое использование route.url()](#базовое-использование-routeurl)
  - [Ссылки с параметрами](#ссылки-с-параметрами)
  - [Использование в Vue](#использование-в-vue)
- [Вызов API роутов через .run()](#вызов-api-роутов-через-run)
  - [Основные концепции](#основные-концепции-1)
  - [Почему .run(), а не fetch()?](#почему-run-а-не-fetch)
  - [Синтаксис .run()](#синтаксис-run)
  - [Примеры использования](#примеры-использования)
  - [Паттерны использования](#паттерны-использования)
  - [Импорт API роутов](#импорт-api-роутов)
  - [Когда использовать fetch() vs .run()](#когда-использовать-fetch-vs-run)
- [Валидация параметров](#валидация-параметров)
- [Чек-листы](#чек-листы)
  - [Чек-лист создания страницы](#чек-лист-создания-страницы)
  - [Чек-лист создания API роута](#чек-лист-создания-api-роута)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**Входящий роутинг** — механизм обработки HTTP запросов от клиентов к вашему приложению в Chatium.

### Ключевые понятия

- **Маршрут (Route)** — объект, создаваемый вызовом `app.get()`, `app.post()` и подобных функций
- **Обработчик (Handler)** — async функция, обрабатывающая запрос
- **Контекст (ctx)** — обязательный параметр обработчика, формируется автоматически фреймворком для каждого запроса
- **Request (req)** — объект с параметрами HTTP запроса

### ⚠️ Лимит времени ответа

Обработчик эндпоинта (роут / `app.function`) должен уложиться в **20 секунд** (платформенное ограничение). Долгие операции нельзя делать синхронно в ответе — выносите их в отложенный джоб (`app.job`, до **60 секунд** на запуск, см. `005-jobs.md`) и/или дробите на партии с учётом лимита выборки **1000 строк на запрос** (`008-heap.md`).

### Принципы работы

Chatium использует **file-based роутинг**: URL формируется на основе расположения файлов в проекте.

```
Расположение файла → Базовый путь → Итоговый URL
```

**ВАЖНО**: URL всегда **относительный**. Проект находится внутри воркспэйса, поэтому итоговый путь строится как:

```
./${PROJECT_ROOT}/${ROUTE}
```

Где `PROJECT_ROOT` задаётся в `/config/routes.tsx`, а `ROUTE` — путь внутри проекта. **Нельзя** указывать абсолютный `/`, используйте `./`.

---

## File-based архитектура роутинга

### Навигация через слеш и тильду

**Навигация по файлам через `/` (слеш)**:

- Структура директорий определяет базовый путь
- Каждая папка добавляет сегмент к URL
- Пример: файл в `web/admin/settings/index.tsx` → `./web/admin/settings` (итогово: `./${PROJECT_ROOT}/web/admin/settings`)

**Навигация внутри файла через `~` (тильда)**:

- Тильда отделяет базовый путь файла от явного маршрута
- Используется когда в файле объявлен путь отличный от `'/'`
- Пример: `app.get('/edit')` в файле `web/settings/index.tsx` → `./web/settings~edit`
  - ⚠️ **ОЧЕНЬ ВАЖНО**: если путь в файле не `'/'`, `~` появляется **всегда**

### Примеры формирования URL

**Чистый путь (рекомендуется)**:

```typescript
// Файл: web/dashboard/index.tsx
export const dashboardRoute = app.get('/', async (ctx, req) => {
  // URL: ./web/dashboard (итогово: ./${PROJECT_ROOT}/web/dashboard)
  return <html>...</html>
})
```

**Путь с тильдой (явный маршрут)**:

```typescript
// Файл: web/dashboard/settings.tsx
export const editSettingsRoute = app.get('/edit', async (ctx, req) => {
  // URL: ./${PROJECT_ROOT}/web/dashboard/settings~edit
  // Тильда появляется из-за явного пути '/edit' (избегайте по возможности)
  return <html>...</html>
})
```

**Вложенные явные пути**:

```typescript
// Файл: api/settings/advanced.ts
export const advancedRoute = app.get('/security', async (ctx, req) => {
  // URL: ./${PROJECT_ROOT}/api/settings/advanced~security
  // Первая тильда отделяет базовый путь, далее обычные слеши
  return { settings: {} }
})
```

**Параметры пути**:

```typescript
// Файл: web/blog/post.tsx
export const postRoute = app.get('/:id', async (ctx, req) => {
  // URL: ./${PROJECT_ROOT}/web/blog/post~123 (где 123 — значение параметра id)
  // ⚠️ По возможности избегайте /:id — лучше ?id=... или body
  const postId = req.params.id
  return <html>...</html>
})
```

### Рекомендации по использованию

✅ **Используйте `'/'` для чистых путей**:

- Внутри модуля используйте `'/'` как корень
- Позволяет фреймворку формировать чистые URL из структуры файлов
- Для браузерных страниц создавайте отдельный файл на каждый маршрут и храните их в `/web/` (кроме корневого `index.tsx`)

✅ **Используйте явные пути только при необходимости**:

- Публичные API endpoints с фиксированными URL
- Обратная совместимость со старыми ссылками
- Специальные пермалинки

❌ **Избегайте избыточных явных путей**:

- Не дублируйте структуру папок в явных путях
- Полагайтесь на file-based роутинг для организации
- **КРИТИЧЕСКИ ВАЖНО**: если путь в файле не `'/'`, URL будет строиться через `~`
- По возможности **избегайте `/:id`** — используйте `?id=...` для GET или `body` для POST

---

## Типы роутов

**⚠️ ОЧЕНЬ ВАЖНО**: если эндпоинт внутри файла отличается от `'/'`, URL будет строиться через `~`. По возможности используйте `'/'` и file-based структуру.

### app.get - GET запросы

Используется для получения данных и отображения страниц:

```typescript
// Файл: index.tsx
export const indexPageRoute = app.get('/', async (ctx, req) => {
  return { message: 'Hello, World!' }
})
```

```typescript
// Файл: api/products/list.ts
export const getProductsRoute = app.get('/', async (ctx, req) => {
  const products = await ProductsTable.findAll(ctx, { limit: 100 })
  return products
})
```

### app.post - POST запросы

Используется для создания и изменения данных:

```typescript
// Файл: api/products/create.ts
export const createProductRoute = app.post('/', async (ctx, req) => {
  const { name, price } = req.body

  const product = await ProductsTable.create(ctx, {
    name,
    price: new Money(price, 'RUB')
  })

  return { success: true, product }
})
```

### app.html - HTML страницы

Семантический вариант app.get для HTML страниц:

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import HomePage from './pages/HomePage.vue'

export const homePageRoute = app.html('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Главная страница</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
      </head>
      <body>
        <HomePage />
      </body>
    </html>
  )
})
```

**Важно**:

- Используйте комментарий `// @shared` для экспорта маршрута
- Импортируйте `{ jsx }` из `@app/html-jsx`
- Всегда закрывайте все HTML теги

### app.put и app.delete

Используются для обновления и удаления:

```typescript
// PUT - обновление
// Файл: api/products/update.ts
export const updateProductRoute = app.put('/', async (ctx, req) => {
  const { id, name, price } = req.body

  const product = await ProductsTable.update(ctx, {
    id,
    name,
    price: new Money(price, 'RUB')
  })

  return { success: true, product }
})

// DELETE - удаление
// Файл: api/products/delete.ts
export const deleteProductRoute = app.delete('/', async (ctx, req) => {
  const { id } = req.query

  await ProductsTable.delete(ctx, id)

  return { success: true }
})
```

---

## Структура обработчика

Обработчик маршрута — это async функция с двумя параметрами:

```typescript
export const myRoute = app.get('/', async (ctx, req) => {
  // ctx — контекст приложения (формируется автоматически)
  // req — объект HTTP запроса

  // Ваша логика

  return result
})
```

### Параметр ctx (контекст)

**Формируется автоматически фреймворком** для каждого запроса:

```typescript
ctx.user // Текущий пользователь (см. 003-auth.md)
ctx.account // Текущий аккаунт
ctx.session // Сессия пользователя
ctx.lang // Язык пользователя ('ru', 'en', etc.)
ctx.t() // Функция локализации

// Логирование
ctx.account.log('Сообщение', { level: 'info', json: { data } })
```

**Важно**:

- ctx — обязательный параметр всех обработчиков
- Формируется автоматически, не требует ручного создания
- Содержит полную информацию о запросе и пользователе

### Параметр req (запрос)

Объект с параметрами HTTP запроса:

```typescript
req.query // Query параметры (?key=value)
req.params // Параметры пути (:id, :slug)
req.body // Тело POST/PUT запроса
req.headers // HTTP заголовки
```

---

## Параметры маршрутов

### Параметры пути (:id)

Определяются с помощью двоеточия в шаблоне маршрута:

```typescript
// Файл: web/blog/post.tsx
export const postRoute = app.get('/:id', async (ctx, req) => {
  const postId = req.params.id
  // URL: ./${PROJECT_ROOT}/web/blog/post~123 → postId = "123"
  // ⚠️ ~ появляется из-за /:id. По возможности используйте ?id=... или body

  const post = await PostsTable.findById(ctx, postId)

  if (!post) {
    return { error: 'Post not found' }
  }

  return (
    <html>
      <body>
        <PostPage post={post} />
      </body>
    </html>
  )
})
```

**Несколько параметров**:

```typescript
export const articleRoute = app.get('/:category/:articleId', async (ctx, req) => {
  const { category, articleId } = req.params
  // URL: ./${PROJECT_ROOT}/web/blog~technology/article-123
  // category = "technology", articleId = "article-123"

  return { category, articleId }
})
```

### Query параметры (?key=value)

Передаются в URL после знака вопроса:

```typescript
// Файл: web/search/index.tsx
export const searchRoute = app.get('/', async (ctx, req) => {
  const query = req.query.q as string
  const page = parseInt((req.query.page as string) || '1')
  const limit = parseInt((req.query.limit as string) || '10')

  // URL: ./${PROJECT_ROOT}/web/search?q=chatium&page=2&limit=20
  // ⚠️ Если бы путь был '/search', URL стал бы ./${PROJECT_ROOT}/web/search~search
  // query = "chatium", page = 2, limit = 20

  const results = await performSearch(ctx, query, page, limit)

  return { results, page, limit }
})
```

### Body параметры (POST/PUT)

Доступны в req.body для POST и PUT запросов:

```typescript
// Файл: api/users/create.ts
export const createUserRoute = app.post('/', async (ctx, req) => {
  const { name, email, age } = req.body

  // Валидация
  if (!name || !email) {
    return { error: 'Name and email are required' }
  }

  const user = await UsersTable.create(ctx, {
    name,
    email,
    age: age || null
  })

  return { success: true, user }
})
```

### Валидация тела через `.body()` и `.query()` (рекомендуется)

Помимо ручной проверки полей, на объекте **`app`** можно объявить схему входа: тогда **`req.body`** / **`req.query`** уже приведены к ожидаемым типам (ошибки валидации обрабатывает платформа).

Типичные формы цепочки:

```typescript
// POST: метод → схема тела → обработчик
export const apiSaveRoute = app
  .post('/')
  .body((s) => ({
    title: s.string(),
    count: s.number().optional()
  }))
  .handle(async (ctx, req) => {
    const { title, count } = req.body
    return { ok: true, title, count }
  })

// GET: схема query → обработчик
export const apiGetRoute = app
  .get('/')
  .query((s) => ({ id: s.string() }))
  .handle(async (ctx, req) => {
    const record = await Items.findById(ctx, req.query.id)
    return record ?? null
  })
```

**Важно:** **`.body()`** и **`.query()`** присоединяются к конкретному методу (**`post`** / **`get`**) и всегда стоят **перед** **`.handle()`**. Цепочка **всегда начинается** с **`app.post('/')`** или **`app.get('/')`**. Обработчик задаётся в **`.handle(async (ctx, req) => …)`**, а не вторым аргументом **`post`** / **`get`** (устаревший вариант). В цепочке роутинга **нет** метода **`.result()`**. UTF-8 Base64 для тел/заголовков — самописный модуль по **`047-base64.md`** (**не** глобалы `base64Encode`); запрет **`ctx.req.json` / `ctx.res`** — там же и в этом файле.

---

## Форматирование ответов

### Возврат JSON

Возвращайте простые JavaScript объекты — они автоматически сериализуются в JSON:

```typescript
// Файл: api/data.ts
export const apiRoute = app.get('/', async (ctx, req) => {
  return {
    success: true,
    data: {
      id: '123',
      name: 'Product',
      price: 999
    },
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
  }
})
```

**Рекомендуемый формат успешного ответа**:

```typescript
return {
  success: true,
  data: result,
  meta?: { ... }  // Опционально
}
```

**Рекомендуемый формат ответа с ошибкой**:

```typescript
return {
  success: false,
  error: 'Error message',
  code?: 'ERROR_CODE'  // Опционально
}
```

### Возврат HTML

Используйте JSX для серверного рендеринга:

```typescript
// @shared
import { jsx } from "@app/html-jsx"

export const pageRoute = app.get('/', async (ctx, req) => {
  return (
    <html>
      <head>
        <title>Page Title</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />
      </head>
      <body>
        <h1>Hello, World!</h1>
      </body>
    </html>
  )
})
```

### Возврат с кастомными заголовками

Для отдачи файлов или контента с кастомными HTTP заголовками используйте формат с `rawHttpBody`:

```typescript
// Отдача JavaScript файла
export const serveJsRoute = app.get('/:filename', async (ctx, req) => {
  const { filename } = req.params
  // URL: ./${PROJECT_ROOT}/serve~<filename>
  // ⚠️ ~ появляется из-за /:filename

  const script = await ScriptsTable.findOneBy(ctx, { name: filename })

  if (!script) {
    return 'Script not found'
  }

  return {
    statusCode: 200,
    rawHttpBody: script.content,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8'
    }
  }
})
```

**Формат ответа с заголовками**:

```typescript
return {
  statusCode: number, // HTTP статус код (200, 404, 500, etc.)
  rawHttpBody: string, // Контент ответа (строка)
  headers: {
    // Объект с HTTP заголовками
    'Header-Name': 'value'
  }
}
```

**Примеры для разных типов контента**:

```typescript
// CSS файл
return {
  statusCode: 200,
  rawHttpBody: cssContent,
  headers: {
    'Content-Type': 'text/css; charset=utf-8'
  }
}

// JavaScript файл
return {
  statusCode: 200,
  rawHttpBody: jsContent,
  headers: {
    'Content-Type': 'application/javascript; charset=utf-8'
  }
}

// Текстовый файл
return {
  statusCode: 200,
  rawHttpBody: textContent,
  headers: {
    'Content-Type': 'text/plain; charset=utf-8'
  }
}

// JSON с дополнительными заголовками
return {
  statusCode: 200,
  rawHttpBody: JSON.stringify(data),
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Custom-Header': 'custom-value'
  }
}

// Файл для скачивания
return {
  statusCode: 200,
  rawHttpBody: fileContent,
  headers: {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Content-Disposition': 'attachment; filename=script.js'
  }
}
```

**Важные моменты**:

⚠️ **НЕ используйте `ctx.header()` или `ctx.set()` — эти методы не существуют!**

```typescript
// ❌ НЕПРАВИЛЬНО - эти методы не работают
ctx.header('Content-Type', 'text/css')
ctx.set('Content-Type', 'text/css')
return content

// ✅ ПРАВИЛЬНО - используйте объект с rawHttpBody и headers
return {
  statusCode: 200,
  rawHttpBody: content,
  headers: {
    'Content-Type': 'text/css; charset=utf-8'
  }
}
```

**Когда использовать**:

✅ Используйте `rawHttpBody` для:

- Отдачи JavaScript и CSS файлов
- Отдачи текстового контента с специфическим Content-Type
- Установки дополнительных заголовков (Cache-Control, CORS, etc.)
- Файлов для скачивания (Content-Disposition)

✅ Используйте обычный `return` для:

- JSON ответов (автоматически сериализуется)
- HTML страниц (JSX)
- Простых текстовых ответов без специальных заголовков

✅ **JSON с явным HTTP-статусом (рекомендуется):** цепочка `ctx.resp.status(<code>).json(<body>)` (или два шага: `ctx.resp.status(<code>)` и затем `return ctx.resp.json(<body>)`). Примеры:

```typescript
return ctx.resp.status(201).json({ created: true })
return ctx.resp.status(404).html('<h1>Not Found</h1>')
return ctx.resp.status(418).header('X-Custom', 'value').body('Raw string body')
```

✅ **Полный контроль без fluent API:** объект `{ statusCode, rawHttpBody, headers }` — см. примеры выше в этом разделе.

⚠️ **Поведение внешнего HTTP-статуса** для устаревшей формы **`ctx.resp.json(body, statusCode)`** (второй аргумент — код) и для редиректов при запросе к приложению снаружи может **не совпадать** с ожидаемым «классическим» кодом (например, тело ошибки приходит при **HTTP 200**). Для предсказуемого статуса используйте **`ctx.resp.status(statusCode).json(body)`** или **`rawHttpBody`**. Эмпирическая сводка по пробам: **`048-chatium-http-response-probes.md`**.

**Пример реального использования**:

```typescript
// Файл: serve.tsx
// Отдача скриптов и стилей с правильным Content-Type

export const serveScriptRoute = app.get('/:filename', async (ctx, req) => {
  const { filename } = req.params
  // URL: ./${PROJECT_ROOT}/serve~<filename>
  // ⚠️ ~ появляется из-за /:filename

  // Определяем расширение и имя файла
  const extension = filename.match(/\.(js|css)$/)?.[1]
  const name = filename.replace(/\.(js|css)$/, '')

  // Ищем скрипт по имени
  const script = await ScriptsTable.findOneBy(ctx, { name })

  if (!script) {
    return 'Script not found'
  }

  // Определяем Content-Type в зависимости от расширения
  let contentType = 'text/plain; charset=utf-8'
  if (extension === 'css') {
    contentType = 'text/css; charset=utf-8'
  } else if (extension === 'js') {
    contentType = 'application/javascript; charset=utf-8'
  }

  // Возвращаем контент с правильными заголовками
  return {
    statusCode: 200,
    rawHttpBody: script.content,
    headers: {
      'Content-Type': contentType
    }
  }
})
```

**Почему это важно**:

Firefox и другие браузеры строго проверяют MIME-типы для CSS и JS файлов:

- Неправильный `Content-Type` для CSS → ошибка `NS_ERROR_FAILURE`, стиль не применяется
- Неправильный `Content-Type` для JS → скрипт может не выполниться
- Простой `return` строки → Content-Type по умолчанию `text/plain`, что неправильно для файлов

### Обработка ошибок

**Базовая обработка**:

```typescript
// Файл: api/action.ts
export const apiRoute = app.post('/', async (ctx, req) => {
  try {
    const result = await performAction(ctx, req.body)
    return { success: true, result }
  } catch (error) {
    ctx.account.log('API error', {
      level: 'error',
      json: { error: error.message }
    })
    return {
      success: false,
      error: error.message
    }
  }
})
```

**Валидация с ранним возвратом**:

```typescript
// Файл: api/items/create.ts
export const createItemRoute = app.post('/', async (ctx, req) => {
  const { name, price } = req.body

  // Валидация
  if (!name) {
    return { success: false, error: 'Name is required' }
  }

  if (!price || price <= 0) {
    return { success: false, error: 'Invalid price' }
  }

  // Создание
  const item = await ItemsTable.create(ctx, { name, price })

  return { success: true, item }
})
```

**Логирование ошибок**:

```typescript
// ❌ Неправильно
console.log('Error:', error)

// ✅ Правильно
ctx.account.log('Error occurred', {
  level: 'error',
  json: { error: error.message, stack: error.stack }
})
```

### Перенаправления

**⚠️ ВАЖНО**: На серверной стороне используйте **относительные пути**, не `.url()`!

**КРИТИЧНО**: Пути в формате `/path` — это абсолютные пути от корня домена! Если проект находится в `./${PROJECT_ROOT}/` (например, `./p/myproject/`), то редирект на `/login` приведёт к `https://domain.com/login`, а НЕ к `https://domain.com/p/myproject/login`!

```typescript
// ✅ ПРАВИЛЬНО - относительный путь (на том же уровне)
export const redirectRoute = app.get('/', async (ctx) => {
  return ctx.resp.redirect('./dashboard')
})

// ✅ ПРАВИЛЬНО - относительный путь к родительской директории, затем в другой путь
// Из ./${PROJECT_ROOT}/admin в ./${PROJECT_ROOT}/login
export const adminRoute = app.get('/', async (ctx) => {
  return ctx.resp.redirect('../login')
})

// ✅ ПРАВИЛЬНО - внешний URL
export const externalRedirectRoute = app.get('/', async (ctx) => {
  return ctx.resp.redirect('https://example.com')
})

// ❌ КРИТИЧЕСКАЯ ОШИБКА - абсолютный путь от корня домена!
// Редирект на /login приведёт к https://domain.com/login вместо https://domain.com/p/myproject/login
export const wrongRoute = app.get('/', async (ctx) => {
  return ctx.resp.redirect('/login') // ❌ ПЛОХО - уйдёт в корень домена!
})

// ❌ НЕПРАВИЛЬНО - использование .url() на сервере
import { dashboardRoute } from './dashboard' // Циклическая зависимость!

export const redirectRoute = app.get('/', async (ctx) => {
  return ctx.resp.redirect(dashboardRoute.url()) // ❌ Плохо
})
```

**Примеры относительных путей (внутри проекта):**

- `./path` — путь на том же уровне
  - Из `./web/admin` в `./web/profile` → `./profile`
- `../path` — выйти на уровень вверх, затем войти в `path`
  - Из `./web/admin/settings` в `./web/profile` → `../profile`
- `../../path` — выйти на два уровня вверх, затем войти в `path`

**⚠️ ВАЖНО**: URL всегда относительный. Итоговый путь = `./${PROJECT_ROOT}/...`.

```
PROJECT_ROOT = dev/myproject
web/
├── profile/index.tsx   → URL: ./${PROJECT_ROOT}/web/profile
├── login/index.tsx     → URL: ./${PROJECT_ROOT}/web/login
└── admin/index.tsx     → URL: ./${PROJECT_ROOT}/web/admin

// Из profile в login (на одном уровне)
ctx.resp.redirect('./login')  // ✅ Правильно
```

**URL через PROJECT_ROOT при циклических зависимостях (используйте /config/routes.tsx):**

```typescript
// Если нужен путь для клиента и есть циклические зависимости
import { withProjectRoot, ROUTES } from '../config/routes'

export const redirectRoute = app.get('/', async (ctx) => {
  // ✅ Используем переменные из config/routes.tsx
  const dashboardUrl = withProjectRoot(ROUTES.dashboard)
  return ctx.resp.redirect(dashboardUrl)
})
```

**⚠️ КРИТИЧЕСКАЯ ОШИБКА - НЕ хардкодьте URL:**

```typescript
// ❌ ПЛОХО - хардкод URL/домена
const url = './dev/myproject/dashboard'

// ✅ ХОРОШО - переменные из config/routes.tsx
import { withProjectRoot, ROUTES } from '../config/routes'
const url = withProjectRoot(ROUTES.dashboard)
```

---

## Генерация ссылок

### ⚠️ КРИТИЧЕСКИ ВАЖНО: Когда использовать route.url()

**Новое правило** (с 2026-01-30):

**На серверной стороне (в роутах):**

- ✅ **Используйте относительные пути через точку**: `./admin`, `../profile`, `./login`
- ✅ **НЕ используйте `.url()`** для серверных редиректов и внутренних ссылок

**`.url()` используется ТОЛЬКО когда выполняются ОБА условия:**

1. Результат передаётся **на фронтенд** (в Vue компоненты, в JSON API для клиента)
2. Это **НЕ вызовет циклических зависимостей**

**Если возникает циклическая зависимость:**

- Используйте переменные из **`/config/routes.tsx`** (ОБЯЗАТЕЛЬНЫЙ файл в каждом проекте)
- ⚠️ **КРИТИЧЕСКАЯ ОШИБКА**: Хардкодить домены/пути запрещено
- Используйте `withProjectRoot(ROUTES.x)` для передачи пути на клиент

### Примеры правильного использования

**❌ НЕПРАВИЛЬНО - использование `.url()` на сервере с риском циклических зависимостей:**

```typescript
// admin.tsx
import { indexRoute } from './index'  // ← Циклическая зависимость!

export const adminRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <body>
        <AdminPage backUrl={indexRoute.url()} />  {/* ❌ Плохо */}
      </body>
    </html>
  )
})
```

**❌ НЕПРАВИЛЬНО - хардкод домена/пути (КРИТИЧЕСКАЯ ОШИБКА!):**

```typescript
// admin.tsx
export const adminRoute = app.get('/', async (ctx) => {
  // ❌ КРИТИЧЕСКАЯ ОШИБКА - хардкод URL!
  const indexUrl = 'https://s.chtm.aley.pro/p/gc/partnership/'

  return (
    <html>
      <body>
        <AdminPage backUrl={indexUrl} />  {/* ❌ Плохо */}
      </body>
    </html>
  )
})
```

**✅ ПРАВИЛЬНО - относительный путь на сервере:**

```typescript
// admin.tsx
// НЕТ импорта indexRoute - нет циклических зависимостей

export const adminRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <body>
        <AdminPage backUrl="../" />  {/* ✅ Хорошо - относительный путь */}
      </body>
    </html>
  )
})
```

**✅ ПРАВИЛЬНО - `.url()` для передачи на фронтенд (без циклических зависимостей):**

```typescript
// api/links.ts
import { publicPageRoute } from '../public' // Нет цикла
import { withProjectRoot } from '../config/routes'

// Файл: api/links.ts
export const apiGetLinksRoute = app.get('/', async (ctx) => {
  return {
    success: true,
    links: {
      public: withProjectRoot(publicPageRoute.url()) // ✅ OK - для JSON API
    }
  }
})
```

**✅ ПРАВИЛЬНО - путь через PROJECT_ROOT при циклических зависимостях:**

```typescript
// admin.tsx
import { withProjectRoot, ROUTES } from './config/routes'

export const adminRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  // ✅ Используйте переменные из config/routes.tsx
  const indexUrl = withProjectRoot(ROUTES.index)

  return (
    <html>
      <body>
        <AdminPage backUrl={indexUrl} />  {/* ✅ OK */}
      </body>
    </html>
  )
})
```

**⚠️ ВАЖНО**: Если файла `/config/routes.tsx` нет в проекте — это **ошибка**!

Создайте `/config/routes.tsx`:

```typescript
/**
 * Константы для формирования путей внутри воркспэйса
 * ⚠️ КРИТИЧЕСКИ ВАЖНО: Не хардкодите эти значения в других файлах
 */

export const PROJECT_ROOT = 'p/gc/partnership' // Путь от корня workspace до проекта
export const ROUTES = { index: './' } as const

export function withProjectRoot(route: string): string {
  const clean = route.replace(/^\.\//, '').replace(/^\/+/, '')
  return `./${PROJECT_ROOT}/${clean}`
}

export function withProjectRootAndSubroute(route: string, subroute?: string): string {
  if (!subroute || subroute === '/') return withProjectRoot(route)
  const clean = subroute.replace(/^\//, '')
  return `${withProjectRoot(route)}~${clean}` // ⚠️ ~ если путь внутри файла не '/'
}
```

### Базовое использование route.url() (только для фронтенда!)

**Важно**: Используйте `route.url()` **ТОЛЬКО** когда передаёте URL на фронтенд!

```typescript
// В файле web/settings/index.tsx
export const settingsRoute = app.get('/', async (ctx) => {
  return <html>...</html>
})

// В Vue компоненте (фронтенд)
import { settingsRoute } from '../web/settings'
import { withProjectRoot } from '../config/routes'

const url = withProjectRoot(settingsRoute.url())  // ✅ OK - для фронтенда
// Вернёт путь внутри проекта с PROJECT_ROOT (например, ./${PROJECT_ROOT}/web/settings)
// ⚠️ Если путь в файле не '/', URL будет через ~
```

**Важно**:

- `route.url()` возвращает путь **внутри проекта** (например, `./web/settings`)
- Для передачи на клиент используйте `withProjectRoot(route.url())`
- На сервере используйте относительные пути: `./path`, `../path`
- Никогда не хардкодьте пути типа `'/admin'` или `'/profile'`

### Ссылки с параметрами

**С параметрами пути**:

```typescript
// Роут с параметром
export const postRoute = app.get('/:id', async (ctx, req) => {
  return <html>...</html>
})

// Генерация URL
import { withProjectRoot } from '../config/routes'
const postId = '123'
const url = withProjectRoot(postRoute.url({ id: postId }))
// Вернёт: ./${PROJECT_ROOT}/web/blog/post~123
// ⚠️ ~ появляется при /:id, по возможности избегайте
```

**С несколькими параметрами**:

```typescript
export const articleRoute = app.get('/:category/:articleId', async (ctx, req) => {
  return <html>...</html>
})

const url = withProjectRoot(articleRoute.url({
  category: 'technology',
  articleId: 'article-456'
}))
// Вернёт: ./${PROJECT_ROOT}/web/blog~technology/article-456
```

**С query параметрами**:

```typescript
// Файл: web/search/index.tsx
export const searchRoute = app.get('/', async (ctx, req) => {
  return <html>...</html>
})

// Используйте встроенный метод query
const url = withProjectRoot(searchRoute.query({ q: 'chatium', page: '2' }).url())
// Вернёт: ./${PROJECT_ROOT}/web/search?q=chatium&page=2
// ⚠️ Если бы путь был '/search', URL стал бы ./${PROJECT_ROOT}/web/search~search
```

### Использование в Vue (фронтенд)

**✅ Во Vue компонентах используйте `.url()` - это фронтенд:**

```vue
<script setup>
import { computed } from 'vue'
import { settingsRoute } from '../settings'
import { postRoute } from '../post'
import { withProjectRoot } from '../config/routes'

// ✅ OK - это фронтенд, используем withProjectRoot()
const settingsUrl = computed(() => withProjectRoot(settingsRoute.url()))
const postUrl = computed(() => withProjectRoot(postRoute.url({ id: '123' })))
</script>

<template>
  <nav>
    <a :href="settingsUrl">Настройки</a>
    <a :href="postUrl">Статья #123</a>
  </nav>
</template>
```

**⚠️ Важно**: Если возникают циклические зависимости во Vue, используйте `withProjectRoot(ROUTES.x)` или относительные пути:

```vue
<template>
  <nav>
    <a href="../settings">Настройки</a>
    <!-- ✅ OK, относительный путь -->
    <a href="./profile">Профиль</a>
    <!-- ✅ OK, относительный путь -->
  </nav>
</template>
```

---

## Вызов API роутов через .run()

### Основные концепции

**`.run()`** — метод для вызова API роутов **внутри** Chatium приложения (клиент-серверное взаимодействие).

⚠️ **КРИТИЧЕСКИ ВАЖНО**: Для вызова внутренних API роутов **ВСЕГДА** используйте `.run()`, а **НЕ** `fetch()`.

**⚠️ ВАЖНО**: На клиенте `.run()` работает **только** для маршрутов с `// @shared-route`.
В Vue `ctx` доступен глобально — добавьте в `<script setup>`:

```typescript
declare const ctx: any
```

**@shared vs @shared-route**:

- `// @shared` — утилиты и роут-объекты, которые нужны и на фронтенде, и на бэкенде
- `// @shared-route` — API роуты, которые можно вызвать через `.run(ctx)` на клиенте

### Почему .run(), а не fetch()?

**✅ Преимущества .run()**:

- Автоматическая передача контекста (ctx)
- Типобезопасность через TypeScript
- Нет необходимости в URL — роут знает свой путь
- Работает как на клиенте, так и на сервере
- Автоматическая сериализация/десериализация данных
- Консистентность с file-based роутингом

**❌ Проблемы fetch()**:

- Требует хардкод URL (нарушает file-based роутинг)
- Требует ручной сериализации данных
- Нет типизации
- Ломается при изменении структуры файлов
- Требует ручного управления headers

**Пример проблемы**:

```vue
<script setup>
// ❌ ПЛОХО - использование fetch с хардкод URL
async function loadData() {
  const response = await fetch('./dev/amocrm-connector/commentService/api/status')
  const data = await response.json()
  // Если файл переименуется, это сломается!
}

// ✅ ПРАВИЛЬНО - использование .run()
import { apiGetCommentServiceStatusRoute } from '../api/commentService'

async function loadData() {
  const data = await apiGetCommentServiceStatusRoute.run(ctx)
  // Всегда работает, независимо от структуры файлов!
}
</script>
```

### Синтаксис .run()

**Базовый синтаксис**:

```typescript
const result = await apiRoute.run(ctx, requestData?)
```

- **ctx** — глобальный контекст (обязательный первый параметр)
- **requestData** — данные запроса (опциональный второй параметр)

**Типы вызовов (.run)**:

| Сценарий           | Синтаксис                                            |
| ------------------ | ---------------------------------------------------- |
| GET без параметров | `route.run(ctx)`                                     |
| GET с query        | `route.query({ key: val }).run(ctx)`                 |
| POST/PUT с body    | `route.run(ctx, { body })`                           |
| С path параметром  | `route({ id: '123' }).run(ctx)`                      |
| Комбинированно     | `route({ id }).query({ filter }).run(ctx, { body })` |

**⚠️ ВАЖНО**: Если нужны параметры пути (`/:id`), сначала вызовите роут как функцию, потом `.run(ctx)`:

```typescript
const product = await apiProductRoute({ id: 'product-123' }).run(ctx)
```

### Примеры использования

#### GET запросы без параметров

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { apiGetStatusRoute } from '../api/service'

const status = ref(null)

onMounted(async () => {
  // Простой GET без параметров
  const data = await apiGetStatusRoute.run(ctx)

  if (data.success) {
    status.value = data.enabled
  }
})
</script>
```

**API роут**:

```typescript
// api/service/status.ts
export const apiGetStatusRoute = app.get('/', async (ctx) => {
  return {
    success: true,
    enabled: true
  }
})
```

#### GET запросы с query параметрами

```vue
<script setup>
import { ref } from 'vue'
import { apiGetLogsRoute } from '../api/logs'

const logs = ref([])

async function loadLogs() {
  // GET с query параметрами
  const data = await apiGetLogsRoute.run(ctx, {
    limit: 50,
    offset: 0
  })

  if (data.success) {
    logs.value = data.logs
  }
}
</script>
```

**API роут**:

```typescript
// api/logs/index.ts
export const apiGetLogsRoute = app.get('/', async (ctx) => {
  const limit = parseInt(ctx.req.query.limit as string) || 50
  const offset = parseInt(ctx.req.query.offset as string) || 0

  const logs = await LogsTable.findAll(ctx, {
    limit,
    offset
  })

  return {
    success: true,
    logs
  }
})
```

#### GET запросы с path параметрами (избегайте по возможности)

```vue
<script setup>
import { apiProductCardRoute } from '../api/products'

const product = await apiProductCardRoute({ id: 'product-123' }).run(ctx)
</script>
```

**API роут**:

```typescript
// api/products/card.ts
// @shared-route
export const apiProductCardRoute = app.get('/:id', async (ctx, req) => {
  // ⚠️ ~ появится из-за /:id — избегайте, если можно использовать query/body
  const productId = req.params.id
  return { success: true, product: await ProductsTable.findById(ctx, productId) }
})
```

#### POST запросы с данными

```vue
<script setup>
import { ref } from 'vue'
import { apiSaveTemplateRoute } from '../api/templates'

const template = ref('')
const saving = ref(false)

async function saveTemplate() {
  saving.value = true

  try {
    // POST с body данными
    const data = await apiSaveTemplateRoute.run(ctx, {
      template: template.value
    })

    if (data.success) {
      alert('Шаблон сохранен!')
    } else {
      alert('Ошибка: ' + data.error)
    }
  } finally {
    saving.value = false
  }
}
</script>
```

**API роут**:

```typescript
// api/templates/save.ts
export const apiSaveTemplateRoute = app.post('/', async (ctx, req) => {
  const { template } = req.body

  if (!template) {
    return {
      success: false,
      error: 'Шаблон обязателен'
    }
  }

  await SettingsTable.createOrUpdateBy(ctx, 'key', {
    key: 'template',
    value: template
  })

  return {
    success: true
  }
})
```

#### Обработка ошибок

```vue
<script setup>
import { ref } from 'vue'
import { apiCreateProductRoute } from '../api/products'

const error = ref(null)
const loading = ref(false)

async function createProduct(productData) {
  loading.value = true
  error.value = null

  try {
    const result = await apiCreateProductRoute.run(ctx, productData)

    if (!result.success) {
      // Ошибка от API
      error.value = result.error
      return
    }

    // Успех
    console.log('Создан продукт:', result.product)
  } catch (e) {
    // Исключение (сетевая ошибка, etc)
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
```

### Паттерны использования

#### Паттерн 1: Загрузка данных при монтировании

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { apiGetDataRoute } from '../api/data'

const data = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const result = await apiGetDataRoute.run(ctx)
    data.value = result.data
  } catch (error) {
    console.error('Ошибка загрузки:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading">Загрузка...</div>
  <div v-else>{{ data }}</div>
</template>
```

#### Паттерн 2: Отправка формы

```vue
<script setup>
import { ref } from 'vue'
import { apiSubmitFormRoute } from '../api/forms'

const form = ref({
  name: '',
  email: ''
})
const submitting = ref(false)

async function handleSubmit() {
  submitting.value = true

  try {
    const result = await apiSubmitFormRoute.run(ctx, form.value)

    if (result.success) {
      // Очистка формы
      form.value = { name: '', email: '' }
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.name" placeholder="Имя" />
    <input v-model="form.email" type="email" placeholder="Email" />
    <button :disabled="submitting">
      {{ submitting ? 'Отправка...' : 'Отправить' }}
    </button>
  </form>
</template>
```

#### Паттерн 3: Переключатель (toggle)

```vue
<script setup>
import { ref } from 'vue'
import { apiToggleServiceRoute } from '../api/service'

const enabled = ref(false)
const loading = ref(false)

async function toggle() {
  loading.value = true

  try {
    const result = await apiToggleServiceRoute.run(ctx, {
      enabled: !enabled.value
    })

    if (result.success) {
      enabled.value = result.enabled
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <button @click="toggle" :disabled="loading">
    {{ enabled ? 'Выключить' : 'Включить' }}
  </button>
</template>
```

#### Паттерн 4: Повторная отправка

```vue
<script setup>
import { ref } from 'vue'
import { apiRetryActionRoute } from '../api/actions'

const retryingId = ref(null)

async function retry(itemId) {
  if (!confirm('Повторить действие?')) return

  retryingId.value = itemId

  try {
    const result = await apiRetryActionRoute.run(ctx, {
      id: itemId
    })

    if (result.success) {
      // Обновить список
      await loadItems()
    }
  } finally {
    retryingId.value = null
  }
}
</script>

<template>
  <button @click="retry(item.id)" :disabled="retryingId === item.id">
    <i :class="{ 'animate-spin': retryingId === item.id }"></i>
    Повторить
  </button>
</template>
```

### Импорт API роутов

**Всегда импортируйте API роуты в начале `<script setup>`**:

```vue
<script setup>
import { ref, onMounted } from 'vue'

// ✅ ПРАВИЛЬНО - импортируем роуты из API файлов
import {
  apiGetStatusRoute,
  apiToggleServiceRoute,
  apiGetLogsRoute,
  apiRetryActionRoute
} from '../api/service'

// Остальной код
</script>
```

**⚠️ ОЧЕНЬ ВАЖНО**: После каждого изменения импортов обновляйте `docs/imports.md` и сразу проверяйте отсутствие циклических зависимостей. Циклы недопустимы.

### Когда использовать fetch() vs .run()

**✅ Используйте .run() для**:

- Вызова внутренних API роутов Chatium
- Клиент-серверного взаимодействия внутри приложения
- Любых запросов к `app.get()`, `app.post()` и т.д.

**✅ Используйте fetch() для**:

- Внешних API (другие домены)
- Интеграций с третьими сервисами
- Запросов к AmoCRM, GetCourse, и т.д.

**Пример**:

```typescript
// ✅ Внутренний API - используем .run()
const status = await apiGetStatusRoute.run(ctx)

// ✅ Внешний API - используем fetch()
const amocrmData = await fetch('https://subdomain.amocrm.ru/api/v4/leads', {
  headers: { Authorization: `Bearer ${token}` }
})
```

### Чек-лист использования .run()

Перед тем как закоммитить код с API вызовами, проверьте:

- [ ] ✅ Все внутренние API вызовы используют `.run()`
- [ ] ✅ Нет `fetch()` для внутренних роутов
- [ ] ✅ API роуты импортированы из API файлов
- [ ] ✅ На клиенте `.run()` используется только для `// @shared-route`
- [ ] ✅ Первый параметр `.run()` — это `ctx`
- [ ] ✅ Данные передаются вторым параметром
- [ ] ✅ Обработаны ошибки (try/catch)
- [ ] ✅ Показывается состояние загрузки
- [ ] ✅ После изменений импортов обновлён `docs/imports.md` и проверены циклы

### Чек-лист использования путей (НОВОЕ!)

Перед тем как закоммитить код с путями, проверьте:

- [ ] ✅ На сервере используются относительные пути: `./path`, `../path`
- [ ] ✅ `.url()` используется ТОЛЬКО для передачи на фронтенд
- [ ] ✅ `.url()` НЕ вызывает циклических зависимостей
- [ ] ✅ **ОБЯЗАТЕЛЬНО**: В проекте есть файл `/config/routes.tsx`
- [ ] ✅ **КРИТИЧНО**: Нет хардкода URL - используются переменные из `/config/routes.tsx`
- [ ] ✅ Нет хардкода абсолютных путей типа `'/admin'` в редиректах
- [ ] ✅ В редиректах используются относительные пути
- [ ] ✅ При циклических зависимостях используется `withProjectRoot()` из `/config/routes.tsx`
- [ ] ✅ **ОЧЕНЬ ВАЖНО**: Если путь внутри файла не `'/'`, URL будет через `~` — избегайте этого

---

## 🚨 КРИТИЧЕСКАЯ ОШИБКА: Хардкод URL и неправильное использование .url()

### Проблема #1: Хардкод абсолютных путей

**Самая распространённая ошибка** — хардкод абсолютных путей типа `'/admin'` или `'/profile'`.

#### ❌ Неправильно (НИКОГДА ТАК НЕ ДЕЛАЙТЕ):

```vue
<!-- HomePage.vue -->
<script setup>
import { computed } from 'vue'

// ❌ ПЛОХО - хардкод абсолютного пути
const customFieldsUrl = computed(() => './dev/amocrm-connector/customFields')
</script>

<template>
  <a :href="customFieldsUrl">Дополнительные поля</a>
</template>
```

```typescript
// admin.tsx
export const adminRoute = app.get('/', async (ctx) => {
  // ❌ ПЛОХО - хардкод пути на сервере
  return ctx.resp.redirect('/profile')
})
```

#### ✅ Правильно:

**Для фронтенда (Vue):**

```vue
<!-- HomePage.vue -->
<script setup>
import { computed } from 'vue'
import { customFieldsPageRoute } from '../customFields'
import { withProjectRoot } from '../config/routes'

// ✅ ПРАВИЛЬНО - использование роут-объекта для фронтенда
const customFieldsUrl = computed(() => withProjectRoot(customFieldsPageRoute.url()))
</script>

<template>
  <a :href="customFieldsUrl">Дополнительные поля</a>
</template>
```

**Для сервера:**

```typescript
// admin.tsx
export const adminRoute = app.get('/', async (ctx) => {
  // ✅ ПРАВИЛЬНО - относительный путь на сервере
  return ctx.resp.redirect('./profile')
})
```

### Проблема #2: Использование .url() на сервере с циклическими зависимостями

**Вторая критическая ошибка** — использование `.url()` на сервере, что приводит к циклическим зависимостям.

#### ❌ Неправильно:

```typescript
// admin.tsx
import { indexRoute } from './index'  // ← Циклическая зависимость!

export const adminRoute = app.get('/', async (ctx) => {
  return (
    <html>
      <body>
        <AdminPage backUrl={indexRoute.url()} />  {/* ❌ Плохо */}
      </body>
    </html>
  )
})
```

#### ✅ Правильно - вариант 1: используйте относительные пути:

```typescript
// admin.tsx
// НЕТ импорта - нет циклических зависимостей

export const adminRoute = app.get('/', async (ctx) => {
  return (
    <html>
      <body>
        <AdminPage backUrl="../" />  {/* ✅ Хорошо */}
      </body>
    </html>
  )
})
```

#### ✅ Правильно - вариант 2: используйте переменные из /config/routes.tsx:

```typescript
// admin.tsx
import { withProjectRoot, ROUTES } from '../config/routes'

export const adminRoute = app.get('/', async (ctx) => {
  return (
    <html>
      <body>
        <AdminPage backUrl={withProjectRoot(ROUTES.index)} />  {/* ✅ Хорошо */}
      </body>
    </html>
  )
})
```

### Проблема #3: Хардкод домена и пути проекта (КРИТИЧЕСКАЯ ОШИБКА!)

**Третья критическая ошибка** — хардкод домена и пути проекта в коде.

#### ❌ Неправильно:

```typescript
// admin.tsx
export const adminRoute = app.get('/', async (ctx) => {
  // ❌ КРИТИЧЕСКАЯ ОШИБКА - хардкод!
  const url = './p/gc/partnership/profile'

  return ctx.resp.redirect(url)
})
```

#### ✅ Правильно - используйте переменные из `/config/routes.tsx`:

```typescript
// admin.tsx
import { withProjectRoot, ROUTES } from './config/routes'

export const adminRoute = app.get('/', async (ctx) => {
  // ✅ Правильно - используем переменные
  const url = withProjectRoot(ROUTES.profile)

  return ctx.resp.redirect(url)
})
```

**⚠️ Если файла `/config/routes.tsx` нет — создайте его:**

```typescript
// config/routes.tsx
export const PROJECT_ROOT = 'p/gc/partnership'
export const ROUTES = { index: './' } as const
```

### Почему хардкод — это КАТАСТРОФА?

#### 1. Ломается при переименовании файлов

```typescript
// Было: customFields.tsx
export const customFieldsPageRoute = app.get('/', async (ctx) => {
  return <html>...</html>
})
// URL: ./${PROJECT_ROOT}/customFields

// Стало: fields.tsx (файл переименовали)
export const customFieldsPageRoute = app.get('/', async (ctx) => {
  return <html>...</html>
})
// URL: ./${PROJECT_ROOT}/fields (изменился автоматически!)

// Хардкод './dev/amocrm-connector/customFields' → 404 ошибка! 🔴
// Роут-объект customFieldsPageRoute.url() → работает! ✅
```

#### 2. Ломается при изменении базового пути

```typescript
// Было: ./dev/amocrm-connector/customFields
// Стало: ./prod/amocrm-connector/customFields (переехали в продакшен)

// Хардкод './dev/amocrm-connector/customFields' → 404 ошибка! 🔴
// Роут-объект customFieldsPageRoute.url() → работает! ✅
```

#### 3. Ломается при изменении структуры роутов

```typescript
// Было: customFields.tsx с роутом '/'
// URL: ./${PROJECT_ROOT}/customFields

// Стало: customFields.tsx с роутом '/list'
export const customFieldsPageRoute = app.get('/list', async (ctx) => {
  return <html>...</html>
})
// URL: ./${PROJECT_ROOT}/customFields~list  // ⚠️ ~ из-за пути '/list'

// Хардкод './dev/amocrm-connector/customFields' → 404 ошибка! 🔴
// Роут-объект customFieldsPageRoute.url() → работает! ✅
```

#### 4. Нет типизации и автокомплита

```typescript
// ❌ Хардкод - никаких подсказок IDE
const url = './dev/amocrm-connector/customFields' // опечатка? IDE не знает!

// ✅ Роут-объект - IDE знает о роуте
import { customFieldsPageRoute } from '../customFields' // автокомплит!
import { withProjectRoot } from '../config/routes'
const url = withProjectRoot(customFieldsPageRoute.url()) // IDE проверит корректность!
```

### Как работает File-based роутинг

**ВАЖНО ПОНЯТЬ**: URL формируется автоматически из структуры файлов и всегда остаётся **относительным**!

```
Файл: ${PROJECT_ROOT}/customFields.tsx
Роут внутри: app.get('/', ...)

Итоговый URL = ./${PROJECT_ROOT} + /customFields + /
             = ./${PROJECT_ROOT}/customFields
```

**Вы НЕ контролируете** итоговый URL напрямую — он формируется из:

1. Местоположения файла в папке проекта
2. Имени файла
3. Пути внутри роута
   - ⚠️ Если путь внутри файла не `'/'`, URL будет через `~`

Поэтому **НИКОГДА** не пишите полные URL вручную!

### Типичные ошибки и их решения

#### ❌ ОШИБКА 1: Хардкод полного URL

```vue
<!-- ❌ ПЛОХО -->
<script setup>
const url = './dev/amocrm-connector/customFields'
</script>

<!-- ✅ ПРАВИЛЬНО -->
<script setup>
import { customFieldsPageRoute } from '../customFields'
import { withProjectRoot } from '../config/routes'
const url = computed(() => withProjectRoot(customFieldsPageRoute.url()))
</script>
```

#### ❌ ОШИБКА 2: Забыли вызвать .url()

```vue
<!-- ❌ ПЛОХО - передаётся объект роута, а не строка! -->
<script setup>
import { customFieldsPageRoute } from '../customFields'
</script>
<template>
  <a :href="customFieldsPageRoute">Ссылка</a>
</template>

<!-- ✅ ПРАВИЛЬНО - вызываем .url() и добавляем PROJECT_ROOT -->
<script setup>
import { customFieldsPageRoute } from '../customFields'
import { withProjectRoot } from '../config/routes'
</script>
<template>
  <a :href="withProjectRoot(customFieldsPageRoute.url())">Ссылка</a>
</template>
```

#### ❌ ОШИБКА 3: Не импортировали роут

```vue
<!-- ❌ ПЛОХО - роут не импортирован -->
<script setup>
const url = customFieldsPageRoute.url() // ReferenceError!
</script>

<!-- ✅ ПРАВИЛЬНО - импортируем роут и строим путь через PROJECT_ROOT -->
<script setup>
import { customFieldsPageRoute } from '../customFields'
import { withProjectRoot } from '../config/routes'
const url = withProjectRoot(customFieldsPageRoute.url())
</script>
```

#### ❌ ОШИБКА 4: Неправильный путь импорта

```typescript
// ❌ ПЛОХО - неправильные пути
import { customFieldsPageRoute } from './customFields' // возможно неверно
import { customFieldsPageRoute } from 'customFields' // ошибка!
import { customFieldsPageRoute } from '@/customFields' // не поддерживается

// ✅ ПРАВИЛЬНО - относительный путь от текущего файла
import { customFieldsPageRoute } from '../customFields'
import { customFieldsPageRoute } from '../../amocrm-connector/customFields'
```

#### ❌ ОШИБКА 5: Хардкод с параметрами

```vue
<!-- ❌ ПЛОХО - конкатенация строк -->
<script setup>
const productId = '123'
const url = '/dev/shop/product/' + productId
</script>

<!-- ✅ ПРАВИЛЬНО - параметры роута -->
<script setup>
import { productRoute } from '../product'
import { withProjectRoot } from '../config/routes'
const productId = '123'
const url = withProjectRoot(productRoute.url({ id: productId }))
</script>
```

### Правила использования роутов

#### Правило №1: Всегда экспортируй роуты

```typescript
// ✅ ПРАВИЛЬНО - customFields.tsx
export const customFieldsPageRoute = app.get('/', async (ctx) => {
  return <html>...</html>
})

// ❌ ПЛОХО - роут не экспортирован
const customFieldsPageRoute = app.get('/', async (ctx) => {
  return <html>...</html>
})
```

#### Правило №2: Всегда импортируй роут-объект

```typescript
// ✅ ПРАВИЛЬНО - в любом Vue компоненте
import { customFieldsPageRoute } from '../customFields'

// ❌ ПЛОХО - ничего не импортировано, используется хардкод
const url = './dev/amocrm-connector/customFields'
```

#### Правило №3: Всегда используй .url()

```typescript
// ✅ ПРАВИЛЬНО
import { withProjectRoot } from '../config/routes'
const url = withProjectRoot(customFieldsPageRoute.url())

// ❌ ПЛОХО - забыли .url()
const url = customFieldsPageRoute // это объект, а не строка!
```

#### Правило №4: Параметры передавай через роут-объект

```typescript
// ✅ ПРАВИЛЬНО - параметры пути
const url = withProjectRoot(productRoute.url({ id: '123' }))

// ✅ ПРАВИЛЬНО - query параметры
const url = withProjectRoot(searchRoute.query({ q: 'test', page: '1' }).url())

// ❌ ПЛОХО - ручная конкатенация
const url = '/product/' + id + '?page=' + page
```

### Примеры правильного использования

#### Пример 1: Простая ссылка

```vue
<template>
  <a :href="withProjectRoot(customFieldsPageRoute.url())"> Дополнительные поля </a>
</template>

<script setup>
import { customFieldsPageRoute } from '../customFields'
import { withProjectRoot } from '../config/routes'
</script>
```

#### Пример 2: Ссылка в computed

```vue
<script setup>
import { computed } from 'vue'
import { customFieldsPageRoute } from '../customFields'
import { withProjectRoot } from '../config/routes'

const customFieldsUrl = computed(() => withProjectRoot(customFieldsPageRoute.url()))
</script>

<template>
  <a :href="customFieldsUrl">Перейти</a>
  <button @click="() => (window.location.href = customFieldsUrl)">Перейти</button>
</template>
```

#### Пример 3: Роут с параметрами

```typescript
// productPage.tsx
export const productPageRoute = app.get('/:id', async (ctx, req) => {
  const id = req.params.id
  return <html>...</html>
})
```

```vue
<script setup>
import { productPageRoute } from '../productPage'
import { withProjectRoot } from '../config/routes'

// Передаём параметры
const productId = '123'
const productUrl = withProjectRoot(productPageRoute.url({ id: productId }))
// Результат: "./${PROJECT_ROOT}/web/productPage~123"
// ⚠️ ~ появляется из-за /:id, по возможности избегайте
</script>

<template>
  <a :href="productUrl">Товар {{ productId }}</a>
</template>
```

#### Пример 4: Роут с query параметрами

```vue
<script setup>
import { searchRoute } from '../search'
import { withProjectRoot } from '../config/routes'

const searchUrl = withProjectRoot(
  searchRoute
    .query({
      q: 'chatium',
      page: '1',
      limit: '10'
    })
    .url()
)
// Результат: "./${PROJECT_ROOT}/web/search?q=chatium&page=1&limit=10"
// ⚠️ Если путь в файле не '/', URL будет через ~
</script>

<template>
  <a :href="searchUrl">Поиск</a>
</template>
```

### Исключения из правил

**Единственные случаи**, когда можно использовать строки:

#### 1. Внешние ссылки

```vue
<!-- ✅ OK - это внешняя ссылка -->
<a href="https://example.com">Внешний сайт</a>
```

#### 2. Якорные ссылки на той же странице

```vue
<!-- ✅ OK - якорь на текущей странице -->
<a href="#section">Перейти к секции</a>
```

#### 3. Mailto/tel ссылки

```vue
<!-- ✅ OK - специальные протоколы -->
<a href="mailto:email@example.com">Email</a>
<a href="tel:+1234567890">Телефон</a>
```

**Всё остальное** — только через роут-объекты!

### Чек-лист перед коммитом

Перед тем как закоммитить код с путями, проверьте:

- [ ] ✅ Все роуты экспортированы из файлов роутов
- [ ] ✅ **НОВОЕ**: На сервере используются относительные пути (`./`, `../`)
- [ ] ✅ **НОВОЕ**: `.url()` используется ТОЛЬКО для передачи на фронтенд
- [ ] ✅ **ОБЯЗАТЕЛЬНО**: В проекте есть файл `/config/routes.tsx` с `PROJECT_ROOT`, `ROUTES`, `withProjectRoot()`
- [ ] ✅ **КРИТИЧНО**: Нет хардкода URL - используются переменные из `/config/routes.tsx`
- [ ] ✅ Нет хардкода абсолютных путей типа `'/admin'` в редиректах
- [ ] ✅ При циклических зависимостях используется `withProjectRoot()` из `/config/routes.tsx`
- [ ] ✅ Все роут-объекты импортированы (если используются без циклов)
- [ ] ✅ Параметры передаются через роут-объекты
- [ ] ✅ Query параметры используют `.query({})`
- [ ] ✅ В редиректах используются относительные пути или `withProjectRoot()`
- [ ] ✅ **ОЧЕНЬ ВАЖНО**: Если путь внутри файла не `'/'`, URL будет через `~` — избегайте этого

### Как найти хардкод в проекте

Используйте поиск по проекту для обнаружения хардкода:

```bash
# Поиск подозрительных паттернов (в вашей IDE или через grep)

# Искать строки вида '/dev/' или '/prod/'
Поиск: ['"]/dev/|['"]/prod/

# Искать конкатенацию URL
Поиск: \+ '/' |  \+ "/"

# Искать href без роут-объектов
Поиск: href=['"]/(?!http|#|mailto|tel)
```

---

## Валидация параметров

### Валидация параметров пути

```typescript
export const userRoute = app.get('/:userId', async (ctx, req) => {
  const userId = req.params.userId

  if (!userId || userId.length === 0) {
    return { success: false, error: 'User ID is required' }
  }

  const user = await getUserById(ctx, userId)

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  return { success: true, user }
})
```

### Валидация query параметров

```typescript
// Файл: api/search.ts
export const searchRoute = app.get('/', async (ctx, req) => {
  const query = req.query.q as string

  if (!query) {
    return { success: false, error: 'Search query is required' }
  }

  if (query.length < 3) {
    return { success: false, error: 'Query must be at least 3 characters' }
  }

  const results = await performSearch(ctx, query)

  return { success: true, results }
})
```

### Валидация body параметров

```typescript
// Файл: api/products/create.ts
export const createProductRoute = app.post('/', async (ctx, req) => {
  const { name, price, description } = req.body

  // Обязательные поля
  if (!name) {
    return { success: false, error: 'Name is required' }
  }

  if (!price || price <= 0) {
    return { success: false, error: 'Price must be positive' }
  }

  // Опциональные поля с значениями по умолчанию
  const finalDescription = description || 'No description'

  const product = await ProductsTable.create(ctx, {
    name,
    price: new Money(price, 'RUB'),
    description: finalDescription
  })

  return { success: true, product }
})
```

---

## Чек-листы

### Чек-лист создания страницы

1. ✅ **Создайте Vue компонент** в `pages/`

   - Файл: `pages/<module>/NewPage.vue`
   - Используйте `<script setup>` с Composition API

2. ✅ **Создайте роут-файл** в `/web/<module>/`

   - Файл: `web/<module>/newPage.tsx`
   - Добавьте `// @shared` в начало
   - Импортируйте `{ jsx }` и Vue компонент
   - В файле один маршрут, путь всегда `'/'`

3. ✅ **Экспортируйте маршрут**:

   ```typescript
   export const newPageRoute = app.get('/', async (ctx) => {
     return <html>...</html>
   })
   ```

4. ✅ **Добавьте ссылки** на новую страницу

   - Импортируйте `newPageRoute` в родительском компоненте
   - Используйте `withProjectRoot(newPageRoute.url())`
   - После изменения импортов обновите `docs/imports.md` и проверьте циклы

5. ✅ **Добавьте авторизацию** (если нужно) — см. `003-auth.md`

6. ✅ **Проверьте** отсутствие циклических импортов

7. ✅ **Добавьте метаданные**: title, viewport, charset

### Чек-лист создания API роута

1. ✅ **Создайте файл** в `api/`

   - Например: `api/users/get.ts`

2. ✅ **Добавьте комментарий**: `// @shared-route`

3. ✅ **Импортируйте зависимости**

4. ✅ **Определите роут**:

   ```typescript
   export const getUserRoute = app.get('/', async (ctx, req) => {
     // ctx формируется автоматически
     // req содержит параметры запроса
   })
   ```

5. ✅ **Добавьте авторизацию** — см. `003-auth.md`

6. ✅ **Валидируйте параметры**:

   ```typescript
   if (!req.query.id) {
     return { success: false, error: 'ID required' }
   }
   ```

7. ✅ **Обработайте ошибки**:

   ```typescript
   try {
     // логика
   } catch (error) {
     ctx.account.log('Error', { level: 'error', json: { error } })
     return { success: false, error: error.message }
   }
   ```

8. ✅ **Возвращайте консистентный формат**:

   ```typescript
   return {
     success: true,
     data: result
   }
   ```

9. ✅ **Документируйте** роут в комментариях

10. ✅ **Тестируйте** все сценарии (success, error)

---

## Лучшие практики

### Организация

✅ **Один файл = один роут (без исключений)**

- Упрощает навигацию и поддержку
- Для дополнительных путей создавайте отдельные файлы
  ✅ **Браузерные страницы живут в `/web/`**
- В корне проекта из роутов только `index.tsx`
- Все остальные страницы и модули — в `/web/`

✅ **Используйте `'/'` для чистых путей**

- Полагайтесь на file-based роутинг
- Явные пути только при необходимости

✅ **Следуйте именованию**: см. `006-arch.md`

- Константы роутов: `pageNameRoute`
- Файлы: camelCase для роутов, PascalCase для Vue

### Валидация

✅ **Всегда валидируйте параметры**

- Проверяйте обязательные поля
- Используйте ранний возврат для ошибок

✅ **Используйте типы**

- TypeScript для type safety
- Интерфейсы для сложных данных

### Ответы

✅ **Возвращайте консистентный формат**

- `{ success: true, data: ... }` для успеха
- `{ success: false, error: ... }` для ошибок

✅ **Логируйте ошибки**

- Используйте `ctx.account.log()`
- Не используйте `console.log()`

### Безопасность

✅ **Добавляйте авторизацию** — см. `003-auth.md`

- requireAccountRole для проверки ролей
- requireRealUser для авторизованных

✅ **Валидируйте данные перед использованием**

- Не доверяйте входным данным
- Проверяйте типы и форматы

### Ссылки

⚠️ **КРИТИЧЕСКИ ВАЖНО**: См. раздел [🚨 КРИТИЧЕСКАЯ ОШИБКА: Хардкод URL](#-критическая-ошибка-хардкод-url-вместо-роут-объектов)

✅ **Используйте route.url() + withProjectRoot()**

- `route.url()` возвращает путь **внутри проекта**
- Для клиента добавляйте `withProjectRoot(route.url())`
- ⚠️ Если путь внутри файла не `'/'`, URL будет через `~` — избегайте
- Никогда не хардкодьте пути
- Всегда импортируйте роуты
- ВСЕГДА вызывайте `.url()` метод

❌ **Не делайте так**:

```typescript
// ❌ Плохо - хардкод URL
const url = '/admin/settings'
const url = '/product/' + id
const url = customFieldsPageRoute // забыли .url()

// ✅ Хорошо - используем роут-объекты
import { settingsRoute } from './settings'
import { productRoute } from './product'
import { withProjectRoot } from '../config/routes'
const url = withProjectRoot(settingsRoute.url())
const url = withProjectRoot(productRoute.url({ id }))
```

**Подробное объяснение всех ошибок и решений** — см. раздел выше про хардкод URL.

---

## Связанные документы

- **003-auth.md** — Авторизация и проверка прав
- **006-arch.md** — Структура проекта и именование
- **007-vue.md** — Vue компоненты и страницы
- **001-standards.md** — Стандарты кодирования

---

**Версия**: 2.6  
**Дата**: 2025-11-05  
**Последнее обновление**: 2026-01-30 - **КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ**:

1. На серверной стороне используйте **ТОЛЬКО относительные пути** (`./`, `../`)
2. **КРИТИЧНО**: Пути `/path` - это абсолютные от корня домена! Используйте `./path` или `../path`
3. `.url()` только для передачи на фронтенд и без циклических зависимостей
4. **ОБЯЗАТЕЛЬНО**: Создавайте `/config/routes.tsx` в каждом проекте с `PROJECT_ROOT`, `ROUTES`, `withProjectRoot()`
5. **КРИТИЧЕСКАЯ ОШИБКА**: Хардкодить URL запрещено - используйте переменные из `/config/routes.tsx`

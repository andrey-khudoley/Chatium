---
name: chatium-schema
description: Модуль @app/schema в Chatium — ZType, s, схемы Heap и валидация. Использовать для валидации body/параметров и типов Heap.
---

# chatium-schema

Схемы и типы, совместимые с Heap, и билдер `s`. Модуль `@app/schema`. Используется для валидации тел запросов, параметров роутов и структур Heap.

## Когда использовать

- Валидация body в API (`.body(s => s.object({ ... }))`)
- Описание структур данных и типов Heap (`ZObject`, `ZString`, `ZNumber` и др.)
- Типизация полей и схем (`ZType`, `ZMoney`, `ZStorageFile`, `ZJobRouteRef` и т.д.)

## Основные экспорты

Источник типов: `node_modules/@app/schema/index.d.ts`

- **ZType<HS>** — базовый интерфейс типа схемы.
- **ZObject**, **ZString**, **ZNumber**, **ZBoolean**, **ZDate**, **ZEnum**, **ZMoney**, **ZStorageFile**, **ZRecord**, **ZTuple**, **ZLiteral**, **ZUndefined**, **ZAny**, **ZCurrency** — типы полей.
- **ZJobRouteRef**, **ZFuntionRouteRef** (опечатка в API — именно `ZFuntionRouteRef`, не `ZFunctionRouteRef`) — ссылки на джоб/роут.
- **s** — билдер схем (`SchemaBuilder`) и namespace с конструкторами типов.

## Паттерны использования

### Валидация в роутах (через `.body()` и `.query()`)

Цепочка **всегда начинается** с `app.post('/')` или `app.get('/')`, схема объявляется через `.body()` / `.query()`, обработчик — через `.handle()`. Метода `.result()` в цепочке **нет**.

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

### Типы полей и связь с Heap

При описании структур Heap поля `id`, `createdAt`, `updatedAt` зарезервированы и **не включаются** в схему полей (они добавляются автоматически).

```typescript
import { Heap } from '@app/heap'

export const Products = Heap.Table(
  't__project__products__Ab1Cd2',
  {
    name: Heap.Optional(
      Heap.String({ customMeta: { title: 'Название' } })
    ),
    price: Heap.Optional(
      Heap.Money({ customMeta: { title: 'Цена' } })
    )
    // id, createdAt, updatedAt — НЕ объявлять, добавятся автоматически
  },
  { customMeta: { title: 'Товары' } }
)
```

### Валидация через @app/validation (Zod)

Альтернатива встроенной валидации — отдельный пакет `@app/validation` (Zod):

```typescript
import { z } from '@app/validation'

const schema = z.object({
  name: z.string(),
  age: z.number().min(18).optional()
})

export const createRoute = app.post('/', async (ctx, req) => {
  try {
    const data = schema.parse(req.body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    throw error
  }
})
```

Используйте `@app/validation` при необходимости сложной валидации с кастомными правилами или трансформациями. Для простых полей предпочтителен встроенный `.body()`.

## Чеклист

- [ ] Импорт `s` или `Z*`-типов из `@app/schema`
- [ ] Схема `.body()` / `.query()` в API по контракту `002-routing` / `chatium-api-endpoint`
- [ ] Обработчик задан через `.handle(async (ctx, req) => …)`, **не** вторым аргументом `post`/`get`
- [ ] В цепочке роутинга **нет** метода `.result()`
- [ ] При необходимости — отдельный пакет `@app/validation` (001-standards)
- [ ] Поля `id`, `createdAt`, `updatedAt` не объявлены вручную в схемах Heap

## Ссылки на документацию

- **041-schema.md** — `@app/schema`, основные экспорты
- **008-heap.md** — Heap, таблицы, типы полей, зарезервированные поля
- **001-standards.md** — стандарты кодирования, валидация через `@app/validation`
- **002-routing.md** — роутинг, `.body()`, `.query()`, `.handle()`

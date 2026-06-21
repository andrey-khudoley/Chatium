# @shared vs @shared-route

## Директива `// @shared`

Используется для **утилит и функций**, которые нужны и на фронтенде, и на бэкенде.

**Расположение:** `/shared/*.ts`

```typescript
// @shared

export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
```

**Использование:**

```typescript
// На фронтенде (Vue) и бэкенде одинаково
import { calculateTotal } from '../shared/calculate'
```

---

## Директива `// @shared-route`

Используется для **API маршрутов**, которые должны быть вызываемы с фронтенда через `.run()`.

**Расположение:** `/api/*.ts`

```typescript
// @shared-route

export const apiGetProductsRoute = app.get('/list', async (ctx, req) => {
  return await ProductsTable.findAll(ctx, { limit: 100 })
})
```

**Использование на фронтенде:**

```typescript
import { apiGetProductsRoute } from '../api/products'

// В Vue компоненте
const products = await apiGetProductsRoute.run(ctx)
```

---

## Ключевое отличие

| Директива          | Назначение                   | Где используется | Как вызывается                              |
| ------------------ | ---------------------------- | ---------------- | ------------------------------------------- |
| `// @shared`       | Утилиты, хелперы, форматтеры | `/shared/*.ts`   | Обычный импорт и вызов функции              |
| `// @shared-route` | API эндпоинты                | `/api/*.ts`      | `.run(ctx)` на фронте, прямой вызов на бэке |

## Правила

**@shared:**

- Функции не имеют доступа к `ctx` (если не передан явно)
- Не могут использовать таблицы напрямую
- Чистая логика, преобразования, валидации

**@shared-route:**

- Маршрут имеет доступ к `ctx` и таблицам
- Доступен на фронте через `.run()`
- Всегда экспортируется как константа

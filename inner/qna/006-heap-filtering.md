# Фильтрация данных в Heap API

## Вводная информация

Heap API поддерживает мощную систему фильтрации через параметр `where` в методах `findAll()`, `countBy()`, `searchBy()` и других. Система фильтрации вдохновлена MongoDB, но имеет свои особенности и ограничения.

---

## 1. Поддерживаемые операторы

### 1.1 Операторы сравнения

| Оператор | Описание         | Пример                  |
| -------- | ---------------- | ----------------------- |
| `$lt`    | Меньше           | `{ age: { $lt: 18 } }`  |
| `$lte`   | Меньше или равно | `{ age: { $lte: 18 } }` |
| `$gt`    | Больше           | `{ age: { $gt: 18 } }`  |
| `$gte`   | Больше или равно | `{ age: { $gte: 18 } }` |

**Важно:** Операторы `$eq`, `$ne`, `$in`, `$nin`, `$exists` **НЕ поддерживаются** напрямую. Используйте альтернативные подходы (см. раздел 5).

### 1.2 Логические операторы

| Оператор | Описание       | Применение                       |
| -------- | -------------- | -------------------------------- |
| `$and`   | Логическое И   | `{ $and: [условие1, условие2] }` |
| `$or`    | Логическое ИЛИ | `{ $or: [условие1, условие2] }`  |
| `$not`   | Логическое НЕ  | `{ $not: условие }`              |

---

## 2. Синтаксис использования

### 2.1 Простая фильтрация

**Прямое равенство:**

```typescript
const users = await Users.findAll(ctx, {
  where: { status: 'active' }
})
```

**Несколько условий равенства (неявный AND):**

```typescript
const users = await Users.findAll(ctx, {
  where: {
    status: 'active',
    role: 'admin'
  }
})
```

### 2.2 Фильтрация с операторами

**Одиночный оператор:**

```typescript
const users = await Users.findAll(ctx, {
  where: { age: { $gt: 18 } }
})
```

**Комбинация операторов на одном поле:**

```typescript
const users = await Users.findAll(ctx, {
  where: {
    age: { $gte: 18, $lte: 65 }
  }
})
```

### 2.3 Фильтрация массивом значений

Для фильтрации по нескольким конкретным значениям передайте массив:

```typescript
// Эквивалент SQL: WHERE status IN ('active', 'pending')
const orders = await Orders.findAll(ctx, {
  where: { status: ['active', 'pending'] }
})

// С RefLink полем
const products = await Products.findAll(ctx, {
  where: { category: [categoryId1, categoryId2] }
})
```

### 2.4 Логические операторы

**$and (явное И):**

```typescript
const users = await Users.findAll(ctx, {
  where: {
    $and: [{ age: { $gte: 18 } }, { status: 'active' }, { role: { $not: 'guest' } }]
  }
})
```

**$or (ИЛИ):**

```typescript
const items = await Items.findAll(ctx, {
  where: {
    $or: [{ status: 'active' }, { status: 'pending' }]
  }
})
```

**$not (отрицание):**

```typescript
const items = await Items.findAll(ctx, {
  where: {
    $not: { status: 'draft' }
  }
})

// Или вложённое
const items = await Items.findAll(ctx, {
  where: {
    status: { $not: 'draft' }
  }
})
```

**Сложные комбинации:**

```typescript
const items = await Items.findAll(ctx, {
  where: {
    $and: [
      {
        $or: [{ status: 'active' }, { status: 'pending' }]
      },
      { price: { $gte: 100, $lte: 1000 } },
      { $not: { archived: true } }
    ]
  }
})
```

---

## 3. Типы полей и совместимость

### 3.1 Поля StringKind

```typescript
// Точное совпадение
where: {
  name: 'John'
}

// Массив значений
where: {
  name: ['John', 'Jane']
}

// Логические операторы
where: {
  $or: [{ name: 'John' }, { name: 'Jane' }]
}
```

**Важно:** Полнотекстовый поиск (like, contains) осуществляется через метод `searchBy()`, не через `where`.

### 3.2 Поля NumberKind

```typescript
// С операторами сравнения
where: { count: { $gte: 10, $lte: 100 } }

// Массив конкретных значений
where: { count: [5, 10, 15] }
```

### 3.3 Поля DateKind

```typescript
// Сравнение дат
where: {
  createdAt: {
    $gte: new Date('2024-01-01'),
    $lt: new Date('2024-12-31')
  }
}

// Массив дат
where: { eventDate: [date1, date2, date3] }
```

### 3.4 Поля MoneyKind

```typescript
// Сравнение денежных сумм
where: {
  price: {
    $gte: new Money(100, 'RUB'),
    $lte: new Money(1000, 'RUB')
  }
}

// Массив сумм
where: {
  price: [
    new Money(100, 'RUB'),
    new Money(500, 'RUB')
  ]
}
```

### 3.5 Поля BooleanKind

```typescript
// Точное совпадение
where: {
  isActive: true
}

where: {
  isActive: false
}

// Логические операторы
where: {
  $not: {
    isActive: false
  }
}
```

### 3.6 Поля RefLinkKind (ссылки на другие таблицы)

```typescript
// По ID связанной записи
where: {
  category: categoryId
}

// По массиву ID
where: {
  category: [catId1, catId2, catId3]
}

// С логическими операторами
where: {
  $and: [{ category: [catId1, catId2] }, { price: { $gte: 100 } }]
}
```

### 3.7 Поля UserRefLinkKind

```typescript
// По ID пользователя
where: {
  assignedTo: userId
}

// По массиву ID
where: {
  assignedTo: [userId1, userId2]
}
```

### 3.8 Поля AnyKind (JSON)

**Ограничение:** Фильтрация по вложенным полям в JSON **не поддерживается** напрямую через `where`. Рекомендуется:

- Использовать пост-обработку в коде
- Либо денормализовать данные (вынести часто используемые поля отдельно)

```typescript
// ❌ НЕ РАБОТАЕТ:
where: {
  metadata: {
    nested: {
      field: 'value'
    }
  }
}

// ✅ ПРАВИЛЬНО: получить все и отфильтровать в коде
const all = await Items.findAll(ctx, { limit: 1000 })
const filtered = all.filter((item) => item.metadata?.nested?.field === 'value')
```

---

## 4. Использование с методами запросов

### 4.1 findAll()

```typescript
const products = await Products.findAll(ctx, {
  where: {
    status: 'active',
    price: { $gte: 100, $lte: 1000 }
  },
  limit: 50,
  offset: 0,
  order: [{ createdAt: 'desc' }]
})
```

### 4.2 findOneBy()

```typescript
const user = await Users.findOneBy(ctx, {
  $and: [{ email: 'user@example.com' }, { status: 'active' }]
})
```

### 4.3 countBy()

```typescript
const count = await Products.countBy(ctx, {
  status: 'active',
  price: { $gte: 100 }
})
```

### 4.4 select() - Query Builder с агрегацией

```typescript
const stats = await Products.select({
  count: { $count: ['id'] },
  categoryId: 'category'
})
  .where({
    status: 'active',
    price: { $gte: 100 }
  })
  .group(['categoryId'])
  .run(ctx)
```

### 4.5 searchBy() - Полнотекстовый поиск

```typescript
const results = await Products.searchBy(ctx, {
  query: 'красное платье',
  where: {
    price: { $gte: 1000, $lte: 5000 }
  },
  limit: 20
})
```

---

## 5. Альтернативы для неподдерживаемых операторов

### 5.1 Вместо `$ne` (не равно)

**Вариант 1: Использовать `$not`**

```typescript
where: {
  $not: {
    status: 'draft'
  }
}
```

**Вариант 2: Использовать `$or` с исключением**

```typescript
where: {
  $or: [{ status: 'active' }, { status: 'pending' }]
}
```

### 5.2 Вместо `$in` (в массиве)

**Используйте массив напрямую:**

```typescript
where: {
  status: ['active', 'pending', 'archived']
}
```

### 5.3 Вместо `$nin` (не в массиве)

**Вариант 1: Получить нужные и отфильтровать в коде**

```typescript
const items = await Items.findAll(ctx, { limit: 1000 })
const filtered = items.filter((item) => !['draft', 'deleted'].includes(item.status))
```

**Вариант 2: Использовать несколько `$not`**

```typescript
where: {
  $and: [{ $not: { status: 'draft' } }, { $not: { status: 'deleted' } }]
}
```

### 5.4 Вместо `$exists` (поле существует)

**Используйте логику проверки в коде:**

```typescript
const items = await Items.findAll(ctx, { limit: 1000 })
const filtered = items.filter((item) => item.someField !== null && item.someField !== undefined)
```

### 5.5 Вместо регулярных выражений

**Используйте `searchBy()` для полнотекстового поиска:**

```typescript
const results = await Items.searchBy(ctx, {
  query: 'поисковый запрос',
  embeddingsQuery: 'семантический запрос',
  where: { status: 'active' }
})
```

---

## 6. Производительность и рекомендации

### 6.1 Общие рекомендации

1. **Используйте `limit` и `offset`** для больших наборов данных:

```typescript
where: { status: 'active' },
limit: 100,
offset: 0
```

2. **Сортировка вместо сложных where**:

```typescript
// Вместо сложной логики, получите и отсортируйте
const items = await Items.findAll(ctx, {
  where: { status: 'active' },
  limit: 1000,
  order: [{ createdAt: 'desc' }]
})
```

3. **Используйте Query Builder для агрегации**:

```typescript
// Вместо получения всех записей
const stats = await Items.select({ count: { $count: ['id'] } })
  .where({ status: 'active' })
  .run(ctx)
```

### 6.2 Ограничения

- **Максимум результатов без limit:** 1000 записей
- **Явный limit:** до 1000 записей
- **Вложенность логических операторов:** практически неограниченна, но сложность может привести к замедлению

### 6.3 Оптимизация сложных запросов

```typescript
// ❌ Неоптимально: получить все, потом фильтровать
const items = await Items.findAll(ctx, { limit: 1000 })
const filtered = items.filter((item) => item.price > 100 && item.category === catId)

// ✅ Оптимально: фильтровать в where
const items = await Items.findAll(ctx, {
  where: {
    price: { $gt: 100 },
    category: catId
  },
  limit: 100
})
```

---

## 7. Примеры реальных случаев

### Пример 1: E-commerce - Фильтр товаров

```typescript
const products = await Products.findAll(ctx, {
  where: {
    $and: [
      { status: 'published' },
      { price: { $gte: minPrice, $lte: maxPrice } },
      { category: selectedCategories },
      { inStock: true }
    ]
  },
  limit: 50,
  offset: (page - 1) * 50,
  order: [{ popularity: 'desc' }]
})
```

### Пример 2: CRM - Поиск активных сделок

```typescript
const deals = await Deals.findAll(ctx, {
  where: {
    $and: [
      {
        $or: [{ status: 'open' }, { status: 'negotiation' }]
      },
      { assignedTo: currentUserId },
      { amount: { $gte: new Money(10000, 'RUB') } }
    ]
  }
})
```

### Пример 3: Аналитика - Подсчёт по периоду

```typescript
const statistics = await Events.select({
  count: { $count: ['id'] },
  totalAmount: { $sum: ['amount'] },
  eventType: 'type'
})
  .where({
    $and: [
      {
        createdAt: {
          $gte: startDate,
          $lt: endDate
        }
      },
      { status: 'completed' }
    ]
  })
  .group(['eventType'])
  .run(ctx)
```

### Пример 4: Исключение нескольких статусов

```typescript
const activeItems = await Items.findAll(ctx, {
  where: {
    $and: [{ $not: { status: 'deleted' } }, { $not: { status: 'draft' } }, { published: true }]
  }
})
```

---

## 8. Типизация (TypeScript)

```typescript
import Products from './tables/products.table'

type FilterValue<Value> =
  | Value
  | Array<Value>
  | { $lt: Value }
  | { $lte: Value }
  | { $gt: Value }
  | { $gte: Value }

type Where<T> =
  | {
      [Key in keyof T]?: FilterValue<T[Key]>
    }
  | { $and: Array<Where<T>> }
  | { $or: Array<Where<T>> }
  | { $not: Where<T> }

// Использование
const filter: Where<typeof Products> = {
  status: 'active',
  price: { $gte: 100, $lte: 1000 }
}
```

---

## 9. Типичные ошибки и как их избежать

### Ошибка 1: Использование неподдерживаемых операторов

```typescript
// ❌ НЕПРАВИЛЬНО
where: {
  status: {
    $ne: 'draft'
  }
}

// ✅ ПРАВИЛЬНО
where: {
  $not: {
    status: 'draft'
  }
}
```

### Ошибка 2: Фильтрация по вложенным JSON полям

```typescript
// ❌ НЕПРАВИЛЬНО
where: {
  metadata: {
    user: {
      name: 'John'
    }
  }
}

// ✅ ПРАВИЛЬНО: пост-обработка
const items = await Items.findAll(ctx, { limit: 1000 })
const filtered = items.filter((item) => item.metadata?.user?.name === 'John')
```

### Ошибка 3: Забыли массив для множественных значений

```typescript
// ❌ НЕПРАВИЛЬНО
where: { id: id1 && id: id2 }

// ✅ ПРАВИЛЬНО
where: { id: [id1, id2] }
```

---

## Заключение

Система фильтрации Heap API покрывает большинство случаев через операторы сравнения и логические операторы. Для сложных сценариев используйте комбинацию `findAll()` + пост-обработка или Query Builder для агрегации.

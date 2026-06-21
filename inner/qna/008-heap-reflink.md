# Heap.RefLink — Работа со связями между таблицами

## Вводная информация

`Heap.RefLink` — это специальный тип поля в Heap таблицах для создания связей между записями в разных таблицах. Документ приведён в соответствие с **рабочим кодом**: **Heap.RefLink(tableIdentifier, options)** (первый аргумент — идентификатор таблицы Heap, не путь к файлу), **onDelete: 'none'**, опциональные поля в **Heap.Optional()**. Он позволяет устанавливать связи один-ко-многим (one-to-many) и обеспечивает удобный API для доступа к связанным данным.

---

## 1. Что такое Heap.RefLink

### 1.1 Определение

`RefLink` — это:

- **Поле для хранения ID** записи из другой таблицы
- **Runtime объект** с методами для работы со связанной записью
- **Типизированное** — содержит информацию о целевой таблице

### 1.2 Когда использовать

✅ **Используйте RefLink когда:**

- Нужна связь между двумя таблицами (например, заказ → клиент)
- Хотите получить полные данные связанной записи
- Нужна типизация целевой таблицы

❌ **Не используйте RefLink когда:**

- Просто нужно хранить строку (используйте `Heap.String()`)
- Нужна связь многие-ко-многим (используйте отдельную таблицу с двумя RefLink)

---

## 2. Синтаксис определения

### 2.1 Базовое определение

**Heap.RefLink(tableIdentifier, options)** — первый аргумент **идентификатор таблицы Heap** целевой таблицы (строка вида `t__project__table__xyz`), второй — объект с `customMeta` и `onDelete`. В рабочем коде используется `onDelete: 'none'`. Поля при необходимости оборачиваются в `Heap.Optional()`.

```typescript
import { Heap } from '@app/heap'

export const Products = Heap.Table(
  't__project__products__Ab1Cd2',
  {
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Название' }
      })
    ),
    category: Heap.Optional(
      Heap.RefLink('t__project__categories__Xy1Zw2', {
        customMeta: { title: 'Категория' },
        onDelete: 'none'
      })
    )
  },
  { customMeta: { title: 'Товары' } }
)

export default Products
export type ProductRow = typeof Products.T
export type ProductRowJson = typeof Products.JsonT
```

### 2.2 С опциональным значением

```typescript
// RefLink опциональный — оборачиваем в Heap.Optional()
author: Heap.Optional(
  Heap.RefLink('t__project__authors__Mn3Op4', {
    customMeta: { title: 'Автор' },
    onDelete: 'none'
  })
)

// При проверке используйте:
if (product.author?.id) {
  // RefLink не пустой
}
```

### 2.3 Типизация

```typescript
// Получение типа связанной таблицы
import Products from './tables/products.table'
import Categories from './tables/categories.table'

type ProductType = typeof Products.T
type CategoryType = typeof Categories.T

// В компоненте или API
const product: ProductType = {
  /* ... */
}
const category: CategoryType = {
  /* ... */
}
```

### 2.4 Поведение при удалении целевой записи (onDelete)

`onDelete` — обязательная опция в определении `Heap.RefLink` и `Heap.UserRefLink`. В **рабочем коде** используется значение **`'none'`** — не проверять ссылки при удалении целевой записи.

#### 2.4.1 Значение в рабочем коде

| Значение     | Описание                                                                        |
| ------------ | ------------------------------------------------------------------------------- |
| `'none'`     | Не проверять ссылки при удалении (используется в рабочем коде)                  |
| `'restrict'` | Не разрешать удаление целевой записи, если на неё есть ссылки (для UserRefLink) |

#### 2.4.2 Синтаксис (соответствие рабочему коду)

```typescript
import { Heap } from '@app/heap'

// RefLink — первый аргумент идентификатор таблицы Heap целевой таблицы
export const Products = Heap.Table(
  't__project__products__Ab1Cd2',
  {
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Название' }
      })
    ),
    category: Heap.Optional(
      Heap.RefLink('t__project__categories__Xy1Zw2', {
        customMeta: { title: 'Категория' },
        onDelete: 'none'
      })
    )
  },
  { customMeta: { title: 'Товары' } }
)

// UserRefLink — один аргумент-объект с обязательным onDelete
export const Articles = Heap.Table(
  't__project__articles__Xy1Zw2',
  {
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Заголовок' }
      })
    ),
    author: Heap.Optional(
      Heap.UserRefLink({
        customMeta: { title: 'Автор' },
        onDelete: 'none'
      })
    )
  },
  { customMeta: { title: 'Статьи' } }
)

export const Orders = Heap.Table(
  't__project__orders__Mn3Op4',
  {
    customer: Heap.Optional(
      Heap.RefLink('t__project__customers__Qr5St6', {
        customMeta: { title: 'Клиент' },
        onDelete: 'none'
      })
    )
  },
  { customMeta: { title: 'Заказы' } }
)
```

#### 2.4.3 Практические примеры

**Пример 1: CASCADE — Удаление каскадом**

```typescript
// Таблица комментариев к посту (рабочий синтаксис)
export const Comments = Heap.Table(
  't__comments__Qr5St6',
  {
    post: Heap.Optional(
      Heap.RefLink('t__project__posts__Ab1Cd2', {
        customMeta: { title: 'Пост' },
        onDelete: 'none'
      })
    ),
    text: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Текст комментария' }
      })
    )
  },
  { customMeta: { title: 'Комментарии' } }
)

// При удалении поста:
await Posts.delete(ctx, postId) // Автоматически удалятся все Comments где post.id == postId
```

**Пример 2: SET_NULL — Обнуление ссылки**

```typescript
// Таблица задач с опциональной ссылкой на ответственного (рабочий синтаксис)
export const Tasks = Heap.Table(
  't__tasks__Uv7Wx8',
  {
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Название задачи' }
      })
    ),
    assignedTo: Heap.Optional(
      Heap.UserRefLink({
        customMeta: { title: 'Назначена' },
        onDelete: 'none'
      })
    )
  },
  { customMeta: { title: 'Задачи' } }
)

// При удалении пользователя:
await Users.delete(ctx, userId)
// Все задачи где assignedTo.id == userId получат assignedTo = null
```

**Пример 3: NO_ACTION — Защита от удаления**

```typescript
// Таблица счётов, привязанных к клиентам (рабочий синтаксис)
export const Invoices = Heap.Table(
  't__invoices__Yz9Aa0',
  {
    customer: Heap.Optional(
      Heap.RefLink('t__project__customers__Qr5St6', {
        customMeta: { title: 'Клиент' },
        onDelete: 'none'
      })
    ),
    amount: Heap.Optional(
      Heap.Money({
        customMeta: { title: 'Сумма' }
      })
    )
  },
  { customMeta: { title: 'Счета' } }
)

// При попытке удалить клиента:
try {
  await Customers.delete(ctx, customerId)
} catch (error) {
  // Ошибка: "Cannot delete customer with dependent invoices"
  console.error(error.message)
}

// ✅ Решение: сначала удалить счёта
await Invoices.deleteMany(ctx, { where: { customer: customerId } })
await Customers.delete(ctx, customerId) // Теперь сработает
```

#### 2.4.4 Важные замечания (рабочий код)

1. **RefLink** — два аргумента: `Heap.RefLink(tableIdentifier, { customMeta?, onDelete: 'none' })`. Идентификатор таблицы Heap — строка вида `t__project__table__xyz`.

2. **UserRefLink** — один аргумент-объект с обязательным **onDelete**: `'restrict'` или `'none'`. В рабочем коде — `onDelete: 'none'`.

3. **Опциональные поля** — оборачивайте в `Heap.Optional(Heap.RefLink(...))` или `Heap.Optional(Heap.UserRefLink(...))`.

4. **Порядок удаления** — сначала удаляйте зависимые записи, затем родительскую.

---

## 3. Создание и обновление записей

### 3.1 Создание с RefLink

```typescript
import Products from './tables/products.table'

// При создании передаём только ID целевой записи
const category = await Categories.findById(ctx, categoryId)

const product = await Products.create(ctx, {
  title: 'Платье красное',
  category: category.id // Передаём ID, не объект!
})
```

### 3.2 Обновление RefLink

```typescript
// Обновление связи
const updated = await Products.update(ctx, {
  id: product.id,
  category: newCategoryId // Новый ID
})
```

### 3.3 Удаление связи (установка в null)

```typescript
// Если поле опциональное, можно установить null
const updated = await Products.update(ctx, {
  id: product.id,
  author: null
})
```

---

## 4. Чтение и доступ к связанным данным

### 4.1 Доступ к ID связанной записи

```typescript
const product = await Products.findById(ctx, productId)

// Синхронный доступ к ID
const categoryId = product.category.id // Быстро, не требует await
console.log(categoryId) // Строка "cat_123"
```

### 4.2 Получение полных данных связанной записи

```typescript
const product = await Products.findById(ctx, productId)

// Асинхронный доступ к полной записи
const category = await product.category.get(ctx)
console.log(category.title) // "Электроника"
console.log(category.description) // "Электронные товары"
```

### 4.3 Получение отображаемого названия

```typescript
const product = await Products.findById(ctx, productId)

// Получить display title (обычно название категории)
const categoryTitle = await product.category.getTitle(ctx)
console.log(categoryTitle) // "Электроника"
```

### 4.4 Доступ к таблице целевой записи

```typescript
const product = await Products.findById(ctx, productId)

// Получить репозиторий целевой таблицы
const categoriesTable = await product.category.getTargetTableRepo(ctx)

// Теперь можем делать запросы к таблице категорий
const otherCategories = await categoriesTable.findAll(ctx, {
  where: { id: { $not: product.category.id } }
})
```

---

## 5. Методы RefLink объектов

### 5.1 Доступные методы

| Метод                      | Возвращает                | Описание                        |
| -------------------------- | ------------------------- | ------------------------------- |
| `.id`                      | `string`                  | ID связанной записи (синхронно) |
| `.get(ctx)`                | `Promise<T \| null>`      | Получить полную запись          |
| `.getTitle(ctx)`           | `Promise<string \| null>` | Получить отображаемое имя       |
| `.getTargetTableRepo(ctx)` | `Promise<HeapTable<T>>`   | Получить таблицу целевой записи |
| `.toJSON()`                | `string`                  | Сериализация (возвращает ID)    |

### 5.2 Примеры использования методов

```typescript
const order = await Orders.findById(ctx, orderId)

// 1. Синхронный доступ к ID
const customerId = order.customer.id

// 2. Асинхронный доступ к данным
const customer = await order.customer.get(ctx)
if (customer) {
  console.log(customer.email)
  console.log(customer.phone)
}

// 3. Получить title (название)
const customerName = await order.customer.getTitle(ctx)

// 4. Получить таблицу и делать запросы
const customersRepo = await order.customer.getTargetTableRepo(ctx)
const similarCustomers = await customersRepo.findAll(ctx, {
  where: { country: customer.country }
})
```

---

## 6. Batch Loading — Оптимизация производительности

### 6.1 Проблема N+1

```typescript
// ❌ НЕОПТИМАЛЬНО: N+1 запрос
const products = await Products.findAll(ctx, { limit: 100 })

for (const product of products) {
  const category = await product.category.get(ctx) // 100 запросов!
  console.log(product.title, category.title)
}
```

### 6.2 Решение: Batch Loading

```typescript
// ✅ ОПТИМАЛЬНО: 1 запрос + batch

const products = await Products.findAll(ctx, { limit: 100 })

// Собрать все уникальные ID категорий
const categoryIds = [
  ...new Set(
    products.map((p) => p.category.id).filter(Boolean) // Исключить null/undefined
  )
]

// Загрузить все категории одним запросом
const categories = await Categories.findAll(ctx, {
  where: { id: categoryIds }
})

// Создать map для быстрого доступа
const categoriesMap = new Map(categories.map((c) => [c.id, c]))

// Обогатить продукты данными категорий
const productsWithCategories = products.map((product) => ({
  ...product,
  categoryData: categoriesMap.get(product.category.id)
}))
```

### 6.3 Batch Loading в API

```typescript
export const apiProductsWithCategoriesRoute = app.get(
  '/products-with-categories',
  async (ctx, req) => {
    const products = await Products.findAll(ctx, { limit: 100 })

    // Batch loading категорий
    const categoryIds = [...new Set(products.map((p) => p.category.id).filter(Boolean))]

    const categories = await Categories.findAll(ctx, {
      where: { id: categoryIds }
    })

    const categoriesMap = new Map(categories.map((c) => [c.id, c]))

    // Возвращаем обогащённые данные
    return products.map((product) => ({
      id: product.id,
      title: product.title,
      category: {
        id: product.category.id,
        title: categoriesMap.get(product.category.id)?.title
      }
    }))
  }
)
```

---

## 7. Фильтрация по RefLink

### 7.1 Фильтрация по ID связанной записи

```typescript
// Поиск всех товаров в категории
const products = await Products.findAll(ctx, {
  where: { category: categoryId }
})

// По нескольким категориям
const products = await Products.findAll(ctx, {
  where: { category: [catId1, catId2, catId3] }
})
```

### 7.2 Исключение по RefLink

```typescript
// Все товары КРОМЕ категории "Удалённые"
const products = await Products.findAll(ctx, {
  where: { $not: { category: deletedCategoryId } }
})
```

### 7.3 Сложная фильтрация

```typescript
const products = await Products.findAll(ctx, {
  where: {
    $and: [
      { category: [activeCategories] },
      { price: { $gte: new Money(100, 'RUB') } },
      { $not: { author: null } }
    ]
  }
})
```

---

## 8. Типичные ошибки и как их избежать

### Ошибка 1: Передача объекта вместо ID

```typescript
// ❌ НЕПРАВИЛЬНО
const product = await Products.create(ctx, {
  title: 'Товар',
  category: categoryObject // Объект!
})

// ✅ ПРАВИЛЬНО
const product = await Products.create(ctx, {
  title: 'Товар',
  category: categoryObject.id // ID!
})
```

### Ошибка 2: Забывание await при вызове .get()

```typescript
// ❌ НЕПРАВИЛЬНО
const product = await Products.findById(ctx, productId)
const category = product.category.get(ctx) // Promise, не данные!

// ✅ ПРАВИЛЬНО
const product = await Products.findById(ctx, productId)
const category = await product.category.get(ctx) // Данные
```

### Ошибка 3: Использование .id в фильтрации с null

```typescript
// ❌ НЕПРАВИЛЬНО: если RefLink пустой, это вернёт undefined
where: {
  category: product.category.id
} // Может быть undefined!

// ✅ ПРАВИЛЬНО: проверить перед использованием
if (product.category?.id) {
  const result = await Products.findAll(ctx, {
    where: { category: product.category.id }
  })
}
```

### Ошибка 4: Циклические зависимости таблиц ⚠️ КРИТИЧНО

```typescript
// ❌ ПРОБЛЕМА: импорт одной таблицы из файла другой
// categories.table.ts
import { Products } from './products.table'  // Циклическая зависимость!
export const Categories = Heap.Table('...', {
  defaultProduct: Heap.RefLink('t__project__products__Ab1Cd2', { ... })
})

// products.table.ts
import Categories from './categories.table'  // Цикл!
export const Products = Heap.Table('...', {
  category: Heap.RefLink('t__project__categories__Xy1Zw2', { ... })
})
```

**Решение:** В RefLink указывайте **идентификатор таблицы Heap** (строка вида `t__project__table__xyz`) первым аргументом — импорт целевой таблицы не нужен, циклических зависимостей не будет.

```typescript
// ✅ ПРАВИЛЬНО: идентификатор таблицы Heap, импорт не нужен
export const Categories = Heap.Table(
  't__project__categories__Xy1Zw2',
  {
    defaultProduct: Heap.Optional(
      Heap.RefLink('t__project__products__Ab1Cd2', {
        customMeta: { title: 'Товар по умолчанию' },
        onDelete: 'none'
      })
    )
  },
  { customMeta: { title: 'Категории' } }
)

export const Products = Heap.Table(
  't__project__products__Ab1Cd2',
  {
    category: Heap.Optional(
      Heap.RefLink('t__project__categories__Xy1Zw2', {
        customMeta: { title: 'Категория' },
        onDelete: 'none'
      })
    )
  },
  { customMeta: { title: 'Товары' } }
)
```

### Ошибка 5: N+1 запросы при обработке коллекций

Смотри раздел 6.1 (Batch Loading).

---

## 9. Примеры реальных случаев

### Пример 1: Заказы с клиентами

```typescript
// api/orders.ts
import Orders from '../tables/orders.table'
import Customers from '../tables/customers.table'

export const apiOrdersWithCustomersRoute = app.get('/orders', async (ctx, req) => {
  const orders = await Orders.findAll(ctx, { limit: 50 })

  // Batch loading клиентов
  const customerIds = [...new Set(orders.map((o) => o.customer.id).filter(Boolean))]

  const customers = await Customers.findAll(ctx, {
    where: { id: customerIds }
  })

  const customersMap = new Map(customers.map((c) => [c.id, c]))

  return orders.map((order) => ({
    id: order.id,
    number: order.number,
    totalAmount: order.totalAmount,
    customer: {
      id: order.customer.id,
      name: customersMap.get(order.customer.id)?.name
    }
  }))
})
```

### Пример 2: Создание связанной записи

```typescript
export const apiCreateOrderRoute = app
  .body((s) => ({
    customerId: s.string(),
    amount: s.number()
  }))
  .post('/create-order', async (ctx, req) => {
    // Проверить что клиент существует
    const customer = await Customers.findById(ctx, req.body.customerId)
    if (!customer) {
      throw new Error('Клиент не найден')
    }

    // Создать заказ со связью
    const order = await Orders.create(ctx, {
      customer: customer.id, // Передаём ID
      amount: new Money(req.body.amount, 'RUB'),
      status: 'pending'
    })

    return order
  })
```

### Пример 3: Обновление связи

```typescript
export const apiChangeCustomerRoute = app
  .body((s) => ({
    orderId: s.string(),
    newCustomerId: s.string()
  }))
  .post('/change-customer', async (ctx, req) => {
    // Проверить что новый клиент существует
    const newCustomer = await Customers.findById(ctx, req.body.newCustomerId)
    if (!newCustomer) {
      throw new Error('Новый клиент не найден')
    }

    // Обновить связь
    const updated = await Orders.update(ctx, {
      id: req.body.orderId,
      customer: newCustomer.id
    })

    return updated
  })
```

### Пример 4: Вложенные RefLink

```typescript
// OrderItems содержит ссылку на Order
// Order содержит ссылку на Customer

export const apiOrderDetailsRoute = app.get('/order/:id', async (ctx, req) => {
  const order = await Orders.findById(ctx, req.params.id)
  if (!order) throw new Error('Заказ не найден')

  // Получить клиента
  const customer = await order.customer.get(ctx)

  // Получить товары в заказе
  const items = await OrderItems.findAll(ctx, {
    where: { order: order.id }
  })

  // Batch loading товаров
  const productIds = [...new Set(items.map((i) => i.product.id).filter(Boolean))]
  const products = await Products.findAll(ctx, {
    where: { id: productIds }
  })
  const productsMap = new Map(products.map((p) => [p.id, p]))

  return {
    id: order.id,
    customer: customer,
    items: items.map((item) => ({
      product: productsMap.get(item.product.id),
      quantity: item.quantity
    }))
  }
})
```

---

## 10. Миграция и управление связями

### 10.1 Когда целевая таблица переименована

```typescript
// RefLink использует идентификатор таблицы Heap (первый аргумент).
// Если целевая таблица переименована или идентификатор изменился:
// 1. Создать новую таблицу с новым идентификатором
// 2. Скопировать данные
// 3. Обновить все RefLink в зависимых таблицах (новый tableIdentifier)
// 4. Удалить старую таблицу
```

### 10.2 Удаление целевой записи

```typescript
// Если удалить категорию, а в товарах на неё ссылка
const category = await Categories.findById(ctx, categoryId)
await Categories.delete(ctx, categoryId)

// ❌ ПРОБЛЕМА: products.category ещё указывает на несуществующий ID
// ✅ РЕШЕНИЕ: сначала обновить товары
await Products.update(ctx, {
  where: { category: categoryId },
  // Новое значение категории (или null, если поле опциональное)
  category: defaultCategoryId
})

await Categories.delete(ctx, categoryId)
```

---

## Заключение

`Heap.RefLink` — мощный инструмент для работы со связанными данными. Ключевые моменты:

1. **Передавайте только ID**, не объекты
2. **Используйте `.id` для синхронного доступа**, `.get(ctx)` для полных данных
3. **Применяйте batch loading** для оптимизации
4. **Избегайте циклических зависимостей** — в RefLink указывайте только идентификатор таблицы Heap, не импортируйте целевую таблицу
5. **Проверяйте наличие RefLink** перед использованием (может быть null)

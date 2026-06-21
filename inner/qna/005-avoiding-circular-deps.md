# Избегание циклических зависимостей при использовании .url и .run

## Проблема

Циклическая зависимость возникает, когда:

- Vue-компонент импортирует API-роут
- Этот же роут (или его зависимости) импортирует компонент

```typescript
// ❌ Плохо: компонент импортирует роут
// pages/Product.vue
import { productApiRoute } from '../api/product'

// api/product.ts — роут импортирует компонент для рендера
import ProductPage from '../pages/Product.vue'
```

## Решение: однонаправленные зависимости

```
┌─────────────────┐      ┌─────────────┐      ┌─────────────────┐
│   /api/*.ts     │◄─────│ /shared/*.ts│─────►│ /pages/*.vue    │
│   (роуты)       │      │  (утилиты)  │      │  (компоненты)   │
└─────────────────┘      └─────────────┘      └─────────────────┘
```

**Правило:** Зависимости идут только в одном направлении — компоненты зависят от роутов, роуты не зависят от компонентов.

## Правильное использование .url()

### На фронтенде (Vue)

```typescript
// pages/ProductsList.vue
<script setup>
import { productDetailRoute } from "../api/products"
import { cartAddRoute } from "../api/cart"

declare const ctx: any

async function goToProduct(id: string) {
  // ✅ Правильно: используем .url() для навигации
  window.location.href = productDetailRoute({ id }).url()
}

async function addToCart(productId: string) {
  // ✅ Правильно: используем .run() для API-вызова
  await cartAddRoute.run(ctx, { productId, quantity: 1 })
}
</script>

<template>
  <!-- ✅ Правильно: .url() в шаблоне -->
  <a :href="productDetailRoute({ id: product.id }).url()">
    {{ product.name }}
  </a>
</template>
```

### На бэкенде

```typescript
// api/order.ts
import { productDetailRoute } from './products'

export const createOrderRoute = app.post('/create', async (ctx, req) => {
  const order = await Orders.create(ctx, req.body)

  // ✅ Правильно: используем .url() для редиректа
  return ctx.resp.redirect(productDetailRoute({ id: order.productId }).url())
})
```

## Правильное использование .run()

### На фронтенде (Vue)

```typescript
// pages/Dashboard.vue
<script setup>
import { fetchStatsRoute } from "../api/stats"
import { updateProfileRoute } from "../api/profile"

declare const ctx: any

// ✅ Правильно: вызываем роут при монтировании
const stats = await fetchStatsRoute.run(ctx)

// ✅ Правильно: вызываем роут по действию
async function saveProfile(data: ProfileData) {
  await updateProfileRoute.run(ctx, data)
}
</script>
```

### На бэкенде (внутри другого роута)

```typescript
// api/checkout.ts
import { calculateShippingRoute } from './shipping'

export const checkoutRoute = app.post('/checkout', async (ctx, req) => {
  // ✅ Правильно: вызываем другой роут через .run()
  const shipping = await calculateShippingRoute.query({ zip: req.body.zipCode }).run(ctx)

  return { shippingCost: shipping.cost }
})
```

## Структура без циклических зависимостей

```
/api/
  products.ts      ←── экспортирует productRoute
  cart.ts          ←── экспортирует cartRoute

/shared/
  types.ts         ←── общие типы
  utils.ts         ←── общие функции

/pages/
  Product.vue      ←── импортирует productRoute, cartRoute
  Cart.vue         ←── импортирует cartRoute
```

## Антипаттерны

### ❌ Роут не должен возвращать компонент

```typescript
// api/page.ts — ❌ Плохо
import HomePage from '../pages/Home.vue'

export const pageRoute = app.get('/', async (ctx, req) => {
  return { component: HomePage } // Не делай так
})
```

### ❌ Роут не должен импортировать компонент для типов

```typescript
// api/product.ts — ❌ Плохо
import type { ProductProps } from '../pages/Product.vue' // Не делай так

export const apiRoute = app.get('/', async (ctx, req) => {
  // ...
})
```

### ✅ Вместо этого: общие типы в /shared

```typescript
// shared/types.ts — ✅ Правильно
export interface ProductProps {
  id: string
  name: string
  price: number
}

// api/product.ts
import type { ProductProps } from '../shared/types'

// pages/Product.vue
import type { ProductProps } from '../shared/types'
```

## Итог

| Метод    | Где использовать             | Что делать                   | Чего избегать                    |
| -------- | ---------------------------- | ---------------------------- | -------------------------------- |
| `.url()` | Vue компоненты, редиректы    | Импортировать из `/api/*.ts` | Hardcode URL                     |
| `.run()` | Vue компоненты, другие роуты | Вызывать с `ctx`             | Импортировать компоненты в роуты |

@chatium

# Платежи в Chatium

Исчерпывающее руководство по интеграции платёжных систем и обработке платежей в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Создание платежа](#создание-платежа)
  - [runAttemptPayment](#runattemptpayment)
  - [Параметры платежа](#параметры-платежа)
  - [Callback функции](#callback-функции)
- [Работа с сохранёнными картами](#работа-с-сохранёнными-картами)
  - [getSavedCards](#getsavedcards)
  - [Оплата в один клик](#оплата-в-один-клик)
- [Реккурентные платежи](#реккурентные-платежи)
  - [attemptAutoCharge](#attemptautocharge)
  - [Автосписание по расписанию](#автосписание-по-расписанию)
- [Провайдеры платежей](#провайдеры-платежей)
- [Обработка ошибок](#обработка-ошибок)
- [Практические примеры](#практические-примеры)
  - [Простая оплата](#простая-оплата)
  - [Оплата подписки](#оплата-подписки)
  - [Автосписание подписки](#автосписание-подписки)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**@pay/sdk** — модуль для работы с платежами в Chatium.

### Ключевые возможности

- Создание платежей
- Сохранение карт
- Оплата в один клик
- Реккурентные платежи
- Автосписание по расписанию
- Callback после оплаты

### Типы платежей

| Тип              | Описание                        | initedBy   | bySchedule |
| ---------------- | ------------------------------- | ---------- | ---------- |
| **Обычный**      | Пользователь оплачивает вручную | -          | -          |
| **Один клик**    | Оплата сохранённой картой       | `'user'`   | `false`    |
| **Автосписание** | По расписанию (подписки)        | `'system'` | `true`     |

---

## Создание платежа

### runAttemptPayment

Основная функция создания платежа.

```typescript
import { runAttemptPayment } from '@pay/sdk'

const response = await runAttemptPayment(ctx, {
  subject: order, // Запись из таблицы (заказ)
  amount: [total, currency], // [сумма, валюта]
  description: 'Описание платежа',

  user: ctx.user, // Пользователь
  session: ctx.session, // Сессия

  customer: {
    // Данные покупателя
    firstName: 'Иван',
    lastName: 'Петров',
    email: 'ivan@example.com',
    phone: '+79991234567'
  },

  items: [
    // Товары для чека
    {
      id: 'product_1',
      name: 'iPhone 15',
      quantity: 1,
      price: 999
    }
  ],

  successUrl: successPageRoute.url(), // Куда редирект после успеха
  cancelUrl: cartPageRoute.url(), // Куда редирект при отмене

  successCallbackRoute: paymentSuccessCallback // Callback функция
})

if (response.success) {
  return {
    success: true,
    paymentLink: response.result.paymentLink
  }
} else {
  return {
    success: false,
    error: response.error
  }
}
```

### Параметры платежа

```typescript
interface PaymentParams {
  // Обязательные
  subject: any // Объект из Heap таблицы
  amount: [number, string] // [сумма, валюта: 'RUB', 'USD', ...]
  description: string // Описание платежа

  // Пользователь
  user: SmartUser
  session: Session

  // Данные покупателя (для чека)
  customer: {
    firstName: string
    lastName?: string
    middleName?: string
    email: string // Обязательно для чека!
    phone?: string
    telegramId?: string // Опционально
  }

  // Товары (для чека)
  items: Array<{
    id: string // ID товара
    name: string // Название
    quantity: number // Количество
    price: number // Цена за единицу
  }>

  // URL редиректов
  successUrl: string // После успешной оплаты
  cancelUrl: string // При отмене

  // Callback
  successCallbackRoute?: RouteRef // Вызовется после успеха

  // Опциональные
  providerId?: string // ID провайдера (по умолчанию - дефолтный)
  payload?: Record<string, any> // Дополнительные данные
}
```

### Callback функции

```typescript
import { validateCaller } from '@pay/sdk'

const paymentSuccessCallback = app.function('/payment-success', async (ctx, params, callerInfo) => {
  // ⚠️ ВАЖНО: Всегда проверяйте caller
  validateCaller(callerInfo)

  const { attempt, payment, savedCardId } = params

  ctx.account.log('Платёж успешен', {
    level: 'info',
    json: {
      attemptId: attempt.id,
      paymentId: payment.id,
      amount: payment.amount
    }
  })

  // Получаем ID заказа из subject
  const orderId = attempt.subject[1]

  // Обновляем заказ
  await OrdersTable.update(ctx, {
    id: orderId,
    status: 'paid',
    paymentId: payment.id,
    paidAt: new Date()
  })

  // Записываем событие
  await writeWorkspaceEvent(ctx, 'orderPaid', {
    action_param1: orderId,
    action_param2: payment.id,
    action_param1_float: payment.amount
  })

  return { success: true }
})
```

**Структура params**:

```typescript
interface PaymentCallbackParams {
  attempt: {
    id: string
    subject: [string, string] // ['table_name', 'record_id']
    amount: number
    currency: string
    status: string
  }
  payment: {
    id: string
    amount: number
    currency: string
    fee?: number
    createdAt: Date
  }
  savedCardId?: string // Если карта была сохранена
}
```

---

## Работа с сохранёнными картами

### getSavedCards

Получение списка сохранённых карт пользователя.

```typescript
import { getSavedCards } from '@pay/sdk'

// Карты текущего пользователя
const result = await getSavedCards(ctx, {})

// Карты конкретного пользователя
const result2 = await getSavedCards(ctx, {
  userId: 'user_id'
})

// Карты для конкретного провайдера
const result3 = await getSavedCards(ctx, {
  providerId: 'provider_id'
})

if (result.success) {
  result.cards.forEach((card) => {
    ctx.account.log('Карта', {
      json: {
        id: card.id,
        cardMask: card.cardMask, // "**** **** **** 1234"
        cardType: card.cardType, // "Visa", "MasterCard"
        provider: card.provider.title,
        createdAt: card.createdAt
      }
    })
  })
}
```

**Отображение в Vue**:

```vue
<template>
  <div class="saved-cards">
    <h3>Сохранённые карты</h3>

    <div v-if="cards.length === 0">Нет сохранённых карт</div>

    <div v-for="card in cards" :key="card.id" class="card-item" @click="selectCard(card.id)">
      <div class="card-icon">
        {{ card.cardType === 'Visa' ? '💳' : '💳' }}
      </div>
      <div class="card-info">
        <div class="card-mask">{{ card.cardMask }}</div>
        <div class="card-type">{{ card.cardType }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGetSavedCardsRoute } from '../api/payments'

const cards = ref([])
const selectedCardId = ref(null)

onMounted(async () => {
  const result = await apiGetSavedCardsRoute.run(ctx)
  if (result.success) {
    cards.value = result.cards
  }
})

function selectCard(cardId: string) {
  selectedCardId.value = cardId
}

defineExpose({ selectedCardId })
</script>

<style scoped>
.card-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.card-item:hover {
  background: #f5f5f5;
  border-color: #3b82f6;
}

.card-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.card-mask {
  font-family: monospace;
  font-weight: bold;
}

.card-type {
  color: #666;
  font-size: 0.9rem;
}
</style>
```

### Оплата в один клик

Оплата сохранённой картой без редиректа.

```typescript
import { attemptAutoCharge } from '@pay/sdk'

// @shared-route
export const apiQuickPaymentRoute = app.post('/quick-payment', async (ctx, req) => {
  const { orderId, savedCardId } = req.body

  const order = await OrdersTable.findById(ctx, orderId)

  if (!order) {
    return { success: false, error: 'Заказ не найден' }
  }

  // ⚠️ ВАЖНО: userId должен быть владельцем карты!
  const response = await attemptAutoCharge(ctx, {
    subject: order,
    amount: [order.total.amount, order.total.currency],
    description: `Оплата заказа #${order.id}`,

    userId: ctx.user.id, // ID владельца карты
    savedCardId: savedCardId, // ОБЯЗАТЕЛЬНО для оплаты в один клик

    customer: {
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
      email: ctx.user.confirmedEmail,
      phone: ctx.user.confirmedPhone
    },

    items: order.items.map((item) => ({
      id: item.productId,
      name: item.productName,
      quantity: item.quantity,
      price: item.price
    })),

    payload: {
      orderId: order.id,
      paymentMethod: 'saved_card'
    },

    initedBy: 'user', // Инициатор - пользователь
    bySchedule: false // НЕ по расписанию
  })

  if (response.success) {
    await OrdersTable.update(ctx, {
      id: order.id,
      status: 'paid',
      paymentMethod: 'saved_card'
    })

    return {
      success: true,
      message: response.message
    }
  } else {
    return {
      success: false,
      error: response.error
    }
  }
})
```

---

## Реккурентные платежи

### attemptAutoCharge

Автоматическое списание с сохранённой карты.

```typescript
import { attemptAutoCharge } from "@pay/sdk"

const response = await attemptAutoCharge(ctx, {
  subject: subscription,          // Объект подписки из таблицы
  amount: [monthlyPrice, currency],
  description: 'Ежемесячная подписка',

  userId: userId,                 // ID владельца карты (ОБЯЗАТЕЛЬНО!)
  savedCardId: 'card_id',         // Опционально: конкретная карта

  customer: { ... },
  items: [ ... ],
  payload: { ... },

  initedBy: 'system',             // 'user' или 'system'
  bySchedule: true                // true для автосписания
})
```

### Автосписание по расписанию

Полный пример подписки с автоматическим списанием.

```typescript
// api/subscriptions.ts
import { attemptAutoCharge } from '@pay/sdk'
import { Money } from '@app/heap'
import SubscriptionsTable from '../tables/subscriptions.table'

// Job для обработки платежей
const processSubscriptionPaymentJob = app.job('/process-subscription', async (ctx, params) => {
  const { subscriptionId, userId } = params

  const subscription = await SubscriptionsTable.findById(ctx, subscriptionId)

  if (!subscription || subscription.status !== 'active') {
    ctx.account.log('Подписка не активна', {
      level: 'warn',
      json: { subscriptionId, status: subscription?.status }
    })
    return { success: false, error: 'Subscription is not active' }
  }

  // Автоматическое списание
  const response = await attemptAutoCharge(ctx, {
    subject: subscription,
    amount: [subscription.monthlyPrice.amount, subscription.monthlyPrice.currency],
    description: `Ежемесячная подписка ${subscription.planName}`,

    userId: userId,
    // savedCardId НЕ указываем - будет использована первая карта

    customer: {
      firstName: subscription.customerFirstName,
      lastName: subscription.customerLastName,
      email: subscription.customerEmail,
      phone: subscription.customerPhone
    },

    payload: {
      subscriptionId: subscription.id,
      planName: subscription.planName,
      billingPeriod: 'monthly',
      isRecurring: true
    },

    items: [
      {
        id: subscription.planId,
        name: subscription.planName,
        quantity: 1,
        price: subscription.monthlyPrice.amount
      }
    ],

    initedBy: 'system', // Инициатор - система
    bySchedule: true // Автосписание по расписанию
  })

  if (response.success) {
    // Вычисляем следующую дату списания
    const nextBillingDate = new Date()
    nextBillingDate.setDate(nextBillingDate.getDate() + 30)

    // Обновляем подписку
    await SubscriptionsTable.update(ctx, {
      id: subscription.id,
      nextBillingDate,
      lastPaymentDate: new Date(),
      status: 'active'
    })

    // Планируем следующее списание
    processSubscriptionPaymentJob.scheduleJobAt(ctx, nextBillingDate, {
      subscriptionId: subscription.id,
      userId
    })

    ctx.account.log('Автосписание успешно', {
      level: 'info',
      json: {
        subscriptionId,
        nextBillingDate
      }
    })

    return { success: true }
  } else {
    // При неудаче приостанавливаем подписку
    await SubscriptionsTable.update(ctx, {
      id: subscription.id,
      status: 'payment_failed',
      lastError: response.error,
      failedAt: new Date()
    })

    ctx.account.log('Автосписание не удалось', {
      level: 'error',
      json: {
        subscriptionId,
        error: response.error
      }
    })

    // Уведомляем пользователя
    await sendNotification(ctx, userId, {
      title: 'Ошибка оплаты подписки',
      message: `Не удалось списать средства за подписку. ${response.error}`
    })

    return { success: false, error: response.error }
  }
})
```

---

## Провайдеры платежей

### findPaymentProviders

Получение списка провайдеров.

```typescript
import { findPaymentProviders } from '@pay/sdk'

const providers = await findPaymentProviders(ctx)

for (const provider of providers) {
  ctx.account.log('Провайдер', {
    json: {
      id: provider.id,
      title: provider.title,
      key: provider.key
    }
  })
}
```

**Выбор провайдера**:

```typescript
export const apiCreatePaymentRoute = app.post('/create-payment', async (ctx, req) => {
  const { orderId, providerKey } = req.body

  let providerId: string | undefined

  // Если пользователь указал провайдера
  if (providerKey) {
    const providers = await findPaymentProviders(ctx)
    const provider = providers.find((p) => p.key === providerKey)
    providerId = provider?.id
  }

  const response = await runAttemptPayment(ctx, {
    // ...
    providerId // Если не указан - используется дефолтный
  })

  return response
})
```

---

## Обработка ошибок

### Receipt is missing or illegal

**Проблема**: Ошибка при формировании чека.

**Решение**:

1. Убедитесь что передаёте корректные `items` и `customer`:

```typescript
const response = await runAttemptPayment(ctx, {
  customer: {
    firstName: 'Иван',
    lastName: 'Петров',
    email: 'ivan@example.com' // ОБЯЗАТЕЛЬНО!
  },
  items: [
    {
      id: 'product_1',
      name: 'Товар 1',
      quantity: 1,
      price: 100 // Цена за единицу
    }
  ]
})
```

2. Если всё корректно - включите генерацию чеков в настройках провайдера:
   - Перейдите на `/app/pay?tab=providers`
   - Включите "Использовать встроенную генерацию чеков"

### Invalid card

**Проблема**: Карта не найдена или не принадлежит пользователю.

**Решение**:

```typescript
// Проверяем принадлежность карты
const savedCardsResult = await getSavedCards(ctx, {
  userId: userId
})

const card = savedCardsResult.cards?.find((c) => c.id === savedCardId)

if (!card) {
  return {
    success: false,
    error: 'Карта не найдена или не принадлежит пользователю'
  }
}
```

### Payment failed

**Проблема**: Недостаточно средств или другая ошибка банка.

**Решение**:

```typescript
if (!response.success) {
  ctx.account.log('Платёж отклонён', {
    level: 'error',
    json: {
      error: response.error,
      userId,
      amount
    }
  })

  // Уведомляем пользователя
  await sendNotification(ctx, userId, {
    title: 'Ошибка оплаты',
    message: response.error
  })

  return { success: false, error: response.error }
}
```

---

## Практические примеры

### Простая оплата

**API роут**:

```typescript
// api/payments.ts
import { runAttemptPayment } from '@pay/sdk'
import OrdersTable from '../tables/orders.table'
import { successPageRoute } from '../pages/success'
import { cartPageRoute } from '../pages/cart'

// @shared-route
export const apiCreatePaymentRoute = app.post('/create-payment', async (ctx, req) => {
  const { orderId } = req.body

  const order = await OrdersTable.findById(ctx, orderId)

  if (!order) {
    return { success: false, error: 'Заказ не найден' }
  }

  const response = await runAttemptPayment(ctx, {
    subject: order,
    amount: [order.total.amount, order.total.currency],
    description: `Оплата заказа #${order.id}`,

    user: ctx.user,
    session: ctx.session,

    customer: {
      firstName: order.customerFirstName,
      lastName: order.customerLastName,
      email: order.customerEmail,
      phone: order.customerPhone
    },

    items: order.items.map((item) => ({
      id: item.productId,
      name: item.productName,
      quantity: item.quantity,
      price: item.price
    })),

    successUrl: successPageRoute.url(),
    cancelUrl: cartPageRoute.url(),

    successCallbackRoute: paymentSuccessCallback
  })

  if (response.success) {
    return {
      success: true,
      paymentLink: response.result.paymentLink
    }
  } else {
    ctx.account.log('Ошибка создания платежа', {
      level: 'error',
      json: {
        orderId,
        error: response.error
      }
    })

    return {
      success: false,
      error: response.error
    }
  }
})
```

**Vue компонент**:

```vue
<template>
  <div class="checkout">
    <h2>Оформление заказа</h2>

    <div class="order-summary">
      <div v-for="item in order.items" :key="item.id">
        {{ item.productName }} × {{ item.quantity }} = {{ formatPrice(item.price) }}
      </div>
      <div class="total">Итого: {{ formatPrice(order.total) }}</div>
    </div>

    <button @click="createPayment" :disabled="loading" class="pay-button">
      {{ loading ? 'Обработка...' : 'Оплатить' }}
    </button>

    <div v-if="error" class="error">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { apiCreatePaymentRoute } from '../api/payments'

const props = defineProps<{
  order: any
}>()

const loading = ref(false)
const error = ref('')

async function createPayment() {
  loading.value = true
  error.value = ''

  try {
    const result = await apiCreatePaymentRoute.run(ctx, {
      orderId: props.order.id
    })

    if (result.success) {
      // Редирект на страницу оплаты
      window.location.href = result.paymentLink
    } else {
      error.value = result.error
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function formatPrice(money: any) {
  return new Money(money.amount, money.currency).format(ctx)
}
</script>

<style scoped>
.checkout {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.order-summary {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.total {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #ddd;
  font-size: 1.2rem;
  font-weight: bold;
}

.pay-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.pay-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.error {
  margin-top: 1rem;
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #dc2626;
  border-radius: 4px;
  color: #dc2626;
}
</style>
```

### Оплата подписки

Создание подписки с первым платежом.

```typescript
// api/subscriptions.ts
import { runAttemptPayment } from '@pay/sdk'
import { Money } from '@app/heap'
import SubscriptionsTable from '../tables/subscriptions.table'

// @shared-route
export const apiCreateSubscriptionRoute = app.post('/create-subscription', async (ctx, req) => {
  const { planId, planName, monthlyPrice, currency } = req.body

  // Создаём подписку
  const subscription = await SubscriptionsTable.create(ctx, {
    userId: ctx.user.id,
    planId,
    planName,
    monthlyPrice: new Money(monthlyPrice, currency),
    status: 'pending',
    customerFirstName: ctx.user.firstName,
    customerLastName: ctx.user.lastName,
    customerEmail: ctx.user.confirmedEmail,
    customerPhone: ctx.user.confirmedPhone,
    createdAt: new Date()
  })

  // Создаём первый платёж
  const response = await runAttemptPayment(ctx, {
    subject: subscription,
    amount: [monthlyPrice, currency],
    description: `Подписка "${planName}" - первый платёж`,

    user: ctx.user,
    session: ctx.session,

    customer: {
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
      email: ctx.user.confirmedEmail,
      phone: ctx.user.confirmedPhone
    },

    items: [
      {
        id: planId,
        name: planName,
        quantity: 1,
        price: monthlyPrice
      }
    ],

    payload: {
      subscriptionId: subscription.id,
      planName,
      isFirstPayment: true
    },

    successUrl: subscriptionSuccessRoute({ id: subscription.id }).url(),
    cancelUrl: subscriptionCancelRoute({ id: subscription.id }).url(),

    successCallbackRoute: subscriptionPaymentSuccessCallback
  })

  if (response.success) {
    return {
      success: true,
      subscriptionId: subscription.id,
      paymentLink: response.result.paymentLink
    }
  } else {
    return {
      success: false,
      error: response.error
    }
  }
})

// Callback после успешной оплаты
const subscriptionPaymentSuccessCallback = app.function(
  '/subscription-payment-success',
  async (ctx, params, callerInfo) => {
    validateCaller(callerInfo)

    const { attempt, payment, savedCardId } = params
    const subscriptionId = attempt.subject[1]

    // Активируем подписку
    const nextBillingDate = new Date()
    nextBillingDate.setDate(nextBillingDate.getDate() + 30)

    await SubscriptionsTable.update(ctx, {
      id: subscriptionId,
      status: 'active',
      savedCardId, // Сохраняем ID карты
      lastPaymentDate: new Date(),
      nextBillingDate
    })

    // Планируем следующее списание через 30 дней
    const subscription = await SubscriptionsTable.findById(ctx, subscriptionId)

    processSubscriptionPaymentJob.scheduleJobAt(ctx, nextBillingDate, {
      subscriptionId: subscription.id,
      userId: subscription.userId
    })

    ctx.account.log('Подписка активирована', {
      level: 'info',
      json: {
        subscriptionId,
        nextBillingDate,
        savedCardId
      }
    })

    return { success: true }
  }
)
```

### Автосписание подписки

Job уже описан выше в разделе "Автосписание по расписанию".

---

## Лучшие практики

### Обязательные поля

✅ **Всегда передавайте customer.email и items**:

```typescript
const response = await runAttemptPayment(ctx, {
  customer: {
    email: 'user@example.com' // ОБЯЗАТЕЛЬНО для чека!
  },
  items: [
    // ОБЯЗАТЕЛЬНО для чека!
    { id: '1', name: 'Товар', quantity: 1, price: 100 }
  ]
})
```

### Проверка userId для автосписания

✅ **userId должен быть владельцем карты**:

```typescript
const response = await attemptAutoCharge(ctx, {
  userId: subscription.userId, // НЕ ctx.user.id!
  savedCardId: subscription.savedCardId
})
```

### Логирование

✅ **Логируйте все платёжные операции**:

```typescript
ctx.account.log('Платёж создан', {
  level: 'info',
  json: {
    orderId,
    amount,
    paymentLink: response.result.paymentLink
  }
})
```

### Обработка ошибок

✅ **Всегда проверяйте response.success**:

```typescript
if (response.success) {
  // Успех
} else {
  ctx.account.log('Ошибка платежа', {
    level: 'error',
    json: { error: response.error }
  })
  return { success: false, error: response.error }
}
```

### Безопасность

✅ **Всегда используйте validateCaller в callback**:

```typescript
import { validateCaller } from '@pay/sdk'

const callback = app.function('/callback', async (ctx, params, callerInfo) => {
  validateCaller(callerInfo) // Проверка что вызов от платёжной системы

  // Обработка
})
```

### Уведомления

✅ **Уведомляйте пользователя о статусе**:

```typescript
if (response.success) {
  await sendMessageToUser(ctx, userId, {
    text: 'Платёж успешно обработан!'
  })
} else {
  await sendMessageToUser(ctx, userId, {
    text: `Ошибка оплаты: ${response.error}`
  })
}
```

---

## Связанные документы

- **008-heap.md** — Таблицы для заказов и подписок
- **005-jobs.md** — Планирование автосписаний
- **016-analytics.md** — Запись событий платежей
- **001-standards.md** — Стандарты кодирования

---

**Версия**: 1.0  
**Дата**: 2025-11-03  
**Последнее обновление**: Создание инструкции по платежам

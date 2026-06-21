---
name: chatium-payments
description: Реализует платежи в Chatium через @pay/sdk — runAttemptPayment, attemptAutoCharge, getSavedCards, validateCaller, джобы для автосписания. Использовать при добавлении оплаты, подписок или автосписания.
---

## Основные методы (@pay/sdk)

- **runAttemptPayment(ctx, params)** — разовый платёж с редиректом на платёжную страницу
- **attemptAutoCharge(ctx, params)** — автосписание/оплата в один клик с сохранённой карты
- **getSavedCards(ctx, { userId?, providerId? })** — сохранённые карты (параметр — объект, не строка)
- **findPaymentProviders(ctx)** — список провайдеров
- **validateCaller(callerInfo)** — проверка caller в payment callback (обязательно!)

## Разовый платёж

```ts
import { runAttemptPayment } from '@pay/sdk'

// @shared-route
export const apiCreatePaymentRoute = app.post('/create-payment', async (ctx, req) => {
  const { orderId } = req.body
  const order = await OrdersTable.findById(ctx, orderId)

  const response = await runAttemptPayment(ctx, {
    subject: order,                                       // Запись из Heap таблицы
    amount: [order.total.amount, order.total.currency],   // [число, 'RUB'|'USD'|...]
    description: `Оплата заказа #${order.id}`,

    user: ctx.user,
    session: ctx.session,

    customer: {
      firstName: order.customerFirstName,
      lastName: order.customerLastName,
      email: order.customerEmail,                         // ОБЯЗАТЕЛЬНО для чека!
      phone: order.customerPhone
    },

    items: order.items.map((item) => ({                   // ОБЯЗАТЕЛЬНО для чека!
      id: item.productId,
      name: item.productName,
      quantity: item.quantity,
      price: item.price                                   // Цена за единицу
    })),

    successUrl: successPageRoute.url(),
    cancelUrl: cartPageRoute.url(),

    successCallbackRoute: paymentSuccessCallback
  })

  if (response.success) {
    return { success: true, paymentLink: response.result.paymentLink }
  } else {
    ctx.account.log('Ошибка создания платежа', { level: 'error', json: { orderId, error: response.error } })
    return { success: false, error: response.error }
  }
})
```

## Payment callback (successCallbackRoute)

```ts
import { validateCaller } from '@pay/sdk'

const paymentSuccessCallback = app.function('/payment-success', async (ctx, params, callerInfo) => {
  validateCaller(callerInfo)  // ОБЯЗАТЕЛЬНО! Проверка что вызов от платёжной системы

  const { attempt, payment, savedCardId } = params
  const orderId = attempt.subject[1]  // ['table_name', 'record_id']

  await OrdersTable.update(ctx, {
    id: orderId,
    status: 'paid',
    paymentId: payment.id,
    paidAt: new Date()
  })

  ctx.account.log('Платёж успешен', { level: 'info', json: { orderId, paymentId: payment.id } })
  return { success: true }
})
```

**Структура params в callback:**
```ts
interface PaymentCallbackParams {
  attempt: {
    id: string
    subject: [string, string]  // ['table_name', 'record_id']
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
  savedCardId?: string  // Если карта была сохранена
}
```

## Сохранённые карты

```ts
import { getSavedCards } from '@pay/sdk'

// Карты текущего пользователя (параметр — объект, не строка userId!)
const result = await getSavedCards(ctx, {})

// Карты конкретного пользователя
const result2 = await getSavedCards(ctx, { userId: 'user_id' })

// Карты для конкретного провайдера
const result3 = await getSavedCards(ctx, { providerId: 'provider_id' })

if (result.success) {
  result.cards.forEach((card) => {
    // card.id, card.cardMask ("**** **** **** 1234"), card.cardType ("Visa"), card.provider.title
  })
}

// Проверка принадлежности карты перед оплатой:
const savedCardsResult = await getSavedCards(ctx, { userId })
const card = savedCardsResult.cards?.find((c) => c.id === savedCardId)
if (!card) return { success: false, error: 'Карта не найдена или не принадлежит пользователю' }
```

## Оплата в один клик (сохранённой картой)

```ts
import { attemptAutoCharge } from '@pay/sdk'

// @shared-route
export const apiQuickPaymentRoute = app.post('/quick-payment', async (ctx, req) => {
  const { orderId, savedCardId } = req.body
  const order = await OrdersTable.findById(ctx, orderId)

  const response = await attemptAutoCharge(ctx, {
    subject: order,
    amount: [order.total.amount, order.total.currency],
    description: `Оплата заказа #${order.id}`,

    userId: ctx.user.id,   // ОБЯЗАТЕЛЬНО: ID владельца карты
    savedCardId,            // Конкретная карта для оплаты в один клик

    customer: { firstName: ctx.user.firstName, email: ctx.user.confirmedEmail },
    items: [ ... ],
    payload: { orderId: order.id },

    initedBy: 'user',       // Инициатор — пользователь
    bySchedule: false       // НЕ по расписанию
  })

  if (response.success) {
    return { success: true, message: response.message }
  }
  return { success: false, error: response.error }
})
```

## Автосписание (рекуррентные платежи)

```ts
import { attemptAutoCharge } from '@pay/sdk'

// Job для автосписания
const processSubscriptionPaymentJob = app.job('/process-subscription', async (ctx, params) => {
  const { subscriptionId, userId } = params
  const subscription = await SubscriptionsTable.findById(ctx, subscriptionId)

  if (!subscription || subscription.status !== 'active') {
    ctx.account.log('Подписка не активна', { level: 'warn', json: { subscriptionId } })
    return { success: false, error: 'Subscription is not active' }
  }

  const response = await attemptAutoCharge(ctx, {
    subject: subscription,
    amount: [subscription.monthlyPrice.amount, subscription.monthlyPrice.currency],
    description: `Ежемесячная подписка ${subscription.planName}`,

    userId,               // ID владельца карты — передаётся из params, не ctx.user.id
    // savedCardId не указываем — будет использована первая карта пользователя

    customer: {
      firstName: subscription.customerFirstName,
      lastName: subscription.customerLastName,
      email: subscription.customerEmail,
      phone: subscription.customerPhone
    },
    items: [{ id: subscription.planId, name: subscription.planName, quantity: 1, price: subscription.monthlyPrice.amount }],
    payload: { subscriptionId: subscription.id, isRecurring: true },

    initedBy: 'system',   // Инициатор — система
    bySchedule: true      // Автосписание по расписанию
  })

  if (response.success) {
    const nextBillingDate = new Date()
    nextBillingDate.setDate(nextBillingDate.getDate() + 30)

    await SubscriptionsTable.update(ctx, { id: subscription.id, nextBillingDate, status: 'active' })

    // Планируем следующее списание через scheduleJobAt на экземпляре джоба
    await processSubscriptionPaymentJob.scheduleJobAt(ctx, nextBillingDate, { subscriptionId, userId })

    ctx.account.log('Автосписание успешно', { level: 'info', json: { subscriptionId, nextBillingDate } })
    return { success: true }
  } else {
    await SubscriptionsTable.update(ctx, {
      id: subscription.id,
      status: 'payment_failed',
      lastError: response.error,
      failedAt: new Date()
    })
    ctx.account.log('Автосписание не удалось', { level: 'error', json: { subscriptionId, error: response.error } })
    return { success: false, error: response.error }
  }
})
```

## Планирование джобов (005-jobs.md)

Методы планирования — методы на экземпляре джоба, **не** глобальные функции. Все возвращают `Promise<number>` — обязателен `await`:

```ts
// ✅ ПРАВИЛЬНО — методы экземпляра с await
const taskId = await myJob.scheduleJobAfter(ctx, 30, 'days', params)           // через N единиц времени
const taskId = await myJob.scheduleJobAt(ctx, new Date('2026-01-31'), params)  // в конкретную дату
const taskId = await myJob.scheduleJobAsap(ctx, params)                        // асинхронно, без задержки

// ❌ НЕПРАВИЛЬНО — без await (taskId будет Promise, а не число)
const taskId = myJob.scheduleJobAfter(ctx, 30, 'days', params)

// ❌ НЕПРАВИЛЬНО — устаревший глобальный вариант из @app/jobs (deprecated)
scheduleJobAfter(ctx, autoChargeJob, { days: 30 }, { userId })
```

Единицы времени для `scheduleJobAfter`: `'milliseconds'`, `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'months'`, `'quarters'`, `'years'`

**Сохранение и отмена taskId:**
```ts
import { cancelScheduledJob } from '@app/jobs'

// Сохранение — taskId number → строка для Heap
await TasksTable.create(ctx, { taskId: String(taskId) })

// Отмена — строка → число
const taskIdNumber = parseInt(taskIdString, 10)
await cancelScheduledJob(ctx, taskIdNumber)  // ожидает number
```

## Чеклист

- [ ] `runAttemptPayment` — передать `customer.email` и `items` (обязательно для чека)
- [ ] `attemptAutoCharge` — `userId` должен быть владельцем карты (в джобе берётся из params, не из `ctx.user.id`)
- [ ] Callback — `validateCaller(callerInfo)` первой строкой, импорт из `@pay/sdk`
- [ ] Джобы — `await` перед `scheduleJob*`, иначе `taskId` будет Promise вместо числа
- [ ] Отмена джобов — `cancelScheduledJob` из `@app/jobs`, принимает `number` (конвертировать через `parseInt`)
- [ ] `getSavedCards(ctx, { userId? })` — второй аргумент объект, не строка
- [ ] Обработка `response.success === false` с логированием через `ctx.account.log`
- [ ] При `bySchedule: true` → `initedBy: 'system'`; при оплате пользователем → `initedBy: 'user'`

## Ссылки на документацию

- **017-payments.md** — полный гайд по платежам, параметры, callback, провайдеры, обработка ошибок
- **005-jobs.md** — джобы для автосписания, `scheduleJobAfter/At/Asap`, отмена, частые ошибки

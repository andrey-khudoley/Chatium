---
name: chatium-analytics-workspace
description: События workspace в Chatium — writeWorkspaceEvent, регистрация типов, хук @start/after-event-write, UTM. Использовать для записи конверсионных и пользовательских событий.
---

# chatium-analytics-workspace

Запись событий приложения для аналитики: `writeWorkspaceEvent(ctx, eventName, eventData)`. События попадают в ClickHouse; хук `@start/after-event-write` позволяет обработать запись (например, создать запись в Heap).

## Когда использовать

- Регистрация пользователя, отправка формы, заявка, покупка
- Конверсионные и важные действия пользователя
- Отслеживание с UTM-метками (uid, clrtUid, clrtTrack на клиенте)

## Запись события

```ts
import { writeWorkspaceEvent } from '@start/sdk'

await writeWorkspaceEvent(ctx, 'registration', {
  user: { email, firstName, lastName },
  action_param1: user.id,
  uid: req.body.clrtUid
})
```

- **eventName** — строка (camelCase), тип события.
- **eventData** — объект с данными (user, uid, action_param1 и др. по контракту).

## Регистрация типов событий

```typescript
import { getWorkspaceEventUrl } from '@start/sdk'

app.accountHook('@start/agent/events', async (ctx, params) => {
  return [
    {
      name: 'Регистрация пользователя',
      url: await getWorkspaceEventUrl(ctx, 'registration')
    },
    {
      name: 'Заполнение формы с ответами',
      url: await getWorkspaceEventUrl(ctx, 'answersFilled')
    }
  ]
})
```

- **getWorkspaceEventUrl** — регистрация типов событий для workspace (по документации платформы).

## Хук после записи

```typescript
import { UsersTable } from '../tables/users.table'

app.accountHook('@start/after-event-write', async (ctx, eventData) => {
  const { eventName, data } = eventData

  if (eventName === 'registration') {
    const existing = await UsersTable.findOneBy(ctx, {
      email: data.user?.email
    })

    if (!existing) {
      await UsersTable.create(ctx, {
        email: data.user?.email,
        firstName: data.user?.firstName,
        lastName: data.user?.lastName,
        phone: data.user?.phone,
        registrationDate: new Date(),
        utmSource: data.utm_source,
        utmCampaign: data.utm_campaign
      })
    }
  }
})
```

- **@start/after-event-write** — вызывается после записи события; можно дублировать в Heap или обрабатывать логику.

## Клиентские события

```vue
<template>
  <div>
    <button @click="trackButtonClick('cta-primary')">Главная кнопка</button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

// Отслеживание при монтировании
onMounted(() => {
  window.clrtTrack({
    url: 'event://custom/page-loaded',
    action: 'page-view',
    action_param1: window.location.pathname
  })
})

// Отслеживание кликов
function trackButtonClick(buttonName) {
  window.clrtTrack({
    url: 'event://custom/button-click',
    action: 'click',
    action_param1: buttonName,
    action_param2: window.location.pathname
  })
}
</script>
```

- На клиенте: `window.clrtTrack`, `window.clrtUid` для передачи uid и трекинга (см. 016-analytics-workspace.md).

## Чеклист

- [ ] Импорт writeWorkspaceEvent из @start/sdk
- [ ] Вызов writeWorkspaceEvent после конверсионного действия с осмысленным eventName и eventData
- [ ] При необходимости: хук @start/after-event-write для обработки
- [ ] UTM/uid в eventData при наличии на клиенте
- [ ] Именование событий в camelCase (registration, leadSubmitted, orderCreated)
- [ ] Регистрация типов событий через getWorkspaceEventUrl и @start/agent/events

## Структура события (полная)

```typescript
interface WorkspaceEventData {
  // Пользовательские данные
  user?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
  }

  // Основные параметры (до 3 строковых)
  action_param1?: string
  action_param2?: string
  action_param3?: string

  // Целочисленные параметры (до 3)
  action_param1_int?: number
  action_param2_int?: number
  action_param3_int?: number

  // Параметры с плавающей точкой (до 3)
  action_param1_float?: number
  action_param2_float?: number
  action_param3_float?: number

  // Словарь строка-строка
  action_param1_mapstrstr?: Record<string, string>

  // Общий объект параметров (любые данные)
  action_params?: Record<string, any>

  // ID сессии браузера
  uid?: string // window.clrtUid

  // UTM метки
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}
```

## Примеры использования

### Регистрация пользователя

```typescript
import { writeWorkspaceEvent } from '@start/sdk'

export const apiRegisterRoute = app.post('/register', async (ctx, req) => {
  const { email, firstName, lastName, clrtUid, utmSource, utmMedium, utmCampaign } = req.body

  const user = await createRealUser(ctx, {
    firstName,
    lastName,
    unconfirmedIdentities: {
      Email: normalizeIdentityKey('Email', email),
      Phone: normalizeIdentityKey('Phone', email)
    }
  })

  await writeWorkspaceEvent(ctx, 'registration', {
    user: { email, firstName, lastName },
    action_param1: user.id,
    uid: clrtUid,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign
  })

  return { success: true, userId: user.id }
})
```

### Заполнение формы

```typescript
import { writeWorkspaceEvent } from '@start/sdk'

export const apiSubmitFormRoute = app.post('/submit-form', async (ctx, req) => {
  const { answers, formId, clrtUid, utmSource } = req.body

  const formResponse = await FormResponsesTable.create(ctx, {
    formId,
    answers,
    userId: ctx.user?.id,
    createdAt: new Date()
  })

  await writeWorkspaceEvent(ctx, 'answersFilled', {
    action_param1: formResponse.id,
    action_param2: formId,
    action_param1_int: Object.keys(answers).length,
    action_params: answers,
    uid: clrtUid,
    utm_source: utmSource
  })

  return { success: true, formResponseId: formResponse.id }
})
```

### Отправка заявки

```typescript
import { writeWorkspaceEvent } from '@start/sdk'

export const apiSubmitLeadRoute = app.post('/submit-lead', async (ctx, req) => {
  const { name, email, phone, message, clrtUid } = req.body

  const lead = await LeadsTable.create(ctx, {
    name,
    email,
    phone,
    message,
    createdAt: new Date()
  })

  await writeWorkspaceEvent(ctx, 'leadSubmitted', {
    user: { email, phone, firstName: name },
    action_param1: lead.id,
    action_param2: email,
    action_param3: phone,
    uid: clrtUid,
    utm_source: req.body.utmSource,
    utm_campaign: req.body.utmCampaign
  })

  return { success: true, leadId: lead.id }
})
```

### Создание и оплата заказа

```typescript
import { writeWorkspaceEvent } from '@start/sdk'
import { Money } from '@app/heap'

export const apiCreateOrderRoute = app.post('/create-order', async (ctx, req) => {
  const { items, total, currency, clrtUid } = req.body

  const order = await OrdersTable.create(ctx, {
    userId: ctx.user.id,
    items,
    total: new Money(total, currency),
    status: 'new',
    createdAt: new Date()
  })

  await writeWorkspaceEvent(ctx, 'orderCreated', {
    user: {
      email: ctx.user.confirmedEmail,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName
    },
    action_param1: order.id,
    action_param1_int: items.length,
    action_param1_float: total,
    action_param2: currency,
    uid: clrtUid,
    utm_source: req.body.utmSource,
    utm_campaign: req.body.utmCampaign
  })

  return { success: true, orderId: order.id }
})

export const paymentSuccessCallback = app.function('/payment-success', async (ctx, params) => {
  const { attempt, payment } = params
  const orderId = attempt.subject[1]

  await writeWorkspaceEvent(ctx, 'orderPaid', {
    action_param1: orderId,
    action_param2: payment.id,
    action_param1_float: payment.amount,
    action_param2_float: payment.fee || 0,
    action_param3: payment.currency
  })

  return { success: true }
})
```

## Лучшие практики

### Обязательная запись ключевых событий

- `registration` — Регистрация
- `answersFilled` — Заполнение формы
- `leadSubmitted` — Отправка заявки
- `orderCreated` — Создание заказа
- `orderPaid` — Оплата заказа
- `subscriptionCreated` — Создание подписки
- `subscriptionCancelled` — Отмена подписки

### Именование событий

✅ **Правильно (camelCase)**:

```typescript
'registration'
'leadSubmitted'
'orderCreated'
'formFilled'
```

❌ **Неправильно**:

```typescript
'Registration' // PascalCase
'lead_submitted' // snake_case
'order-created' // kebab-case
```

### Всегда передавайте UTM метки

```typescript
await writeWorkspaceEvent(ctx, 'registration', {
  user: { email },
  uid: clrtUid,
  utm_source: req.body.utm_source,
  utm_medium: req.body.utm_medium,
  utm_campaign: req.body.utm_campaign,
  utm_term: req.body.utm_term,
  utm_content: req.body.utm_content
})
```

### Передавайте UID сессии

```vue
<script setup>
async function submitForm() {
  await apiSubmitFormRoute.run(ctx, {
    answers: formData.value,
    clrtUid: window.clrtUid // UID сессии браузера
  })
}
</script>
```

### Используйте action_params для сложных данных

```typescript
await writeWorkspaceEvent(ctx, 'answersFilled', {
  action_param1: formId,
  action_param1_int: Object.keys(answers).length,
  action_params: {
    age: '24',
    city: 'Moscow',
    interests: ['coding', 'music']
  },
  uid: clrtUid
})
```

### Обрабатывайте ошибки корректно

```typescript
try {
  await writeWorkspaceEvent(ctx, eventName, eventData)
} catch (error: any) {
  ctx.account.log('Failed to write event', {
    level: 'error',
    json: {
      event: eventName,
      error: error.message
    }
  })
  // НЕ бросаем ошибку дальше - событие не критично для основной логики
}
```

### Логируйте важные события

```typescript
await writeWorkspaceEvent(ctx, 'registration', { ... })

ctx.account.log('Registration event written', {
  level: 'info',
  json: {
    event: 'registration',
    userId: user.id,
    email: user.email
  }
})
```

## Ссылки на документацию

- **016-analytics-workspace.md** — запись событий, структура, пагинация, лучшие практики
- **016-analytics-traffic.md** — события трафика (просмотры, клики, видео)
- **016-analytics-getcourse.md** — события GetCourse и ClickHouse запросы
- **016-analytics-subscriptions.md** — система подписок на события
- **025-app-modules.md** — справочник модулей @app

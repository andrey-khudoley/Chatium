# Аналитика и события workspace в Chatium

Исчерпывающее руководство по записи и отслеживанию событий в workspace Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Запись событий](#запись-событий)
  - [writeWorkspaceEvent](#writeworkspaceevent)
  - [Структура события](#структура-события)
- [Регистрация типов событий](#регистрация-типов-событий)
- [Клиентские события](#клиентские-события)
- [Практические примеры](#практические-примеры)
  - [Регистрация пользователя](#регистрация-пользователя)
  - [Заполнение формы](#заполнение-формы)
  - [Отправка заявки](#отправка-заявки)
  - [Покупка товара](#покупка-товара)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**Workspace Analytics** — система записи и анализа событий в вашем workspace для отслеживания действий пользователей.

### Ключевые возможности

- Запись серверных событий
- Запись клиентских событий
- Сохранение UTM меток
- Передача произвольных параметров
- Регистрация типов событий

### Когда использовать

- ✅ Регистрация пользователя
- ✅ Заполнение формы
- ✅ Отправка заявки
- ✅ Покупка товара
- ✅ Важные действия пользователя
- ✅ Конверсионные события

---

## Запись событий

### writeWorkspaceEvent

Основная функция записи событий.

```typescript
import { writeWorkspaceEvent } from '@start/sdk'

await writeWorkspaceEvent(ctx, eventName, eventData)
```

**Параметры**:

- `ctx` — контекст приложения
- `eventName` — название события (строка)
- `eventData` — объект с данными события

### Структура события

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

  // Числовые параметры (до 3 целых)
  action_param1_int?: number
  action_param2_int?: number
  action_param3_int?: number

  // Параметры map (словарь строка-строка)
  action_param1_mapstrstr?: Record<string, string>

  // Общий объект параметров
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

---

## Регистрация типов событий

Для отображения событий в интерфейсе зарегистрируйте их типы.

```typescript
import { getWorkspaceEventUrl } from '@start/sdk'

app.accountHook('@start/agent/events', async (ctx, params) => {
  return [
    {
      name: 'Регистрация на вебинар',
      url: await getWorkspaceEventUrl(ctx, 'registration')
    },
    {
      name: 'Заполнена форма с вопросами',
      url: await getWorkspaceEventUrl(ctx, 'answersFilled')
    },
    {
      name: 'Отправлена заявка',
      url: await getWorkspaceEventUrl(ctx, 'leadSubmitted')
    },
    {
      name: 'Создан заказ',
      url: await getWorkspaceEventUrl(ctx, 'orderCreated')
    },
    {
      name: 'Оплачен заказ',
      url: await getWorkspaceEventUrl(ctx, 'orderPaid')
    }
  ]
})
```

**Важно**: Название события в хуке должно совпадать с eventName в writeWorkspaceEvent!

---

## Клиентские события

События можно записывать прямо из браузера.

```vue
<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Записать клиентское событие
  window.clrtTrack({
    url: 'event://custom/{workspace_path}',
    action: 'scrolled-to-block',
    action_param1: 'hero-block'
  })
})

function handleButtonClick() {
  window.clrtTrack({
    url: 'event://custom/{workspace_path}',
    action: 'button-clicked',
    action_param1: 'cta-button',
    action_param2: window.location.pathname
  })
}
</script>

<template>
  <button @click="handleButtonClick">Нажми меня</button>
</template>
```

**Параметры window.clrtTrack**:

- `url` — URL события (обязательно)
- `action` — название действия
- `action_param1`, `action_param2`, `action_param3` — параметры

---

## Практические примеры

### Регистрация пользователя

```typescript
// api/auth.ts
import { writeWorkspaceEvent } from '@start/sdk'

// @shared-route
export const apiRegisterRoute = app.post('/register', async (ctx, req) => {
  const { email, phone, firstName, lastName, utmSource, utmMedium, utmCampaign } = req.body

  // Создаём пользователя
  const user = await createRealUser(ctx, {
    firstName,
    lastName,
    unconfirmedIdentities: {
      Email: normalizeIdentityKey('Email', email),
      Phone: normalizeIdentityKey('Phone', phone)
    }
  })

  // ⚠️ ВАЖНО: Записываем событие регистрации
  await writeWorkspaceEvent(ctx, 'registration', {
    user: {
      email,
      phone,
      firstName,
      lastName
    },
    action_param1: user.id, // ID пользователя
    uid: req.body.clrtUid, // ID сессии браузера
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_term: req.body.utmTerm,
    utm_content: req.body.utmContent
  })

  ctx.account.log('Пользователь зарегистрирован', {
    level: 'info',
    json: { userId: user.id, email }
  })

  return { success: true, userId: user.id }
})
```

### Заполнение формы

```typescript
// api/forms.ts
import { writeWorkspaceEvent } from '@start/sdk'

// @shared-route
export const apiSubmitFormRoute = app.post('/submit-form', async (ctx, req) => {
  const { answers, clrtUid, utmSource } = req.body

  // Сохраняем ответы
  const formResponse = await FormResponses.create(ctx, {
    answers,
    userId: ctx.user?.id,
    createdAt: new Date()
  })

  // ⚠️ ВАЖНО: Записываем событие заполнения формы
  await writeWorkspaceEvent(ctx, 'answersFilled', {
    action_params: answers, // Все ответы как объект
    action_param1: formResponse.id, // ID ответа
    action_param1_int: Object.keys(answers).length, // Количество вопросов
    uid: clrtUid,
    utm_source: utmSource,
    utm_medium: req.body.utmMedium,
    utm_campaign: req.body.utmCampaign
  })

  return { success: true, formResponseId: formResponse.id }
})
```

### Отправка заявки

```typescript
// api/leads.ts
import { writeWorkspaceEvent } from '@start/sdk'

// @shared-route
export const apiSubmitLeadRoute = app.post('/submit-lead', async (ctx, req) => {
  const { name, email, phone, message, clrtUid } = req.body

  // Сохраняем заявку
  const lead = await LeadsTable.create(ctx, {
    name,
    email,
    phone,
    message,
    createdAt: new Date()
  })

  // ⚠️ ВАЖНО: Записываем событие отправки заявки
  await writeWorkspaceEvent(ctx, 'leadSubmitted', {
    user: {
      email,
      phone,
      firstName: name
    },
    action_param1: lead.id, // ID заявки
    action_param2: email,
    action_param3: phone,
    uid: clrtUid,
    utm_source: req.body.utmSource,
    utm_medium: req.body.utmMedium,
    utm_campaign: req.body.utmCampaign,
    utm_term: req.body.utmTerm,
    utm_content: req.body.utmContent
  })

  ctx.account.log('Заявка создана', {
    level: 'info',
    json: { leadId: lead.id, email }
  })

  return { success: true, leadId: lead.id }
})
```

### Покупка товара

```typescript
// api/orders.ts
import { writeWorkspaceEvent } from '@start/sdk'
import { Money } from '@app/heap'

// @shared-route
export const apiCreateOrderRoute = app.post('/create-order', async (ctx, req) => {
  const { items, total, currency, clrtUid } = req.body

  // Создаём заказ
  const order = await OrdersTable.create(ctx, {
    userId: ctx.user.id,
    items,
    total: new Money(total, currency),
    status: 'new',
    createdAt: new Date()
  })

  // ⚠️ ВАЖНО: Записываем событие создания заказа
  await writeWorkspaceEvent(ctx, 'orderCreated', {
    user: {
      email: ctx.user.confirmedEmail,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName
    },
    action_param1: order.id, // ID заказа
    action_param1_int: items.length, // Количество товаров
    action_param1_float: total, // Сумма заказа
    action_param2: currency,
    uid: clrtUid,
    utm_source: req.body.utmSource,
    utm_medium: req.body.utmMedium,
    utm_campaign: req.body.utmCampaign
  })

  return { success: true, orderId: order.id }
})

// После успешной оплаты
export const paymentSuccessCallback = app.function(
  '/payment-success',
  async (ctx, params, caller) => {
    const { attempt, payment } = params
    const orderId = attempt.subject[1]

    // ⚠️ ВАЖНО: Записываем событие оплаты
    await writeWorkspaceEvent(ctx, 'orderPaid', {
      action_param1: orderId,
      action_param2: payment.id,
      action_param1_float: payment.amount,
      action_param2_float: payment.fee || 0,
      action_param3: payment.currency
    })

    return { success: true }
  }
)
```

---

## Лучшие практики

### Обязательная запись событий

✅ **Записывайте события для ключевых действий**:

- Регистрация → `registration`
- Заполнение формы → `answersFilled`
- Отправка заявки → `leadSubmitted`
- Создание заказа → `orderCreated`
- Оплата заказа → `orderPaid`
- Подписка → `subscriptionCreated`
- Отмена подписки → `subscriptionCancelled`

### Именование событий

✅ **Используйте camelCase**:

```typescript
// Правильно
'registration'
'leadSubmitted'
'orderCreated'
'formFilled'

// Неправильно
'Registration'
'lead_submitted'
'order-created'
'FormFilled'
```

### Передача UTM меток

✅ **Всегда передавайте UTM если есть**:

```typescript
await writeWorkspaceEvent(ctx, 'registration', {
  user: { email, phone },
  utm_source: req.query.utm_source,
  utm_medium: req.query.utm_medium,
  utm_campaign: req.query.utm_campaign,
  utm_term: req.query.utm_term,
  utm_content: req.query.utm_content
})
```

### Передача UID

✅ **Передавайте window.clrtUid**:

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

### Структурированные параметры

✅ **Используйте action_params для сложных данных**:

```typescript
await writeWorkspaceEvent(ctx, 'answersFilled', {
  action_params: {
    age: '24',
    city: 'Moscow',
    aboutMe: 'Software engineer',
    interests: ['coding', 'music']
  },
  action_param1_int: 4, // Количество вопросов
  uid: clrtUid
})
```

### Логирование

✅ **Логируйте важные события**:

```typescript
await writeWorkspaceEvent(ctx, 'registration', { ... })

ctx.account.log('Событие записано', {
  level: 'info',
  json: {
    event: 'registration',
    userId: user.id
  }
})
```

### Обработка ошибок

✅ **Не ломайте основную логику**:

```typescript
try {
  await writeWorkspaceEvent(ctx, eventName, eventData)
} catch (error: any) {
  ctx.account.log('Ошибка записи события', {
    level: 'error',
    json: {
      event: eventName,
      error: error.message
    }
  })
  // НЕ бросаем ошибку дальше - событие не критично
}
```

### Числовые параметры

✅ **Используйте правильные типы**:

```typescript
await writeWorkspaceEvent(ctx, 'orderCreated', {
  action_param1: orderId, // String
  action_param1_int: itemsCount, // Int (целое число)
  action_param1_float: orderTotal, // Float (сумма)
  action_param2: currency
})
```

### Клиентские события

✅ **Отслеживайте взаимодействия**:

```vue
<script setup>
import { ref, onMounted, watch } from 'vue'

const scrollDepth = ref(0)

onMounted(() => {
  // Отслеживание прокрутки
  window.addEventListener('scroll', () => {
    const currentDepth = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    )

    if (currentDepth > scrollDepth.value) {
      scrollDepth.value = currentDepth

      if (currentDepth >= 25 && currentDepth < 50) {
        window.clrtTrack({
          url: 'event://custom/{workspace_path}',
          action: 'scroll-depth',
          action_param1: '25%'
        })
      }
    }
  })
})

function trackButtonClick(buttonName: string) {
  window.clrtTrack({
    url: 'event://custom/{workspace_path}',
    action: 'button-clicked',
    action_param1: buttonName,
    action_param2: window.location.pathname
  })
}
</script>

<template>
  <button @click="trackButtonClick('cta-primary')">Главная кнопка</button>

  <button @click="trackButtonClick('cta-secondary')">Вторичная кнопка</button>
</template>
```

---

## Связанные документы

- **016-analytics-workspace.md** — Актуальная версия документации по workspace событиям
- **016-analytics-getcourse.md** — GetCourse аналитика (gcQueryAi vs queryAi)
- **016-analytics-traffic.md** — События трафика
- **E01-gc-sdk.md** — GetCourse SDK (настройка MCP Client)
- **E02-gc-analytics.md** — GetCourse аналитика (ClickHouse)
- **015-notifications.md** — Уведомления администраторов
- **002-routing.md** — API роуты для записи событий
- **001-standards.md** — Стандарты кодирования

---

**Версия**: 1.1  
**Дата создания**: 2025-11-03  
**Последнее обновление**: 2025-11-09  
**Статус**: Legacy документация, используйте 016-analytics-workspace.md

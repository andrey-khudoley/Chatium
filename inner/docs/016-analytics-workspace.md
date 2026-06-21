@chatium

# Аналитика Workspace - События приложения

Руководство по записи и отслеживанию событий вашего workspace в Chatium через `writeWorkspaceEvent`.

## Содержание

- [Основные концепции](#основные-концепции)
- [Запись событий writeWorkspaceEvent](#запись-событий-writeworkspaceevent)
- [Структура события](#структура-события)
- [Регистрация типов событий](#регистрация-типов-событий)
- [Клиентские события](#клиентские-события)
- [Хук @start/after-event-write](#хук-startafter-event-write)
- [Практические примеры](#практические-примеры)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**Workspace Events** — система записи событий вашего приложения для отслеживания действий пользователей.

### Когда использовать

- ✅ Регистрация пользователя
- ✅ Заполнение формы
- ✅ Отправка заявки
- ✅ Покупка товара
- ✅ Важные действия пользователя
- ✅ Конверсионные события

### Поток данных

```
Пользовательское действие
     ↓
writeWorkspaceEvent(ctx, 'eventName', data)
     ↓
ClickHouse (chatium_ai.access_log)
     ↓
Хук @start/after-event-write
     ↓
Ваша обработка (например, создание в Heap)
```

---

## Запись событий writeWorkspaceEvent

### Импорт и использование

```typescript
import { writeWorkspaceEvent } from '@start/sdk'

await writeWorkspaceEvent(ctx, eventName, eventData)
```

**Параметры**:

- `ctx` — контекст приложения
- `eventName` — название события (строка, camelCase)
- `eventData` — объект с данными события

### Базовый пример

```typescript
// api/registration.ts
import { writeWorkspaceEvent } from '@start/sdk'

export const apiRegisterRoute = app.post('/register', async (ctx, req) => {
  const { email, firstName, lastName } = req.body

  // Создаем пользователя
  const user = await createUser(ctx, { email, firstName, lastName })

  // ⚠️ Записываем событие регистрации
  await writeWorkspaceEvent(ctx, 'registration', {
    user: {
      email,
      firstName,
      lastName
    },
    action_param1: user.id,
    uid: req.body.clrtUid
  })

  return { success: true, userId: user.id }
})
```

---

## Структура события

### Полный интерфейс

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

### Примеры использования полей

```typescript
// Регистрация
await writeWorkspaceEvent(ctx, 'registration', {
  user: { email: 'user@example.com', firstName: 'Ivan' },
  action_param1: userId, // ID пользователя
  uid: clrtUid, // ID сессии
  utm_source: 'google',
  utm_campaign: 'winter_sale'
})

// Заполнение формы
await writeWorkspaceEvent(ctx, 'formSubmitted', {
  action_param1: formId, // ID формы
  action_param1_int: answersCount, // Количество ответов
  action_params: answers, // Все ответы как объект
  uid: clrtUid
})

// Создание заказа
await writeWorkspaceEvent(ctx, 'orderCreated', {
  user: { email: ctx.user.email },
  action_param1: orderId, // ID заказа
  action_param1_int: itemsCount, // Количество товаров
  action_param1_float: totalAmount, // Сумма заказа
  action_param2: currency, // Валюта
  uid: clrtUid
})

// Оплата заказа
await writeWorkspaceEvent(ctx, 'orderPaid', {
  action_param1: orderId, // ID заказа
  action_param2: paymentId, // ID платежа
  action_param1_float: amount, // Сумма платежа
  action_param2_float: fee, // Комиссия
  action_param3: currency
})
```

---

## Регистрация типов событий

Для отображения событий в AI агентах регистрируйте их типы через хук.

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
    },
    {
      name: 'Отправка заявки',
      url: await getWorkspaceEventUrl(ctx, 'leadSubmitted')
    },
    {
      name: 'Создание заказа',
      url: await getWorkspaceEventUrl(ctx, 'orderCreated')
    },
    {
      name: 'Оплата заказа',
      url: await getWorkspaceEventUrl(ctx, 'orderPaid')
    }
  ]
})
```

**⚠️ Важно**: Название в `getWorkspaceEventUrl()` должно совпадать с `eventName` в `writeWorkspaceEvent()`!

---

## Клиентские события

События можно записывать прямо из браузера через `window.clrtTrack`.

### Пример во Vue компоненте

```vue
<template>
  <div>
    <button @click="trackButtonClick('cta-primary')">Главная кнопка</button>

    <button @click="trackButtonClick('subscribe')">Подписаться</button>
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

// Отслеживание прокрутки
let scrollDepth = 0
window.addEventListener('scroll', () => {
  const depth = Math.round(
    (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
  )

  if (depth > scrollDepth && depth >= 50) {
    scrollDepth = depth
    window.clrtTrack({
      url: 'event://custom/scroll-depth',
      action: 'scroll',
      action_param1: `${depth}%`
    })
  }
})
</script>
```

### Параметры window.clrtTrack

```typescript
interface ClrtTrackParams {
  url: string // URL события (обязательно)
  action?: string // Название действия
  action_param1?: string // Параметр 1
  action_param2?: string // Параметр 2
  action_param3?: string // Параметр 3
}
```

---

## Хук @start/after-event-write

Автоматическая обработка событий после записи в ClickHouse.

### Регистрация хука

```typescript
// api/analytics.ts
import { UsersTable } from '../tables/users.table'

app.accountHook('@start/after-event-write', async (ctx, eventData) => {
  const { eventName, data } = eventData

  // Обработка регистрации
  if (eventName === 'registration') {
    await handleRegistration(ctx, data)
  }

  // Обработка заполнения формы
  if (eventName === 'answersFilled') {
    await handleFormSubmission(ctx, data)
  }

  // Обработка создания заказа
  if (eventName === 'orderCreated') {
    await handleOrderCreation(ctx, data)
  }
})

async function handleRegistration(ctx, data) {
  if (!data.user?.email) return

  // Создаем или обновляем пользователя в Heap
  const existing = await UsersTable.findOneBy(ctx, {
    email: data.user.email
  })

  if (!existing) {
    await UsersTable.create(ctx, {
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      phone: data.user.phone,
      registrationDate: new Date(),
      utmSource: data.utm_source,
      utmCampaign: data.utm_campaign
    })

    ctx.account.log('User created from registration event', {
      level: 'info',
      json: { email: data.user.email }
    })
  }
}
```

### Структура данных хука

```typescript
interface AfterEventWriteData {
  eventName: string // Название события
  data: {
    // Данные события
    user?: {
      email?: string
      phone?: string
      firstName?: string
      lastName?: string
    }
    action_param1?: string
    action_param2?: string
    // ... все остальные поля
  }
}
```

---

## Практические примеры

### 1. Регистрация пользователя

```typescript
// api/auth.ts
import { writeWorkspaceEvent } from '@start/sdk'

export const apiRegisterRoute = app.post('/register', async (ctx, req) => {
  const { email, phone, firstName, lastName, clrtUid, utmSource, utmMedium, utmCampaign } = req.body

  // Создаём пользователя
  const user = await createRealUser(ctx, {
    firstName,
    lastName,
    unconfirmedIdentities: {
      Email: normalizeIdentityKey('Email', email),
      Phone: normalizeIdentityKey('Phone', phone)
    }
  })

  // Записываем событие регистрации
  await writeWorkspaceEvent(ctx, 'registration', {
    user: {
      email,
      phone,
      firstName,
      lastName
    },
    action_param1: user.id, // ID пользователя
    uid: clrtUid, // ID сессии браузера
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_term: req.body.utmTerm,
    utm_content: req.body.utmContent
  })

  ctx.account.log('User registered', {
    level: 'info',
    json: { userId: user.id, email }
  })

  return { success: true, userId: user.id }
})
```

### 2. Заполнение формы

```typescript
// api/forms.ts
import { writeWorkspaceEvent } from '@start/sdk'

export const apiSubmitFormRoute = app.post('/submit-form', async (ctx, req) => {
  const { answers, formId, clrtUid, utmSource } = req.body

  // Сохраняем ответы
  const formResponse = await FormResponsesTable.create(ctx, {
    formId,
    answers,
    userId: ctx.user?.id,
    createdAt: new Date()
  })

  // Записываем событие
  await writeWorkspaceEvent(ctx, 'answersFilled', {
    action_param1: formResponse.id, // ID ответа
    action_param2: formId, // ID формы
    action_param1_int: Object.keys(answers).length, // Количество вопросов
    action_params: answers, // Все ответы
    uid: clrtUid,
    utm_source: utmSource,
    utm_medium: req.body.utmMedium,
    utm_campaign: req.body.utmCampaign
  })

  return { success: true, formResponseId: formResponse.id }
})
```

### 3. Отправка заявки

```typescript
// api/leads.ts
import { writeWorkspaceEvent } from '@start/sdk'

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

  // Записываем событие
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
    utm_campaign: req.body.utmCampaign
  })

  return { success: true, leadId: lead.id }
})
```

### 4. Создание и оплата заказа

```typescript
// api/orders.ts
import { writeWorkspaceEvent } from '@start/sdk'
import { Money } from '@app/heap'

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

  // Записываем событие создания
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
    utm_campaign: req.body.utmCampaign
  })

  return { success: true, orderId: order.id }
})

// Callback после успешной оплаты
export const paymentSuccessCallback = app.function('/payment-success', async (ctx, params) => {
  const { attempt, payment } = params
  const orderId = attempt.subject[1]

  // Записываем событие оплаты
  await writeWorkspaceEvent(ctx, 'orderPaid', {
    action_param1: orderId, // ID заказа
    action_param2: payment.id, // ID платежа
    action_param1_float: payment.amount, // Сумма
    action_param2_float: payment.fee || 0, // Комиссия
    action_param3: payment.currency
  })

  return { success: true }
})
```

---

## Лучшие практики

### 1. Обязательная запись ключевых событий

✅ **Записывайте**:

- `registration` - Регистрация
- `answersFilled` - Заполнение формы
- `leadSubmitted` - Отправка заявки
- `orderCreated` - Создание заказа
- `orderPaid` - Оплата заказа
- `subscriptionCreated` - Создание подписки
- `subscriptionCancelled` - Отмена подписки

### 2. Именование событий

✅ **Правильно** (camelCase):

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
'FormFilled' // PascalCase
```

### 3. Всегда передавайте UTM метки

```typescript
await writeWorkspaceEvent(ctx, 'registration', {
  user: { email },
  uid: clrtUid,
  // ✅ Передаем все доступные UTM метки
  utm_source: req.body.utm_source,
  utm_medium: req.body.utm_medium,
  utm_campaign: req.body.utm_campaign,
  utm_term: req.body.utm_term,
  utm_content: req.body.utm_content
})
```

### 4. Передавайте UID сессии

```vue
<script setup>
// На клиенте
async function submitForm() {
  await apiSubmitFormRoute.run(ctx, {
    answers: formData.value,
    clrtUid: window.clrtUid // ✅ UID сессии браузера
  })
}
</script>
```

### 5. Используйте action_params для сложных данных

```typescript
await writeWorkspaceEvent(ctx, 'answersFilled', {
  action_param1: formId,
  action_param1_int: Object.keys(answers).length,
  // ✅ Сложные данные в action_params
  action_params: {
    age: '24',
    city: 'Moscow',
    aboutMe: 'Software engineer',
    interests: ['coding', 'music']
  },
  uid: clrtUid
})
```

### 6. Обрабатывайте ошибки корректно

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
  // ✅ НЕ бросаем ошибку дальше - событие не критично для основной логики
}
```

### 7. Логируйте важные события

```typescript
await writeWorkspaceEvent(ctx, 'registration', { ... })

// ✅ Логируем для мониторинга
ctx.account.log('Registration event written', {
  level: 'info',
  json: {
    event: 'registration',
    userId: user.id,
    email: user.email
  }
})
```

### 8. Правильные типы для числовых параметров

```typescript
await writeWorkspaceEvent(ctx, 'orderCreated', {
  action_param1: orderId, // String
  action_param1_int: itemsCount, // ✅ Int (целое число)
  action_param1_float: orderTotal, // ✅ Float (сумма с копейками)
  action_param2: currency // String
})
```

---

## Связанные документы

- **016-analytics-getcourse.md** — События GetCourse и ClickHouse запросы (gcQueryAi vs queryAi)
- **016-analytics-traffic.md** — События трафика (просмотры, клики, видео)
- **016-analytics-subscriptions.md** — Система подписок на события
- **E01-gc-sdk.md** — GetCourse SDK (настройка MCP Client, integrationIsEnabled)
- **002-routing.md** — API роуты для записи событий
- **008-heap.md** — Сохранение данных в Heap
- **Проекты**:
  - `dev/partnership` - партнёрская система с GetCourse
  - `dev/events-subscribe` - мониторинг событий

---

## Чтение событий с пагинацией

### Единый API endpoint `/api/events`

Для получения событий из ClickHouse используется универсальный POST endpoint с двумя режимами работы.

#### Определение роута

```typescript
// api/events.ts
export const apiEventsRoute = app
  .body((s) => ({
    mode: s.string().default('list'), // 'list' | 'poll'
    limit: s.number().default(25),
    offset: s.number().default(0),
    sinceTimestamp: s.string().optional(), // Для mode='poll'
    maxTimestamp: s.string().optional() // Для mode='list'
  }))
  .post('/events', async (ctx, req) => {
    requireAnyUser(ctx)

    const { mode, limit, offset, sinceTimestamp, maxTimestamp } = req.body

    if (mode === 'poll') {
      // Polling: новые события для real-time мониторинга
      // ORDER BY ts ASC, С дедупликацией
    } else {
      // List: пагинация, БЕЗ дедупликации
      // ORDER BY ts DESC, urlPath ASC
    }
  })
```

### Режим 'list' - Пагинация событий

**Назначение:** Отображение списка событий с переключением страниц.

**Особенности:**

- ✅ Стабильная пагинация с `OFFSET`
- ✅ Фиксация `maxTimestamp` для избежания "плывущих" данных
- ✅ БЕЗ дедупликации (показывает все строки из ClickHouse)
- ✅ Сортировка: `ORDER BY ts DESC, urlPath ASC` (стабильная)

#### Пример использования (фронтенд)

```vue
<script setup>
import { ref } from 'vue'
import { apiEventsRoute } from '../api/events'

const events = ref([])
const currentPage = ref(1)
const pageSize = ref(25)
const maxTimestamp = ref(null) // Фиксируем для стабильной пагинации

const loadEvents = async () => {
  const offset = (currentPage.value - 1) * pageSize.value

  const result = await apiEventsRoute.run(ctx, {
    mode: 'list',
    limit: pageSize.value,
    offset: offset,
    maxTimestamp: maxTimestamp.value // null на стр.1, фиксирован на стр.2+
  })

  if (result.success) {
    events.value = result.events

    // На первой странице фиксируем maxTimestamp из первого события
    if (currentPage.value === 1 && result.events.length > 0) {
      maxTimestamp.value = result.events[0].ts
    }
  }
}

const nextPage = async () => {
  currentPage.value++
  events.value = [] // Очищаем перед загрузкой
  await loadEvents()
}

const prevPage = async () => {
  if (currentPage.value > 1) {
    currentPage.value--
    events.value = []
    await loadEvents()
  }
}

const refreshEvents = async () => {
  currentPage.value = 1
  maxTimestamp.value = null // Сбрасываем для получения свежих данных
  events.value = []
  await loadEvents()
}
</script>

<template>
  <div>
    <div class="flex items-center gap-4">
      <span>Всего: {{ events.length }}</span>

      <!-- Пагинация -->
      <div class="flex items-center gap-2">
        <button @click="prevPage" :disabled="currentPage === 1 || loading">
          <i class="fas fa-chevron-left"></i>
        </button>

        <span>Страница {{ currentPage }}</span>

        <button @click="nextPage" :disabled="loading || events.length < pageSize">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <table>
      <tr v-for="event in events" :key="event.ts + event.urlPath">
        <td>{{ event.ts }}</td>
        <td>{{ event.urlPath }}</td>
        <td>{{ event.user_id }}</td>
      </tr>
    </table>
  </div>
</template>
```

#### SQL запрос (внутри API)

```sql
-- Страница 1 (maxTimestamp = null)
SELECT ts, dt, url, urlPath, action, uid, user_id, ...
FROM chatium_ai.access_log
WHERE (action_filter)
  AND dt >= today() - 7
ORDER BY ts DESC, urlPath ASC
LIMIT 25
OFFSET 0

-- Страница 2 (maxTimestamp = '2025-11-10 17:25:04')
SELECT ts, dt, url, urlPath, action, uid, user_id, ...
FROM chatium_ai.access_log
WHERE (action_filter)
  AND dt >= today() - 7
  AND ts <= '2025-11-10 17:25:04'  -- Фиксация момента времени!
ORDER BY ts DESC, urlPath ASC
LIMIT 25
OFFSET 25
```

**Ключевой момент:** `maxTimestamp` фиксирует момент времени страницы 1, чтобы новые события не "сдвигали" старые.

### Режим 'poll' - Real-time мониторинг

**Назначение:** Получение новых событий для WebSocket подписок.

**Особенности:**

- ✅ Только НОВЫЕ события после `sinceTimestamp`
- ✅ С дедупликацией (убирает дубликаты от iframe)
- ✅ Сортировка: `ORDER BY ts ASC` (от старых к новым)
- ✅ Возвращает `latestTimestamp` для следующего запроса

#### Пример использования (в джобе)

```typescript
// api/events.ts
export const monitorEventsJob = app.job(
  '/monitor-events',
  async (
    ctx,
    params: {
      userId: string
      socketId: string
      lastProcessedTs?: string
    }
  ) => {
    // Получаем новые события через API
    const result = await apiEventsRoute.run(ctx, {
      mode: 'poll',
      sinceTimestamp: params.lastProcessedTs
    })

    if (result.success && result.events.length > 0) {
      // Отправляем через WebSocket
      await sendDataToSocket(ctx, params.socketId, {
        type: 'events-update',
        data: result.events,
        timestamp: new Date().toISOString()
      })
    }

    // Планируем следующую проверку через 15 секунд
    await monitorEventsJob.scheduleJobAfter(ctx, 15, 'seconds', {
      ...params,
      lastProcessedTs: result.latestTimestamp // Обновляем для следующего раза
    })
  }
)
```

#### SQL запрос для poll

```sql
-- Первый запрос (sinceTimestamp = null)
SELECT ts, dt, url, urlPath, action, uid, user_id, ...
FROM chatium_ai.access_log
WHERE (action_filter)
  AND dt >= today() - 7
  AND ts >= now() - INTERVAL 30 MINUTE
ORDER BY ts ASC  -- От старых к новым!
LIMIT 100

-- Последующие запросы (sinceTimestamp = '2025-11-10 17:25:04')
SELECT ts, dt, url, urlPath, action, uid, user_id, ...
FROM chatium_ai.access_log
WHERE (action_filter)
  AND dt >= today() - 7
  AND ts > '2025-11-10 17:25:04'  -- Только новее!
ORDER BY ts ASC
LIMIT 100
```

### Почему два режима?

| Параметр           | mode='list' (пагинация) | mode='poll' (мониторинг) |
| ------------------ | ----------------------- | ------------------------ |
| **Сортировка**     | DESC (новые → старые)   | ASC (старые → новые)     |
| **Дедупликация**   | ❌ НЕТ                  | ✅ ДА                    |
| **Фильтр времени** | `ts <= maxTimestamp`    | `ts > sinceTimestamp`    |
| **Назначение**     | Просмотр истории        | Real-time обновления     |
| **OFFSET**         | Работает                | Не используется          |

**Критично:** Дедупликация и OFFSET pagination несовместимы!

- Если применить дедупликацию ДО offset → пропадут строки
- Если применить дедупликацию ПОСЛЕ offset → неправильные данные

### Полный пример: Страница с пагинацией и мониторингом

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { apiEventsRoute, apiStartMonitoringRoute, apiStopMonitoringRoute } from '../api/events'

const props = defineProps({
  encodedSocketId: String
})

const events = ref([])
const currentPage = ref(1)
const pageSize = ref(25)
const maxTimestamp = ref(null)
const loading = ref(false)
const isMonitoring = ref(false)
const socketSubscription = ref(null)

// ========== ПАГИНАЦИЯ ==========
const loadEvents = async () => {
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value

    const result = await apiEventsRoute.run(ctx, {
      mode: 'list',
      limit: pageSize.value,
      offset,
      maxTimestamp: maxTimestamp.value
    })

    if (result.success) {
      events.value = result.events

      // Фиксируем maxTimestamp на первой странице
      if (currentPage.value === 1 && result.events.length > 0) {
        maxTimestamp.value = result.events[0].ts
      }
    }
  } finally {
    loading.value = false
  }
}

const nextPage = async () => {
  if (!loading.value) {
    currentPage.value++
    events.value = []

    // При переходе на стр.2+ останавливаем мониторинг
    if (isMonitoring.value) {
      await stopMonitoring()
    }

    await loadEvents()
  }
}

const prevPage = async () => {
  if (currentPage.value > 1 && !loading.value) {
    currentPage.value--
    events.value = []
    await loadEvents()
  }
}

const refreshEvents = async () => {
  currentPage.value = 1
  maxTimestamp.value = null // Сбрасываем
  events.value = []
  await loadEvents()
}

// ========== REAL-TIME МОНИТОРИНГ ==========
const setupWebSocket = async () => {
  const socketClient = await getOrCreateBrowserSocketClient()
  socketSubscription.value = socketClient.subscribeToData(props.encodedSocketId)

  socketSubscription.value.listen((message) => {
    if (message.type === 'events-update') {
      // Добавляем только на первой странице
      if (currentPage.value === 1) {
        events.value = [...message.data, ...events.value]
      }
    }
  })
}

const startMonitoring = async () => {
  const result = await apiStartMonitoringRoute.run(ctx)
  if (result.success) {
    isMonitoring.value = true

    // Подключаем WebSocket только на первой странице
    if (currentPage.value === 1) {
      await setupWebSocket()
    }
  }
}

const stopMonitoring = async () => {
  const result = await apiStopMonitoringRoute.run(ctx)
  if (result.success) {
    isMonitoring.value = false

    // Отключаем WebSocket
    if (socketSubscription.value) {
      socketSubscription.value.unsubscribe()
      socketSubscription.value = null
    }
  }
}

onMounted(async () => {
  await loadEvents()
})

onUnmounted(() => {
  if (socketSubscription.value) {
    socketSubscription.value.unsubscribe()
  }
})
</script>
```

### Важные детали реализации

#### 1. **app.body() vs app.query()**

```typescript
// ❌ НЕПРАВИЛЬНО для POST
export const apiEventsRoute = app.query(s => ({...})).post('/events', ...)

// ✅ ПРАВИЛЬНО для POST
export const apiEventsRoute = app.body(s => ({...})).post('/events', ...)
```

**Причина:** Для POST запросов параметры передаются в теле (body), а не в URL (query).

#### 2. **Фиксация maxTimestamp**

```typescript
// ❌ НЕПРАВИЛЬНО - использовать текущее время
maxTimestamp.value = new Date().toISOString()

// ✅ ПРАВИЛЬНО - использовать timestamp первого события
if (currentPage === 1 && events.length > 0) {
  maxTimestamp.value = events[0].ts // '2025-11-10 17:25:04'
}
```

**Причина:** Между запросами страниц приходят новые события. Если использовать `now()`, то каждый запрос видит разный набор данных.

#### 3. **Стабильная сортировка**

```sql
-- ❌ НЕПРАВИЛЬНО - нестабильная при одинаковых ts
ORDER BY ts DESC

-- ✅ ПРАВИЛЬНО - стабильная сортировка
ORDER BY ts DESC, urlPath ASC
```

**Причина:** Несколько событий могут иметь одинаковый `ts` (до миллисекунд). Вторичный ключ сортировки гарантирует стабильный порядок.

#### 4. **Дедупликация только для WebSocket**

```typescript
// ❌ НЕПРАВИЛЬНО - дедупликация в режиме 'list'
if (mode === 'list') {
  const deduplicatedEvents = deduplicateEvents(result.rows)
  return { events: deduplicatedEvents.slice(0, limit) } // ← Ломает offset!
}

// ✅ ПРАВИЛЬНО - без дедупликации в 'list'
if (mode === 'list') {
  return { events: result.rows } // Как есть из SQL
}

// ✅ Дедупликация только в 'poll'
if (mode === 'poll') {
  const deduplicatedEvents = deduplicateEvents(result.rows)
  return { events: deduplicatedEvents }
}
```

**Причина:** Дедупликация меняет количество строк, что делает OFFSET некорректным.

### Типичные ошибки и решения

#### Проблема: "Страница 2 показывает те же данные что и страница 1"

**Причины:**

1. ❌ Не фиксирован `maxTimestamp`
2. ❌ `app.query()` вместо `app.body()` для POST
3. ❌ Нестабильная сортировка (`ORDER BY ts DESC` без вторичного ключа)
4. ❌ WebSocket добавляет события на странице 2+

**Решение:**

```typescript
// 1. Фиксируем maxTimestamp
if (currentPage === 1 && events[0]) {
  maxTimestamp.value = events[0].ts
}

// 2. Используем app.body() для POST
export const apiEventsRoute = app.body(s => ({...})).post('/events', ...)

// 3. Стабильная сортировка
ORDER BY ts DESC, urlPath ASC

// 4. WebSocket только на странице 1
if (currentPage === 1) {
  events.value = [...newEvents, ...events.value]
}
```

#### Проблема: "После 3-4 кликов возвращает пустой результат"

**Причина:** Дедупликация применяется к данным с OFFSET.

**Решение:** Убрать дедупликацию из режима `'list'`:

```typescript
if (mode === 'list') {
  return { events: result.rows } // БЕЗ deduplicateEvents()
}
```

#### Проблема: "API возвращает 30 событий вместо 25"

**Причина:** WebSocket джоба добавляет события в массив.

**Решение:** Остановить мониторинг при переходе на страницу 2+:

```typescript
const nextPage = async () => {
  currentPage.value++

  if (isMonitoring.value) {
    await stopMonitoring() // Останавливаем джобу и WebSocket
  }

  await loadEvents()
}
```

### Тестирование пагинации

```typescript
// tests/api/run-tests.ts
case 'get_events_list':
  // Страница 1
  const page1 = await apiEventsRoute.run(ctx, {
    mode: 'list',
    limit: 10,
    offset: 0
  })

  // Фиксируем maxTimestamp
  const maxTs = page1.events[0]?.ts

  // Страница 2 с тем же maxTimestamp
  const page2 = await apiEventsRoute.run(ctx, {
    mode: 'list',
    limit: 10,
    offset: 10,
    maxTimestamp: maxTs
  })

  // Проверяем что данные РАЗНЫЕ
  const firstEventPage1 = page1.events[0]?.urlPath
  const firstEventPage2 = page2.events[0]?.urlPath

  if (firstEventPage1 === firstEventPage2 &&
      page1.events[0]?.ts === page2.events[0]?.ts) {
    throw new Error('Пагинация не работает: одинаковые данные на стр.1 и стр.2')
  }

  break
```

### Архитектура

```
┌─────────────────────────────────────────────────┐
│  EventsPage.vue (frontend)                      │
│  ┌──────────────────┐  ┌────────────────────┐  │
│  │  Пагинация       │  │  Real-time         │  │
│  │  (mode='list')   │  │  (mode='poll')     │  │
│  └────────┬─────────┘  └──────────┬─────────┘  │
└───────────┼────────────────────────┼────────────┘
            │                        │
            ▼                        ▼
┌───────────────────────────────────────────────────┐
│  /api/events (POST, app.body)                     │
│  ┌─────────────────────┬────────────────────────┐ │
│  │ mode='list'         │ mode='poll'            │ │
│  │ БЕЗ дедупликации    │ С дедупликацией        │ │
│  │ WHERE ts <= maxTs   │ WHERE ts > sinceTs     │ │
│  │ ORDER BY ts DESC    │ ORDER BY ts ASC        │ │
│  │ OFFSET pagination   │ Нет offset             │ │
│  └─────────────────────┴────────────────────────┘ │
└───────────────────────┬───────────────────────────┘
                        ▼
            ┌───────────────────────┐
            │ ClickHouse            │
            │ chatium_ai.access_log │
            └───────────────────────┘
```

### Конфигурация фильтров событий

Фильтры хранятся в таблице `PartnershipSettings`:

```typescript
// Сохранение фильтра
await PartnershipSettings.createOrUpdateBy(
  ctx,
  {
    key: 'events_filter'
  },
  {
    value: JSON.stringify(['pageview', 'button_click', 'scroll'])
  }
)

// Применяется в SQL
const actionFilter = buildEventFilterConditions(eventTypesFilter)
// → "(startsWith(urlPath, 'http') OR action = 'button_click' OR action = 'scroll')"
```

---

**Версия**: 2.1  
**Дата создания**: 2025-11-07  
**Последнее обновление**: 2025-11-10  
**Статус**: Добавлена документация по пагинации событий

@chatium

# Аналитика Workspace — События приложения (ver. 3.0 — runtime-верифицировано)

Руководство по записи и отслеживанию событий вашего workspace в Chatium через `writeWorkspaceEvent`.

---

## Содержание

- [Основные концепции](#основные-концепции)
- [Запись событий writeWorkspaceEvent](#запись-событий-writeworkspaceevent)
- [Структура события — верифицированная](#структура-события--верифицированная)
- [Регистрация типов событий для AI-агентов](#регистрация-типов-событий-для-ai-агентов)
- [Клиентские события (window.clrtTrack)](#клиентские-события-windowclrttrack)
- [Хук @start/after-event-write](#хук-startafter-event-write)
- [ctx.account.log — логи приложения](#ctxaccountlog--логи-приложения)
- [sendDataToSocket — отправка через WebSocket](#senddatatosocket--отправка-через-websocket)
- [Практические примеры](#практические-примеры)
- [Чтение событий с пагинацией](#чтение-событий-с-пагинацией)
- [Лучшие практики](#лучшие-практики)
- [Приложение: access_log — все action-колонки](#приложение-access_log--все-action-колонки)
- [Связанные документы](#связанные-документы)

---

## Основные концепции

**Workspace Events** — система записи событий вашего приложения для отслеживания действий пользователей. События сохраняются в ClickHouse (таблица `chatium_ai.access_log`) и доступны для аналитических запросов через `queryAi`.

### Когда использовать

- ✅ Регистрация пользователя
- ✅ Заполнение формы
- ✅ Отправка заявки
- ✅ Покупка товара, оплата
- ✅ Важные конверсионные действия пользователя
- Клиентские события (клики, скроллы) — через `window.clrtTrack`

### Когда НЕ использовать

- ❌ Просмотры страниц (отслеживаются автоматически)
- ❌ Технические/административные операции

### Поток данных

```
Пользовательское действие
     ↓
writeWorkspaceEvent(ctx, 'eventName', data)
     ↓
ClickHouse (chatium_ai.access_log)
     ↓
Ваша бизнес-логика (создание в Heap, отправка уведомлений, логирование)
     ↓
(Опционально) пользовательский хук @start/after-event-write — только если вы его сами зарегистрировали и вызываете
```

> **Важно:** платформа НЕ вызывает никакой хук автоматически после `writeWorkspaceEvent`. Пост-обработку делайте прямой логикой сразу после записи события (см. раздел [Хук @start/after-event-write](#хук-startafter-event-write)).

---

## Запись событий writeWorkspaceEvent

### Импорт и использование

```typescript
import { writeWorkspaceEvent } from '@start/sdk'

await writeWorkspaceEvent(ctx, eventName, eventData)
```

**Параметры:**

- `ctx` — контекст приложения (app.Ctx)
- `eventName` — название события (строка, рекомендуется camelCase)
- `eventData` — объект с данными события (тип `any`, поля маппятся на колонки access_log)

### Базовый пример

```typescript
// api/registration.ts
import { writeWorkspaceEvent } from '@start/sdk'

export const apiRegisterRoute = app.post('/', async (ctx, req) => {   // POST /register
  const { email, firstName, lastName } = req.body

  const user = await createUser(ctx, { email, firstName, lastName })

  await writeWorkspaceEvent(ctx, 'registration', {
    user: {
      email,
      firstName,
      lastName,
    },
    action_param1: user.id,
    uid: req.body.clrtUid,
  })

  return { success: true, userId: user.id }
})
```

---

## Структура события — верифицированная

### Полный интерфейс

```typescript
interface WorkspaceEventData {
  // Пользовательские данные (заполняются ТОЛЬКО из ctx.user, не произвольно)
  user?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
  }

  // Контакты клиента (ВАЖНО: передавать всегда, когда известны)
  customer_contacts?: Array<{
    type: 'email' | 'phone' | 'telegram_id' | 'telegram_username' | 'facebook_psid' | 'instagram_uid' | 'vk_id' | 'ok_id' | 'max_id'
    value: string
  }>

  // Строковые параметры (до 3)
  action_param1?: string
  action_param2?: string
  action_param3?: string

  // Целочисленные параметры (до 3)
  action_param1_int?: number
  action_param2_int?: number
  action_param3_int?: number

  // Параметры с плавающей точкой (до 8)
  action_param1_float?: number
  action_param2_float?: number
  action_param3_float?: number
  action_param4_float?: number
  action_param5_float?: number
  action_param6_float?: number
  action_param7_float?: number
  action_param8_float?: number

  // Массивы строк (до 3)
  action_param1_arrstr?: string[]
  action_param2_arrstr?: string[]
  action_param3_arrstr?: string[]

  // Массив целых чисел
  action_param1_uint32arr?: number[]

  // Словари строка→строка (до 2)
  action_param1_mapstrstr?: Record<string, string>
  action_param2_mapstrstr?: Record<string, string>

  // Общий объект параметров (сохраняется как JSON-строка в колонку action_params)
  // ⚠️ Колонка action_params имеет тип Nullable(String) — объект сериализуется в JSON
  action_params?: Record<string, any>

  // ID сессии браузера
  uid?: string // window.clrtUid

  // UTM-метки
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}
```

> **Про `customer_contacts`:** формат каждого элемента — `{ type, value }`. В `access_log` контакты хранятся как `Array(String)` — строками вида `"type:value"`. Канонический перечень `ContactType` содержит **11** значений; значения `ok_id` в реальном `ContactType` **нет**. При этом параметр `eventData` у `writeWorkspaceEvent` имеет тип `any`, поэтому строкой-типом можно передать любое значение — валидации по enum на входе нет (пример `ok_id` выше приведён как иллюстрация «любого» типа, а не как канонический член перечисления).

### Примеры использования полей

```typescript
// Регистрация
await writeWorkspaceEvent(ctx, 'registration', {
  user: { email: 'user@example.com', firstName: 'Ivan' },
  customer_contacts: [{ type: 'email', value: 'user@example.com' }],
  action_param1: userId,
  uid: clrtUid,
  utm_source: 'google',
  utm_campaign: 'winter_sale',
})

// Заполнение формы (со сложными данными в action_params)
await writeWorkspaceEvent(ctx, 'answersFilled', {
  action_param1: formId,
  action_param1_int: answersCount,
  action_params: { age: '24', city: 'Moscow', interests: ['coding', 'music'] },
  uid: clrtUid,
})

// Создание заказа (с float до 8)
await writeWorkspaceEvent(ctx, 'orderCreated', {
  user: { email: ctx.user?.confirmedEmail },
  action_param1: orderId,
  action_param1_int: itemsCount,
  action_param1_float: totalAmount,        // Сумма
  action_param2_float: discount,           // Скидка
  action_param3_float: shipping,           // Доставка
  action_param8_float: tax,                // Налог (до 8 float-полей)
  action_param2: currency,
  uid: clrtUid,
})

// Оплата заказа
await writeWorkspaceEvent(ctx, 'orderPaid', {
  action_param1: orderId,
  action_param2: paymentId,
  action_param1_float: amount,
  action_param2_float: fee ?? 0,
  action_param3: currency,
})

// С массивом тегов
await writeWorkspaceEvent(ctx, 'postTagged', {
  action_param1: postId,
  action_param1_arrstr: ['tag1', 'tag2', 'tag3'],
})

// Со словарём
await writeWorkspaceEvent(ctx, 'formFilled', {
  action_param1_mapstrstr: { message: 'Hello!', source: 'landing' },
  action_param2_mapstrstr: { extra: 'metadata' },
})
```

### URL события

`writeWorkspaceEvent` автоматически формирует URL события в формате:

```
event://account/{workspacePath}/{eventName}
```

Пример: `event://account/temp/qna1807/registration`

Этот же URL возвращает `getWorkspaceEventUrl()` — поэтому `eventName` в обоих вызовах должен совпадать.

---

## Регистрация типов событий для AI-агентов

Для отображения событий в AI-агентах регистрируйте их через хук `@start/agent/events` (не путать с `@start/after-event-write`).

```typescript
import { getWorkspaceEventUrl } from '@start/sdk'

app.accountHook('@start/agent/events', async (ctx, params) => {
  return [
    {
      name: 'Регистрация пользователя',
      url: await getWorkspaceEventUrl(ctx, 'registration'),
    },
    {
      name: 'Заполнение формы с ответами',
      url: await getWorkspaceEventUrl(ctx, 'answersFilled'),
    },
    {
      name: 'Отправка заявки',
      url: await getWorkspaceEventUrl(ctx, 'leadSubmitted'),
    },
    {
      name: 'Создание заказа',
      url: await getWorkspaceEventUrl(ctx, 'orderCreated'),
    },
    {
      name: 'Оплата заказа',
      url: await getWorkspaceEventUrl(ctx, 'orderPaid'),
    },
  ]
})
```

**⚠️ Важно:**

- `getWorkspaceEventUrl(ctx, eventName)` — **асинхронная** функция (возвращает `Promise<string>`), всегда вызывайте через `await`.
- Название в `getWorkspaceEventUrl()` должно **совпадать** с `eventName` в `writeWorkspaceEvent()`.
- Хук `@start/agent/events` регистрирует события для AI-агентов — **не путать** с `@start/after-event-write` (см. ниже).

---

## Клиентские события (window.clrtTrack)

События можно записывать прямо из браузера через `window.clrtTrack` — это глобальная функция, инжектируемая Chatium на клиентские страницы.

### Параметры window.clrtTrack

```typescript
interface ClrtTrackParams {
  url: string      // URL события (обязательно, напр. 'event://custom/button-click')
  action?: string  // Название действия
  action_param1?: string
  action_param2?: string
  action_param3?: string
}
```

> **Примечание:** `window.clrtTrack` существует только в рантайме браузера (client-side) и не имеет TypeScript-декларации. Используйте в клиентском коде (Vue-компонентах, JSX-скриптах) через опциональный вызов `window.clrtTrack?.(...)`.

### Пример во Vue-компоненте

```vue
<template>
  <div>
    <button @click="trackButtonClick('cta-primary')">Главная кнопка</button>
    <button @click="trackButtonClick('subscribe')">Подписаться</button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  window.clrtTrack?.({
    url: 'event://custom/page-loaded',
    action: 'page-view',
    action_param1: window.location.pathname,
  })
})

function trackButtonClick(buttonName) {
  window.clrtTrack?.({
    url: 'event://custom/button-click',
    action: 'click',
    action_param1: buttonName,
    action_param2: window.location.pathname,
  })
}
</script>
```

### Отличия от writeWorkspaceEvent

| Аспект | `writeWorkspaceEvent` | `window.clrtTrack` |
|--------|----------------------|-------------------|
| Где вызывается | Сервер (api-роуты) и клиент | Только клиент (браузер) |
| Асинхронность | `async`, возвращает Promise | Синхронный (fire-and-forget) |
| URL | Генерируется автоматически | Задаётся вручную |
| customer_contacts | Поддерживается | Не поддерживается |
| Все action-поля | Полный набор (int/float/map/arr/…) | Только action_param1/2/3 (строка) |

---

## Хук @start/after-event-write

**⚠️ Важно: этот хук НЕ является встроенным системным хуком платформы и НЕ вызывается автоматически после `writeWorkspaceEvent`.** Ранее в этом документе утверждалось, что событие после записи в ClickHouse «автоматически» проходит через `@start/after-event-write` — это неверно. Runtime-проверка показала: платформа такой автовызов не делает.

Хук `@start/after-event-write` можно зарегистрировать только как **пользовательский** через `app.accountHook(<имя>, handler)`, и он сработает лишь тогда, когда вы сами его вызовете (например, из своего кода или middleware).

### Регистрация пользовательского хука

```typescript
// api/analytics.ts

app.accountHook('@start/after-event-write', async (ctx, eventData) => {
  const { eventName, data } = eventData as {
    eventName: string
    data: Record<string, any>
  }

  if (eventName === 'registration') {
    await handleRegistration(ctx, data)
  }
})
```

> **Почему это важно:** поскольку `@start/after-event-write` не системный, регистрация хука сама по себе НЕ приведёт к его срабатыванию после `writeWorkspaceEvent`. Автоматической цепочки «записал событие → сработал хук» нет.

### Рекомендация (предпочтительный паттерн)

Для пост-обработки событий используйте **прямую логику** в том же обработчике сразу после `writeWorkspaceEvent()`, а не полагайтесь на автоматический вызов хука:

```typescript
await writeWorkspaceEvent(ctx, 'registration', {
  user: { email: user.confirmedEmail, firstName: user.firstName },
  customer_contacts: [{ type: 'email', value: user.confirmedEmail }],
  action_param1: user.id,
})

// Прямая пост-обработка — детерминированно, без зависимости от «автохука»
await handleRegistration(ctx, { userId: user.id, email: user.confirmedEmail })
```

Так поведение детерминировано и не зависит от несуществующего автоматического вызова.

---

## ctx.account.log — логи приложения

Для логирования важных событий используйте `ctx.account.log()`:

```typescript
ctx.account.log('Сообщение лога', {
  level: 'info',   // 'info' | 'warn' | 'error' | 'debug'
  json: { userId: user.id, email: user.email },  // произвольные структурированные данные
  kv: { source: 'registration' },                // опциональные key-value метки
})
```

Сигнатура: `ctx.account.log(msg, { level, json, kv })`.

### Структура таблицы account_logs

Данные сохраняются в ClickHouse, таблица `chatium_ai.account_logs`. Ключевые колонки:

| Колонка | Тип | Описание |
|---------|-----|----------|
| `msg` | `String` | Текст сообщения (первый аргумент) — **не `message`** |
| `level` | `LowCardinality(String)` | Уровень: info, warn, error, debug |
| `json_str` | `String` | JSON из опции `json` (структурированные данные) |
| `ts64` | `DateTime64(3)` | Временная метка |
| `source` | `LowCardinality(String)` | Источник |
| `workspace_path` | `String` | Путь workspace |

> **Внимание:** колонка называется `msg`, а не `message`; JSON лежит в `json_str`, временная метка — `ts64`. Учитывайте это в SQL-запросах.

### Пример чтения через queryAi

```typescript
import { queryAi } from '@traffic/sdk'

const logs = await queryAi(ctx, `
  SELECT ts64, level, msg, json_str
  FROM chatium_ai.account_logs
  WHERE level = 'error'
    AND dt >= today() - 7
  ORDER BY ts64 DESC
  LIMIT 50
`)
// logs.rows — массив результатов
```

---

## sendDataToSocket — отправка через WebSocket

### Импорт

```typescript
import { sendDataToSocket, getOrCreateBrowserSocketClient } from '@app/socket'   // ⚠️ НЕ из @start/sdk!
```

Обе функции импортируются из **`@app/socket`** (runtime-проверено). Импорт из `@start/sdk` — ошибка.

### Сигнатура sendDataToSocket (два overload'а)

```typescript
// 1) с контекстом
sendDataToSocket(ctx, unencodedSocketId: string, data: JSONInputValue): Promise<void>
// 2) без контекста
sendDataToSocket(unencodedSocketId: string, data: JSONInputValue): Promise<void>
```

### getOrCreateBrowserSocketClient (клиент)

На клиенте для подписки на сокет:

```typescript
import { getOrCreateBrowserSocketClient } from '@app/socket'

const socketClient = await getOrCreateBrowserSocketClient()
const subscription = socketClient.subscribeToData(encodedSocketId)

subscription.listen((message) => {
  if (message.type === 'events-update') {
    // обработка новых событий
  }
})
```

---

## Практические примеры

### 1. Регистрация пользователя

```typescript
// api/auth.ts
import { writeWorkspaceEvent } from '@start/sdk'
import { createRealUser, normalizeIdentityKey } from '@app/auth'

export const apiRegisterRoute = app.post('/', async (ctx, req) => {   // POST /register
  const { email, phone, firstName, lastName, clrtUid, utmSource, utmMedium, utmCampaign } = req.body

  const user = await createRealUser(ctx, {
    firstName,
    lastName,
    unconfirmedIdentities: {
      Email: normalizeIdentityKey('Email', email),
      Phone: normalizeIdentityKey('Phone', phone),
    },
  })

  await writeWorkspaceEvent(ctx, 'registration', {
    user: { email, phone, firstName, lastName },
    customer_contacts: [
      { type: 'email', value: email },
      { type: 'phone', value: phone },
    ],
    action_param1: user.id,
    uid: clrtUid,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_term: req.body.utmTerm,
    utm_content: req.body.utmContent,
  })

  ctx.account.log('User registered', {
    level: 'info',
    json: { userId: user.id, email },
  })

  return { success: true, userId: user.id }
})
```

### 2. Заполнение формы

```typescript
// api/forms.ts
import { writeWorkspaceEvent } from '@start/sdk'
import FormResponses from '../tables/form-responses.table'

export const apiSubmitFormRoute = app.post('/', async (ctx, req) => {   // POST /submit-form
  const { answers, formId, clrtUid } = req.body

  const formResponse = await FormResponses.create(ctx, {
    formId,
    answers: JSON.stringify(answers),
    userId: ctx.user?.id,
  })

  await writeWorkspaceEvent(ctx, 'answersFilled', {
    action_param1: formResponse.id,
    action_param2: formId,
    action_param1_int: Object.keys(answers).length,
    action_params: answers, // Сохранится как JSON-строка в Nullable(String)
    uid: clrtUid,
  })

  return { success: true, formResponseId: formResponse.id }
})
```

### 3. Отправка заявки

```typescript
// api/leads.ts
import { writeWorkspaceEvent } from '@start/sdk'
import Leads from '../tables/leads.table'

export const apiSubmitLeadRoute = app.post('/', async (ctx, req) => {   // POST /submit-lead
  const { name, email, phone, message, clrtUid } = req.body

  const lead = await Leads.create(ctx, { name, email, phone, message })

  await writeWorkspaceEvent(ctx, 'leadSubmitted', {
    user: { email, phone, firstName: name },
    customer_contacts: [
      { type: 'email', value: email },
      { type: 'phone', value: phone },
    ],
    action_param1: lead.id,
    action_param2: email,
    action_param3: phone,
    uid: clrtUid,
    utm_source: req.body.utmSource,
    utm_medium: req.body.utmMedium,
    utm_campaign: req.body.utmCampaign,
  })

  return { success: true, leadId: lead.id }
})
```

### 4. Создание и оплата заказа

```typescript
// api/orders.ts
import { writeWorkspaceEvent } from '@start/sdk'
import { Money } from '@app/heap'
import Orders from '../tables/orders.table'

export const apiCreateOrderRoute = app.post('/', async (ctx, req) => {   // POST /create-order
  const { items, total, currency, clrtUid } = req.body

  const order = await Orders.create(ctx, {
    userId: ctx.user?.id,
    items: JSON.stringify(items),
    total: new Money(total, currency),
    status: 'new',
  })

  await writeWorkspaceEvent(ctx, 'orderCreated', {
    user: { email: ctx.user?.confirmedEmail, firstName: ctx.user?.firstName },
    action_param1: order.id,
    action_param1_int: items.length,
    action_param1_float: total,
    action_param2: currency,
    action_param2_float: 0, // shipping
    uid: clrtUid,
  })

  return { success: true, orderId: order.id }
})

// Обработчик после оплаты (вызывается из колбэка платежа)
export const paymentSuccessRoute = app.function(
  '/payment-success',
  async (ctx, params: { attempt: any; payment: any }) => {
    const { attempt, payment } = params
    const orderId = attempt.subject?.[1]

    await writeWorkspaceEvent(ctx, 'orderPaid', {
      action_param1: orderId,
      action_param2: payment.id,
      action_param1_float: payment.amount,
      action_param2_float: payment.fee ?? 0,
      action_param3: payment.currency,
    })

    return { success: true }
  }
)
```

---

## Чтение событий с пагинацией

### Общая схема

Для получения событий из ClickHouse используется единый API endpoint POST с двумя режимами (`list` / `poll`). Чтение из ClickHouse — через `queryAi` из `@traffic/sdk`.

#### Пример роута

```typescript
// api/events.ts
// ⚠️ Правильная цепочка: app.post('/').body(...).handle(...)
import { queryAi } from '@traffic/sdk'
import { requireAnyUser } from '@app/auth'

export const apiEventsRoute = app.post('/')
  .body((s) => ({
    mode: s.string().default('list'),  // 'list' | 'poll'
    limit: s.number().default(25),
    offset: s.number().default(0),
    sinceTimestamp: s.string().optional(),  // для mode='poll'
    maxTimestamp: s.string().optional(),    // для mode='list'
  }))
  .handle(async (ctx, req) => {
    requireAnyUser(ctx)

    const { mode, limit, offset, sinceTimestamp, maxTimestamp } = req.body

    if (mode === 'poll') {
      // Новые события для real-time (от старых к новым, с дедупликацией)
      const result = await queryAi(ctx, `
        SELECT ts, dt, url, urlPath, action, uid, user_id, action_param1, action_param1_float, action_param2
        FROM chatium_ai.access_log
        WHERE dt >= today() - 7
          ${sinceTimestamp ? `AND ts > '${sinceTimestamp}'` : "AND ts >= now() - INTERVAL 30 MINUTE"}
        ORDER BY ts ASC
        LIMIT ${limit}
      `)
      return { success: true, events: result.rows, latestTimestamp: result.rows?.[result.rows.length - 1]?.ts }
    } else {
      // Пагинация (от новых к старым, БЕЗ дедупликации)
      const result = await queryAi(ctx, `
        SELECT ts, dt, url, urlPath, action, uid, user_id, action_param1
        FROM chatium_ai.access_log
        WHERE dt >= today() - 7
          ${maxTimestamp ? `AND ts <= '${maxTimestamp}'` : ''}
        ORDER BY ts DESC, urlPath ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `)
      return { success: true, events: result.rows }
    }
  })
```

> **⚠️ Цепочка роута:** используйте `app.post('/').body(...).handle(...)` — сначала `post('/')`, затем `.body(...)`, затем `.handle(...)`. Вариант `app.body(...).post('/events', ...)` из старых версий этого документа не соответствует runtime. Путь роута — `'/'` (file-based routing: один файл = один роут).

### Режим 'list' — пагинация событий

**Назначение:** отображение списка событий с переключением страниц.

**Особенности:**

- ✅ Стабильная пагинация с `OFFSET`
- ✅ Фиксация `maxTimestamp` для избежания «плывущих» данных
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

#### SQL-запрос (внутри API)

```sql
-- Страница 1 (maxTimestamp = null)
SELECT ts, dt, url, urlPath, action, uid, user_id, ...
FROM chatium_ai.access_log
WHERE dt >= today() - 7
ORDER BY ts DESC, urlPath ASC
LIMIT 25
OFFSET 0

-- Страница 2 (maxTimestamp = '2025-11-10 17:25:04')
SELECT ts, dt, url, urlPath, action, uid, user_id, ...
FROM chatium_ai.access_log
WHERE dt >= today() - 7
  AND ts <= '2025-11-10 17:25:04'  -- Фиксация момента времени!
ORDER BY ts DESC, urlPath ASC
LIMIT 25
OFFSET 25
```

**Ключевой момент:** `maxTimestamp` фиксирует момент времени страницы 1, чтобы новые события не «сдвигали» старые.

### Режим 'poll' — real-time мониторинг

**Назначение:** получение новых событий для WebSocket-подписок.

**Особенности:**

- ✅ Только НОВЫЕ события после `sinceTimestamp`
- ✅ С дедупликацией (убирает дубликаты от iframe)
- ✅ Сортировка: `ORDER BY ts ASC` (от старых к новым)
- ✅ Возвращает `latestTimestamp` для следующего запроса

#### Пример использования (в джобе)

```typescript
// api/events.ts
import { sendDataToSocket } from '@app/socket'

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
      sinceTimestamp: params.lastProcessedTs,
    })

    if (result.success && result.events.length > 0) {
      // Отправляем через WebSocket (sendDataToSocket из @app/socket)
      await sendDataToSocket(ctx, params.socketId, {
        type: 'events-update',
        data: result.events,
        timestamp: new Date().toISOString(),
      })
    }

    // Планируем следующую проверку через 15 секунд
    await monitorEventsJob.scheduleJobAfter(ctx, 15, 'seconds', {
      ...params,
      lastProcessedTs: result.latestTimestamp, // Обновляем для следующего раза
    })
  }
)
```

#### SQL-запрос для poll

```sql
-- Первый запрос (sinceTimestamp = null)
SELECT ts, dt, url, urlPath, action, uid, user_id, ...
FROM chatium_ai.access_log
WHERE dt >= today() - 7
  AND ts >= now() - INTERVAL 30 MINUTE
ORDER BY ts ASC  -- От старых к новым!
LIMIT 100

-- Последующие запросы (sinceTimestamp = '2025-11-10 17:25:04')
SELECT ts, dt, url, urlPath, action, uid, user_id, ...
FROM chatium_ai.access_log
WHERE dt >= today() - 7
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

**Критично:** Дедупликация и OFFSET-пагинация несовместимы!

- Если применить дедупликацию ДО offset → пропадут строки
- Если применить дедупликацию ПОСЛЕ offset → неправильные данные

Поэтому дедуплицируйте **только** в режиме `poll`.

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

#### 1. Параметры POST — в body, цепочка `app.post('/').body(...).handle(...)`

```typescript
// ❌ НЕПРАВИЛЬНО — параметры POST в query
export const apiEventsRoute = app.query(s => ({...})).post('/', ...)

// ❌ УСТАРЕВШАЯ форма (не соответствует runtime)
export const apiEventsRoute = app.body(s => ({...})).post('/events', ...)

// ✅ ПРАВИЛЬНО — post('/') → body(...) → handle(...)
export const apiEventsRoute = app.post('/')
  .body(s => ({...}))
  .handle(async (ctx, req) => {...})
```

**Причина:** для POST-запросов параметры передаются в теле (body), а не в URL (query). Актуальная цепочка построения роута — `app.post('/').body(...).handle(...)`, путь роута — `'/'`.

#### 2. Фиксация maxTimestamp

```typescript
// ❌ НЕПРАВИЛЬНО - использовать текущее время
maxTimestamp.value = new Date().toISOString()

// ✅ ПРАВИЛЬНО - использовать timestamp первого события
if (currentPage === 1 && events.length > 0) {
  maxTimestamp.value = events[0].ts // '2025-11-10 17:25:04'
}
```

**Причина:** между запросами страниц приходят новые события. Если использовать `now()`, каждый запрос видит разный набор данных.

#### 3. Стабильная сортировка

```sql
-- ❌ НЕПРАВИЛЬНО - нестабильная при одинаковых ts
ORDER BY ts DESC

-- ✅ ПРАВИЛЬНО - стабильная сортировка
ORDER BY ts DESC, urlPath ASC
```

**Причина:** несколько событий могут иметь одинаковый `ts` (до миллисекунд). Вторичный ключ сортировки гарантирует стабильный порядок.

#### 4. Дедупликация только для WebSocket

```typescript
// ✅ Без дедупликации в 'list'
if (mode === 'list') {
  return { success: true, events: result.rows } // Как есть из SQL
}

// ✅ Дедупликация только в 'poll'
if (mode === 'poll') {
  const deduplicatedEvents = deduplicateEvents(result.rows)
  return { success: true, events: deduplicatedEvents }
}
```

**Причина:** дедупликация меняет количество строк, что делает OFFSET некорректным.

### Типичные ошибки и решения

#### Проблема: «Страница 2 показывает те же данные что и страница 1»

**Причины:**

1. ❌ Не фиксирован `maxTimestamp`
2. ❌ `app.query()` вместо body-параметров для POST
3. ❌ Нестабильная сортировка (`ORDER BY ts DESC` без вторичного ключа)
4. ❌ WebSocket добавляет события на странице 2+

**Решение:**

```typescript
// 1. Фиксируем maxTimestamp
if (currentPage === 1 && events[0]) {
  maxTimestamp.value = events[0].ts
}

// 2. Правильная цепочка роута для POST
export const apiEventsRoute = app.post('/').body(s => ({...})).handle(async (ctx, req) => {...})

// 3. Стабильная сортировка
// ORDER BY ts DESC, urlPath ASC

// 4. WebSocket только на странице 1
if (currentPage === 1) {
  events.value = [...newEvents, ...events.value]
}
```

#### Проблема: «После 3-4 кликов возвращает пустой результат»

**Причина:** дедупликация применяется к данным с OFFSET.

**Решение:** убрать дедупликацию из режима `'list'`:

```typescript
if (mode === 'list') {
  return { success: true, events: result.rows } // БЕЗ deduplicateEvents()
}
```

#### Проблема: «API возвращает 30 событий вместо 25»

**Причина:** WebSocket-джоба добавляет события в массив.

**Решение:** остановить мониторинг при переходе на страницу 2+:

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
│  /api/events (POST, app.post('/').body().handle()) │
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
            │ ClickHouse (queryAi)  │
            │ chatium_ai.access_log │
            └───────────────────────┘
```

### Конфигурация фильтров событий

Фильтры можно хранить, например, в Heap-таблице настроек проекта:

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

## Лучшие практики

### 1. Обязательная запись ключевых событий

- `registration` — Регистрация
- `answersFilled` — Заполнение формы
- `leadSubmitted` — Заявка
- `orderCreated` — Создание заказа
- `orderPaid` — Оплата заказа
- `subscriptionCreated` — Создание подписки
- `subscriptionCancelled` — Отмена подписки

### 2. Именование событий

✅ **Правильно** (camelCase):

```typescript
'registration', 'leadSubmitted', 'orderCreated', 'formFilled'
```

❌ **Неправильно**:

```typescript
'Registration'      // PascalCase
'lead_submitted'    // snake_case
'order-created'     // kebab-case
```

### 3. Всегда передавайте customer_contacts, если контакты известны

```typescript
await writeWorkspaceEvent(ctx, 'registration', {
  customer_contacts: [
    { type: 'email', value: email },
    { type: 'phone', value: phone },
  ],
  // ...
})
```

### 4. Передавайте UTM-метки

```typescript
await writeWorkspaceEvent(ctx, 'registration', {
  utm_source: req.body.utm_source,
  utm_medium: req.body.utm_medium,
  utm_campaign: req.body.utm_campaign,
  utm_term: req.body.utm_term,
  utm_content: req.body.utm_content,
})
```

### 5. Передавайте UID сессии

```typescript
// На клиенте
const clrtUid = window.clrtUid  // доступен в браузере
```

### 6. Используйте action_params для сложных данных

```typescript
await writeWorkspaceEvent(ctx, 'formFilled', {
  action_params: {
    age: '24',
    city: 'Moscow',
    interests: ['coding', 'music'],
  },
})
// ⚠️ action_params — это Nullable(String), объект сериализуется в JSON
```

### 7. Правильные типы для числовых параметров

```typescript
action_param1: orderId,                // String
action_param1_int: itemsCount,         // Int (целое)
action_param1_float: orderTotal,       // Float (до 8 полей)
action_param2_float: discount,         // Float поле 2
action_param8_float: tax,              // Float поле 8
```

### 8. Обрабатывайте ошибки корректно

```typescript
try {
  await writeWorkspaceEvent(ctx, eventName, eventData)
} catch (error: any) {
  ctx.account.log('Failed to write event', {
    level: 'error',
    json: { event: eventName, error: error.message },
  })
  // НЕ бросаем ошибку дальше — событие не критично для основной логики
}
```

### 9. Асинхронность getWorkspaceEventUrl

```typescript
// ✅ Правильно: await
const url = await getWorkspaceEventUrl(ctx, 'registration')

// ❌ Неправильно: без await вернёт Promise
```

### 10. Пост-обработка — прямой логикой, а не автохуком

```typescript
await writeWorkspaceEvent(ctx, 'registration', { ... })
// Обработка сразу после записи — не полагайтесь на @start/after-event-write (он не системный)
await handleRegistration(ctx, { userId, email })
```

---

## Приложение: access_log — все action-колонки

Полный список action-колонок таблицы `chatium_ai.access_log`, подтверждённый runtime-проверкой:

| Колонка | Тип | Включена в интерфейс |
|---------|-----|---------------------|
| `action_param1` | `Nullable(String)` | ✅ |
| `action_param2` | `Nullable(String)` | ✅ |
| `action_param3` | `Nullable(String)` | ✅ |
| `action_param1_int` | `Nullable(Int32)` | ✅ |
| `action_param2_int` | `Nullable(Int32)` | ✅ |
| `action_param3_int` | `Nullable(Int32)` | ✅ |
| `action_param1_float` | `Nullable(Float32)` | ✅ |
| `action_param2_float` | `Nullable(Float32)` | ✅ |
| `action_param3_float` | `Nullable(Float32)` | ✅ |
| `action_param4_float` | `Nullable(Float32)` | ✅ исправлено (было 3) |
| `action_param5_float` | `Nullable(Float32)` | ✅ исправлено (было 3) |
| `action_param6_float` | `Nullable(Float32)` | ✅ исправлено (было 3) |
| `action_param7_float` | `Nullable(Float32)` | ✅ исправлено (было 3) |
| `action_param8_float` | `Nullable(Float32)` | ✅ исправлено (было 3) |
| `action_param1_arrstr` | `Array(String)` | ✅ |
| `action_param2_arrstr` | `Array(String)` | ✅ |
| `action_param3_arrstr` | `Array(String)` | ✅ |
| `action_param1_uint32arr` | `Array(UInt32)` | ✅ |
| `action_param1_mapstrstr` | `Map(String, String)` | ✅ |
| `action_param2_mapstrstr` | `Map(String, String)` | ✅ добавлено (было 1) |
| `action_params` | `Nullable(String)` | ✅ JSON-строка |
| `customer_contacts` | `Array(String)` | ✅ формат `"type:value"` |
| `keys` | `Array(String)` | служебное |
| `values` | `Array(String)` | служебное |
| `action` | `Nullable(String)` | ✅ |

**Итого по счётчикам (runtime-проверено):** 3 строковых (`action_param1..3`), 3 int (`action_param1..3_int`), **8** float (`action_param1..8_float`), 3 arrstr (`action_param1..3_arrstr`), 1 uint32arr (`action_param1_uint32arr`), **2** map (`action_param1..2_mapstrstr`), 1 общий `action_params` (`Nullable(String)`, JSON).

---

## Связанные документы

- **049-clickhouse.md** — Таблицы ClickHouse (`access_log`, `account_logs`), схемы колонок и запросы
- **016-analytics-getcourse.md** — События GetCourse и ClickHouse-запросы (gcQueryAi vs queryAi)
- **016-analytics-traffic.md** — События трафика (просмотры, клики, видео) через `queryAi` из `@traffic/sdk`
- **016-analytics-subscriptions.md** — Система подписок на события
- **E01-gc-sdk.md** — GetCourse SDK (настройка MCP Client, integrationIsEnabled)
- **002-routing.md** — API-роуты для записи и чтения событий
- **008-heap.md** — Сохранение данных в Heap
- **Проекты**:
  - `dev/partnership` — партнёрская система с GetCourse
  - `dev/events-subscribe` — мониторинг событий

---

**Версия**: 3.0  
**Дата создания**: 2025-11-07  
**Последнее обновление**: 2026-07-18  
**Статус**: Runtime-верифицировано 2026-07-18  
**Все API проверены**: writeWorkspaceEvent, getWorkspaceEventUrl (async), ctx.account.log, sendDataToSocket (@app/socket), getOrCreateBrowserSocketClient (@app/socket), app.job, app.function, window.clrtTrack, queryAi (@traffic/sdk)

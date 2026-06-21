@chatium

# Отложенные задачи в Chatium

Исчерпывающее руководство по работе с отложенными задачами (jobs) в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Определение задачи](#определение-задачи)
  - [Базовый синтаксис](#базовый-синтаксис)
  - [Параметры задачи](#параметры-задачи)
- [Планирование выполнения](#планирование-выполнения)
  - [scheduleJobAfter - через время](#schedulejobafter---через-время)
  - [scheduleJobAsap - асинхронно](#schedulejobasap---асинхронно)
  - [scheduleJobAt - в конкретное время](#schedulejobat---в-конкретное-время)
- [Отмена задач](#отмена-задач)
- [Единицы времени](#единицы-времени)
- [Практические примеры](#практические-примеры)
  - [Отправка напоминаний](#отправка-напоминаний)
  - [Отложенные email](#отложенные-email)
  - [Рекуррентные платежи](#реккурентные-платежи)
  - [Периодическая очистка](#периодическая-очистка)
- [Лучшие практики](#лучшие-практики)
- [Отладка и мониторинг](#отладка-и-мониторинг)

---

## Основные концепции

**Отложенные задачи (Jobs)** — механизм выполнения кода в определённое время или с задержкой.

### Ключевые понятия

- **app.job()** — определение задачи
- **scheduleJobAfter()** — запланировать выполнение через N времени
- **scheduleJobAsap()** — запланировать асинхронное выполнение
- **scheduleJobAt()** — запланировать на конкретную дату
- **taskId** — идентификатор запланированной задачи для отмены

### Когда использовать

- ✅ Отложенные уведомления и напоминания
- ✅ Отложенная отправка email/SMS
- ✅ Рекуррентные платежи и подписки
- ✅ Периодическая очистка данных
- ✅ Фоновая обработка после действия пользователя
- ❌ Не используйте для долгих операций в роутах (используйте jobs)

---

## Определение задачи

### Базовый синтаксис

```typescript
const reminderJob = app.job('/reminder', async (ctx, params) => {
  // Код задачи
  // params содержит данные, переданные при планировании
})
```

**Полный пример**:

```typescript
const sendReminderJob = app.job('/send-reminder', async (ctx, params) => {
  const { userId, message } = params

  ctx.account.log('Sending reminder', {
    level: 'info',
    json: { userId, message }
  })

  // Отправка напоминания
  await sendNotification(ctx, userId, message)

  ctx.account.log('Reminder sent', {
    level: 'info',
    json: { userId }
  })
})
```

### Параметры задачи

**ctx** — контекст приложения:

- Формируется автоматически
- Тот же ctx, что и в роутах
- Доступ к `ctx.user`, `ctx.account`, `ctx.account.log()`

**params** — данные задачи:

- Объект с произвольными данными
- Передаётся при планировании
- Может содержать любые сериализуемые данные

```typescript
const processOrderJob = app.job('/process-order', async (ctx, params) => {
  const { orderId, action, metadata } = params

  // Типизация параметров
  type JobParams = {
    orderId: string
    action: 'confirm' | 'cancel' | 'refund'
    metadata?: {
      reason?: string
      amount?: number
    }
  }

  // Использование
  ctx.account.log('Processing order', {
    level: 'info',
    json: { orderId, action }
  })

  // Бизнес-логика
  await processOrder(ctx, orderId, action)
})
```

---

## Планирование выполнения

### scheduleJobAfter - через время

Запланировать выполнение через указанное количество времени.

**Сигнатура**:

```typescript
job.scheduleJobAfter(
  ctx: app.Ctx,
  amount: number,
  unit:
    | 'milliseconds'
    | 'seconds'
    | 'minutes'
    | 'hours'
    | 'days'
    | 'weeks'
    | 'months'
    | 'quarters'
    | 'years',
  params: any
): Promise<number>  // Возвращает taskId (число), требует await
```

**Примеры**:

```typescript
// Через 30 секунд
const taskId = await reminderJob.scheduleJobAfter(ctx, 30, 'seconds', {
  userId: ctx.user.id,
  message: 'Напоминание через 30 секунд'
})

// Через 9 минут
const taskId = await reminderJob.scheduleJobAfter(ctx, 9, 'minutes', {
  userId: ctx.user.id,
  message: 'Напоминание через 9 минут'
})

// Через 2 часа
const taskId = await reminderJob.scheduleJobAfter(ctx, 2, 'hours', {
  userId: ctx.user.id,
  message: 'Напоминание через 2 часа'
})

// Через 7 дней
const taskId = await reminderJob.scheduleJobAfter(ctx, 7, 'days', {
  userId: ctx.user.id,
  message: 'Напоминание через неделю'
})
```

**В роуте**:

```typescript
export const scheduleReminderRoute = app.post('/schedule', async (ctx, req) => {
  const { message, delayMinutes } = req.body

  const taskId = await reminderJob.scheduleJobAfter(ctx, delayMinutes, 'minutes', {
    userId: ctx.user.id,
    message
  })

  return {
    success: true,
    taskId,
    scheduledFor: new Date(Date.now() + delayMinutes * 60 * 1000)
  }
})
```

### scheduleJobAsap - асинхронно

Запланировать немедленное асинхронное выполнение.

**Сигнатура**:

```typescript
job.scheduleJobAsap(ctx: app.Ctx, params: any): Promise<number>
```

**Когда использовать**:

- Фоновая обработка после действия пользователя
- Избежать блокировки роута
- Асинхронные операции без задержки

**Пример**:

```typescript
const processDataJob = app.job('/process-data', async (ctx, params) => {
  const { dataId } = params

  // Долгая обработка
  await processLargeDataset(ctx, dataId)

  ctx.account.log('Data processed', {
    level: 'info',
    json: { dataId }
  })
})

export const uploadDataRoute = app.post('/upload', async (ctx, req) => {
  const { data } = req.body

  // Сохраняем данные
  const dataRecord = await DataTable.create(ctx, { data })

  // Планируем фоновую обработку
  await processDataJob.scheduleJobAsap(ctx, {
    dataId: dataRecord.id
  })

  // Сразу возвращаем ответ
  return {
    success: true,
    message: 'Data uploaded, processing in background'
  }
})
```

### scheduleJobAt - в конкретное время

Запланировать выполнение на конкретную дату и время.

**Сигнатура**:

```typescript
job.scheduleJobAt(ctx: app.Ctx, date: Date, params: any): Promise<number>
```

**Примеры**:

```typescript
// Конкретная дата
const taskId = await reminderJob.scheduleJobAt(
  ctx,
  new Date(2026, 0, 31, 12, 0), // 31 января 2026, 12:00
  {
    userId: ctx.user.id,
    message: 'Напоминание на 31 января 2026'
  }
)

// Вычисляемая дата
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
tomorrow.setHours(9, 0, 0, 0) // 9:00 утра

const taskId = await reminderJob.scheduleJobAt(ctx, tomorrow, {
  userId: ctx.user.id,
  message: 'Доброе утро!'
})
```

**Расчет даты для подписки**:

```typescript
const billingJob = app.job('/billing', async (ctx, params) => {
  const { subscriptionId } = params
  // Обработка платежа
})

export const createSubscriptionRoute = app.post('/create', async (ctx, req) => {
  const subscription = await SubscriptionsTable.create(ctx, {
    userId: ctx.user.id,
    plan: req.body.plan
  })

  // Первый платеж через 30 дней
  const nextBillingDate = new Date()
  nextBillingDate.setDate(nextBillingDate.getDate() + 30)

  await billingJob.scheduleJobAt(ctx, nextBillingDate, {
    subscriptionId: subscription.id
  })

  return {
    success: true,
    subscription,
    nextBillingDate
  }
})
```

---

## Отмена задач

### ⚠️ КРИТИЧЕСКИ ВАЖНО: методы планирования возвращают Promise!

**Все методы планирования джобов возвращают Promise и требуют `await`:**

```typescript
// ❌ НЕПРАВИЛЬНО - без await
const taskId = job.scheduleJobAsap(ctx, params)
const taskId = job.scheduleJobAfter(ctx, 10, 'minutes', params)
const taskId = job.scheduleJobAt(ctx, date, params)

// ✅ ПРАВИЛЬНО - с await
const taskId = await job.scheduleJobAsap(ctx, params)
const taskId = await job.scheduleJobAfter(ctx, 10, 'minutes', params)
const taskId = await job.scheduleJobAt(ctx, date, params)
```

**Без `await`:**

- `taskId` будет содержать Promise объект, а не реальный ID
- При попытке сохранить получите `"[object Promise]"` вместо числа
- При попытке отменить будет ошибка: `Invalid job id: [object Promise]:undefined`

### Правильное сохранение и отмена taskId

```typescript
import { cancelScheduledJob } from '@app/jobs'

export const scheduleRoute = app.post('/schedule', async (ctx, req) => {
  // ✅ Планируем задачу с await
  const taskId = await reminderJob.scheduleJobAfter(ctx, 10, 'minutes', {
    message: 'Test'
  })

  // taskId - это число (например: 6222078)
  // Для хранения в строковом поле преобразуем
  await TasksTable.create(ctx, {
    taskId: String(taskId), // Сохраняем как строку
    userId: ctx.user.id,
    scheduledFor: new Date(Date.now() + 10 * 60 * 1000)
  })

  return { success: true, taskId }
})

export const cancelRoute = app.post('/cancel', async (ctx, req) => {
  const { taskId: taskIdString } = req.body

  // Преобразуем строку обратно в число для cancelScheduledJob
  const taskId = parseInt(taskIdString, 10)

  // ✅ Отменяем задачу (ожидает число!)
  await cancelScheduledJob(ctx, taskId)

  // Обновляем статус в БД
  await TasksTable.update(ctx, {
    taskId: taskIdString,
    status: 'cancelled'
  })

  return { success: true }
})
```

### Типы taskId

- **scheduleJobAsap/scheduleJobAfter/scheduleJobAt** возвращают **число** (number)
- **cancelScheduledJob** ожидает **число** (number)
- **Heap таблица с полем String** требует **строку** (string)

**Правило конвертации:**

```typescript
// При сохранении: число → строка
const taskIdForStorage = String(taskId)
await Table.create(ctx, { taskId: taskIdForStorage })

// При отмене: строка → число
const taskIdForCancel = parseInt(taskIdString, 10)
await cancelScheduledJob(ctx, taskIdForCancel)
```

---

## Единицы времени

Доступные единицы для `scheduleJobAfter`:

| Единица          | Описание     | Пример                          |
| ---------------- | ------------ | ------------------------------- |
| `'milliseconds'` | Миллисекунды | `500, 'milliseconds'` = 0.5 сек |
| `'seconds'`      | Секунды      | `30, 'seconds'` = 30 сек        |
| `'minutes'`      | Минуты       | `15, 'minutes'` = 15 мин        |
| `'hours'`        | Часы         | `2, 'hours'` = 2 часа           |
| `'days'`         | Дни          | `7, 'days'` = 7 дней            |
| `'weeks'`        | Недели       | `2, 'weeks'` = 14 дней          |
| `'months'`       | Месяцы       | `1, 'months'` = 1 месяц         |
| `'quarters'`     | Кварталы     | `1, 'quarters'` = 3 месяца      |
| `'years'`        | Годы         | `1, 'years'` = 1 год            |

**Примеры**:

```typescript
// 500 миллисекунд
await job.scheduleJobAfter(ctx, 500, 'milliseconds', params)

// 30 секунд
await job.scheduleJobAfter(ctx, 30, 'seconds', params)

// 5 минут
await job.scheduleJobAfter(ctx, 5, 'minutes', params)

// 2 часа
await job.scheduleJobAfter(ctx, 2, 'hours', params)

// 1 неделя
await job.scheduleJobAfter(ctx, 7, 'days', params)

// 1 месяц (приблизительно)
await job.scheduleJobAfter(ctx, 30, 'days', params)

// 1 неделя
await job.scheduleJobAfter(ctx, 1, 'weeks', params)

// 1 квартал
await job.scheduleJobAfter(ctx, 1, 'quarters', params)

// 1 год
await job.scheduleJobAfter(ctx, 1, 'years', params)
```

### Важно про типы возврата

- Для `jobRef.scheduleJobAfter/scheduleJobAsap/scheduleJobAt` (через `app.job(...)`) в текущих типах платформы возвращается `Promise<number>`.
- В `@app/jobs` есть deprecated глобальные функции `scheduleJobAfter/scheduleJobAsap/scheduleJobAt` с другим интерфейсом (включают `url`) и `Promise<string>`.
- В этом документе используется и рекомендуется современный вариант: методы экземпляра задачи через `app.job(...)`.

---

## Практические примеры

### Отправка напоминаний

```typescript
const sendReminderJob = app.job('/send-reminder', async (ctx, params) => {
  const { userId, title, message } = params

  const user = await findUserById(ctx, userId)

  if (!user) {
    ctx.account.log('User not found for reminder', {
      level: 'warn',
      json: { userId }
    })
    return
  }

  // Отправка через email
  if (user.confirmedEmail) {
    await sendEmail(ctx, {
      to: user.confirmedEmail,
      subject: title,
      body: message
    })
  }

  // Отправка через Telegram
  if (user.telegramId) {
    await sendTelegramMessage(ctx, user.telegramId, message)
  }

  ctx.account.log('Reminder sent', {
    level: 'info',
    json: { userId, title }
  })
})

// Планирование
export const createReminderRoute = app.post('/create', async (ctx, req) => {
  const { title, message, remindAt } = req.body

  const reminder = await RemindersTable.create(ctx, {
    userId: ctx.user.id,
    title,
    message,
    remindAt: new Date(remindAt)
  })

  const taskId = await sendReminderJob.scheduleJobAt(ctx, new Date(remindAt), {
    userId: ctx.user.id,
    title,
    message
  })

  await RemindersTable.update(ctx, {
    id: reminder.id,
    taskId
  })

  return { success: true, reminder }
})
```

### Отложенные email

```typescript
const sendEmailJob = app.job('/send-email', async (ctx, params) => {
  const { email, subject, body } = params

  try {
    await sendEmail(ctx, { to: email, subject, body })

    ctx.account.log('Email sent', {
      level: 'info',
      json: { email, subject }
    })
  } catch (error: any) {
    ctx.account.log('Email send failed', {
      level: 'error',
      json: { email, error: error.message }
    })
  }
})

export const scheduleEmailRoute = app.post('/schedule-email', async (ctx, req) => {
  const { email, subject, body, delayMinutes } = req.body

  const taskId = await sendEmailJob.scheduleJobAfter(ctx, delayMinutes || 0, 'minutes', {
    email,
    subject,
    body
  })

  return {
    success: true,
    taskId,
    willSendAt: new Date(Date.now() + (delayMinutes || 0) * 60 * 1000)
  }
})
```

### Рекуррентные платежи

```typescript
import { attemptAutoCharge } from '@pay/sdk'

const processSubscriptionPaymentJob = app.job('/process-subscription', async (ctx, params) => {
  const { subscriptionId, userId } = params

  const subscription = await SubscriptionsTable.findById(ctx, subscriptionId)

  if (!subscription || subscription.status !== 'active') {
    ctx.account.log('Subscription not active', {
      level: 'warn',
      json: { subscriptionId }
    })
    return { success: false, error: 'Subscription is not active' }
  }

  // Автоматическое списание
  const response = await attemptAutoCharge(ctx, {
    subject: subscription,
    amount: [subscription.monthlyPrice, subscription.currency],
    description: `Ежемесячная подписка ${subscription.planName}`,
    userId: userId,
    customer: {
      firstName: subscription.user.firstName,
      lastName: subscription.user.lastName,
      email: subscription.user.email
    },
    payload: {
      subscriptionId: subscription.id,
      isRecurring: true
    },
    items: [
      {
        id: subscription.planId,
        name: subscription.planName,
        quantity: 1,
        price: subscription.monthlyPrice
      }
    ],
    initedBy: 'system',
    bySchedule: true
  })

  if (response.success) {
    // Обновляем дату следующего списания
    const nextBillingDate = new Date()
    nextBillingDate.setDate(nextBillingDate.getDate() + 30)

    await SubscriptionsTable.update(ctx, {
      id: subscription.id,
      nextBillingDate,
      status: 'active'
    })

    // Планируем следующее списание
    await processSubscriptionPaymentJob.scheduleJobAt(ctx, nextBillingDate, {
      subscriptionId: subscription.id,
      userId
    })

    ctx.account.log('Subscription payment successful', {
      level: 'info',
      json: { subscriptionId, nextBillingDate }
    })

    return { success: true }
  } else {
    // При неудаче приостанавливаем подписку
    await SubscriptionsTable.update(ctx, {
      id: subscription.id,
      status: 'payment_failed',
      lastError: response.error
    })

    ctx.account.log('Subscription payment failed', {
      level: 'error',
      json: { subscriptionId, error: response.error }
    })

    return { success: false, error: response.error }
  }
})
```

### Периодическая очистка

```typescript
const cleanupOldDataJob = app.job('/cleanup-old-data', async (ctx, params) => {
  const { tableName, daysOld } = params

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  ctx.account.log('Starting cleanup', {
    level: 'info',
    json: { tableName, daysOld, cutoffDate }
  })

  // Удаление старых записей
  const oldRecords = await SomeTable.findAll(ctx, {
    where: {
      createdAt: { $lt: cutoffDate }
    },
    limit: 1000
  })

  for (const record of oldRecords) {
    await SomeTable.delete(ctx, record.id)
  }

  ctx.account.log('Cleanup completed', {
    level: 'info',
    json: {
      tableName,
      deletedCount: oldRecords.length
    }
  })

  // Планируем следующую очистку через 24 часа
  if (params.recurring) {
    await cleanupOldDataJob.scheduleJobAfter(ctx, 24, 'hours', params)
  }
})

// Запуск периодической очистки
export const startCleanupRoute = app.post('/start-cleanup', async (ctx) => {
  await cleanupOldDataJob.scheduleJobAsap(ctx, {
    tableName: 'logs',
    daysOld: 30,
    recurring: true
  })

  return { success: true, message: 'Cleanup scheduled' }
})
```

---

## Лучшие практики

### Логирование

✅ **Всегда логируйте начало и конец задачи**:

```typescript
const myJob = app.job('/my-job', async (ctx, params) => {
  ctx.account.log('Job started', {
    level: 'info',
    json: { params }
  })

  try {
    // Выполнение задачи
    await performTask(ctx, params)

    ctx.account.log('Job completed', {
      level: 'info',
      json: { params }
    })
  } catch (error: any) {
    ctx.account.log('Job failed', {
      level: 'error',
      json: { params, error: error.message, stack: error.stack }
    })
  }
})
```

### Обработка ошибок

✅ **Используйте try/catch**:

```typescript
const reliableJob = app.job('/reliable', async (ctx, params) => {
  try {
    await performAction(ctx, params)
    return { success: true }
  } catch (error: any) {
    ctx.account.log('Job error', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: error.message }
  }
})
```

### ⚠️ КРИТИЧЕСКИ ВАЖНО: setTimeout НЕ доступен на сервере

**Проблема**: В серверном коде Chatium (роуты, jobs) **НЕТ** доступа к `setTimeout`, `setInterval` и другим браузерным API.

**Ошибка**: `setTimeout is not defined`

**Решение**:

1. **Для задержек используйте `scheduleJobAfter`**:

```typescript
// ❌ НЕПРАВИЛЬНО - setTimeout не существует на сервере
const myJob = app.job('/my-job', async (ctx, params) => {
  await new Promise((resolve) => setTimeout(resolve, 1000)) // ← ОШИБКА!
  // ...
})

// ✅ ПРАВИЛЬНО - используйте scheduleJobAfter для задержек
const delayedJob = app.job('/delayed', async (ctx, params) => {
  // Выполняем задачу
  await performAction(ctx, params)
})

// Планируем выполнение с задержкой
await delayedJob.scheduleJobAfter(ctx, 1, 'seconds', {
  /* params */
})
```

2. **Для паузы между операциями в цикле** - просто не делайте паузы, или разбивайте на отдельные jobs:

```typescript
// ❌ НЕПРАВИЛЬНО
const processBatchJob = app.job('/process-batch', async (ctx, params) => {
  for (const item of items) {
    await processItem(ctx, item)
    await new Promise((resolve) => setTimeout(resolve, 1000)) // ← ОШИБКА!
  }
})

// ✅ ПРАВИЛЬНО - без пауз (быстрее и проще)
const processBatchJob = app.job('/process-batch', async (ctx, params) => {
  for (const item of items) {
    await processItem(ctx, item)
    // Без паузы - выполняется быстрее
  }
})

// ✅ ПРАВИЛЬНО - если нужна задержка, разбивайте на отдельные jobs
const processItemJob = app.job('/process-item', async (ctx, params) => {
  await processItem(ctx, params.item)

  // Планируем следующий элемент с задержкой
  if (params.nextItem) {
    await processItemJob.scheduleJobAfter(ctx, 1, 'seconds', {
      item: params.nextItem
    })
  }
})
```

3. **Для массовых операций** - используйте батчи без задержек:

```typescript
// ✅ ПРАВИЛЬНО - удаление всех записей сразу
async function deleteAllCache(ctx: app.Ctx, datasetId: string) {
  const deleted = await CacheTable.deleteAll(ctx, {
    where: { dataset_id: datasetId },
    limit: null // Удаляем все сразу
  })
  return deleted
}

// ❌ НЕПРАВИЛЬНО - попытка добавить задержку через setTimeout
async function deleteAllCache(ctx: app.Ctx, datasetId: string) {
  let deleted = 0
  while (true) {
    const batch = await CacheTable.deleteAll(ctx, {
      where: { dataset_id: datasetId },
      limit: 100
    })
    deleted += batch
    await new Promise((resolve) => setTimeout(resolve, 1000)) // ← ОШИБКА!
    if (batch === 0) break
  }
  return deleted
}
```

**Помните**: На сервере Chatium нет браузерных API. Используйте механизмы Chatium для асинхронных операций.

### Идемпотентность

✅ **Делайте задачи идемпотентными** (повторное выполнение не навредит):

```typescript
const idempotentJob = app.job('/send-notification', async (ctx, params) => {
  const { notificationId } = params

  // Проверяем, не была ли уже отправлена
  const notification = await NotificationsTable.findById(ctx, notificationId)

  if (notification.status === 'sent') {
    ctx.account.log('Notification already sent', {
      level: 'info',
      json: { notificationId }
    })
    return { success: true, message: 'Already sent' }
  }

  // Отправка
  await sendNotification(ctx, notification)

  // Обновление статуса
  await NotificationsTable.update(ctx, {
    id: notificationId,
    status: 'sent',
    sentAt: new Date()
  })

  return { success: true }
})
```

### Сохранение taskId

✅ **Сохраняйте taskId для возможной отмены**:

```typescript
export const scheduleActionRoute = app.post('/schedule', async (ctx, req) => {
  const taskId = await myJob.scheduleJobAfter(ctx, 10, 'minutes', {
    action: req.body.action
  })

  // Сохраняем в БД
  await ScheduledTasksTable.create(ctx, {
    taskId,
    userId: ctx.user.id,
    scheduledFor: new Date(Date.now() + 10 * 60 * 1000),
    status: 'pending'
  })

  return { success: true, taskId }
})
```

### Параметры задач

✅ **Используйте типизацию для параметров**:

```typescript
type MyJobParams = {
  userId: string
  action: 'create' | 'update' | 'delete'
  data?: Record<string, any>
}

const myJob = app.job('/my-job', async (ctx, params: MyJobParams) => {
  const { userId, action, data } = params
  // TypeScript проверит типы
})
```

---

## Отладка и мониторинг

### Логирование выполнения

```typescript
const monitoredJob = app.job('/monitored', async (ctx, params) => {
  const startTime = Date.now()

  ctx.account.log('Job started', {
    level: 'info',
    json: { params, startTime }
  })

  try {
    await performTask(ctx, params)

    const duration = Date.now() - startTime

    ctx.account.log('Job completed', {
      level: 'info',
      json: { params, duration }
    })
  } catch (error: any) {
    const duration = Date.now() - startTime

    ctx.account.log('Job failed', {
      level: 'error',
      json: {
        params,
        duration,
        error: error.message,
        stack: error.stack
      }
    })

    throw error
  }
})
```

### Мониторинг производительности

```typescript
const performanceJob = app.job('/performance', async (ctx, params) => {
  const metrics = {
    startTime: Date.now(),
    steps: [] as Array<{ name: string; duration: number }>
  }

  const step = (name: string, start: number) => {
    metrics.steps.push({
      name,
      duration: Date.now() - start
    })
  }

  const step1Start = Date.now()
  await performStep1(ctx)
  step('step1', step1Start)

  const step2Start = Date.now()
  await performStep2(ctx)
  step('step2', step2Start)

  ctx.account.log('Job performance metrics', {
    level: 'info',
    json: {
      totalDuration: Date.now() - metrics.startTime,
      steps: metrics.steps
    }
  })
})
```

---

## Частые ошибки при работе с Jobs

### ❌ Ошибка #1: Забыли await перед scheduleJob\*

**Симптомы:**

- taskId содержит `"[object Promise]"` вместо числа
- Ошибка при отмене: `Invalid job id: [object Promise]:undefined`
- Джоб не отменяется

**Причина:**

```typescript
// ❌ НЕПРАВИЛЬНО
const taskId = job.scheduleJobAsap(ctx, params) // Возвращает Promise!
```

**Решение:**

```typescript
// ✅ ПРАВИЛЬНО
const taskId = await job.scheduleJobAsap(ctx, params) // Ждём Promise
```

### ❌ Ошибка #2: Неправильный тип при отмене джоба

**Симптомы:**

- Ошибка: `Invalid job id: 6222078:undefined`
- Джоб остаётся в планировщике после отмены

**Причина:**

```typescript
// taskId сохранён как строка "6222078"
const taskId = taskIdSetting.value // string

// ❌ Передаём строку, а нужно число
await cancelScheduledJob(ctx, taskId) // Ожидает number!
```

**Решение:**

```typescript
// ✅ Преобразуем в число
const taskId = parseInt(taskIdSetting.value, 10)
await cancelScheduledJob(ctx, taskId)
```

### ❌ Ошибка #3: Сохранение Promise вместо taskId

**Симптомы:**

- В базе данных `taskId = "[object Promise]"`
- Невозможно отменить задачу

**Причина:**

```typescript
// ❌ Забыли await - сохраняем Promise
const taskId = job.scheduleJobAfter(ctx, 7, 'days', params)
await Table.create(ctx, { taskId: String(taskId) }) // "[object Promise]"
```

**Решение:**

```typescript
// ✅ Ждём результат Promise
const taskId = await job.scheduleJobAfter(ctx, 7, 'days', params)
await Table.create(ctx, { taskId: String(taskId) }) // "6222078"
```

### 📝 Чек-лист перед сохранением taskId

- ✅ Использован `await` перед `scheduleJob*`
- ✅ taskId имеет тип `number`, а не `Promise`
- ✅ При сохранении в String поле используется `String(taskId)`
- ✅ При отмене используется `parseInt(taskIdString, 10)`
- ✅ Добавлено логирование типа taskId для отладки

```typescript
// Шаблон правильной работы с taskId
const taskId = await job.scheduleJobAsap(ctx, params) // 1. await

ctx.account.log('TaskId received', {
  // 2. Логируем
  level: 'info',
  json: { taskId, type: typeof taskId }
})

await Table.create(ctx, {
  // 3. Сохраняем как строку
  taskId: String(taskId)
})

// ... позже при отмене ...

const taskIdString = setting.value
const taskIdNumber = parseInt(taskIdString, 10) // 4. Конвертируем в число
await cancelScheduledJob(ctx, taskIdNumber) // 5. Отменяем
```

---

## Связанные документы

- **002-routing.md** — Использование jobs в роутах
- **012-sender.md** — Отправка сообщений из jobs
- **001-standards.md** — Стандарты кодирования
- **008-heap.md** — Работа с Heap таблицами и типами данных

---

**Версия**: 1.2  
**Дата**: 2025-11-02  
**Последнее обновление**: 2026-03-24 (актуализированы единицы времени по `TimeUnit`, добавлено различие между deprecated API `@app/jobs` и `app.job(...)`, выровнены примеры и типы)

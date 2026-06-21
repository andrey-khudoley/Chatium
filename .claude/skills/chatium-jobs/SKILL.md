---
name: chatium-jobs
description: Отложенные задачи в Chatium — app.job(), scheduleJobAfter, scheduleJobAsap, scheduleJobAt, cancelScheduledJob. Использовать при планировании выполнения кода с задержкой или на время.
---

# chatium-jobs

Отложенные задачи (jobs): определение через `app.job()`, планирование через scheduleJobAfter/Asap/At, отмена по taskId. Использовать для напоминаний, отложенной отправки, рекуррентных операций, фоновой обработки.

## Когда использовать

- Отложенные уведомления и напоминания
- Отложенная отправка email/SMS
- Рекуррентные платежи и подписки
- Периодическая очистка данных
- Фоновая обработка после действия пользователя
- Не использовать для долгих операций в роутах — выносить в job

## Определение задачи

```ts
const reminderJob = app.job('/reminder', async (ctx, params) => {
  const { userId, message } = params
  ctx.account.log('Sending reminder', { level: 'info', json: { userId, message } })
  // логика
})
```

Параметры `params` — произвольный сериализуемый объект, передаётся при планировании. Рекомендуется типизировать:

```ts
type ReminderParams = {
  userId: string
  message: string
}

const reminderJob = app.job('/reminder', async (ctx, params: ReminderParams) => {
  const { userId, message } = params
  // ...
})
```

## Планирование

**КРИТИЧЕСКИ ВАЖНО: все методы планирования возвращают `Promise<number>` и требуют `await`!**

Без `await` в переменной окажется объект Promise вместо числа, и при попытке отмены будет ошибка `Invalid job id: [object Promise]:undefined`.

- **scheduleJobAfter(ctx, amount, unit, params)** — через время. Возвращает `Promise<number>` (taskId).
- **scheduleJobAsap(ctx, params)** — асинхронно, как можно скорее. Возвращает `Promise<number>`.
- **scheduleJobAt(ctx, date, params)** — на конкретную дату (Date). Возвращает `Promise<number>`.

```ts
// Правильно — с await
const taskId = await reminderJob.scheduleJobAfter(ctx, 30, 'minutes', { userId, message })
await reminderJob.scheduleJobAsap(ctx, { orderId })
await reminderJob.scheduleJobAt(ctx, new Date('2025-12-01T12:00:00Z'), { id: 'x' })

// Неправильно — без await (taskId будет Promise, не числом)
const taskId = reminderJob.scheduleJobAfter(ctx, 30, 'minutes', { userId, message })
```

### Единицы времени для scheduleJobAfter

| Единица          | Описание     | Пример использования            |
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

## Отмена

`cancelScheduledJob` импортируется из `@app/jobs` и принимает **число** (не строку).

```ts
import { cancelScheduledJob } from '@app/jobs'

// Отменить запланированную задачу
await cancelScheduledJob(ctx, taskId) // taskId — number
```

### Конвертация типов taskId

taskId возвращается как `number`. Если нужно хранить в Heap-таблице в строковом поле:

```ts
// При сохранении: число → строка
const taskId = await myJob.scheduleJobAfter(ctx, 10, 'minutes', params)
await TasksTable.create(ctx, { taskId: String(taskId) })

// При отмене: строка → число
const taskIdNumber = parseInt(taskIdString, 10)
await cancelScheduledJob(ctx, taskIdNumber)
```

## Паттерны

- Логировать старт и завершение в теле job через `ctx.account.log()`.
- params — только сериализуемые данные (без функций, символов).
- Долгие операции в роутах выносить в job и вызывать `scheduleJobAsap`.
- Делать задачи идемпотентными: проверять статус перед выполнением.
- Использовать try/catch для обработки ошибок в теле job.

## Антипаттерны

**setTimeout/setInterval НЕ доступны на сервере Chatium:**

```ts
// Неправильно — setTimeout не существует на сервере
const myJob = app.job('/my-job', async (ctx, params) => {
  await new Promise((resolve) => setTimeout(resolve, 1000)) // ОШИБКА!
})

// Правильно — использовать scheduleJobAfter для задержки
await delayedJob.scheduleJobAfter(ctx, 1, 'seconds', params)
```

**Deprecated API из `@app/jobs`** — не использовать глобальные функции `scheduleJobAfter/scheduleJobAsap/scheduleJobAt` из `@app/jobs` напрямую (принимают `url` отдельным параметром, возвращают `Promise<string>`). Современный вариант — методы экземпляра задачи через `app.job(...)`.

## Чеклист

- [ ] Задача определена через `app.job('/path', async (ctx, params) => { ... })`
- [ ] Планирование использует `await`: `await job.scheduleJobAfter(...)` / `await job.scheduleJobAsap(...)` / `await job.scheduleJobAt(...)`
- [ ] При необходимости отмены — сохранять taskId и передавать в `cancelScheduledJob` как число
- [ ] `cancelScheduledJob` импортирован из `@app/jobs`
- [ ] При хранении taskId в строковом Heap-поле: `String(taskId)` при записи, `parseInt(str, 10)` при отмене
- [ ] Логирование через `ctx.account.log()` в начале и конце job
- [ ] Нет `setTimeout`/`setInterval` в теле job

## Ссылки на документацию

- **005-jobs.md** — отложенные задачи, единицы времени, примеры, частые ошибки, лучшие практики

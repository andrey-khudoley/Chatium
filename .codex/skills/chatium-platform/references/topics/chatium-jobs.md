# chatium-jobs

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-jobs/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/005-jobs.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-jobs
description: Отложенные задачи в Chatium — app.job(), scheduleJobAfter, scheduleJobAsap, scheduleJobAt, cancelScheduledJob. Использовать при планировании выполнения кода с задержкой или на время.
---

# chatium-jobs

Отложенные задачи (jobs): определение через `app.job()`, планирование через scheduleJobAfter/Asap/At, отмена по taskId. Использовать для напоминаний, отложенной отправки, рекуррентных операций, фоновой обработки.

## Когда использовать

- Отложенные уведомления и напоминания
- Отложенная отправка email/SMS
- Реккурентные платежи и подписки
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

Параметры `params` — произвольный сериализуемый объект, передаётся при планировании.

## Планирование

- **scheduleJobAfter(ctx, amount, unit, params)** — через время. unit: 'seconds' | 'minutes' | 'hours' | 'days'. Возвращает taskId.
- **scheduleJobAsap(ctx, params)** — асинхронно, как можно скорее.
- **scheduleJobAt(ctx, date, params)** — на конкретную дату (Date).

```ts
const taskId = reminderJob.scheduleJobAfter(ctx, 30, 'minutes', { userId, message })
reminderJob.scheduleJobAsap(ctx, { orderId })
reminderJob.scheduleJobAt(ctx, new Date('2025-12-01T12:00:00Z'), { id: 'x' })
```

## Отмена

- **cancelScheduledJob(ctx, taskId)** — отменить запланированную задачу по taskId, возвращённому при планировании.

## Паттерны

- Логировать старт и завершение в теле job через ctx.account.log().
- params — только сериализуемые данные (без функций, символов).
- Долгие операции в роутах выносить в job и вызывать scheduleJobAsap.

## Чеклист

- [ ] Задача определена через app.job('/path', async (ctx, params) => { ... })
- [ ] Планирование: scheduleJobAfter / scheduleJobAsap / scheduleJobAt
- [ ] При необходимости отмены — сохранять и передавать taskId в cancelScheduledJob
- [ ] Логирование через ctx.account.log()

## Ссылки на документацию

- **005-jobs.md** — отложенные задачи, единицы времени, примеры, лучшие практики

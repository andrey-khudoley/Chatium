# chatium-payments

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-payments/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/017-payments.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

# chatium-payments

## Description

Реализует платежи в Chatium: runAttemptPayment, автосписание через attemptAutoCharge, сохранённые карты. Использовать при добавлении оплаты.

## Основные методы (@pay/sdk)

- **runAttemptPayment(ctx, { amount, items, ... })** — разовый платёж
- **attemptAutoCharge(ctx, { ... })** — автосписание
- **getSavedCards(ctx, userId)** — сохранённые карты

## Джоб для автосписания

```ts
const autoChargeJob = app.job('auto-charge', async (ctx, data) => {
  // логика автосписания
})

scheduleJobAfter(ctx, autoChargeJob, { days: 30 }, { userId })
```

## Чеклист

- Разовый платёж через runAttemptPayment с указанием amount и items
- Автосписание через attemptAutoCharge и джоб с scheduleJobAfter
- Сохранённые карты через getSavedCards при необходимости
- Обработка ошибок оплаты и повторные попытки по документации

## Ссылки на документацию

- **017-payments.md** — полный гайд по платежам
- **005-jobs.md** — джобы для расписания автосписания

## Примеры

Готовых примеров в samples нет; паттерны описаны в 017-payments.md.

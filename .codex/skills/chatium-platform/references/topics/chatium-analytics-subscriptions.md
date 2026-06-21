# chatium-analytics-subscriptions

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-analytics-subscriptions/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/016-analytics-subscriptions.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-analytics-subscriptions
description: Подписки на события в Chatium — subscribeToMetricEvents, metric-event хук, Heap-подписки, WebSocket. Использовать для real-time получения событий (GetCourse и др.).
---

# chatium-analytics-subscriptions

Подписка на события (GetCourse и другие источники): **subscribeToMetricEvents** и обработка через хук **metric-event**. Встроенный механизм может работать нестабильно; рабочий вариант — проект Events Subscribe (Heap-таблица подписок + Job + WebSocket).

## Когда использовать

- Получение событий GetCourse (user/created, deal/created и др.) в реальном времени
- Кастомная обработка при наступлении события
- Мониторинг через WebSocket в браузере

## subscribeToMetricEvents

```ts
import { subscribeToMetricEvents, unsubscribeFromMetricEvents } from '@app/metric'

await subscribeToMetricEvents(ctx, ['event://getcourse/user/created'])
await unsubscribeFromMetricEvents(ctx, ['event://getcourse/user/created'])
```

## Хук metric-event

- **app.accountHook('metric-event', async (ctx, { event }) => { ... })** — обработка приходящих событий. Для GetCourse событий может не срабатывать стабильно (см. док).

## Альтернатива: Events Subscribe проект

- Хранить подписки в Heap-таблице.
- Job периодически опрашивает события (например, через gcQueryAi) и отправляет данные в WebSocket (sendDataToSocket).
- Реализация в dev/events-subscribe.

## Чеклист

- [ ] При использовании встроенного: subscribeToMetricEvents + хук metric-event
- [ ] При необходимости стабильной доставки: Heap подписки + Job + WebSocket по образцу Events Subscribe
- [ ] Импорт из @app/metric

## Ссылки на документацию

- **016-analytics-subscriptions.md** — subscribeToMetricEvents, metric-event, Events Subscribe, WebSocket мониторинг

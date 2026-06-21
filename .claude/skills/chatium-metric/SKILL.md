---
name: chatium-metric
description: Модуль @app/metric в Chatium — writeMetricEvent, writeAccessLog, subscribeToMetricEvents. Использовать для низкоуровневых метрик и подписки на события.
---

# chatium-metric

Низкоуровневый API платформы для метрик и логов. Модуль `@app/metric`. Запись метрик (writeMetricEvent), access log (writeAccessLog), событийные логи (writeEventLog), подписка на события метрик (subscribeToMetricEvents).

## Когда использовать

- Запись метрик приложения (prepareMetricEvent, writeMetricEvent)
- Access log приложения или хоста (writeAccessLog, writeAppHostAccessLog)
- Подписка на события метрик (subscribeToMetricEvents); отписка (unsubscribeFromMetricEventsGroup, unsubscribeFromMetricEvents)
- Десериализация записи события (deserializeMetricEventRecord)

## Основные экспорты

- **prepareMetricEvent(ctx, rewrite?)** / **writeMetricEvent(ctx, data?)** — подготовка и запись метрики приложения.
- **prepareAppHostMetricEvent** / **writeAppHostMetricEvent** — метрики хоста приложения.
- **subscribeToMetricEvents(ctx, options)** — подписка на события метрик (возвращает группу по groupKey).
- **unsubscribeFromMetricEventsGroup(ctx, groupKey)** / **unsubscribeFromMetricEvents(ctx, urlPaths)** — отписка.
- **prepareAccessLog** / **writeAccessLog** — access log приложения.
- **prepareAppHostAccessLog** / **writeAppHostAccessLog** — access log хоста.
- **writeEventLog** / **writeAppHostEventLog** — запись событийного лога.
- **deserializeMetricEventRecord** (реэкспорт deserializeEvent) — десериализация записи события.
- **MetricEventData**, **MetricEventRecord** — типы данных метрик.

Источник типов: `node_modules/@app/metric/index.d.ts`

## Чеклист

- [ ] Импорт из `@app/metric`
- [ ] Для событий workspace предпочтительно `writeWorkspaceEvent` из `@start/sdk` (016-analytics-workspace.md)
- [ ] Подписки на GetCourse — см. 016-analytics-subscriptions.md (subscribeToMetricEvents + хук metric-event нестабильны; рабочий вариант — Heap + Job + WebSocket)

## Ссылки на документацию

- **038-metric.md** — @app/metric (основной справочник)
- **016-analytics-workspace.md** — writeWorkspaceEvent, события workspace, хук @start/after-event-write
- **016-analytics-subscriptions.md** — subscribeToMetricEvents, хук metric-event, рабочая реализация через Heap+Job+WebSocket

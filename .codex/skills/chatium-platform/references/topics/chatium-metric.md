# chatium-metric

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-metric/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/038-metric.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

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

- **prepareMetricEvent**, **writeMetricEvent** — метрики приложения.
- **prepareAppHostMetricEvent**, **writeAppHostMetricEvent** — метрики хоста.
- **subscribeToMetricEvents(ctx, options)** — подписка (возвращает groupKey).
- **unsubscribeFromMetricEventsGroup(ctx, groupKey)** / **unsubscribeFromMetricEvents(ctx, urlPaths)** — отписка.
- **prepareAccessLog**, **writeAccessLog** — access log.
- **writeEventLog**, **writeAppHostEventLog** — событийные логи.
- **MetricEventData**, **MetricEventRecord** — типы.

## Чеклист

- [ ] Импорт из @app/metric
- [ ] Для событий workspace предпочтительно writeWorkspaceEvent (016-analytics-workspace)
- [ ] Подписки на GetCourse — см. 021-getcourse-events.md

## Ссылки на документацию

- **038-metric.md** — @app/metric
- **016-analytics-workspace.md**, **021-getcourse-events.md**

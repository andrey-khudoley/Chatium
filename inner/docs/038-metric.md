@chatium

# Модуль @app/metric: Метрики и события платформы

Краткий справочник по модулю `@app/metric` — запись метрик, access log, подписка на события метрик. Типизация: `node_modules/@app/metric/index.d.ts`. События workspace и аналитика в приложении: [016-analytics-workspace.md](016-analytics-workspace.md) и др.

## Содержание

- [Назначение](#назначение)
- [Основные экспорты](#основные-экспорты)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/metric** — низкоуровневый API платформы для метрик и логов: подготовка и запись метрик (prepareMetricEvent, writeMetricEvent), access log (prepareAccessLog, writeAccessLog), событийные логи (writeEventLog), подписка на события метрик (subscribeToMetricEvents, unsubscribeFromMetricEvents). Типы: MetricEventJson, MetricEventRecord, MetricEventData.

---

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

---

## Связанные документы

- [016-analytics-workspace.md](016-analytics-workspace.md) — writeWorkspaceEvent, события workspace
- [021-getcourse-events.md](021-getcourse-events.md) — subscribeToMetricEvents, metric-event
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/metric/index.d.ts`

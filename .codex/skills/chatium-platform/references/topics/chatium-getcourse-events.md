# chatium-getcourse-events

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-getcourse-events/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/021-getcourse-events.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-getcourse-events
description: Подписка на события GetCourse в Chatium — subscribeToMetricEvents, metric-event хуки. Только для Chatium на стороне GetCourse.
---

# chatium-getcourse-events

Получение событий GetCourse в реальном времени через подписку и хуки. **Важно:** использовать только при явной ссылке на инструкцию и только когда Chatium развёрнут на стороне GetCourse (не произвольный аккаунт).

## Когда использовать

- Реакция на события GetCourse (уроки, сделки, контакты, формы, опросы, чатботы) в режиме реального времени
- Только в сценариях «Chatium на стороне GetCourse» (см. 021-getcourse-events.md)

## Подписка и хуки

- **subscribeToMetricEvents(ctx, urlPaths)** — подписаться на события (например, event://getcourse/...).
- **app.accountHook('metric-event', handler)** — общий хук для всех подписанных событий.
- **app.accountHook('metric-event-event://getcourse/...', handler)** — хук для конкретного события.
- **app.pluginHook()** — хуки в плагинах GetCourse Store.
- **transformGcEventParams** — нормализация параметров события.

## Поддерживаемые события

- lesson answers, conversation/addedMessage, dealCreated, dealPaid, contact/created, form/sent, survey/answerCreated, chatbot/vk_enabled, chatbot/telegram_enabled и др. (см. док).

## Разница event:// и metric-event-event://

- event:// — идентификатор типа события при подписке.
- metric-event-event://getcourse/... — имя хука для обработки конкретного события.

## Чеклист

- [ ] Убедиться, что сценарий «Chatium на стороне GetCourse»
- [ ] subscribeToMetricEvents с нужными urlPaths
- [ ] Обработчик в accountHook('metric-event', ...) или metric-event-event://getcourse/...
- [ ] При необходимости transformGcEventParams для нормализации

## Ссылки на документацию

- **021-getcourse-events.md** — подписка на события GetCourse, типы хуков, рекомендуемый паттерн (если файл есть в проекте)
- **016-analytics-subscriptions.md** — subscribeToMetricEvents в общем контексте

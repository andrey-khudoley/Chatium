# Техническая спецификация `tg-copy`

Самодостаточная спецификация для воссоздания Telegram-подобного мессенджера на платформе Chatium. Цель: ИИ-агент, получив **только этот каталог `spec/`**, реализует функционально идентичный проект без обращения к исходникам и без додумываний.

## Соответствие платформе

Спецификация приведена в соответствие правилам workspace и `inner/docs/` — она предписывает **корректный** способ, а не поведение исходного sample. Обязательные правила — в [01-platform.md](01-platform.md). Чеклист «что в приложении уже соответствует / что не реализовано или сделано неправильно» — в **[../diff.md](../diff.md)**.

## Как читать

Читай по порядку. Файлы 00–01 задают контекст и платформенные правила; 02–09 — серверную часть (данные + API); 10 — real-time; 11–14 — фронтенд; 15 — порядок сборки.

| # | Файл | Содержание |
| --- | --- | --- |
| 00 | [00-overview.md](00-overview.md) | Что строим, стек, глоссарий, соглашения |
| 01 | [01-platform.md](01-platform.md) | Инварианты Chatium: routing, heap, feed, socket, auth, money |
| 02 | [02-data-model.md](02-data-model.md) | Все 19 таблиц: поля, типы, синтаксис объявления |
| 03 | [03-shared-and-lib.md](03-shared-and-lib.md) | `shared/*`, `lib/*`, `tools/*`, `agent-tools.ts` — сигнатуры и алгоритмы |
| 04 | [04-api-core-messaging.md](04-api-core-messaging.md) | chats, messages, participants, invites, reactions, typing, pinned, read-*, search, files, system-messages |
| 05 | [05-api-folders-pins.md](05-api-folders-pins.md) | chat-folders, pinned-chats, chat-filter-orders, inbox-badges |
| 06 | [06-api-subscriptions-payments.md](06-api-subscriptions-payments.md) | тарифы, подписки, `@pay/sdk`, callbacks, jobs, admin-grant |
| 07 | [07-api-agents.md](07-api-agents.md) | agents, agents-migration, direct-chats, обработка сообщений агентами |
| 08 | [08-api-misc.md](08-api-misc.md) | profile, users, blocked-users, chat-actions, moderation, privacy, voice-transcriptions, app-settings |
| 09 | [09-api-push.md](09-api-push.md) | push/*, lib/jwt-rs256, firebase, service worker |
| 10 | [10-realtime-websocket.md](10-realtime-websocket.md) | каналы, события, payload, нормализация |
| 11 | [11-frontend-architecture.md](11-frontend-architecture.md) | index.tsx, App.vue, routing, паттерн вызова API |
| 12 | [12-composables.md](12-composables.md) | 9 composables: API и алгоритмы |
| 13 | [13-components.md](13-components.md) | каталог ~57 компонентов: props/emits/состояние |
| 14 | [14-design-system.md](14-design-system.md) | CSS-переменные, темы, классы, PWA-манифест |
| 15 | [15-build-order.md](15-build-order.md) | пошаговый порядок реализации |

## Объём (вне спеки)

Федеративные чаты (`fed-docs/`) — **не часть** этого проекта. Спека описывает только реализованный функционал.

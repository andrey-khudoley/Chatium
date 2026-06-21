---
name: chatium-inbox
description: Модуль @app/inbox в Chatium — getInboxData, updateInbox, resetInboxBadge. Использовать для ленты инбокса и пуш-уведомлений (в т.ч. без фида).
---

# chatium-inbox

Работа с инбоксом пользователя: лента элементов (уведомления, диалоги), обновление элемента с пушем, сброс бейджа. Модуль `@app/inbox`. Элементы могут приходить из фидов (getInboxInfo) или создаваться напрямую через updateInbox.

## Когда использовать

- Отображение ленты инбокса в UI
- Обновление элемента инбокса и отправка пуш-уведомления (в т.ч. без фида)
- Сброс счётчика бейджа по subjectId или url

## API

- **getInboxData(ctx, userOrId, { flat?: boolean })** — данные инбокса: items (UgcInboxOld[]), socketIds для real-time.
- **updateInbox(ctx, userId, params)** — обновить инбокс и при необходимости отправить пуш. Параметры: url, title, description, subjectId, icon, badge, data, sendPush, withSound, pushImageUrl.
- **resetInboxBadge(ctx, userOrId, { subjectId } | { url })** — сбросить бейдж по subjectId или url; элемент не создаётся, если не найден — без изменений.

## Связь с фидами

- Фиды могут отдавать элементы инбокса через getInboxInfo / getParticipantInboxInfo (019-feed.md).

## Чеклист

- [ ] Импорт getInboxData, updateInbox, resetInboxBadge из @app/inbox
- [ ] getInboxData для отображения ленты; при необходимости flat: true
- [ ] updateInbox для обновления и пуша; resetInboxBadge при переходе/прочтении

## Ссылки на документацию

- **025-inbox.md** — @app/inbox, типы UgcInboxData, связь с фидами
- **019-feed.md** — inbox-хуки фида

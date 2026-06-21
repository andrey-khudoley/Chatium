# chatium-analytics-workspace

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-analytics-workspace/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/016-analytics-workspace.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-analytics-workspace
description: События workspace в Chatium — writeWorkspaceEvent, регистрация типов, хук @start/after-event-write, UTM. Использовать для записи конверсионных и пользовательских событий.
---

# chatium-analytics-workspace

Запись событий приложения для аналитики: `writeWorkspaceEvent(ctx, eventName, eventData)`. События попадают в ClickHouse; хук `@start/after-event-write` позволяет обработать запись (например, создать запись в Heap).

## Когда использовать

- Регистрация пользователя, отправка формы, заявка, покупка
- Конверсионные и важные действия пользователя
- Отслеживание с UTM-метками (uid, clrtUid, clrtTrack на клиенте)

## Запись события

```ts
import { writeWorkspaceEvent } from '@start/sdk'

await writeWorkspaceEvent(ctx, 'registration', {
  user: { email, firstName, lastName },
  action_param1: user.id,
  uid: req.body.clrtUid
})
```

- **eventName** — строка (camelCase), тип события.
- **eventData** — объект с данными (user, uid, action_param1 и др. по контракту).

## Регистрация типов событий

- **getWorkspaceEventUrl** — регистрация типов событий для workspace (по документации платформы).

## Хук после записи

- **@start/after-event-write** — вызывается после записи события; можно дублировать в Heap или обрабатывать логику.

## Клиентские события

- На клиенте: `window.clrtTrack`, `window.clrtUid` для передачи uid и трекинга (см. 016-analytics-workspace.md).

## Чеклист

- [ ] Импорт writeWorkspaceEvent из @start/sdk
- [ ] Вызов writeWorkspaceEvent после конверсионного действия с осмысленным eventName и eventData
- [ ] При необходимости: хук @start/after-event-write для обработки
- [ ] UTM/uid в eventData при наличии на клиенте

## Ссылки на документацию

- **016-analytics-workspace.md** — запись событий, структура, пагинация, лучшие практики

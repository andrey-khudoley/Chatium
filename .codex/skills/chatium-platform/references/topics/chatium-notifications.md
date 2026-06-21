# chatium-notifications

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-notifications/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/015-notifications.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-notifications
description: Уведомления администраторов в Chatium — sendNotificationToAccountOwners из @user-notifier/sdk. Использовать для оповещения владельцев аккаунта.
---

# chatium-notifications

Отправка уведомлений всем владельцам аккаунта (админам) через `sendNotificationToAccountOwners`. Поддержка HTML, Markdown и Plain text.

## Когда использовать

- Новая заявка или форма от пользователя
- Новый заказ
- Критическая ошибка в системе
- Важное системное событие
- Контактные данные от посетителя
- Не для обычных логов и не для частых событий

## API

```ts
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'

await sendNotificationToAccountOwners(ctx, {
  title: 'Заголовок уведомления',
  html: '<p>HTML версия</p>',
  plain: 'Plain text версия',
  md: '**Markdown** версия'
})
```

- **title** — обязателен.
- Указать хотя бы один из: **html**, **plain**, **md**.

## Ограничения

- Импорт `@user-notifier/sdk` только в папке `/api/`.
- Не использовать в Vue-компонентах и shared-файлах.

## Паттерны

- Для заявок/заказов: краткий title + детали в html/md/plain.
- При ошибках: включить контекст (id, тип операции) для отладки.

## Чеклист

- [ ] Импорт только в api/
- [ ] Указаны title и хотя бы один формат (html, plain, md)
- [ ] Вызов в нужный момент (после создания заявки, при ошибке и т.д.)

## Ссылки на документацию

- **015-notifications.md** — sendNotificationToAccountOwners, форматы, примеры

@chatium

# Модуль @app/inbox: Инбокс пользователя в Chatium

Краткое руководство по модулю `@app/inbox` для работы с лентой элементов инбокса (уведомления, диалоги, задачи) в UGC. Документ опирается на типизацию `node_modules/@app/inbox/index.d.ts`. Связь инбокса с фидами описана в [019-feed.md](019-feed.md#inbox-и-хуки-фида).

## Содержание

- [Назначение модуля](#назначение-модуля)
- [Экспортируемые функции](#экспортируемые-функции)
  - [getInboxData](#getinboxdata)
  - [updateInbox](#updateinbox)
  - [resetInboxBadge](#resetinboxbadge)
- [Типы данных](#типы-данных)
- [Связь с фидами](#связь-с-фидами)
- [Связанные документы](#связанные-документы)

---

## Назначение модуля

**@app/inbox** — модуль для работы с инбоксом пользователя: получение списка элементов (лента диалогов/уведомлений), обновление элемента с пуш-уведомлением и сброс счётчика бейджа. Элементы инбокса могут приходить из фидов (через хуки getInboxInfo / getParticipantInboxInfo) или создаваться напрямую через `updateInbox` без использования фидов.

### Когда использовать

- Получение ленты инбокса пользователя для отображения в UI
- Обновление элемента инбокса и отправка пуш-уведомления (в т.ч. без фида)
- Сброс бейджа по subjectId или url

---

## Экспортируемые функции

### getInboxData

Возвращает данные инбокса пользователя: массив элементов и массив идентификаторов сокетов для real-time обновлений.

```ts
import { getInboxData } from '@app/inbox'

const data = await getInboxData(ctx, ctx.user, { flat: true })
// data.items — массив UgcInboxOld
// data.socketIds — string[]
```

**Сигнатура (по index.d.ts):**

- `_ctx: RichUgcCtx` — UGC-контекст
- `userOrId: UgcCtxUser1 | UgcSmartUser | string | undefined` — пользователь или его id
- `options?: { flat?: boolean }` — опция плоского формата

**Возвращает:** `Promise<UgcInboxData>`

---

### updateInbox

Обновляет инбокс пользователя и при необходимости отправляет пуш-уведомление. Позволяет делать уведомления без использования фидов.

```ts
import { updateInbox } from '@app/inbox'

await updateInbox(ctx, userId, {
  url: '/chat/support',
  subjectId: 'support_chat_1',
  title: 'Новое сообщение',
  description: 'Вам написали в поддержку',
  badge: 1,
  sendPush: true
})
```

**Параметры (UgcUpdateInboxParams):** `url`, `title`, `description`, опционально `subjectId`, `icon`, `badge`, `data`, `sendPush`, `withSound`, `pushImageUrl`.

**Возвращает:** `Promise<UgcInbox>`

---

### resetInboxBadge

Сбрасывает счётчик бейджа у элемента инбокса по `subjectId` или `url`. Не создаёт и не меняет порядок элементов; если элемент не найден — ничего не происходит.

```ts
import { resetInboxBadge } from '@app/inbox'

await resetInboxBadge(ctx, userId, { subjectId: 'support_chat_1' })
// или
await resetInboxBadge(ctx, userId, { url: '/chat/support' })
```

**Параметры (ResetInboxBadgeParams):** либо `{ url: string, subjectId?: string | null }`, либо `{ url?: string | null, subjectId: string }`.

**Возвращает:** `Promise<UgcInbox | null>`

---

## Типы данных

- **UgcInboxData** — `{ items: UgcInboxOld[], socketIds: string[] }`
- **UgcInboxOld** — элемент ленты: `id`, `auth_id`, `account_id`, `title`, `description`, `icon`, `status`, `badge`, `subject_id`, `url`, `updated_at`, `archived_at`, `pinned_at`, `data`
- **UgcInboxIcon** — `name?`, `url?`, `text?`, `color?`, `bgColor?` (PlainIconName и др.)

---

## Связь с фидами

Фид может быть источником элемента инбокса. В этом случае в фиде задаются поля `inboxSubjectId` (model_id), `inboxUrl`, `inboxExtraData` и хуки `getInboxInfo` / `getParticipantInboxInfo`. При событиях в фиде (новое сообщение, mark as read и т.д.) платформа вызывает эти хуки и обновляет соответствующий элемент инбокса по subjectId.

Обновлять инбокс можно и без фида — через `updateInbox`. Подробнее про inbox и хуки фида: [019-feed.md — Inbox и хуки фида](019-feed.md#inbox-и-хуки-фида).

---

## Связанные документы

- [019-feed.md](019-feed.md) — фиды, чаты, getInboxInfo / getParticipantInboxInfo
- [000-summ.md](000-summ.md) — навигатор по документации

**Источник типов:** `node_modules/@app/inbox/index.d.ts`

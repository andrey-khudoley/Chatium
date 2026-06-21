---
name: chatium-telegram
description: Интеграция Chatium с Telegram — Web App с авторизацией, хуки для обработки сообщений, отправка через @sender или напрямую. Использовать при работе с Telegram.
---

# chatium-telegram

Интеграция Chatium с Telegram: Web App с авторизацией, хуки для обработки сообщений, отправка через @sender или напрямую.

## Telegram Web App (web-app.tsx)

- Отдельный роут с `requireRealUser(ctx)` — [003-auth.md](../../../inner/docs/003-auth.md)
- Мета-теги Telegram SDK для инициализации Web App
- CSS-переменные `--tg-theme-*` для оформления под тему клиента Telegram
- Vue компонент для Web App интерфейса — [007-vue.md](../../../inner/docs/007-vue.md)

**Пример структуры:**

```typescript
import { requireRealUser } from '@app/auth'

export const webAppRoute = app.html('/', async (ctx) => {
  requireRealUser(ctx)

  return {
    // Telegram Web App будет отображена здесь
  }
})
```

## Хуки для обработки сообщений (transport/hook.ts)

Обработка входящих сообщений из Telegram через хук `@sender/message-received`:

```typescript
app.accountHook('@sender/message-received', async (ctx, params) => {
  const { channel, chatId, person, user, message } = params

  // Фильтрация по каналу
  if (channel.id !== 'your-telegram-channel-id') {
    return
  }

  // Обработка входящего сообщения
  ctx.account.log('Входящее сообщение', {
    level: 'info',
    json: { chatId, text: message.text }
  })
})
```

## Связь с AI-агентом

При необходимости интегрировать с агентом — [010-agents.md](../../../inner/docs/010-agents.md):

- `getOrCreateAgentForWorkspace(ctx, key, {...})` — создание или получение агента
- `pushMessageToChain(ctx, {...})` — отправка сообщения в цепочку диалога агента
- `startCompletion(ctx, {...})` — запуск генерации ответа

**Пример:**

```typescript
import { pushMessageToChain } from '@ai-agents/sdk/process'

await pushMessageToChain(ctx, {
  chainKey: 'telegram_bot',
  message: 'Пользователь сказал: ' + message.text,
  metadata: { chatId, personId: person?.id }
})
```

## Отправка сообщений

### Через @sender (рекомендуется)

Использование модуля `@sender/sdk` — [012-sender.md](../../../inner/docs/012-sender.md):

```typescript
import { sendMessageToChat, findPersons, getChannels } from '@sender/sdk'

// Отправка сообщения в чат
const result = await sendMessageToChat(ctx, chatId, {
  text: 'Привет! Это сообщение из Chatium',
  parse_mode: 'HTML'
})

// Получение списка каналов
const channels = await getChannels(ctx)

// Поиск профилей
const persons = await findPersons(ctx, {
  search: 'username',
  channelIds: ['telegram_channel']
})
```

### Прямой вызов Telegram Bot API

Для специфичных операций используйте `runTelegramApi`:

```typescript
import { runTelegramApi } from '@sender/sdk'

const [success, result, error] = (await runTelegramApi(ctx, chatId, 'sendMessage', {
  text: 'Сообщение через Telegram API',
  parse_mode: 'HTML'
})) || [false, null, 'No response']

if (success) {
  ctx.account.log('Отправлено', { json: result })
} else {
  ctx.account.log('Ошибка', { level: 'error', json: { error } })
}
```

Доступные методы Telegram Bot API: `sendMessage`, `editMessageText`, `deleteMessage`, `sendPhoto`, и др.

## Чек-лист

- [ ] Web App: роут с `requireRealUser(ctx)`, мета-теги Telegram SDK
- [ ] CSS-переменные `--tg-theme-*` для оформления
- [ ] Transport: хук `@sender/message-received` для обработки входящих сообщений
- [ ] Связь с агентом (при необходимости): `pushMessageToChain`, `startCompletion`
- [ ] Отправка сообщений: `sendMessageToChat` или `runTelegramApi`
- [ ] Логирование через `ctx.account.log()` вместо `console.log()`
- [ ] Авторизация пользователей через `requireRealUser(ctx)`

## Ссылки на документацию

- **003-auth.md** — авторизация пользователей, `requireRealUser()`, проверка ролей
- **007-vue.md** — Vue компоненты для Web App интерфейса
- **010-agents.md** — создание AI-агента, связь с Telegram
- **012-sender.md** — модуль @sender, работа с каналами, отправка сообщений в Telegram, VK, Email

## Примеры проектов

- `inner/samples/imported/ai-agent-kak-bot-v-telegram-s-miniapp/` — агент в Telegram с MiniApp
- `inner/samples/imported/telegram-miniapp/` — Telegram MiniApp
- `tg/pa_sample/transport/` — пример обработки входящих сообщений

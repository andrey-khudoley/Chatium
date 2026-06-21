# chatium-sender

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-sender/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/012-sender.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-sender
description: Модуль @sender в Chatium — каналы, чаты, Person, sendMessageToChat, теги, хуки входящих сообщений. Использовать при работе с мессенджерами (Telegram, VK, Email).
---

# chatium-sender

Работа с каналами коммуникации: Telegram, VK, Email и др. Отправка сообщений, получение каналов и профилей (Person), теги, обработка входящих сообщений через хуки.

## Когда использовать

- Отправка уведомлений в мессенджеры
- Обработка входящих сообщений (боты)
- Управление чатами и профилями (Person)
- Сегментация по тегам
- Интеграция с Telegram/VK/Email

## Основные сущности

- **Channel** — канал связи (бот, группа, email)
- **Chat** — чат с историей сообщений, связь с Person
- **Person** — профиль пользователя канала (свойства, теги, связь с User)

## Отправка сообщений

- **sendMessageToChat(ctx, chatId, { text, ... })** — отправить сообщение в чат (из `@sender` или SDK).
- Работа с каналами: **getChannels()** — список каналов.
- Поиск профилей: **findPersons()** — по внешним ID, тегам и т.д.

## Подписка на входящие сообщения

- Хук **@sender/message-received** — адрес должен быть точно таким.
- В параметрах: channel, chatId, person, user, message, sourcePayload.
- Рекомендуется фильтровать по channel.id.

```ts
app.accountHook('@sender/message-received', async (ctx, params) => {
  if (params.channel.id !== 'your-channel-id') return
  const { chatId, message } = params
  // обработка message.text, отправка ответа через sendMessageToChat
})
```

## Паттерны

- Теги и сегментация — для рассылок и фильтрации Person.
- Бакеты и стартовые параметры — для deep links и UTM.
- Логирование через ctx.account.log().

## Чеклист

- [ ] Импорт методов из @sender (или SDK) только там, где разрешено
- [ ] Отправка: sendMessageToChat(ctx, chatId, { text })
- [ ] Входящие: хук @sender/message-received, фильтр по каналу
- [ ] При необходимости: getChannels, findPersons, теги

## Ссылки на документацию

- **012-sender.md** — модуль @sender, каналы, чаты, Person, теги, Telegram/VK

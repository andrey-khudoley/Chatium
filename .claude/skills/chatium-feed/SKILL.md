---
name: chatium-feed
description: Работа с фидами, чатами и омниканальностью (веб + Telegram) через @app/feed и @sender
---

# chatium-feed

Модуль для работы с фидами (лентами сообщений), чатами и омниканальной переписки в Chatium. Единый источник правды по истории диалогов.

## Основные методы (@app/feed)

- **getFeedById(ctx, feedId)** — получение фида по UID
- **createFeed(ctx, props)** — создание фида с опциональными хуками
- **updateFeed(ctx, props)** — обновление фида
- **deleteFeed(ctx, feedId)** — удаление фида
- **getChat(ctx, feedOrUid, options)** — получение конфигурации чата для веб-клиента
- **createFeedMessage(ctx, feedOrUid, authorId, messageData, options)** — создание сообщения
- **findFeedMessages(ctx, feedOrUid, options)** — получение сообщений с пагинацией
- **findMessagesByExternalId(ctx, feedOrUid, externalId)** — поиск по внешнему ID (для Telegram)
- **updateFeedMessage(ctx, feedOrUid, messageId, updates)** — обновление сообщения
- **deleteFeedMessage(ctx, feedOrUid, messageId)** — удаление сообщения

## Основные паттерны

- **Один фид на диалог** — фид как канонический источник правды по переписке
- **Участники (Participant)** — привязка пользователей к фиду с ролями и настройками
- **Внешние ID (external_id, origin_id, origin_type)** — для омниканальности (веб + Telegram в одном фиде)
- **getChat** — передача конфигурации на клиент для отображения чата
- **HTTP-обработчики** — feedMessagesGetHandler, feedMessagesChangesHandler, feedMessagesAddHandler для API чата
- **Сообщения с типами** — Message, System, Blocks, Change
- **Дедупликация** — использование external_id для поиска существующих сообщений перед созданием

## Омниканальность (веб + Telegram)

1. **Входящее из Telegram:** при получении сообщения создаётся запись в фиде через `createFeedMessage` с `external_id = String(telegramMessageId)`, `origin_type = 'telegram'`, `origin_id = String(chatId)`
2. **Исходящее в Telegram:** после создания сообщения в фиде и отправки в Telegram вызывается `updateFeedMessage` для записи `external_id` ответа
3. **Поиск по событиям:** через `findMessagesByExternalId` находим сообщение в фиде по ID из Telegram
4. **Единый ID:** везде в приложении передаётся только feed message `id`, при обращении к каналу читаем `external_id`

## Связь с @sender

- **@app/feed** — хранилище диалогов и сообщений; не отправляет во внешние каналы
- **@sender** — отправка в мессенджеры (Telegram, VK, Email), приём входящих, управление чатами
- **Сценарий интеграции:**
  1. Определить фид и автора по входящему событию
  2. Создать сообщение в фиде через `createFeedMessage` с external_id / origin_type
  3. Отправить контент через `sendMessageToChat` (@sender/sdk)
  4. Обновить сообщение фида с внешним ID ответа

## Чеклист при реализации чата с фидом

- Получение фида через `getFeedById(ctx, feedId)` или создание через `createFeed(ctx, props)`
- Получение конфигурации чата через `getChat(ctx, feedOrUid, options)` и передача на клиент
- Настройка HTTP-обработчиков: `feedMessagesGetHandler`, `feedMessagesChangesHandler`, `feedMessagesAddHandler`
- При интеграции с Telegram: использовать `external_id`, `origin_id`, `origin_type` для омниканальности
- Использование `findMessagesByExternalId` для поиска сообщений по ID мессенджера
- Логирование важных действий через `ctx.account.log()`
- Проверка доступа перед отдачей данных клиенту (передавать `checkAccess: true` в обработчики)

## Важные детали

- **Лимит выборки:** не более 1000 сообщений за один запрос в `findFeedMessages`; для длинных историй использовать режим `around` и пагинацию на клиенте
- **Режимы пагинации:** `head` (с начала), `tail` (с конца), `around` (вокруг сообщения)
- **Участники:** через `getOrCreateParticipant` или `createOrUpdateFeedParticipant` привязываем пользователей к фиду
- **Прочтение:** `feedParticipantsMarkAsReadHandler`, `feedParticipantsLastReadHandler` для отслеживания прочтения
- **Хуки фида:** getInboxInfo, getParticipantInboxInfo — для отображения в ленте диалогов (inbox)

## Ссылки на документацию

- **019-feed.md** — полная документация модуля @app/feed
- **012-sender.md** — полная документация модуля @sender
- **002-routing.md** — организация роутов для getChat и обработчиков сообщений
- **014-socket.md** — real-time обновления (комбинируется с фидом для живого чата)

## Примеры

- `tg/pa_sample/` — чат с AI-агентом через фид
- `p/units/chatiumclub/` — омниканальный чат веб + Telegram

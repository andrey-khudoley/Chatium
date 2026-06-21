# chatium-feed

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-feed/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/019-feed.md; inner/docs/025-inbox.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

# chatium-feed

## Description

Работа с фидами Chatium: getChat, HTTP-обработчики, омниканальность (веб + Telegram), связь с @sender. Использовать при реализации чатов и лент.

## Основные методы (@app/feed)

- **getChat(ctx, chatId)** — получение чата
- HTTP-обработчики для сообщений
- Внешние ID (**external_id**) для омниканальности (веб и Telegram в одном чате)
- Связь с **@sender** для Telegram-каналов

## Паттерны

- Один чат может обслуживать несколько каналов (веб, Telegram) через external_id
- Сообщения приходят через HTTP-обработчики; маршрутизация по chatId и контексту
- Интеграция с @sender для отправки в Telegram и получения каналов/персон

## Чеклист

- Получение чата через getChat(ctx, chatId)
- Настройка HTTP-обработчиков для входящих сообщений
- Использование external_id при омниканальности
- Связь с @sender при работе с Telegram-каналами

## Ссылки на документацию

- **019-feed.md** — работа с фидами
- **012-sender.md** — связь с мессенджерами и каналами

## Примеры

- `tg/pa_sample/` — чат с AI-агентом через фид

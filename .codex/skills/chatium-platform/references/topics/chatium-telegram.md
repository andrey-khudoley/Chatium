# chatium-telegram

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-telegram/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/012-sender.md; inner/docs/010-agents.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-telegram
description: Интеграция Chatium с Telegram — Web App с авторизацией, хуки для обработки сообщений, отправка через @sender или напрямую. Использовать при работе с Telegram.
---

# chatium-telegram

Интеграция Chatium с Telegram: Web App с авторизацией, хуки для обработки сообщений, отправка через @sender или напрямую. Использовать при работе с Telegram.

## Telegram Web App (web-app.tsx)

- Отдельный роут с `requireRealUser(ctx)`
- Мета-теги Telegram SDK
- CSS-переменные `--tg-theme-*` для оформления под тему клиента

## Хуки для обработки сообщений (transport/hook.ts)

- Перехват входящих сообщений из Telegram
- Связь с AI-агентом: `pushMessageToChain`, `startCompletion`

## Отправка сообщений

- **Через @sender:** `sendMessageToChat`, `getChannels`, `findPersons`
- **Напрямую:** `runTelegramApi` для Telegram Bot API

## Чеклист

- [ ] Web App: роут с авторизацией, мета Telegram SDK, `--tg-theme-*`
- [ ] Transport: хук обработки входящих сообщений
- [ ] Связь с агентом (при необходимости): pushMessageToChain, startCompletion
- [ ] Отправка: @sender или runTelegramApi

## Ссылки

- **010-agents.md** — Telegram-агент
- **012-sender.md** — каналы, отправка
- **007-vue.md** — Vue в Web App

## Примеры

- `inner/samples/imported/ai-agent-kak-bot-v-telegram-s-miniapp/`
- `inner/samples/imported/telegram-miniapp/`
- `tg/pa_sample/transport/`

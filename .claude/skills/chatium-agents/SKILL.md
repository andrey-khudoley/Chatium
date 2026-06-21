---
name: chatium-agents
description: AI-агенты в Chatium — getOrCreateAgentForWorkspace, pushMessageToChain, startCompletion. Использовать при создании агента и чата с ним (инструменты — см. chatium-agent-tool).
---

# chatium-agents

Создание агента, отправка сообщений в цепочку, запуск AI-генерации. Для создания инструментов (tools) используйте скилл **chatium-agent-tool** и подключайте 010-agents.md в контекст.

## Когда использовать

- Создание или обновление агента для workspace
- Отправка сообщений пользователя агенту (pushMessageToChain)
- Запуск генерации ответа (startCompletion)
- Интеграция с Telegram (хук входящих сообщений → pushMessageToChain, startCompletion)
- Веб-чат с агентом (sendChatResponse, WebSocket)

## Создание агента

- **getOrCreateAgentForWorkspace(ctx, key, options)** — создать или обновить агента. Параметры: key (уникальный в workspace), title, instructions, enabledTools (массив инструментов).
- **findAgents** — поиск агентов (по контексту/workspace).

Импорт: `@ai-agents/sdk/process` (getOrCreateAgentForWorkspace, findAgents, pushMessageToChain).

## Отправка сообщений

- **pushMessageToChain(ctx, chainKey, message, options?)** — отправить сообщение в цепочку. chainKey идентифицирует диалог; опции wakeAgent, chainParams и др. (см. 010-agents.md).

## AI-генерация

- **startCompletion** — запуск генерации ответа LLM. Импорт: `@start/sdk`. Параметры: сообщения, модель, callbacks (onCompletionCompleted, onCompletionFailed), nativeTools.

## Интеграция с Telegram

- Хук входящих сообщений (@sender/message-received или transport): извлечь текст → pushMessageToChain → при необходимости startCompletion; ответ отправить через sendMessageToChat (@sender) или ответ веб-чата.

## Чеклист

- [ ] Агент создан через getOrCreateAgentForWorkspace с instructions и enabledTools
- [ ] Инструменты зарегистрированы (chatium-agent-tool, 010-agents.md)
- [ ] pushMessageToChain с корректным chainKey
- [ ] startCompletion с обработкой onCompletionCompleted/onCompletionFailed
- [ ] Логирование через ctx.account.log()

## Ссылки на документацию

- **010-agents.md** — агенты, pushMessageToChain, startCompletion, создание инструментов, интеграция с Telegram
- **chatium-agent-tool** — создание и регистрация tools

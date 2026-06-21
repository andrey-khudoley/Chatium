# Данные и таблицы Heap (p/saas/chat)

## Таблицы логирования и метрик

- **server-logs** — серверные логи (message, payload, severity, level, timestamp). Используется lib/logger.lib и repos/server-logs.repo.
- **chat-metrics** — счётчики событий (metricKey, value, updatedAt). Ключи: processedMessages, errors.
- **app-settings** — настройки приложения (key, value, category, description). Ключ log_level — уровень логирования (Debug, Info, Warn, Error, Disable).

## Остальные таблицы

См. .CHATIUM-LLM.md: chats, chat_invites, blocked_users, client-logs, и др.

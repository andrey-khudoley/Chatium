# Карта импортов (p/saas/chat)

Обновлять при изменении импортов. Проверять отсутствие циклических зависимостей.

## Направления зависимостей

- **api/** → lib/, repos/, tables/
- **lib/** → repos/, tables/ (logger-settings → app-settings; logger.lib → logger-settings, server-logs.repo)
- **repos/** → tables/
- **web/** → config/
- **components/** (Vue) → api/ (только @shared-route), components/ui/
- Не допускать: components/pages → tables, lib (данные только через API).

## Ключевые модули

- config/routes.tsx — не импортирует роуты/страницы, только экспортирует ROUTES и withProjectRoot.
- lib/logger.lib.ts — импортирует logger-settings.lib, server-logs.repo (не логирует внутри repo.create).
- lib/logger-settings.lib.ts — импортирует app-settings.table, chat-metrics.repo.
- lib/messages-helpers.ts — без внутренних импортов проекта (типы и чистые функции).

## Затронутые файлы (логирование, тесты, UI)

### api/messages.ts

- `@app/auth`, `@app/feed`, `@app/socket`, `@ai-agents/sdk/process`
- `../lib/logger.lib`, `../lib/logger-settings.lib`, `../lib/messages-helpers`
- `../tables/chats.table`, `blocked-users.table`, `chat-agents.table`, `chat-subscriptions.table`, `chat-moderations.table`, `chat-plan-chats.table`

### api/logging/set-level.ts

- `@app/auth`, `../../lib/logger-settings.lib`

### api/logging/get-level.ts, get-metrics.ts, reset-metrics.ts

- `@app/auth`, `../../lib/logger-settings.lib`

### api/tests/list.ts

- `@app/auth`, `../../lib/logger.lib`

### api/tests/endpoints-check/messages-helpers.ts

- `@app/auth`, `../../../lib/logger.lib`, `../../../lib/messages-helpers`

### api/tests/endpoints-check/logging-get-level.ts, logging-set-level.ts, logging-metrics.ts

- `@app/auth`, `../../../lib/logger.lib`, `../../../api/logging/*`, `../../../lib/logger-settings.lib` (где нужно)

### web/admin/logs.tsx

- `@app/auth`, `../../config/routes`

### components/AdminSettings.vue

- `vue`, `./ui/AppSection.vue`, `AppSelect.vue`, `AppButton.vue`, `AppNotification.vue`, `AppCard.vue`
- `../api/logging/get-level`, `set-level`, `get-metrics`, `reset-metrics`

### components/ui/\*.vue (AppButton, AppCard, AppSection, AppSelect, AppNotification)

- Только `vue` (AppNotification, AppSelect — `computed` из 'vue').

Циклических зависимостей не обнаружено.

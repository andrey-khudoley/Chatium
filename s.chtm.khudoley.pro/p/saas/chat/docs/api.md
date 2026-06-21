# API проекта p/saas/chat

File-based: один файл = один эндпоинт, путь в файле `'/'`. URL = путь к файлу относительно корня проекта.

## Логирование (админ)

- **GET api/logging/get-level** — текущий уровень логирования (Admin).
- **POST api/logging/set-level** — установить уровень (body: { level: string }, level — один из: Debug, Info, Warn, Error, Disable); при невалидном level возвращается { success: false, error } (Admin).
- **GET api/logging/get-metrics** — счётчики событий (Admin).
- **POST api/logging/reset-metrics** — сбросить счётчики (Admin).

## Тесты

- **GET api/tests/list** — каталог тестов (Admin).
- **GET api/tests/endpoints-check/logger-lib** — проверка logger.lib (Admin).
- **GET api/tests/endpoints-check/messages-helpers** — проверка normalizeAuthorId, normalizeReactions (Admin).
- **GET api/tests/endpoints-check/logging-get-level** — проверка get-level (Admin).
- **GET api/tests/endpoints-check/logging-set-level** — проверка set-level (валидный/невалидный level) (Admin).
- **GET api/tests/endpoints-check/logging-metrics** — проверка get-metrics и reset-metrics (Admin).

## Остальные API

См. перечень в .CHATIUM-LLM.md (чаты, сообщения, участники, подписки, приглашения, настройки приложения и т.д.).

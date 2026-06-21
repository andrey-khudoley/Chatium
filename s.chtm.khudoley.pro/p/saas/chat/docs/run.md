# Запуск и тесты (p/saas/chat)

## Запуск

По инструкциям платформы Chatium для приложения в каталоге `p/saas/chat` (workspace s.chtm.aley.pro).

## Тесты

- **Каталог тестов**: GET `api/tests/list` (требуется роль Admin). Возвращает список категорий и тестов.
- **Проверка logger.lib**: GET `api/tests/endpoints-check/logger-lib` (Admin). Проверяет shouldLogByLevel и writeServerLog.
- **Проверка messages-helpers**: GET `api/tests/endpoints-check/messages-helpers` (Admin). Проверяет normalizeAuthorId и normalizeReactions.
- **Проверка logging**: GET `api/tests/endpoints-check/logging-get-level`, `logging-set-level`, `logging-metrics` (Admin). Проверяют get-level, set-level (валидный/невалидный level), get-metrics и reset-metrics.

Тесты вызываются через route.run(ctx) или HTTP-запрос к эндпоинтам. В каждом тесте используется константа LOG_PATH для логирования пути выполнения. Покрытие ключевых веток (api/messages хелперы, api/logging, lib) — через эти эндпоинты и ручные сценарии.

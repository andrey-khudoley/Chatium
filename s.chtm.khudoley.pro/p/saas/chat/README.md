# Чат (p/saas/chat)

Чат-приложение на платформе Chatium: групповые чаты, каналы, личные сообщения, подписки, AI-агенты. SPA с real-time обновлениями через WebSocket и Inbox API.

## Структура проекта

- **index.tsx** — корневой роут (единственная точка входа в браузер).
- **config/** — конфигурация маршрутов (`routes.tsx`: PROJECT_ROOT, ROUTES, withProjectRoot).
- **web/** — браузерные роуты (например, `web/admin/logs` — админка логов).
- **api/** — API-эндпоинты (file-based: один файл = один роут с путём `'/'`).
- **lib/** — доменная логика (логгер, настройки логирования, метрики).
- **repos/** — слой работы с БД (server-logs, chat-metrics).
- **tables/** — схемы Heap-таблиц.
- **pages/, components/, composables/, shared/, styles/** — Vue-страницы, компоненты (в т.ч. переиспользуемые в components/ui/), утилиты.
- **docs/** — проектная документация (архитектура, API, данные, imports, run, LLM).

## Логирование и админка

- **Уровень логирования** задаётся в админке (Профиль → Настройки): Disable, Error, Warn, Info, Debug.
- **Счётчики событий**: обработанные сообщения, ошибки — отображаются в той же секции; кнопка «Сбросить» обнуляет счётчики.
- Модуль логирования: `lib/logger.lib.ts` (writeServerLog, shouldLogByLevel), настройки — `lib/logger-settings.lib.ts`, метрики — `repos/chat-metrics.repo.ts` и таблица `chat-metrics.table.ts`.

## Запуск и проверки

- Запуск приложения — по инструкциям платформы Chatium для проекта в `p/saas/chat`.
- Тесты: вызов эндпоинта `api/tests/list` (каталог) и эндпоинтов в `api/tests/endpoints-check/` (logger-lib, messages-helpers, logging-get-level, logging-set-level, logging-metrics).
- Подробнее: `docs/run.md`, `docs/architecture.md`, `docs/api.md`.

## Changelog

- 2026-03-14: Проверка оркестратором (@check): правка типизации в AppSelect.vue, обновление docs/imports.md; тесты и UI-компоненты логирования/метрик уже в проекте.

## Документация

- **README.md** (этот файл) — обзор и навигация.
- **.CHATIUM-LLM.md** — словарь и навигатор для LLM.
- **docs/architecture.md** — слои, роутинг, логирование.
- **docs/api.md** — перечень API.
- **docs/data.md** — таблицы Heap и сущности.
- **docs/imports.md** — карта импортов (обновлять при изменениях).
- **docs/run.md** — запуск и тесты.
- **docs/LLM/** — лог диалогов и изменений.

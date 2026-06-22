# API

## Настройки (api/settings/)

Эндпоинты для управления настройками проекта (key-value в Heap). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

| Method | Path                   | File                 | Auth  | Назначение                                                                                                                                                                                           |
| ------ | ---------------------- | -------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api/settings/list     | api/settings/list.ts | Admin | Список всех настроек (с дефолтами)                                                                                                                                                                   |
| GET    | /api/settings/get?key= | api/settings/get.ts  | Admin | Получить одну настройку                                                                                                                                                                              |
| POST   | /api/settings/save     | api/settings/save.ts | Admin | Сохранить настройку (body: `{ key, value }`). Для `log_level`: допускаются строки (Debug/Info/Warn/Error/Disable) и числа -1–4 (-1,0=Disable, 1=Info, 2=Warn, 3=Error, 4=Debug), нормализация в API. |

Каждый файл — один эндпоинт с путём `/`.

## Логи (api/logger/, api/admin/logs/)

Эндпоинты для записи и чтения серверных логов (проверка уровня, Heap, WebSocket, вебхук).

| Method | Path                   | File                     | Auth    | Назначение                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ---------------------- | ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /api/logger/log        | api/logger/log.ts        | AnyUser | Записать лог (body: `{ message, severity?, payload? }`). message — текст сообщения (имя модуля при необходимости в тексте); severity — 0–7, по умолчанию 6; payload — JSON с контекстом. timestamp и уровень (level) вычисляются в lib. В ctx.log и ctx.account.log выводится строка вида `[DD.MM.YYYY HH:mm:ss.SSS] [LEVEL] message` (пробелы между группами в скобках). Уровень сверяется с настройкой log_level; при прохождении — запись в ctx.log, ctx.account.log, Heap, WebSocket (admin-logs), опционально POST на log_webhook.url. |
| GET    | /api/admin/logs/recent | api/admin/logs/recent.ts | Admin   | Получить последние N логов (query: `limit`, по умолчанию 50, макс. 200). Возвращает `{ success: true, entries: Array<LogEntry & { id: string }> }`.                                                                                                                                                                                                                                                                                                                                                                                         |
| GET    | /api/admin/logs/before | api/admin/logs/before.ts | Admin   | Получить N логов старше указанного timestamp (query: `beforeTimestamp` — timestamp последней записи в миллисекундах, `limit` — количество, по умолчанию 50, макс. 200). Возвращает `{ success: true, entries: Array<LogEntry & { id: string }>, hasMore: boolean }`.                                                                                                                                                                                                                                                                        |

## Дашборд админки (api/admin/dashboard/)

Счётчики ошибок и предупреждений в дашборде; таймштамп сброса хранится в настройках (`dashboard_reset_at`). Логика: lib/admin/dashboard.lib, репо — countBy по severity и timestamp (Heap where).

| Method | Path                        | File                          | Auth  | Назначение                                                                                                                         |
| ------ | --------------------------- | ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api/admin/dashboard/counts | api/admin/dashboard/counts.ts | Admin | Получить счётчики ошибок и предупреждений после таймштампа сброса. Возвращает `{ success: true, errorCount, warnCount, resetAt }`. |
| POST   | /api/admin/dashboard/reset  | api/admin/dashboard/reset.ts  | Admin | Сбросить дашборд: записать текущий таймштамп в настройки. Возвращает `{ success: true, errorCount: 0, warnCount: 0, resetAt }`.    |

Каждый файл — один эндпоинт с путём `/`.

## Тесты (api/tests/)

Минимальный набор: юнит без Heap, интеграция с Heap/либами, HTTP GET страниц шаблона. Каталог структуры — `shared/testCatalog.ts`; страница `/web/tests` показывает блоки и тесты до запуска, поддерживает полный прогон вкладки и точечный запуск одного теста из строки (кнопка play).

| Method | Path                   | File                           | Auth    | Назначение                                                                                                                       |
| ------ | ---------------------- | ------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api/tests/list        | api/tests/list.ts              | AnyUser | Каталог: `{ success, categories }`. У категорий есть `blocks[]` и плоский `tests`.                                               |
| GET    | /api/tests/unit        | api/tests/unit/index.ts        | AnyUser | Юнит: синхронные проверки (logger, routes, project, logLevel). `{ success, kind: 'unit', results[], summary, at }`.              |
| GET    | /api/tests/integration | api/tests/integration/index.ts | AnyUser | Интеграция: settings.lib, repos, dashboard.lib (без resetDashboard). `{ success, kind: 'integration', results[], summary, at }`. |

## Публичные эндпоинты

| Method | Path | File | Auth | Назначение |
| ------ | ---- | ---- | ---- | ---------- |
| -      | -    | -    | -    | -          |

## События и webhooks

- Не используются.

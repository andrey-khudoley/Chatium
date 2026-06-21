# Data

Настройки проекта хранятся в Heap (key-value). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

## Heap таблицы

| Table                                     | File                     | Назначение                             | Основные поля                                               |
| ----------------------------------------- | ------------------------ | -------------------------------------- | ----------------------------------------------------------- |
| t**units-neso-bpm-core**setting\_\_7Fk2Qw | tables/settings.table.ts | Настройки проекта (key-value)          | key (string), value (any)                                   |
| t**units-neso-bpm-core**log\_\_9Xm3Kp     | tables/logs.table.ts     | Серверные логи (долгосрочное хранение) | message (string), payload (any), severity, level, timestamp |

## Репозитории (repos/)

- `repos/settings.repo.ts` — findByKey, findAll, upsert, deleteByKey (слой работы с БД; без вызовов logger.lib, т.к. getSetting/getLogLevel вызываются из writeServerLog и используют findByKey — иначе рекурсия).
- `repos/logs.repo.ts` — create, findAll, findById, findBeforeTimestamp (слой работы с БД логов; findBeforeTimestamp использует нативную фильтрацию Heap API через `where: { timestamp: { $lt } }` для эффективной пагинации).

## Библиотеки (lib/)

- `lib/settings.lib.ts` — getSetting, getAllSettings, setSetting, getLogLevel, getLogsLimit, getLogWebhook (бизнес-логика, дефолты, валидация).
- `lib/logger.lib.ts` — getAdminLogsSocketId, shouldLogByLevel, writeServerLog (проверка уровня, запись в ctx.log/ctx.account.log, Heap, WebSocket, вебхук).

## Файлы и хранилище

- Не используется.

## Индексы/поиск

- Не используется.

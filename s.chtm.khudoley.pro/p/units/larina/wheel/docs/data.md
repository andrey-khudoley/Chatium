# Data

Настройки проекта хранятся в Heap (key-value). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

Источник истины по всем полям и контрактам — `docs/spec/spec.md`.

## Heap таблицы

| Table                                | File                       | Назначение                             | Основные поля                                                                                                                                  |
| ------------------------------------ | -------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `t__larina-wheel__setting__6nz93s`   | tables/settings.table.ts   | Настройки проекта (key-value)          | key (string), value (any)                                                                                                                      |
| `t__larina-wheel__log__w4WJKE`       | tables/logs.table.ts       | Серверные логи (долгосрочное хранение) | message (string), payload (any), severity, level, timestamp                                                                                    |
| `t__larina-wheel__segment__1hj8w9`   | tables/segments.table.ts   | Динамические сектора колеса            | order (number), label (string), prizeOfferID? (string), redirectUrl? (string), full (bool), weight (number), maxWins? (number), enabled (bool) |
| `t__larina-wheel__spin__7AabM8`      | tables/spins.table.ts      | История вращений                       | email (string), segment (RefLink→Segments), timestamp (number)                                                                                 |
| `t__larina-wheel__spinGrant__CpgY7S` | tables/spinGrants.table.ts | Доначисленные попытки                  | email (string), count (number), grantedAt (number)                                                                                             |

### Ключевые настройки (таблица settings)

| Ключ                           | Назначение                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `wheel_enabled`                | Включено ли колесо (bool)                                                                                                     |
| `wheel_max_spins`              | Максимум бесплатных попыток на email                                                                                          |
| `theme`                        | Имя темы оформления (одна из 6 тем, `config/themes.tsx`)                                                                      |
| `gateway_base_url`             | Базовый URL gateway GetCourse                                                                                                 |
| `gc_school_host`               | Хост школы GetCourse                                                                                                          |
| `gc_school_api_key`            | API-ключ школы GetCourse (секрет, маскируется в UI)                                                                           |
| `getcourse_require_user`       | Гейтинг: требовать наличие пользователя в GetCourse                                                                           |
| `getcourse_require_group`      | Гейтинг: требовать вхождение в группу GetCourse                                                                               |
| `getcourse_required_group_ids` | Список ID групп для гейтинга (зависит от gateway-операций getUserGroups/getAllGroups; сейчас disabled в p/gateways/getcourse) |
| `getcourse_issue_rewards`      | Выдавать ли награды через GetCourse при выигрыше                                                                              |
| `dashboard_reset_at`           | Таймштамп сброса счётчиков дашборда (ms)                                                                                      |

## Репозитории (repos/)

- `repos/settings.repo.ts` — findByKey, findAll, upsert, deleteByKey (слой работы с БД; без вызовов logger.lib — иначе рекурсия через getSetting).
- `repos/logs.repo.ts` — create, findAll, findById, findBeforeTimestamp (findBeforeTimestamp использует нативную фильтрацию Heap API через `where: { timestamp: { $lt } }`).
- `repos/segments.repo.ts` — findAll, findById, create, update, delete, reorder (CRUD сегментов колеса).
- `repos/spins.repo.ts` — create, countByEmail, findByEmail, findRecent(ctx, limit, offset) (резолв сегмента через RefLink, defensive null-guard), deleteAll(ctx)→count (нативный Heap deleteAll с `limit: null`).
- `repos/spinGrants.repo.ts` — create, sumByEmail, deleteAll(ctx)→count.

## Библиотеки (lib/)

- `lib/settings.lib.ts` — getSetting, getAllSettings, setSetting, getLogLevel, getLogsLimit, getLogWebhook (бизнес-логика, дефолты, валидация). Бэкап: `getBackupSettings` (эффективные значения всех `SETTING_KEYS` без маскировки секрета — для экспорта) и `applyBackupSettings` (применение бэкапа с безопасным порядком gating, пропуском неизвестных/служебных ключей и пустого секрета).
- `lib/logger.lib.ts` — getAdminLogsSocketId, shouldLogByLevel, writeServerLog (проверка уровня, запись в ctx.log/ctx.account.log, Heap, WebSocket, вебхук).
- `lib/wheel.lib.ts` — loadEffectiveSegments (правило чётности 2..8 + авто-retry для нечётного числа сегментов), selectTarget (взвешенный выбор сегмента), checkSpinLimit (лимит попыток), maskEmail (серверная маскировка: `tester@khudoley.pro → te***@***ey.pro`; полный email клиенту не передаётся). Серверный тип `LoadedSegment` (с id/maxWins/full/prizeOfferID) vs публичный `EffectiveSegment` (без них — id не утекает клиенту).
- `lib/getcourse.lib.ts` — клиент gateway GetCourse: getGroups, userGetFields, userGetGroups, createDeal; passesGcUserCheck, passesGcGroupCheck. Envelope-транспорт через `@app/request`.

## Файлы и хранилище

- Не используется.

## Индексы/поиск

- Не используется.

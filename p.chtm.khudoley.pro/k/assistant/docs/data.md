# Data

Настройки проекта хранятся в Heap (key-value). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

## Heap таблицы

| Table | File | Назначение | Основные поля |
| --- | --- | --- | --- |
| t__assistant__setting__7Fk2Qw | tables/settings.table.ts | Настройки проекта (key-value) | key (string), value (any) |
| t__assistant__user_settings__9Wp2kL | tables/user-settings.table.ts | Персональные настройки пользователя | userId (string), timezoneOffsetHours (число, целые часы от UTC, по умолчанию при отсутствии строки — +3 в lib) |
| t__assistant__log__9Xm3Kp | tables/logs.table.ts | Серверные логи (долгосрочное хранение) | message (string), payload (any), severity, level, timestamp |
| t__assistant__journal_note__8Kp2Nx | tables/journal-notes.table.ts | Заметки блокнота журнала | userId (string), title (string), content (string); опционально: folderId (string), categoryIds (JSON string), linkedTaskId (string), linkedProjectId (string), linkedClientId (string), noteDate (string), isArchived (boolean), sortOrder (number); системные: id, createdAt, updatedAt |
| t__assistant__inbox_note__7Np4Kx | tables/inbox-notes.table.ts | Заметки инбокса журнала (отдельно от блокнота) | userId, title, content, isArchived, sortOrder; системные: id, createdAt, updatedAt |
| t__assistant__notebook_category__5Rk3Qw | tables/notebook-categories.table.ts | Категории блокнота | userId (string), name (string), color (string), sortOrder (number) |
| t__assistant__notebook_folder__8Lm4Tp | tables/notebook-folders.table.ts | Папки блокнота | userId (string), name (string), color (string), sortOrder (number), isArchived (boolean) |
| t__assistant__journal_day_entry__4Hd9Qa | tables/journal-day-entries.table.ts | Дневные записи по сегментам (Ночь/Утро/День/Вечер) | userId, dayKey (YYYY-MM-DD с границей 05:00), nightText/nightLocked, morningText/morningLocked, dayText/dayLocked, eveningText/eveningLocked |
| t__assistant__journal_week_entry__7Qm2Lp | tables/journal-week-entries.table.ts | Недельный план по дням | userId, dayKey (YYYY-MM-DD), planText, locked |
| t__assistant__journal_week_summary__3Fn8Rt | tables/journal-week-summary.table.ts | Общий план недели | userId, mondayKey (YYYY-MM-DD понедельник), summaryText, locked |
| t__assistant__journal_habits_week__9Hk2Mx | tables/journal-habits-week.table.ts | Трекер привычек по неделям | userId, mondayKey (понедельник недели), rowsJson (JSON: массив `{ id, title, days: boolean[7] }`); хранятся только прошлые и текущая недели; строки будущих недель при обнаружении удаляются |
| t__assistant__task_client__7Hk3mN | tables/task-clients.table.ts | Клиенты (задачи) | userId, name, sortOrder |
| t__assistant__task_project__9Lp4qR | tables/task-projects.table.ts | Проекты внутри клиента | userId, clientId, name, sortOrder; опционально `details` (текст для пользователя), `context` (служебное, не отдаётся в клиентский API) |
| t__assistant__task_ai_chat_feed__3Kp9mX | tables/task-ai-chat-feeds.table.ts | Фид чата с AI на странице задач (на проект) | userId, projectId, feedId (UID фида Chatium) |
| t__assistant__task_item__2Vx8sT | tables/task-items.table.ts | Задачи внутри проекта | userId, projectId, title, priority (1–4), status (todo/in_progress/done/cancelled), sortOrder, daySortOrder (порядок в дневном списке «В работе»), reminderMinutesBefore (минут до напоминания); опционально `details` (текст для пользователя), `context` (служебное, не отдаётся в клиентский API), `eventAtMs` (unix ms события) |
| t__assistant__user_tool_state__7Kp3mN | tables/user-tool-state.table.ts | KV-снимок focus-tools на пользователя | userId, key (`timer_state`), value (JSON-обёртка `timer_state` schema 1: activeMode, pomodoro, timer, stopwatch), updatedAtMs |
| t__assistant__pomodoro_state__6Gs2mQ | tables/pomodoro-state.table.ts | Legacy-состояние Pomodoro (только миграция в `user-tool-state`) | прежние поля Pomodoro |
| t__assistant__pomodoro_launch__9Hk2tR | tables/pomodoro-launches.table.ts | Журнал фокус-сегментов помидор/таймер/секундомер | userId, startedAtMs, endedAtMs, durationSec, phase, taskId, cyclesCompletedAtStart, **tool** (`pomodoro`/`timer`/`stopwatch`, у старых строк null), **runId** (опционально), source, endReason |

## Репозитории (repos/)
- `repos/settings.repo.ts` — findByKey, findAll, upsert, deleteByKey (слой работы с БД; без вызовов logger.lib, т.к. getSetting/getLogLevel вызываются из writeServerLog и используют findByKey — иначе рекурсия).
- `repos/user-settings.repo.ts` — findByUserId, upsertTimezone (одна строка на пользователя, `createOrUpdateBy` по `userId`).
- `repos/logs.repo.ts` — create, findAll, findById, findBeforeTimestamp (слой работы с БД логов; findBeforeTimestamp использует нативную фильтрацию Heap API через `where: { timestamp: { $lt } }` для эффективной пагинации).
- `repos/journal-notes.repo.ts` — findSummariesByUserId (расширенное DTO с folderId, categoryIds, noteDate, isArchived, sortOrder, linkedTaskId, linkedProjectId, linkedClientId), createForUser, findByIdForUser, updateForUser, deleteByIdForUser, reorderForUser, bulkArchiveForUser, bulkMoveToFolderForUser, bulkDeleteForUser, bulkSetCategoryForUser, archiveByFolderForUser, clearFolderIdForUser, removeCategoryFromAllNotes.
- `repos/inbox-notes.repo.ts` — findSummariesByUserId (id, title, isArchived, sortOrder), createForUser, findByIdForUser, updateForUser, deleteByIdForUser — только таблица инбокса.
- `repos/notebook-categories.repo.ts` — findByUserId, createForUser, updateForUser, deleteForUser.
- `repos/notebook-folders.repo.ts` — findByUserId, createForUser, updateForUser, deleteForUser, archiveForUser, reorderForUser.
- `repos/journal-day-entries.repo.ts` — getByUserAndDay, saveSegmentForUserDay (upsert сегмента в записи конкретного дня пользователя).
- `repos/journal-week-entries.repo.ts` — getWeekByUserAndMonday, saveDayPlanForUser, saveWeekSummaryForUser (чтение/запись недельного плана по дням + общего weekly-summary).
- `repos/journal-habits.repo.ts` — getHabitsWeekForUser (для **будущей** недели: не создаёт Heap-запись, возвращает пустой `rows`, при наличии устаревшей строки — удаляет её; для прошлой/текущей: если записи недели ещё нет — создаётся строка с названиями с прошлой недели и пустыми отметками; если запись есть, но `rows` после парсинга пустой — те же названия подставляются и сохраняются в Heap), saveHabitsWeekForUser (мерж только «сегодняшней» колонки для текущей недели).
- `repos/tasks.repo.ts` — getTreeForUser, CRUD клиентов/проектов/задач, reorderTasks (порядок в проекте), reorderDayTasks (порядок задач со статусом `in_progress` для вкладки «День»), releaseAllInProgressToTodo (все «В работе» → «К выполнению»), addPomodoroSecondsToTask (накопление времени работы/отдыха в задаче при активном Pomodoro); при входе в `in_progress` выставляется `daySortOrder`, при выходе — 0; удаление клиента каскадом (проекты и задачи), проекта — с задачами. Endpoint `api/tasks/in-progress` дополнительно обогащает `tree.tasks` полями `projectName` и `clientName` (через join по `projectId -> clientId`) для UI-селекторов Pomodoro/Timer/Stopwatch.
- `repos/user-tool-state.repo.ts` — getOrCreateTimerStateEnvelope, saveTimerStateEnvelope; миграция из legacy `pomodoro-state`.
- `repos/tool-segments.repo.ts` — сегменты focus-tools (помидор/таймер/секундомер) с полями `tool`, `runId`.
- `repos/pomodoro-launches.repo.ts` — чтение/агрегации журнала для аналитики (например, вкладка «Месяц» журнала); новые сегменты пишет `tool-segments.repo` через `focus-tools.lib`.
- `repos/tasks.repo.ts` — дополнительно: `getCompletedTasksSummaryForMonth` — завершённые задачи (`status: done`) с `updatedAt` в указанном месяце, сгруппированные по дню обновления.

## Библиотеки (lib/)
- `lib/settings.lib.ts` — getSetting, getAllSettings, setSetting, getLogLevel, getLogsLimit, getLogWebhook (бизнес-логика, дефолты, валидация).
- `lib/user-settings.lib.ts` — getEffectiveTimezoneOffsetHours, saveTimezoneOffsetHours, getTimezoneOffsetForCtxUser (дефолт UTC+3, кламп −12…14).
- `lib/logger.lib.ts` — getAdminLogsSocketId, shouldLogByLevel, writeServerLog (проверка уровня, запись в ctx.log/ctx.account.log, Heap, WebSocket, вебхук).
- `lib/tasks-types.ts` — DTO дерева задач для UI/API (без импорта Heap).
- `lib/focus-tools.lib.ts` — единая логика помидор + таймер + секундомер: `getFullState`, `executeCommand`, тик фаз помидора, завершение таймера по `endsAtMs`, сегменты в `tool-segments`, push WebSocket; все мутации под `runWithExclusiveLock`.
- `lib/pomodoro-types.ts` — DTO состояния Pomodoro и тип входа настроек; `normalizePhaseChangeSoundId` для поля `phaseChangeSound` (1–5).
- `lib/pomodoro-stats-day.ts` — формула календарной даты в **полночь** по UTC+N (`computePomodoroStatsDayKeyForUtcOffsetHours`) для UI; на сервере граница суток статистики в `lib/focus-tools.lib.ts` считается только из Heap `timezoneOffsetHours` + `Date.now()` (клиентский `statsDayKey` не подменяет серверный ключ); `@shared`.
- `lib/journal-day-key.ts` — ключ периода дневника (граница 05:00 локально / fallback Europe/Moscow); `@shared`.
- `lib/journal-week-key.ts` — ключ понедельника недели, сдвиг недели, список дней недели и номер недели; на сервере для «текущей недели» без TZ клиента — `computeJournalWeekMondayKeyInTimeZone(..., Europe/Moscow)` (не `*Local`, иначе при TZ=UTC сдвиг относительно GMT+3); `@shared`.
- `lib/journal-habits-time.ts` — DTO привычек (в т.ч. `currentWeekMondayKey` для навигации), парсинг/сериализация JSON, ключ понедельника и колонка «сегодня» с границей 05:00 по **Europe/Moscow** на сервере (`computeJournalDayKeyInTimeZone`), режим просмотра недели, мерж отметок при сохранении; `@shared`.
- `lib/pomodoro-phase-sounds.ts` — пресеты звука смены фазы (Web Audio API, только клиент).

## Файлы и хранилище
- Не используется.

## Индексы/поиск
- Не используется.

# API

## Настройки (api/settings/)

Эндпоинты для управления настройками проекта (key-value в Heap). См. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md).

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/settings/list | api/settings/list.ts | Admin | Список всех настроек (с дефолтами) |
| GET | /api/settings/get?key= | api/settings/get.ts | Admin | Получить одну настройку |
| POST | /api/settings/save | api/settings/save.ts | Admin | Сохранить настройку (body: `{ key, value }`). Для `log_level`: допускаются строки (Debug/Info/Warn/Error/Disable) и числа -1–4 (-1,0=Disable, 1=Info, 2=Warn, 3=Error, 4=Debug), нормализация в API. |

Каждый файл — один эндпоинт с путём `/`.

## Персональные настройки пользователя (api/user-settings/)

Смещение от UTC в целых часах; дефолт **+3** (если записи в Heap ещё нет). Данные: `tables/user-settings.table.ts`, `lib/user-settings.lib.ts`.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/user-settings/get | api/user-settings/get.ts | RealUser | `{ success, timezoneOffsetHours }` |
| POST | /api/user-settings/save | api/user-settings/save.ts | RealUser | Body: `{ timezoneOffsetHours: number }` (−12…14), ответ `{ success, timezoneOffsetHours }` |

## Логи (api/logger/, api/admin/logs/)

Эндпоинты для записи и чтения серверных логов (проверка уровня, Heap, WebSocket, вебхук).

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| POST | /api/logger/log | api/logger/log.ts | AnyUser | Записать лог (body: `{ message, severity?, payload? }`). message — текст сообщения (имя модуля при необходимости в тексте); severity — 0–7, по умолчанию 6; payload — JSON с контекстом. timestamp и уровень (level) вычисляются в lib. В ctx.log и ctx.account.log выводится строка вида `[DD.MM.YYYY HH:mm:ss.SSS] [LEVEL] message` (пробелы между группами в скобках). Уровень сверяется с настройкой log_level; при прохождении — запись в ctx.log, ctx.account.log, Heap, WebSocket (admin-logs), опционально POST на log_webhook.url. |
| GET | /api/admin/logs/recent | api/admin/logs/recent.ts | Admin | Получить последние N логов (query: `limit`, по умолчанию 50, макс. 200). Возвращает `{ success: true, entries: Array<LogEntry & { id: string }> }`. |
| GET | /api/admin/logs/before | api/admin/logs/before.ts | Admin | Получить N логов старше указанного timestamp (query: `beforeTimestamp` — timestamp последней записи в миллисекундах, `limit` — количество, по умолчанию 50, макс. 200). Возвращает `{ success: true, entries: Array<LogEntry & { id: string }>, hasMore: boolean }`. |

## Дашборд админки (api/admin/dashboard/)

Счётчики ошибок и предупреждений в дашборде; таймштамп сброса хранится в настройках (`dashboard_reset_at`). Логика: lib/admin/dashboard.lib, репо — countBy по severity и timestamp (Heap where).

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/admin/dashboard/counts | api/admin/dashboard/counts.ts | Admin | Получить счётчики ошибок и предупреждений после таймштампа сброса. Возвращает `{ success: true, errorCount, warnCount, resetAt }`. |
| POST | /api/admin/dashboard/reset | api/admin/dashboard/reset.ts | Admin | Сбросить дашборд: записать текущий таймштамп в настройки. Возвращает `{ success: true, errorCount: 0, warnCount: 0, resetAt }`. |

Каждый файл — один эндпоинт с путём `/`.

## Тесты (api/tests/)

Набор ограничен **базовым минимумом шаблона** (`p/template_project`): юнит без Heap и интеграция с Heap/либами. Страница `/web/tests` дополнительно проверяет GET шаблонных маршрутов страниц с клиента.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/tests/list | api/tests/list.ts | AnyUser | Каталог: `{ success, categories }`. У каждой категории есть `blocks[]` (функциональные группы с `tests[]`: id, title) и плоский `tests` (тот же набор). Источник структуры — `shared/testCatalog.ts`. |
| GET | /api/tests/unit | api/tests/unit/index.ts | AnyUser | Юнит: синхронные проверки (logger, routes, project, logLevel). Ответ: `{ success, kind: 'unit', results[], summary, at }`. |
| GET | /api/tests/integration | api/tests/integration/index.ts | AnyUser | Интеграция: settings.lib, repos, dashboard.lib (без resetDashboard). Ответ: `{ success, kind: 'integration', results[], summary, at }`. |

## Журнал — блокнот (api/journal/notes/)

Заметки пользователя в Heap; доступ только авторизованным пользователям (`requireRealUser`).

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/journal/notes/list | api/journal/notes/list.ts | RealUser | Список заметок + папки + категории: `{ success, notes: [...], folders: [...], categories: [...] }`. Каждая заметка включает расширенное DTO (id, title, folderId, categoryIds, noteDate, isArchived, sortOrder, linkedTaskId, linkedProjectId, linkedClientId). |
| GET | /api/journal/notes/get?id= | api/journal/notes/get.ts | RealUser | Одна заметка (расширенное DTO): `{ success, note: { id, title, content, folderId, categoryIds, noteDate, isArchived, sortOrder, ... } }` или ошибка. |
| POST | /api/journal/notes/create | api/journal/notes/create.ts | RealUser | Создать заметку. Body (опционально): `{ title?, content?, folderId?, categoryIds?, linkedTaskId?, linkedProjectId?, linkedClientId?, noteDate? }`; по умолчанию заголовок «Новая заметка», пустое содержимое. Ответ: `{ success, note }`. |
| POST | /api/journal/notes/update | api/journal/notes/update.ts | RealUser | Обновить свою заметку. Body: `{ id, title?, content?, folderId?, categoryIds?, linkedTaskId?, linkedProjectId?, linkedClientId?, noteDate? }`. Пустой `title` после trim заменяется на «Без названия». Ответ: `{ success, note }`. |
| POST | /api/journal/notes/delete | api/journal/notes/delete.ts | RealUser | Удалить свою заметку. Body: `{ id }`. Ответ: `{ success: true }`. |
| POST | /api/journal/notes/reorder | api/journal/notes/reorder.ts | RealUser | Изменить порядок заметок. Body: `{ orderedIds: string[] }`. Ответ: `{ success: true }`. |
| POST | /api/journal/notes/archive | api/journal/notes/archive.ts | RealUser | Архивировать/разархивировать заметку. Body: `{ id, isArchived: boolean }`. Ответ: `{ success: true }`. |
| POST | /api/journal/notes/move | api/journal/notes/move.ts | RealUser | Переместить заметку в папку. Body: `{ id, folderId: string|null }`. Ответ: `{ success: true }`. |
| POST | /api/journal/notes/bulk | api/journal/notes/bulk.ts | RealUser | Массовые операции с заметками. Body: `{ ids: string[], action: 'archive'|'move'|'delete'|'setCategory', folderId?, categoryId? }`. Ответ: `{ success: true }`. |

## Журнал — инбокс (api/journal/inbox/)

Отдельная Heap-таблица `inbox-notes` (не путать с `journal-notes` блокнота). Только текст и архив.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/journal/inbox/list | api/journal/inbox/list.ts | RealUser | Список: `{ success, notes: [{ id, title, isArchived, sortOrder }] }`. Query: `includeArchived=true` — включить архивные. |
| GET | /api/journal/inbox/get?id= | api/journal/inbox/get.ts | RealUser | Одна заметка: `{ success, note: { id, title, content, isArchived, sortOrder } }`. |
| POST | /api/journal/inbox/create | api/journal/inbox/create.ts | RealUser | Body: `{ title?, content? }`. Ответ: `{ success, note }`. |
| POST | /api/journal/inbox/update | api/journal/inbox/update.ts | RealUser | Body: `{ id, title?, content?, isArchived? }`. Ответ: `{ success, note }`. |
| POST | /api/journal/inbox/archive | api/journal/inbox/archive.ts | RealUser | Body: `{ id, isArchived }`. Ответ: `{ success: true }`. |
| POST | /api/journal/inbox/delete | api/journal/inbox/delete.ts | RealUser | Body: `{ id }`. Ответ: `{ success: true }`. |

## Журнал — категории блокнота (api/journal/categories/)

Категории для классификации заметок; доступ `requireRealUser`.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/journal/categories/list | api/journal/categories/list.ts | RealUser | Список категорий: `{ success, categories: [{ id, name, color, sortOrder }] }`. |
| POST | /api/journal/categories/create | api/journal/categories/create.ts | RealUser | Создать категорию. Body: `{ name, color? }`. Ответ: `{ success, category }`. |
| POST | /api/journal/categories/update | api/journal/categories/update.ts | RealUser | Обновить категорию. Body: `{ id, name?, color? }`. Ответ: `{ success, category }`. |
| POST | /api/journal/categories/delete | api/journal/categories/delete.ts | RealUser | Удалить категорию. Body: `{ id }`. Ответ: `{ success: true }`. При удалении категория убирается из `categoryIds` всех заметок. |

## Журнал — папки блокнота (api/journal/folders/)

Папки для организации заметок; доступ `requireRealUser`.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| POST | /api/journal/folders/create | api/journal/folders/create.ts | RealUser | Создать папку. Body: `{ name, color? }`. Ответ: `{ success, folder }`. |
| POST | /api/journal/folders/update | api/journal/folders/update.ts | RealUser | Обновить папку. Body: `{ id, name?, color? }`. Ответ: `{ success, folder }`. |
| POST | /api/journal/folders/delete | api/journal/folders/delete.ts | RealUser | Удалить папку. Body: `{ id }`. При удалении папки заметки внутри неё не удаляются, а теряют привязку (folderId=null). Ответ: `{ success: true }`. |
| POST | /api/journal/folders/reorder | api/journal/folders/reorder.ts | RealUser | Изменить порядок папок. Body: `{ orderedIds: string[] }`. Ответ: `{ success: true }`. |
| POST | /api/journal/folders/archive | api/journal/folders/archive.ts | RealUser | Архивировать/разархивировать папку. Body: `{ id, isArchived: boolean }`. При архивации папки все заметки в ней тоже архивируются. Ответ: `{ success: true }`. |

## Журнал — день (api/journal/day/)

Дневные записи пользователя по сегментам `night/morning/day/evening` с фиксацией (блокировка редактирования). Данные хранятся отдельно по `dayKey` (`YYYY-MM-DD`) с границей суток в **05:00**.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/journal/day/get?dayKey= | api/journal/day/get.ts | RealUser | Получить запись дня: `{ success, entry }`, где `entry = { dayKey, night, morning, day, evening }`, а каждый сегмент — `{ value, locked }`. `dayKey` опционален (если не передан, сервер использует fallback-ключ по `Europe/Moscow`). |
| POST | /api/journal/day/save | api/journal/day/save.ts | RealUser | Сохранить один сегмент дня. Body: `{ dayKey?, segment, value, locked }`, где `segment ∈ { night, morning, day, evening }`. Ответ: `{ success, entry }` (актуальный снимок всего дня после записи). |

## Журнал — месяц (api/journal/month/)

Агрегированные данные месяца: завершённые задачи (по `updatedAt` из Heap) и время фокуса (Pomodoro work-сегменты) по дням.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/journal/month/data?year=&month= | api/journal/month/data.ts | RealUser | Данные месяца: `{ success, year, month, completedTasks, focusByDay }`. `completedTasks` — массив `{ id, title, projectName, clientName, dayKey }` — задачи со статусом `done`, `updatedAt` которых попадает в указанный месяц. `focusByDay` — объект `{ "YYYY-MM-DD": seconds }` — суммарная продолжительность work-фаз Pomodoro по дням. |

## Журнал — неделя (api/journal/week/)

Недельный план пользователя: по одному многострочному полю на каждый день недели (`Пн..Вс`) с фиксацией/разблокировкой.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/journal/week/get?mondayKey= | api/journal/week/get.ts | RealUser | Получить недельный план: `{ success, week }`, где `week = { mondayKey, weekNumber, summary, days }`, `summary = { value, locked }`, `days = [{ dayId, dayKey, value, locked }]`. `mondayKey` опционален; без параметра — текущая неделя по границе суток 05:00 **Europe/Moscow** (не «локальное» время процесса сервера). |
| POST | /api/journal/week/save | api/journal/week/save.ts | RealUser | Сохранить план дня недели. Body: `{ dayKey, value, locked }`. Ответ: `{ success, week }` — актуальный снимок всей недели, к которой относится `dayKey`. |
| POST | /api/journal/week/save-summary | api/journal/week/save-summary.ts | RealUser | Сохранить общий weekly-summary. Body: `{ mondayKey, value, locked }`. Ответ: `{ success, week }` — актуальный снимок недели после сохранения общего плана. |

## Журнал — привычки (api/journal/habits/)

Трекер привычек по неделям (Пн–Вс): название строки + семь чекбоксов. «Сегодня» и граница недели считаются с **05:00** по локальному времени (как `computeJournalDayKeyLocal`). В Heap хранятся только **прошлые** недели и **текущая**; для будущих недель записей нет (при запросе GET с `interactionMode === future` возвращается пустой `rows`, устаревшая Heap-строка будущей недели удаляется). На сервере для текущей недели изменяется только колонка «сегодня»; прошлые недели — read-only. При ответе GET для прошлой/текущей недели: если Heap-строка есть, но список привычек пуст, подставляются названия с предыдущей недели.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/journal/habits/get?mondayKey= | api/journal/habits/get.ts | RealUser | `{ success, habits }`, где `habits = { mondayKey, weekNumber, dayKeys, rows, todayColumnIndex, interactionMode (current / past / future), effectiveDayKey, currentWeekMondayKey }`. `currentWeekMondayKey` — понедельник текущей недели (05:00), для UI-навигации. Без `mondayKey` — текущая неделя по правилу 05:00 с fallback **Europe/Moscow** на сервере. |
| POST | /api/journal/habits/save | api/journal/habits/save.ts | RealUser | Body: `{ mondayKey, rows }`. Порядок элементов в `rows` — порядок строк в UI (клиент может менять drag-and-drop). Сохранение только для `interactionMode === current`; чекбоксы кроме «сегодня» мержатся с уже сохранёнными. Ответ: `{ success, habits }`. |

## Задачи (api/tasks/)

Иерархия «клиент → проект → задача» в Heap; все мутации и дерево — только `requireRealUser`. Один файл — один эндпоинт с путём `/`.

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/tasks/tree/get | api/tasks/tree/get.ts | RealUser | Полное дерево: `{ success, tree: { clients, projects, tasks } }`. |
| POST | /api/tasks/clients/create | api/tasks/clients/create.ts | RealUser | Body: `{ name }`. Ответ: `{ success, client }`. |
| POST | /api/tasks/clients/update | api/tasks/clients/update.ts | RealUser | Body: `{ id, name }`. |
| POST | /api/tasks/clients/delete | api/tasks/clients/delete.ts | RealUser | Body: `{ id }` — каскадное удаление проектов и задач. |
| POST | /api/tasks/clients/reorder | api/tasks/clients/reorder.ts | RealUser | Body: `{ orderedIds: string[] }` — полный список id клиентов пользователя в новом порядке. |
| POST | /api/tasks/projects/create | api/tasks/projects/create.ts | RealUser | Body: `{ clientId, name, details? }` — `details` (текст «Детали»), опционально. |
| POST | /api/tasks/projects/update | api/tasks/projects/update.ts | RealUser | Body: `{ id, name, clientId?, details? }` — смена клиента у проекта допустима; `details` — опционально обновить текст «Детали». |
| POST | /api/tasks/projects/delete | api/tasks/projects/delete.ts | RealUser | Body: `{ id }` — удаление задач проекта. |
| POST | /api/tasks/projects/reorder | api/tasks/projects/reorder.ts | RealUser | Body: `{ clientId, orderedIds: string[] }` — полный список id проектов этого клиента в новом порядке. |
| POST | /api/tasks/items/create | api/tasks/items/create.ts | RealUser | Body: `{ projectId, title, details?, priority?, status?, eventAtMs?, reminderMinutesBefore? }`. `eventAtMs` — unix ms (nullable, можно передать `null`), `reminderMinutesBefore` по умолчанию 15. |
| POST | /api/tasks/items/update | api/tasks/items/update.ts | RealUser | Body: `{ id, title?, details?, priority?, status?, projectId?, eventAtMs?, reminderMinutesBefore? }`. |
| POST | /api/tasks/items/delete | api/tasks/items/delete.ts | RealUser | Body: `{ id }`. |
| POST | /api/tasks/items/reorder | api/tasks/items/reorder.ts | RealUser | Body: `{ projectId, orderedIds: string[] }` — полный список id задач проекта в новом порядке. |
| POST | /api/tasks/items/reorder-day | api/tasks/items/reorder-day.ts | RealUser | Body: `{ orderedIds: string[] }` — полный список id всех задач со статусом «В работе» в новом порядке (дневной список). |
| POST | /api/tasks/items/release-day | api/tasks/items/release-day.ts | RealUser | Body: `{}` (опционально). Все задачи «В работе» → «К выполнению». Ответ: `{ success, count }`. |
| POST | /api/tasks/tasks-ai-chat-ensure | api/tasks/tasks-ai-chat-ensure.ts | RealUser | Body: `{ projectId }`. Создаёт/возвращает фид чата с AI для пары пользователь+проект, участник фида, `getChat` только с URL `messages/get`, `changes`, `add` (без `useAppAccount` — иначе `@app/feed` требует proxy `ctx.app` и падает в UGC). Ответ: `{ success, chat?, feedId?, error? }`. |
| POST | /api/tasks/tasks-ai-chat-reset | api/tasks/tasks-ai-chat-reset.ts | RealUser | Body: `{ projectId }`. Удаляет старый фид, создаёт новый, обновляет Heap-маппинг (сброс истории). Ответ: `{ success, feedId?, error? }`. Клиент затем вызывает `tasks-ai-chat-ensure`. |
| GET | `/tasks-ai-chat/:feedId/messages/get` | api/tasks/tasks-ai-chat-messages-get.ts | RealUser | `feedMessagesGetHandler` + маппинг авторов (ассистент/пользователь); список **сортируется по времени** (старые→новые), т.к. фид по умолчанию может отдавать новые первыми. Доступ к `feedId` — через Heap `task_ai_chat_feeds`. URL в чате: `taskAiChatMessagesGetRoute({ feedId }).url()`. |
| GET | `/tasks-ai-chat/:feedId/messages/changes` | api/tasks/tasks-ai-chat-messages-changes.ts | RealUser | `feedMessagesChangesHandler` + тот же маппинг авторов. |
| POST | `/tasks-ai-chat/:feedId/messages/add` | api/tasks/tasks-ai-chat-messages-add.ts | RealUser | `feedMessagesAddHandler`; после успешного add — `runTaskAiChatReplyIfNeeded` в `tasks-ai-chat-reply.ts` (`startCompletion`, в proxy context). В system перед каждым запросом подставляется актуальный блок из `buildTaskAiChatProjectContextBlock` (`tasks-ai-chat-lib.ts`): проект, задачи, **details**, служебные **context**, а также (если заданы) `eventAtMs`/`reminderMinutesBefore` у задач. Последнее пользовательское сообщение передаётся отдельным user-блоком «ТЕКУЩЕЕ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ». Системный текст: `getAiFormulateSystemPrompt` + `TASKS_AI_CHAT_JSON_APPENDIX` в `config/prompts.tsx`; в `actions` для `create_task`/`update_task` разрешены `eventAtMs` и `reminderMinutesBefore` (по умолчанию 15 минут, если пользователь не указал иначе). Ответ модели — JSON с `reply`, `actions`, `summary`; применение в Heap — `tasks-ai-chat-completion-completed.ts` → `tasks-ai-formulate-apply.ts` (create/update/delete/reorder, `reorder_tasks` с `$new:N`). В ленту пишется только текст `reply`. Отдельного роута `ai-formulate` нет. |
| GET | /api/tasks/in-progress | api/tasks/in-progress.ts | RealUser | Список задач в статусе `in_progress` для Pomodoro/Timer/Stopwatch. Возвращает `{ success, tasks }`, где каждый элемент содержит поля задачи + `projectName` и `clientName`; порядок задач сохраняется из общего дерева задач пользователя (без отдельной пересортировки в endpoint). |

## Focus-tools: помидор, таймер, секундомер (api/tools/)

Единый серверный снимок состояния (`Heap user-tool-state`, ключ `timer_state`), WebSocket `assistant-focus-tools-{userId}` с push `{ type: 'state-update', data: { state, serverNowMs } }`. Бизнес-логика: `lib/focus-tools.lib.ts` под `runWithExclusiveLock`; сегменты запусков — `tables/pomodoro-launches` + `repos/tool-segments.repo.ts` (поля `tool`, `runId`).

| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| GET | /api/tools/state | api/tools/state.ts | RealUser | Полный снимок: `{ success, state, serverNowMs, encodedSocketId? }`. Граница суток статистики на сервере — только Heap `timezoneOffsetHours` + время сервера (`lib/focus-tools.lib.ts`); query `statsDayKey` опционален и не меняет логику. |
| POST | /api/tools/control | api/tools/control.ts | RealUser | Body: `{ statsDayKey?, command }` (`statsDayKey` в теле игнорируется для выбора дня — тот же серверный ключ). `command.kind`: `pomodoro` (`action`: start/resume/pause/stop/skip/reset), `timer` / `stopwatch` (start/resume/pause/reset), `widget-mode` (`mode`: clock/pomodoro/timer/stopwatch), `save-pomodoro-settings`, `assign-task` (`taskId`), `timer-settings` (`minutes`, `seconds`). Ответ: `{ success, state, serverNowMs }`. |

## Публичные эндпоинты
| Method | Path | File | Auth | Назначение |
| --- | --- | --- | --- | --- |
| - | - | - | - | - |

Примечания по семантике `command.kind === 'pomodoro'`:
- `start` запускает/перезапускает рабочую фазу (`phase=work`, полный `workMinutes`, `cyclesCompleted=0`); на странице Pomodoro кнопка доступна только в `stopped`, прямой вызов API из других статусов по-прежнему перезапускает работу.
- `resume` изменяет состояние из `paused` или `awaiting_continue`; иначе возвращает текущее состояние без ошибки.
- `pause` изменяет состояние только из `running` (в остальных случаях возвращает текущее состояние без ошибки).
- `stop` переводит в `stopped`, сбрасывает фазу в `work` и очищает `currentTaskId` (счётчик циклов не обнуляет).
- `reset` переводит в `stopped` с полным таймером работы, очищает задачу и обнуляет `cyclesCompleted` (кнопка «Сбросить» на странице).

## События и webhooks
- Не используются.

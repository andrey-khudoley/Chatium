# Импорты страниц и схема зависимостей

## 1) Страницы‑роуты (TSX entrypoints)

### `./config/routes.tsx`
- нет внутренних импортов (только экспорт PROJECT_ROOT, ROUTES, ROUTE_PATHS, getFullUrl, getApiUrlForRoute, withProjectRoot, withProjectRootAndSubroute)

### `./config/project.tsx`
- нет внутренних импортов (только экспорт DEFAULT_PROJECT_TITLE, INDEX_PAGE_NAME, PROFILE_PAGE_NAME, ADMIN_PAGE_NAME, TESTS_PAGE_NAME, JOURNAL_PAGE_NAME, TASKS_PAGE_NAME, TOOLS_PAGE_NAME, POMODORO_PAGE_NAME, getPageTitle, getHeaderText, BODY_TEXT, BODY_SUBTEXT)

### `./index.tsx`
- `@app/html-jsx` → `jsx`
- `./pages/HomePage.vue`
- `./shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `./styles` → `customScrollbarStyles`, `mobileSafeAreaStyles`, `formControlStyles`, `VIEWPORT_META_CONTENT`
- `./shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `./config/routes` → `getApiUrlForRoute`, `getFullUrl`, `ROUTES`
- `./config/project` → `INDEX_PAGE_NAME`, `BODY_TEXT`, `BODY_SUBTEXT`, `getPageTitle`, `getHeaderText`
- `./lib/logger.lib` → `*`
- `./lib/settings.lib` → `*`
- `./lib/user-settings.lib` → `getTimezoneOffsetForCtxUser`
- `@app/socket` → `genSocketId`
- `./api/tools/state` → `toolsStateRoute`
- `./api/tools/control` → `toolsControlRoute`
- `./shared/focus-tools-types` → `focusToolsSocketId`
- передаёт в `HomePage`: `tasksUrl`, `journalUrl`, `toolsUrl`, `timezoneOffsetHours`, `toolsStateUrl`, `toolsControlUrl`, `encodedFocusToolsSocketId`, др.

### `./web/admin/index.tsx`
- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireAccountRole`
- `@app/socket` → `genSocketId`
- `../../pages/AdminPage.vue`
- `../login` → `loginPageRoute`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../styles` → `customScrollbarStyles`, `mobileSafeAreaStyles`, `formControlStyles`, `VIEWPORT_META_CONTENT`
- `../../lib/logger.lib` → `getAdminLogsSocketId`, `writeServerLog` (и др.)
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `ADMIN_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`
- `../../lib/user-settings.lib` → `getTimezoneOffsetForCtxUser`

### `./web/profile/index.tsx`
- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `@app/socket` → `genSocketId`
- `../../pages/ProfilePage.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../styles` → `customScrollbarStyles`, `mobileSafeAreaStyles`, `formControlStyles`, `VIEWPORT_META_CONTENT`
- `../../lib/logger.lib` → `*`
- `../../config/routes` → `getFullUrl`, `ROUTES`, `getApiUrlForRoute`
- `../../config/project` → `PROFILE_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`
- `../../lib/user-settings.lib` → `getEffectiveTimezoneOffsetHours` (SSR `timezoneOffsetHours` в `ProfilePage`), `getTimezoneOffsetForCtxUser` (для других SSR при необходимости)
- `../../api/tools/state` → `toolsStateRoute`
- `../../api/tools/control` → `toolsControlRoute`
- `../../shared/focus-tools-types` → `focusToolsSocketId`

### `./web/tasks/index.tsx`
- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `../../pages/TasksPage.vue`
- `../../lib/tasks-types` → тип `TasksTreeDto`
- `../../repos/tasks.repo` → `getTreeForUser` и др.
- `../../api/tasks/tree/get` → `getTasksTreeRoute`
- `../../api/tasks/clients/create` → `createTaskClientRoute`
- `../../api/tasks/clients/update` → `updateTaskClientRoute`
- `../../api/tasks/clients/delete` → `deleteTaskClientRoute`
- `../../api/tasks/clients/reorder` → `reorderTaskClientsRoute`
- `../../api/tasks/projects/create` → `createTaskProjectRoute`
- `../../api/tasks/projects/update` → `updateTaskProjectRoute`
- `../../api/tasks/projects/delete` → `deleteTaskProjectRoute`
- `../../api/tasks/projects/reorder` → `reorderTaskProjectsRoute`
- `../../api/tasks/items/create` → `createTaskItemRoute`
- `../../api/tasks/items/update` → `updateTaskItemRoute`
- `../../api/tasks/items/delete` → `deleteTaskItemRoute`
- `../../api/tasks/items/reorder` → `reorderTaskItemsRoute`
- `../../api/tasks/tasks-ai-chat-ensure` → `taskAiChatEnsureRoute`
- `../../api/tasks/tasks-ai-chat-reset` → `taskAiChatResetRoute`
- `@app/socket` → `genSocketId`
- `../../api/tools/state` → `toolsStateRoute`
- `../../api/tools/control` → `toolsControlRoute`
- `../../shared/focus-tools-types` → `focusToolsSocketId`
- `../../shared/preloader`, `../../shared/logLevel`, `../../styles` → `customScrollbarStyles`, `mobileSafeAreaStyles`, `formControlStyles`, `VIEWPORT_META_CONTENT`
- `../../lib/logger.lib`, `../../lib/settings.lib`, `../../lib/user-settings.lib` → `getTimezoneOffsetForCtxUser`
- `../../config/routes` → `getFullUrl`, `getApiUrlForRoute`, `ROUTES`
- `../../config/project` → `TASKS_PAGE_NAME`, `getPageTitle`, `getHeaderText`

### `./web/journal/index.tsx`
- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `../../pages/JournalPage.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../styles` → `customScrollbarStyles`, `mobileSafeAreaStyles`, `formControlStyles`, `VIEWPORT_META_CONTENT`
- `../../lib/logger.lib` → `*`
- `../../repos/journal-notes.repo` → `*`
- `../../repos/inbox-notes.repo` → `*`
- `../../repos/tasks.repo` → `*`
- `../../lib/tasks-types` → `TasksTreeDto`
- `../../api/journal/notes/create` → `createJournalNoteRoute`
- `../../api/journal/notes/get` → `getJournalNoteRoute`
- `../../api/journal/notes/update` → `updateJournalNoteRoute`
- `../../api/journal/notes/delete` → `deleteJournalNoteRoute`
- `../../api/journal/inbox/create` → `createInboxNoteRoute`
- `../../api/journal/inbox/get` → `getInboxNoteRoute`
- `../../api/journal/inbox/update` → `updateInboxNoteRoute`
- `../../api/journal/inbox/archive` → `archiveInboxNoteRoute`
- `../../api/journal/inbox/delete` → `deleteInboxNoteRoute`
- `../../api/journal/inbox/list` → `listInboxNotesRoute`
- `../../api/journal/day/get` → `getJournalDayEntryRoute`
- `../../api/journal/day/save` → `saveJournalDayEntryRoute`
- `../../api/journal/week/get` → `getJournalWeekEntryRoute`
- `../../api/journal/week/save` → `saveJournalWeekDayEntryRoute`
- `../../api/journal/week/save-summary` → `saveJournalWeekSummaryRoute`
- `../../api/journal/habits/get` → `getJournalHabitsRoute`
- `../../api/journal/habits/save` → `saveJournalHabitsRoute`
- `../../repos/journal-habits.repo` → `*`
- `../../lib/journal-habits-time` → `computeHabitsMondayKeyFromNow`
- `../../api/tasks/tree/get` → `getTasksTreeRoute`
- `../../api/tasks/items/reorder-day` → `reorderTaskDayItemsRoute`
- `../../api/tasks/items/release-day` → `releaseTaskDayItemsRoute`
- `../../api/tasks/items/update` → `updateTaskItemRoute`
- `@app/socket` → `genSocketId`
- `../../api/tools/state` → `toolsStateRoute`
- `../../api/tools/control` → `toolsControlRoute`
- `../../shared/focus-tools-types` → `focusToolsSocketId`
- `../../config/routes` → `getFullUrl`, `getApiUrlForRoute`, `ROUTES`
- `../../config/project` → `JOURNAL_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`
- `../../lib/user-settings.lib` → `getTimezoneOffsetForCtxUser`
- `../../repos/journal-day-entries.repo` → `*`
- `../../lib/journal-day-key` → `computeJournalDayKeyInTimeZone`
- `../../repos/journal-week-entries.repo` → `*`
- `../../lib/journal-week-key` → `computeJournalWeekMondayKeyLocal`

### `./web/tools/index.tsx`
- `@app/html-jsx` → `jsx`
- `../../pages/ToolsPage.vue`
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `TOOLS_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`
- `../../lib/user-settings.lib` → `getTimezoneOffsetForCtxUser`

### `./web/timers/index.tsx`
- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `@app/socket` → `genSocketId`
- `../../pages/PomodoroPage.vue`
- `../../lib/focus-tools.lib` → `getFullState` (SSR начального снимка)
- `../../lib/user-settings.lib` → `getTimezoneOffsetForCtxUser`
- `../../shared/focus-tools-types` → `focusToolsSocketId`, тип `FocusToolsFullStateDto`
- `../../config/routes` → `getApiUrlForRoute`, `getFullUrl`, `ROUTES`
- `../../config/project` → `POMODORO_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`
- `../../api/tools/state` → `toolsStateRoute`
- `../../api/tools/control` → `toolsControlRoute`
- `../../api/tasks/in-progress` → `getInProgressTasksRoute`
- `../../styles` → `customScrollbarStyles`, `formControlStyles`, `mobileSafeAreaStyles`, `VIEWPORT_META_CONTENT`

### `./web/tests/index.tsx`
- `@app/html-jsx` → `jsx`
- `@app/auth` → `requireRealUser`
- `@app/socket` → `genSocketId`
- `../../lib/logger.lib` → `getAdminLogsSocketId`
- `../../pages/TestsPage.vue`
- `../../shared/preloader` → `getPreloaderStyles`, `getPreloaderScript`
- `../../shared/logLevel` → `getLogLevelForPage`, `getLogLevelScript`
- `../../styles` → `customScrollbarStyles`, `mobileSafeAreaStyles`, `formControlStyles`, `VIEWPORT_META_CONTENT`
- `../../config/routes` → `getFullUrl`, `ROUTES`
- `../../config/project` → `TESTS_PAGE_NAME`, `getPageTitle`, `getHeaderText`
- `../../lib/settings.lib` → `*`
- `../../lib/user-settings.lib` → `getTimezoneOffsetForCtxUser`

### `./web/login/index.tsx`
- `@app/html-jsx` → `jsx`
- `../../pages/LoginPage.vue`
- `../../styles` → `baseHtmlStyles`, `customScrollbarStyles`, `mobileSafeAreaStyles`, `formControlStyles`, `VIEWPORT_META_CONTENT`
- `../../config/routes` → `PROJECT_ROOT`
- `../../lib/logger.lib` → `*`

## 2) Страницы‑компоненты (Vue)

### `./pages/HomePage.vue`
- `vue` → `onMounted`, `onUnmounted`, `ref`, `withDefaults`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../shared/bootUi` → `subscribeBootStaticReady`, `scheduleHideBootLoader`
- `../shared/logger` → `createComponentLogger`
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`

### `./components/admin/AiSettings.vue`
- `vue` → `ref`, `watch`, `onMounted`, `onBeforeUnmount`
- `../api/settings/get` → `getSettingRoute`
- `../api/settings/save` → `saveSettingRoute`
- `../shared/logger` → `createComponentLogger`
- `../config/prompts` → `AVAILABLE_AI_MODELS`, `DEFAULT_AI_MODEL`

### `./pages/AdminPage.vue`
- `vue` → `onMounted`, `onBeforeUnmount`, `onUnmounted`, `ref`, `computed`, `watch`, `withDefaults`
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../api/settings/get` → `getSettingRoute`
- `../api/settings/save` → `saveSettingRoute`
- `../api/admin/logs/recent` → `getRecentLogsRoute`
- `../api/admin/logs/before` → `getLogsBeforeRoute`
- `../api/admin/dashboard/counts` → `getDashboardCountsRoute`
- `../api/admin/dashboard/reset` → `resetDashboardRoute`
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`
- `../shared/bootUi` → `subscribeBootStaticReady`, `scheduleHideBootLoader`
- `../shared/logger` → `createComponentLogger`, `setLogSink`, `LogEntry`

### `./pages/ProfilePage.vue`
- `vue` → `onMounted`, `onUnmounted`, `ref`, `withDefaults`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../api/user-settings/save` → `saveUserSettingsRoute`
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`, `USER_TIMEZONE_OFFSET_MIN`, `USER_TIMEZONE_OFFSET_MAX`
- `../shared/bootUi` → `subscribeBootStaticReady`, `scheduleHideBootLoader`
- `../shared/logger` → `createComponentLogger`
- глобально: `declare const ctx: app.Ctx` (сохранение пояса через `saveUserSettingsRoute.run`)

### `./pages/JournalPage.vue`
- `vue` → `computed`, `markRaw`, `onMounted`, `onUnmounted`, `ref`, `watch`
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../components/journal/JournalNav.vue`
- `../components/journal/JournalNotebookPane.vue`
- `../components/journal/JournalInboxPane.vue`
- `../components/journal/JournalMonthPane.vue`
- `../components/journal/JournalWeekPane.vue`
- `../components/journal/JournalDayPane.vue`
- `../components/journal/JournalDayInDevelopmentPane.vue`
- `../components/journal/JournalHabitsPane.vue`
- `../shared/bootUi` → `subscribeBootStaticReady`, `scheduleHideBootLoader`
- `../shared/logger` → `createComponentLogger`
- `../lib/tasks-types` → `TasksTreeDto`
- пропсы: `journalTabInitial?` — вкладка из `?tab=` при SSR; блокнот — `notebookPaneProps` (`journalNotes*`, папки/категории); инбокс — `inboxPaneProps` (`inboxNotes*`, отдельная Heap-таблица), компонент `JournalInboxPane`; вкладка «Задачи» (`tasks`) — `tasksTreeInitial?`, …; активная вкладка синхронизируется с адресной строкой (`replaceState`, `popstate`; для инбокса по умолчанию `?tab=` не добавляется, для блокнота — `?tab=notebook`)

### `./pages/TestsPage.vue`
- `vue` → `onMounted`, `onBeforeUnmount`, `onUnmounted`, `ref`, `computed`, `withDefaults`
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../shared/bootUi` → `subscribeBootStaticReady`, `scheduleHideBootLoader`
- `../shared/logger` → `createComponentLogger`, `setLogSink`, `LogEntry`
- `../shared/testCatalog` → `UNIT_TEST_BLOCKS`, `INTEGRATION_SERVER_TEST_BLOCKS`, `INTEGRATION_HTTP_TEST_BLOCK`, `flattenCatalogBlocks`, типы каталога
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`
- `../api/admin/logs/recent` → `getRecentLogsRoute`
- `../api/admin/logs/before` → `getLogsBeforeRoute`

### `./pages/TasksPage.vue`
- `vue` → `computed`, `nextTick`, `onMounted`, `onUnmounted`, `ref`, `watch`, `withDefaults`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../components/JnCrtSelect.vue`
- `../components/tasks/TasksAiChatPanel.vue`
- `../shared/bootUi` → `subscribeBootStaticReady`, `scheduleHideBootLoader`
- `../shared/logger` → `createComponentLogger`
- `../lib/tasks-types` → `TasksTreeDto`, `TaskClientDto`, `TaskProjectDto`, `TaskItemDto`
- `../lib/pomodoro-stats-day` → `computePomodoroStatsDayKeyForUtcOffsetHours` (при привязке задачи к Pomodoro)
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`
- событие `tasks-maybe-changed` от чата — отложенный `refreshTree` после ответа ассистента

### `./pages/ToolsPage.vue`
- `vue` → `withDefaults`
- `../components/Header.vue`
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`

### `./pages/PomodoroPage.vue`
- `vue` → `computed`, `onMounted`, `onUnmounted`, `ref`, `watch`, `nextTick`, `withDefaults`
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`
- `../components/Header.vue`
- слушатель `assistant:focus-tools-deadline` (синхронизация после срабатывания дедлайна из `Header` / `focus-deadline-alarms`)
- `../components/GlobalGlitch.vue`
- `../components/AppFooter.vue`
- `../components/pomodoro/PomodoroToolsWorkspace.vue`
- `../lib/pomodoro-phase-sounds` → `playPomodoroPhaseChangeSound`
- `../lib/pomodoro-types` → `formatPomodoroSecondsDisplay` (как `fmt`)
- `../lib/pomodoro-stats-day` → `computePomodoroStatsDayKeyForUtcOffsetHours`
- `../shared/focus-tools-types` → `FocusToolsFullStateDto`, `FocusToolsStateData`, `PomodoroSliceInFocusTools`, типы таймера/секундомера
- пропсы SSR от `web/timers/index.tsx`: `timezoneOffsetHours`, `initialFocusToolsState`, `toolsStateUrl`, `toolsControlUrl`, `encodedFocusToolsSocketId`, `getTasksUrl`
- второй блок `<style>` без `scoped` в этом же файле — глобальные CRT-стили (`.pomodoro-phase-bar`, `.pomodoro-actions`, `.pomo-btn`, …) для `/web/timers`; отдельные `.css` из `import` в `<script>` в этой среде не подключаются в бандл

### `./components/tasks/TasksAiChatPanel.vue`
- `vue` → `computed`, `onMounted`, `onUnmounted`, `ref`, `watch`, `nextTick`
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `../../shared/logger` → `createComponentLogger`
- `../../shared/tasks-ai-chat-message-order` → `sortTaskAiChatMessagesForDisplay`
- пропсы: `projectId`, `isAuthenticated`, `ensureUrl`, `resetUrl` — чат с AI на фиде (`getChat`), вебсокет + polling `messages/changes`
- `emit('tasks-maybe-changed')` при появлении нового сообщения ассистента в фиде (после JSON-действий на сервере список задач мог обновиться)

### `./pages/LoginPage.vue`
- `vue` → `computed`, `onMounted`
- `../shared/logger` → `createComponentLogger`

## 3) Компоненты (components/)

### `./components/Header.vue`
- `vue` → `computed`, `ref`, `onMounted`, `onUnmounted`, `watch`, `withDefaults`
- `@app/socket` → `getOrCreateBrowserSocketClient`
- `./LogoutModal.vue`
- `../shared/logger` → `createComponentLogger`
- `../lib/pomodoro-types` → `formatPomodoroSecondsDisplay`, типы `PomodoroPhase`, `PomodoroStateDto`
- `../lib/pomodoro-stats-day` → `computePomodoroStatsDayKeyForUtcOffsetHours`
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`
- `../lib/focus-deadline-alarms` → `createFocusDeadlineAlarms`, тип `FocusDeadlineAlarmsHandle` (wall-clock уведомление/звук по окончании фазы помидора в режиме овертайма и по окончании таймера)
- `../shared/focus-tools-types` → `FocusToolsStateData`, `HeaderWidgetMode`
- опциональные пропсы виджета: `enableToolClockWidget`, `timezoneOffsetHours`, `toolsStateUrl`, `toolsControlUrl`, `encodedFocusToolsSocketId`

### `./components/LogoutModal.vue`
- `vue` → `watch`, `onMounted`
- `../shared/logger` → `createComponentLogger`

### `./components/AppFooter.vue`
- `vue` → `onMounted`
- `../shared/logger` → `createComponentLogger`

### `./components/GlobalGlitch.vue`
- `vue` → `onMounted`
- `../shared/logger` → `createComponentLogger`

### `./components/JnCrtSelect.vue`
- `vue` → `computed`, `onMounted`, `onUnmounted`, `ref`
- `defineProps`: `modelValue`, `options`, `disabled?`, `id?`
- `defineEmits`: `update:modelValue`

### `./components/pomodoro/PomodoroTimerDial.vue`
- `vue` → `computed`
- `defineProps`: `phase`, `remainingSec`, `overtimeSec`, `phaseDurationSec`, `status`, `phaseLabel`, `statusLabel`, `timeLabel`

### `./components/pomodoro/PomodoroSettingsModal.vue`
- `vue` → `reactive`, `watch`
- `../../lib/pomodoro-types` → `PomodoroAfterLongRest`, `normalizePhaseChangeSoundId`
- `../../lib/pomodoro-phase-sounds` → `POMODORO_PHASE_CHANGE_SOUND_OPTIONS`, `playPomodoroPhaseChangeSound`
- `defineProps`: `isOpen`, `saving`, `modelValue`
- `defineEmits`: `close`, `save`

### `./components/pomodoro/PomodoroTaskSelector.vue`
- `vue` → `computed`, `onMounted`, `ref`
- `./PomodoroTaskSelectDropdown.vue`
- `defineProps`: `toolsControlUrl`, `getTasksUrl`, `currentTaskId`, `statsDayKey` (POST `/api/tools/control`, `command: { kind: 'assign-task', taskId }`)

### `./components/pomodoro/PomodoroToolStatsRow.vue`
- `defineProps`: `firstText`, `secondText`, `thirdText`, `firstLabel`, `secondLabel`, `thirdLabel`, `firstIcon`, `secondIcon`, `thirdIcon` (три ячейки `.stat-cell` в одной сетке; общая вёрстка для вкладок Pomodoro и таймера/секундомера)

### `./components/pomodoro/PomodoroToolsWorkspace.vue`
- `vue` → `computed`
- `../../shared/focus-tools-types` → `TimerToolSnapshot`, `StopwatchToolSnapshot`, `FocusToolsFullStateDto`
- `../../lib/pomodoro-types` → `formatPomodoroSecondsDisplay`, типы `PomodoroPhaseCompleteAction`, `PomodoroAfterLongRest`
- `./PomodoroTimerDial.vue`, `./PomodoroSettingsModal.vue`, `./PomodoroTaskSelector.vue`, `./FocusClockPane.vue`, `./PomodoroToolStatsRow.vue`
- `defineProps`: `state`, `localTickMs`, `sharedSelectedTaskId`, `settingsModel`, `saving`, `actionPending`, `toolsControlUrl`, `getTasksUrl`, `activeTool`, `settingsOpen`, `statsDayKey`, `timerSnapshot`, `stopwatchSnapshot`, `focusToolsWsConnected`
- `defineEmits`: `update:activeTool`, `update:settingsOpen`, `control`, `save-settings`, `pomodoro-task-assigned`, `shared-task-selected`, `focus-tools-sync`

### `./components/pomodoro/FocusClockPane.vue`
- стили панели фазы и кнопок — глобальный блок в `PomodoroPage.vue` (см. выше); в scoped `FocusClockPane` остаются оболочка, модалка настроек (`clock-settings-*`), оформление секундомерного dial
- `vue` → `computed`, `ref`, `watch`
- `../../lib/pomodoro-types` → `formatPomodoroSecondsDisplay` (как `fmt`)
- `../../shared/focus-tools-types` → `FocusToolsFullStateDto`, `TimerToolSnapshot`, `StopwatchToolSnapshot`
- `./PomodoroTimerDial.vue`, `./PomodoroTaskSelectDropdown.vue`
- `defineProps`: `mode`, `getTasksUrl`, `selectedTaskId?`, `toolsControlUrl`, `statsDayKey`, `timerSnapshot`, `stopwatchSnapshot`, `localTickMs`, `focusToolsWsConnected`
- `defineEmits`: `taskSelected`, `focus-tools-sync`

### `./components/journal/JournalStubPanel.vue`
- (только разметка заглушки «В разработке»)

### `./components/journal/JournalNav.vue`
- `defineProps`: `tabs`, `activeTab`, `showNotebookToolbar`, `showTasksToolbar`, `isAuthenticated`, `notebookCreateTitle`, `notebookCreateError`
- `defineEmits`: `select-tab`, `create-note`, `open-all-tasks`
- отвечает за левое меню журнала: список вкладок, разделитель, динамические кнопки (`Новая заметка` / `Все задачи` на вкладке «Задачи») и их стили/focus

### `./components/journal/JournalNotebookPane.vue`
- `vue` → `computed`, `ref`, `watch`
- `../../shared/logger` → `createComponentLogger`
- `./NotebookFolderSidebar.vue`, `./NotebookFilterBar.vue`, `./NotebookNoteCard.vue`, `./NotebookBulkBar.vue`, `./NotebookNoteEditor.vue`
- полноценный блокнот: папки, категории, фильтры, редактор заметок; URL `journalNotes*`, Heap `journal-notes`
- `defineEmits`: `noteCreated`, `noteUpdated`, `noteDeleted`, `foldersChanged`, `categoriesChanged`

### `./components/journal/JournalInboxPane.vue`
- `vue` → `computed`, `ref`
- `../../shared/logger` → `createComponentLogger`
- `./NotebookBulkBar.vue` — массовые действия при выборе заметок (`showFolderMove: false`)
- упрощённый список + textarea для инбокса; пропсы `inboxNotes*` включая `inboxNotesDeleteUrl` (Heap `inbox-notes`); визуально согласовано с блокнотом: тулбар как `NotebookFilterBar` (кнопка «Новая заметка» как `nb-pane-new-btn`, «Архив» как `nb-filter-btn` — при активной кнопке в списке только архивные заметки), карточки как у блокнота (выделение кликом по телу, открытие по заголовку), пустой список как `nb-pane-empty`
- `defineEmits`: `noteCreated`, `noteUpdated`, `noteDeleted`, `foldersChanged`, `categoriesChanged` (последние два не используются, для совместимости с `JournalPage`)

### `./components/journal/NotebookBulkBar.vue`
- проп `showFolderMove` (по умолчанию `true`): при `false` скрыт блок «В корень» и папки (инбокс)

### `./components/journal/JournalMonthPane.vue`
- `./JournalStubPanel.vue`

### `./components/journal/JournalWeekPane.vue`
- `vue` → `computed`, `onMounted`, `ref`, `watch`
- `../../lib/journal-week-key` → `computeJournalWeekMondayKeyLocal`, `getWeekDayKeysFromMonday`, `getWeekNumberFromMondayKey`, `shiftWeekMondayKey`

### `./components/journal/JournalDayInDevelopmentPane.vue`
- `vue` → `computed`, `onMounted`, `ref`, `watch`
- `../../lib/journal-day-key` → `computeJournalDayKeyLocal`

### `./components/journal/JournalDayPane.vue`
- `vue` → `computed`, `onUnmounted`, `ref`, `watch`
- `../JnCrtSelect.vue`
- `../../lib/tasks-types` → `TasksTreeDto`, `TaskItemDto`, `TaskProjectDto`
- `../../lib/pomodoro-stats-day` → `computePomodoroStatsDayKeyForUtcOffsetHours` (добавление задачи в Pomodoro)
- `../../shared/logger` → `createComponentLogger`
- пропсы: `isAuthenticated`, `tasksTreeInitial`, `tasksTreeGetUrl`, `taskItemReorderDayUrl`, `taskReleaseDayUrl`, `taskItemUpdateUrl`, `tasksPageUrl` — список задач «В работе», сортировка (кнопки и drag-and-drop), клик по названию — модалка редактирования (POST `taskItemUpdateUrl`), ссылки на страницу задач с `?client=&project=`

### `./components/journal/JournalHabitsPane.vue`
- `vue` → `computed`, `onMounted`, `onUnmounted`, `ref`, `watch`
- `../../lib/journal-week-key` → `shiftWeekMondayKey`
- `../../lib/journal-habits-time` → типы `JournalHabitsWeekDto`, `JournalHabitRowDto`
- пропсы: `isAuthenticated`, `journalHabitsGetUrl`, `journalHabitsSaveUrl`, `journalHabitsInitial` — недельная таблица привычек; порядок строк на текущей неделе — HTML5 DnD (ручка в первой колонке), сохранение через `scheduleSave` → POST `journalHabitsSaveUrl`; опрос текущей недели (`setInterval` 60 с) стартует в `onMounted`/`onActivated` и останавливается в `onDeactivated`/`onUnmounted`, чтобы при `KeepAlive` на вкладках журнала не крутить таймер в фоне; `watch` на `journalHabitsInitial` применяет SSR только пока `mondayKey` пуст или совпадает с `initial.mondayKey`

## 4) Shared (общий код)

### `./styles.tsx`
- нет внутренних импортов (только экспорт `baseHtmlStyles`, `customScrollbarStyles`, `mobileSafeAreaStyles`, `formControlStyles`, `VIEWPORT_META_CONTENT`)

### `./shared/preloader.ts`
- нет импортов

### `./shared/bootUi.ts`
- первая строка: `// @shared` (обязательная пометка для загрузки в клиентском бандле Chatium)
- `vue` → `nextTick` (подписка на `boot-static-ready`; ожидание `document.fonts` с таймаутом 10 с; затем `hideBootLoader`)

### `./shared/logLevel.ts`
- `../lib/settings.lib` → `getLogLevel`, `LogLevel`
- `../lib/logger.lib` → `*`

### `./shared/testCatalog.ts`
- первая строка: `// @shared`
- нет импортов — каталог блоков/тестов для `/api/tests/list` и страницы тестов (`UNIT_TEST_BLOCKS`, `INTEGRATION_SERVER_TEST_BLOCKS`, `INTEGRATION_HTTP_TEST_BLOCK`, `flattenCatalogBlocks`)

### `./shared/logger.ts`
- нет импортов (клиентский логгер по syslog RFC 5424: severity -1…7, LOG_LEVEL_OFF=-1, читает window.__BOOT__.logLevel; createComponentLogger, setLogSink, LogEntry)

### `./shared/tasks-ai-chat-message-order.ts`
- первая строка: `// @shared`
- нет импортов — `taskAiChatMsgTime`, `sortTaskAiChatMessagesForDisplay` (хронологический порядок сообщений чата с AI для UI и сервера)

## 5) Таблицы (tables/)

### `./tables/settings.table.ts`
- `@app/heap` → `Heap`

### `./tables/logs.table.ts`
- `@app/heap` → `Heap`

### `./tables/journal-notes.table.ts`
- `@app/heap` → `Heap`

### `./tables/task-clients.table.ts`
- `@app/heap` → `Heap`

### `./tables/task-projects.table.ts`
- `@app/heap` → `Heap`

### `./tables/task-items.table.ts`
- `@app/heap` → `Heap`

### `./tables/pomodoro-state.table.ts`
- `@app/heap` → `Heap` (legacy, миграция в `user-tool-state`)

### `./tables/user-tool-state.table.ts`
- `@app/heap` → `Heap`

### `./tables/journal-day-entries.table.ts`
- `@app/heap` → `Heap`

### `./tables/journal-week-entries.table.ts`
- `@app/heap` → `Heap`

### `./tables/journal-week-summary.table.ts`
- `@app/heap` → `Heap`

### `./tables/journal-habits-week.table.ts`
- `@app/heap` → `Heap`

## 6) Репозитории (repos/)

### `./repos/settings.repo.ts`
- `../tables/settings.table` → `Settings`, `SettingsRow`
- (не импортирует logger.lib — иначе рекурсия: writeServerLog → getLogLevel → getSetting → findByKey → writeServerLog)

### `./repos/logs.repo.ts`
- `../tables/logs.table` → `Logs`, `LogsRow`
- `../lib/logger.lib` → `*`
- экспортирует: `create`, `findAll`, `findById`, `findBeforeTimestamp`, `countBySeverityAfter`, `countErrorsAfter`, `countWarningsAfter`

### `./repos/journal-notes.repo.ts`
- `../tables/journal-notes.table` → `JournalNotes`, `JournalNotesRow`
- экспортирует: `JournalNoteSummary` (type), `findSummariesByUserId`, `createForUser`, `findByIdForUser`, `updateForUser`, `deleteByIdForUser`

### `./repos/journal-day-entries.repo.ts`
- `../tables/journal-day-entries.table` → `JournalDayEntries`, `JournalDayEntriesRow`

### `./repos/journal-week-entries.repo.ts`
- `../tables/journal-week-entries.table` → `JournalWeekEntries`
- `../tables/journal-week-summary.table` → `JournalWeekSummary`
- `../lib/journal-week-key` → `getWeekDayKeysFromMonday`, `getWeekNumberFromMondayKey`

### `./repos/journal-habits.repo.ts`
- `../tables/journal-habits-week.table` → `JournalHabitsWeek`
- `../lib/journal-day-key` → `computeJournalDayKeyLocal`
- `../lib/journal-habits-time` → DTO, `computeHabitsMondayKeyFromNow`, `parseRowsJson`, `serializeRowsJson`, `mergeRowsPreserveLockedDays`, `getHabitsInteractionMode`, `getTodayColumnIndexForWeek`
- `../lib/journal-week-key` → `getWeekDayKeysFromMonday`, `getWeekNumberFromMondayKey`, `shiftWeekMondayKey`

### `./repos/tasks.repo.ts`
- `../tables/task-clients.table`, `task-projects.table`, `task-items.table`
- `../lib/tasks-types` → DTO и `TaskStatus`
- реэкспорт типов из `lib/tasks-types`

### `./repos/user-tool-state.repo.ts`
- `../tables/user-tool-state.table`, `../tables/pomodoro-state.table`, `../shared/focus-tools-types`, `../lib/pomodoro-types` — JSON-снимок `timer_state`, миграция из legacy

### `./repos/tool-segments.repo.ts`
- `../tables/pomodoro-launches.table` — сегменты помидор/таймер/секундомер

### `./lib/tasks-types.ts`
- нет импортов (чистые типы DTO для задач)

### `./lib/pomodoro-phase-sounds.ts`
- первая строка: `// @shared` (импорт из Vue)
- `./pomodoro-types` → `PomodoroPhaseChangeSoundId`, `normalizePhaseChangeSoundId`
- экспорт `POMODORO_PHASE_CHANGE_SOUND_OPTIONS`, `playPomodoroPhaseChangeSound` (Web Audio API)

### `./lib/pomodoro-types.ts`
- первая строка: `// @shared` (импорт из Vue)
- нет импортов (типы статуса/фаз Pomodoro, DTO, `PomodoroPhaseChangeSoundId`, `normalizePhaseChangeSoundId`, `formatPomodoroSecondsDisplay`, `getPhaseCompletionActionForPhase`)

### `./lib/focus-deadline-alarms.ts`
- первая строка: `// @shared` (импорт из `Header.vue`)
- `../shared/focus-tools-types` → `FocusToolsStateData`
- `./pomodoro-types` → `getPhaseCompletionActionForPhase`, `normalizePhaseChangeSoundId`
- `./pomodoro-phase-sounds` → `playPomodoroPhaseChangeSound`
- планирование `setTimeout` до `phaseEndsAtMs` / `timer.endsAtMs`, звук + `Notification` + `dispatchEvent('assistant:focus-tools-deadline')`

## 7) Библиотеки (lib/)

### `./lib/settings.lib.ts`
- `../repos/settings.repo` → `*` (findByKey, findAll, upsert, deleteByKey)
- `./logger.lib` → `*` (только для функций, не вызываемых из logger.lib: getSettingString, getLogsLimit, getDashboardResetAt, getAllSettings, setSetting)

### `./lib/user-settings.lib.ts`
- `@app/auth` → `requireRealUser`
- `../repos/user-settings.repo` → `findByUserId`, `upsertTimezone`
- `../shared/user-settings-defaults` → `DEFAULT_USER_TIMEZONE_OFFSET_HOURS`, границы клампа
- экспорт: `getEffectiveTimezoneOffsetHours`, `saveTimezoneOffsetHours`, `getTimezoneOffsetForCtxUser`

### `./lib/admin/dashboard.lib.ts`
- `../settings.lib` → `*` (getDashboardResetAt, setSetting, SETTING_KEYS)
- `../../repos/logs.repo` → `*` (countErrorsAfter, countWarningsAfter)
- `../logger.lib` → `*`

### `./lib/logger.lib.ts`
- `./settings.lib` → `*` (getLogLevel, getLogWebhook, LogLevel)
- `../repos/logs.repo` → `*` (create)
- `@app/socket` → `sendDataToSocket`
- `@app/request` → `request`

### `./lib/pomodoro-stats-day.ts`
- `@shared` — ключ периода дневной статистики focus-tools (полночь по UTC+N из профиля): `computePomodoroStatsDayKeyForUtcOffsetHours`, вспомогательно `computePomodoroStatsDayKeyLocal` (календарная дата в локальном браузере), `computePomodoroStatsDayKeyInTimeZone` (IANA), `normalizeClientStatsDayKey`

### `./lib/journal-day-key.ts`
- `@shared` — ключ дневного периода (граница 05:00): `computeJournalDayKeyLocal`, `computeJournalDayKeyInTimeZone`, `normalizeClientJournalDayKey`

### `./lib/journal-week-key.ts`
- `@shared` — ключ понедельника недели и диапазон дат: `computeJournalWeekMondayKeyLocal`, `computeJournalWeekMondayKeyInTimeZone`, `normalizeWeekMondayKey`, `shiftWeekMondayKey`, `getWeekDayKeysFromMonday`, `getWeekMondayKeyForDateKey`, `getWeekNumberFromMondayKey`; импорт `journal-day-key` для `InTimeZone`

### `./lib/journal-habits-time.ts`
- `@shared` — привычки: `computeHabitsMondayKeyFromNow`, `normalizeHabitsMondayKey`, `getHabitsInteractionMode`, `getTodayColumnIndexForWeek`, DTO, `parseRowsJson`, `serializeRowsJson`, `mergeRowsPreserveLockedDays`; импорт `journal-day-key` (`computeJournalDayKeyInTimeZone`), `journal-week-key` (`computeJournalWeekMondayKeyInTimeZone` и др.); серверный fallback границы 05:00 — `Europe/Moscow`

### `./lib/focus-tools.lib.ts`
- `@app/sync` → `runWithExclusiveLock`
- `@app/socket` → `sendDataToSocket`
- `@app/nanoid` → `nanoid`
- `../repos/user-tool-state.repo`, `../repos/tool-segments.repo`, `../repos/tasks.repo`
- `../shared/focus-tools-types`, `./pomodoro-types` (`getPhaseCompletionActionForPhase`, …), `./pomodoro-stats-day` (`computePomodoroStatsDayKeyForUtcOffsetHours`), `./user-settings.lib` (канонический дневной ключ: Heap offset + `nowMs`, без подстановки ключа с клиента)

## 8) API (api/)

### `./api/settings/list.ts`
- `@app/auth` → `requireAccountRole`
- `../../lib/settings.lib` → `*`
- `../../lib/logger.lib` → `*`

### `./api/settings/get.ts`
- `@app/auth` → `requireAccountRole`
- `../../lib/settings.lib` → `*`
- `../../lib/logger.lib` → `*`

### `./api/settings/save.ts`
- `@app/auth` → `requireAccountRole`
- `../../lib/settings.lib` → `*`
- `../../lib/logger.lib` → `*`

### `./api/user-settings/get.ts`
- `@app/auth` → `requireRealUser`
- `../../lib/user-settings.lib` → `getEffectiveTimezoneOffsetHours`

### `./api/user-settings/save.ts`
- `@app/auth` → `requireRealUser`
- `../../lib/user-settings.lib` → `saveTimezoneOffsetHours`

### `./api/logger/log.ts`
- `@app/auth` → `requireAnyUser`
- `../../lib/logger.lib` → `*`

### `./api/journal/notes/list.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-notes.repo` → `*`

### `./api/journal/notes/create.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-notes.repo` → `*`

### `./api/journal/notes/get.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-notes.repo` → `*`

### `./api/journal/notes/update.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-notes.repo` → `*`

### `./api/journal/notes/delete.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-notes.repo` → `*`

### `./api/journal/inbox/list.ts`, `get.ts`, `create.ts`, `update.ts`, `archive.ts`, `delete.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/inbox-notes.repo` → `*`

### `./api/tasks/tree/get.ts` и CRUD `api/tasks/{clients,projects,items}/`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/tasks.repo` → `*`

### `./api/journal/day/get.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-day-entries.repo` → `*`
- `../../../lib/journal-day-key` → `computeJournalDayKeyInTimeZone`, `normalizeClientJournalDayKey`

### `./api/journal/day/save.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-day-entries.repo` → `*`
- `../../../lib/journal-day-key` → `computeJournalDayKeyInTimeZone`, `normalizeClientJournalDayKey`

### `./api/journal/week/get.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-week-entries.repo` → `*`
- `../../../lib/journal-week-key` → `computeJournalWeekMondayKeyLocal`, `normalizeWeekMondayKey`

### `./api/journal/week/save.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-week-entries.repo` → `*`
- `../../../lib/journal-week-key` → `getWeekMondayKeyForDateKey`, `normalizeClientJournalDateKey`

### `./api/journal/week/save-summary.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-week-entries.repo` → `*`
- `../../../lib/journal-week-key` → `normalizeWeekMondayKey`

### `./api/journal/habits/get.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-habits.repo` → `*`
- `../../../lib/journal-habits-time` → `computeHabitsMondayKeyFromNow`, `normalizeHabitsMondayKey`
- `../../../lib/journal-week-key` → `getWeekMondayKeyForDateKey`

### `./api/journal/habits/save.ts`
- `@app/auth` → `requireRealUser`
- `../../../lib/logger.lib` → `*`
- `../../../repos/journal-habits.repo` → `*`
- `../../../lib/journal-habits-time` → `computeHabitsMondayKeyFromNow`, `normalizeHabitsMondayKey`, `type JournalHabitRowDto`
- `../../../lib/journal-week-key` → `getWeekMondayKeyForDateKey`

### `./api/tasks/tasks-ai-chat-lib.ts`
- `@app/auth` → `findUsersByIds`, `SmartUser`
- `@app/feed` → `createFeedMessage`
- `../../shared/tasks-ai-chat-message-order` → `taskAiChatMsgTime` (реэкспорт)
- `../../repos/task-ai-chat.repo`, `../../repos/tasks.repo`
- типы и хелперы чата с AI (маппинг авторов, контекст проекта для completion, `appendTaskAiChatAssistantMessage`)

### `./api/tasks/tasks-ai-chat-messages-get.ts`
- `@app/auth` → `requireRealUser`, `findUsersByIds`
- `@app/feed` → `feedMessagesGetHandler`, `getFeedById`
- `./tasks-ai-chat-lib` → `assertTaskAiChatFeedAccess`, `mapTaskAiChatMessage`, `TaskAiChatFeedMsg`
- `../../shared/tasks-ai-chat-message-order` → `sortTaskAiChatMessagesForDisplay` (после маппинга — порядок старые→новые для UI)

### `./api/tasks/tasks-ai-chat-messages-changes.ts`
- `@app/auth` → `requireRealUser`, `findUsersByIds`
- `@app/feed` → `feedMessagesChangesHandler`, `getFeedById`
- `./tasks-ai-chat-lib` → `assertTaskAiChatFeedAccess`, `mapTaskAiChatMessage`, `TaskAiChatFeedMsg`

### `./api/tasks/tasks-ai-chat-messages-add.ts`
- `@app/auth` → `requireRealUser`, `findUsersByIds`
- `@app/feed` → `feedMessagesAddHandler`, `getFeedById`
- `./tasks-ai-chat-lib` → `mapAuthorForTaskAiChat`, `assertTaskAiChatFeedAccess`, `TaskAiChatFeedMsg`
- `./tasks-ai-chat-reply` → `runTaskAiChatReplyIfNeeded`
- `../../repos/task-ai-chat.repo`

### `./api/tasks/tasks-ai-chat-reply.ts`
- `@app/feed` → `findFeedMessages`
- `@app/sync` → `runWithExclusiveLock`
- `@start/sdk` → `startCompletion`
- `../../config/prompts` → `TASKS_AI_CHAT_JSON_APPENDIX`; `../../lib/settings.lib` → `getAiFormulateSystemPrompt`, `getAiModel`
- `../../repos/task-ai-chat.repo`
- `./tasks-ai-chat-completion-completed`, `./tasks-ai-chat-completion-failed`, `./tasks-ai-chat-lib`
- вызывается из `tasks-ai-chat-messages-add` (HTTP) — `startCompletion` требует proxy app context (`ctx.app`)

### `./api/tasks/tasks-ai-formulate-apply.ts`
- `../../lib/logger.lib`, `../../repos/tasks.repo`
- `parseAiFormulateJsonFromText`, `stripJsonFences`, `applyAiFormulateJsonResponse` (логика бывшего `ai-formulate` по `actions`)

### `./api/tasks/tasks-ai-chat-completion-completed.ts` / `tasks-ai-chat-completion-failed.ts`
- `@start/sdk` → `CompletionCompletedBody` / `CompletionFailedBody`
- `../../lib/logger.lib`, `./tasks-ai-chat-lib` → `appendTaskAiChatAssistantMessage`
- completed: `./tasks-ai-formulate-apply` (JSON → Heap)

### `./api/tasks/tasks-ai-chat-ensure.ts`
- `@app/auth` → `requireRealUser`
- `@app/feed` → `getChat`, `getOrCreateParticipant`
- `./tasks-ai-chat-messages-add` → `taskAiChatMessagesAddRoute`
- `./tasks-ai-chat-messages-changes` → `taskAiChatMessagesChangesRoute`
- `./tasks-ai-chat-messages-get` → `taskAiChatMessagesGetRoute`
- `../../lib/logger.lib`, `../../repos/task-ai-chat.repo`

### `./api/tasks/tasks-ai-chat-reset.ts`
- `@app/auth` → `requireRealUser`
- `@app/feed` → `getOrCreateParticipant`
- `../../lib/logger.lib`, `../../repos/task-ai-chat.repo`

### `./repos/task-ai-chat.repo.ts`
- `@app/feed` → `createFeed`, `deleteFeed`
- `@app/sync` → `runWithExclusiveLock`
- `../tables/task-ai-chat-feeds.table`, `../tables/task-projects.table`

### `./tables/task-ai-chat-feeds.table.ts`
- `@app/heap` → `Heap`

### `./api/admin/logs/recent.ts`
- `@app/auth` → `requireAccountRole`
- `../../../repos/logs.repo` → `*`
- `../../../lib/logger.lib` → `*`
- `../../../tables/logs.table` → `LogsRow` (type)

### `./api/admin/logs/before.ts`
- `@app/auth` → `requireAccountRole`
- `../../../repos/logs.repo` → `*`
- `../../../lib/logger.lib` → `*`
- `../../../tables/logs.table` → `LogsRow` (type)

### `./api/admin/dashboard/counts.ts`
- `@app/auth` → `requireAccountRole`
- `../../../lib/admin/dashboard.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/admin/dashboard/reset.ts`
- `@app/auth` → `requireAccountRole`
- `../../../lib/admin/dashboard.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/tests/list.ts`
- `@app/auth` → `requireAnyUser`
- `../../lib/logger.lib` → `*`
- `../../shared/testCatalog` → `UNIT_TEST_BLOCKS`, `INTEGRATION_SERVER_TEST_BLOCKS`, `INTEGRATION_HTTP_TEST_BLOCK`, `flattenCatalogBlocks`

### `./api/tests/unit/index.ts`
- `@app/auth` → `requireAnyUser`
- `../../../config/routes` → `getFullUrl`, `PROJECT_ROOT`
- `../../../config/project` → `getPageTitle`, `INDEX_PAGE_NAME`
- `../../../shared/logLevel` → `getLogLevelScript`
- `../../../lib/logger.lib` → `*`

### `./api/tests/integration/index.ts`
- `@app/auth` → `requireAnyUser`
- `../../../lib/settings.lib` → `*`
- `../../../repos/settings.repo` → `*`
- `../../../repos/logs.repo` → `*`
- `../../../lib/admin/dashboard.lib` → `*`
- `../../../lib/logger.lib` → `*`

### `./api/tools/state.ts`
- `@app/auth` → `requireRealUser`
- `@app/socket` → `genSocketId`
- `../../lib/focus-tools.lib` → `getFullState`
- `../../shared/focus-tools-types` → `focusToolsSocketId`

### `./api/tools/control.ts`
- `@app/auth` → `requireRealUser`
- `../../lib/focus-tools.lib` → `executeCommand`

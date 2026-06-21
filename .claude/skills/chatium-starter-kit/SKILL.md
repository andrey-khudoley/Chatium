---
name: chatium-starter-kit
description: Добавляет в Chatium-проект стандартный набор компонентов одной командой — логирование, таблицы, админ API, структуру тестов по эталону inner/samples/new_project.
---

# chatium-starter-kit

## Что входит в набор (только логика и структура)

Брать из образца **inner/samples/new_project** перечисленные ниже файлы; не копировать дизайн страниц (AdminPage.vue, UnitTestsPage.vue, HomePage и т.д.). Авторизация (login, profile) и визуальные компоненты — при необходимости смотреть в образце отдельно.

### Логирование

- **shared/debug.ts** — класс Debug: уровни info/warn/error, префикс, запись в `ctx.account.log`, callback для сохранения в Heap, WebSocket для real-time. Использовать вместо `console.log`.
- **lib/logging.ts** — кэш уровня и префикса из настроек, счётчики ошибок/предупреждений, персист в таблице настроек, нормализация значений.
- **lib/logs-operations.ts** — сохранение логов в Heap (persistLog), trim при превышении лимита, опциональный вебхук, получение логов и счётчиков.
- **lib/logs-init.ts** — инициализация: связка Debug → persistLog и callbacks для инкремента счётчиков (избежание циклических зависимостей).

### Таблицы Heap

- **tables/settings.table.ts** — ключ-значение (ProjectSettings): настройки проекта, уровень и префикс логов, счётчики и т.п.
- **tables/projectLogs.table.ts** — логи (level, message, code); системные поля createdAt/updatedAt добавляются автоматически.

### Настройки

- **lib/settings-init.ts** — инициализация настроек по умолчанию (например log_prefix); вызов при старте, без импорта логгера в файл таблицы.
- **lib/settings.ts** — загрузка настроек проекта из БД (loadProjectSettings и др.); при необходимости адаптировать ключи под проект.

### Админ API

- **api/admin-settings.ts** — GET/POST настроек (project_name, project_title, project_description, log_level, logs_webhook_url/enabled). Обязательна проверка прав: `requireAccountRole(ctx, 'Admin')` (из `@app/auth`).
- **api/admin-logs.ts** — сброс счётчиков, получение socket-id для WebSocket, тестовые эндпоинты (test-error, test-warning). Обязательна проверка прав: `requireAccountRole(ctx, 'Admin')` (из `@app/auth`), как для admin-settings. В контексте `@shared-route` Heap может быть не инициализирован — в образце часть эндпоинтов возвращает 503 с подсказкой использовать страницу админки; при реализации учитывать это.

Роуты админки — по file-based роутингу; ссылки формировать через `withProjectRoot(route.url())`.

### Структура тестов

- **tests/index.tsx** — роут страницы тестов (например GET `/tests`).
- **tests/shared/test-definitions.ts** — определения категорий и тестов (TestDefinition, TestCategory).
- **tests/api/** — при необходимости эндпоинты запуска тестов (см. образец: run-tests.ts, start-tests.ts).
- **tests/pages/** — Vue-страницы тестов по образцу; дизайн не копировать, только структуру.

### Опционально

- **admin.tsx** — серверный роут страницы админки: проверка роли Admin, загрузка настроек и логов, передача данных во Vue-компонент. При необходимости брать логику из образца.
- **config/routes.ts** — константы DOMAIN, PROJECT_ROOT, ROUTES, getFullUrl — для формирования URL и избежания циклических зависимостей между роутами.

## Ограничения Chatium

- Логирование: использовать `ctx.account.log()` или обёртку (Debug); не `console.log` в продакшене.
- Роутинг: file-based (один файл — один роут); ссылки — `withProjectRoot(route.url())`.
- Heap: таблицы и `.run()` только на сервере; в API с `@shared-route` Heap может быть не инициализирован — учитывать при доступе к логам/настройкам.
- Фильтрация: через `where`, не через `filter`; подсчёт — `countBy`, не `findAll().length`.
- Документация платформы: inner/docs (навигатор 000-summ.md, 006-arch, 008-heap, 001-standards и др.).

## Рекомендации после применения набора

- Обновить **README.md**, **.CHATIUM-LLM.md** и **docs/** (architecture, api, data) в целевом проекте, чтобы они отражали добавленные таблицы, API и структуру тестов.
- Правила проекта: при изменениях кода обновлять документацию (renew-docs, renew-readme, renew-chatiumllm).

## Ссылки на документацию

- **006-arch.md** — структура проекта, каталоги, именование
- **001-standards.md** — стили, форматирование
- **008-heap.md** — таблицы, CRUD, race condition, runWithExclusiveLock
- **.cursor/rules/chatium-constraints.mdc** — глобальные ограничения платформы

## Примеры

- **inner/samples/new_project/** — эталон состава стартового набора: логирование (shared/debug, lib/logging, logs-operations, logs-init), таблицы settings и projectLogs, настройки, админ API, тесты, опционально admin.tsx и config/routes. При расхождении путей ориентироваться на актуальную структуру в этом каталоге. При отсутствии каталога inner в репозитории — на структуру p/template_project или актуальный образец в документации платформы.

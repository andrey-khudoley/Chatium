# Архитектура проекта p/saas/chat

## Слои

- **Роуты** — file-based: один файл = один роут, путь внутри файла `'/'`. Корень приложения — `index.tsx`; остальные браузерные роуты — в `web/`, API — в `api/`.
- **config/** — PROJECT_ROOT, ROUTES, withProjectRoot(); обязателен для формирования ссылок без хардкода.
- **api/** — тонкий слой: валидация запроса, проверка прав, вызов lib.
- **lib/** — доменная логика (logger.lib, logger-settings.lib); не обращается к таблицам напрямую, использует repos.
- **repos/** — работа с Heap (CRUD); без бизнес-правил.
- **tables/** — схемы Heap-таблиц.
- **shared/** — код, используемый и на сервере, и на клиенте (например, app-paths).
- **pages/, components/** — Vue-страницы и переиспользуемые компоненты; данные только через API (Heap только на сервере).
- **components/ui/** — переиспользуемые UI-компоненты (AppButton, AppCard, AppSection, AppSelect, AppNotification) для единообразного оформления форм, карточек и уведомлений.

## Логирование

- **lib/logger.lib.ts** — writeServerLog(ctx, entry), shouldLogByLevel(level, severity). Уровень задаётся в настройках (app-settings, ключ log_level).
- **lib/logger-settings.lib.ts** — getLogLevel, setLogLevel (для админки), getMetrics, resetMetrics, incrementMetric (для счётчиков).
- Запись логов: ctx.log, ctx.account.log, таблица server-logs (через repos/server-logs.repo).
- Ключевые сценарии (отправка сообщений, ошибки) логируются и увеличивают счётчики (processedMessages, errors).

## Админка

- Управление уровнем логирования и просмотр/сброс счётчиков — в компоненте **AdminSettings** (Профиль → Настройки), доступно роли Admin.
- Роут **web/admin/logs** — редирект на главную с открытием вкладки «Настройки» профиля. Доступ только для роли Admin; при отсутствии прав возвращается 403.

## Роутинг

- Ссылки формировать через `withProjectRoot(route.url())` из `config/routes.tsx`.
- Избегать путей с `~` (один файл — один роут с `'/'`).

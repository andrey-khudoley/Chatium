# units/aley/bpm/interfaces/web

## Назначение

BPM Web для Chatium. Минимальный старт: главная страница, админка, профиль и логин.

## Важно

- Платформа: Chatium. Серверная часть управляется платформой.
- Стек фиксирован платформой, новые зависимости не добавляем.
- Деплой происходит автоматически после пуша.

## Текущее состояние

- **Главная (`/`) — экран FLOW (BPM Терминал)**: дизайн из Claude Design (проект «BPM-система личного пользования»), перенесён в `pages/FlowPage.vue` — одностраничное приложение с внутренней навигацией (Главная, Журнал, Задачи [Доска/Таблица/Таймлайн/GTD], Диалоги, Дизайн-система, Финансы, PARA, Инструменты, Сервисы, Библиотека) на in-memory моках; глобальный CSS — `pagecss/flowCss.ts`. Корневой `index.tsx` монтирует FlowPage. Старый `HomePage.vue` оставлен на диске, но из роутинга исключён.
- Админка, профиль и логин существуют как минимальные служебные страницы шаблона.
- Реализованы: API настроек (list, get, save), Heap-таблица settings, репозиторий, lib (бизнес-логика).
- Серверные логи: Heap-таблица logs (message, payload, severity, level, timestamp), repos/logs.repo (create, findAll, findById, findBeforeTimestamp, countBySeverityAfter, countErrorsAfter, countWarningsAfter), lib/logger.lib (проверка уровня по настройке log_level, запись в ctx.log — только сообщение, в ctx.account.log — сообщение и payload, Heap, WebSocket с хэшем для уникальности канала, вебхук log_webhook { enable, url } по умолчанию url: ""). API POST /api/logger/log (AnyUser), body: { severity, level, message, payload?, timestamp? }; GET /api/admin/logs/recent (Admin) — последние N логов; GET /api/admin/logs/before (Admin) — N логов старше указанного timestamp для пагинации. Админка получает encodedLogsSocketId, подписывается на new-log для отображения в дашборде, загружает историю логов через recent при монтировании, может догружать старые логи через before (кнопка «Загрузить ещё 50»); кнопка «Очистить логи» очищает вывод и сдвигает таймштамп на текущий — повторное нажатие «Загрузить ещё 50» восстанавливает последние логи.
- Дашборд админки: счётчики ошибок и предупреждений. Настройка `dashboard_reset_at` (таймштамп сброса в ms); lib/admin/dashboard.lib (getDashboardCounts, resetDashboard), GET /api/admin/dashboard/counts и POST /api/admin/dashboard/reset (Admin). При монтировании загружаются счётчики; кнопка «Сбросить» записывает текущее время в настройки; при новых логах (sink/WebSocket) инкремент только если timestamp >= dashboardResetAt.
- API тестов: `GET /api/tests/list`, `GET /api/tests/unit` (логика в `lib/tests/templateUnitSuite.ts`), `GET /api/tests/integration` (`lib/tests/integrationSuite.ts`); при провале кейса пишется серверный лог через `lib/tests/logTestRunFailures.ts` (severity 3, чтобы сообщения были видны при строгом `log_level`). На `/web/tests` — три вкладки (Юнит / Интеграция / HTTP), метрики по активной вкладке, HTTP-проверки с фрагментами SSR, точечный запуск теста (play); категории внутри вкладки можно сворачивать (по умолчанию открыта первая). Каталог `api/tests/endpoints-check/` удалён (логика перенесена из `k/assistant`).
- При серверной загрузке **всех страниц** (главная, админка, профиль, тесты, логин) уровень логирования читается из настроек и передаётся на клиент в `window.__BOOT__.logLevel` (shared/logLevel.ts). В браузере доступен shared/logger по стандарту syslog (RFC 5424): уровни -1 (логи выключены, LOG_LEVEL_OFF), 0–7 (Emergency…Debug), функции `logEmergency`, `logAlert`, `logCritical`, `logError`, `logWarning`, `logNotice`, `logInfo`, `logDebug`; `createComponentLogger(name)` для логов с префиксом; `setLogSink`, `LogEntry` для дашборда. Вывод только если severity не строже настроенного порога.
- Клиентская часть полностью покрыта логами: страницы и компоненты используют `createComponentLogger`; все аутентифицированные страницы (главная, админка, профиль, тесты) подключают `browserRemoteLogger` (shared/browserRemoteLogger.ts) для пакетной отправки браузерных логов на сервер через POST /api/logger/browser. AdminPage дополнительно регистрирует sink для счётчиков дашборда и подписку на WebSocket для отображения логов в реальном времени. Каждая страница логирует этапы загрузки (монтирование, boot loader state, инициализация remote logger, анимации) и сырые данные (props, URL-ы, auth state) для полной трассировки.

## Навигация по документации

- Источник истины: `docs/spec/spec.md`
- Архитектура: `docs/architecture.md`
- API: `docs/api.md`
- Данные: `docs/data.md`
- Правила изменений: `docs/spec/spec.md`, раздел 15
- Импорты/циклы: `docs/imports.md`
- Решения: `docs/ADR/`
- История диалогов: `docs/LLM/`

## TODO

- Заполнить UI для главной/админки/профиля.
- Добавить реальные сценарии авторизации.
- Описать бизнес‑логику и данные.

## Changelog

- 2026-06-22: главная (`/`) заменена на дизайн «FLOW / BPM Терминал» из Claude Design — `pages/FlowPage.vue` (SPA: Главная / Журнал / Задачи [Доска·Таблица·Таймлайн·GTD] / Диалоги / Дизайн-система / Финансы / PARA / Инструменты / Сервисы / Библиотека) на моках; новый `pagecss/flowCss.ts`; переписан `index.tsx` (шрифты Manrope + JetBrains Mono, без boot-loader/CRT). `HomePage.vue` сохранён на диске, но из роутинга исключён. Темизация — CSS-переменные на корне; клиентская интерактивность и логирование (`createComponentLogger` + `browserRemoteLogger`) сохранены. Проверки: типы (ok), стиль (ok), runtime-architecture-checker (0 находок), file-based-routing-checker (чисто).
- 2026-06-17: добавлена spec-as-source спецификация `docs/spec/spec.md` как источник истины по маршрутам, API, данным, логированию, UI, тестам и правилам развития проекта.
- 2026-04-05: разделение логирования по уровням Info/Debug — trace-логи (карта вызовов) severity 6, видны при Info; payload (сырые данные) автоматически отсекается при уровне != Debug; shouldIncludePayload в lib/logger.lib.ts, фильтрация non-string args в shared/logger.ts; добавлены недостающие trace-логи на сервере (api/logger/browser, api/tests/list) и в Vue-компонентах (onBeforeUnmount, saveProjectName, loadProjectName, setupLogsWebSocket, loadRecentLogs и др.).
- 2026-04-05: browserRemoteLogger подключён на всех страницах (главная, админка, профиль, тесты); logLevel SSR добавлен на страницу логина; подробное логирование этапов загрузки с сырыми данными на каждой странице; AdminPage — sink комбинирует дашборд-счётчики и remote logger.
- 2026-04-05: админка и тесты — восстановлена полная ширина полотна: `.app-layout`, `<main>`, `.ap`/`.tp` с `width: 100%` и `min-w-0` где нужно; первая колонка сетки `minmax(240px, 1fr)` вместо `minmax(0, 1fr)`, чтобы основной контент не сжимался.
- 2026-04-05: админка и тесты — вертикальный скролл перенесён с `<main>` на левую колонку (`.ap-main` / `.tp-main`); сетка с `minmax(0,1fr)` задаёт высоту ряда между шапкой и футером, колонка логов не двигается при прокрутке слева; `content-wrapper` на левой колонке для скроллбара. Узкий экран: снова скроллится `<main>`.
- 2026-04-05: `customScrollbarStyles` — приглушённый нейтральный скроллбар (тёмно-серый на почти чёрной дорожке, 6px, без акцента и свечения), в духе CRT остаётся только геометрия без скруглений.
- 2026-04-05: админка и `/web/tests`: хедер и футер закреплены в пределах экрана; `body.boot-complete` без вертикального скролла; стили `.app-layout` в `AdminPage.vue` и `TestsPage.vue`. Обновлены `docs/architecture.md`, `styles.tsx` (комментарий к скроллбару).
- 2026-04-04: логирование провалов юнит/интеграционных тестов: `lib/tests/logTestRunFailures.ts`, вызов из `api/tests/unit` и `api/tests/integration`; severity 3 на каждый FAIL и на итог при `failed > 0`. Обновлены `docs/api.md`, `docs/imports.md`.
- 2026-04-04: расширены тесты шаблона: `lib/tests/templateUnitSuite.ts`, `lib/tests/integrationSuite.ts`; обновлён `shared/testCatalog.ts`; `TestsPage.vue` — вкладки Юнит / Интеграция / HTTP (без «Архив»), метрики по вкладке, HTTP-проверки с SSR; `shared/logger` — чтение `globalThis.window` для серверных проверок `shouldLog`. Документация и `docs/imports.md` обновлены.
- 2026-03-31: `pages/TestsPage.vue` — интерфейс тестов приближен к `p/units/aom/lava_gc_integration`: добавлен точечный запуск одного теста из строки (unit/integration/http), состояние одиночного прогона и блокировка групповой кнопки во время одиночного запуска.
- 2026-03-29: тесты синхронизированы с `k/assistant`: `shared/testCatalog.ts`, `api/tests/unit`, `api/tests/integration`, обновлён `api/tests/list`; удалён `api/tests/endpoints-check/`; `pages/TestsPage.vue` и `web/tests/index.tsx` — новый UI и прогоны; документация обновлена.
- 2026-02-04: фиксированная высота (400px) блока логов на странице тестов — TestsPage.vue, класс .tests-logs-output.
- 2026-02-04: исправлена рекурсия Maximum call stack size exceeded при обращении к проекту (p/neso/crm/index): в repos/settings.repo.ts убраны все вызовы logger.lib — getSetting/getLogLevel/getLogWebhook вызываются из writeServerLog и используют findByKey, иначе цепочка зациливалась. Обновлён docs/imports.md.
- 2026-02-04: в lib/logger.lib: в ctx.log передаётся только сообщение (без payload), в ctx.account.log — сообщение и payload (level, json). Обновлён JSDoc writeServerLog.
- 2026-02-04: покрытие debug-логами всех слоёв: при уровне Debug трассировка в lib (logger.lib через ctx.log без рекурсии; settings.lib, dashboard.lib — вход/выход и переменные), repos (settings.repo, logs.repo; в logs.repo.create логи не пишутся, чтобы не было рекурсии), api (парсинг, переменные, возвраты), web и index (шаги и переменные), shared/logger (setLogSink). В settings.lib не логируют getSetting, getLogLevel, getLogWebhook — они вызываются из logger.lib. Обновлены docs/imports.md.
- 2026-02-03: страница тестов разбита на шесть блоков по слоям: Проверка эндпоинтов (маршруты), Библиотека настроек, Репозиторий настроек, Библиотека логов, Репозиторий логов, Библиотека админки. API тестов расширен: config, settings-lib, settings-repo, logger-lib, logs-repo, dashboard-lib (каждый возвращает results[]). В репозиториях соблюдён порядок «создание до чтения» (create/upsert перед read); в logs.repo добавлен тест create. Документация api.md и imports.md обновлены.
- 2026-02-03: страница тестов — блок «Проверка эндпоинтов»: реальные HTTP-проверки (health, ping), список тестов с [TODO]/[SUCCESS]/[FAIL], описания и техническая информация по каждому тесту, легенда статусов, понятные формулировки для тестировщика; кнопка «Запустить проверку эндпоинтов»; дашборд метрик обновляется по результатам прогона.
- 2026-02-03: API слой для тестов: api/tests/list (каталог категорий и тестов), api/tests/endpoints-check/ (категория «проверка эндпоинтов») с health и ping — по одному эндпоинту «/» в файле; docs/api.md и docs/imports.md обновлены.
- 2026-02-03: страница тестов (TestsPage): дашборд с метриками (всего/пройдено/провалено/пропущено), кнопка «Запустить все тесты»; блок «Проверка эндпоинтов» с кнопкой «Запустить тесты группы». Обработчики пока заглушки под будущий API.
- 2026-02-02: админка — поле «Название проекта»: debounce уменьшен с 2 с до 300 мс; снят :disabled при сохранении, чтобы поле не теряло фокус при отправке запроса.
- 2026-02-02: название проекта из настроек (input#project-name в админке) используется при серверном рендере: заголовок h1 в шапке — «название из настроек / Название страницы», document title — «Название страницы - Название из настроек». config/project: getPageTitle(pageName, projectName), getHeaderText(pageName, projectName); index, web/admin, web/profile читают project_name через settingsLib.getSettingString и передают в getPageTitle/getHeaderText; Header.vue — в h1 только projectTitle (убран отдельный вывод pageName).
- 2026-02-02: дашборд админки: счётчики ошибок и предупреждений после таймштампа сброса; настройка dashboard_reset_at, lib/admin/dashboard.lib, GET /api/admin/dashboard/counts, POST /api/admin/dashboard/reset; repos/logs.repo — countBySeverityAfter, countErrorsAfter, countWarningsAfter (несколько countBy по severity); при новых логах (sink/WebSocket) инкремент только если entry.timestamp >= dashboardResetAt.
- 2026-02-02: админка — блок логов: кнопка «Загрузить ещё 50» ~90% ширины, рядом квадратная кнопка «Очистить логи» (корзина); при очистке таймштамп сдвигается на текущий (Date.now()), кнопка «Загрузить ещё 50» восстанавливает последние логи с сервера.
- 2026-02-02: стили скроллбара (customScrollbarStyles в styles.tsx): body, .content-wrapper, .custom-scrollbar; подключены на главной, админке, логине и профиле; исправление для Chrome 121+ через @supports not selector(::-webkit-scrollbar).
- 2026-02-02: оптимизирована функция findBeforeTimestamp в repos/logs.repo — использует нативную фильтрацию Heap API через `where: { timestamp: { $lt } }` вместо загрузки избыточных данных и фильтрации в памяти.
- 2026-02-02: добавлена пагинация логов в админке: GET /api/admin/logs/recent (последние N логов), GET /api/admin/logs/before (N логов старше timestamp); repos/logs.repo.findBeforeTimestamp; AdminPage загружает историю при монтировании и может догружать старые логи по кнопке «Загрузить ещё 50».
- 2026-02-02: админка: индикаторы «Сохранено»/«Ошибка» в правом верхнем углу карточек «Настройки проекта» и «Уровень логирования» после ответа сервера (3 с); автосохранение поля «Название проекта» с debounce 2 с без ожидания blur.
- 2026-02-02: исправлен вызов GET api/settings/get в AdminPage: query передаётся через getSettingRoute.query({ key }).run(ctx) вместо .run(ctx, { query }), по inner/docs (002-routing, 001-run).
- 2026-02-02: сериализация payload при записи в Heap (lib/logger.lib): JSON.stringify для объектов, чтобы в таблице логов отображался корректный JSON вместо "[object Object]".
- 2026-02-02: серверные логи: таблица logs, repos/logs.repo, lib/logger.lib, api/logger/log (POST), админка — encodedLogsSocketId и подписка на new-log; сокет без accountId. Body API: только message (обяз.), severity? (0–7), payload?; timestamp и level вычисляются в lib; имя модуля в тексте message. Формат вывода: `[DD.MM.YYYY HH:mm:ss.SSS] [LEVEL] message` (пробелы между группами в скобках).
- 2026-02-01: клиентская часть покрыта логами (createComponentLogger, setLogSink, sink в AdminPage дашборде; HomePage, AdminPage, ProfilePage, LoginPage, Header, AppFooter, GlobalGlitch, LogoutModal).
- 2026-02-01: добавлен уровень логирования Debug (кнопка в админке перед Info, lib LOG_LEVELS, logger CONFIG_LEVELS и порог, API save -1–4), порядок: Debug, Info, Warn, Error, Disable.
- 2026-02-01: уровень логирования -1 (логи выключены): LOG_LEVEL_OFF в shared/logger, приём -1 в window.**BOOT**.logLevel, API save принимает -1 → Disable.
- 2026-02-01: shared/logger — логгер для браузера (logInfo, logWarn, logError с проверкой уровня по window.**BOOT**.logLevel), импорт в HomePage, AdminPage, ProfilePage.
- 2026-02-01: чтение уровня логирования при загрузке страницы — shared/logLevel.ts, вызов getLogLevel в lib, скрипт window.**BOOT**.logLevel на главной, админке и профиле (без логина).
- 2026-02-01: мгновенное сохранение уровня логирования в админке (кнопки → .run() → POST /api/settings/save), нормализация чисел 0–3 и строк в API.
- 2026-02-01: добавлен ADR-0002 — настройки в Heap и слоистая архитектура API (решения коммита aaf4a0a).
- 2026-02-01: обновлено «Текущее состояние» — отражены API настроек, таблица, репозиторий, lib.
- 2026-01-31: создана базовая структура и первичная документация.

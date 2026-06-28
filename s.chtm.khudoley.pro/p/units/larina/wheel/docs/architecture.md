# Architecture

## Назначение

Проект «Колесо удачи»: интерактивная главная страница с анимированным колесом фортуны. Построен на базе шаблона `p/template_project`.

## Ограничения платформы

- Серверная инфраструктура предоставляется Chatium.
- Нельзя менять стек и зависимости.
- Деплой — автоматически при пуше.

## Основные сценарии

- Открыть главную страницу — запустить колесо удачи, получить результат.
- Авторизоваться и попасть в профиль.
- Открыть админку (только роль Admin).

## Роутинг

- `index.tsx` — главная (SSR + Vue), маршрут `/`. Монтирует `WheelPage.vue`; подключает Google Fonts и CSS из `pagecss/`.
- `web/admin/index.tsx` — админка, `requireAccountRole('Admin')`.
- `web/profile/index.tsx` — профиль, `requireRealUser()`.
- `web/tests/index.tsx` — страница тестов, `requireRealUser()`.
- `web/login/index.tsx` — вход (редирект на системный `/s/auth/signin`).
- `web/winners/index.tsx` — публичная страница «Список победителей» (SSR + Vue, `WinnersPage.vue`). Пагинация батчами по 50 через `offset`. Дизайн в стиле темы колеса.

## Вёрстка админки и страницы тестов

- Корень Vue (`.app-layout` в `AdminPage.vue` / `TestsPage.vue`) ограничен высотой окна (`100vh` / `100dvh`) с `overflow: hidden`; после `boot-complete` у `body` нет вертикального скролла. Ширина: `.app-layout`, `<main class="ap-wrap|tp-wrap">` и блок `.ap` / `.tp` — на всю доступную ширину (`width: 100%`, у обёрток при необходимости `min-width: 0` для flex); контент по-прежнему ограничен `max-width: 1440px` у `.ap`/`.tp`. `<main>` — flex-колонка с `overflow: hidden` (сам не скроллится). Ниже — `.ap` / `.tp` (flex, `min-height: 0`), статус/тулбар `flex-shrink: 0`, сетка `.ap-grid` / `.tp-grid` с `grid-template-rows: minmax(0, 1fr)` и `flex: 1`; в двухколоночном режиме первая колонка — `minmax(240px, 1fr)` (не `minmax(0, 1fr)`), чтобы левая область не сжималась чрезмерно. Вертикальный скролл только у левой колонки `.ap-main` / `.tp-main` (`overflow-y: auto`, класс `content-wrapper` для стилей скроллбара). Правая колонка логов тянется по высоте ячейки сетки; список строк — `.ap-log-out` / `.tp-log-out` с внутренним `overflow-y`. На узкой вёрстке снова скроллится весь `<main>`.

## Разделение слоёв

Принцип разделения ответственности при работе с данными (см. [ADR-0002](ADR/0002-settings-heap-and-layered-api.md)):

| Слой              | Каталог   | Ответственность                                                                      |
| ----------------- | --------- | ------------------------------------------------------------------------------------ |
| **Таблицы**       | `tables/` | Схемы Heap (поля, типы). Только определение структуры данных.                        |
| **Репозитории**   | `repos/`  | Работа с БД: CRUD, запросы. Никакой бизнес‑логики, только вызовы Heap API.           |
| **Бизнес‑логика** | `lib/`    | Правила, дефолты, валидация значений, вычисления. Вызывает репозитории.              |
| **API**           | `api/`    | HTTP‑эндпоинты, парсинг и первичная валидация запросов, проверка прав. Вызывает lib. |

Поток данных: `HTTP → API → lib → repos → Heap`.

## Структура каталогов

- `config/` — маршруты и `PROJECT_ROOT`.
- `web/` — браузерные роуты модулей (admin, profile, tests, login).
- `pages/` — Vue‑страницы. `WheelPage.vue` — основная страница (колесо удачи, мок Math.random, конфетти, таймеры очищаются в `onBeforeUnmount`). `HomePage.vue` — прежняя заглушка, не используется в роутинге.
- `pagecss/` — CSS для страниц, хранимый как `// @shared` TypeScript-модули. `wheelPageCss1.ts` — стили колеса (conic-gradient, pointer, hub, кнопка). `wheelPageCss2.ts` — стили результата и @keyframes (spin-glow, hub-pulse, pointer-nudge, confetti-fall, rise-in, toast-in, sheen).
- `components/` — переиспользуемые Vue‑компоненты (Header, AppFooter, GlobalGlitch, LogoutModal).
- `api/` — API‑эндпоинты (получение и валидация входных данных). File-based: один файл — один эндпоинт с `/`. Пример: `api/settings/list.ts`, `api/logger/log.ts`, `api/admin/logs/recent.ts`, `api/tests/list.ts`, `api/tests/unit/index.ts`, `api/tests/integration/index.ts`.
- `tables/` — Heap‑таблицы (схемы: settings, logs).
- `repos/` — репозитории (работа с БД: settings, logs; logs.repo включает findBeforeTimestamp для пагинации).
- `lib/` — бизнес‑логика (settings.lib, logger.lib: проверка уровня, запись в ctx/Heap/WebSocket/вебхук).
- `shared/` — общий код (preloader, logLevel для передачи уровня логирования на клиент, logger — уровни syslog RFC 5424, createComponentLogger, setLogSink/LogEntry для дашборда, logEmergency…logDebug в браузере с проверкой порога, browserRemoteLogger — пакетная отправка браузерных логов на сервер через POST /api/logger/browser).
- `docs/` — документация проекта.

## Стратегия логирования

Логирование построено на стандарте syslog (RFC 5424), severity 0–7. Управление уровнем через настройку `log_level` (Debug/Info/Warn/Error/Disable).

| Severity | Уровень  | Что логируется                                                                           |
| -------- | -------- | ---------------------------------------------------------------------------------------- |
| 7        | Debug    | Сырые данные (параметры, возвраты, промежуточные значения) — появляются только при Debug |
| 6        | Info     | Карта вызовов: entry/exit функций, ветвления — без сырых данных при уровне Info          |
| 5        | Notice   | Пользовательские действия (клик, навигация, изменение настроек)                          |
| 4        | Warning  | Нештатные ситуации, не требующие немедленной реакции                                     |
| 3        | Error    | Ошибки, требующие внимания                                                               |
| 2        | Critical | Критические действия (выход из аккаунта)                                                 |
| -1       | Disable  | Логи выключены                                                                           |

**Ключевой принцип**: trace-логи (карта вызовов) имеют severity 6 (Info). Payload (сырые данные) автоматически отсекается при уровне != Debug:

- **Сервер** (`lib/logger.lib.ts`): функция `shouldIncludePayload` — payload в ctx.account.log, Heap, WebSocket и webhook только при Debug.
- **Браузер** (`shared/logger.ts`): `emitLog` фильтрует non-string args при уровне != Debug.

## Архитектура колеса (бэкенд реализован)

Источник истины — `docs/spec/spec.md`.

### Клиентская идентичность

Email сохраняется в `localStorage` под ключом `larina-wheel:auth`. Chatium-авторизация на главной странице не требуется.

### Серверная логика спина

1. `POST /api/wheel/authorize` — email-гейт + GetCourse gating (`passesGcUserCheck`, `passesGcGroupCheck` из `lib/getcourse.lib.ts`).
2. `POST /api/wheel/spin` — выполняется под `runWithExclusiveLock` (ключ `wheel:spin:email`):
   - Проверка лимита (`checkSpinLimit` в `lib/wheel.lib.ts`): `countByEmail` из `repos/spins.repo` + `sumByEmail` из `repos/spinGrants.repo` vs `wheel_max_spins`.
   - Загрузка сегментов (`loadEffectiveSegments`): правило чётности 2..8 — нечётные сегменты дополняются авто-retry-копиями до чётного числа.
   - Взвешенный выбор (`selectTarget`): по полю `weight` среди enabled-сегментов.
   - Запись победы в `repos/spins.repo`.
   - Выдача награды через `lib/getcourse.lib.ts` (createDeal), если `getcourse_issue_rewards = true`.
3. Ответ: `{ success, targetIdx, full, spinsRemaining, nEff }`. `targetIdx` — позиция в массиве `EffectiveSegment[]`, id и maxWins клиенту не передаются.

### Разделение типов сегментов

- `LoadedSegment` (серверный) — полная схема: id, maxWins, full, prizeOfferID, все поля.
- `EffectiveSegment` (публичный) — урезанный: order, label, weight, isAutoRetry?, redirectUrl?. id не утекает клиенту.

### Система тем

`config/themes.tsx` — 6 предустановленных тем (`var(--theme-*)`). Активная тема инжектируется в `:root` через SSR в `index.tsx`. Выбор темы — через настройку `theme` (AdminWheelSettings).

### Алгоритм вращения (клиент)

CSS: `conic-gradient(from -30deg, ...)`. Указатель фиксирован вверху в `0°`. `targetIdx` из ответа сервера определяет `desiredMod`, анимация вращается на `5×360° + delta + jitter (±19°)`, ease-out `1-(1-p)^3.6` за 5200 мс.

### Маскировка email (приватность)

Функция `maskEmail` в `lib/wheel.lib.ts` (§16.10 spec): email маскируется на сервере перед отдачей клиенту (`tester@khudoley.pro → te***@***ey.pro`). Полный email не покидает сервер — используется в `GET /api/wheel/winners` и `WinnersPage`.

### Компоненты adminки

- `AdminWheelSettings` — настройки wheel_enabled, wheel_max_spins, тема; кнопка «Сброс» (POST /api/admin/wheel/reset, удаляет все Spins и SpinGrants); ссылка «Список победителей» (`winnersUrl` проп от `AdminPage`).
- `AdminSegments` — CRUD сегментов (list/save/delete/reorder через `api/admin/segments/`). Удаление сегмента блокируется guard'ом если есть зависимые spins (RefLink).
- `AdminGetcourseSettings` — gateway_base_url, gc_school_host, gc_school_api_key (маскируется), гейтинг и флаг наград.

## Интеграции

- **GetCourse** — через внутренний gateway (`gateway_base_url`, envelope-транспорт `@app/request`). Операции: getGroups, userGetFields, userGetGroups, createDeal. Групповой gating зависит от gateway-операций getUserGroups/getAllGroups (сейчас disabled в `p/gateways/getcourse`).
- Внутренние SDK: стандартные модули Chatium.

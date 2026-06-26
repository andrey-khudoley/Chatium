# Архитектура: task2606

## Назначение

Диагностический сбор данных с внешних GetCourse-страниц. Встраиваемый JS-скрипт при загрузке внешней страницы собирает снимок (кто, откуда, что на экране) и отправляет его на публичный ingest-эндпоинт Chatium-проекта. Данные записываются в Heap-таблицу. Отдельная админка предоставляет просмотр, фильтрацию, разворачивание записей и тумблер включения/отключения приёма.

Корень проекта: `p/units/larina/task2606/`, константа `PROJECT_ROOT` — `'p/units/larina/task2606'`.

---

## Слои и каталоги

| Каталог / файл                            | Назначение                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `tables/diagnostics.table.ts`             | Heap-схема таблицы обращений (DiagnosticsTable)                                                                     |
| `tables/settings.table.ts`                | Heap-схема key/value настроек (SettingsTable)                                                                       |
| `repos/diagnostics.repo.ts`               | Доступ к DiagnosticsTable: create, findPage, countPage, findById; where-фильтры, order по `createdAt`, offset/limit |
| `repos/settings.repo.ts`                  | Доступ к SettingsTable: findByKey, findAll, upsert (через `runWithExclusiveLock`), deleteByKey                      |
| `lib/logger.lib.ts`                       | `writeServerLog` — обёртка над `ctx.account.log`; поддерживает severity 7/6/4/3                                     |
| `lib/settings.lib.ts`                     | `SETTING_KEYS.DIAGNOSTICS_ENABLED`, `getSetting`, `isDiagnosticsEnabled`, `setSetting`                              |
| `api/ingest/index.ts`                     | POST `/api/ingest` — публичный, без авторизации; гейт тумблером                                                     |
| `api/embed/script.ts`                     | GET `/api/embed/script` — отдаёт встраиваемый JS через `rawHttpBody`                                                |
| `api/admin/diagnostics/list.ts`           | GET `/api/admin/diagnostics/list` — список обращений (Auth: Admin)                                                  |
| `api/admin/diagnostics/get.ts`            | GET `/api/admin/diagnostics/get` — детальная запись (Auth: Admin)                                                   |
| `api/admin/settings/get.ts`               | GET `/api/admin/settings/get` — текущие настройки (Auth: Admin)                                                     |
| `api/admin/settings/save.ts`              | POST `/api/admin/settings/save` — сохранение настроек (Auth: Admin)                                                 |
| `web/admin/index.tsx`                     | SSR HTML-роут страницы админки (`app.html`), рендерит Vue-приложение                                                |
| `pages/AdminPage.vue`                     | Корневой Vue-компонент админки                                                                                      |
| `components/admin/DiagnosticsList.vue`    | Таблица/список обращений                                                                                            |
| `components/admin/DiagnosticsFilters.vue` | Фильтры (дата, ключевые параметры)                                                                                  |
| `components/admin/DiagnosticsDetail.vue`  | Разворачивание одной записи                                                                                         |
| `components/admin/DiagnosticsToggle.vue`  | Тумблер включения/отключения приёма                                                                                 |
| `shared/types.ts`                         | `DiagnosticsItem`, `DiagnosticsDetailItem` — общие типы для Vue (`// @shared`)                                      |
| `config/routes.tsx`                       | `PROJECT_ROOT`, `getFullUrl`, `withProjectRoot`                                                                     |
| `config/project.tsx`                      | Конфигурация проекта                                                                                                |
| `index.ts`                                | Корневой файл проекта                                                                                               |

---

## Поток данных

### Ingest (приём данных)

```
GetCourse-страница
  → embed-скрипт (GET /api/embed/script)
      собирает: visitorId, ip, url, params, dom, info
  → POST /api/ingest (без авторизации, Content-Type: text/plain)
      ↓ проверка тумблера isDiagnosticsEnabled
      ↓ JSON.parse тела
      ↓ diagnostics.repo.ts → create() → DiagnosticsTable (Heap)
      ↓ writeServerLog (entry/exit)
```

### Админ-чтение

```
Браузер (AdminPage.vue)
  → компоненты вызывают @shared-route роуты через .run(ctx)
  → api/admin/diagnostics/list.ts → diagnostics.repo.ts → findPage/countPage
  → api/admin/diagnostics/get.ts  → diagnostics.repo.ts → findById
  → api/admin/settings/get.ts     → settings.repo.ts → findByKey
  → api/admin/settings/save.ts    → settings.lib.ts → setSetting
```

Vue-компоненты импортируют только из `shared/types.ts` и роуты с `// @shared-route`. Таблицы, репозитории и lib-слой — исключительно на сервере.

---

## Ключевые архитектурные решения

### Публичный кросс-доменный ingest без preflight

Встраиваемый скрипт отправляет запрос с `Content-Type: text/plain`. Это «простой» CORS-запрос: браузер не шлёт предварительный OPTIONS, который платформа Chatium не регистрирует как отдельный роут. Сервер делает `JSON.parse` тела вручную. Платформа автоматически добавляет заголовок `Access-Control-Allow-Origin: *`, что подтверждено runtime-проверкой. Обрабатывается в `api/ingest/index.ts`.

### Абсолютный URL ingest-эндпоинта во встраиваемом скрипте

URL формируется через `ctx.account.url(getFullUrl('/api/ingest'))` в момент выдачи скрипта (`api/embed/script.ts`). Это даёт полный URL с доменом без доверия заголовку `Host` и без хардкода домена. `getFullUrl` определён в `config/routes.tsx`.

### Тумблер приёма (`diagnostics_enabled`)

Ключ `SETTING_KEYS.DIAGNOSTICS_ENABLED` хранится в `SettingsTable`. Дефолт — `true`. При выключенном тумблере `api/ingest/index.ts` не создаёт запись в Heap и возвращает `{ success: false }`. Управление тумблером — через `DiagnosticsToggle.vue` → `api/admin/settings/save.ts` → `settings.lib.ts → setSetting`. Upsert защищён `runWithExclusiveLock` в `repos/settings.repo.ts`.

### Граница Vue ↔ сервер

Клиентский Vue-код (`pages/`, `components/admin/`) не импортирует `tables/`, `repos/`, `lib/`. Данные поступают через SSR-пропсы (первичная загрузка) или через вызовы API-роутов с пометкой `// @shared-route`. Общие типы — только из `shared/types.ts` (`// @shared`).

### Логирование

Все серверные файлы логируют через `writeServerLog` из `lib/logger.lib.ts`, которая оборачивает `ctx.account.log`. Прямые вызовы `console.log` не используются.

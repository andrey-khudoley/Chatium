# Архитектура

## Назначение

Этот документ даёт «картину сверху»: как устроен проект, из чего состоит и как ходят ключевые потоки. Используйте его как замену HLD/C4 (Container/Component).

## Когда обновлять

- При добавлении/удалении ключевых компонентов (новые сервисы, очереди, интеграции).
- При изменении схемы данных или потоков запросов.
- При изменении интерфейсов внешних интеграций.

## Структура директорий проекта

Согласно документации 006-arch.md, проект организован следующим образом:

```
p/gc/partnership/
├── index.tsx              # Главная страница (/)
├── login.tsx              # Страница входа (/login)
├── profile.tsx            # Профиль пользователя (/profile)
├── admin.tsx              # Админ-панель (/admin)
│
├── pages/                 # Vue компоненты страниц
│   ├── HomePage.vue
│   ├── LoginPage.vue
│   ├── ProfilePage.vue
│   └── AdminPage.vue
│
├── api/                   # API endpoints
│   ├── auth-telegram.ts   # Telegram OAuth
│   ├── auth-password.ts   # Helper для пароля
│   ├── admin-settings.ts  # CRUD настроек
│   └── admin-logs.ts      # Работа с логами
│
├── config/                # ⚠️ ОБЯЗАТЕЛЬНАЯ конфигурация
│   └── routes.ts          # КРИТИЧЕСКИ ВАЖЕН! DOMAIN, PROJECT_ROOT, getFullUrl()
│
├── tables/                # Heap таблицы (файлы С .ts, импорт БЕЗ .ts)
│   ├── settings.table.ts     # ProjectSettings
│   └── projectLogs.table.ts  # ProjectLogs
│
├── lib/                   # Утилиты и бизнес-логика
│   ├── logging.ts         # Основная логика логирования
│   ├── logs-init.ts       # Инициализация логгера
│   ├── logs-operations.ts # Операции с логами
│   └── settings.ts        # Операции с настройками
│
├── sdk/                   # SDK для авторизации
│   └── auth.ts            # Вспомогательные функции auth
│
├── shared/                # Общий код (frontend + backend)
│   ├── debug.ts           # Централизованный логгер
│   ├── Header.vue         # Общий компонент Header
│   ├── GlobalGlitch.vue   # Компонент эффектов
│   ├── preloader.ts       # Прелоадер для USR
│   └── user-utils.ts      # Утилиты для работы с пользователями
│
├── tests/                 # ⚠️ ОБЯЗАТЕЛЬНАЯ папка (см. 020-testing.md)
│   ├── index.tsx          # Интерактивная страница /tests
│   ├── ai.tsx             # JSON API /tests/ai
│   ├── pages/
│   │   └── UnitTestsPage.vue
│   ├── api/
│   │   ├── run-tests.ts   # Универсальный API тестов
│   │   └── start-tests.ts # API запуска тестов
│   └── shared/
│       └── test-definitions.ts  # Единый источник истины
│
├── docs/                  # Документация проекта (этот файл)
│   ├── api.md
│   ├── architecture.md
│   ├── data.md
│   ├── imports.md
│   └── run.md
│
└── .CHATIUM-LLM.md        # Краткое описание проекта
```

**Ключевые правила организации** (из 006-arch.md):

- ✅ **Один файл = один основной роут** (исключение: API с общей логикой)
- ✅ **camelCase** для файлов роутов (.tsx)
- ✅ **PascalCase** для Vue компонентов (.vue)
- ✅ **Таблицы**: файлы С `.table.ts`, импорт БЕЗ `.ts`
- ✅ **Избегайте циклических импортов** — используйте `.url()` для роутов
- ✅ **Папка `/tests/` обязательна** для всех проектов

## High-level схема

```
[Браузер]
    |
    | HTTP (pages/api)
    v
[Chatium router (file-based)]
    |
    |-- HTML страницы (/ , /login, /profile, /admin, /tests)
    |       -> Vue pages в /pages
    |       -> ⚠️ НОВОЕ: на сервере используют относительные пути (./path, ../path)
    |       -> route.url() ТОЛЬКО для передачи на фронтенд (без циклов!)
    |
    |-- JSON API (/api/*, /tests/ai)
    |       -> handlers в /api и /tests/api
    |       -> lib/* (логирование/настройки)
    |       -> вызываются через route.run() из клиента (НЕ fetch!)
    |
    |-- WebSocket (live-логи)
            -> @app/socket (см. 014-socket.md)
            -> Debug.sendDataToSocket()

[Heap storage] (см. 008-heap.md)
    |-- ProjectSettings (настройки проекта)
    |       -> файл: tables/settings.table.ts (С .ts)
    |       -> импорт БЕЗ .ts: import { ProjectSettings } from './tables/settings.table'
    |
    |-- ProjectLogs (логи проекта)
            -> файл: tables/projectLogs.table.ts (С .ts)
            -> импорт БЕЗ .ts: import { ProjectLogs } from './tables/projectLogs.table'

[Тестирование] (ОБЯЗАТЕЛЬНО, см. 020-testing.md)
    |-- /tests — интерактивный UI для разработчиков
    |-- /tests/ai — JSON API для AI-агентов
    |-- tests/shared/test-definitions.ts — единый источник истины
```

## Ключевые компоненты и ответственность

- Роутинг и страницы: `./index.tsx`, `./login.tsx`, `./profile.tsx`, `./admin.tsx`, `./tests/index.tsx`.
- UI‑слой: Vue‑страницы в `./pages/*`.
- API‑слой: `./api/*` (админка, авторизация, логи).
- Логирование: `./shared/debug.ts`, `./lib/logs-init.ts`, `./lib/logs-operations.ts`.
- Настройки: `./lib/settings.ts` + `./tables/settings.table.ts`.
- Данные: Heap таблицы в `./tables/*.table.ts` (файлы С `.ts`, импорт БЕЗ `.ts`).
- **Тестирование**: `./tests/*` — обязательная папка с unit и интеграционными тестами (см. документацию 020-testing.md).

## Где хранятся данные

- Heap таблица `ProjectSettings` — ключ‑значение для настроек проекта.
- Heap таблица `ProjectLogs` — логи (уровень, сообщение, код).

**⚠️ ВАЖНО**: Таблицы определяются в файлах `./tables/*.table.ts` (С расширением `.ts`), но импортируются БЕЗ `.ts`:

- Файл: `./tables/settings.table.ts`
- Импорт: `import { ProjectSettings } from './tables/settings.table'`

## Основные потоки запросов

1. **Рендер главной страницы**: запрос `/` → `index.tsx` → `loadProjectSettings()` → HTML + Vue‑компонент.
2. **Админ‑настройки**: UI `/admin` → `api/admin-settings` (GET/POST) → `ProjectSettings`.
3. **Логирование**: `Debug.*` → `setPersistLogCallback()` → `persistLog()` → `ProjectLogs` + счётчики ошибок/предупреждений.
4. **Live‑логи**: `/admin` → запрос `socket-id` → WebSocket подписка → `sendDataToSocket()` при новых логах (см. документацию 014-socket.md).
5. **Авторизация**: UI `/login` → `api/auth-telegram` или `api/auth-password` → возвращаются URL/хеш для входа (см. документацию 003-auth.md).
6. **Тестирование**:
   - UI `/tests` → интерактивный интерфейс для разработчиков
   - JSON `/tests/ai` → автоматические проверки для AI-агентов и мониторинга

---

## Связанные документы платформы

- **001-standards.md** — Стандарты кода (TailwindCSS, FontAwesome, best practices)
- **002-routing.md** — **ОБНОВЛЕНО**: File-based роутинг, относительные пути на сервере, `.url()` только для фронтенда
- **003-auth.md** — Авторизация и роли (`requireAccountRole`, `requireRealUser`)
- **006-arch.md** — Структура проекта и правила организации файлов
- **007-vue.md** — Vue компоненты и SSR
- **008-heap.md** — Работа с Heap таблицами (КРИТИЧЕСКИ ВАЖНО!)
- **014-socket.md** — WebSocket для real-time обновлений
- **020-testing.md** — ОБЯЗАТЕЛЬНАЯ структура тестирования

---

**Версия документа**: 1.2  
**Последнее обновление**: 2026-01-30  
**Статус**: Актуален  
**Критические изменения**:

1. Использование относительных путей на сервере вместо `.url()`
2. **ОБЯЗАТЕЛЬНЫЙ** файл `/config/routes.ts` для избежания хардкода URL

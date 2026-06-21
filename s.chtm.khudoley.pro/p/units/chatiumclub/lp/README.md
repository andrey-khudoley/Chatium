# Chatium Club · LP (одноэкранный лендинг)

## Назначение

Дочерний проект **`p/units/chatiumclub/lp`** — одноэкранный лендинг с формой
«Получить доступ к SDK». Слева — описание тонкого клиента Chatium+GetCourse,
справа — форма с полями: телефон, Telegram username, многострочное «Что хотите
интегрировать?».

## Что внутри

- **Главная страница (`/`)** — серверный рендер `index.tsx`, монтирует Vue-страницу `pages/LandingPage.vue`.
- **API `/api/submit` (POST)** — приём формы (`api/submit.ts`), базовая валидация,
  сохранение в Heap-таблицу `Leads`, JSON-ответ.
- **Heap-таблица `Leads`** (`tables/leads.table.ts`) — поля
  `phone`, `telegramUsername`, `integrationNotes`, `submittedAt` (имя
  `createdAt` зарезервировано Heap для top-level полей).
- **Конфиг роутов** (`config/routes.tsx`) — `PROJECT_ROOT`, `ROUTES`, `getFullUrl()`,
  `withProjectRoot()`. Используется в `index.tsx` и (при необходимости) в родительском
  проекте для построения ссылок.

## Платформенные ограничения Chatium

- `ctx`, `app` — глобальные, не импортируем.
- Логирование — через `ctx.account.log()`, не `console.log`.
- File-based роутинг: один файл = один роут.
- Vue не импортирует `lib/`, `repos/`, `tables/` — вызов API из формы идёт через
  `submitLeadRoute.run(ctx, …)` (роут помечен `// @shared-route`).
- Внешние ссылки на главный роут — через `withProjectRoot(route.url())` в
  родительском `chatiumclub`-приложении (если потребуется встраивать ссылки).

## URL

- Главная страница: `/p/units/chatiumclub/lp/` (через `getFullUrl(ROUTES.index)`).
- API заявок: `POST /p/units/chatiumclub/lp/api/submit`.

## Документация

Подробности — в каталоге `docs/`:

- `docs/architecture.md` — карта файлов и поток данных.
- `docs/api.md` — контракт `POST /api/submit`.
- `docs/data.md` — схема Heap-таблицы `Leads`.
- `docs/LLM/` — журнал диалогов с LLM.

## Changelog

- 2026-05-06: создан проект `lp` (одноэкранный лендинг + Heap-таблица `Leads` + API `POST /api/submit`).
- 2026-05-06: переименовано поле `createdAt` → `submittedAt` (имя `createdAt` зарезервировано Heap).

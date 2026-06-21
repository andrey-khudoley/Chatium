# Архитектура lp

## Назначение

Дочерний проект `p/units/chatiumclub/lp` — одноэкранный лендинг с формой
«Получить доступ к SDK». Принимает заявки и пишет их в Heap.

## Карта файлов

```
p/units/chatiumclub/lp/
├── index.tsx                  // SSR главной (app.html('/'))
├── pages/
│   └── LandingPage.vue        // Composition API, форма + стили
├── api/
│   └── submit.ts              // POST /api/submit, валидация, запись в Heap
├── tables/
│   └── leads.table.ts         // Heap-таблица Leads
├── config/
│   └── routes.tsx             // PROJECT_ROOT, ROUTES, getFullUrl, withProjectRoot
├── tsconfig.json
├── jsx.d.ts                   // типы JSX для @app/html-jsx
├── vue-shim.d.ts              // shim для Vue Composition API
├── .dir.json                  // метаданные проекта Chatium
├── README.md
├── .CHATIUM-LLM.md
└── docs/
    ├── architecture.md        // этот файл
    ├── api.md
    ├── data.md
    └── LLM/                   // журнал переписок с LLM
```

## Поток данных

1. Браузер открывает `/p/units/chatiumclub/lp/`.
2. `index.tsx` (`app.html('/')`) рендерит HTML-шапку и монтирует
   `<LandingPage pageTitle="..." apiSubmitUrl="..." />`.
3. Пользователь заполняет форму. На submit `LandingPage.vue` вызывает
   `submitLeadRoute.run(ctx, { phone, telegramUsername, integrationNotes })`.
4. `api/submit.ts` валидирует поля, создаёт запись в Heap-таблице `Leads`
   через `Leads.create(ctx, { phone, telegramUsername, integrationNotes, submittedAt })`.
5. В ответ возвращается JSON `{ success, id?, error?, fieldErrors? }`.
6. На клиенте показывается экран «Заявка отправлена» либо тексты ошибок у полей.

## Принципы Chatium, применённые в проекте

- **Глобальные `ctx` / `app`** — не импортируются.
- **Логирование** — через `ctx.account.log()` в `index.tsx` и `api/submit.ts`.
- **File-based роутинг** — один файл = один роут (`index.tsx` → `/`,
  `api/submit.ts` → `/api/submit`).
- **Метка `// @shared-route`** на API-роуте позволяет вызывать его из Vue через
  `.run(ctx, …)` без `fetch`.
- **Vue не тянет серверные модули** — `LandingPage.vue` импортирует только
  объект маршрута `submitLeadRoute` (контракт), а не сами `tables/` или `lib/`.
- **Heap** — создание записей только на сервере; на клиенте Heap не используется.

## Внешние зависимости

- `@app/html-jsx` — JSX-рендер серверной разметки.
- `@app/heap` — Heap-таблица `Leads`.
- Vue Composition API — типы через `vue-shim.d.ts`.

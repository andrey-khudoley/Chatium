# p/units/ipsen/kp — сайт КП «Ипсен · ИИ-агенты»

Одностраничный Chatium-сайт (SSR Vue) для клиента Ипсен: показывает архитектурную
концепцию, черновик коммерческого предложения и блок открытых вопросов. Любой
посетитель (в т.ч. анонимный) может оставить ответ на вопрос — ответ сохраняется
как «комментарий» и появляется под вопросом.

Источник контента — проект second_brain `ipsen-ai-agents-discovery-e874ba`
(бриф, `architecture-ideas.md`, `kp-outline.md`).

## URL

`https://s.chtm.khudoley.pro/p/units/ipsen/kp/` (dev/stage workspace).

## Структура

```
ipsen/kp/
├─ index.tsx               # app.html('/') — SSR: читает ответы из Heap, рендерит SitePage
├─ pages/SitePage.vue      # весь сайт: вкладки Архитектура / КП / Вопросы + формы ответов
├─ api/answers/create.ts   # POST // @shared-route: приём ответа (requireAnyUser — аноним ок)
├─ tables/answers.table.ts # Heap-таблица ответов (комментарии), привязка по questionId
├─ shared/content.ts       # весь статический контент (архитектура, КП, 18 вопросов)  // @shared
├─ shared/styles.ts        # дизайн-CSS (светлая тема, красный акцент как в КП)
├─ config/routes.tsx       # PROJECT_ROOT + реестр путей (ссылок по URL в проекте нет)  // @shared
└─ манифесты: .dir.json .workspace.json package.json tsconfig.json jsx.d.ts vue-shim.d.ts
```

## Как это работает

1. `index.tsx` на сервере читает `Answers.findAll` (Heap доступен только на сервере),
   группирует ответы по `questionId` и передаёт SSR-пропсом в `SitePage.vue`.
2. Статический контент компонент импортирует напрямую из `shared/content.ts`.
3. Форма ответа отправляет данные не через `fetch`, а через
   `apiCreateAnswerRoute.run(ctx, { questionId, text, authorName })`
   (роут помечен `// @shared-route`).
4. `api/answers/create.ts` вызывает `requireAnyUser(ctx)` (анонимная запись разрешена),
   валидирует текст/вопрос и пишет запись в `Answers`. Возвращает созданный ответ,
   который клиент добавляет в список без перезагрузки.

## Данные

Таблица `Answers` (`t__ipsen-kp__answers__q7Kp2Za`): `questionId`, `text`,
`authorName`, `authorUserId`, `authorType`, `createdAtMs`. Системные `id/createdAt/updatedAt`
добавляются Heap автоматически. Стабильные id вопросов (`q1`…`q18`) — в `shared/content.ts`.

## Проверки

```bash
cd s.chtm.khudoley.pro
node scripts/check-types.mjs p/units/ipsen/kp   # строгий vue-tsc
node scripts/check-style.mjs p/units/ipsen/kp   # prettier
```

Оба проходят. Прод не трогается — перенос в `p.chtm.khudoley.pro` только по явной
команде `/to-prod` / `/to-sync`.

## Changelog

- **2026-07-14** — ревью на соответствие документации Chatium и референсу
  `inner/samples/new_project`. Критичных нарушений не найдено. Правки:
  - `config/routes.tsx` — убраны неиспользуемые хелперы ссылок
    (`getFullUrl`/`withProjectRoot`/`withProjectRootAndSubroute`/`ROUTE_PATHS`):
    локальный `getFullUrl` возвращал root-relative путь при совпадении имени с
    каноническим (полный URL), а в одностраничном сайте ссылок по URL нет.
    Оставлены `PROJECT_ROOT` + справочный реестр `ROUTES`.
  - `api/answers/create.ts` — добавлено логирование веток валидации (warn) и
    успешного сохранения (info) в дополнение к `catch`, по образцу референса.

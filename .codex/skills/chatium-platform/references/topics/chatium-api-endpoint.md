# chatium-api-endpoint

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-api-endpoint/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/002-routing.md; inner/docs/041-schema.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

# chatium-api-endpoint

## Description

Создаёт API-эндпоинт в Chatium: файл в api/, валидация body/query через `.body(s => ...)` / `.query(s => ...)`, авторизация, обработка ошибок. Использовать при добавлении новых API-роутов.

## Шаги

1. Создать файл в `api/<name>.ts` (один роут на файл, путь `'/'` у файла индекса маршрута)
2. Определить метод первым звеном: **`app.post('/')`** или **`app.get('/')`**
3. При необходимости добавить **`.body(s => …)`** (POST/PUT) или **`.query(s => …)`** (GET)
4. Завершить цепочку **`.handle(async (ctx, req) => { … })`** — обработчик **только** здесь, не вторым аргументом `post`/`get`
5. Добавить авторизацию: `requireRealUser(ctx)` или `requireAccountRole(ctx, 'admin')`
6. Обработка ошибок: try/catch, проверка null
7. Логирование: `ctx.account.log()`, не console.log
8. Ссылки на другие роуты: `withProjectRoot(route.url())`, не хардкод путей (002-routing, chatium-constraints)

## Шаблон

```ts
export const myRoute = app
  .post('/')
  .body((s) => ({
    field: s.string(),
  }))
  .handle(async (ctx, req) => {
    const user = await requireRealUser(ctx)
    const { field } = req.body
    // ...
    return { success: true }
  })
```

GET с query:

```ts
export const myGetRoute = app
  .get('/')
  .query((s) => ({ id: s.string() }))
  .handle(async (ctx, req) => {
    const row = await Items.findById(ctx, req.query.id)
    return row ?? null
  })
```

Данные входа — **`req.body`** / **`req.query`** после схемы; не использовать **`ctx.req.json()`**, **`ctx.res.json()`**. Подробности цепочки — **`002-routing.md`**, UTF-8 Base64 без глобалов — **`047-base64.md`**, пример настроек — **`zoom-agent-tool/api/settings/save.ts`**.

## Чеклист

- [ ] Файл в api/, путь `'/'` у роут-файла
- [ ] Цепочка: **`app.post('/')`** или **`app.get('/')`** → опционально **`.body()`** / **`.query()`** → **`.handle(...)`**
- [ ] Нет **`.result()`** и нет обработчика вторым аргументом у **`post`**/**`get`**
- [ ] Авторизация (requireRealUser / requireAccountRole)
- [ ] Обработка ошибок
- [ ] Логирование ctx.account.log()
- [ ] Экспорт роут-объекта (для route.url())
- [ ] Ссылки на роуты через withProjectRoot(route.url())

## Ссылки на документацию

- **002-routing.md** — file-based роутинг, § валидация через `.body()` / `.query()`
- **003-auth.md** — авторизация
- **006-arch.md** — архитектура
- **041-schema.md** — схемы валидации, билдер `s`

## Примеры

- `inner/samples/new_project/api/`
- `inner/samples/imported/ai-agent-kak-chatgpt/api/`

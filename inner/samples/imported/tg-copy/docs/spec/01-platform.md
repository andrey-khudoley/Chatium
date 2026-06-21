# 01. Платформенные инварианты Chatium (обязательны)

Нормативные правила платформы и workspace. Спецификация предписывает **этот** способ, а не поведение исходного sample. Все расхождения sample с этими правилами перечислены в [../diff.md](../diff.md) и подлежат устранению. Источники — `inner/docs/` (указаны в скобках).

## Глобальные объекты

- `ctx` и `app` — **глобальные**, не импортировать. В Vue `ctx` тоже глобален (не прокидывать через props; для TS добавить `declare const ctx: any` в начало `<script setup>`).
- **Логирование — только `ctx.account.log('Сообщение', { level: 'info' | 'error', json: { ... } })`. `console.log` ЗАПРЕЩЁН** (001-standards). Каждая ветка управляющего потока с бизнес-смыслом (if/else/catch/switch) должна логироваться (workspace logging-coverage).

## File-based роутинг (002-routing, 006-arch)

- **MUST: один файл = один роут.** Несколько `app.get`/`app.post` в одном файле — запрещено. Каждый дополнительный путь — отдельный файл.
- Экспорт — один `const` с суффиксом `Route` (camelCase): `export const apiChatsListRoute = app.get('/', ...)`.
- **MUST: путь внутри файла — `'/'`.** URL строится от структуры каталогов; `~` (тильда) появляется только если путь в `app.*` ≠ `'/'` — этого избегать. Path-параметры `/:id` не использовать — для GET брать `?id=`, для POST — `body`.
- Браузерные роуты — в `/web/<module>/...`; API — в `/api/<module>/...`; корневой роут проекта — единственный `index.tsx` (`'/'`).
- Современная форма с валидацией входа:
  ```ts
  export const apiSendRoute = app
    .post('/')
    .body((s) => ({ text: s.string(), replyTo: s.string().optional() }))
    .handle(async (ctx, req) => { const { text } = req.body; return { success: true } })
  ```
  `.body()`/`.query()` — **до** `.handle()`. Обработчик — только в `.handle()`, не вторым аргументом. `.result()` нет. `ctx.req.json`, `ctx.res`, `ctx.header()`, `ctx.set()` — не существуют.
- Ответы: `return obj` → JSON; JSX → HTML; явный статус — `ctx.resp.status(code).json(body)`; файлы — `{ statusCode, rawHttpBody, headers }`.

### config/routes.tsx (обязателен в проекте)

```ts
// config/routes.tsx
export const PROJECT_ROOT = 'inner/samples/imported/tg-copy' // путь от корня workspace, без домена
export const ROUTES = { index: './' } as const

export function withProjectRoot(route: string): string {
  const clean = route.replace(/^\.\//, '').replace(/^\/+/, '')
  return `./${PROJECT_ROOT}/${clean}`
}
export function withProjectRootAndSubroute(route: string, subroute?: string): string {
  if (!subroute || subroute === '/') return withProjectRoot(route)
  return `${withProjectRoot(route)}~${subroute.replace(/^\//, '')}`
}
```

### Ссылки на роуты — без хардкода URL (002)

- **NEVER** хардкодить домены/пути (`'/tg/...'`, `'https://...'`, конкатенацию `'/x/'+id`). Исключения-строки: внешние ссылки, `#`-якоря, `mailto:`/`tel:`.
- Для клиента (Vue/JSON): `withProjectRoot(route.url())`, с параметрами `withProjectRoot(route.url({ id }))`, с query `withProjectRoot(route.query({ q }).url())`. При циклической зависимости — `withProjectRoot(ROUTES.x)`.
- На сервере (редиректы/внутренние ссылки): **только относительные** `./path`, `../path` через `ctx.resp.redirect('./...')`. `'/path'` уйдёт в корень домена — критическая ошибка. `ctx.redirect()` не существует.
- `inboxUrl` фида, `manifest` `start_url/scope`, путь к SW, `back=` у `/s/auth/signin` — строить через `withProjectRoot`/`withProjectRootAndSubroute`, не хардкодить `/tg/...`.

### Вызов роута с клиента/сервера

```ts
apiChatsListRoute.run(ctx)                        // GET без параметров
apiChatGetRoute({ feedId }).run(ctx)              // path-параметр
apiSendRoute({ feedId }).run(ctx, { text })       // path + body
apiMessagesListRoute({ feedId }).query({ limit }).run(ctx)
```
**MUST: роут, вызываемый с клиента через `.run(ctx)`, помечается `// @shared-route`** (первая строка файла). Иначе на клиенте он не работает.

## Авторизация (003-auth)

- Роли аккаунта — **с заглавной**: `'Admin' | 'Staff' | 'User'` (иерархия Admin ⊃ Staff ⊃ User). Типы: `'Real' | 'Bot' | 'Anonymous'`.
- `requireAccountRole(ctx, 'Admin')` — **именно `'Admin'`**, не `'admin'`. `requireRealUser(ctx)` — реальный пользователь. `requireAnyUser(ctx)` — гарантирует `ctx.user` (создаёт анонимного, `await` обязателен).
- **MUST: проверка — первой строкой обработчика.** Комбинирование: `requireRealUser(ctx)`, затем `requireAccountRole(ctx, 'Staff')`.
- **NEVER**: ручная `if (!ctx.user.is('Admin')) throw ...` вместо `requireAccountRole`. Мягкая логика — `ctx.user?.is('Admin')` допустима.
- Вход: `/s/auth/signin?back={относительный путь}`; выход: POST `/s/auth/sign-out`. Не придумывать `/login`.
- Никогда не отдавать данные другого `accountId`/пользователя без явной проверки прав.

## Ошибки (030-errors)

Использовать типизированные классы вместо `throw new Error(...)` — они несут HTTP-статус для единого обработчика:
```ts
new NotFoundError(msg) | new NotFoundError(type, id)        // 404
new AccessDeniedError(message?)                              // 403 (есть и в @app/auth)
new ValidationError(issues) | new ValidationError(reason, issues)  // 422; issue = { fullPath?, message }
new CustomError(reason, code, data?)                         // не ChatiumError; .code, .data
```

## Heap (008-heap, 022-getcourse-heap, 028-sync)

- Объявление: `Heap.Table('<phys_id>', { field: Heap.Optional(Heap.String({ customMeta: { title } })) }, { customMeta: { title, description } })`. Файл `*.table.ts`, **только backend**, импорт без `.ts` именованным/`default` импортом.
- **Зарезервированные поля `id`, `createdAt`, `updatedAt` — NEVER объявлять в таблице и NEVER передавать в `create()`/`update()`** (добавляются автоматически).
- `update` — **2 аргумента**: `Table.update(ctx, { id, ...поля })`.
- Подсчёт — `Table.countBy(ctx, where?)`, **NEVER** `(await findAll()).length` (findAll лимит 1000).
- Фильтры — только `where` (операторы `$lt/$lte/$gt/$gte/$and/$or/$not`, массив = IN), **NEVER** `filter`/JS-фильтрация по большим выборкам. Полнотекст — `searchBy`/`searchable`.
- Order — `[{ field: 'asc' | 'desc' }]`, **NEVER** `[{ field, direction }]`.
- Money — `new Money(amount, 'RUB')`, только методы `.add()/.subtract()/.multiply()/.divide()/.format(ctx)`, **NEVER** арифметика.
- `RefLink`/`UserRefLink` — **обязателен `onDelete`**: `Heap.RefLink('<target_phys_id>', { customMeta, onDelete: 'none' })`, `Heap.UserRefLink({ customMeta, onDelete: 'none' })`. В RefLink — строковый id целевой таблицы (не импорт). Чтение — `record.ref.id` / `.get(ctx)` (batch, не N+1). Создание/фильтр — строковый id.
- `searchable: { langs: ['ru','en'], embeddings: false }` — embeddings по умолчанию выключены, включать только для семантического поиска.
- Зависимые RefLink-записи удалять **ДО** родителя. `deleteAll` по умолчанию `limit: 1`; для массового — `limit: null`.

### Race conditions — runWithExclusiveLock (028-sync)

**MUST**: если между `findOneBy` и `create`/`createOrUpdateBy` (или read-modify-write) возможен параллельный запрос — оборачивать в блокировку. **Все** операции с БД — внутри колбэка. Ключ блокировки **одинаков** для одних данных (без `Date.now()`).
```ts
import { runWithExclusiveLock } from '@app/sync'
await runWithExclusiveLock(ctx, `subscription-${userId}-${planId}`, async (ctx) => {
  const existing = await Subscriptions.findOneBy(ctx, { userId, planId, status: ['active', 'pending'] })
  if (existing) return existing
  return Subscriptions.create(ctx, { userId, planId, status: 'active', ... })
})
// сигнатуры: runWithExclusiveLock(ctx, lockId, fn) | (ctx, lockId, timeoutMs, fn) | (ctx, lockId, { timeoutMs, maxDurationMs }, fn)
// tryRunWithExclusiveLock(ctx, lockId, fn) → { success, result } | { success:false, timeoutMs }
```
Применять в: subscribe/extend/grant подписки, join/accept (участник), participants/add, pinned/set, folders/pins дедуп, invites/create, blocked-users/block, privacy upsert, agents/add, app-settings upsert, voice-transcriptions upsert, reactions/toggle (read-modify-write сообщения).

## Vue / клиент (007-vue, 001-standards)

- Vue 3.5.13, Composition API, только `<script setup>`. Heap и таблицы — **только на сервере**.
- **NEVER импортировать в `.vue`**: `tables/`, `repos/`, `lib/`, серверные модули, хардкод URL (даже в `fetch`).
- Импорт в Vue — только из `shared/*` (с `// @shared`) и роут-объектов.
- Данные: (1) SSR-пропсы (грузятся на сервере, передаются в `defineProps`) либо (2) `route.run(ctx)` для `// @shared-route`. Top-level `await` в `<script setup>` запрещён — только в `onMounted`/async-функциях.
- Каждый Vue-модуль — локальный `tsconfig.json` с `"extends": "<относит. путь>/tsconfig.json"`, `jsx: "preserve"`.
- В шаблоне: событие — только `$event` (не `e`); без TS-синтаксиса (`as`/`satisfies`) в `@`/`:`/`{{ }}`; HTML-комментарии запрещены — `{/* */}`.

## Стандарты (001-standards)

- Отступы 2 пробела (не табы), одинарные кавычки, интерполяция — backticks; `;` не обязательны.
- TailwindCSS **3.4.16** (`/s/static/lib/tailwind.3.4.16.min.js`), FontAwesome **6.7.2** (`/s/static/lib/fontawesome/6.7.2/css/all.min.css`).
- Файлы **≤300–400 строк**. Только `.ts/.tsx/.vue`, не `.js`.
- **NEVER**: `process.env` (нет `process`); `alert()` для результатов операций (делать UI-уведомления); `console.log`; импорт таблиц с `.ts`.
- `confirm()` допустим для простых подтверждений (удаление/сброс).

## Прочие модули (для справки)

`@app/feed`, `@app/socket`, `@app/storage`, `@app/inbox`, `@pay/sdk` (017), `@ai-agents/sdk` (010), `@user-notifier/sdk` (015), `@crm/sdk`, `@start/sdk`, `@app/request` (004), `@app/html-jsx` (035). Сигнатуры Feed/Heap/Socket — см. соответствующие файлы spec и `inner/docs/019,008,014`.

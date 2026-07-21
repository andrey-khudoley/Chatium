@chatium

# Авторизация и пользователи в Chatium

Исчерпывающее руководство по работе с авторизацией, проверкой прав и управлению пользователями в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Методы авторизации](#методы-авторизации)
  - [requireAccountRole - проверка роли](#requireaccountrole---проверка-роли)
  - [requireRealUser - только реальные пользователи](#requirerealuser---только-реальные-пользователи)
  - [requireAnyUser - гарантия наличия пользователя](#requireanyuser---гарантия-наличия-пользователя)
- [Объект ctx.user](#объект-ctxuser)
  - [Основные свойства](#основные-свойства)
  - [Методы](#методы)
- [Роли пользователей](#роли-пользователей)
- [Использование в роутах](#использование-в-роутах)
  - [Защита страниц](#защита-страниц)
  - [Защита API endpoints](#защита-api-endpoints)
  - [Комбинирование проверок](#комбинирование-проверок)
- [Middleware для авторизации](#middleware-для-авторизации)
- [Работа с пользователями](#работа-с-пользователями)
  - [Поиск пользователей](#поиск-пользователей)
  - [Создание пользователей](#создание-пользователей)
  - [Обновление пользователей](#обновление-пользователей)
- [Дополнительные поля пользователя](#дополнительные-поля-пользователя)
- [Ссылки на авторизацию](#ссылки-на-авторизацию)
- [Лучшие практики](#лучшие-практики)
- [Кастомная страница входа](#кастомная-страница-входа)
  - [Платформенная страница входа](#платформенная-страница-входа)
  - [Провайдеры авторизации](#провайдеры-авторизации)
  - [Как понять, что вход состоялся](#как-понять-что-вход-состоялся)
  - [Разметка страницы входа](#разметка-страницы-входа)
  - [Аутентификация по паролю](#аутентификация-по-паролю)
  - [Вход по коду из SMS](#вход-по-коду-из-sms)
  - [Вход по коду на email](#вход-по-коду-на-email)
  - [Вход через Telegram](#вход-через-telegram)
  - [Выход](#выход)
  - [Редиректы на сервере](#редиректы-на-сервере)
  - [Типовые ошибки](#типовые-ошибки)
  - [Справочник платформенных эндпоинтов](#справочник-платформенных-эндпоинтов)

---

## Основные концепции

**Авторизация в Chatium** — система проверки прав доступа пользователей к роутам и ресурсам.

### Ключевые понятия

- **ctx.user** — объект текущего пользователя, доступен глобально
- **Роли аккаунта** — None, Staff, Admin, Developer, Owner (иерархические, по возрастанию)
- **Типы пользователей** — Real (реальный), Bot (бот), Anonymous (анонимный)
- **Методы require\* ** — функции проверки авторизации. `requireAccountRole` и `requireRealUser` выбрасывают ошибку при неудаче; `requireAnyUser` вместо этого создаёт анонимного пользователя

### Импорт методов

```typescript
import { requireAccountRole, requireRealUser, requireAnyUser } from '@app/auth'
```

---

## Методы авторизации

### requireAccountRole - проверка роли

Требует определённую роль аккаунта. Выбрасывает ошибку если роль не соответствует.

**Сигнатура** (сверено с `@app/auth/index.d.ts`, 2026-07-20):

```typescript
requireAccountRole(ctx: RichUgcCtx, atLeastAccountRole: Exclude<AccountRole, 'None'>): void

type AccountRole = 'None' | 'Staff' | 'Admin' | 'Developer' | 'Owner'
```

**⚠️ Роли `'User'` не существует.** Допустимые значения параметра — `'Staff' | 'Admin' | 'Developer' | 'Owner'` (`'None'` исключена типом). Ролей пять, а не три; `'Developer'` и `'Owner'` выше `'Admin'`.

Параметр — union строковых литералов, поэтому опечатка в регистре (`'admin'`) **ловится типчеком** (TS2345) и до рантайма не доходит. Если протащить её через `as any`, доступ будет закрыт: функция сначала валидирует само значение и на незнакомом бросает `AccessDeniedError` с сообщением `Invalid account role admin requirement!`. Ошибка в значении роли безопасна — она закрывает функционал, а не открывает его (проверено рантаймом на пользователе с ролью `Staff`).

Три различимых исхода — по сообщению видно, какой именно:

| Ситуация | Ошибка | Код | Сообщение |
| --- | --- | --- | --- |
| Пользователя нет | `AuthRequiredError` | 401 | `... but current user is anonymous!` |
| Роль недостаточна | `AccessDeniedError` | 403 | `Admin user role is required, but user role is Staff!` |
| Значение роли невалидно | `AccessDeniedError` | 403 | `Invalid account role admin requirement!` |

**Использование**:

```typescript
import { requireAccountRole } from '@app/auth'

export const adminPageRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')
  // Выбросит ошибку если у пользователя нет роли Admin

  return <html>...</html>
})
```

**Примеры для разных ролей**:

```typescript
// Только администраторы
export const adminOnlyRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')
  return { message: 'Admin area' }
})

// Сотрудники и администраторы
export const staffAreaRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Staff') // Admin тоже пройдёт
  return { message: 'Staff area' }
})

// ❌ НЕПРАВИЛЬНО - роли 'User' не существует, это ошибка типизации
export const userAreaRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'User')
  return { message: 'User area' }
})
// Для «любого авторизованного» используйте requireRealUser(ctx), а не роль
```

### requireRealUser - только реальные пользователи

Требует реального (не анонимного) пользователя. Выбрасывает ошибку если пользователь анонимный или не авторизован.

**Сигнатура**:

```typescript
requireRealUser(ctx: app.Ctx, requirements?: AuthRequirements): UgcSmartUser
```

> ⚠️ **Используйте возвращаемое значение, а не `ctx.user`.** `requireRealUser` — обычная функция, а не assertion-функция (`asserts ctx is ...` в сигнатуре нет). Она не сужает тип `ctx.user`, который объявлен как `readonly user?: UgcSmartUser`. В проекте включён `strict`, поэтому обращение `ctx.user.displayName` после вызова даёт `TS2532: Object is possibly 'undefined'`. Забирайте пользователя из результата.

**Использование**:

```typescript
import { requireRealUser } from '@app/auth'

export const profilePageRoute = app.get('/', async (ctx) => {
  // Выбросит ошибку, если пользователь анонимный или не авторизован
  const user = requireRealUser(ctx)

  return (
    <html>
      <head>
        <title>Профиль - {user.displayName}</title>
      </head>
      <body>
        <ProfilePage />
      </body>
    </html>
  )
})
```

```typescript
❌ requireRealUser(ctx)
   const name = ctx.user.displayName // TS2532 — ctx.user опционален

✅ const user = requireRealUser(ctx)
   const name = user.displayName
```

**Когда использовать**:

- Страницы профиля пользователя
- Личный кабинет
- Действия от имени пользователя (создание контента, заказы)

### requireAnyUser - гарантия наличия пользователя

Требует пользователя любого типа. Если пользователя нет — создаёт анонимного. Возвращает Promise.

**Сигнатура**:

```typescript
requireAnyUser(ctx: app.Ctx): Promise<UgcSmartUser>
```

**Использование**:

```typescript
import { requireAnyUser } from '@app/auth'

export const publicPageRoute = app.get('/', async (ctx) => {
  await requireAnyUser(ctx)
  // Гарантирует наличие ctx.user (создаст анонимного если нужно)

  return <html>...</html>
})
```

**Когда использовать**:

- Публичные страницы где нужна сессия
- Отслеживание действий анонимных пользователей
- Сохранение временных данных

---

## Объект ctx.user

### Основные свойства

```typescript
ctx.user.id // ID пользователя
ctx.user.displayName // Отображаемое имя (auto-generated)
ctx.user.fullName // firstName + middleName + lastName
ctx.user.username // Username
ctx.user.firstName // Имя
ctx.user.lastName // Фамилия
ctx.user.middleName // Отчество
ctx.user.gender // 'male' | 'female' | 'other'
ctx.user.birthday // Строка дата
ctx.user.birthdayDate // Date объект
ctx.user.confirmedPhone // Подтвержденный телефон
ctx.user.confirmedEmail // Подтвержденный email
ctx.user.hasPassword // Есть ли пароль
ctx.user.imageUrl // URL аватара
ctx.user.hasImage // Есть ли аватар
// thumbnail — это метод, а не свойство: ctx.user.getImageThumbnailUrl(200)
ctx.user.accountRole // 'None' | 'Staff' | 'Admin' | 'Developer' | 'Owner'
ctx.user.type // 'Real' | 'Bot' | 'Anonymous'
ctx.user.lang // Язык пользователя ('ru', 'en', etc.)
```

### Методы

```typescript
// Проверка роли
ctx.user.is('Admin') // true если админ
ctx.user.is('Staff') // true если Staff или Admin
// ctx.user.is('User') — ❌ не скомпилируется: is(role: Exclude<AccountRole, 'None'>)

// Получение thumbnail с кастомным размером
ctx.user.getImageThumbnailUrl(200) // 200x200

// JSON представление
ctx.user.toJSON()
```

**Пример использования**:

```typescript
export const dashboardRoute = app.get('/', async (ctx) => {
  const user = requireRealUser(ctx)

  const isAdmin = user.is('Admin')
  const userName = user.displayName
  const userEmail = user.confirmedEmail

  return (
    <html>
      <body>
        <h1>Привет, {userName}!</h1>
        {isAdmin && <div>Админская панель</div>}
      </body>
    </html>
  )
})
```

---

## Роли пользователей

Ролей пять. В типе они объявлены как `validAccountRoles = ['None', 'Staff', 'Admin', 'Developer', 'Owner']` — по возрастанию прав:

```
Owner
  └─ Developer
      └─ Admin
          └─ Staff
              └─ None
```

| Роль | Назначение | Проверка |
| --- | --- | --- |
| `Owner` | Владелец аккаунта | `requireAccountRole(ctx, 'Owner')` |
| `Developer` | Разработчик, доступ к коду приложений | `requireAccountRole(ctx, 'Developer')` |
| `Admin` | Администратор | `requireAccountRole(ctx, 'Admin')` |
| `Staff` | Сотрудник, расширенные права | `requireAccountRole(ctx, 'Staff')` |
| `None` | Роли нет — обычный пользователь аккаунта | не проверяется (исключена типом) |

`requireAccountRole(ctx, X)` пропускает X и всех выше. Проверено рантаймом: пользователь с ролью `Staff` проходит проверку на `'Staff'` и получает 403 на `'Admin'` и `'Owner'`; после повышения до `Admin` тот же пользователь проходит и `'Staff'`, и `'Admin'`.

> ⚠️ **Роли `'User'` не существует.** `requireAccountRole(ctx, 'User')` не скомпилируется. Для «любого авторизованного» используйте `requireRealUser(ctx)`, для «любого, включая анонимного» — `requireAnyUser(ctx)`.

**Проверка**:

```typescript
if (ctx.user.is('Admin')) {
  // Только администраторы
}

if (ctx.user.is('Staff')) {
  // Сотрудники и администраторы
}

// ❌ ctx.user.is('User') не скомпилируется — is(role: Exclude<AccountRole, 'None'>)
// Для «любого авторизованного» — requireRealUser(ctx) или ctx.user без проверки роли
```

---

## Использование в роутах

### Защита страниц

**Админская страница**:

```typescript
import { requireAccountRole } from '@app/auth'

export const adminDashboardRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <head>
        <title>Админ панель</title>
      </head>
      <body>
        <AdminDashboard />
      </body>
    </html>
  )
})
```

**Страница профиля**:

```typescript
import { requireRealUser } from '@app/auth'

export const profileRoute = app.get('/', async (ctx) => {
  const user = requireRealUser(ctx)

  return (
    <html>
      <head>
        <title>Профиль - {user.displayName}</title>
      </head>
      <body>
        <ProfilePage />
      </body>
    </html>
  )
})
```

**Публичная страница с трекингом**:

```typescript
import { requireAnyUser } from '@app/auth'

export const landingRoute = app.get('/', async (ctx) => {
  await requireAnyUser(ctx)
  // Теперь ctx.user гарантированно существует

  return (
    <html>
      <body>
        <LandingPage />
      </body>
    </html>
  )
})
```

### Защита API endpoints

**API для администраторов**:

```typescript
import { requireAccountRole } from '@app/auth'

// @shared-route
export const deleteUserRoute = app.post('/delete', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const { userId } = req.body

  await UsersTable.delete(ctx, userId)

  return { success: true }
})
```

**API для авторизованных**:

```typescript
import { requireRealUser } from '@app/auth'

// @shared-route
export const updateProfileRoute = app.post('/update', async (ctx, req) => {
  const user = requireRealUser(ctx)

  const { name, bio } = req.body

  await ProfilesTable.update(ctx, {
    id: user.id,
    name,
    bio
  })

  return { success: true }
})
```

### Комбинирование проверок

```typescript
import { requireRealUser, requireAccountRole } from '@app/auth'

export const editorRoute = app.get('/', async (ctx) => {
  // Сначала проверяем что пользователь реальный
  const user = requireRealUser(ctx)

  // Затем проверяем роль
  requireAccountRole(ctx, 'Staff')

  return (
    <html>
      <body>
        <EditorPanel />
      </body>
    </html>
  )
})
```

---

## Middleware для авторизации

### Базовый middleware

```typescript
import { provideUser } from '@app/auth'

// Middleware с проверкой авторизации
const authMiddleware = app.use(
  provideUser({
    anonymous: false, // Запретить анонимных
    minRole: 'Staff' // Минимальная роль
  })
)

// Использование
export const protectedRoute = authMiddleware.get('/', async (ctx, req) => {
  // ctx.user гарантированно существует и имеет роль Staff или выше
  return { message: 'Protected content' }
})
```

### Проверка доступа к workspace

```typescript
import { checkFilePermissions } from '@app/auth'

const workspaceMiddleware = app.use(checkFilePermissions())

export const workspaceRoute = workspaceMiddleware.get('/', async (ctx, req) => {
  // Доступно только пользователям с доступом к workspace
  return { message: 'Workspace content' }
})
```

### Цепочка middleware

```typescript
import { provideUser } from '@app/auth'

// Первый уровень — базовая авторизация
const authMiddleware = app.use(
  provideUser({
    anonymous: false,
    minRole: 'Staff' // ❌ 'User' невалиден: minRole?: Exclude<AccountRole, 'None'>
  })
)

// Второй уровень — кастомная проверка
const filePermissionMiddleware = authMiddleware.use(async (ctx, req, next) => {
  if (hasAccessToFiles(ctx)) {
    return await next()
  }
  throw new Error('No access to files')
})

// Использование
export const filesRoute = filePermissionMiddleware.get('/', async (ctx) => {
  return { files: [] }
})
```

---

## Работа с пользователями

### Поиск пользователей

```typescript
import { findUsers, findUserById, getUserById, findUsersByIds } from '@app/auth'

// Все пользователи с фильтрами
const users = await findUsers(ctx, {
  where: {
    type: 'Real',
    accountRole: ['Admin', 'Staff']
  },
  limit: 50,
  offset: 0
})

// По имени
const usersByName = await findUsers(ctx, {
  where: {
    fuzzyText: 'john', // Нечёткий поиск: и по core-полям, и по ключам идентичностей
    username: 'john_doe' // Точный поиск по username
  }
})

// По ID
const user = await findUserById(ctx, 'user_id') // null если не найден
const user2 = await getUserById(ctx, 'user_id') // выбросит ошибку если не найден

// Множество пользователей
const usersByIds = await findUsersByIds(ctx, ['id1', 'id2', 'id3'])
```

### Поиск по identity (email, phone)

```typescript
import { findIdentities, normalizeIdentityKey } from '@app/auth'

// Найти identity по email
const identities = await findIdentities(ctx, {
  where: {
    type: 'Email',
    key: normalizeIdentityKey('Email', 'user@example.com')
  }
})

// Получить пользователя по identity
const user = identities[0] ? await findUserById(ctx, identities[0].userId) : null
```

### Создание пользователей

**Реальный пользователь**:

```typescript
import { createRealUser, normalizeIdentityKey } from '@app/auth'

const user = await createRealUser(ctx, {
  firstName: 'John',
  lastName: 'Doe',
  middleName: 'Smith',
  gender: 'male',
  birthday: '1990-01-15', // YYYY-MM-DD или Date
  imageUrl: 'https://example.com/avatar.jpg',
  unconfirmedIdentities: {
    Email: normalizeIdentityKey('Email', 'john@example.com'),
    Phone: normalizeIdentityKey('Phone', '+79001234567')
  }
})
```

**Бот-пользователь**:

```typescript
import { createOrUpdateBotUser } from '@app/auth'

const bot = await createOrUpdateBotUser(ctx, 'bot_username', {
  firstName: 'Support',
  lastName: 'Bot',
  imageHash: 'bot_avatar_hash'
})
```

### Обновление пользователей

> ⚠️ Модуль `@app/users` целиком помечен `@deprecated` («use `@app/auth`») и работает со старой моделью пользователя. Имена обновляются тем же `updateExtendedInfo` — отдельный вызов `updateUser` не нужен.

```typescript
const user = requireRealUser(ctx)

// Имена, пол, дата рождения, аватар — один метод
await user.updateExtendedInfo(ctx, {
  firstName: 'New Name',
  lastName: 'New Surname',
  gender: 'male',
  birthday: '1990-01-15',
  imageHash: 'hash',
})

await user.updateLang(ctx, 'en')
await user.updateUsername(ctx, 'new_username')
await user.updatePassword(ctx, 'newpassword123')
await user.updateAccountRole(ctx, 'Staff')
```

**Важно**:

- Методы обновления — серверные, вызывайте только в backend
- Phone и email через `updateExtendedInfo` не меняются — для них отдельный identity-API: `createUnconfirmedIdentity(ctx, { userId, type, key })`, `makeIdentityPrimary(ctx, identityId)`, `deleteIdentity(ctx, identityId)` из `@app/auth`
- `createRealUser` принимает `accountRole`, но `'Owner'` назначить нельзя — тип `Exclude<AccountRole, 'Owner'>`

---

## Дополнительные поля пользователя

Если нужны поля, которых нет в системе (например, bio, специальная роль), создайте таблицу профилей:

```typescript
// tables/profiles.table.ts
import { Heap } from '@app/heap'

export const ProfilesTable = Heap.Table('profiles', {
  userId: Heap.UserRefLink({ customMeta: { title: 'Пользователь' } }),
  bio: Heap.String({ customMeta: { title: 'О себе' } }),
  projectRole: Heap.String({ customMeta: { title: 'Роль в проекте' } })
})
```

**Использование**:

```typescript
// Создание профиля
await ProfilesTable.create(ctx, {
  userId: ctx.user.id,
  bio: 'Software developer',
  projectRole: 'contributor'
})

// Получение профиля
const profile = await ProfilesTable.findOneBy(ctx, {
  userId: ctx.user.id
})
```

**Важно**: Не дублируйте системные поля (id, firstName, email и т.д.) в таблице профилей.

---

## Ссылки на авторизацию

### В Vue компонентах

```vue
<template>
  <div v-if="ctx.user">
    <span>{{ ctx.user.displayName }}</span>
    <button @click="logout">Выйти</button>
  </div>
  <div v-else>
    <a :href="loginUrl">Войти</a>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// window трогаем только внутри computed/обработчиков: setup выполняется и на сервере при SSR
const loginUrl = computed(() => `/s/auth/signin?back=${encodeURIComponent(window.location.pathname)}`)

async function logout() {
  await fetch('/s/auth/sign-out', { method: 'POST' })
  window.location.reload()
}
</script>
```

### Важные замечания

- ✅ Для входа: `/s/auth/signin?back={путь}`
- ✅ Для выхода: POST на `/s/auth/sign-out`
- ❌ Не используйте в back просто слеш `/`
- ✅ Используйте полный путь текущей страницы
- ❌ Не придумывайте свои ссылки типа `/login` или `/logout`

---

## Лучшие практики

### Выбор метода авторизации

✅ **requireAccountRole** — когда:

- Нужна проверка конкретной роли (Admin, Staff)
- Админские панели и управление
- Действия требующие повышенных прав

✅ **requireRealUser** — когда:

- Создание/изменение данных от имени пользователя
- Личный кабинет, профиль
- Действия требующие идентификации

✅ **requireAnyUser** — когда:

- Публичные страницы с трекингом
- Сохранение временных данных
- Нужна гарантия наличия пользователя

❌ **Не используйте** require\* методы:

- Просто для чтения данных (используйте `ctx.user` напрямую)
- Когда авторизация не требуется

### Логирование

✅ **Правильно**:

```typescript
ctx.account.log('User action', {
  level: 'info',
  json: { userId: ctx.user.id, action: 'login' }
})
```

❌ **Неправильно**:

```typescript
console.log('User logged in')
```

### Проверки в коде

✅ **Правильно**:

```typescript
export const adminRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')
  // Дальнейшая логика
})
```

✅ **Условная проверка** (когда нужна мягкая логика):

```typescript
export const pageRoute = app.get('/', async (ctx) => {
  const isAdmin = ctx.user?.is('Admin') || false

  return (
    <html>
      <body>
        {isAdmin && <AdminPanel />}
        <RegularContent />
      </body>
    </html>
  )
})
```

❌ **Неправильно** (ручная проверка вместо require\*):

```typescript
export const adminRoute = app.get('/', async (ctx) => {
  if (!ctx.user || !ctx.user.is('Admin')) {
    throw new Error('Access denied')
  }
  // Используйте requireAccountRole вместо этого
})
```

### Комбинирование

✅ **Сначала requireRealUser, затем requireAccountRole**:

```typescript
requireRealUser(ctx) // Проверка что пользователь реальный
requireAccountRole(ctx, 'Staff') // Проверка роли
```

---

## Связанные документы

- **002-routing.md** — Использование авторизации в роутах
- **007-vue.md** — Доступ к ctx.user в Vue компонентах
- **008-heap.md** — Хранение дополнительных данных пользователей

---

## Кастомная страница входа

Всё в этой главе проверено рантаймом 2026-07-21. Где остались непроверенные места, стоит явная пометка.

Своя страница входа нужна, только если требуется собственный дизайн или встраивание в свой экран. Во всех остальных случаях используйте платформенную — она уже умеет все способы входа, включая те, что из UGC-кода недоступны.

### Платформенная страница входа

```html
<a href="/s/auth/signin?back=/profile">Войти</a>
```

| Параметр | Поведение |
| --- | --- |
| `back` | Куда вернуть после входа. **Указывайте полный путь приложения**, а не `/` — корень ведёт на главную аккаунта, а не в ваше приложение |
| `layout=empty` | Убирает обвязку платформы (`desktopLayout` становится `empty`) — для встраивания в iframe или модальное окно. Другие значения дают `400 querystring.layout should be equal to one of the allowed values` |

Страница — Vue SPA: обычный GET отдаёт `200 text/html` с пустой оболочкой, форма рендерится клиентским бандлом. Чтобы получить её структуру данными, запросите с платформенным media type:

```typescript
const resp = await fetch('/s/auth/signin?back=/profile', {
  headers: { accept: 'application/chatium.v1+json' },
})
```

Так возвращается JSON с блоками формы. Это же работает и для `/s/auth/password` — см. главу про пароль.

### Провайдеры авторизации

```typescript
import { getEnabledAuthProviders, getAvailableCustomAuthProviders } from '@app/auth/provider'

const enabled = await getEnabledAuthProviders(ctx) // Record<AuthProvider, AnyObject>
const custom = await getAvailableCustomAuthProviders(ctx) // AuthProviderInfo[]
```

Ключи `getEnabledAuthProviders` на реальном аккаунте — смесь членов union `AuthProvider` и идентификаторов приложений-провайдеров:

```
Email, Password, Sms, telegram-auth, sso-auth, sender-tg-auth, user-notifier-token-auth
```

> ⚠️ **Значения — всегда пустые объекты `{}`.** Проверено на всех семи провайдерах. Из `getEnabledAuthProviders` можно узнать только то, какие способы входа включены; никаких настроек оттуда не прочитать. Используйте `Object.keys()`, не значения.

`getAvailableCustomAuthProviders` даёт больше — по приложениям-провайдерам:

```json
{
  "id": "telegram-auth",
  "title": "Telegram OAuth",
  "settingsUrl": "https://<аккаунт>.chatium.ru/app/telegram-auth/settings",
  "icon": { "name": ["fab", "telegram"] }
}
```

`settingsUrl` — страница настройки провайдера в админке, а **не** точка входа для пользователя.

### Как понять, что вход состоялся

Самое важное место главы. Все auth-эндпоинты отвечают `200`, и `success: true` приходит **в том числе при неверном коде и неверном пароле** — это признак «запрос обработан», а не «пользователь вошёл».

Различитель — действие `goBack` с `modalResult: 'authSuccessful'` в `appAction`:

```typescript
function isAuthSuccessful(response: any): boolean {
  return (
    Array.isArray(response?.appAction) &&
    response.appAction.some((a: any) => a.type === 'goBack' && a.modalResult === 'authSuccessful')
  )
}
```

Как это выглядит на практике:

```jsonc
// Вход выполнен
{ "success": true, "appAction": [
  { "type": "goBack", "dismissModal": true, "modalResult": "authSuccessful" },
  { "type": "navigate", "url": "https://<аккаунт>/", "replace": true },
  { "type": "refreshMenu" }
]}

// Код или пароль неверны
{ "success": true, "appAction": { "type": "showToast", "toast": "The code is not valid" } }
```

> ⚠️ **Не проверяйте по типу `appAction`.** Напрашивается правило «объект — провал, массив — успех», но оно неверно: `POST /s/auth/sms/send` при успешной отправке кода тоже возвращает массив (`[showToast, navigate]`), а пользователь при этом не вошёл. Проверять нужно именно `goBack` + `modalResult`.
>
> ⚠️ **И не ищите подстроку `authSuccess` в сериализованном ответе.** Формально она там есть — как префикс `authSuccessful`, — но совпадёт и с любым текстом ошибки, где встретится эта последовательность.

Признак одинаков для всех способов входа — сверено прогонами `/s/auth/password` и `/s/auth/sms/confirm` с настоящим кодом из SMS: ответ при успехе совпадает вплоть до состава и порядка действий.

> ⚠️ **`Set-Cookie` — не различитель, и ждать его не нужно.** В успешном ответе `/s/auth/sms/confirm` заголовка `Set-Cookie` не было вовсе, а сессия при этом поднялась: кука `x-chtm-uid` осталась прежней. Платформа не выдаёт новую сессионную куку, а **привязывает пользователя к идентификатору того клиента, который сделал запрос**. Новая кука приходит только тогда, когда идентификатора ещё нет.

Отсюда же следует ограничение из предыдущей главы: серверный POST привязывает вход к серверному HTTP-клиенту, а не к браузеру пользователя.

> ⚠️ **Не проверяйте по тексту тоста.** Он локализован: на одном и том же запросе приходит то `"Код успешно отправлен через SMS"`, то `"The code is sent in a message"` — в зависимости от языка.

### Разметка страницы входа

Роут отдаёт HTML, Vue-компонент получает данные SSR-пропсами:

```typescript
// @shared
import { jsx } from '@app/html-jsx'
import { getEnabledAuthProviders } from '@app/auth/provider'
import LoginPage from './pages/LoginPage.vue'

export const loginPageRoute = app.html('/', async (ctx, req) => {
  const back = (req.query.back as string) || '/'
  const providers = Object.keys(await getEnabledAuthProviders(ctx))

  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Вход</title>
        <script src="/s/static/lib/tailwind.3.4.16.min.js" />
        <link rel="stylesheet" href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" />
      </head>
      <body>
        <LoginPage providers={providers} back={back} />
      </body>
    </html>
  )
})
```

Версии ассетов проверены и обязательны в пути — `/s/static/lib/tailwind.min.js` без версии даёт `404`, как и любая другая версия. Актуальны `tailwind.3.4.16.min.js` (407 КБ) и `fontawesome/6.7.2/css/all.min.css` (73 КБ).

> ⚠️ В `@app/html-jsx` нет React-атрибута `dangerouslySetInnerHTML`. Чтобы вставить содержимое тега, используйте `innerHTML` строкой: `<script innerHTML={code} />`.


### Аутентификация по паролю

Всё в этом разделе подтверждено сквозными прогонами 2026-07-21. Раньше здесь описывалась
функция `getPasswordHashWithSalt` из `@app/auth/provider` — её не существует ни в одном
модуле `@app/*`/`@users/*`. Сама схема при этом была верной: хеш считается вручную.

#### Модель

Три величины и один эндпоинт:

```
salt = SHA-256(userId)              // hex; то же самое, что геттер user.passwordSalt
hash = SHA-256(password + salt)     // hex lowercase
POST /s/auth/password  ←  { it, ik, s: { hash } }
```

Соль детерминированно выводится из `userId` — это не хранимое поле и не случайное значение.
Она не зависит от пароля и не меняется при его смене. Проверено на живой учётке: три
источника, которые выглядели разными сущностями, дают одно значение.

| Источник | Значение |
| --- | --- |
| `sendHashed.salt` с платформенной формы входа | `a6eaedc4…9138e0` |
| `SHA-256(userId)`, посчитанный самостоятельно | `a6eaedc4…9138e0` |
| `ctx.user.passwordSalt` | `a6eaedc4…9138e0` |

> ⚠️ **Финальный POST всегда делает браузер.** Платформа привязывает вход к идентификатору
> того клиента, который прислал запрос. Отправите с сервера — вход привяжется к серверному
> HTTP-клиенту: ответ будет `success: true`, а в браузере пользователя `ctx.user` не изменится
> (проверено рантаймом). Сервер может посчитать хеш, отправить запрос — нет.

#### Установка пароля

```typescript
await ctx.user.updatePassword(ctx, plainPassword) // @app/auth, Promise<void>
const hasPwd = ctx.user.hasPassword               // задан ли пароль
```

Метод принимает пароль в открытом виде и хеширует сам — своими руками ничего считать не нужно.
Объявлены на `SmartUser` (`@app/auth/index.d.ts`, строки 240 и 243). Есть вариант от третьего
лица — `SmartUserApi.updatePassword(ctx, userId, password)`.

#### Чем считать SHA-256

**На сервере — только `@npm/node-forge`.** Встроенных средств нет: `crypto` — `undefined`
(нет даже в `Object.getOwnPropertyNames(globalThis)`), `Buffer` — `undefined`. Доступны лишь
`TextEncoder`/`TextDecoder`/`Uint8Array`/`ArrayBuffer` — кодирование без хеширования.

```typescript
// @ts-ignore — у @npm/node-forge нет .d.ts, без подавления не пройдёт типчек
const mod = await import('@npm/node-forge')
const forge = mod.default ?? mod

const md = forge.md.sha256.create()
md.update('test')
md.digest().toHex() // 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
```

Доступны `sha256`, `sha1`, `sha512`, `sha384`, `sha512/256`, `sha512/224`, `md5`, `hmac`,
плюс утилиты `encode64`/`decode64`, `hexToBytes`/`bytesToHex`, `encodeUtf8`/`decodeUtf8`.

`@npm/*` — фиксированный список из трёх пакетов, зашитый в платформу: `date-fns`,
`date-fns-tz`, `node-forge`. Свои пакеты не добавляются, объявление в `package.json`
на резолв не влияет. У `date-fns*` типы полные, у `node-forge` их нет.

**В браузере** (`.vue`, клиентский бандл) `crypto.subtle` и `TextEncoder` — обычные
браузерные API, использовать их там законно.

> ⚠️ **Ловушка типчека.** `crypto.subtle` и `TextEncoder` объявлены DOM-библиотекой
> (`lib: ["es2021","dom"]` в `tsconfig.json` — нужна для клиентского Vue), поэтому
> **серверный** код с ними пройдёт проверку типов и упадёт в рантайме с
> `ReferenceError: crypto is not defined`. Тот же класс ловушки, что описан в
> `047-base64.md` для `Buffer`/`btoa`. На сервере — только forge.

#### Схема А — хеш считает сервер

Пароль уходит на ваш сервер, соль выводится из `userId`. Так устроен рабочий образец
`inner/samples/imported/personalizirovannaya-stranitsa-avtorizatsii/api/password.ts`.

**Серверный роут** возвращает только хеш:

```typescript
import { findIdentities, normalizeIdentityKey } from '@app/auth'

// @shared-route
export const getPasswordHashRoute = app
  .post('/get-password-hash')
  .body((s) => ({
    it: s.enum(['Phone', 'Email']),
    ik: s.string(),
    pwd: s.string(),
  }))
  .handle(async (ctx, req) => {
    const { it, ik, pwd } = req.body

    const [identity] = await findIdentities(ctx, {
      where: { type: it, key: normalizeIdentityKey(it, ik), isBlocked: false },
      limit: 1,
    })

    // @ts-ignore — у @npm/node-forge нет .d.ts
    const mod = await import('@npm/node-forge')
    const forge = mod.default ?? mod

    // Несуществующая идентичность — пустая соль: ответ неотличим от неверного пароля
    let salt = ''
    if (identity) {
      const saltMd = forge.md.sha256.create()
      saltMd.update(identity.userId)
      salt = saltMd.digest().toHex()
    }

    const hashMd = forge.md.sha256.create()
    hashMd.update(pwd + salt)
    return ctx.text(hashMd.digest().toHex())
  })
```

**Клиент** получает хеш и сам выполняет вход:

```typescript
const hash = await fetch(hashRouteUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ it, ik, pwd: password }),
}).then((r) => r.text())

const result = await fetch('/s/auth/password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ it, ik, back: '/', fromApiCall: false, s: { hash } }),
  credentials: 'include',
}).then((r) => r.json())
```

#### Схема Б — всё в браузере

Пароль не покидает клиент. Соль запрашивается у платформы — тот же `/s/auth/password`,
но методом GET и с особым `Accept`:

```typescript
// .vue — клиентский бандл
async function loginWithPassword(it: 'Email' | 'Phone', ik: string, password: string) {
  // 1. Соль по идентичности
  const saltResp = await fetch(
    `/s/auth/password?it=${it}&ik=${encodeURIComponent(ik)}&back=/&layout=empty`,
    { headers: { accept: 'application/chatium.v1+json' } },
  )
  const salt = findSendHashedSalt(await saltResp.json()) // блок с name: 's', поле sendHashed.salt

  // 2. Хеш считает браузер
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + salt))
  const hash = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // 3. Вход
  const resp = await fetch('/s/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ it, ik, back: '/', fromApiCall: false, s: { hash } }),
    credentials: 'include',
  })
  return await resp.json()
}
```

Ответ GET-запроса — JSON с описанием формы; поле пароля представлено блоком
`TextInputBlock` с `name: "s"` и `sendHashed: { salt: "<64 hex>" }`.

> ⚠️ **Работает только media type `application/chatium.v1+json`.** С обычным
> `Accept: application/json` тот же URL отдаёт `200 text/html` — HTML-оболочку SPA без соли.
> Минимальный контракт — один заголовок `Accept`; CSRF-токен и `x-chatium-*` не нужны.

На **несуществующую** идентичность эндпоинт тоже отдаёт соль — по ответу нельзя определить,
зарегистрирован ли пользователь. Это защита от перебора учёток, а не баг.

#### Регистрация с паролем

Доступна из обычного UGC-кода. Подтверждение идентичности **не требуется**: проверены
поля `confirmedBy` (пустой у нового пользователя) и `isPrimary` (`false`) — на вход
не влияет ни то, ни другое. Эндпоинт проверяет только наличие пароля у пользователя
и совпадение хеша.

```typescript
import { createRealUser } from '@app/auth'

const user = await createRealUser(ctx, {
  firstName: 'Имя',
  lastName: 'Фамилия',
  unconfirmedIdentities: { Email: email }, // либо Phone
})

await user.updatePassword(ctx, password)
// дальше — вход по схеме А или Б; userId для соли это user.id
```

> ⚠️ **Подтверждение адреса — ваша ответственность.** Платформа не проверяет, владеет ли
> регистрирующийся указанным email или телефоном. Без собственной проверки владения любой
> сможет занять чужой адрес. Для подтверждения используйте штатные SMS/email-коды
> (`submitPhoneAndSendSmsCodeAction`, `submitEmailAndSendCodeAction` из `@app/auth/provider`).

#### Справочник эндпоинта

`POST /s/auth/password`, тело JSON:

```json
{
  "it": "Email",
  "ik": "user@example.com",
  "s": { "hash": "<SHA-256 в hex>" }
}
```

| Поле | Требования |
| --- | --- |
| `it` | **только** `'Email'` или `'Phone'`; иное → `400 body.it should be equal to constant` |
| `ik` | email или телефон; нормализуется через `normalizeIdentityKey` |
| `s` | **объект** (строка → `400 body.s should be object`) с обязательным `hash` |
| `back`, `fromApiCall` | опциональны; влияют на состав `appAction` в ответе |

Ответы:

- **успех** — `200` и `{ "success": true, "appAction": [ goBack с `modalResult: 'authSuccessful'`, navigate, refreshMenu ] }`. `Set-Cookie` может не прийти: если у клиента уже есть идентификатор, пользователь привязывается к нему;
- **неверный пароль** — `200` с `appAction.toast = "Invalid password"` (не `4xx`);
- **пустое тело** — `400 body should have required property 'it', 'ik', 's'`.

#### Границы

`createConfirmedIdentity` и `createUserWithConfirmedIdentity` из `@app/auth/provider`
доступны только приложениям-провайдерам авторизации — из обычного UGC-кода
подтверждённую идентичность создать нельзя. На вход по паролю это не влияет.

Если свой дизайн формы не нужен, штатный путь — платформенная страница входа:

```html
<a href="/s/auth/signin?back=/profile">Войти</a>
```

### Вход по коду из SMS

Два запроса: отправить код, затем подтвердить. Оба выполняются из браузера — как и в случае с паролем, серверный POST привяжет вход к серверному HTTP-клиенту, а не к пользователю.

```typescript
// 1. Отправить код
await fetch('/s/auth/sms/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '79034375443', back: '/myapp' }),
  credentials: 'include',
})
// → 200, appAction: [showToast, navigate → /s/auth/sms/confirm?phone=…&back=… с openInModalScreen]

// 2. Подтвердить код
const resp = await fetch('/s/auth/sms/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '79034375443', verificationCode: '123456' }),
  credentials: 'include',
})
const result = await resp.json()
if (isAuthSuccessful(result)) {
  /* вошли */
}
```

> ⚠️ **Поле кода называется `verificationCode`.** С `validationCode` эндпоинт отвечает `500`. Имя `validationCode` встречается в JSDoc `submitSmsCodeAction` — но это имя поля **формы** для action-флоу (ниже), а не поле тела HTTP-запроса. Слои разные, значения не совпадают.

Телефон нормализуйте до цифр — платформенные идентичности хранятся нормализованными:

```typescript
const normalized = phone.replace(/[^0-9]/g, '')
```

**Альтернатива — action-функции.** `@app/auth/provider` экспортирует серверные обёртки, возвращающие `SubmitFormAction` с готовым URL и параметрами:

```typescript
import { submitPhoneAndSendSmsCodeAction, submitSmsCodeAction } from '@app/auth/provider'

const action = await submitPhoneAndSendSmsCodeAction(ctx, { back })
// { type: 'submitForm', url: 'https://<аккаунт>/s/auth/sms/send', params: { back } }
```

Их JSDoc прямо говорит «helpful for creating custom sign-in screens». Оба пути рабочие: HTTP-ручки проще для своей Vue-формы, action-функции — когда форма собирается платформенными блоками.

### Вход по коду на email

Тот же сценарий, другое имя поля кода — здесь просто `code`:

```typescript
await fetch('/s/auth/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
  credentials: 'include',
})
// → 200, appAction: [showToast "The code is sent to <email>", navigate]

const resp = await fetch('/s/auth/email/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, code: '123456' }),
  credentials: 'include',
})
```

Серверные обёртки — `submitEmailAndSendCodeAction`, `submitEmailCodeAction`.

> ⚠️ Пустое тело на `/s/auth/email/send` даёт `400` с перечнем обязательных полей, а на обоих `*/confirm` — `500`. Не полагайтесь на код ответа как на валидацию: проверяйте ввод у себя.

### Вход через Telegram

Отдельной функции для этого нет — `getTelegramOauthUrl` и модуль `@users/sdk/auth` не существуют, что бы ни утверждали старые примеры. Вход выполняет приложение-провайдер `telegram-auth`, и точка входа — обычный URL:

```html
<a href="/app/telegram-auth/process?back=%2Fprofile">Войти через Telegram</a>
```

Он снят с живой платформенной страницы входа: кнопка «Sign-in with Telegram» ведёт на `/app/telegram-auth/process?back=<url-encoded>`. Из UGC-кода достаточно открыть этот адрес — ссылкой, `window.location` или action `navigate`.

Условие — провайдер `telegram-auth` должен быть включён на аккаунте. Проверить: он есть в ключах `getEnabledAuthProviders(ctx)`. Настраивается в админке по адресу из `settingsUrl`, который отдаёт `getAvailableCustomAuthProviders(ctx)`.

Аналогично устроен SSO — кнопка «Admin login» на той же странице дёргает `/app/sso-auth/auth-screen~navigate-to-sso` с параметрами `{ backUrl, fromApiCall, consentRequired }`.

### Выход

```typescript
await fetch('/s/auth/sign-out', { method: 'POST', credentials: 'include' })
```

Отвечает `200`. Состав ответа зависит от того, была ли сессия: при живой сессии приходит `appAction` с переходом на `/s/auth/signin`, при уже анонимном клиенте — просто `{ "success": true }`. В типах есть и клиентский action `signOut(options?)` из `lib/chatium-json` — делает то же самое, предпочтительнее там, где вы и так собираете действия платформенными блоками.

### Редиректы на сервере

`ctx.redirect()` действительно не существует. Но это **не повод** использовать `<meta http-equiv="refresh">` — в типах есть два штатных редиректа, оба проверены рантаймом:

```typescript
ctx.resp.redirect('./target') // возвращает this, можно цепочить; принимает statusCode вторым аргументом
ctx.account.redirect('./target') // бросает RedirectError, управление не возвращает (never)
```

Используйте относительные пути (`./`, `../`) — так роут не ломается при переносе приложения.

> ⚠️ Старый совет отдавать `<html><meta http-equiv="refresh" ...></html>` не только избыточен, но и опасен: в тех примерах целевой URL подставлялся в JS-литерал без экранирования.

### Типовые ошибки

**1. Проверять успех входа по `success: true`.** Он приходит и при неверном пароле. Признак — `goBack` с `modalResult: 'authSuccessful'`, см. выше.

**2. Отправлять финальный POST с сервера.** Вход привяжется к серверному HTTP-клиенту; пользователь останется анонимным. Проверено: `ctx.user` в браузере после такого «входа» не меняется. Сервер может считать хеш — отправлять запрос должен браузер.

**7. Ждать `Set-Cookie` как подтверждения.** Его может не быть: если у клиента уже есть `x-chtm-uid`, пользователь привязывается к существующему идентификатору. Проверяйте `appAction`.

**3. `back=/`.** Ведёт на корень аккаунта, а не в приложение. Указывайте полный путь: `back: '/myapp/profile'`.

**4. Не нормализовать телефон.** `'+7 999 123-45-67'` и `'79991234567'` — разные ключи идентичности.

**5. `console.log` в примерах.** В UGC логирование только через `ctx.account.log()`.

**6. Хардкод URL роутов.** Ссылки — через `withProjectRoot(route.url())`, на сервере для редиректов — относительные пути.

### Справочник платформенных эндпоинтов

Все — `POST`, тело JSON, ответ `200` с `{ success, appAction }`.

| Эндпоинт | Тело | Назначение |
| --- | --- | --- |
| `/s/auth/sms/send` | `{ phone }` | Отправить код в SMS |
| `/s/auth/sms/confirm` | `{ phone, verificationCode }` | Подтвердить код из SMS |
| `/s/auth/email/send` | `{ email }` | Отправить код на email |
| `/s/auth/email/confirm` | `{ email, code }` | Подтвердить код из письма |
| `/s/auth/password` | `{ it, ik, s: { hash } }` | Вход по паролю (см. главу выше) |
| `/s/auth/sign-out` | — | Выход |

`GET /s/auth/signin` и `GET /s/auth/password` при заголовке `Accept: application/chatium.v1+json` отдают JSON-структуру формы вместо HTML.



## Связанные документы

- **002-routing.md** — Использование авторизации в роутах
- **007-vue.md** — Доступ к ctx.user в Vue компонентах
- **008-heap.md** — Хранение дополнительных данных пользователей

---

**Версия**: 3.0  
**Дата**: 2026-07-21  
**Последнее обновление**: 2026-07-21 — глава про кастомный вход переписана целиком по результатам сверки с типами и рантайм-прогонов. Удалены несуществующие API (`@users/sdk/auth`, `getTelegramOauthUrl`, `getPasswordHashWithSalt`, `dangerouslySetInnerHTML`, `ctx.user.imageThumbnailUrl`). Исправлены роли (пять, не три), паттерн `requireRealUser`, рекомендация по редиректам. Добавлены проверенные контракты эндпоинтов SMS/email/пароля и признак успешного входа.

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

---

## Основные концепции

**Авторизация в Chatium** — система проверки прав доступа пользователей к роутам и ресурсам.

### Ключевые понятия

- **ctx.user** — объект текущего пользователя, доступен глобально
- **Роли аккаунта** — Admin, Staff, User (иерархические)
- **Типы пользователей** — Real (реальный), Bot (бот), Anonymous (анонимный)
- **Методы require\* ** — функции проверки авторизации, выбрасывают ошибку при неудаче

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

Параметр — union строковых литералов, поэтому опечатка в регистре (`'admin'`) **ловится типчеком** (TS2345) и до рантайма не доходит. Если её всё же протащить через `as any`, доступ будет закрыт: сравнение строгое, незнакомое значение никого не пропускает. То есть ошибка в значении роли безопасна — она закрывает функционал, а не открывает его.

При недостаточной роли выбрасывается `AccessDeniedError` (`statusCode = 403`); если пользователя нет вовсе — `AuthRequiredError` (401), эта проверка идёт первой.

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

**Использование**:

```typescript
import { requireRealUser } from '@app/auth'

export const profilePageRoute = app.get('/', async (ctx) => {
  requireRealUser(ctx)
  // Выбросит ошибку если пользователь анонимный или не авторизован

  return (
    <html>
      <head>
        <title>Профиль - {ctx.user.displayName}</title>
      </head>
      <body>
        <ProfilePage />
      </body>
    </html>
  )
})
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
ctx.user.imageThumbnailUrl // URL thumbnail аватара
ctx.user.accountRole // 'None' | 'Staff' | 'Admin' | 'Developer' | 'Owner'
ctx.user.type // 'Real' | 'Bot' | 'Anonymous'
ctx.user.lang // Язык пользователя ('ru', 'en', etc.)
```

### Методы

```typescript
// Проверка роли
ctx.user.is('Admin') // true если админ
ctx.user.is('Staff') // true если Staff или Admin
ctx.user.is('User') // ⚠️ допустимость 'User' здесь не проверена — в AccountRole такой роли нет

// Получение thumbnail с кастомным размером
ctx.user.getImageThumbnailUrl(200) // 200x200

// JSON представление
ctx.user.toJSON()
```

**Пример использования**:

```typescript
export const dashboardRoute = app.get('/', async (ctx) => {
  requireRealUser(ctx)

  const isAdmin = ctx.user.is('Admin')
  const userName = ctx.user.displayName
  const userEmail = ctx.user.confirmedEmail

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

Система имеет 3 иерархические роли:

### Admin (Администратор)

- Полный доступ ко всему
- Включает права Staff и User
- `requireAccountRole(ctx, 'Admin')`

### Staff (Сотрудник)

- Расширенные права
- Включает права User
- `requireAccountRole(ctx, 'Staff')`

### User (Пользователь)

- Базовые права
- Доступны всем авторизованным
- ⚠️ Роли `'User'` в типе `AccountRole` **нет** — `requireAccountRole(ctx, 'User')` не скомпилируется. Для «любого авторизованного» используйте `requireRealUser(ctx)`

**Иерархия ролей**:

```
Admin
  └─ Staff
      └─ User
```

**Проверка**:

```typescript
if (ctx.user.is('Admin')) {
  // Только администраторы
}

if (ctx.user.is('Staff')) {
  // Сотрудники и администраторы
}

if (ctx.user.is('User')) {
  // Все авторизованные пользователи
}
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
  requireRealUser(ctx)

  return (
    <html>
      <head>
        <title>Профиль - {ctx.user.displayName}</title>
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
  requireRealUser(ctx)

  const { name, bio } = req.body

  await ProfilesTable.update(ctx, {
    id: ctx.user.id,
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
  requireRealUser(ctx)

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
export const protectedRoute = authMiddleware.get('/protected', async (ctx, req) => {
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
    minRole: 'User'
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
    fuzzyText: 'john', // Поиск по имени
    username: 'john_doe' // Точный поиск по username
  }
})

// По ID
const user = await findUserById(ctx, 'user_id') // null если не найден
const user2 = await getUserById(ctx, 'user_id') // выбросит ошибку если не найден

// Множество пользователей
const users = await findUsersByIds(ctx, ['id1', 'id2', 'id3'])
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

```typescript
import { updateUser } from '@app/users'

// Обновление firstName и lastName
await updateUser(ctx, ctx.user.id, {
  firstName: 'New Name',
  lastName: 'New Surname'
})

// Обновление расширенной информации
await ctx.user.updateExtendedInfo(ctx, {
  gender: 'male',
  birthday: '1990-01-15',
  imageHash: 'hash'
})

// Обновление языка
await ctx.user.updateLang(ctx, 'en')

// Обновление username и password
await ctx.user.updateUsername(ctx, 'new_username')
await ctx.user.updatePassword(ctx, 'newpassword123')
```

**Важно**:

- Методы обновления — серверные, вызывайте только в backend
- phone и email обновлять нельзя — это системные поля

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

const currentPath = window.location.pathname

const loginUrl = computed(() => `/s/auth/signin?back=${encodeURIComponent(currentPath)}`)

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

### Создание стилизованной формы авторизации

Вместо стандартной системной страницы `/s/auth/signin` можно создать **кастомную форму входа** в дизайне вашего проекта.

**Обновленная структура формы (ноябрь 2025):**
Форма теперь показывает поле пароля сразу под полем ввода телефона/email (если провайдер `Password` включен), позволяя пользователю выбрать между входом по паролю или получением кода. Порядок элементов: Поле ввода → Поле пароля → Кнопка "Войти" → Разделитель "или" → Кнопка "Отправить код" → Разделитель "или" → Кнопка "Войти через Telegram".

**Структура файлов:**

```
project/
├── login.tsx                    # HTML страница входа
├── pages/
│   └── LoginPage.vue           # Главный компонент формы входа
├── components/
│   ├── PhoneAuthForm.vue       # Форма авторизации по телефону
│   └── EmailAuthForm.vue       # Форма авторизации по email
├── sdk/
│   └── auth.ts                 # SDK для работы с API авторизации
└── api/
    ├── password.ts             # API для получения хеша пароля
    └── telegram.ts             # API для Telegram OAuth
```

### Основной роут (login.tsx)

```typescript
// @shared
import { jsx } from "@app/html-jsx"
import { getEnabledAuthProviders } from '@app/auth/provider'
import { tailwindScript, cssVariables, commonStyles } from './styles'
import LoginPage from './pages/LoginPage.vue'

export const loginPageRoute = app.html('/', async (ctx, req) => {
  const back = (req.query.back as string) || '/app/home'

  // Получение доступных провайдеров авторизации
  const providers = await getEnabledAuthProviders(ctx)

  return (
    <html>
      <head>
        <title>Вход в систему</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charset="UTF-8" />

        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: tailwindScript }} />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />

        <style type="text/tailwindcss">{cssVariables}</style>
        <style>{commonStyles}</style>
      </head>
      <body>
        <LoginPage providers={providers} back={back} />
      </body>
    </html>
  )
})

export default loginPageRoute
```

**Ключевые моменты:**

- ✅ Используйте `getEnabledAuthProviders(ctx)` для получения активных провайдеров
- ✅ Передайте `providers` и `back` в Vue компонент
- ✅ Параметр `back` - URL для возврата после успешной авторизации

### Перехват ошибок авторизации

**Редирект на кастомную форму входа:**

```typescript
import { requireAccountRole } from '@app/auth'
import { loginPageRoute } from './login'

export const protectedPageRoute = app.html('/', async (ctx, req) => {
  // Перехватываем ошибку авторизации
  try {
    requireAccountRole(ctx, 'Admin')
  } catch (error) {
    const loginUrl = loginPageRoute.url() + `?back=${encodeURIComponent(ctx.req.url)}`
    return (
      <html>
        <head>
          <meta http-equiv="refresh" content={`0; url=${loginUrl}`} />
          <script>{`window.location.href = '${loginUrl}'`}</script>
        </head>
        <body>
          <p>Перенаправление на страницу входа...</p>
        </body>
      </html>
    )
  }

  // Защищённый контент
  return (
    <html>
      <body>
        <ProtectedContent />
      </body>
    </html>
  )
})
```

**Важно:**

- ❌ `ctx.redirect()` не существует - используйте HTML редирект
- ✅ Используйте `<meta http-equiv="refresh">` + JavaScript fallback
- ✅ Обязательно передавайте параметр `back` для возврата на исходную страницу

### Провайдеры авторизации

**Доступные ключи провайдеров:**

```typescript
// SMS авторизация
'Sms'

// Email авторизация
'Email'

// Пароль (для телефона и email)
'Password'

// Telegram OAuth
'telegram-auth' // Telegram OAuth

// SSO авторизация
'sso-auth'
```

### Настройка Telegram OAuth в админке

Чтобы провайдер `telegram-auth` стал доступен, необходимо выполнить настройку в админ-панели:

**Шаг 1: Установка дополнения**

1. Перейдите по адресу `/app/store/~telegram-auth` в вашем Chatium workspace
2. Установите дополнение "Telegram Auth"
3. Нажмите на появившуюся кнопку **"Включить Telegram OAuth"**

**Шаг 2: Активация провайдера**

1. Нажмите кнопку **"Добавить нового провайдера"**
2. Выберите **"Telegram OAuth"** из списка
3. Справа от появившегося сверху пункта "Telegram OAuth" поставьте **галочку** для активации

**После настройки** провайдер автоматически появится в `getEnabledAuthProviders(ctx)` под ключом `'telegram-auth'`.

**Проверка доступности:**

```typescript
const providers = await getEnabledAuthProviders(ctx)
console.log('Доступные провайдеры:', Object.keys(providers))

// Если Telegram настроен:
// ['Sms', 'Email', 'Password', 'telegram-auth']
```

**Проверка доступности провайдера:**

```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  providers: {
    type: Object,
    required: true
  }
})

const isPhoneEnabled = computed(() => Object.keys(props.providers).includes('Sms'))

const isEmailEnabled = computed(() => Object.keys(props.providers).includes('Email'))

const isPasswordEnabled = computed(() => Object.keys(props.providers).includes('Password'))

const isTelegramEnabled = computed(() => Object.keys(props.providers).includes('telegram-auth'))
</script>
```

### Лимит авторизационных SMS (тариф «Бизнес»)

Платформенный лимит (не Chatium-API, а тариф аккаунта): **200 SMS** в месяц на тарифе «Бизнес» (используется в этом workspace). Превышение — ~5 ₽/SMS (зависит от региона) либо подключение собственного SMSC-провайдера, чтобы не платить платформе.

### SDK авторизации (sdk/auth.ts)

**SMS авторизация:**

```typescript
// @shared

// Отправка SMS кода
export async function sendSmsCode(phone: string) {
  const normalizedPhone = phone.replace(/[^0-9]/g, '')

  const response = await fetch('/s/auth/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizedPhone })
  })

  return await response.json()
}

// Подтверждение SMS кода
export async function confirmSmsCode(phone: string, verificationCode: string) {
  const normalizedPhone = phone.replace(/[^0-9]/g, '')

  const response = await fetch('/s/auth/sms/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizedPhone, verificationCode })
  })

  return await response.json()
}
```

**Email авторизация:**

```typescript
// Отправка Email кода
export async function sendEmailCode(email: string) {
  const response = await fetch('/s/auth/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })

  return await response.json()
}

// Подтверждение Email кода
export async function confirmEmailCode(email: string, code: string) {
  const response = await fetch('/s/auth/email/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code })
  })

  return await response.json()
}
```

**Авторизация по паролю:**

```typescript
// Авторизация по паролю (для Phone или Email)
export async function loginWithPassword(
  type: 'Phone' | 'Email',
  identifier: string,
  checkHashUrl: string,
  password: string
) {
  try {
    // Шаг 1: Получение хеша пароля через API
    const response = await fetch(checkHashUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        it: type, // Identity Type
        ik: identifier, // Identity Key
        pwd: password // Password
      })
    })

    if (!response.ok) {
      return { success: false, error: 'Ошибка при получении хеша пароля' }
    }

    const passwordHash = await response.text()

    // Шаг 2: Авторизация с хешем пароля
    const authResponse = await fetch('/s/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        it: type,
        ik: identifier,
        s: { hash: passwordHash }
      })
    })

    return await authResponse.json()
  } catch (error) {
    return { success: false, error: 'Произошла ошибка при авторизации' }
  }
}
```

**Вспомогательные функции:**

```typescript
// Обработка ошибок авторизации
export function handleAuthError(error: any): string {
  if (typeof error === 'string') {
    if (error.includes('Неверный код')) return 'Неверный код подтверждения'
    if (error.includes('Неверный пароль')) return 'Неверный пароль'
    if (error.includes('not found')) return 'Пользователь не найден'
    if (error.includes('blocked')) return 'Аккаунт заблокирован'
    return error
  }

  return 'Произошла ошибка при авторизации'
}

// Форматирование номера телефона
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9, 11)}`
  }
  return phone
}

// Валидация email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Валидация телефона
export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  return cleanPhone.length >= 10 && cleanPhone.length <= 15
}
```

### API endpoint для хеша пароля

**api/password.ts:**

```typescript
// @shared-route
import { getPasswordHashWithSalt } from '@app/auth/provider'

export const apiGetPasswordHashRoute = app.post('/password-hash', async (ctx, req) => {
  try {
    const { it, ik, pwd } = req.body

    if (!it || !ik || !pwd) {
      return ctx.text('Missing parameters', 400)
    }

    const hash = await getPasswordHashWithSalt(ctx, it, ik, pwd)
    return ctx.text(hash)
  } catch (error: any) {
    ctx.account.log('Failed to get password hash', {
      level: 'error',
      json: { error: error.message }
    })
    return ctx.text('Error', 500)
  }
})
```

**Важно:**

- Хеш пароля получается через `getPasswordHashWithSalt(ctx, type, identifier, password)`
- Параметры: `it` (Identity Type), `ik` (Identity Key), `pwd` (Password)
- Возвращает текстовый хеш, который передаётся в `/s/auth/password`

### API endpoint для Telegram OAuth

**Важно:** Перед использованием убедитесь, что провайдер `telegram-auth` настроен в админке (см. раздел "Настройка Telegram OAuth в админке" выше).

**api/telegram.ts:**

```typescript
import { getTelegramOauthUrl } from '@users/sdk/auth'

// @shared-route
export const getTelegramOauthUrlRoute = app
  .post('/get-telegram-oauth-url')
  .body((s) => ({
    back: s.string().optional()
  }))
  .handle(async (ctx, req) => {
    const { back } = req.body

    const oauthUrl = await getTelegramOauthUrl(ctx, { back })

    return oauthUrl
  })
```

**Ключевые моменты:**

- ✅ Импорт из `@users/sdk/auth` (не из `@app/auth`)
- ✅ Функция `getTelegramOauthUrl(ctx, { back })` возвращает URL для OAuth
- ✅ Параметр `back` - URL для редиректа после успешной авторизации

**Использование в Vue:**

```vue
<script setup>
import { getTelegramOauthUrlRoute } from '../api/telegram'

const handleTelegramLogin = async () => {
  try {
    const oauthUrl = await getTelegramOauthUrlRoute.run(ctx, { back: props.back })
    window.location.href = oauthUrl // Редирект на Telegram OAuth
  } catch (error) {
    console.error('Ошибка получения ссылки для авторизации через Telegram:', error)
  }
}
</script>
```

### Компоненты форм авторизации

**PhoneAuthForm.vue** - форма авторизации по телефону с паролем:

```vue
<template>
  <div>
    <!-- Шаг 1: Ввод телефона и пароля -->
    <div v-if="step === 'phone'">
      <div class="mb-4">
        <label class="block text-sm font-medium text-[var(--color-text)] mb-2">
          <i class="fas fa-phone mr-2"></i>
          Номер телефона
        </label>
        <input
          v-model="phone"
          type="tel"
          placeholder="+7 (999) 123-45-67"
          class="input w-full"
          :disabled="loading"
          @keyup.enter="showPasswordOption ? (password ? handlePasswordLogin() : null) : sendCode()"
        />
      </div>

      <!-- Поле пароля (всегда видимое, если опция включена) -->
      <div v-if="showPasswordOption" class="mb-4">
        <label class="block text-sm font-medium text-[var(--color-text)] mb-2">
          <i class="fas fa-key mr-2"></i>
          Пароль
        </label>
        <div class="relative">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Введите пароль"
            class="input w-full pr-12"
            :disabled="loading"
            @keyup.enter="handlePasswordLogin"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
            style="color: var(--color-text-tertiary)"
          >
            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
          </button>
        </div>
      </div>

      <!-- Кнопка "Войти" -->
      <button
        v-if="showPasswordOption"
        @click="handlePasswordLogin()"
        :disabled="loading || !isValidPhone(phone) || !password"
        class="btn w-full mb-4"
        :style="
          loading || !isValidPhone(phone) || !password
            ? 'background: var(--color-bg-secondary); color: var(--color-text-tertiary); border: 1.5px solid var(--color-border); cursor: not-allowed;'
            : 'background: var(--color-primary); color: white; border: 1.5px solid var(--color-primary); cursor: pointer;'
        "
      >
        <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else class="fas fa-sign-in-alt mr-2"></i>
        {{ loading ? 'Вход...' : 'Войти' }}
      </button>

      <!-- Разделитель "или" -->
      <div class="relative my-4">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[var(--color-border)]"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            >или</span
          >
        </div>
      </div>

      <!-- Кнопка "Отправить код" -->
      <button
        @click="sendCode()"
        :disabled="loading || !isValidPhone(phone)"
        class="btn btn-primary w-full"
      >
        <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else class="fas fa-paper-plane mr-2"></i>
        {{ loading ? 'Обработка...' : 'Отправить код' }}
      </button>
    </div>

    <!-- Шаг 2: Ввод кода подтверждения -->
    <div v-if="step === 'code'">
      <div class="text-center mb-6">
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style="background: var(--color-primary-light)"
        >
          <i class="fas fa-sms text-2xl" style="color: var(--color-primary)"></i>
        </div>
        <h3 class="text-lg font-semibold text-[var(--color-text)] mb-2">Введите код</h3>
        <p class="text-[var(--color-text-secondary)] text-sm">
          Код отправлен на номер<br />
          <span class="font-medium">{{ formatPhoneNumber(phone) }}</span>
        </p>
      </div>

      <div class="mb-4">
        <input
          v-model="verificationCode"
          type="text"
          placeholder="0000"
          maxlength="4"
          class="input w-full text-center text-2xl font-mono"
          :disabled="loading"
          @keyup.enter="confirmCode"
        />
      </div>

      <button @click="confirmCode" class="btn btn-primary w-full mb-4">
        <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
        <i v-else class="fas fa-check mr-2"></i>
        {{ loading ? 'Проверка...' : 'Подтвердить' }}
      </button>

      <button @click="goBack" class="btn w-full" style="background: var(--color-border);">
        <i class="fas fa-arrow-left mr-2"></i>
        Изменить номер
      </button>
    </div>

    <!-- Ошибки -->
    <div
      v-if="error"
      class="mt-4 p-3 rounded-lg"
      style="background: var(--color-danger-light); color: var(--color-danger)"
    >
      <i class="fas fa-exclamation-circle mr-2"></i>
      <span class="text-sm">{{ error }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import {
  sendSmsCode,
  confirmSmsCode,
  loginWithPassword,
  handleAuthError,
  formatPhoneNumber,
  isValidPhone
} from '../sdk/auth'
import { apiGetPasswordHashRoute } from '../api/password'

const props = defineProps({
  showPasswordOption: { type: Boolean, default: false }
})

const emit = defineEmits(['success'])

const step = ref('phone')
const phone = ref('')
const password = ref('')
const verificationCode = ref('')
const usePassword = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const sendCode = async () => {
  if (!isValidPhone(phone.value)) {
    error.value = 'Введите корректный номер телефона'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await sendSmsCode(phone.value)

    if (result.success) {
      step.value = 'code'
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при отправке SMS'
  } finally {
    loading.value = false
  }
}

const confirmCode = async () => {
  if (verificationCode.value.length < 4) {
    error.value = 'Введите код из 4 цифр'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await confirmSmsCode(phone.value, verificationCode.value)

    if (JSON.stringify(result).includes('authSuccess')) {
      emit('success') // Вызываем callback успеха
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при подтверждении кода'
  } finally {
    loading.value = false
  }
}

const handlePasswordLogin = async () => {
  if (!isValidPhone(phone.value) || !password.value) {
    error.value = 'Заполните все поля'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await loginWithPassword(
      'Phone',
      phone.value,
      apiGetPasswordHashRoute.url(),
      password.value
    )

    if (JSON.stringify(result).includes('authSuccess')) {
      emit('success')
    } else {
      error.value = handleAuthError(result.error)
    }
  } catch (err) {
    error.value = 'Ошибка при авторизации'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  step.value = 'phone'
  verificationCode.value = ''
  error.value = ''
}
</script>
```

**EmailAuthForm.vue** - форма авторизации по email с паролем:

Структура формы идентична PhoneAuthForm, с отличиями:

- Использует `sendEmailCode()`, `confirmEmailCode()` вместо SMS версий
- Код подтверждения из 6 цифр вместо 4
- Валидация email вместо телефона
- Те же шаги: ввод email + пароль → кнопка "Войти" → разделитель "или" → кнопка "Отправить код"

**Ключевые особенности новой структуры форм:**

1. **Поле пароля всегда видно** (если провайдер `Password` включен)
2. **Порядок элементов:**
   - Поле email/телефона
   - Поле пароля (с иконкой показа/скрытия)
   - Кнопка "Войти" (основное действие)
   - Разделитель "или"
   - Кнопка "Отправить код" (альтернативный вход)
3. **Единая форма для обоих методов** - пользователь выбирает удобный способ прямо на одном экране

### Telegram авторизация

**Кнопка Telegram в LoginPage.vue:**

```vue
<template>
  <div>
    <!-- ... другие методы авторизации ... -->

    <!-- Кнопка Telegram -->
    <div v-if="isTelegramEnabled" :class="{ 'mt-4': isPhoneEnabled || isEmailEnabled }">
      <!-- Разделитель "или" если есть другие методы -->
      <div v-if="isPhoneEnabled || isEmailEnabled" class="relative mb-4">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[var(--color-border)]"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            >или</span
          >
        </div>
      </div>

      <button
        @click="handleTelegramLogin"
        class="w-full font-medium py-3 px-4 rounded-lg transition-all 
               flex items-center justify-center"
        style="background: linear-gradient(135deg, #229ED9 0%, #0088cc 100%); 
               color: white;"
      >
        <i class="fab fa-telegram-plane mr-2 text-lg"></i>
        Войти через Telegram
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getTelegramOauthUrlRoute } from '../api/telegram'

const isTelegramEnabled = computed(() => Object.keys(props.providers).includes('telegram-auth'))

const handleTelegramLogin = async () => {
  try {
    const oauthUrl = await getTelegramOauthUrlRoute.run(ctx, { back: props.back })
    window.location.href = oauthUrl
  } catch (error) {
    console.error('Ошибка авторизации через Telegram:', error)
    alert('Произошла ошибка при авторизации через Telegram. Попробуйте позже.')
  }
}
</script>
```

**Важные детали:**

- ✅ Проверка провайдера: `Object.keys(props.providers).includes('telegram-auth')`
- ✅ Используйте `window.location.href` для редиректа (не `window.open`)
- ✅ Разделитель "или" показывается только если есть другие методы авторизации
- ✅ Кнопка в фирменных цветах Telegram (#229ED9, #0088cc)
- ✅ Разделитель идёт **перед** кнопкой Telegram, а не после (используйте `class="relative mb-4"`)

**Полная структура элементов формы:**

1. Поле email/телефона
2. Поле пароля (если Password провайдер включен)
3. Кнопка "Войти" (если Password провайдер включен)
4. Разделитель "или"
5. Кнопка "Отправить код"
6. Разделитель "или" (если Telegram включен)
7. Кнопка "Войти через Telegram" (если telegram-auth провайдер включен)

### Полный пример LoginPage.vue

```vue
<template>
  <div class="login-card">
    <div class="login-logo">
      <i class="fas fa-handshake text-3xl text-white"></i>
    </div>

    <h1 class="text-2xl font-bold text-[var(--color-text)] text-center mb-2">Вход в систему</h1>
    <p class="text-[var(--color-text-secondary)] text-center mb-8">Описание вашего приложения</p>

    <!-- Переключатель Телефон/Email -->
    <div
      v-if="isPhoneEnabled && isEmailEnabled"
      class="flex mb-6 bg-[var(--color-border)] rounded-lg p-1"
    >
      <button
        @click="authMethod = 'phone'"
        :class="authMethod === 'phone' ? 'bg-[var(--color-bg-secondary)] shadow-sm' : ''"
        class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all"
      >
        <i class="fas fa-phone mr-2"></i> Телефон
      </button>
      <button
        @click="authMethod = 'email'"
        :class="authMethod === 'email' ? 'bg-[var(--color-bg-secondary)] shadow-sm' : ''"
        class="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all"
      >
        <i class="fas fa-envelope mr-2"></i> Email
      </button>
    </div>

    <!-- Форма по телефону -->
    <PhoneAuthForm
      v-if="authMethod === 'phone' && isPhoneEnabled"
      :showPasswordOption="isPasswordEnabled"
      @success="handleLoginSuccess"
    />

    <!-- Форма по email -->
    <EmailAuthForm
      v-if="authMethod === 'email' && isEmailEnabled"
      :showPasswordOption="isPasswordEnabled"
      @success="handleLoginSuccess"
    />

    <!-- Кнопка Telegram -->
    <div v-if="isTelegramEnabled" :class="{ 'mt-4': isPhoneEnabled || isEmailEnabled }">
      <div v-if="isPhoneEnabled || isEmailEnabled" class="relative mb-4">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[var(--color-border)]"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            >или</span
          >
        </div>
      </div>
      <button
        @click="handleTelegramLogin"
        class="btn w-full"
        style="background: linear-gradient(135deg, #229ED9 0%, #0088cc 100%); color: white;"
      >
        <i class="fab fa-telegram-plane mr-2"></i>
        Войти через Telegram
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import PhoneAuthForm from '../components/PhoneAuthForm.vue'
import EmailAuthForm from '../components/EmailAuthForm.vue'
import { getTelegramOauthUrlRoute } from '../api/telegram'

const props = defineProps({
  providers: { type: Object, required: true },
  back: { type: String, default: '/' }
})

const authMethod = ref('phone')

const isPhoneEnabled = computed(() => Object.keys(props.providers).includes('Sms'))
const isEmailEnabled = computed(() => Object.keys(props.providers).includes('Email'))
const isPasswordEnabled = computed(() => Object.keys(props.providers).includes('Password'))
const isTelegramEnabled = computed(() => Object.keys(props.providers).includes('telegram-auth'))

const handleLoginSuccess = () => {
  window.location.href = props.back
}

const handleTelegramLogin = async () => {
  const oauthUrl = await getTelegramOauthUrlRoute.run(ctx, { back: props.back })
  window.open(oauthUrl, '_self')
}
</script>
```

### Системные API endpoints для авторизации

**Chatium предоставляет встроенные endpoints:**

```typescript
// SMS авторизация
POST / s / auth / sms / send // Отправка SMS кода
POST / s / auth / sms / confirm // Подтверждение SMS кода

// Email авторизация
POST / s / auth / email / send // Отправка Email кода
POST / s / auth / email / confirm // Подтверждение Email кода

// Password авторизация
POST / s / auth / password // Авторизация с хешем пароля

// Telegram OAuth
// Получается через getTelegramOauthUrl(ctx, { back })

// Выход
POST / s / auth / sign - out // Выход из системы
```

**Важно:**

- ✅ Все endpoints возвращают JSON
- ✅ При успехе содержат `{ success: true }` или специальное поле `authSuccess`
- ✅ При ошибке содержат `{ success: false, error: 'message' }`
- ✅ После успешной авторизации автоматически устанавливается сессия

### Проверка успешной авторизации

```typescript
// Проверка ответа от API авторизации
if (JSON.stringify(result).includes('authSuccess')) {
  // Авторизация успешна
  window.location.href = backUrl
} else {
  // Показываем ошибку
  error.value = handleAuthError(result.error)
}
```

**Почему `JSON.stringify(result).includes("authSuccess")`?**

- Ответ может содержать вложенные объекты
- `authSuccess` может быть где угодно в структуре
- Это самый надёжный способ проверки

### Лучшие практики для кастомной формы входа

✅ **DO (Делайте):**

1. **Используйте getEnabledAuthProviders:**

```typescript
const providers = await getEnabledAuthProviders(ctx)
```

2. **Автоматически определяйте доступные методы:**

```typescript
const isPhoneEnabled = computed(() => Object.keys(props.providers).includes('Sms'))
```

3. **Валидируйте данные перед отправкой:**

```typescript
if (!isValidEmail(email.value)) {
  error.value = 'Введите корректный email'
  return
}
```

4. **Показывайте состояния загрузки:**

```vue
<button :disabled="loading">
  <i v-if="loading" class="fas fa-spinner fa-spin"></i>
  {{ loading ? 'Отправка...' : 'Отправить' }}
</button>
```

5. **Обрабатывайте ошибки понятно:**

```typescript
error.value = handleAuthError(result.error)
```

6. **Используйте гибкую авторизацию:**

- Показывайте поле пароля сразу, если провайдер Password включен
- Предоставьте пользователю выбор: войти по паролю или получить код
- Для входа по коду: Шаг 1 (ввод телефона/email) → Шаг 2 (ввод кода подтверждения)

❌ **DON'T (Не делайте):**

1. **Не используйте стандартный редирект:**

```typescript
❌ return ctx.redirect('/login')  // Не работает!
✅ return <html><meta http-equiv="refresh" content="0; url=/login" /></html>
```

2. **Не забывайте нормализовать телефон:**

```typescript
❌ fetch('/s/auth/sms/send', { body: JSON.stringify({ phone: '+7 999 123-45-67' }) })
✅ const normalized = phone.replace(/[^0-9]/g, '')
```

3. **Не храните пароли в открытом виде:**

```typescript
✅ const hash = await getPasswordHashWithSalt(ctx, type, identifier, password)
```

### Отладка провайдеров

**Временно добавьте в компонент:**

```vue
<script setup>
// Отладка провайдеров
console.log('Доступные провайдеры:', Object.keys(props.providers))
console.log('Все провайдеры:', props.providers)
</script>
```

**Проверьте в консоли браузера (F12)** какие провайдеры доступны.

**Типичные ключи:**

- `Sms` - SMS авторизация
- `Email` - Email авторизация
- `Password` - Авторизация по паролю
- `telegram-auth` - Telegram через Sender
- `sso-auth` - SSO авторизация
- `user-notifier-token-auth` - Token авторизация

---

## Связанные документы

- **002-routing.md** — Использование авторизации в роутах
- **007-vue.md** — Доступ к ctx.user в Vue компонентах
- **008-heap.md** — Хранение дополнительных данных пользователей

---

**Версия**: 2.1  
**Дата**: 2025-11-02  
**Последнее обновление**: 2025-11-11 - Обновлена структура формы логина: поле пароля отображается сразу под полем ввода email/телефона, обновлен порядок элементов (Войти → или → Отправить код → или → Telegram)

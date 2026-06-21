---
name: chatium-auth
description: Настраивает авторизацию в Chatium — requireRealUser, requireAccountRole, проверка прав доступа, Telegram OAuth. Использовать при добавлении защищённых страниц и API.
---

## Когда использовать

- При добавлении API или страниц с персональными или чувствительными данными
- При разграничении доступа (пользователь / админ / аноним)
- При интеграции входа через Telegram или другие провайдеры

## Методы авторизации (@app/auth)

- **requireRealUser(ctx)** — требует авторизованного пользователя (не анонима). Бросает, если пользователь не авторизован.
- **requireAnyUser(ctx)** — любой пользователь (включая анонимного). Используется, когда нужен контекст пользователя, но вход не обязателен.
- **requireAccountRole(ctx, 'Admin')** — требует указанную роль в аккаунте. Используется для админских эндпоинтов и страниц.

## Telegram OAuth

- **getTelegramOauthUrl(ctx, { back })** из `@users/sdk/auth` — получение URL для редиректа на авторизацию через Telegram.
- Обработка callback после OAuth (сохранение сессии, редирект на `back`).

## Паттерны

- **API с данными:** каждый API-роут, возвращающий персональные или чувствительные данные, должен вызывать `requireRealUser(ctx)` (или другой подходящий метод) в начале обработчика.
- **Админские страницы и API:** использовать `requireAccountRole(ctx, 'Admin')` для доступа только администраторов.
- **Публичные лендинги:** без вызова require-методов; доступ без авторизации.
- **Проверка владельца:** при изменении/удалении сущности проверять, что `user.id === item.ownerId` (или аналог), чтобы исключить доступ к чужим данным.

## Чеклист

- [ ] Для защищённого API/страницы выбран подходящий метод: requireRealUser / requireAnyUser / requireAccountRole
- [ ] Ошибки авторизации обрабатываются (не приводят к утечке данных)
- [ ] Владелец данных проверяется при операциях изменения/удаления
- [ ] При использовании Telegram OAuth: callback обработан, сессия сохранена

## Ссылки

- **003-auth.md** — полный гайд по авторизации на платформе Chatium (методы, примеры, кастомные формы входа)

## Примеры кода

### Защита API для авторизованных пользователей

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

### Защита API для администраторов

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

### Защита страницы профиля

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

### Работа с ctx.user

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

## Объект ctx.user — основные свойства

```typescript
ctx.user.id                    // ID пользователя
ctx.user.displayName          // Отображаемое имя
ctx.user.firstName            // Имя
ctx.user.lastName             // Фамилия
ctx.user.confirmedPhone       // Подтвержденный телефон
ctx.user.confirmedEmail       // Подтвержденный email
ctx.user.accountRole          // 'Admin' | 'Staff' | 'User'
ctx.user.type                 // 'Real' | 'Bot' | 'Anonymous'
ctx.user.imageUrl             // URL аватара

// Методы
ctx.user.is('Admin')          // Проверка роли (иерархическая)
ctx.user.is('Staff')          // true если Staff или Admin
ctx.user.is('User')           // true если User, Staff или Admin
```

## Важные правила

✅ **Делайте:**

- Используйте `requireAccountRole(ctx, 'Admin')` для админских эндпоинтов
- Используйте `requireRealUser(ctx)` для операций от имени пользователя
- Проверяйте владельца данных: `ctx.user.id === item.ownerId`
- Логируйте через `ctx.account.log()`, не `console.log()`

❌ **Не делайте:**

- Не используйте ручную проверку вместо `require*` методов
- Не пропускайте проверку доступа к персональным данным
- Не выполняйте операции изменения/удаления без проверки владельца

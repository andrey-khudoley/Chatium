@chatium

# Модуль @app/users и граница с @app/auth

Краткий справочник по модулю `@app/users` и разграничению с `@app/auth`. Оба модуля работают с пользователями; основная точка входа — **@app/auth**. Типизации: `node_modules/@app/users/index.d.ts`, `node_modules/@app/auth/index.d.ts`.

## Содержание

- [Граница @app/auth и @app/users](#граница-appauth-и-appusers)
- [@app/auth — что использовать](#appauth--что-использовать)
- [@app/users — что осталось](#appusers--что-осталось)
- [Связанные документы](#связанные-документы)

---

## Граница @app/auth и @app/users

| Задача                                                 | Модуль     | Функция / примечание                                                                                 |
| ------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| Проверка прав, текущий пользователь                    | @app/auth  | requireAnyUser, requireRealUser, requireAccountRole, ctx.user                                        |
| Поиск пользователя по id                               | @app/auth  | findUserById, findUsersByIds, getUserById (возвращают UgcSmartUser)                                  |
| Создание пользователя                                  | @app/auth  | createRealUser, createOrUpdateBotUser                                                                |
| Идентичности (email, phone, Telegram)                  | @app/auth  | findIdentities, createUnconfirmedIdentity, makeIdentityPrimary, deleteIdentity, normalizeIdentityKey |
| Middleware для роутов                                  | @app/auth  | provideUser, checkFilePermissions                                                                    |
| Обновление профиля (имя, фамилия, аватар)              | @app/users | updateUser (пока не перенесён в auth)                                                                |
| getOrCreate по email/phone, findUserById (UgcCtxUser1) | @app/users | **@deprecated** — использовать соответствующие API из @app/auth                                      |

**Итог:** для проверок, поиска и создания пользователей используйте **@app/auth**. В **@app/users** актуальна только **updateUser** для обновления `firstName`, `lastName`, `avatar`; остальные функции помечены как deprecated в пользу @app/auth.

---

## @app/auth — что использовать

- **requireAnyUser(ctx)** — гарантирует наличие пользователя (любого, в т.ч. бота).
- **requireRealUser(ctx)** — только реальный пользователь (не бот).
- **requireAccountRole(ctx, role)** — проверка роли аккаунта. Допустимые значения: `'Staff' | 'Admin' | 'Developer' | 'Owner'`. Роли `'User'` **не существует** (см. `003-auth.md`).
- **findUserById(ctx, id)** / **findUsersByIds(ctx, ids)** — поиск по id, возвращают UgcSmartUser.
- **createRealUser(ctx, info?)** / **createOrUpdateBotUser(ctx, ...)** — создание пользователей.
- **updateAccountRole**, **updateUsername** — реэкспорт из UgcSmartUser.

Подробно: [003-auth.md](003-auth.md).

---

## @app/users — что осталось

### updateUser (актуально)

Обновление полей профиля пользователя. Не deprecated.

```ts
import { updateUser } from '@app/users'

await updateUser(ctx, ctx.user, {
  firstName: 'Имя',
  lastName: 'Фамилия',
  avatar: 'hash-or-null'
})
```

**Сигнатура:** `updateUser(ctx, userOrId, updateData)` где `updateData: Partial<Pick<UgcCtxUser1, 'firstName' | 'lastName' | 'avatar'>>`.

### Остальные функции (deprecated)

- getOrCreateUserByEmail, getOrCreateUserByPhone, getOrCreateUserByAuthTypeAndKey
- findUserById, findUsersByIds

В типизациях помечены как `@deprecated all @app/users module functions are deprecated, use @app/auth`. Для поиска и getOrCreate используйте API из @app/auth.

---

## Связанные документы

- [003-auth.md](003-auth.md) — авторизация, роли, requireAccountRole, requireRealUser, provideUser
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/users/index.d.ts`, `node_modules/@app/auth/index.d.ts`

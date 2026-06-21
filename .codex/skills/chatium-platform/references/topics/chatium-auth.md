# chatium-auth

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-auth/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/003-auth.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

# chatium-auth

Настраивает авторизацию в Chatium: requireRealUser, requireAccountRole, Telegram OAuth, проверка прав доступа. Использовать при добавлении защищённых страниц и API.

## Когда использовать

- При добавлении API или страниц с персональными или чувствительными данными
- При разграничении доступа (пользователь / админ / аноним)
- При интеграции входа через Telegram или другие провайдеры

## Методы авторизации (@app/auth)

- **requireRealUser(ctx)** — требует авторизованного пользователя (не анонима). Бросает, если пользователь не авторизован.
- **requireAnyUser(ctx)** — любой пользователь (включая анонимного). Используется, когда нужен контекст пользователя, но вход не обязателен.
- **requireAccountRole(ctx, 'admin')** — требует указанную роль в аккаунте. Используется для админских эндпоинтов и страниц.

## Telegram OAuth

- **getTelegramOauthUrl(ctx, { back })** из `@users/sdk/auth` — получение URL для редиректа на авторизацию через Telegram.
- Обработка callback после OAuth (сохранение сессии, редирект на `back`).

## Паттерны

- **API с данными:** каждый API-роут, возвращающий персональные или чувствительные данные, должен вызывать `requireRealUser(ctx)` (или другой подходящий метод) в начале обработчика.
- **Админские страницы и API:** использовать `requireAccountRole(ctx, 'admin')` для доступа только администраторов.
- **Публичные лендинги:** без вызова require-методов; доступ без авторизации.
- **Проверка владельца:** при изменении/удалении сущности проверять, что `user.id === item.ownerId` (или аналог), чтобы исключить доступ к чужим данным.

## Чеклист

- [ ] Для защищённого API/страницы выбран подходящий метод: requireRealUser / requireAnyUser / requireAccountRole
- [ ] Ошибки авторизации обрабатываются (не приводят к утечке данных)
- [ ] Владелец данных проверяется при операциях изменения/удаления
- [ ] При использовании Telegram OAuth: callback обработан, сессия сохранена

## Ссылки

- **003-auth.md** — полный гайд по авторизации на платформе Chatium

## Примеры

- `inner/samples/new_project/api/auth-telegram.ts` — Telegram OAuth
- `inner/samples/imported/personalizirovannaya-stranitsa-avtorizatsii/` — страница авторизации

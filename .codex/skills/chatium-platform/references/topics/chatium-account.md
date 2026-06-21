# chatium-account

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-account/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/025-app-modules.md; inner/docs/029-account.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-account
description: Модуль @app/account в Chatium — настройки аккаунта, seats, баланс токенов, installApp. Использовать для управления аккаунтом UGC.
---

# chatium-account

API текущего аккаунта UGC: настройки, установка/удаление приложений, места (seats), баланс токенов. Модуль `@app/account`.

## Когда использовать

- Получение и обновление настроек аккаунта
- Установка/удаление приложений по slug
- Управление местами (seats) для пользователей
- Операции с балансом токенов (проверка, списание, начисление, история)

## Основные методы

- **getCurrentAccountSettings(ctx)** — настройки текущего аккаунта (UgcAccount).
- **updateCurrentAccountSettings(ctx, patch)** — обновление настроек.
- **installApp(ctx, appSlug)** / **uninstallApp(ctx, appSlug)** — установка/удаление приложения.
- **listAccountSeats(ctx)** — список мест; **createAccountSeat(ctx, userId)** / **dropAccountSeat(ctx, userId)** — создать/удалить место.
- **getBalance(ctx)** — баланс; **debitBalanceToken** / **creditBalanceToken*** / **transferBalanceTokens** — списание, начисление, перевод; **findBalanceTransactions(ctx)** — история.

## Чеклист

- [ ] Импорт из @app/account
- [ ] Проверка прав при изменении настроек (requireAccountRole и т.п.)
- [ ] Типы по node_modules/@app/account/index.d.ts

## Ссылки на документацию

- **029-account.md** — @app/account, seats, баланс токенов
- **003-auth.md** — роли аккаунта

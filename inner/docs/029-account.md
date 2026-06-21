@chatium

# Модуль @app/account: Аккаунт и настройки

Краткий справочник по модулю `@app/account` — настройки текущего аккаунта, места (seats), баланс токенов и установка приложений. Типизация: `node_modules/@app/account/index.d.ts`.

## Содержание

- [Назначение](#назначение)
- [Настройки аккаунта](#настройки-аккаунта)
- [Приложения](#приложения)
- [Места (seats)](#места-seats)
- [Баланс токенов](#баланс-токенов)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/account** — API для работы с текущим аккаунтом UGC: получение/обновление настроек (UgcAccount), установка/удаление приложений по slug, управление местами (listAccountSeats, createAccountSeat, dropAccountSeat), операции с балансом токенов (getBalance, debit/credit/transfer, findBalanceTransactions).

---

## Настройки аккаунта

- **getCurrentAccountSettings(ctx)** — возвращает настройки текущего аккаунта (`Promise<UgcAccount>`).
- **updateCurrentAccountSettings(ctx, patch)** — обновление настроек аккаунта.

---

## Приложения

- **installApp(ctx, appSlug)** — установить приложение в аккаунт.
- **uninstallApp(ctx, appSlug)** — удалить приложение из аккаунта.

---

## Места (seats)

- **listAccountSeats(ctx)** — список мест аккаунта (`UgcAccountSeat[]`).
- **createAccountSeat(ctx, userId)** — создать место для пользователя.
- **dropAccountSeat(ctx, userId)** — удалить место.

---

## Баланс токенов

- **getBalance(ctx)** — текущий баланс (`GetBalanceResult`).
- **debitBalanceToken** / **debitBalanceTokenRegular** — списание.
- **creditBalanceTokenReferral** / **creditBalanceTokenFree** / **creditBalanceTokenRegular** / **creditBalanceTokenBurnable** — начисление (разные типы).
- **transferBalanceTokens** — перевод между аккаунтами.
- **findBalanceTransactions(ctx)** — история операций по балансу.

---

## Связанные документы

- [003-auth.md](003-auth.md) — роли аккаунта (requireAccountRole)
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/account/index.d.ts`

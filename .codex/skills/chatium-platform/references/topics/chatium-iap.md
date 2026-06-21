# chatium-iap

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-iap/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/037-iap.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-iap
description: In-App Purchases в Chatium — hasPurchasedProduct, getIapExpirationDateByUser, findAllIapsByUser из @app/iap. Использовать для проверки покупок и подписок.
---

# chatium-iap

Покупки внутри приложения (подписки, продукты). Модуль `@app/iap`. Проверка наличия продукта у пользователя, дата истечения подписки, поиск покупок по пользователю или по originalTransactionId.

## Когда использовать

- Проверка, куплен ли продукт (разблокировка контента)
- Проверка срока действия подписки
- Поиск покупок пользователя или по ID транзакции

## API

- **hasPurchasedProduct(ctx, userId?, productId?)** — куплен ли продукт.
- **getIapExpirationDateByUser(ctx, userId?, productId?)** — дата истечения подписки.
- **findAllIapsByUser(ctx, userId?)** — все покупки пользователя.
- **findAllIapsByUserOrSession(ctx, userId?)** — по пользователю или сессии.
- **findIapByOriginalTransactionId(ctx, txnId)** / **findIapsByOriginalTransactionIds(ctx, txnIds)** — по ID транзакции.
- **IapPurchase** (UgcIapPurchase) — тип записи о покупке.

## Чеклист

- [ ] Импорт из @app/iap
- [ ] userId из ctx.user при проверке текущего пользователя
- [ ] Сигнатуры и поля в node_modules/@app/iap/index.d.ts

## Ссылки на документацию

- **037-iap.md** — @app/iap
- **017-payments.md** — платежи, runAttemptPayment, подписки

---
name: chatium-security
description: CSRF в Chatium — generateDynamicCsrfToken, verifyDynamicCsrfToken из @app/security. Использовать для защиты запросов с клиента.
---

# chatium-security

Модуль `@app/security`: генерация и проверка динамических CSRF-токенов. Использовать когда запросы с клиента должны подтверждаться токеном, привязанным к сессии/контексту.

## Когда использовать

- Защита форм и критичных действий от CSRF
- Токен в заголовке или теле запроса при вызовах с клиента

## API

- **generateDynamicCsrfToken(ctx, name, contextPageTokenName)** — сгенерировать CSRF-токен. Возвращает Promise<string>. Параметр `name` — имя токена, `contextPageTokenName` — имя контекстного токена страницы.
- **verifyDynamicCsrfToken(ctx, token, validationProps)** — проверить переданный токен. Возвращает Promise<number>. Параметр `validationProps` имеет тип CsrfTokenValidationProps.
- **CsrfTokenValidationProps** — тип параметров валидации с полями: `name` (string), `referers?` (string[]), `expiresInSeconds?` (number).

Точные сигнатуры: `node_modules/@app/security/index.d.ts`.

## Паттерны

- Выдать токен при отдаче страницы/формы; клиент отправляет токен в запросе; в API вызвать verifyDynamicCsrfToken перед выполнением действия.

## Чеклист

- [ ] Импорт из @app/security
- [ ] Генерация токена при выдаче формы/страницы
- [ ] Проверка токена в API перед изменяющими операциями

## Ссылки на документацию

- **031-security.md** — @app/security, CSRF
- **003-auth.md** — авторизация и безопасность роутов

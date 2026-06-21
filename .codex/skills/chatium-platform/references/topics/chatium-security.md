# chatium-security

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-security/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/031-security.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

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

- **generateDynamicCsrfToken(...)** — сгенерировать CSRF-токен (параметры в index.d.ts).
- **verifyDynamicCsrfToken(...)** — проверить переданный токен.
- **CsrfTokenValidationProps** — тип параметров валидации.

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

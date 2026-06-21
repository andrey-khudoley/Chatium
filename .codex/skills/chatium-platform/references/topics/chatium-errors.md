# chatium-errors

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-errors/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/030-errors.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-errors
description: Типы ошибок в Chatium — NotFoundError, AccessDeniedError, ValidationError, CustomError из @app/errors. Использовать для единообразных ответов API.
---

# chatium-errors

Стандартные классы ошибок Chatium из `@app/errors` для роутов и API: бросать в обработчиках и обрабатывать в error-handler, возвращая нужный HTTP-статус и тело.

## Когда использовать

- Возврат 404 при отсутствии ресурса
- Возврат 403 при отсутствии прав
- Ошибки валидации входящих данных (body, query)
- Кастомные ошибки с кодами и сообщениями

## Классы

- **NotFoundError** — ресурс не найден (404).
- **AccessDeniedError** — доступ запрещён (403); также экспортируется из @app/auth.
- **ValidationError** — ошибка валидации (детали по полям).
- **CustomError** — произвольная ошибка (наследует Error, не ChatiumError).

Использование: `throw new NotFoundError()`, `throw new ValidationError({ field: 'message' })` и т.д.; в catch или едином error-handler — маппинг в HTTP-статус и JSON.

## Чеклист

- [ ] Импорт из @app/errors (или AccessDeniedError из @app/auth при необходимости)
- [ ] Выброс подходящего класса при ошибке
- [ ] Обработка в роутах/error-handler с соответствующим статусом

## Ссылки на документацию

- **030-errors.md** — @app/errors, классы ошибок
- **002-routing.md** — форматирование ответов и ошибок

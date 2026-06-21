# chatium-isolated-eval

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-isolated-eval/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/046-isolated-eval.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-isolated-eval
description: Модуль @app/isolated-eval в Chatium — isolatedEval для безопасного выполнения кода в изоляции. Использовать с осторожностью для конфигурируемого кода.
---

# chatium-isolated-eval

Выполнение кода (строка + аргументы) в изолированном окружении. Модуль `@app/isolated-eval`. Используется для интерпретации пользовательского или конфигурируемого кода без доступа к полному контексту приложения.

## Когда использовать

- Выполнение конфигурируемых выражений или скриптов в контролируемой среде
- Не подходит для непроверенного пользовательского ввода без ограничений — изоляция снижает риски, но не заменяет валидацию и санитизацию

## API

- **isolatedEval(ctx, code, args)** — выполнить код в изолированном окружении. Параметры: RichUgcCtx, строка кода, массив аргументов. Возвращает Promise с результатом.

Точная семантика изоляции и доступные глобалы — в документации платформы и index.d.ts.

## Чеклист

- [ ] Импорт isolatedEval из @app/isolated-eval
- [ ] Ограничение источника code (не сырой пользовательский ввод без санитизации)
- [ ] Обработка ошибок и таймаутов при выполнении

## Ссылки на документацию

- **046-isolated-eval.md** — @app/isolated-eval
- **032-ugc.md** — UGC-контекст

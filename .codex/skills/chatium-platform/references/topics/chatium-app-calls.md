# chatium-app-calls

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-app-calls/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/025-app-modules.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-app-calls
description: Вызовы между приложениями в Chatium — runAppFunction, runInterAppCall из @app/app. Использовать для межприложенных и внутренних вызовов по пути.
---

# chatium-app-calls

Вызов функций приложения по пути: в текущем аккаунте или в другом приложении (target). Модуль `@app/app`. Используется для межсервисных вызовов и вызова джобов/роутов по строковому пути.

## Когда использовать

- Вызов функции/джоба другого приложения по пути
- Вызов в текущем аккаунте по пути (runAppFunctionInCurrentAccount)
- Межприложенные вызовы (runInterAppCall, runInterAppCallToCurrentAccount)

## API

- **runAppFunction(ctx, targetApp, path)** / **runAppFunction(ctx, targetApp, path, params)** — выполнить функцию приложения по пути.
- **runInterAppCall(ctx, targetApp, path)** / **runInterAppCall(ctx, targetApp, path, params)** — межприложенный вызов.
- **runAppFunctionInCurrentAccount(ctx, path)** / **runAppFunctionInCurrentAccount(ctx, path, params)** — вызов в текущем аккаунте.
- **runInterAppCallToCurrentAccount(ctx, path)** / **runInterAppCallToCurrentAccount(ctx, path, params)** — межприложенный вызов в текущий аккаунт.
- **InternalCallTargetCurrentAccount** ('CurrentAccount') — константа цели вызова.

## Чеклист

- [ ] Импорт из @app/app
- [ ] targetApp и path по контракту целевого приложения
- [ ] Типы InternalCallTarget в index.d.ts

## Ссылки на документацию

- **033-app.md** — @app/app, вызовы по пути
- **005-jobs.md** — джобы приложения

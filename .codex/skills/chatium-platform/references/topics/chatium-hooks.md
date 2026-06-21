# chatium-hooks

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-hooks/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/034-hooks.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-hooks
description: Модуль @app/hooks в Chatium — runHook, execHook, выполнение кастомных хуков по имени. Использовать для вызова зарегистрированных хуков из кода.
---

# chatium-hooks

Запуск хуков по имени: `runHook`, `execHook`. Модуль `@app/hooks`. Хуки регистрируются в приложении и вызываются платформой или кодом по строковому имени с параметрами.

## Когда использовать

- Вызов кастомного хука по имени из роута, джоба или другого хука
- Получение результата одного обработчика (execHook) или всех (runHook)
- Интеграция с Feed (getInboxInfo и др. — отдельные контракты)

## API

- **runHook(ctx, hookName, params)** — выполнить хук, вернуть массив результатов (Promise<Array<T>>).
- **execHook(ctx, hookName, params)** — выполнить хук, вернуть один результат в формате ExecHookResult.
- **isExecHookResultSuccess(result)** / **isExecHookResultFailure(result)** — проверка результата execHook.
- **CustomHookRegistration<Params, Result>** — тип регистрации хука.
- **ExecHookResult**, **ExecHookResultSuccess**, **ExecHookResultFailure** — типы результата.
- **alwaysNoopHookResult** — символ для «пустого» результата.

## Чеклист

- [ ] Импорт runHook/execHook из @app/hooks
- [ ] Имя хука и параметры по контракту зарегистрированного хука
- [ ] Обработка ExecHookResult при использовании execHook

## Ссылки на документацию

- **034-hooks.md** — @app/hooks, runHook, execHook
- **019-feed.md** — FeedHooks (getInboxInfo, getParticipantInboxInfo)

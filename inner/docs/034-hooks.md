@chatium

# Модуль @app/hooks: Хуки и их выполнение

Краткий справочник по модулю `@app/hooks` — регистрация и выполнение кастомных хуков по имени. Типизация: `node_modules/@app/hooks/index.d.ts`.

## Содержание

- [Назначение](#назначение)
- [Экспорты](#экспорты)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/hooks** предоставляет API для запуска хуков по имени (`runHook`, `execHook`) и типы результата выполнения (успех/ошибка). Хуки могут быть зарегистрированы в приложении и вызываться платформой или кодом по строковому имени с параметрами.

---

## Экспорты

- **CustomHookRegistration<Params, Result>** — тип регистрации хука с параметрами и результатом.
- **runHook(ctx, hookName, params)** — выполнить хук, вернуть массив результатов (Promise<Array<T>>).
- **execHook(ctx, hookName, params)** — выполнить хук, вернуть один результат в формате ExecHookResult.
- **isExecHookResultSuccess(result)** / **isExecHookResultFailure(result)** — проверка результата execHook.
- **ExecHookResult<R>**, **ExecHookResultSuccess<R>**, **ExecHookResultFailure** — типы результата.
- **ExecHookHandlerInfo** — информация об обработчике хука.
- **alwaysNoopHookResult** — символ для «пустого» результата хука.

---

## Связанные документы

- [019-feed.md](019-feed.md) — FeedHooks (getInboxInfo, getParticipantInboxInfo)
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/hooks/index.d.ts`

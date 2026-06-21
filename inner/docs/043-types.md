@chatium

# Модуль @app/types: Общие типы платформы

Краткий справочник по модулю `@app/types` — общие типы UGC: роуты, контекст, запросы, JSX. Типизация: `node_modules/@app/types/index.d.ts`.

## Содержание

- [Назначение](#назначение)
- [Основные экспорты](#основные-экспорты)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/types** — централизованные типы платформы Chatium: ссылки на роуты (FunctionRouteRef, GetFunctionRouteRefBody/Result), разобранный запрос (UgcRouteParsedRequest), определение контекста (RichUgcCtxDef), пропсы блоков (SmartTextProps, SmartImageProps), UGC-элементы (UGCIntrinsicElements), функция jsx и namespace jsx, RouteApi, app namespace и др. Используются в роутах, middleware и типизации API.

---

## Основные экспорты

- **FunctionRouteRef<B, R>**, **GetFunctionRouteRefBody**, **GetFunctionRouteRefResult** — типы для типизированных вызовов роутов.
- **UgcRouteParsedRequest<Body, PathParams, Query>** — запрос с разобранными body/path/query.
- **RichUgcCtxDef** — класс/тип контекста UGC.
- **SmartTextProps**, **SmartImageProps**, **UGCIntrinsicElements** — пропсы блоков и элементы.
- **jsx(block, props?, ...children)** и **jsx** namespace — построение JSX-узлов.
- **AppFunctionCallerInfo** — информация о вызывающем приложении.
- **RouteApi<B, P, Q>** — типизированный API роута.
- **app** — namespace с типами приложения.

---

## Связанные документы

- [002-routing.md](002-routing.md) — роутинг
- [035-html-jsx.md](035-html-jsx.md) — jsx
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/types/index.d.ts`

@chatium

# Модуль @app/solid-js: Реактивная библиотека Solid

Краткий справочник по модулю `@app/solid-js` — реактивный рантайм Solid (сигналы, эффекты, мемо, ресурсы, JSX, контекст). Типизация: `node_modules/@app/solid-js/index.d.ts`. Используется платформой для части UI и компонентов; в прикладном коде чаще встречаются Vue и @app/html-jsx.

## Содержание

- [Назначение](#назначение)
- [Основные экспорты](#основные-экспорты)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/solid-js** — обёртка/реэкспорт библиотеки Solid.js: реактивные примитивы (createSignal, createMemo, createEffect, createResource), компоненты (For, Show, Switch, Match, Suspense, ErrorBoundary), JSX-типы, createRoot, createContext/useContext, lifecycle (onMount, onCleanup). Применяется в рендере платформы и в компонентах, построенных на Solid (в т.ч. через @app/html-jsx — SolidComponent).

---

## Основные экспорты

- **createSignal**, **createMemo**, **createEffect**, **createRenderEffect**, **createResource** — реактивные примитивы.
- **createRoot**, **children**, **createComponent** — корень и компоненты.
- **For**, **Index**, **Show**, **Switch**, **Match**, **Suspense**, **ErrorBoundary** — контроль потока и асинхронность.
- **createContext**, **useContext** — контекст.
- **JSX** — namespace с типами элементов и компонентов.
- **Accessor<T>**, **Setter<T>**, **Signal<T>** — типы.
- **requestCallback**, **cancelCallback** — планировщик.

Полный список см. в `node_modules/@app/solid-js/index.d.ts`.

---

## Связанные документы

- [035-html-jsx.md](035-html-jsx.md) — SolidComponent в html-jsx
- [007-vue.md](007-vue.md) — Vue как основной способ UI в приложениях
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/solid-js/index.d.ts`

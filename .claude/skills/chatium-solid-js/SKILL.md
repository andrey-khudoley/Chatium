---
name: chatium-solid-js
description: Модуль @app/solid-js в Chatium — Solid.js, createSignal, createEffect, JSX. Использовать при компонентах на Solid (в т.ч. через html-jsx).
---

# chatium-solid-js

Реактивный рантайм Solid.js в Chatium. Модуль `@app/solid-js`. Используется платформой для части UI; в прикладном коде чаще Vue и @app/html-jsx. Применяется в компонентах на Solid (SolidComponent в html-jsx).

## Когда использовать

- Компоненты на Solid вместо Vue (по выбору архитектуры)
- Реактивные примитивы (сигналы, эффекты, мемо, ресурсы)
- JSX и контроль потока (For, Show, Switch, Match, Suspense, ErrorBoundary)
- Контекст (createContext, useContext) и жизненный цикл (onMount, onCleanup)

## Основные экспорты

- **createSignal**, **createMemo**, **createEffect**, **createRenderEffect**, **createResource** — реактивные примитивы.
- **createRoot**, **children**, **createComponent** — корень и компоненты.
- **For**, **Index**, **Show**, **Switch**, **Match**, **Suspense**, **ErrorBoundary** — контроль потока и асинхронность.
- **createContext**, **useContext** — контекст.
- **JSX** — namespace с типами элементов и компонентов.
- **Accessor<T>**, **Setter<T>**, **Signal<T>** — типы.
- **requestCallback**, **cancelCallback** — планировщик.

## Чеклист

- [ ] Импорт из `@app/solid-js`
- [ ] При использовании с html-jsx — `SolidComponent`, `createClientInitializer` (035-html-jsx.md)
- [ ] Полный список экспортов в `node_modules/@app/solid-js/index.d.ts`

## Ссылки на документацию

- **042-solid-js.md** — @app/solid-js
- **035-html-jsx.md** — SolidComponent в html-jsx
- **007-vue.md** — Vue как основной UI

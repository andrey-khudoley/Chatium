@chatium

# Модуль @app/responsive: Адаптивное состояние

Краткий справочник по модулю `@app/responsive` — определение состояния экрана (breakpoints) для адаптивной вёрстки. Типизация: `node_modules/@app/responsive/index.d.ts`.

## Содержание

- [Назначение](#назначение)
- [Экспорты](#экспорты)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/responsive** — получение текущего состояния «responsive» по контексту (ширина/тип устройства, breakpoints). Функция responsiveState возвращает объект ResponsiveState, по которому можно выбирать раскладку или компоненты в зависимости от экрана.

---

## Экспорты

- **responsiveState(ctx, options?)** — возвращает ResponsiveState для текущего контекста (например, данные об ширине, isMobile и т.п.). Опции: ResponsiveStateOptions.

Точные поля ResponsiveState и ResponsiveStateOptions см. в `node_modules/@app/responsive/index.d.ts`.

---

## Связанные документы

- [007-vue.md](007-vue.md) — Vue и адаптивная вёрстка
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/responsive/index.d.ts`

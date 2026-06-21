@chatium

# Модуль @app/form-storage: Хранилище форм

Краткий справочник по модулю `@app/form-storage` — ключ-значение и множества (set) для данных форм в UGC. Типизация: `node_modules/@app/form-storage/index.d.ts`.

## Содержание

- [Назначение](#назначение)
- [Экспорты](#экспорты)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/form-storage** — простое хранилище для данных форм: запись/чтение по ключу (setItem, getItem, removeItem) и операции над множествами строк (addToSet, removeFromSet, listSet). Значения ограничены типом UgcFormStorageAvailableValueType. Подходит для черновиков, временных данных формы, списков выбранных элементов.

---

## Экспорты

- **setItem(key, value)** — записать значение по ключу (Promise<void>).
- **getItem(key)** — прочитать значение (Promise<...>).
- **removeItem(key)** — удалить по ключу (Promise<void>).
- **addToSet(key, member)** — добавить элемент в множество по ключу (Promise<number>).
- **removeFromSet(key, member)** — удалить элемент из множества (Promise<number>).
- **listSet(key)** — получить все элементы множества (Promise<string[]>).
- **formStorage** — объект с методами хранилища (то же API в виде объекта).

---

## Связанные документы

- [013-config.md](013-config.md) — конфигурация и хранение настроек
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/form-storage/index.d.ts`

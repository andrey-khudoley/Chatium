---
name: chatium-form-storage
description: Модуль @app/form-storage в Chatium — setItem, getItem, addToSet, listSet. Использовать для черновиков и временных данных форм.
---

# chatium-form-storage

Простое хранилище для данных форм: ключ-значение и множества (set). Модуль `@app/form-storage`. Значения ограничены типом UgcFormStorageAvailableValueType. Подходит для черновиков, временных данных формы, списков выбранных элементов.

## Когда использовать

- Сохранение черновика формы
- Временные данные формы (до отправки)
- Списки выбранных элементов по ключу (множества)

## API

- **setItem(key, value)** — записать значение (Promise<void>).
- **getItem(key)** — прочитать значение (Promise<...>).
- **removeItem(key)** — удалить по ключу (Promise<void>).
- **addToSet(key, member)** — добавить элемент в множество (Promise<number>).
- **removeFromSet(key, member)** — удалить из множества (Promise<number>).
- **listSet(key)** — все элементы множества (Promise<string[]>).
- **formStorage** — объект с теми же методами.

## Чеклист

- [ ] Импорт из @app/form-storage
- [ ] Ключи осмысленные (например, userId + formId для черновика)
- [ ] Типы значений по index.d.ts (UgcFormStorageAvailableValueType)

## Ссылки на документацию

- **036-form-storage.md** — @app/form-storage
- **013-config.md** — конфигурация (другой слой хранения)

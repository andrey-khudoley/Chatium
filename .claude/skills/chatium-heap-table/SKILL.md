---
name: chatium-heap-table
description: Создаёт Heap-таблицу в Chatium — определение в tables/, типизация, CRUD-операции, фильтрация, Money, RefLink. Использовать при добавлении новых сущностей данных.
---

# chatium-heap-table

Создаёт Heap-таблицу в Chatium: определение в `tables/`, типизация, CRUD-операции, фильтрация, Money, RefLink. Использовать при добавлении новых сущностей данных.

## Шаблон таблицы

При необходимости импортировать Heap: `import { Heap } from '@app/heap'` (в образцах: `inner/samples/new_project/tables/`, `tg/pa_sample/tables/`).

```ts
export const MyTable = Heap.Table('t__myapp__mytable__uniqueid', {
  title: Heap.String({ customMeta: { title: 'Название' } }),
  count: Heap.Number({ customMeta: { title: 'Количество' } }),
  active: Heap.Boolean({ customMeta: { title: 'Активно' } }),
  settings: Heap.Any({ customMeta: { title: 'Настройки' } }),
  createdAt: Heap.DateTime({ customMeta: { title: 'Дата создания' } }),
  optionalField: Heap.Optional(Heap.String({ customMeta: { title: 'Опц. поле' } })),
})
```

## CRUD-паттерны

- `MyTable.create(ctx, { ... })` — создание
- `MyTable.findAll(ctx, { where: { active: true }, order: [{ createdAt: 'desc' }] })` — выборка
- `MyTable.findById(ctx, id)` — по ID
- `MyTable.findOneBy(ctx, { key: value })` — поиск одной записи
- `MyTable.update(ctx, { id, ...fields })` — обновление (один объект с id внутри!)
- `MyTable.delete(ctx, id)` — удаление
- `MyTable.countBy(ctx, { where: { ... } })` — подсчёт (НЕ `findAll().length`!)
- `MyTable.createOrUpdateBy(ctx, ['key'], { ... })` — upsert

## Антипаттерны

- **НЕ** использовать `findAll().length` — только `countBy`
- **НЕ** использовать `filter` вместо `where`
- **НЕ** использовать арифметику с Money (только `.add()`, `.subtract()` и т.д.)
- **НЕ** импортировать таблицы в Vue-компонентах
- **НЕ** вызывать `update(ctx, id, data)` с тремя аргументами — правильно: `update(ctx, { id, ...data })`
- Использовать `runWithExclusiveLock` при race conditions

## Чеклист

- [ ] Файл в `tables/*.table.ts`
- [ ] Уникальный ID таблицы (`t__app__name__hash`)
- [ ] `customMeta.title` для каждого поля
- [ ] Импорт таблицы без расширения `.ts`
- [ ] CRUD только на сервере (никогда в Vue компонентах)
- [ ] `update()` вызывается с одним объектом, содержащим `id`

## Ссылки

- **008-heap.md** — Heap, типы, API, CRUD, Money, RefLink, race conditions
- **028-sync.md** — `runWithExclusiveLock` для синхронизации

## Примеры

- `inner/samples/new_project/tables/`
- `tg/pa_sample/tables/Chats.table.ts`

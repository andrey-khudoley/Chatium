# chatium-heap-table

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-heap-table/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/008-heap.md; inner/docs/022-getcourse-heap.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

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
- `MyTable.update(ctx, { id, ... })` — обновление
- `MyTable.delete(ctx, id)` — удаление
- `MyTable.countBy(ctx, { active: true })` — подсчёт (НЕ `findAll().length`!)
- `MyTable.createOrUpdateBy(ctx, 'key', { key, ... })` — upsert

## Антипаттерны

- **НЕ** использовать `findAll().length` — только `countBy`
- **НЕ** использовать `filter` вместо `where`
- **НЕ** вызывать `update(ctx, id, data)` — Heap `update` принимает `ctx` и один объект `{ id, ...data }`
- **НЕ** передавать `{ where: ... }` в `countBy` — фильтр передаётся напрямую
- **НЕ** использовать арифметику с Money (только `.add()`, `.subtract()` и т.д.)
- **НЕ** импортировать таблицы в Vue-компонентах
- Использовать `runWithExclusiveLock` при race conditions

## Чеклист

- [ ] Файл в `tables/*.table.ts`
- [ ] Уникальный ID таблицы (`t__app__name__hash`)
- [ ] `customMeta.title` для каждого поля
- [ ] Импорт без расширения `.ts`
- [ ] CRUD только на сервере

## Ссылки

- **008-heap.md** — Heap, типы, API
- **022-getcourse-heap.md** — TypeScript API
- **028-sync.md** — `runWithExclusiveLock`

## Примеры

- `inner/samples/new_project/tables/`
- `tg/pa_sample/tables/Chats.table.ts`

# Данные · lp

## Heap-таблица `Leads`

Файл: `tables/leads.table.ts`.

Идентификатор: `t__chatiumclub-lp__lead__7Mq3Xp` (уникален в рамках Chatium).

### Поля

| Поле               | Тип           | Описание                                                                                                                     |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `phone`            | `Heap.String` | Телефон, как ввёл пользователь (после `trim`).                                                                               |
| `telegramUsername` | `Heap.String` | Telegram username без ведущего `@`.                                                                                          |
| `integrationNotes` | `Heap.String` | Многострочное описание «Что хотите интегрировать?».                                                                          |
| `submittedAt`      | `Heap.Number` | Время отправки заявки в Unix ms (`Date.now()`). Имя `createdAt` зарезервировано Heap, поэтому используется собственное поле. |

`phone`, `telegramUsername`, `integrationNotes` имеют `searchable` (langs `ru/en`,
без эмбеддингов) — позволяет позже включить поиск по заявкам без миграции.

### CRUD

- **Запись**: `Leads.create(ctx, { phone, telegramUsername, integrationNotes, submittedAt })` — только в `api/submit.ts`.
- **Чтение**: на текущем этапе административный UI отсутствует; чтение
  планируется через `Leads.findAll(ctx, { order: [{ submittedAt: 'desc' }] })` или
  `Leads.countBy(ctx, { ... })` (антипаттерн `findAll().length` — не использовать).

### Антипаттерны

- Не импортировать `tables/leads.table.ts` в Vue (`pages/`, `components/`) —
  только в серверных файлах (`api/`, `lib/`, `index.tsx`).
- Для подсчёта использовать `Leads.countBy`, не `findAll().length`.
- При параллельных операциях (если появятся) — `runWithExclusiveLock` из
  `@app/sync` (см. правило `chatium-constraints`).

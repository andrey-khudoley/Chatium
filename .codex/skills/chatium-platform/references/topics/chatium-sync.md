# chatium-sync

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-sync/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/028-sync.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-sync
description: Эксклюзивные блокировки в Chatium — runWithExclusiveLock, tryRunWithExclusiveLock из @app/sync. Использовать для предотвращения race condition при параллельных операциях.
---

# chatium-sync

Модуль `@app/sync`: эксклюзивная блокировка по ключу (lockId). Только один вызов с данным ключом выполняется в момент времени; остальные ждут или получают таймаут. Применять при операциях «найти/создать» или «прочитать-изменить-записать» в Heap, чтобы избежать дубликатов и гонок.

## Когда использовать

- Создание уникальной записи по ключу (findOneBy + create при отсутствии)
- Атомарные операции «прочитать-изменить-записать» при параллельных запросах
- Предотвращение race condition при работе с Heap (см. 008-heap.md)

## runWithExclusiveLock

Выполняет колбэк под блокировкой. При занятой блокировке ждёт до таймаута; при таймауте выбрасывает LockAcquisitionError.

```ts
import { runWithExclusiveLock } from '@app/sync'

const result = await runWithExclusiveLock(ctx, 'resource-id', async (ctx, lockInfo) => {
  const existing = await MyTable.findOneBy(ctx, { key: 'x' })
  if (!existing) await MyTable.create(ctx, { key: 'x', value: 1 })
  return existing ?? MyTable.findOneBy(ctx, { key: 'x' })
})
```

- **lockId** — строка или массив строк (составной ключ).
- Опционально: **timeoutMs**, **maxDurationMs** в options.

## tryRunWithExclusiveLock

Не ждёт: пытается захватить блокировку и выполнить колбэк. Возвращает `{ success: true, result }` или `{ success: false, timeoutMs }`.

```ts
import { tryRunWithExclusiveLock } from '@app/sync'

const res = await tryRunWithExclusiveLock(ctx, 'resource-id', async (ctx) => { ... })
if (res.success) return res.result
```

## LockAcquisitionError

Класс ошибки при таймауте в runWithExclusiveLock. Конструктор: (lockId, timeoutMs).

## Чеклист

- [ ] Импорт runWithExclusiveLock / tryRunWithExclusiveLock из @app/sync
- [ ] lockId однозначно определяет ресурс (id сущности или составной ключ)
- [ ] В колбэке — минимально необходимые операции под блокировкой

## Ссылки на документацию

- **028-sync.md** — @app/sync, runWithExclusiveLock, tryRunWithExclusiveLock
- **008-heap.md** — раздел «Предотвращение race condition»

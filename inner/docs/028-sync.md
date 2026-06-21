@chatium

# Модуль @app/sync: Эксклюзивные блокировки

Краткий справочник по модулю `@app/sync` для синхронизации выполнения кода (эксклюзивная блокировка по ключу). Используется для предотвращения race condition при параллельных запросах. Типизация: `node_modules/@app/sync/index.d.ts`. Подробнее о сценариях с Heap: [008-heap.md](008-heap.md) (раздел «Предотвращение race condition»).

## Содержание

- [Назначение](#назначение)
- [runWithExclusiveLock](#runwithexclusivelock)
- [tryRunWithExclusiveLock](#tryrunwithexclusivelock)
- [LockAcquisitionError](#lockacquisitionerror)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/sync** предоставляет эксклюзивную блокировку по строковому ключу (или массиву ключей): только один вызов с данным `lockId` выполняется в данный момент, остальные ждут освобождения или таймаута. Применяется когда между операциями «найти/создать» или «прочитать-изменить-записать» не должен вклиниваться другой запрос (например, создание дубликата записи в Heap).

---

## runWithExclusiveLock

Выполняет колбэк под эксклюзивной блокировкой. Если блокировка занята — ожидает до таймаута (если передан). При таймауте выбрасывает `LockAcquisitionError`.

```ts
import { runWithExclusiveLock } from '@app/sync'

const result = await runWithExclusiveLock(ctx, 'my-resource-id', async (ctx, lockInfo) => {
  // lockInfo.wasWaiting — ждали ли освобождения блокировки
  const existing = await repo.findOneBy({ key: 'x' })
  if (!existing) await repo.create({ key: 'x', value: 1 })
  return existing ?? (await repo.findOneBy({ key: 'x' }))
})
```

**Сигнатуры:**

- `runWithExclusiveLock(ctx, lockId, fn): Promise<T>`
- `runWithExclusiveLock(ctx, lockId, timeoutMs, fn): Promise<T>`
- `runWithExclusiveLock(ctx, lockId, options: UgcSyncLockOptions, fn): Promise<T>`

`lockId` — строка или массив строк (составной ключ). В опциях: `timeoutMs`, `maxDurationMs`.

---

## tryRunWithExclusiveLock

Не ждёт освобождения блокировки: пытается захватить и выполнить колбэк. Возвращает `{ success: true, result }` или `{ success: false, timeoutMs }` (без выброса).

```ts
import { tryRunWithExclusiveLock } from '@app/sync'

const res = await tryRunWithExclusiveLock(ctx, 'resource-id', async (ctx) => { ... })
if (res.success) return res.result
```

---

## LockAcquisitionError

Класс ошибки при таймауте захвата блокировки в `runWithExclusiveLock`. Конструктор: `(lockId: string | string[], timeoutMs: number)`.

---

## Связанные документы

- [008-heap.md](008-heap.md) — race condition, примеры с runWithExclusiveLock
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/sync/index.d.ts`

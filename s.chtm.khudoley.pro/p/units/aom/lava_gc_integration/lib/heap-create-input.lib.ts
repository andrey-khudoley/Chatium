/**
 * Служебные поля строки Heap — не задаются при Table.create().
 * См. inner/docs/008-heap.md (зарезервированные имена).
 */
export type HeapSystemRowKeys =
  | 'id'
  | 'heapType'
  | 'createdAt'
  | 'updatedAt'
  | 'createdBy'
  | 'updatedBy'

/** Только пользовательские колонки схемы для `Table.create()` (без служебных полей Heap). */
export type HeapCreateInput<Row> = Omit<Row, HeapSystemRowKeys>

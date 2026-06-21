/**
 * Пагинация Heap-выборок.
 *
 * `Heap.findAll` отдаёт максимум 1000 строк за вызов (по умолчанию limit = 1000,
 * максимум 1000 — см. inner/docs/008-heap.md). Без явной пагинации список из >1000
 * записей тихо усекается. Этот хелпер листает выборку страницами через offset и
 * собирает все строки.
 *
 * Принимает замыкание `fetchPage(limit, offset)` над конкретным типизированным
 * `Table.findAll`, поэтому строгие типы where/order сохраняются у вызывающего, а
 * сам хелпер остаётся обобщённым (T выводится автоматически).
 */

/** Размер страницы Heap (= максимум строк за один findAll). */
export const HEAP_PAGE_SIZE = 1000

/**
 * Собирает все строки выборки, листая через offset страницами по `pageSize`.
 * Останавливается, когда очередная страница меньше `pageSize` (записи кончились).
 */
export async function collectAllPaged<T>(
  fetchPage: (limit: number, offset: number) => Promise<T[]>,
  pageSize: number = HEAP_PAGE_SIZE
): Promise<T[]> {
  const all: T[] = []
  let offset = 0
  for (;;) {
    const page = await fetchPage(pageSize, offset)
    all.push(...page)
    if (page.length < pageSize) break
    offset += page.length
  }
  return all
}

/**
 * Собирает до `requestedLimit` строк, листая страницами по `pageSize`.
 * Нужно, когда вызывающий хочет конкретное число записей, возможно > 1000
 * (одиночный `findAll` обрезал бы до 1000). Старт с `baseOffset`.
 */
export async function collectLimitedPaged<T>(
  fetchPage: (limit: number, offset: number) => Promise<T[]>,
  requestedLimit: number,
  baseOffset: number = 0,
  pageSize: number = HEAP_PAGE_SIZE
): Promise<T[]> {
  if (requestedLimit <= pageSize) {
    return fetchPage(requestedLimit, baseOffset)
  }
  const all: T[] = []
  let fetched = 0
  while (fetched < requestedLimit) {
    const pageLimit = Math.min(pageSize, requestedLimit - fetched)
    const page = await fetchPage(pageLimit, baseOffset + fetched)
    all.push(...page)
    fetched += page.length
    if (page.length < pageLimit) break
  }
  return all
}

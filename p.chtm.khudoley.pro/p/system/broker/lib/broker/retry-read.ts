/**
 * Retry чтения после updateAll/update — read-back может отставать (ADR-0015).
 * По умолчанию ретраит, пока результат falsy (create читается сразу — не нужен).
 * Параметризуемый предикат isStale — для случаев, когда «устаревшесть» шире
 * простого отсутствия строки (см. ackDeliveryCore/deadDeliveryCore, О6/п.8
 * фикс-раунда 1). Единственная реализация в проекте (п.21 фикс-раунда 1) —
 * pull.ts и lib/tests/helpers.ts делят эту функцию, а не два независимых клона.
 */
export async function retryRead<T>(
  fn: () => Promise<T>,
  opts: { times?: number; isStale?: (result: T) => boolean } = {}
): Promise<T> {
  const times = opts.times ?? 3
  const isStale = opts.isStale ?? ((result: T) => !result)
  let last: T
  for (let i = 0; i < times; i++) {
    last = await fn()
    if (!isStale(last)) return last
  }
  return last!
}

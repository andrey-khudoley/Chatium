/**
 * Серверные типы конфигурации формы (§3.1, §5.1.1 спеки) — переиспользуются
 * между api/admin/create-form.ts и lib/widget/renderWidgetJs.ts. НЕ импортируется
 * из Vue (инвариант «Vue не импортирует lib/») — AdminPage.vue держит свою
 * структурно совместимую копию типа локально.
 */

/** Снимок отображения предложения GC — задаётся автором формы вручную (волна 1, §5.3). */
export type OfferSnapshot = {
  offerId: string
  title: string
  price: string
  currency: string
}

/** Контракт поля appearance откладывается (§3.1, волна 2) — тип any на уровне Heap. */
export type FormAppearance = Record<string, unknown>

import { Heap } from '@app/heap'

/*
  FormsTable — конфигурация форм (§3.1 спеки, ADR-0001). Схема:
  - slug: плоское корневое поле — formID (§5.1), единственный горячий фильтр
    (виджет-роут и эндпоинт отправки находят форму по нему).
  - offers: JSON-массив предложений { offerId, title, price, currency }
    (мультиофферная форма — §5.1.1).
  - appearance: настройки внешнего вида, контракт откладывается (§0.2, волна 2).

  id/createdAt/updatedAt — системные поля Heap, добавляются автоматически,
  в схему НЕ объявляются (008-heap.md, «Ошибка #4»).

  Окружение — в сегменте id (`__stage_` здесь), правило переноса — как у
  settings.table.ts. В отличие от настроек, эта таблица — КОД (не данные
  окружения) в смысле id-сегмента: `/to-prod` транслирует `__stage_` → `__prod_`.
*/
const fields = {
  slug: Heap.String({ customMeta: { title: 'formID (слаг nanoid)' } }),
  offers: Heap.Any({
    customMeta: { title: 'Предложения формы (массив offerId/title/price/currency)' }
  }),
  appearance: Heap.Any({ customMeta: { title: 'Настройки внешнего вида формы (контракт открыт)' } })
}

export const FormsTable = Heap.Table('t__form-gen__forms__stage_2xnqat', fields, {
  customMeta: {
    title: 'form-gen Forms (stage)',
    description: 'Конфигурации форм заказа (волна 1) — §3.1 спеки'
  }
})

export type FormsTableRow = typeof FormsTable.T
export type FormsTableRowJson = typeof FormsTable.JsonT

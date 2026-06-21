/**
 * Таблица методов оплаты страницы оплаты (payment-page dealPay).
 *
 * НОВАЯ таблица (2026-06): заморозка ключей существующих таблиц не действует.
 * Суффикс `k9Xp2mL4` сгенерирован единожды — не менять.
 *
 * Системные записи (isSystem=true) создаются seed'ом (`lib/paymentPage/paymentPageMethodSeed.ts`)
 * при первом запросе. Кастомные записи (isSystem=false) создаются через API (`api/payment-page/method-create`).
 *
 * Не содержит импортов логгеров или shared-модулей — только Heap (предотвращение цикл-деп).
 */

import { Heap } from '@app/heap'

// Rebuild Heap registry after project path migration to p/units/yakovleva/pay.
export const PaymentPageMethods = Heap.Table('t__yakovleva-pay__ppmethod__k9Xp2mL4', {
  /**
   * Бизнес-PK строки: для системных = id метода,
   * для кастомных = id ровно как ввёл оператор (без префикса), редактируем (rename).
   */
  methodKey: Heap.String({
    customMeta: { title: 'Бизнес-ключ метода оплаты' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  /** Тип резолвера в DOM: 'id' — getElementById, 'class' — querySelector('.value') */
  resolverType: Heap.String({
    customMeta: { title: 'Тип резолвера DOM-элемента (id|class)' }
  }),
  /** Значение для резолвера (CSS-токен или id) */
  resolverValue: Heap.String({
    customMeta: { title: 'Значение резолвера (id или CSS-класс)' },
    searchable: { langs: ['en'], embeddings: false }
  }),
  /** Отображаемое название метода */
  name: Heap.String({
    customMeta: { title: 'Название метода' }
  }),
  /** Секция на странице оплаты */
  section: Heap.String({
    customMeta: { title: 'Секция на странице оплаты' }
  }),
  /** Подпись кнопки метода (применяется к label в DOM) */
  label: Heap.String({
    customMeta: { title: 'Подпись кнопки метода' }
  }),
  /**
   * Подпись (описательный текст) под методом на странице оплаты.
   * Optional: новое поле (2026-06-07) — существующие строки его не содержат.
   * Применяется скриптом pp-script-11.js как строка .pp-method-caption внутри карточки.
   */
  caption: Heap.Optional(Heap.String()),
  /** URL изображения метода */
  imageUrl: Heap.String({
    customMeta: { title: 'URL изображения метода' }
  }),
  /** Тип фильтра офферов */
  offerListType: Heap.String({
    customMeta: { title: 'Тип фильтра офферов (off|whitelist|blacklist)' }
  }),
  /** Порядок отображения внутри секции */
  order: Heap.Number({
    customMeta: { title: 'Порядок внутри секции' }
  }),
  /** Минимальная сумма (0 = без ограничений) */
  minAmount: Heap.Number({
    customMeta: { title: 'Минимальная сумма (0 = без ограничений)' }
  }),
  /** Максимальная сумма (0 = без ограничений) */
  maxAmount: Heap.Number({
    customMeta: { title: 'Максимальная сумма (0 = без ограничений)' }
  }),
  /** Флаг включения метода */
  enabled: Heap.Boolean({
    customMeta: { title: 'Метод включён' }
  }),
  /** Скрывать метод, когда страница открыта для частичной оплаты (?paymentValue=...). */
  hideOnPartialPayment: Heap.Optional(
    Heap.Boolean({ customMeta: { title: 'Скрывать при частичной оплате' } })
  ),
  /** Скрывать метод, когда GC-заказ уже частично оплачен ранее и открыта доплата. */
  hideOnTopUpPayment: Heap.Optional(
    Heap.Boolean({ customMeta: { title: 'Скрывать при доплате' } })
  ),
  /** Системный метод (seed): нельзя удалить, можно редактировать */
  isSystem: Heap.Boolean({
    customMeta: { title: 'Системный метод (нельзя удалить)' }
  }),
  /**
   * Список офферов для фильтрации {id, title}.
   * Heap.Optional(Heap.Any()) — синтаксис Array(Object) не поддерживается в текущем SDK.
   */
  offers: Heap.Optional(Heap.Any()),
  /**
   * JS-код обработчика кастомного метода.
   * Optional: новое поле — существующие строки его не содержат.
   */
  customScript: Heap.Optional(
    Heap.String({ customMeta: { title: 'JS-код обработчика кастомного метода' } })
  ),
  /**
   * Пункты radio-меню кастомного метода [{label, value}].
   * Heap.Optional(Heap.Any()) — синтаксис Array(Object) не поддерживается в текущем SDK.
   * Optional: новое поле — существующие строки его не содержат.
   */
  menuItems: Heap.Optional(Heap.Any()),
  /**
   * Режим взаимодействия кастомного метода ('standard' | 'widget').
   * Optional: новое поле; отсутствует у старых строк — режим выводится из наличия меню.
   */
  interactionMode: Heap.Optional(
    Heap.String({ customMeta: { title: 'Режим метода (standard|widget)' } })
  )
})

export default PaymentPageMethods
export type PaymentPageMethodRow = typeof PaymentPageMethods.T

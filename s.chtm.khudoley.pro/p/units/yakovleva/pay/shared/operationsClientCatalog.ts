// @shared
/**
 * Каталог операций Payments Client для UI вкладки «Создать запрос».
 *
 * Это упрощённое представление каталога операций в терминах клиента:
 * перечень полей формы (label, type, hint, defaults), сгруппированный по
 * `gatewayId`. Серверные контракты (валидаторы, дерево args) живут в каждом
 * upstream-гейтвее;
 * клиент знает лишь то, что нужно для построения формы и сборки `args` для
 * `POST /api/gateways/invoke`.
 *
 * Изменение полей upstream-операции требует синхронной правки этой схемы —
 * иначе форма перестанет совпадать с тем, что ждёт серверный gateway.
 */

import type { GatewayId } from './invokeApi'

/** Тип поля формы. Соответствует input[type] или textarea/JSON-редактору. */
export type ClientFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'url'
  | 'tel'
  | 'textarea'
  | 'json'
  | 'select'

/** Источник для авто-предзаполнения поля из SSR-пропсов HomePage. */
export type ClientFieldDefaultSource = 'webhookUrl' | 'webhookUrlLavatop'

export type ClientFieldOption = {
  value: string
  label: string
}

export type ClientFieldDescriptor = {
  /** Имя ключа в `args` запроса (совпадает с upstream-контрактом). */
  name: string
  /** Человеческий label для формы (по умолчанию = name). */
  label?: string
  type: ClientFieldType
  required: boolean
  placeholder?: string
  /** Подсказка под полем. */
  hint?: string
  /** Статическое значение по умолчанию. */
  defaultValue?: string
  /** Динамическое значение по умолчанию: из SSR-пропса HomePage. */
  defaultFromProp?: ClientFieldDefaultSource
  /** Для type: 'number' — минимум/шаг. */
  numberMin?: number
  numberStep?: number
  /** Для type: 'select' — варианты. */
  options?: ClientFieldOption[]
}

export type ClientOperationDescriptor = {
  gatewayId: GatewayId
  op: string
  /** HTTP-метод upstream — справочно (на UI отрисовывается рядом с дропдауном). */
  httpMethod: 'GET' | 'POST'
  /** Короткое имя операции для UI. */
  title: string
  /** Развёрнутое описание (отображается под дропдауном при выборе операции). */
  description: string
  /** Список полей формы (могут быть пустыми — например, listProducts без args). */
  fields: ClientFieldDescriptor[]
  /**
   * После сабмита: гейтвей вернул `data.paymentUrl` → отрисовать QR-код.
   * `paymentUrl` — путь к строке в data. У LifePay.createBill это `paymentUrl`,
   * у Lava.Top.createInvoice это `paymentUrl` тоже (см. поведение gateway).
   * Пустая строка/undefined — QR не рисовать.
   */
  paymentUrlPath?: string
}

const LIFEPAY_OPERATIONS: ClientOperationDescriptor[] = [
  {
    gatewayId: 'lifepay',
    op: 'createBill',
    httpMethod: 'POST',
    title: 'Создать счёт',
    description:
      'Тестовый счёт LifePay (контур bills_v1). После успеха gateway вернёт billNumber и paymentUrl; QR будет построен на клиенте.',
    fields: [
      {
        name: 'orderNumber',
        type: 'text',
        required: true,
        placeholder: 'order-001',
        hint: 'Номер заказа на стороне магазина.'
      },
      {
        name: 'amount',
        label: 'amount (₽)',
        type: 'number',
        required: true,
        numberMin: 0.01,
        numberStep: 0.01,
        defaultValue: '1'
      },
      {
        name: 'customerEmail',
        type: 'email',
        required: true,
        placeholder: 'tester@khudoley.pro'
      },
      {
        name: 'description',
        type: 'text',
        required: true,
        defaultValue: 'Тестовый счёт'
      },
      {
        name: 'callbackUrl',
        type: 'url',
        required: false,
        defaultFromProp: 'webhookUrl',
        placeholder: 'Заполняется сервером',
        hint: 'Сервер подставит webhook LifePay с секретным токеном перед вызовом gateway.'
      },
      {
        name: 'customerPhone',
        type: 'tel',
        required: false,
        placeholder: '7XXXXXXXXXX'
      }
    ],
    paymentUrlPath: 'paymentUrl'
  },
  {
    gatewayId: 'lifepay',
    op: 'getBillStatus',
    httpMethod: 'GET',
    title: 'Статус счёта',
    description: 'Запросить статус ранее созданного счёта по billNumber.',
    fields: [
      {
        name: 'billNumber',
        type: 'text',
        required: true,
        placeholder: 'lifepay-1234567890'
      }
    ]
  },
  {
    gatewayId: 'lifepay',
    op: 'cancelBill',
    httpMethod: 'POST',
    title: 'Отменить счёт',
    description: 'Отменить неоплаченный счёт LifePay по billNumber.',
    fields: [
      {
        name: 'billNumber',
        type: 'text',
        required: true,
        placeholder: 'lifepay-1234567890'
      }
    ]
  }
]

const LAVATOP_OPERATIONS: ClientOperationDescriptor[] = [
  {
    gatewayId: 'lavatop',
    op: 'createInvoice',
    httpMethod: 'POST',
    title: 'Создать инвойс',
    description:
      'Создать инвойс Lava.Top (контур invoices_v1). Поле callbackUrl используется gateway для проксирования вебхука клиенту по contractId; в Lava.Top оно не уходит.',
    fields: [
      {
        name: 'email',
        type: 'email',
        required: true,
        placeholder: 'tester@khudoley.pro'
      },
      {
        name: 'offerId',
        type: 'text',
        required: true,
        placeholder: 'offer-xxxxx',
        hint: 'UUID оффера в Lava.Top.'
      },
      {
        name: 'currency',
        type: 'select',
        required: true,
        defaultValue: 'RUB',
        options: [
          { value: 'RUB', label: 'RUB' },
          { value: 'USD', label: 'USD' },
          { value: 'EUR', label: 'EUR' }
        ]
      },
      {
        name: 'paymentProvider',
        type: 'text',
        required: false,
        placeholder: 'STRIPE / RU_CARD / …'
      },
      {
        name: 'paymentMethod',
        type: 'text',
        required: false
      },
      {
        name: 'buyerLanguage',
        type: 'text',
        required: false,
        placeholder: 'RU / EN / ES'
      },
      {
        name: 'periodicity',
        type: 'text',
        required: false
      },
      {
        name: 'callbackUrl',
        type: 'url',
        required: false,
        defaultFromProp: 'webhookUrlLavatop',
        hint: 'Авто-подставлен из настроек (webhook Lava.Top). В Lava.Top НЕ передаётся.'
      },
      {
        name: 'clientOrderId',
        type: 'text',
        required: false,
        placeholder: 'order-001',
        hint: 'Идентификатор заказа на стороне магазина; gateway сохранит в маппинге.'
      }
    ],
    paymentUrlPath: 'paymentUrl'
  },
  {
    gatewayId: 'lavatop',
    op: 'getInvoiceStatus',
    httpMethod: 'GET',
    title: 'Статус инвойса',
    description: 'Запросить статус инвойса Lava.Top по contractId.',
    fields: [
      {
        name: 'contractId',
        type: 'text',
        required: true,
        placeholder: 'contract-xxxxx'
      }
    ]
  },
  {
    gatewayId: 'lavatop',
    op: 'listProducts',
    httpMethod: 'GET',
    title: 'Список продуктов',
    description: 'Получить список продуктов магазина в Lava.Top.',
    fields: []
  },
  {
    gatewayId: 'lavatop',
    op: 'updateOfferPrice',
    httpMethod: 'POST',
    title: 'Обновить цены оффера',
    description:
      'Обновить цены оффера продукта. Поле offers — JSON-массив объектов { id, prices: [{ amount, currency }], name?, description? }.',
    fields: [
      {
        name: 'productId',
        type: 'text',
        required: true
      },
      {
        name: 'offers',
        type: 'json',
        required: true,
        placeholder:
          '[\n  {\n    "id": "offer-xxx",\n    "prices": [{ "amount": 199, "currency": "RUB" }]\n  }\n]',
        hint: 'JSON-массив офферов. Будет распарсен перед отправкой.'
      }
    ]
  }
]

export const OPERATIONS_CLIENT_CATALOG: ClientOperationDescriptor[] = [
  ...LIFEPAY_OPERATIONS,
  ...LAVATOP_OPERATIONS
]

/**
 * Wire-форма поля операции GC. Зеркалит `ArgsFieldSchema` из
 * GC gateway отдаёт `argsTree` плоско — вложенные `items`
 * для текущей формы не разворачиваются (поле типа `array`/`object` рендерится
 * как JSON-редактор).
 */
export type GcOperationField = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required: boolean
  description?: string
}

/**
 * Wire-форма операции GC для SSR-пропа `gcOperations`. Минимум, нужный для
 * построения `ClientOperationDescriptor` через `buildGcOperationDescriptor`,
 * плюс `argsTree` — иерархическая структура для рекурсивной формы (опционально,
 * для graceful degradation: если гейтвей не отдал поле, форма строится по
 * плоскому `fields[]`).
 */
export type GcOperationEntry = {
  op: string
  httpMethod: 'GET' | 'POST'
  description?: string
  fields: GcOperationField[]
  argsTree?: import('./gcArgsForm').ArgsTreeNode
}

// Хелперы (groupOperationsForUi / findClientOperation / operationKey /
// buildEmptyForm / validateForm / buildArgs / buildInitialRequestState) живут
// в `operationsClientForm.ts`, чтобы каталог оставался декларативным.
export {
  gatewayLabel,
  groupOperationsForUi,
  findClientOperation,
  operationKey,
  parseOperationKey,
  buildInitialRequestState,
  buildEmptyForm,
  validateForm,
  buildArgs,
  buildGcOperationDescriptor,
  buildGcGroupForUi,
  type OperationGroupForUi
} from './operationsClientForm'

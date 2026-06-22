import { PROJECT_ROOT as MODULE_KEY } from '../config/routes'

export const GETCOURSE_RAW_EVENT_ACCEPTED_EVENT_TYPE = 'getcourse.raw_event.accepted'
export const GETCOURSE_ORDER_CREATED_EVENT_TYPE = 'getcourse.order.created'
export const GETCOURSE_ORDER_STATUS_CHANGED_EVENT_TYPE = 'getcourse.order.status_changed'
export const GETCOURSE_ORDER_PAID_EVENT_TYPE = 'getcourse.order.paid'

const GETCOURSE_RAW_EVENT_PAYLOAD_SCHEMA = {
  type: 'object',
  required: ['rawEventId', 'eventType', 'receivedAt', 'payloadJson'],
  properties: {
    rawEventId: { type: 'string' },
    eventType: { type: 'string' },
    source: { type: 'string' },
    accountName: { type: 'string' },
    objectId: { type: 'string' },
    userId: { type: 'string' },
    receivedAt: { type: 'number' },
    payloadJson: { type: 'string' }
  },
  additionalProperties: false
} as const

const GETCOURSE_ORDER_CREATED_PAYLOAD_SCHEMA = {
  type: 'object',
  required: [
    'orderKey',
    'idempotencyKey',
    'gcDealId',
    'gcDealNumber',
    'offerId',
    'userEmail',
    'amount',
    'currency',
    'status',
    'paymentUrl'
  ],
  properties: {
    orderKey: { type: 'string' },
    idempotencyKey: { type: 'string' },
    gcDealId: { type: 'string' },
    gcDealNumber: { type: 'string' },
    offerId: { type: 'string' },
    userEmail: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' },
    status: { type: 'string' },
    paymentUrl: { type: 'string' }
  },
  additionalProperties: false
} as const

const GETCOURSE_ORDER_STATUS_CHANGED_PAYLOAD_SCHEMA = {
  type: 'object',
  required: ['orderKey', 'gcDealId', 'gcDealNumber', 'toStatus', 'gcStatus', 'isPayed'],
  properties: {
    orderKey: { type: 'string' },
    gcDealId: { type: 'string' },
    gcDealNumber: { type: 'string' },
    fromStatus: { type: 'string' },
    toStatus: { type: 'string' },
    gcStatus: { type: 'string' },
    isPayed: { type: 'boolean' }
  },
  additionalProperties: false
} as const

const GETCOURSE_ORDER_PAID_PAYLOAD_SCHEMA = {
  type: 'object',
  required: ['orderKey', 'gcDealId', 'gcDealNumber', 'userEmail', 'amount', 'currency'],
  properties: {
    orderKey: { type: 'string' },
    gcDealId: { type: 'string' },
    gcDealNumber: { type: 'string' },
    userEmail: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' }
  },
  additionalProperties: false
} as const

export const BROKER_EVENT_CONTRACTS = [
  {
    eventType: GETCOURSE_RAW_EVENT_ACCEPTED_EVENT_TYPE,
    eventVersion: 1,
    status: 'active',
    description: 'GetCourse raw event accepted by the GetCourse interface module',
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: GETCOURSE_RAW_EVENT_PAYLOAD_SCHEMA,
    sourceRef: {
      moduleKey: MODULE_KEY,
      path: 'contracts/brokerEvents.ts',
      exportName: 'BROKER_EVENT_CONTRACTS',
      docsPath: 'README.md'
    },
    display: {
      summaryFields: [
        { path: 'eventType', label: 'Event type', maxLength: 80 },
        { path: 'accountName', label: 'Account', maxLength: 80 },
        { path: 'objectId', label: 'Object', maxLength: 80 }
      ]
    },
    examples: [
      {
        rawEventId: 'gc_evt_1710000000000_ab12cd34',
        eventType: 'deal.created',
        source: 'manual',
        accountName: 'school.example',
        objectId: 'deal-123',
        userId: 'user-456',
        receivedAt: 1710000000000,
        payloadJson: '{"id":"deal-123","status":"new"}'
      }
    ],
    metadata: { interface: 'getcourse' }
  },
  {
    eventType: GETCOURSE_ORDER_CREATED_EVENT_TYPE,
    eventVersion: 1,
    status: 'active',
    description: 'GetCourse order created — сделка создана в GetCourse, получена ссылка на оплату',
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: GETCOURSE_ORDER_CREATED_PAYLOAD_SCHEMA,
    sourceRef: {
      moduleKey: MODULE_KEY,
      path: 'contracts/brokerEvents.ts',
      exportName: 'BROKER_EVENT_CONTRACTS',
      docsPath: 'docs/spec/broker-events.md'
    },
    display: {
      summaryFields: [
        { path: 'orderKey', label: 'Order key', maxLength: 80 },
        { path: 'userEmail', label: 'Email', maxLength: 80 },
        { path: 'status', label: 'Status', maxLength: 40 }
      ]
    },
    examples: [
      {
        orderKey: 'ord_abc123',
        idempotencyKey: 'app-req-456',
        gcDealId: '7890',
        gcDealNumber: 'DEAL-001',
        offerId: '42',
        userEmail: 'user@example.com',
        amount: 9900,
        currency: 'RUB',
        status: 'new',
        paymentUrl: 'https://school.getcourse.ru/pl/pay/7890'
      }
    ],
    metadata: { interface: 'getcourse' }
  },
  {
    eventType: GETCOURSE_ORDER_STATUS_CHANGED_EVENT_TYPE,
    eventVersion: 1,
    status: 'active',
    description: 'GetCourse order status changed — любой апдейт статуса из входящего postback',
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: GETCOURSE_ORDER_STATUS_CHANGED_PAYLOAD_SCHEMA,
    sourceRef: {
      moduleKey: MODULE_KEY,
      path: 'contracts/brokerEvents.ts',
      exportName: 'BROKER_EVENT_CONTRACTS',
      docsPath: 'docs/spec/broker-events.md'
    },
    display: {
      summaryFields: [
        { path: 'orderKey', label: 'Order key', maxLength: 80 },
        { path: 'toStatus', label: 'To status', maxLength: 40 },
        { path: 'gcStatus', label: 'GC status', maxLength: 40 }
      ]
    },
    examples: [
      {
        orderKey: 'ord_abc123',
        gcDealId: '7890',
        gcDealNumber: 'DEAL-001',
        fromStatus: 'new',
        toStatus: 'paid',
        gcStatus: 'payed',
        isPayed: true
      }
    ],
    metadata: { interface: 'getcourse' }
  },
  {
    eventType: GETCOURSE_ORDER_PAID_EVENT_TYPE,
    eventVersion: 1,
    status: 'active',
    description:
      'GetCourse order paid — переход заказа в статус оплачен. Публикуется дополнительно к status_changed',
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: GETCOURSE_ORDER_PAID_PAYLOAD_SCHEMA,
    sourceRef: {
      moduleKey: MODULE_KEY,
      path: 'contracts/brokerEvents.ts',
      exportName: 'BROKER_EVENT_CONTRACTS',
      docsPath: 'docs/spec/broker-events.md'
    },
    display: {
      summaryFields: [
        { path: 'orderKey', label: 'Order key', maxLength: 80 },
        { path: 'userEmail', label: 'Email', maxLength: 80 },
        { path: 'amount', label: 'Amount', maxLength: 40 }
      ]
    },
    examples: [
      {
        orderKey: 'ord_abc123',
        gcDealId: '7890',
        gcDealNumber: 'DEAL-001',
        userEmail: 'user@example.com',
        amount: 9900,
        currency: 'RUB'
      }
    ],
    metadata: { interface: 'getcourse' }
  }
] as const

const MODULE_KEY = 'p/units/aley/bpm/interfaces/max'

const RAW_UPDATE_PAYLOAD_SCHEMA = {
  type: 'object',
  required: ['rawUpdateId', 'source', 'updateType', 'receivedAt', 'rawRef'],
  properties: {
    rawUpdateId: { type: 'string' },
    source: { type: 'string' },
    updateType: { type: 'string' },
    maxTimestamp: { type: 'number' },
    receivedAt: { type: 'number' },
    chatId: { type: 'string' },
    userId: { type: 'string' },
    fingerprint: { type: 'string' },
    rawRef: {
      type: 'object',
      required: ['projectRoot', 'table', 'id'],
      properties: {
        projectRoot: { type: 'string' },
        table: { type: 'string' },
        id: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
} as const

const MINIAPP_EVENT_PAYLOAD_SCHEMA = {
  type: 'object',
  required: ['miniappEventId', 'pageKey', 'receivedAt', 'payloadRef'],
  properties: {
    miniappEventId: { type: 'string' },
    pageKey: { type: 'string' },
    action: { type: 'string' },
    receivedAt: { type: 'number' },
    maxUserId: { type: 'string' },
    chatId: { type: 'string' },
    startParam: { type: 'string' },
    payloadRef: {
      type: 'object',
      required: ['projectRoot', 'table', 'id'],
      properties: {
        projectRoot: { type: 'string' },
        table: { type: 'string' },
        id: { type: 'string' }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
} as const

export function buildMaxUpdateEventContract(eventType: string) {
  return {
    eventType,
    eventVersion: 1,
    status: 'active',
    description: `MAX update accepted into raw inbox (${eventType})`,
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: RAW_UPDATE_PAYLOAD_SCHEMA,
    sourceRef: {
      moduleKey: MODULE_KEY,
      path: 'contracts/brokerEvents.ts',
      exportName: 'BROKER_EVENT_CONTRACTS'
    },
    display: {
      summaryFields: [
        { path: 'updateType', label: 'Update type' },
        { path: 'chatId', label: 'Chat' },
        { path: 'userId', label: 'User' }
      ]
    },
    examples: [
      {
        rawUpdateId: 'row-id',
        source: 'webhook',
        updateType: 'message_created',
        maxTimestamp: 1710000000,
        receivedAt: 1710000000000,
        chatId: '123',
        userId: '456',
        fingerprint: 'fnv1a32:00000000',
        rawRef: {
          projectRoot: MODULE_KEY,
          table: 'MaxRawUpdates',
          id: 'row-id'
        }
      }
    ]
  } as const
}

export function buildMiniappEventContract(eventType: string, description?: string) {
  return {
    eventType,
    eventVersion: 1,
    status: 'active',
    description: description ?? `MAX Mini App event accepted (${eventType})`,
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: MINIAPP_EVENT_PAYLOAD_SCHEMA,
    sourceRef: {
      moduleKey: MODULE_KEY,
      path: 'contracts/brokerEvents.ts',
      exportName: 'BROKER_EVENT_CONTRACTS'
    },
    display: { summaryFields: [{ path: 'pageKey', label: 'Page' }] },
    examples: [
      {
        miniappEventId: 'row-id',
        pageKey: 'root',
        receivedAt: 1710000000000,
        payloadRef: {
          projectRoot: MODULE_KEY,
          table: 'MiniappPageEvents',
          id: 'row-id'
        }
      }
    ]
  } as const
}

export const BROKER_EVENT_CONTRACTS = [
  buildMaxUpdateEventContract('max.raw_update.accepted'),
  buildMiniappEventContract(
    'max.miniapp.root.bootstrap',
    'MAX Mini App root page bootstrap accepted'
  )
] as const

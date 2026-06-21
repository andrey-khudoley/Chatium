export const GETCOURSE_MODULE_KEY = 'p/units/neso/meta/interfaces/getcourse'

const RAW_EVENT_PAYLOAD_SCHEMA = {
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

export const BROKER_EVENT_CONTRACTS = [
  {
    eventType: 'getcourse.raw_event.accepted',
    eventVersion: 1,
    status: 'active',
    description: 'GetCourse raw event accepted by the GetCourse interface module',
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: RAW_EVENT_PAYLOAD_SCHEMA,
    sourceRef: {
      moduleKey: GETCOURSE_MODULE_KEY,
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
  }
] as const

import { PROJECT_ROOT as MODULE_KEY } from '../config/routes'

export const WEB_CHECKOUT_SUBMITTED_EVENT_TYPE = 'web.checkout.submitted'

const WEB_CHECKOUT_SUBMITTED_PAYLOAD_SCHEMA = {
  type: 'object',
  required: ['requestKey', 'idempotencyKey', 'email', 'amount', 'currency'],
  properties: {
    requestKey: { type: 'string' },
    idempotencyKey: { type: 'string' },
    email: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' },
    offerId: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    phone: { type: 'string' },
    utmSource: { type: 'string' },
    utmMedium: { type: 'string' },
    utmCampaign: { type: 'string' },
    utmContent: { type: 'string' },
    utmTerm: { type: 'string' },
    comment: { type: 'string' },
    sourceUrl: { type: 'string' },
    returnUrl: { type: 'string' }
  },
  additionalProperties: false
} as const

export const BROKER_EVENT_CONTRACTS = [
  {
    eventType: WEB_CHECKOUT_SUBMITTED_EVENT_TYPE,
    eventVersion: 1,
    status: 'active',
    description: 'Checkout request submitted via web form — published by Web Interface',
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: WEB_CHECKOUT_SUBMITTED_PAYLOAD_SCHEMA,
    sourceRef: {
      moduleKey: MODULE_KEY,
      path: 'contracts/brokerEvents.ts',
      exportName: 'BROKER_EVENT_CONTRACTS',
      docsPath: 'docs/spec/spec.md'
    },
    display: {
      summaryFields: [
        { path: 'requestKey', label: 'Request key', maxLength: 80 },
        { path: 'email', label: 'Email', maxLength: 80 },
        { path: 'amount', label: 'Amount', maxLength: 40 }
      ]
    },
    examples: [
      {
        requestKey: 'rk_abc123',
        idempotencyKey: 'web-checkout:rk_abc123',
        email: 'user@example.com',
        amount: 9900,
        currency: 'RUB',
        offerId: '42',
        firstName: 'Иван',
        lastName: 'Иванов'
      }
    ],
    metadata: { interface: 'web' }
  }
] as const

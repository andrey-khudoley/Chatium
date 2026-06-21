import { PROJECT_ROOT as MODULE_KEY } from '../config/routes'

export const SAMPLE_NOTE_EVENT_TYPE = 'sample.note.created'

const SAMPLE_NOTE_PAYLOAD_SCHEMA = {
  type: 'object',
  required: ['noteId', 'title', 'createdAt'],
  properties: {
    noteId: { type: 'string' },
    title: { type: 'string' },
    body: { type: 'string' },
    createdAt: { type: 'number' },
    authorId: { type: 'string' }
  },
  additionalProperties: false
} as const

export const BROKER_EVENT_CONTRACTS = [
  {
    eventType: SAMPLE_NOTE_EVENT_TYPE,
    eventVersion: 1,
    status: 'active',
    description: 'Sample note created by the template module',
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: SAMPLE_NOTE_PAYLOAD_SCHEMA,
    sourceRef: {
      moduleKey: MODULE_KEY,
      path: 'contracts/brokerEvents.ts',
      exportName: 'BROKER_EVENT_CONTRACTS',
      docsPath: 'README.md'
    },
    display: {
      summaryFields: [
        { path: 'title', label: 'Title' },
        { path: 'authorId', label: 'Author' }
      ]
    },
    examples: [
      {
        noteId: 'note_1710000000000_ab12cd34',
        title: 'Hello broker',
        body: 'A tiny sample payload',
        createdAt: 1710000000000,
        authorId: 'admin'
      }
    ]
  }
] as const

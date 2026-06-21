export const SAMPLE_MODULE_KEY = 'p/units/neso/meta/sample-module'

export const BROKER_EVENT_CONTRACTS = [
  {
    eventType: 'sample.note.created',
    eventVersion: 1,
    status: 'active',
    description: 'Sample note created by the template module',
    payloadSchemaFormat: 'json-schema-subset-v1',
    payloadSchema: {
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
    },
    sourceRef: {
      moduleKey: SAMPLE_MODULE_KEY,
      path: 'contracts/brokerEvents.ts',
      exportName: 'BROKER_EVENT_CONTRACTS',
      docsPath: 'README.md'
    },
    display: {
      summaryFields: [
        { path: 'title', label: 'Title', maxLength: 80 },
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

# Data

## Local Tables

- `settings` stores module settings such as project name and log level.
- `logs` stores server/browser logs used by the admin dashboard.

## Broker Contracts

The module owns one sample event contract:

- `sample.note.created@1`

Contract source: `contracts/brokerEvents.ts`.

The event payload is intentionally small: `noteId`, `title`, optional `body`,
`createdAt`, and optional `authorId`.

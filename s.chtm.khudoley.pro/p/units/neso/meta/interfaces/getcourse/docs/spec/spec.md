# Spec: p/units/neso/meta/interfaces/getcourse

## Scope

This spec covers the GetCourse interface module in `p/units/neso/meta/interfaces/getcourse`.

## Project Root

`config/routes.tsx` must keep:

```ts
PROJECT_ROOT = 'p/units/neso/meta/interfaces/getcourse'
```

## Core Integration

- Core broker target app: `p/units/neso/meta/core`.
- Broker calls must go through `lib/broker/coreBrokerClient.lib.ts`.
- The module registers itself with module key equal to its `PROJECT_ROOT`.
- The module owns event contract `getcourse.raw_event.accepted@1`.

## API

- `POST /api/module/register`: Admin-only module registration.
- `POST /api/module/publish-event`: Admin-only GetCourse raw event publishing.

## Data

The GetCourse interface module keeps only generic local tables:

- `settings`
- `logs`

## Non-goals

- No direct references to concrete external integrations.
- No direct imports from core internals.
- No hardcoded public URLs.

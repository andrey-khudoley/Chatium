# Spec: p/template_metaproject/module

## Scope

This spec covers the sample module in `p/template_metaproject/module`.

## Project Root

`config/routes.tsx` must keep:

```ts
PROJECT_ROOT = 'p/template_metaproject/module'
```

## Core Integration

- Core broker target app: `p/template_metaproject/core`.
- Broker calls must go through `lib/broker/coreBrokerClient.lib.ts`.
- The module registers itself with module key equal to its `PROJECT_ROOT`.
- The module owns event contract `sample.note.created@1`.

## API

- `POST /api/module/register`: Admin-only module registration.
- `POST /api/module/publish-note`: Admin-only sample event publishing.

## Data

The template module keeps only generic local tables:

- `settings`
- `logs`

## Non-goals

- No direct references to concrete external integrations.
- No direct imports from core internals.
- No hardcoded public URLs.

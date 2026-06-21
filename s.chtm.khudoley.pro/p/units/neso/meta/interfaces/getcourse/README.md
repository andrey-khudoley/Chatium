# GetCourse Interface Module

Minimal GetCourse interface module for the NESO meta broker.

- Module key: `p/units/neso/meta/interfaces/getcourse`.
- Contracts live in `interfaces/getcourse/contracts/brokerEvents.ts`.
- Broker calls go through `app.function` via `@app/app.runAppFunction`.
- API routes are Admin-only examples under `interfaces/getcourse/api/*`.
- Current event: `getcourse.raw_event.accepted@1`.

The module stores raw GetCourse payload as `payloadJson` in the published broker event. Runtime
webhooks, raw Heap storage, and GetCourse API client code are intentionally not included yet.

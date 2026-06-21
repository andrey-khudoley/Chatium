# Template Sample Module

This module is intentionally small and MAX-independent. It demonstrates how a module in a
metaproject registers itself in the local broker, declares an event contract, publishes an event,
polls deliveries, and acknowledges or fails claimed deliveries.

- Contracts live in `sample-module/contracts/brokerEvents.ts`.
- Broker calls go through `app.function` via `@app/app.runAppFunction`.
- API routes are Admin-only examples under `sample-module/api/*`.

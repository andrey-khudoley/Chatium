# Imports

## Rules

- `ctx` and `app` are global and are not imported.
- Vue files import only `shared/*` code marked for shared use.
- Heap tables and repositories stay server-side.
- Core broker is called only from `lib/broker/coreBrokerClient.lib.ts`.
- API handlers guard protected routes before doing work.

## Broker Boundary

The module does not import files from `p/units/neso/meta/core`. It calls core
through `@app/app.runAppFunction` using target app `p/units/neso/meta/core`.

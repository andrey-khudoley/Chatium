# Architecture

`p/units/neso/meta/interfaces/getcourse` is a GetCourse interface Chatium module that lives next
to `p/units/neso/meta/core`.

## Layers

- `config/` contains project title and route helpers.
- `pages/`, `components/`, `web/`, `pagecss/`, `shared/` contain the UI shell.
- `tables/`, `repos/`, `lib/`, `api/` contain server-side data, business logic and routes.
- `contracts/` contains broker event contracts owned by the module.
- `lib/broker/coreBrokerClient.lib.ts` is the only place that calls core broker functions.

## Broker Flow

1. `api/module/register.ts` requires Admin and calls `registerCoreBrokerModule`.
2. The wrapper registers `PROJECT_ROOT` as a broker module in `p/units/neso/meta/core`.
3. `api/module/publish-event.ts` requires Admin and calls `publishGetCourseRawEvent`.
4. The wrapper publishes `getcourse.raw_event.accepted` through core broker `app.function`
   routes.

The module does not import core internals directly.

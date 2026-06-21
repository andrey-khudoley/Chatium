# Architecture

`p/template_metaproject/module` is a sample Chatium module that lives next to
`p/template_metaproject/core`.

## Layers

- `config/` contains project title and route helpers.
- `pages/`, `components/`, `web/`, `pagecss/`, `shared/` contain the UI shell.
- `tables/`, `repos/`, `lib/`, `api/` contain server-side data, business logic and routes.
- `contracts/` contains broker event contracts owned by the module.
- `lib/broker/coreBrokerClient.lib.ts` is the only place that calls core broker functions.

## Broker Flow

1. `api/module/register.ts` requires Admin and calls `registerCoreBrokerModule`.
2. The wrapper registers `PROJECT_ROOT` as a broker module in `p/template_metaproject/core`.
3. `api/module/publish-note.ts` requires Admin and calls `publishSampleNote`.
4. The wrapper publishes `sample.note.created` through core broker `app.function` routes.

The module does not import core internals directly.

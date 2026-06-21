# p/units/neso/meta/interfaces/getcourse

## Назначение

GetCourse Interface для NESO meta. Это полноценный Chatium-модуль рядом с
`p/units/neso/meta/core`: у него есть стандартные страницы, настройки, логи,
тесты и публикация GetCourse raw events в core broker.

## Состав

- `config/routes.tsx` задает project root `p/units/neso/meta/interfaces/getcourse`.
- `contracts/brokerEvents.ts` описывает событие `getcourse.raw_event.accepted`.
- `lib/broker/coreBrokerClient.lib.ts` регистрирует модуль в core broker и публикует событие.
- `api/module/register.ts` регистрирует модуль и его event contracts.
- `api/module/publish-event.ts` публикует GetCourse raw event.

## Важно

- Платформа: Chatium. Серверная часть управляется платформой.
- Core broker вызывается через `@app/app.runAppFunction`, без HTTP URL.
- Heap/tables остаются на сервере; Vue импортирует только `shared/*`.
- Защищенные API начинаются с `requireAccountRole(ctx, 'Admin')`.

## Документация

- Архитектура: `docs/architecture.md`
- API: `docs/api.md`
- Данные: `docs/data.md`
- Импорты: `docs/imports.md`
- Spec-as-source: `docs/spec/spec.md`

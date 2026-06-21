# p/template_metaproject/module

## Назначение

Template Module для Chatium metaproject. Это чистый sample-модуль рядом с
`p/template_metaproject/core`: у него есть стандартные страницы, настройки, логи,
тесты и пример публикации события в core broker.

## Состав

- `config/routes.tsx` задает project root `p/template_metaproject/module`.
- `contracts/brokerEvents.ts` описывает sample-событие `sample.note.created`.
- `lib/broker/coreBrokerClient.lib.ts` регистрирует модуль в core broker и публикует событие.
- `api/module/register.ts` регистрирует модуль и его event contracts.
- `api/module/publish-note.ts` публикует sample note event.

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

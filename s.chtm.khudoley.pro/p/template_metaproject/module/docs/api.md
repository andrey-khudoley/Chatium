# API

## Module Broker API

| Route                      | Method | Access | Description                                                  |
| -------------------------- | ------ | ------ | ------------------------------------------------------------ |
| `/api/module/register`     | POST   | Admin  | Register this module and its event contracts in core broker. |
| `/api/module/publish-note` | POST   | Admin  | Publish a `sample.note.created` event.                       |

### POST /api/module/publish-note

Request:

```json
{
  "noteId": "note_1",
  "title": "Sample note",
  "body": "Optional body",
  "authorId": "admin",
  "targetModules": []
}
```

Response is the core broker publish result.

## Standard API

The copied module shell also includes standard settings, logs, dashboard and tests API:

- `/api/settings/*`
- `/api/logger/*`
- `/api/admin/logs/*`
- `/api/admin/dashboard/*`
- `/api/tests/*`

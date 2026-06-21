# API

## Module Broker API

| Route                       | Method | Access | Description                                                  |
| --------------------------- | ------ | ------ | ------------------------------------------------------------ |
| `/api/module/register`      | POST   | Admin  | Register this module and its event contracts in core broker. |
| `/api/module/publish-event` | POST   | Admin  | Publish a `getcourse.raw_event.accepted` event.              |

### POST /api/module/publish-event

Request:

```json
{
  "rawEventId": "gc_evt_1",
  "eventType": "deal.created",
  "source": "manual",
  "accountName": "school.example",
  "objectId": "deal-123",
  "userId": "user-456",
  "payloadJson": "{\"id\":\"deal-123\",\"status\":\"new\"}",
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

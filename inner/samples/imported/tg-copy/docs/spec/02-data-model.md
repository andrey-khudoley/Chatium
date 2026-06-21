# 02. Модель данных (Heap-таблицы)

19 таблиц в `tables/*.table.ts`. Общий шаблон файла:

```ts
import { Heap } from '@app/heap'

export const <Const> = Heap.Table('<physical_id>', {
  fieldName: Heap.Optional(Heap.String({ customMeta: { title: '...' } })),
  // ...
}, { /* table meta */ })

export default <Const>
export type <Const>T = typeof <Const>.T
export type <Const>JsonT = typeof <Const>.JsonT
```

**Инварианты (008-heap, 022-getcourse-heap):**
- Все поля обёрнуты в `Heap.Optional(...)`. Обязательных полей нет; дефолты задаются в коде при `.create()`.
- **`id`, `createdAt`, `updatedAt` — зарезервированы: NEVER объявлять в таблице и NEVER передавать в `create()`/`update()`** (добавляются платформой автоматически). Если в логике sample встречается передача `createdAt` в `create` — убрать.
- `RefLink`/`UserRefLink` — **обязателен `onDelete`** (обычно `'none'`). В RefLink — строковый физический id целевой таблицы (не импорт). Зависимые RefLink-записи удалять **ДО** родителя.
- `RefLink('<physical_id>')` ссылается на **физический id** целевой таблицы. Поэтому: создавай сначала `chats` и `chat-subscription-plans`, запиши их физические id, подставь в ссылающиеся таблицы.
- `embeddings` по умолчанию `false`; включать только для семантического поиска.

Синтаксис типов полей:
```ts
Heap.Optional(Heap.String({ customMeta: { title: 't' } }))
Heap.Optional(Heap.String({ customMeta: { title: 't' }, searchable: { langs: ['ru','en'], embeddings: false } }))  // полнотекст
Heap.Optional(Heap.String({ customMeta: { title: 't' }, searchable: { langs: ['ru','en'], embeddings: true } }))   // + вектор (только при необходимости)
Heap.Optional(Heap.Number({ customMeta: { title: 't' } }))
Heap.Optional(Heap.Boolean({ customMeta: { title: 't' } }))
Heap.Optional(Heap.DateTime({ customMeta: { title: 't' } }))
Heap.Optional(Heap.Money({ customMeta: { title: 't' } }))
Heap.Optional(Heap.Any())                                          // JSON без типа
Heap.Optional(Heap.UserRefLink({ customMeta: { title: 't' }, onDelete: 'none' }))
Heap.Optional(Heap.RefLink('<target_physical_id>', { customMeta: { title: 't' }, onDelete: 'none' }))
```

---

## Порядок создания (из-за RefLink)

1. `chats` → зафиксировать id `CHATS_ID`.
2. `chat-subscription-plans` → зафиксировать `PLANS_ID`.
3. Остальные, подставляя `CHATS_ID` / `PLANS_ID` в RefLink-поля.

---

## Таблицы

### chats (`CHATS_ID`)
| Поле | Тип | Назначение |
| --- | --- | --- |
| `feedId` | String | id фида в Feed API |
| `title` | String + search + **embeddings** | название |
| `type` | String | `group` / `channel` / `direct` |
| `owner` | UserRefLink | создатель |
| `isPublic` | Boolean | публичный |
| `description` | String + search + embeddings | описание |
| `avatarHash` | String | хеш аватара |
| `pinnedMessageId` | String | закреп. сообщение |
| `isPaid` | Boolean | платный |
| `inboxSubjectId` | String | субъект inbox |

### chat-subscription-plans (`PLANS_ID`)
| Поле | Тип |
| --- | --- |
| `chatId` | String (feedId) |
| `name` | String + search |
| `description` | String |
| `durationType` | String (`days`/`months`/`years`) |
| `durationValue` | Number |
| `calendarPeriod` | String (`current`/`next`/`specific`) |
| `specificPeriodStart` | Number (1–12) |
| `price` | Money |
| `isActive` | Boolean |
| `allowAutoRenewal` | Boolean |
| `sortOrder` | Number |

### chat-agents
| Поле | Тип |
| --- | --- |
| `chat` | RefLink(`CHATS_ID`) |
| `agentId` | String + search |
| `agentName` | String |
| `agentKey` | String + search |
| `botUserId` | String + search |
| `respondTo` | String (`all`/`admins`/`mention`) |
| `respondToMention` | String (`all`/`admins`) |
| `isActive` | Boolean |
| `canScheduleInChat` | Boolean |
| `chainKey` | String + search |

### chat-invites
| Поле | Тип |
| --- | --- |
| `chat` | RefLink(`CHATS_ID`) |
| `invitedBy` | UserRefLink |
| `invitedUser` | UserRefLink |
| `status` | String (`pending`/`accepted`/`declined`/`revoked`/`expired`) |
| `token` | String + search |
| `inviteType` | String (`username`/`email`/`phone`/`link`/`userId`) |
| `inviteValue` | String + search |
| `isLinkInvite` | Boolean |
| `expiresAt` | DateTime |

### chat-subscriptions
| Поле | Тип |
| --- | --- |
| `userId` | UserRefLink |
| `chatId` | String (legacy feedId) |
| `planId` | RefLink(`PLANS_ID`) |
| `status` | String (`active`/`pending`/`expired`/`cancelled`) |
| `startDate` | DateTime |
| `endDate` | DateTime |
| `autoRenewal` | Boolean |
| `renewalPlanId` | RefLink(`PLANS_ID`) |
| `lastPaymentId` | String |
| `lastPaymentAt` | DateTime |
| `nextBillingDate` | DateTime |
| `cancelledAt` | DateTime |
| `cancelReason` | String (также используется для JSON данных продления) |
| `selectedPeriodStart` | DateTime |
| `selectedPeriodEnd` | DateTime |

### chat-plan-chats
| Поле | Тип |
| --- | --- |
| `planId` | RefLink(`PLANS_ID`) |
| `feedId` | String + search |
| `sortOrder` | Number |

### chat-moderations
| Поле | Тип |
| --- | --- |
| `chatId` | String |
| `userId` | UserRefLink |
| `moderatedBy` | UserRefLink |
| `type` | String (`ban`/`mute`) |
| `reason` | String |
| `duration` | Number (минуты) |
| `expiresAt` | DateTime |
| `isPermanent` | Boolean |
| `isActive` | Boolean |

### chat-folders
| Поле | Тип |
| --- | --- |
| `name` | String |
| `userId` | String |
| `sortOrder` | Number |
| `icon` | String (emoji, дефолт `📁`) |
| `color` | String (legacy, дефолт `#008069`) |

### chat-folder-items
| Поле | Тип |
| --- | --- |
| `folderId` | String |
| `feedId` | String |
| `userId` | String |
| `addedAt` | DateTime |

### user-pinned-chats
| Поле | Тип |
| --- | --- |
| `userId` | String |
| `feedId` | String |
| `sortOrder` | Number |

### user-chat-filter-orders
| Поле | Тип |
| --- | --- |
| `userId` | String |
| `filterId` | String |
| `filterType` | String |
| `position` | Number |

### read-mentions
| Поле | Тип |
| --- | --- |
| `userId` | String |
| `feedId` | String |
| `messageId` | String |
| `readAt` | DateTime |

### pinned-messages
| Поле | Тип |
| --- | --- |
| `chatId` | String (feedId) |
| `messageId` | String |
| `pinnedBy` | UserRefLink |
| `pinnedAt` | DateTime |

### blocked-users
| Поле | Тип |
| --- | --- |
| `userId` | String (кто блокирует) |
| `blockedUserId` | String |
| `reason` | String |

### user-privacy-settings
| Поле | Тип |
| --- | --- |
| `user` | UserRefLink |
| `allowDirectMessages` | String (`everyone`/`contacts`/`none`) |
| `allowedUsers` | Any (json: string[]) |
| `blockedUsers` | Any (json: string[]) |

### push-subscriptions (физ. префикс `t_tg_...`, title `Push подписки`)
| Поле | Тип |
| --- | --- |
| `endpoint` | String (хранит fcmToken как ключ дедупа) |
| `subscriptionData` | Any (без customMeta) — `{ fcmToken, deviceInfo, updatedAt? }` |
| `userId` | UserRefLink |

### voice-transcriptions
| Поле | Тип |
| --- | --- |
| `fileHash` | String (ключ кэша) |
| `messageId` | String |
| `feedId` | String |
| `transcription` | String |
| `language` | String |
| `status` | String (`processing`/`completed`/`error`) |
| `errorMessage` | String |
| `requestedBy` | UserRefLink |

### app-settings
| Поле | Тип |
| --- | --- |
| `key` | String |
| `value` | String |
| `category` | String |
| `description` | String |

### client-logs
| Поле | Тип |
| --- | --- |
| `userId` | String |
| `type` | String |
| `message` | String |
| `details` | String |
| `userAgent` | String |
| `url` | String |

---

## Импорт таблиц в коде

```ts
import Chats from '../tables/chats.table'
import Subscriptions from '../tables/chat-subscriptions.table'
// ... (default-экспорт переименовывается под удобное имя)
```

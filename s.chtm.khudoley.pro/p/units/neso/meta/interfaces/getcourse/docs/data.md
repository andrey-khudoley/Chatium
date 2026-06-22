# Data

## Heap-таблицы

### Orders (`tables/orders.table.ts`)

Основная таблица заказов. Один заказ — одна запись; upsert по ключу `orderKey`.

| Поле              | Тип        | Назначение                                                                       |
| ----------------- | ---------- | -------------------------------------------------------------------------------- |
| orderKey          | String     | Ключ upsert; включает accountNanoid                                              |
| idempotencyKey    | String     | Внешний ключ идемпотентности при создании заказа в GC                            |
| gcDealId          | String     | ID сделки в GetCourse (корреляция webhook)                                       |
| gcDealNumber      | String     | Номер сделки в GetCourse (корреляция webhook)                                    |
| offerId           | String     | ID оффера                                                                        |
| userEmail         | String     | Email покупателя                                                                 |
| firstName         | String     | Имя                                                                              |
| lastName          | String     | Фамилия                                                                          |
| phone             | String     | Телефон                                                                          |
| utmSource         | String     | UTM-метка source                                                                 |
| utmMedium         | String     | UTM-метка medium                                                                 |
| utmCampaign       | String     | UTM-метка campaign                                                               |
| utmContent        | String     | UTM-метка content                                                                |
| utmTerm           | String     | UTM-метка term                                                                   |
| amount            | Heap.Money | Сумма заказа с валютой (отдельного поля currency нет)                            |
| paymentUrl        | String     | Ссылка на страницу оплаты GC                                                     |
| status            | Heap.Enum  | Статус заказа: `new` / `pending` / `part_paid` / `paid` / `cancelled` / `failed` |
| rawCreateResponse | Any        | Сырой ответ GC на создание сделки                                                |
| rawStatus         | Any        | Сырой последний статус от GC                                                     |

Системные поля `id`, `createdAt`, `updatedAt` — автоматические (Heap).

Маппинг статусов GC → статус заказа описан в [`docs/spec/spec.md`](spec/spec.md) (§8).

---

### WebhookEvents (`tables/webhookEvents.table.ts`)

Журнал входящих webhook-событий от GetCourse. Служит для дедупликации и аудита.

| Поле         | Тип     | Назначение                                                  |
| ------------ | ------- | ----------------------------------------------------------- |
| webhookId    | String  | Ключ дедупликации: `dealId:gcStatus:statusUpdatedAt`        |
| orderKey     | String  | Ссылка на заказ (корреляция/аудит)                          |
| gcDealNumber | String  | Номер сделки GC                                             |
| gcDealId     | String  | ID сделки GC                                                |
| status       | String  | Сырой GC-статус из webhook                                  |
| isPayed      | Boolean | Флаг оплаты из payload GC                                   |
| payload      | Any     | Полный payload webhook                                      |
| processed    | Boolean | Флаг идемпотентной обработки (true — событие уже применено) |

Поля `receivedAt` нет: момент приёма фиксирует системный `createdAt`.

Схема payload описана в [`docs/spec/broker-events.md`](spec/broker-events.md).

---

## Таблица настроек Settings (`lib/settings.lib.ts`)

Ключи модуля в платформенной таблице `Settings`:

| Ключ                | Тип    | Назначение                                                              |
| ------------------- | ------ | ----------------------------------------------------------------------- |
| gateway_base_url    | String | Базовый URL гейтвея (до `/v1`)                                          |
| gc_school_host      | String | Хост школы GetCourse (без схемы)                                        |
| gc_school_api_key   | String | **СЕКРЕТ** — API-ключ школы; исключён из логов и `getAllSettings`       |
| webhook_path_token  | String | **СЕКРЕТ** — токен в URL постбэка; исключён из логов и `getAllSettings` |
| gc_default_offer_id | String | Числовая строка ID оффера по умолчанию                                  |
| gc_paid_status      | String | GC-статус, считаемый «оплачен» (по умолчанию `payed`)                   |

Секретные ключи (`gc_school_api_key`, `webhook_path_token`) включены в `SECRET_SETTING_KEYS` и никогда не попадают в логи и ответы на запросы списка настроек.

---

## Broker-события

Исходящие события модуля и их payload-схемы описаны в [`docs/spec/broker-events.md`](spec/broker-events.md).

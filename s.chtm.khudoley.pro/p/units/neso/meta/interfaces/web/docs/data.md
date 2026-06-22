# Data

Источник истины по данным: `docs/spec/spec.md`.

## Текущие Heap-таблицы scaffold

| Table                                     | File                       | Назначение                | Основные поля                                          |
| ----------------------------------------- | -------------------------- | ------------------------- | ------------------------------------------------------ |
| `t__neso_meta_web_iface__setting__7Fk2Qw` | `tables/settings.table.ts` | Настройки scaffold-модуля | `key`, `value`                                         |
| `t__neso_meta_web_iface__log__9Xm3Kp`     | `tables/logs.table.ts`     | Серверные логи модуля     | `message`, `payload`, `severity`, `level`, `timestamp` |

## Таблицы checkout-runtime

### checkoutRequests

| Параметр | Значение |
|----------|----------|
| UID      | `t__neso_meta_web_iface__checkout_requests__rQ8pN4` |
| Файл     | `tables/checkoutRequests.table.ts` |
| Назначение | Состояние checkout-запроса от submit формы до редиректа на оплату |

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `requestKey` | String | Локальный ключ checkout; генерируется на SSR через `accountNanoid` |
| `idempotencyKey` | String | Ключ заказа для GetCourse; формат `web-checkout:{requestKey}` |
| `socketId` | String | Raw socket id; формат `checkout:{requestKey}` |
| `status` | Enum | Статус запроса (см. ниже) |
| `formPayload` | Any | Нормализованные поля формы после submit |
| `paymentUrl` | String | Ссылка на оплату; заполняется после `getcourse.order.created` |
| `orderKey` | String | `orderKey` из GetCourse Interface |
| `gcDealNumber` | String | Номер сделки в GetCourse |
| `errorMessage` | String | Последняя ошибка при публикации/обработке |

**Статусы (`status`):**

| Значение | Описание |
|----------|----------|
| `new` | Зарезервирован, не используется |
| `submitted` | Запрос создан при submit формы (стартовый) |
| `payment_ready` | Ссылка на оплату получена от GetCourse |
| `redirected` | Пользователь перенаправлен на оплату |
| `failed` | Ошибка при публикации или обработке события |

Диаграмма переходов: `submitted` → `payment_ready` → `redirected`; из любого состояния → `failed` при ошибке.

**Repo (`repos/checkoutRequests.repo.ts`):**

| Метод | Описание |
|-------|----------|
| `findByRequestKey` | `findOneBy requestKey` |
| `findByIdempotencyKey` | `findOneBy idempotencyKey` |
| `upsert` | `createOrUpdateBy 'requestKey'` |

**Жизненный цикл:**

- `requestKey` генерируется на SSR (`/`).
- Запись создаётся **только при submit** (не на GET — исключает засорение от ботов и обновления страницы).
- Запись/обновление выполняется под `runWithExclusiveLock('checkout:{requestKey}')`.
- Подробности — §7.1 `docs/spec/spec.md`.

## Хранилище файлов

Не используется.

@chatium

# Инструкция для ИИ-агента: SDK тонкого клиента (gateway)

Ты работаешь с **библиотечным контрактом** внутри Chatium-приложения по пути `p/units/chatiumclub/sdk`. Этот файл — **единственная документация**, необходимая для работы с SDK: настройки, вызовы, коды ошибок, сериализация и **полный перечень полей `args` по каждому `op`** (приложение A). Обзор продукта, логи, дашборд, тесты и UI — в `README.md` и каталоге `docs/` этого же приложения.

SDK — HTTP-клиент к развёрнутому **gateway** (отдельное приложение Chatium). Контракт ответов и ошибок на стороне gateway воспроизведён в этом файле в разделах про ошибки; контракт `args` — в приложении A.

---

## Оглавление

1. [Поведенческие правила для модели](#0-поведенческие-правила-для-модели)
2. [Два способа подключения](#1-два-способа-подключить-sdk)
3. [Настройки Heap](#2-настройка-подключения-к-gateway-heap)
4. [Константы URL и таймаутов](#3-константы-sdk-libgatewayconstantsts)
5. [`invoke(ctx, input)`](#4-invokectx-input--полный-контракт) — внутри: [4.0 что передавать кроме `op`](#40-что-передавать-в-invoke-кроме-op)
6. [`getOperationsCatalog(ctx)`](#5-getoperationscatalogctx)
7. [HTTP-фасады приложения SDK](#6-http-фасады-приложения-sdk)
8. [Полный перечень `op` (локальный снимок)](#7-полный-перечень-op-локальный-снимок-v1_ops_list)
9. [Сериализация `args` для GET](#8-сериализация-args-для-get-подробно)
10. [Коды ошибок](#9-коды-ошибок)
11. [Успех, `warnings`, корреляция](#10-успех-warnings-корреляция)
12. [Примеры](#11-примеры)
13. [Паттерны и антипаттерны](#12-паттерны-и-антипаттерны)
14. [Чеклист при смене контракта](#13-чеклист-при-изменении-контракта-gateway)
15. [Индекс файлов](#14-индекс-файлов)
16. [Приложение A — полный справочник `args` по `op`](#приложение-a-полный-справочник-полей-args-по-каждому-op)

---

## 0. Поведенческие правила для модели

1. **Перед генерацией вызова** проверь: заданы ли все три настройки (`gateway_url`, `gc_school_host`, `gc_school_api_key`). Иначе `invoke` вернёт `SDK_NOT_CONFIGURED`. Для **`getOperationsCatalog`** достаточно непустого **`gateway_url`**.
2. **Перед вызовом без явного `httpMethod`:** убедись, что `op` есть в `shared/v1OpsList.generated.ts` (`findV1OpsListEntry(op)`), либо передай `httpMethod: 'GET' | 'POST'` явно. Реализация **`gatewayClient.invoke` не ходит за каталогом в сеть**, чтобы угадать метод: при неизвестном `op` и без `httpMethod` возвращается **`SDK_OP_HTTP_METHOD_UNKNOWN`** (в отличие от устаревшего комментария в шапке зеркального файла — ориентируйся на код `lib/gateway/gatewayClient.ts`).
3. **Никогда** не предлагай класть `gc_school_api_key` в Vue, `window`, SSR props, лог-сообщения, query внешних URL или в ответы API наружу.
4. **Один вызов `invoke` = один исходящий HTTP** к gateway; ретраев в SDK нет — повтор решай на уровне вызывающего кода (на gateway к GetCourse тоже без серверных ретраев).
5. Правки воркспэйса — **только** `s.chtm.khudoley.pro`, не `p.chtm.khudoley.pro`.
6. **Логирование в приложении SDK:** используй обёртку проекта (`lib/logger.lib` → `writeServerLog`), не сырые `console.log` в серверном коде; не логируй ключ школы и полные тела ответов GetCourse.

---

## 1. Два способа «подключить» SDK

### 1.1 Серверный импорт (внутри того же UGC-приложения)

Модуль `lib/gateway/gatewayClient.ts`:

| Функция                     | Назначение                                                          |
| --------------------------- | ------------------------------------------------------------------- |
| `invoke(ctx, input)`        | Один HTTP-запрос к `{gateway_url}/api/v1/{op}` с заголовками школы. |
| `getOperationsCatalog(ctx)` | `GET {gateway_url}/api/v1/operations` без заголовков школы.         |

`ctx` — глобальный контекст Chatium, **не импортируй** как модуль.

### 1.2 HTTP к уже развёрнутому приложению SDK

Внешний потребитель (другое приложение, curl, админка) после авторизации в Chatium (роль **Admin** для перечисленных путей):

| Нужно            | Метод и путь (от корня приложения SDK) | Тело / query | Роль      |
| ---------------- | -------------------------------------- | ------------ | --------- |
| Вызвать `op`     | `POST` → `api/gateway/invoke`          | JSON см. §6  | **Admin** |
| Каталог операций | `GET` → `api/gateway/operations`       | —            | **Admin** |

Тело `POST api/gateway/invoke` (совместимо с `GatewayInvokeInput`, плюс валидация `op` на роуте):

```json
{
  "op": "имя операции gateway, trim",
  "args": {},
  "httpMethod": "GET"
}
```

- `args` — опционально; если не объект (например массив) — на фасаде трактуется как `{}`.
- `httpMethod` — опционально; в теле допустимы только `"GET"` и `"POST"` (регистр нормализуется к верхнему).

Пустой `op` на фасаде → `ok: false`, `error.code: "SDK_BAD_REQUEST"` (это **не** то же самое, что `invoke` с пустым `op` напрямую — там `SDK_OP_HTTP_METHOD_UNKNOWN`, см. §6).

---

## 2. Настройка подключения к gateway (Heap)

Три ключа в таблице настроек (имена для клиента — только из `shared/sdkSettingKeys.ts`, файл с `// @shared`):

| Ключ Heap           | Назначение                             | Требования к значению                                                                                                                         |
| ------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `gateway_url`       | Базовый URL gateway без хвостового `/` | Непустая строка, **`http://` или `https://`**, при сохранении хвостовые `/` срезаются (`lib/settings.lib.ts`)                                 |
| `gc_school_host`    | Заголовок `X-Gc-School-Host`           | Хост **без** схемы `http://` / `https://`, **без** `/` и пробелов (пример: `school-host.example`); правила длины и символов проверяет gateway |
| `gc_school_api_key` | Заголовок `X-Gc-School-Api-Key`        | Непустая строка-секрет после `trim`                                                                                                           |

Чтение: `getGatewayClientSettings(ctx)` — три обрезанных строки; пустая строка = «не задано».

Заголовки на проводе к gateway должны **символьно** совпадать с `shared/gatewayHttpHeaders.ts`: `X-Gc-School-Host`, `X-Gc-School-Api-Key`, в ответе — `X-Gateway-Request-Id` (дублирует `requestId` в JSON).

---

## 3. Константы SDK (`lib/gateway/constants.ts`)

| Константа                        | Значение               | Смысл                                                                                                                                                                                                 |
| -------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SDK_GATEWAY_API_V1_PREFIX`      | `'/api/v1'`            | Gateway в Chatium свёрстан с `PROJECT_ROOT`, публичные маршруты — под `/api/v1/...` (не голый `/v1/...` снаружи домена приложения).                                                                   |
| `SDK_GATEWAY_OPERATIONS_PATH`    | `'/api/v1/operations'` | Каталог операций.                                                                                                                                                                                     |
| `SDK_GATEWAY_REQUEST_TIMEOUT_MS` | `15000`                | Таймаут **`@app/request`** от SDK к **gateway**. Больше, чем **10 с** исходящего запроса gateway→GetCourse, чтобы клиент успел получить структурированный ответ `INVOKE_GC_TIMEOUT` (504) от gateway. |

Итоговый URL операции:

```text
{gateway_url без финальных /}{SDK_GATEWAY_API_V1_PREFIX}/{op}
```

Пример: `gateway_url = https://gw.example.com` → `https://gw.example.com/api/v1/getUserFields`.

---

## 4. `invoke(ctx, input)` — полный контракт

### 4.0 Что передавать в `invoke` кроме `op`

Сигнатура: **`invoke(ctx, input)`**. Платформа подставляет **`ctx`** сама; в объекте **`input`** кроме обязательного **`op`** бывают **`args`** и **`httpMethod`**.

| Что передаётся         | Обязательность          | Смысл                                                                                                |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| **`ctx`**              | всегда                  | Контекст Chatium. Параметры операции сюда не кладутся.                                               |
| **`input.op`**         | да                      | Имя операции gateway.                                                                                |
| **`input.args`**       | нет (по умолчанию `{}`) | Поля операции: имена и типы — **строго по приложению A** ниже.                                       |
| **`input.httpMethod`** | нет                     | `'GET'` или `'POST'`, если локальный файл `shared/v1OpsList.generated.ts` ещё не содержит этот `op`. |

**Связь с HTTP:** для операций **GET** поля `args` сериализуются в query (правила — §8). Для **POST** весь объект `args` становится JSON-телом запроса к gateway (без обёртки `{ "args": ... }`).

**Примеры:**

```typescript
await invoke(ctx, { op: 'getAllGroups', args: {} })
await invoke(ctx, { op: 'getDealFields', args: { dealId: 1 } })
await invoke(ctx, { op: 'addCommentToDeal', args: { dealId: 1, userId: 2, text: 'Текст' } })
await invoke(ctx, { op: 'addUser', args: { params: { user: { email: 'u@example.com' } } } })
```

Если gateway вернул `INVOKE_ARGS_SCHEMA_VIOLATION`, смотри массив `error.details.errors` и сверяйся с приложением A.

### 4.1 Тип входа (`GatewayInvokeInput`)

| Поле         | Тип                       | Обяз. | Примечание                                                            |
| ------------ | ------------------------- | ----- | --------------------------------------------------------------------- |
| `op`         | `string`                  | да    | `trim`; пустая строка → `SDK_OP_HTTP_METHOD_UNKNOWN` с `details.op`   |
| `args`       | `Record<string, unknown>` | нет   | По умолчанию `{}`                                                     |
| `httpMethod` | `'GET' \| 'POST'`         | нет   | Если не задан — из `findV1OpsListEntry(op)?.httpMethod`; иначе ошибка |

### 4.2 Выбор HTTP-метода

1. Если передан `httpMethod` — используется он.
2. Иначе — из `V1_OPS_LIST` по имени `op`.
3. Если после шагов 1–2 метод не `'GET'` и не `'POST'` → **`SDK_OP_HTTP_METHOD_UNKNOWN`** (запрос **не** отправляется).

При добавлении операций на gateway синхронизируй зеркало `shared/v1OpsList.generated.ts` в этом проекте с приложением gateway и обнови приложение A в этом файле.

### 4.3 Сериализация `args`

- **POST:** тело исходящего запроса = JSON **ровно объект `args`** (корень тела — аргументы, без обёртки `{ "args": … }`).
- **GET:** query из плоских ключей — см. [§8](#8-сериализация-args-для-get-подробно).

Заголовки исходящего запроса к gateway: `X-Gc-School-Host`, `X-Gc-School-Api-Key`, `Accept: application/json`; для POST добавляется `Content-Type: application/json; charset=utf-8`.

### 4.4 Тип результата (`GatewayInvokeResult`)

Дискриминатор: `ok: boolean`.

**Успех (`ok: true`):**

| Поле                | Тип                      | Смысл                               |
| ------------------- | ------------------------ | ----------------------------------- |
| `data`              | `unknown`                | Поле `data` из JSON ответа gateway  |
| `requestId`         | `string \| null`         | Корреляция (тело и/или заголовок)   |
| `warnings`          | `GatewayInvokeWarning[]` | Для `availability: beta` на gateway |
| `gatewayHttpStatus` | `number`                 | HTTP-статус ответа gateway          |

**Неуспех (`ok: false`):**

| Поле                                         | Смысл                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `error`                                      | `{ code, message, details? }`                                                                                            |
| `requestId`, `warnings`, `gatewayHttpStatus` | Как при успехе; для сетевых/SDK ошибок до разбора тела `requestId` может быть `null`, `gatewayHttpStatus` может быть `0` |

---

## 5. `getOperationsCatalog(ctx)`

- Достаточно непустого **`gateway_url`** (школьные заголовки **не** передаются на этот запрос).
- Успех: `ok: true`, `catalog: { catalogSchemaVersion: number, operations: GatewayOperationsCatalogEntry[] }`.
- Каждая запись: `op`, `httpMethod`, `contour` (`'new' \| 'legacy'`), `availability`, `argsSchema` (`unknown` — формат схемы на стороне gateway, валидация через `@app/schema` на gateway).
- Назначение: актуальный список `op`, методы, схемы аргументов для UI/агента; локальный `v1OpsList.generated.ts` — офлайн-снимок для выбора метода без сетевого запроса каталога перед каждым `invoke`.

---

## 6. HTTP-фасады приложения SDK

Исходники: `api/gateway/invoke.ts`, `api/gateway/operations.ts` (оба с `// @shared-route`). Доступ: `requireAccountRole(ctx, 'Admin')`.

### 6.1 `POST api/gateway/invoke`

- Разбор тела: `op` — строка с `trim`; `args` — только обычный объект, иначе `{}`; `httpMethod` — только `GET`/`POST` в любом регистре, иначе `undefined`.
- Пустой `op` → **`SDK_BAD_REQUEST`**, сообщение на русском про обязательность поля `op` (**не** путать с прямым `invoke(ctx, { op: '' })` → `SDK_OP_HTTP_METHOD_UNKNOWN`).
- Внутри: `invoke(ctx, { op, args, httpMethod })`; возврат **тот же объект**, что вернул клиент.
- Непойманное исключение → **`SDK_INTERNAL_ERROR`** с `details.error` (строка сообщения).

### 6.2 `GET api/gateway/operations`

- `getOperationsCatalog(ctx)`; при исключении — **`SDK_INTERNAL_ERROR`**.

---

## 7. Полный перечень `op` (локальный снимок `V1_OPS_LIST`)

Ниже — **все** записи из `shared/v1OpsList.generated.ts` на момент синхронизации с gateway. Колонки **`HTTP`**, **`Контур`**, **`Доступность`** — из снимка. **Полный перечень полей `args` по каждому `op`:** [приложение A](#приложение-a-полный-справочник-полей-args-по-каждому-op).

### 7.1 Контур `new` — операции Tech API (`pl/api/v1`)

| `op`                       | HTTP | Доступность | Кратко (назначение)                               |
| -------------------------- | ---- | ----------- | ------------------------------------------------- |
| `setUri`                   | POST | enabled     | Установить URI для приёма вебхуков.               |
| `getAllGroups`             | GET  | enabled     | Все группы пользователей.                         |
| `getAllPersonalManagers`   | GET  | enabled     | Все персональные менеджеры.                       |
| `getTrainings`             | GET  | enabled     | Все тренинги.                                     |
| `addCommentToDeal`         | POST | enabled     | Комментарий к заказу.                             |
| `addDealPositions`         | POST | enabled     | Добавить позиции в заказ.                         |
| `getDealCalls`             | GET  | enabled     | Звонки по заказу.                                 |
| `getDealCancelReasons`     | GET  | enabled     | Причины отмены заказа.                            |
| `getDealComments`          | GET  | enabled     | Комментарии к заказу.                             |
| `getDealCustomFields`      | GET  | enabled     | Кастомные поля заказа.                            |
| `getDealsTags`             | GET  | enabled     | Заказы с тегами (фильтры в `args`).               |
| `getDealFields`            | GET  | enabled     | Поля заказа по идентификатору.                    |
| `removeDealPositions`      | POST | enabled     | Удалить позиции из заказа.                        |
| `updateDealFields`         | POST | enabled     | Обновить поля заказа.                             |
| `addCommentToDialog`       | POST | enabled     | Комментарий в диалог.                             |
| `changeDepartment`         | POST | enabled     | Сменить отдел диалога.                            |
| `closeDialog`              | POST | enabled     | Закрыть диалог.                                   |
| `getDialogHistory`         | GET  | enabled     | История диалога.                                  |
| `addCommentToLessonAnswer` | POST | enabled     | Комментарий к ответу на урок.                     |
| `changeStatusAnswers`      | POST | enabled     | Изменить статус ответа на урок.                   |
| `getLessonAnswers`         | GET  | enabled     | Ответы на урок.                                   |
| `addNote`                  | POST | enabled     | Заметка (к диалогу и т.п. — по схеме GC).         |
| `getOfferById`             | GET  | enabled     | Предложение по ID.                                |
| `getOffers`                | GET  | enabled     | Список предложений.                               |
| `getOffersTags`            | GET  | enabled     | Предложения с тегами.                             |
| `addUserBalance`           | POST | enabled     | Начислить баланс пользователю.                    |
| `addUserGroups`            | POST | enabled     | Добавить пользователя в группы.                   |
| `createDiploma`            | POST | enabled     | Создать диплом.                                   |
| `getUserAnswers`           | GET  | enabled     | Ответы пользователя.                              |
| `getUserBalance`           | GET  | enabled     | Баланс пользователя.                              |
| `getUserCustomFields`      | GET  | enabled     | Кастомные поля пользователя.                      |
| `getUserDeals`             | GET  | enabled     | Заказы пользователя.                              |
| `getUserDiplomas`          | GET  | enabled     | Дипломы пользователя.                             |
| `getUserFields`            | GET  | enabled     | Поля пользователя (идентификаторы в `args`).      |
| `getUserGoalRecords`       | GET  | enabled     | Записи целей.                                     |
| `getUserGroups`            | GET  | enabled     | Группы пользователя.                              |
| `getUserLessonAnswers`     | GET  | enabled     | Ответы на уроки.                                  |
| `getUserPurchases`         | GET  | enabled     | Покупки.                                          |
| `getUserSchedule`          | GET  | enabled     | Расписание.                                       |
| `getUserTrainings`         | GET  | enabled     | Тренинги пользователя.                            |
| `getUserByTelegramChatId`  | GET  | enabled     | Поиск пользователя по Telegram chat id.           |
| `removeUserGroups`         | POST | enabled     | Удалить из групп.                                 |
| `setUserGroups`            | POST | enabled     | Задать состав групп.                              |
| `setPersonalManager`       | POST | enabled     | Назначить персонального менеджера.                |
| `updateUserCustomFields`   | POST | enabled     | Обновить кастомные поля пользователя.             |
| `updateUserFields`         | POST | enabled     | Обновить поля пользователя.                       |
| `addCommentToWebinar`      | POST | enabled     | Комментарий в чат вебинара.                       |
| `getAllWebinars`           | GET  | enabled     | Все вебинары.                                     |
| `getWebinarsByIds`         | POST | enabled     | Вебинары по списку ID (тело — объект аргументов). |
| `moderateWebinarComment`   | POST | enabled     | Модерация сообщения в чате вебинара.              |
| `moderateWebinarUser`      | POST | enabled     | Модерация пользователя вебинара.                  |

### 7.2 Контур `legacy` — импорт/экспорт (`pl/api`)

| `op`               | HTTP | Доступность | Кратко (назначение)                                                |
| ------------------ | ---- | ----------- | ------------------------------------------------------------------ |
| `addUser`          | POST | enabled     | Создать/обновить пользователя (импорт).                            |
| `createDeal`       | POST | enabled     | Создать сделку (импорт).                                           |
| `exportUsers`      | GET  | enabled     | Экспорт пользователей (асинхронно; опрос через `getExportResult`). |
| `exportGroupUsers` | GET  | enabled     | Экспорт пользователей группы.                                      |
| `exportDeals`      | GET  | enabled     | Экспорт сделок.                                                    |
| `exportPayments`   | GET  | enabled     | Экспорт платежей.                                                  |
| `getCustomFields`  | GET  | enabled     | Справочник доп. полей аккаунта (Legacy).                           |
| `getExportResult`  | GET  | enabled     | Результат экспорта по идентификатору.                              |

**Поля `args` по каждой строке:** см. приложение A (ниже), а не только краткое название в таблице.

---

## 8. Сериализация `args` для GET (подробно)

Функция `argsToSearchParams` в `gatewayClient.ts`:

| Значение в `args`           | Поведение             |
| --------------------------- | --------------------- |
| `undefined`, `null`         | Ключ **пропускается** |
| объект или массив           | `JSON.stringify(v)`   |
| `boolean`, `number`         | `String(v)`           |
| остальное (в т.ч. `string`) | `String(v)`           |

Ключи — плоские имена параметров query; вложенность «объектом в одном ключе» на стороне SDK не разворачивается — сложные структуры передавай как JSON-строку в одном ключе, если так ожидает схема gateway/GC.

---

## 9. Коды ошибок

### 9.1 Сторона SDK (до или вместо разбора ответа gateway)

| `error.code`                   | Когда                                                                                                | Типичный `gatewayHttpStatus` |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------- |
| `SDK_NOT_CONFIGURED`           | Для `invoke`: не задан хотя бы один из трёх ключей; для `getOperationsCatalog`: пустой `gateway_url` | `0`                          |
| `SDK_OP_HTTP_METHOD_UNKNOWN`   | Пустой `op` после trim; или неизвестен метод и не передан `httpMethod`                               | `0`                          |
| `SDK_GATEWAY_NETWORK_ERROR`    | Исключение транспорта `@app/request` (DNS, TLS, таймаут **SDK** 15 с, обрыв)                         | `0`                          |
| `SDK_GATEWAY_INVALID_RESPONSE` | Ответ не объект; нет валидной пары `ok: true` / `ok: false` с `error.code`                           | число от HTTP или `0`        |
| `SDK_BAD_REQUEST`              | Только фасад `POST api/gateway/invoke`: пустой `op` в теле                                           | `0`                          |
| `SDK_INTERNAL_ERROR`           | Непойманное исключение в роутах `api/gateway/*`                                                      | `0`                          |

Канонические русские тексты для SDK-кодов (кроме фасада) зашиты в `SDK_ERROR_MESSAGES` в `gatewayClient.ts`.

### 9.2 Сторона gateway (как приходит в `error` при разобранном JSON)

Таблица ниже — коды ошибок **со стороны gateway** в поле `error` ответа (HTTP и смысл). Тексты `error.message` на русском фиксированы на gateway; здесь указан только смысл.

| Код                                                         | HTTP | Смысл (кратко)                                                                        |
| ----------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------- |
| `GATEWAY_DEV_KEY_NOT_CONFIGURED`                            | 503  | На стороне gateway не настроен ключ разработчика GC в Heap.                           |
| `INVOKE_SCHOOL_KEY_MISSING` / `INVOKE_SCHOOL_KEY_INVALID`   | 400  | Заголовок ключа школы отсутствует или пуст.                                           |
| `INVOKE_SCHOOL_HOST_MISSING` / `INVOKE_SCHOOL_HOST_INVALID` | 400  | Заголовок хоста школы.                                                                |
| `INVOKE_CONTENT_TYPE_UNSUPPORTED`                           | 415  | Неверный `Content-Type` для POST (SDK всегда шлёт JSON).                              |
| `INVOKE_BODY_INVALID_JSON`                                  | 400  | Тело POST не JSON-объект.                                                             |
| `INVOKE_BODY_TOO_LARGE`                                     | 413  | Тело POST > 1 MiB (`GW_MAX_REQUEST_BODY_BYTES`).                                      |
| `INVOKE_HTTP_METHOD_NOT_ALLOWED`                            | 405  | Неверный HTTP-метод для данного `op`.                                                 |
| `INVOKE_OP_UNKNOWN`                                         | 404  | Неизвестный сегмент пути `/api/v1/{op}`.                                              |
| `INVOKE_OP_DISABLED`                                        | 503  | Операция выключена политикой gateway.                                                 |
| `INVOKE_OP_UNSUPPORTED_BY_GC`                               | 501  | Операция не поддерживается в конфигурации.                                            |
| `INVOKE_ARGS_SCHEMA_VIOLATION`                              | 400  | `args` не прошли валидацию схемы; возможен `details.errors[]`.                        |
| `INVOKE_GC_UPSTREAM_ERROR`                                  | 502  | GC вернул статус вне 2xx или ошибка парсинга JSON при ожидаемом JSON.                 |
| `INVOKE_GC_SEMANTIC_ERROR`                                  | 502  | GC вернул 2xx, но по правилам gateway в JSON признаки ошибки (Legacy или new контур). |
| `INVOKE_GC_TIMEOUT`                                         | 504  | Таймаут 10 с исходящего запроса gateway→GC; часто `details.timeoutMs`.                |
| `INVOKE_GC_NETWORK_ERROR`                                   | 502  | Сеть до GC от gateway.                                                                |
| `INVOKE_INTERNAL_ERROR`                                     | 500  | Внутренняя ошибка gateway.                                                            |
| `OPERATIONS_INTERNAL_ERROR`                                 | 500  | Ошибка формирования `GET /api/v1/operations`.                                         |

### 9.3 Предупреждения `warnings` (не ошибки)

Только при успехе и **`availability: beta`** на gateway. Минимум одна запись с кодом **`GATEWAY_OP_BETA_UNSTABLE`** и фиксированным русским `message`.

---

## 10. Успех, `warnings`, корреляция

- **`requestId`:** UUID v4 от gateway; дублируется в заголовке **`X-Gateway-Request-Id`**. SDK кладёт в результат то, что извлек `extractRequestId` (сначала поле в JSON, иначе заголовок).
- **`gatewayHttpStatus`:** реальный HTTP-статус ответа gateway; при сетевой ошибке до ответа — `0`.
- **`data`:** полезная нагрузка успешного вызова после нормализации gateway; тип на стороне SDK — `unknown`.

---

## 11. Примеры

### 11.1 Сервер: успешный GET

```typescript
import { invoke } from '../lib/gateway/gatewayClient'

const r = await invoke(ctx, {
  op: 'getUserFields',
  args: {}
})
if (r.ok) {
  // r.data — ответ GC через gateway
  const rid = r.requestId
} else {
  // r.error.code, r.error.message, r.error.details?
}
```

### 11.2 Сервер: POST с явным методом (новый `op` ещё не в зеркале)

```typescript
const r = await invoke(ctx, {
  op: 'someNewOp',
  args: { foo: 'bar' },
  httpMethod: 'POST'
})
```

### 11.3 Список операций для админки / агента

```typescript
import { getOperationsCatalog } from '../lib/gateway/gatewayClient'

const cat = await getOperationsCatalog(ctx)
if (cat.ok) {
  const { catalogSchemaVersion, operations } = cat.catalog
  for (const op of operations) {
    // op.op, op.httpMethod, op.contour, op.availability, op.argsSchema
  }
}
```

### 11.4 Обработка типичных кодов

```typescript
const r = await invoke(ctx, { op: 'getDealFields', args: { dealId: 1 } })
if (!r.ok) {
  switch (r.error.code) {
    case 'SDK_NOT_CONFIGURED':
      // подсказать настроить админку
      break
    case 'SDK_OP_HTTP_METHOD_UNKNOWN':
      // добавить op в v1OpsList или передать httpMethod
      break
    case 'INVOKE_ARGS_SCHEMA_VIOLATION':
      // показать r.error.details?.errors пользователю-админу без сырых секретов
      break
    case 'INVOKE_GC_TIMEOUT':
      // предложить повтор позже (ретрай на стороне приложения)
      break
    default:
      // логировать r.error.code + r.requestId, не логировать ключ
      break
  }
}
```

### 11.5 Вызов фасада (другой сервис под тем же аккаунтом Admin)

`POST .../api/gateway/invoke` с телом:

```json
{
  "op": "getAllGroups",
  "args": {}
}
```

Ответ — тот же JSON-объект, что вернул бы `invoke` внутри процесса.

---

## 12. Паттерны и антипаттерны

### Паттерны

1. Проверка настроек до вызова или явная обработка `SDK_NOT_CONFIGURED`.
2. Явный `httpMethod` для новых `op`, пока не обновлён `v1OpsList.generated.ts`.
3. Проброс `requestId` в логи прикладного сценария.
4. Цепочка `api/*` → `lib/*` → `invoke` без ручной сборки заголовков школы.
5. Для Vue: только `SDK_GATEWAY_SETTING_KEYS` из `shared/sdkSettingKeys.ts`, не импорт серверных `lib` с секретами.

### Антипаттерны

1. Вызов gateway из браузера с `X-Gc-School-Api-Key`.
2. Импорт `lib/gateway/gatewayClient.ts` в клиентский бандл Vue.
3. Угадывание GET/POST без записи в снимке и без `httpMethod`.
4. Логирование `gc_school_api_key`, полных тел GC, `Authorization`.
5. Хардкод абсолютных URL приложения SDK для внутренней навигации — использовать `withProjectRoot(route.url())` из `config/routes.tsx`.

---

## 13. Чеклист при изменении контракта gateway

- [ ] Синхронизированы снимки списка `op` и HTTP-методов: зеркало `shared/v1OpsList.generated.ts` в этом проекте и соответствующий артефакт в приложении gateway; при необходимости обновлено приложение A в этом файле.
- [ ] `shared/gatewayHttpHeaders.ts` совпадает с gateway.
- [ ] Прогнены интеграционные проверки к gateway при смене URL/операций.
- [ ] Обновлены `docs/api.md` / этот файл при смене фасадов или констант.

---

## 14. Индекс файлов (внутри проекта SDK)

| Вопрос                             | Файл                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| Реализация клиента                 | `lib/gateway/gatewayClient.ts`                       |
| Префиксы URL, таймаут              | `lib/gateway/constants.ts`                           |
| Ключи Heap                         | `shared/sdkSettingKeys.ts`, `lib/settings.lib.ts`    |
| Локальный список `op` + HTTP-метод | `shared/v1OpsList.generated.ts`                      |
| Заголовки HTTP                     | `shared/gatewayHttpHeaders.ts`                       |
| Фасады Admin                       | `api/gateway/invoke.ts`, `api/gateway/operations.ts` |
| Роуты проекта                      | `config/routes.tsx`                                  |
| HTTP-роуты целиком                 | `docs/api.md`                                        |
| Таблицы Heap                       | `docs/data.md`                                       |
| Слои приложения                    | `docs/architecture.md`                               |

---

## Приложение A. Полный справочник полей `args` по каждому `op`

Здесь перечислены **все поддерживаемые имена полей** объекта `args` для `invoke(ctx, { op, args })` и для поля `args` в теле `POST api/gateway/invoke`. Снимок согласован со схемами валидации gateway: автогенерируемый набор `V1_OP_ARGS_SCHEMAS` плюс ужесточённая схема для `addUser` (обязателен путь `params.user.email`). **Версия снимка (дата фиксации в доке):** 06-05-2026.

**Типы:** строка, число, логическое, массив чисел, массив строк, произвольный JSON — в смысле JSON, который сериализует SDK. **опц.** — поле можно не передавать.

**Legacy POST (`addUser`, `createDeal`):** в `args` передаётся объект с полем `params`. Значения `action` и форма `key` для запроса к GetCourse подставляет gateway (клиент SDK уже передал ключ школы в заголовке `X-Gc-School-Api-Key`).

**Legacy GET (экспорт):** query-параметр `key` к школе подставляет gateway из заголовка ключа школы; в `args` ключ `key` **не передаёт**. Для `exportGroupUsers` в `args` обязателен `groupId`. Для `getExportResult` — `exportId`.

---

### A.1. `setUri`

| Поле              | Тип    | Обязательность |
| ----------------- | ------ | -------------- |
| `uri`             | строка | да             |
| `event_id`        | число  | да             |
| `event_object_id` | число  | да             |

### A.2. `getAllGroups`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.3. `getAllPersonalManagers`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.4. `getTrainings`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.5. `addCommentToDeal`

| Поле     | Тип    | Обязательность |
| -------- | ------ | -------------- |
| `dealId` | число  | да             |
| `userId` | число  | да             |
| `text`   | строка | да             |

### A.6. `addDealPositions`

| Поле        | Тип                                                                                   | Обязательность |
| ----------- | ------------------------------------------------------------------------------------- | -------------- |
| `dealId`    | число                                                                                 | да             |
| `positions` | массив объектов; в каждом элементе опционально `offerId`, `price`, `quantity` (числа) | да             |

### A.7. `getDealCalls`

| Поле     | Тип   | Обязательность |
| -------- | ----- | -------------- |
| `dealId` | число | да             |

### A.8. `getDealCancelReasons`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.9. `getDealComments`

| Поле     | Тип   | Обязательность |
| -------- | ----- | -------------- |
| `dealId` | число | да             |

### A.10. `getDealCustomFields`

| Поле     | Тип   | Обязательность |
| -------- | ----- | -------------- |
| `dealId` | число | да             |

### A.11. `getDealsTags`

| Поле     | Тип   | Обязательность |
| -------- | ----- | -------------- |
| `limit`  | число | опц.           |
| `offset` | число | опц.           |

### A.12. `getDealFields`

| Поле     | Тип   | Обязательность |
| -------- | ----- | -------------- |
| `dealId` | число | да             |

### A.13. `removeDealPositions`

| Поле          | Тип          | Обязательность |
| ------------- | ------------ | -------------- |
| `dealId`      | число        | да             |
| `positionIds` | массив чисел | да             |

### A.14. `updateDealFields`

| Поле                    | Тип          | Обязательность |
| ----------------------- | ------------ | -------------- |
| `dealId`                | число        | да             |
| `manager_user_id`       | число        | опц.           |
| `status`                | строка       | опц.           |
| `cancel_reason_comment` | число        | опц.           |
| `tags`                  | массив строк | опц.           |

### A.15. `addCommentToDialog`

| Поле          | Тип          | Обязательность |
| ------------- | ------------ | -------------- |
| `dialogId`    | число        | да             |
| `commentText` | строка       | да             |
| `transport`   | массив чисел | да             |
| `userId`      | число        | да             |

### A.16. `changeDepartment`

| Поле              | Тип   | Обязательность |
| ----------------- | ----- | -------------- |
| `dialogId`        | число | да             |
| `newDepartmentId` | число | да             |

### A.17. `closeDialog`

| Поле       | Тип   | Обязательность |
| ---------- | ----- | -------------- |
| `dialogId` | число | да             |

### A.18. `getDialogHistory`

| Поле       | Тип   | Обязательность |
| ---------- | ----- | -------------- |
| `dialogId` | число | да             |
| `limit`    | число | опц.           |

### A.19. `addCommentToLessonAnswer`

| Поле             | Тип    | Обязательность |
| ---------------- | ------ | -------------- |
| `lessonAnswerId` | число  | да             |
| `text`           | строка | да             |
| `userId`         | число  | да             |

### A.20. `changeStatusAnswers`

| Поле             | Тип    | Обязательность |
| ---------------- | ------ | -------------- |
| `lessonAnswerId` | число  | да             |
| `status`         | строка | да             |

### A.21. `getLessonAnswers`

| Поле       | Тип   | Обязательность |
| ---------- | ----- | -------------- |
| `lessonId` | число | да             |

### A.22. `addNote`

| Поле       | Тип    | Обязательность |
| ---------- | ------ | -------------- |
| `dialogId` | число  | да             |
| `text`     | строка | да             |

### A.23. `getOfferById`

| Поле      | Тип   | Обязательность |
| --------- | ----- | -------------- |
| `offerId` | число | да             |

### A.24. `getOffers`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.25. `getOffersTags`

| Поле     | Тип   | Обязательность |
| -------- | ----- | -------------- |
| `limit`  | число | опц.           |
| `offset` | число | опц.           |

### A.26. `addUserBalance`

| Поле      | Тип    | Обязательность |
| --------- | ------ | -------------- |
| `value`   | число  | да             |
| `type`    | число  | да             |
| `comment` | строка | да             |

### A.27. `addUserGroups`

| Поле     | Тип          | Обязательность |
| -------- | ------------ | -------------- |
| `groups` | массив чисел | да             |

### A.28. `createDiploma`

| Поле              | Тип        | Обязательность |
| ----------------- | ---------- | -------------- |
| `templateId`      | число      | да             |
| `number`          | строка     | опц.           |
| `trainingName`    | строка     | опц.           |
| `userName`        | строка     | опц.           |
| `allowDuplicates` | логическое | опц.           |

### A.29. `getUserAnswers`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.30. `getUserBalance`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.31. `getUserCustomFields`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.32. `getUserDeals`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.33. `getUserDiplomas`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.34. `getUserFields`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.35. `getUserGoalRecords`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.36. `getUserGroups`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.37. `getUserLessonAnswers`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.38. `getUserPurchases`

| Поле        | Тип    | Обязательность |
| ----------- | ------ | -------------- |
| `productId` | строка | опц.           |

### A.39. `getUserSchedule`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.40. `getUserTrainings`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.41. `getUserByTelegramChatId`

| Поле     | Тип   | Обязательность |
| -------- | ----- | -------------- |
| `chatId` | число | да             |

### A.42. `removeUserGroups`

| Поле     | Тип          | Обязательность |
| -------- | ------------ | -------------- |
| `groups` | массив чисел | да             |

### A.43. `setUserGroups`

| Поле     | Тип          | Обязательность |
| -------- | ------------ | -------------- |
| `groups` | массив чисел | да             |

### A.44. `setPersonalManager`

| Поле        | Тип   | Обязательность |
| ----------- | ----- | -------------- |
| `managerId` | число | да             |

### A.45. `updateUserCustomFields`

| Поле           | Тип               | Обязательность |
| -------------- | ----------------- | -------------- |
| `customFields` | произвольный JSON | да             |

### A.46. `updateUserFields`

| Поле         | Тип    | Обязательность |
| ------------ | ------ | -------------- |
| `gender`     | строка | опц.           |
| `country`    | строка | опц.           |
| `city`       | строка | опц.           |
| `first_name` | строка | опц.           |
| `last_name`  | строка | опц.           |
| `birthday`   | строка | опц.           |
| `comment`    | строка | опц.           |
| `phone`      | строка | опц.           |

Все поля в схеме опциональны: допустим вызов с `args: {}`; чтобы изменить профиль, передай хотя бы одно из полей.

### A.47. `addCommentToWebinar`

| Поле                  | Тип        | Обязательность |
| --------------------- | ---------- | -------------- |
| `moderatorId`         | число      | да             |
| `webinarId`           | число      | да             |
| `webinarLaunchNumber` | число      | опц.           |
| `text`                | строка     | да             |
| `isPrivateReply`      | логическое | опц.           |
| `replyToUserId`       | число      | опц.           |
| `replyToUserType`     | число      | опц.           |

### A.48. `getAllWebinars`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.49. `getWebinarsByIds`

| Поле  | Тип          | Обязательность |
| ----- | ------------ | -------------- |
| `ids` | массив чисел | да             |

### A.50. `moderateWebinarComment`

| Поле          | Тип    | Обязательность |
| ------------- | ------ | -------------- |
| `webinarId`   | число  | да             |
| `moderatorId` | число  | опц.           |
| `commentId`   | число  | да             |
| `action`      | строка | да             |

### A.51. `moderateWebinarUser`

| Поле                  | Тип    | Обязательность |
| --------------------- | ------ | -------------- |
| `webinarId`           | число  | да             |
| `webinarLaunchNumber` | число  | опц.           |
| `moderatorId`         | число  | опц.           |
| `userId`              | число  | да             |
| `userType`            | число  | да             |
| `action`              | строка | да             |

### A.52. `addUser`

| Поле     | Тип               | Обязательность |
| -------- | ----------------- | -------------- |
| `params` | произвольный JSON | да             |

На gateway для этой операции действует ужесточение: внутри `params` обязательно поле `user.email` (строка).

### A.53. `createDeal`

| Поле     | Тип               | Обязательность |
| -------- | ----------------- | -------------- |
| `params` | произвольный JSON | да             |

Внутри `params` — структура импорта сделки Legacy: объекты `user`, `deal` (в т.ч. `offer_code`, `offer_id`, `quantity`), при необходимости `system`, `session`.

### A.54. `exportUsers`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.55. `exportGroupUsers`

| Поле      | Тип   | Обязательность |
| --------- | ----- | -------------- |
| `groupId` | число | да             |

### A.56. `exportDeals`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.57. `exportPayments`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.58. `getCustomFields`

- **`args`:** `{}` (обязательных полей в схеме gateway нет).

### A.59. `getExportResult`

| Поле       | Тип   | Обязательность |
| ---------- | ----- | -------------- |
| `exportId` | число | да             |

---

_При смене контрактов gateway обнови приложение A в этом файле и зеркало `shared/v1OpsList.generated.ts` в репозитории SDK._

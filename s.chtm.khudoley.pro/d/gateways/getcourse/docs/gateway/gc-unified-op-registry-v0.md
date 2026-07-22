---
title: 'GetCourse: единый реестр op (v0)'
project_hash: 3fa7c2
type: specification
status: draft
date: 2026-05-04
tags:
  - project/chatium-gc-course
  - topic/getcourse
  - specification/op-registry
---

# GetCourse: единая спецификация контуров API и реестр `op` (v0)

**HTTP-метод, шаблон пути и ссылка на локальный OpenAPI** — в [gc-op-http-mapping.json](./gc-op-http-mapping.json).

**Версия:** v0 — реестр операций и контуры; тела запросов и схемы полей — в локальных `new_api_schema.json` / `legacy_api_schema.json` и при необходимости в официальном help/ReDoc; при обратно совместимом изменении полей **`op`** можно не менять.

---

## 1. Источники и их роль

| Источник                      | Где                                                  | Роль в спецификации                                                              |
| ----------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Локальный OpenAPI нового API  | [new_api_schema.json](./new_api_schema.json)         | Эндпоинты `pl/api/v1`, схемы тел, описание Bearer-токена.                        |
| Локальный OpenAPI Legacy      | [legacy_api_schema.json](./legacy_api_schema.json)   | Пути импорта/экспорта, форма `key` / `action` / `params`.                        |
| Маппинг `op` → HTTP           | [gc-op-http-mapping.json](./gc-op-http-mapping.json) | Метод, `pathTemplate`, контур `new` / `legacy`, связь с operationId в OpenAPI.   |
| Официальный новый API (ReDoc) | https://getcourse.ru/pl/postback/redoc               | Человекочитаемая сверка и обновления схемы для выгрузки в `new_api_schema.json`. |
| Официальный Legacy (help)     | https://getcourse.ru/help/api                        | Человекочитаемые поля импорта/экспорта и лимиты.                                 |

При расхождении между локальным OpenAPI и ответом продакшена GC при реализации gateway приоритет у **фактического поведения GC**; затем обновляют JSON в `docs/gateway/` (этот каталог) и при необходимости таблицы в этом файле. **Имена `op`** меняются только явным решением (новое имя или версия).

---

## 2. Правила нейминга `op` (зафиксировано)

1. **`op` = стабильный идентификатор в стиле `camelCase`:** глагол + сущность + уточнение при необходимости (`getUserFields`, `addCommentToDeal`, `exportUsers`). **Без** префикса `gc.` — префиксы версий gateway обсуждаются отдельно на уровне URL (`/v1/...`), а не внутри строки `op`.
2. **Новые операции** проекта, которых ещё нет в таблицах этого реестра, называются **в том же стиле** (примеры на будущее: `ensureUserByEmail`, `syncChatiumProfile`) — не вводить `snake_case` для публичного `op`.
3. **Контур выполнения** (`new` / `legacy`) — внутренняя метка gateway; клиент передаёт только `op` + `args`; выбор контура инкапсулирован на сервере.
4. **Обратная несовместимость `args`:** предпочтительно новое имя `op` или версия в имени только при крайней необходимости (см. [gateway-operation-manual](./gateway-operation-manual.md) про каталог и контракт `args`; отдельные ADR курса по тонкому клиенту ведутся вне этого репозитория).

---

## 3. Метка контура по операциям

| Метка    | Значение                                                                                                                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new`    | Операции Tech API под `pl/api/v1`. Реализация — по локальному [new_api_schema.json](./new_api_schema.json) и [gc-op-http-mapping.json](./gc-op-http-mapping.json).                                             |
| `legacy` | Импорт/экспорт и связанные GET под `pl/api`. Реализация — по [legacy_api_schema.json](./legacy_api_schema.json), [gc-op-http-mapping.json](./gc-op-http-mapping.json) и [help](https://getcourse.ru/help/api). |

---

## 4. Реестр `op` (v0)

Ниже — канонический перечень **`op`** проекта. Колонка **Контур** — метка gateway; HTTP-сведения — в [gc-op-http-mapping.json](./gc-op-http-mapping.json).

### 4.1 Вебхуки

| `op`     | Контур | Кратко (RU)                                  |
| -------- | ------ | -------------------------------------------- |
| `setUri` | new    | Установить URI для приёма событий (вебхуки). |

### 4.2 Общее

| `op`                     | Контур | Кратко (RU)                 |
| ------------------------ | ------ | --------------------------- |
| `getAllGroups`           | new    | Все группы пользователей.   |
| `getAllPersonalManagers` | new    | Все персональные менеджеры. |
| `getTrainings`           | new    | Все тренинги.               |

### 4.3 Заказы (deals)

| `op`                   | Контур | Кратко (RU)                       |
| ---------------------- | ------ | --------------------------------- |
| `getDealFields`        | new    | Поля заказа по ID.                |
| `getDealCustomFields`  | new    | Кастомные поля заказа.            |
| `getDealComments`      | new    | Комментарии к заказу.             |
| `getDealCalls`         | new    | Звонки по заказу.                 |
| `getDealCancelReasons` | new    | Причины отмены.                   |
| `getDealsTags`         | new    | Заказы с тегами (фильтры в args). |
| `addCommentToDeal`     | new    | Комментарий к заказу.             |
| `addDealPositions`     | new    | Добавить позиции в заказ.         |
| `removeDealPositions`  | new    | Удалить позиции из заказа.        |
| `updateDealFields`     | new    | Обновить поля заказа.             |

### 4.4 Диалоги

| `op`                 | Контур | Кратко (RU)            |
| -------------------- | ------ | ---------------------- |
| `getDialogHistory`   | new    | История диалога.       |
| `addCommentToDialog` | new    | Комментарий в диалог.  |
| `changeDepartment`   | new    | Сменить отдел диалога. |
| `closeDialog`        | new    | Закрыть диалог.        |

### 4.5 Уроки

| `op`                       | Контур | Кратко (RU)                            |
| -------------------------- | ------ | -------------------------------------- |
| `getLessonAnswers`         | new    | Ответы на урок (опционально lessonId). |
| `addCommentToLessonAnswer` | new    | Комментарий к ответу на урок.          |
| `changeStatusAnswers`      | new    | Изменить статус ответа.                |

### 4.6 Заметки

| `op`      | Контур | Кратко (RU)        |
| --------- | ------ | ------------------ |
| `addNote` | new    | Заметка к диалогу. |

### 4.7 Предложения (offers)

| `op`            | Контур | Кратко (RU)           |
| --------------- | ------ | --------------------- |
| `getOffers`     | new    | Все предложения.      |
| `getOfferById`  | new    | Предложение по ID.    |
| `getOffersTags` | new    | Предложения с тегами. |

### 4.8 Пользователи

| `op`                      | Контур | Кратко (RU)                                |
| ------------------------- | ------ | ------------------------------------------ |
| `getUserFields`           | new    | Поля пользователя (userId / email и т.д.). |
| `getUserCustomFields`     | new    | Кастомные поля пользователя.               |
| `getUserDeals`            | new    | Заказы пользователя.                       |
| `getUserDiplomas`         | new    | Дипломы.                                   |
| `getUserGroups`           | new    | Группы пользователя.                       |
| `getUserBalance`          | new    | Баланс.                                    |
| `getUserPurchases`        | new    | Покупки.                                   |
| `getUserTrainings`        | new    | Тренинги пользователя.                     |
| `getUserSchedule`         | new    | Расписание.                                |
| `getUserGoalRecords`      | new    | Записи целей.                              |
| `getUserAnswers`          | new    | Ответы.                                    |
| `getUserLessonAnswers`    | new    | Ответы на уроки.                           |
| `getUserByTelegramChatId` | new    | Поиск пользователя по Telegram chat id.    |
| `addUserBalance`          | new    | Начислить баланс.                          |
| `addUserGroups`           | new    | Добавить в группы.                         |
| `removeUserGroups`        | new    | Удалить из групп.                          |
| `setUserGroups`           | new    | Установить состав групп.                   |
| `setPersonalManager`      | new    | Назначить персонального менеджера.         |
| `updateUserFields`        | new    | Обновить поля пользователя.                |
| `updateUserCustomFields`  | new    | Обновить кастомные поля.                   |
| `createDiploma`           | new    | Создать диплом.                            |

### 4.9 Вебинары

| `op`                     | Контур | Кратко (RU)                      |
| ------------------------ | ------ | -------------------------------- |
| `getAllWebinars`         | new    | Все вебинары.                    |
| `getWebinarsByIds`       | new    | Вебинары по списку ID.           |
| `addCommentToWebinar`    | new    | Комментарий в чат вебинара.      |
| `moderateWebinarComment` | new    | Модерация сообщения в чате.      |
| `moderateWebinarUser`    | new    | Модерация пользователя вебинара. |

### 4.10 Legacy (импорт / экспорт)

Использовать, когда задачи **нет** в новом контуре (создание пользователей/сделок через импорт, массовый экспорт). Лимиты Export API — см. [help](https://getcourse.ru/help/api) (часто оговаривается **100 запросов за 2 часа**).

| `op`               | Контур | Кратко (RU)                                                                      |
| ------------------ | ------ | -------------------------------------------------------------------------------- |
| `addUser`          | legacy | Создать/обновить пользователя (импорт).                                          |
| `createDeal`       | legacy | Создать сделку (импорт).                                                         |
| `exportUsers`      | legacy | Экспорт пользователей (асинхронно; опрос результата по идентификатору экспорта). |
| `exportGroupUsers` | legacy | Экспорт пользователей группы.                                                    |
| `exportDeals`      | legacy | Экспорт сделок.                                                                  |
| `exportPayments`   | legacy | Экспорт платежей.                                                                |
| `getCustomFields`  | legacy | Доп. поля аккаунта (справочник; см. Legacy OpenAPI).                             |
| `getExportResult`  | legacy | Результат экспорта по ID (ручной режим).                                         |

---

## 5. Связь Legacy `op` с официальным help

Канон путей и параметров — [legacy_api_schema.json](./legacy_api_schema.json) и [gc-op-http-mapping.json](./gc-op-http-mapping.json). Для текстовых пояснений структуры **`params`** (после base64):

- **`addUser`** — раздел «Импорт пользователей» в [help](https://getcourse.ru/help/api).
- **`createDeal`** — «Импорт заказов» в [help](https://getcourse.ru/help/api).
- Экспорты — разделы экспорта в help; лимиты — там же.

---

## 6. Связь операций `new` с локальной схемой

Для каждого `op` с меткой `new` gateway использует строку в [gc-op-http-mapping.json](./gc-op-http-mapping.json) и соответствующую операцию в [new_api_schema.json](./new_api_schema.json). [ReDoc](https://getcourse.ru/pl/postback/redoc) — для выгрузки обновлений схемы в локальный JSON при изменениях на стороне GC.

---

## 7. Ошибки (ориентир для gateway)

Ответы GC по новому API и Legacy имеют разный JSON; на gateway целевой формат — **человекочитаемое сообщение + машинный код** (см. [gateway-operation-manual](./gateway-operation-manual.md) §9). Детали кодов **`invoke`** — там же.

---

## 8. Следующие шаги (вне v0 текста)

1. При изменении официального API — обновить `new_api_schema.json` / `legacy_api_schema.json` и при необходимости [gc-op-http-mapping.json](./gc-op-http-mapping.json).
2. Подмножество `op` под **четыре опорных сценария эфира** — вести от продуктовых материалов курса (демо до эфира, спецификация после эфира) вне этого репозитория и зафиксировать минимальные `args` при первой продуктовой итерации; при желании вынести в отдельный `op-args-webinar-subset.md` в `docs/gateway/`.
3. Версионировать этот файл: `gc-unified-op-registry-v1.md` при добавлении операций или при массовом изменении контуров.

---

## Связанные материалы

- Официальные источники GetCourse: [ReDoc нового API](https://getcourse.ru/pl/postback/redoc), [help Legacy API](https://getcourse.ru/help/api) (см. §1).
- [gateway-operation-manual](./gateway-operation-manual.md) — SSOT gateway.
- [gc-op-http-mapping.json](./gc-op-http-mapping.json)
- [docs/architecture.md](../architecture.md) — архитектура приложения в репозитории.
- ADR курса по стабильности тонкого клиента и каталогу `op`/`args` (вне репозитория) дополняют [gateway-operation-manual](./gateway-operation-manual.md) и [docs/ADR/](../ADR/).

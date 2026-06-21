# Локальная модель данных (Heap)

Даже в упрощённой архитектуре локальное хранилище в Chatium **обязательно**. Реализация — таблицы в `tables/`, доступ с сервера, репозитории в `repos/`. Точные имена таблиц платформы (префиксы `t__...`) задаются при создании схемы; ниже — логические имена и поля.

Индексы, уникальные ограничения (`gc_order_id`, `lava_contract_id`, `dedupe_key`) и использование типа `Money` для сумм — фиксируются при реализации и при необходимости в отдельном ADR.

## 13.1. Таблица `lava_payment_contract`

| Поле               | Тип                     | Описание                   |
| ------------------ | ----------------------- | -------------------------- |
| `id`               | uuid                    | Внутренний ID записи       |
| `gc_order_id`      | string                  | ID заказа GetCourse        |
| `gc_user_id`       | string/null             | ID пользователя GetCourse  |
| `lava_contract_id` | string                  | ID контракта Lava          |
| `lava_product_id`  | string                  | Технический продукт        |
| `lava_offer_id`    | string                  | Технический оффер          |
| `amount`           | decimal(12,2) или Money | Сумма заказа               |
| `currency`         | string                  | Валюта                     |
| `buyer_email`      | string                  | Email покупателя           |
| `payment_url`      | string                  | Ссылка на оплату           |
| `status`           | string                  | Локальный статус контракта |
| `request_id`       | string/null             | Корреляционный ID          |
| `created_at`       | datetime                | Создание записи            |
| `updated_at`       | datetime                | Обновление записи          |

## 13.2. Таблица `lava_webhook_event`

| Поле               | Тип           | Описание          |
| ------------------ | ------------- | ----------------- |
| `id`               | uuid          | Внутренний ID     |
| `event_type`       | string        | Тип webhook       |
| `lava_contract_id` | string        | ID контракта      |
| `payload_json`     | json          | Сырой payload     |
| `dedupe_key`       | string        | Ключ дедупликации |
| `processed`        | boolean       | Флаг обработки    |
| `processed_at`     | datetime/null | Время обработки   |
| `processing_error` | string/null   | Ошибка обработки  |
| `created_at`       | datetime      | Время приёма      |

## 13.3. Таблица `lava_runtime_lock_log` (опционально)

Аудит и диагностика блокировок.

| Поле            | Тип           | Описание                      |
| --------------- | ------------- | ----------------------------- |
| `id`            | uuid          | Внутренний ID                 |
| `lock_key`      | string        | Ключ блокировки               |
| `request_id`    | string/null   | Корреляционный ID             |
| `gc_order_id`   | string        | Заказ                         |
| `acquired_at`   | datetime      | Когда lock получен            |
| `released_at`   | datetime/null | Когда lock снят               |
| `result`        | string        | `success`, `timeout`, `error` |
| `error_message` | string/null   | Текст ошибки                  |

## Конфигурация

Параметры `lava_api_key`, `lava_product_id`, `lava_offer_id`, секрет webhook, URL и токен для callback в GetCourse могут храниться в существующей таблице **settings** (key-value) до выделения отдельной сущности.

См. также текущее описание Heap в [data.md](./data.md).

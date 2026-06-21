# Справка по API GetCourse (PL)

Полная сжатая спецификация для этой интеграции: **[reference/getcourse-pl-api-spec.md](./reference/getcourse-pl-api-spec.md)**.

Официальная документация GetCourse: [getcourse.ru/help/api](https://getcourse.ru/help/api).

**Кратко для потока Lava:** GetCourse вызывает Chatium за ссылкой на оплату ([integration-http-contracts.md](./integration-http-contracts.md)); Chatium после успешной оплаты может обновлять заказ через **`POST .../pl/api/deals`** с полями `action`, `key`, Base64-`params` — см. разделы 4–5 в `getcourse-pl-api-spec.md`.

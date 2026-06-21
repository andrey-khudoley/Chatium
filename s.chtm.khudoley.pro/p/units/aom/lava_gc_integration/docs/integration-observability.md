# Мониторинг, алерты, логирование

## 20. Метрики и алерты

Рекомендуемые метрики (реализация — `writeMetricEvent`, события workspace по `016-analytics-workspace.md`, либо внешняя система по вебхуку логов проекта):

| Метрика                               | Назначение                |
| ------------------------------------- | ------------------------- |
| `lava_payment_link_requests_total`    | Запросы ссылки на оплату  |
| `lava_payment_link_success_total`     | Успешные ссылки           |
| `lava_payment_link_error_total`       | Ошибки создания ссылки    |
| `lava_template_lock_wait_total`       | Ожидания lock             |
| `lava_template_lock_timeout_total`    | Таймауты lock             |
| `lava_update_offer_total`             | Обновления цены           |
| `lava_update_offer_error_total`       | Ошибки обновления цены    |
| `lava_contract_create_total`          | Созданные контракты       |
| `lava_contract_create_error_total`    | Ошибки создания контракта |
| `lava_webhook_received_total`         | Принятые webhook          |
| `lava_webhook_duplicate_total`        | Дубликаты webhook         |
| `lava_webhook_processing_error_total` | Ошибки обработки webhook  |

**Алерты минимум на:**

1. рост ошибок обновления цены;
2. рост ошибок создания контрактов;
3. частые таймауты lock;
4. рост необработанных webhook.

## 21. Логирование

**События:**

1. вход в обработчик `payment-link`;
2. попытка захвата lock;
3. успешный захват lock;
4. вызов обновления цены;
5. ответ Lava на обновление цены;
6. вызов создания контракта;
7. ответ Lava на создание контракта;
8. освобождение lock;
9. приём webhook;
10. callback в GetCourse.

**Поля в логах (без секретов):**

1. `requestId`;
2. `gcOrderId`;
3. `lavaContractId`;
4. `amount`;
5. `currency`.

В Chatium использовать `ctx.account.log()` и/или существующий `lib/logger.lib` (уровни, Heap-логи, админка).

### Debug-расследование инцидентов email (актуально с 31-03-2026)

Для инцидентов вида `Lava POST invoice: HTTP 400: Incorrect email to purchase` включено расширенное debug-логирование:

1. На входе `POST /api/integrations/lava/payment-link` логируются сырые и нормализованные email-данные:
   - `rawBuyerEmail`;
   - `buyerEmail`/`buyerEmailTrimmed`;
   - `buyerEmailLength`;
   - `buyerEmailEqualsTrimmed`;
   - `buyerEmailLowercase`;
   - `buyerEmailCharCodes`.
2. Перед исходящим `POST /api/v3/invoice` в Lava логируется сырой payload запроса:
   - `body` (как отправляется в Lava);
   - `emailRaw`;
   - `emailLowercase`;
   - `emailLength`;
   - `emailCharCodes`.

Это позволяет в одном расследовании доказуемо сверить «что пришло в Chatium» и «что ушло в Lava» без доступа к внешним трассировщикам.

# lp-unified-op-registry-v0 — реестр операций LifePay-gateway

> **Статус: указатель.** В исходном ваулте этот файл упоминался в `operation-manual.md`/`testing-strategy.md`/`implementation-plan.md` как «создаётся параллельно», но как отдельный документ **никогда не был написан**. Живой источник истины по каталогу операций — **код**:
>
> - `lib/gateway/operationsCatalog.ts` — SSOT валидации (`argsValidator` через `s` из `@app/schema`) и UI-схемы (`argsSchema`).
> - `shared/operationsCatalogShared.ts` — wire-форма (`OperationSummary`), отдаётся через `GET /v1/operations`.
>
> Перенесено в воркспэйс 24-05-2026. Таблица ниже — снимок состояния v0 на момент переноса (для навигации; при расхождении верить коду и `operation-manual.md` §3).

## Контуры (availability)

| Контур     | Статус     | Назначение                                                                                                                                                                      |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bills_v1` | `enabled`  | Старый API LifePay `POST https://api.life-pay.ru/v1/bill` с `method: "sbp"`. Основной путь интеграции (см. [ADR 0001 — LifePay API choice](../ADR/0003-lifepay-api-choice.md)). |
| `ecom_v1`  | `disabled` | ECOM API (`home.life-pay.ru`, `v1/invoices`). Резерв; активируется отдельным ADR при выгодных условиях эквайринга.                                                              |

## Операции v0 (контур `bills_v1`)

| `op`            | HTTP gateway                         | LifePay upstream    | Заголовки                   | Назначение                                                   |
| --------------- | ------------------------------------ | ------------------- | --------------------------- | ------------------------------------------------------------ |
| `createBill`    | `POST /v1/createBill`                | `POST /v1/bill`     | `X-Lp-Apikey`, `X-Lp-Login` | Создать счёт СБП, вернуть `paymentUrl`/QR.                   |
| `getBillStatus` | `GET /v1/getBillStatus?billNumber=…` | `GET` статуса счёта | `X-Lp-Apikey`, `X-Lp-Login` | Статус счёта (`initiated/success/pending/failed/cancelled`). |
| `cancelBill`    | `POST /v1/cancelBill`                | отмена счёта        | `X-Lp-Apikey`, `X-Lp-Login` | Отменить счёт.                                               |
| `operations`    | `GET /v1/operations`                 | —                   | не требуются                | Каталог операций (wire-форма) для UI.                        |

Детальные контракты, коды ошибок (`INVOKE_LP_*`), семантика статусов и маппинг полей — в [operation-manual.md](./operation-manual.md) (§2, §3, §10) и в базе знаний: [lifepay/api-contracts](../../../../../units/aayakovleva/project-docs/knowledge/lifepay/api-contracts.md).

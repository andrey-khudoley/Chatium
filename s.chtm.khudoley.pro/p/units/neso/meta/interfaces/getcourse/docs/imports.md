# Imports

## Rules

- `ctx` and `app` are global and are not imported.
- Vue files import only `shared/*` code marked for shared use.
- Heap tables and repositories stay server-side.
- Core broker is called only from `lib/broker/coreBrokerClient.lib.ts`.
- API handlers guard protected routes before doing work.

## Broker Boundary

The module does not import files from `p/units/neso/meta/core`. It calls core
through `@app/app.runAppFunction` using target app `p/units/neso/meta/core`.

## Import Graph

Граф зависимостей между слоями (→ = импортирует):

```
functions/checkout/process.ts
  → lib/checkout/processCheckoutSubmitted.lib
  → lib/logger.lib

lib/checkout/processCheckoutSubmitted.lib.ts
  → lib/logger.lib
  → lib/orders/orders.lib          (createOrder)
  → lib/broker/coreBrokerClient.lib (registerCoreBrokerSubscription,
                                     pollCoreBrokerDeliveries,
                                     ackCoreBrokerDeliveries,
                                     failCoreBrokerDeliveries)

lib/broker/coreBrokerClient.lib.ts
  → lib/logger.lib

lib/orders/orders.lib.ts
  → lib/broker/coreBrokerClient.lib (publishCoreBrokerEvent)
```

### Тесты

```
lib/tests/getcourseCheckoutSuite.ts
  → lib/checkout/processCheckoutSubmitted.lib (handle, process)
  → lib/broker/coreBrokerClient.lib           (_setRunAppFn, _resetRunAppFn)
  → gateway                                   (_setRequestFn, _resetRequestFn)

lib/tests/getcourseUnitSuite.ts
  → lib/checkout/processCheckoutSubmitted.lib (extractCheckoutPayload)

lib/tests/getcourseIntegrationSuite.ts
  → lib/tests/getcourseCheckoutSuite.ts       (подключён)
```

## Acyclic Check

Граф ориентирован и не содержит циклов. Проверка по слоям:

| Слой            | Импортирует                                    | Обратных зависимостей нет                       |
| --------------- | ---------------------------------------------- | ----------------------------------------------- |
| `functions/`    | `lib/checkout/`, `lib/logger.lib`              | lib/ на functions/ не ссылается                 |
| `lib/checkout/` | `lib/orders/`, `lib/broker/`, `lib/logger.lib` | orders/ и broker/ на lib/checkout/ не ссылаются |
| `lib/orders/`   | `lib/broker/`                                  | broker/ на lib/orders/ не ссылается             |
| `lib/broker/`   | `lib/logger.lib`                               | logger/ ни на что не ссылается                  |

Топологический порядок: `lib/logger.lib` ← `lib/broker/` ← `lib/orders/` ← `lib/checkout/` ← `functions/`.

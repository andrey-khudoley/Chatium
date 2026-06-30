# Карта спецификации `core` — слои и связи

Производный обзор зафиксированных решений. **Источник истины — [`spec.md`](spec.md)**; при расхождении приоритет за ним. Эта карта только визуализирует уже согласованное и не вводит новых правил.
Последнее обновление: 26-06-2026.

Слои (снизу вверх по абстракции):

- **Слой 0 — Методология и принципы** — как ведётся сама спецификация.
- **Слой 1 — Назначение и транспорт** — что такое `core` и как течёт событие.
- **Слой 2 — Хранилище (Heap)** — таблицы брокера.
- **Слой 3 — Бизнес-логика** — хэширование токена и регистрация модуля.
- **Открытые вопросы** — что ещё в проработке.

---

## Слой 0 — Методология и принципы

```mermaid
flowchart LR
  T["template_metaproject"] -. "образец" .-> S["spec.md · источник истины"]
  S ==> |"код меняется только после описания (§0)"| Code["Код core"]
```

- **spec-as-source (§0).** Редактировать код запрещено, пока изменение не описано в `spec.md`.
- **Связь с template.** Реализация списывается с `p/template_metaproject`, но им не является; при расхождении приоритет за спецификацией.
- **Словарь терминов.** Англоязычные термины — либо в словаре (если оправданы), либо переведены.
- **Состояние vs история.** На строке таблицы хранится только текущее состояние; история (вкл/выкл, регистрация) — отдельными событиями брокера.

---

## Слой 1 — Назначение и транспорт

`core` — серверное ядро BPM «FLOW» и брокер событий поверх Heap.

```mermaid
flowchart LR
  P["Модуль-производитель"] -->|"publish"| B(("core · брокер"))
  B -->|"push / callback · основной"| C["Модуль-потребитель"]
  C -. "polling · резерв" .-> B
  B <-->|"источник истины"| H[("Heap-журнал")]
```

- **Транспорт:** push/callback — основной канал; polling — резервный канал надёжности.
- **Гарантия:** at-least-once; потребитель обязан быть идемпотентным; порядок — best-effort по времени публикации.
- **Источник истины** о состоянии доставки — всегда Heap-журнал.

---

## Слой 2 — Хранилище (Heap)

### `BrokerModules` — реестр модулей (согласована)

| Поле | Назначение |
|------|-----------|
| `moduleKey` | Уникальный ключ модуля. Ключ upsert. |
| `displayName` | Имя для админ-диагностики. |
| `source` | `internal` / `external`. Проставляет гейтвей по каналу регистрации, не из тела запроса. |
| `allowedPublishTypes` | Белый список glob-паттернов публикаций. Пустой = запрет. |
| `allowedSubscribeTypes` | Белый список glob-паттернов подписок. Пустой = запрет. |
| `enabled` | Активность. Начальное значение по `source` (см. Слой 3). |
| `adminDisabled` | Админ-стоп, приоритет над `enabled`. История — в событиях. |
| `authTokenHash` | SHA-256 токена, выданного гейтвеем. Токен отдаётся модулю один раз. |
| `metadata` | Произвольные данные модуля. |

Системные поля Heap (добавляются автоматически, не объявляются): `id` — первичный ключ строки (идентичность модуля — по `moduleKey`, см. ADR-0001); `createdAt` / `updatedAt` — время создания строки / последнего upsert.

### Остальные таблицы — в проработке

```mermaid
flowchart LR
  M["BrokerModules ✓"]
  Co["BrokerContracts"]
  Su["BrokerSubscriptions"]
  Ev["BrokerEvents"]
  De["BrokerDeliveries"]
  Au["BrokerOpsAudit"]
  M -.-> Co
  M -.-> Su
  M -.-> Ev
  Ev -.-> De
  M -.-> Au
```

`BrokerContracts`, `BrokerSubscriptions`, `BrokerEvents`, `BrokerDeliveries`, `BrokerOpsAudit` — поля ещё не согласованы (пунктир = намеченная связь).

---

## Слой 3 — Бизнес-логика

### §5.1 Хэширование токена

- Настоящий **SHA-256** через `@npm/node-forge` (нативного `crypto` в Chatium нет).
- Вход: `broker-module-auth:<moduleKey>:<token>` (доменный префикс + привязка к модулю).
- **Не** FNV-1a: `authTokenHash` — граница доверия, 32-битный отпечаток к подбору не устойчив.

### §5.2 Регистрация модуля

```mermaid
sequenceDiagram
  participant M as Модуль
  participant G as Гейтвей (core)
  participant DB as BrokerModules (Heap)

  M->>G: registerModule(moduleKey, allowedPublish, allowedSubscribe)<br/>internal app.function / external POST /broker/register
  Note over G: source по каналу запроса<br/>app.function → internal<br/>app.html / HTTP → external
  G->>G: валидация заявки<br/>(синтаксис glob)
  G->>G: случайный токен → hash = SHA-256(...)
  G->>DB: upsert(source, authTokenHash, enabled)
  Note over DB: internal → enabled = true<br/>external → enabled = false + модерация
  G-->>M: token (один раз)
  Note over M,G: далее каждый вызов шлёт token → гейтвей сверяет hash
```

Хэш в БД при утечке рабочего креденциала не даёт: сравнивается хэш входящего токена, сам токен не хранится.

### §5.3 / §5.4 Обновление белых списков (черновик)

Смена `allowedPublishTypes` (§5.3, операция `updatePublishTypes` · `POST /broker/publish-types`) и `allowedSubscribeTypes` (§5.4, операция `updateSubscribeTypes` · `POST /broker/subscribe-types`) — отдельные операции, не ре-регистрация: `moduleKey` / `source` / токен неизменны. Создание — только `registerModule` (§5.2).

```mermaid
flowchart TB
  U["updatePublishTypes / updateSubscribeTypes<br/>(полная замена + токен)"] --> A{"токен ↔ authTokenHash?"}
  A -->|"нет"| X["отказ"]
  A -->|"да"| V["валидация: синтаксис glob"]
  V --> S{"source"}
  S -->|"internal"| AP["применить сразу"]
  S -->|"external · расширение"| MOD["enabled=false (ре-модерация);<br/>новый набор записан, модуль приостановлен"]
  S -->|"external · сужение"| AP
  AP --> EV["запись набора + событие-история"]
  MOD --> EV
```

- `source` берётся из строки, **не** переопределяется каналом (в отличие от регистрации).
- Пустой массив = право отозвано (publish / subscribe запрещены).

### §5.5 Удаление регистрации (черновик)

`deleteModule` (`POST /broker/delete`) — токен-гейт, только по существующей строке, **без модерации** (сокращение присутствия, не расширение прав). Строка удаляется, факт — событием-историей; `moduleKey` **освобождается** → можно занять заново через `registerModule`. Каскад на подписки/доставки — открытый вопрос (зависит от таблиц §3). Админ-снятие — это `adminDisabled`, не `deleteModule`.

Жизненный цикл: `registerModule` (create) → `updatePublishTypes` / `updateSubscribeTypes` (mutate) → `deleteModule` (remove, освобождает ключ).

### §5.6 Модерация (черновик)

**Админ-операции** (`requireAccountRole admin`, не токен модуля). Очередь = строки с `enabled = false` (только `external`); отдельной таблицы и pending-полей нет. Под модерацию попадают: первичная регистрация (§5.2) и ре-модерация после расширения типов (§5.3/§5.4). Идентификатор — `moduleKey`.

```mermaid
flowchart LR
  L["listPendingModeration<br/>where source=external, enabled=false"] --> Q[["приостановленные external-модули"]]
  Q --> AP["approveModeration → enabled=true<br/>(на текущем записанном наборе)"]
  Q --> DC["declineModeration<br/>первичная рег. → удаление, ключ свободен<br/>ре-модерация → остаётся enabled=false"]
  AP --> EV["событие-история"]
  DC --> EV
```

---

## Открытые вопросы (в проработке)

```mermaid
flowchart TB
  subgraph LIFE["Жизненный цикл"]
    B1["Ротация токена<br/>(ре-регистрация решена: запрет)"]
    B2["Полный флоу enabled / adminDisabled"]
    B3["Сверка токена в §5 / §7"]
    B4["Каскад deleteModule<br/>на подписки / доставки (§5.5)"]
  end
  subgraph TBL["Таблицы"]
    C1["Contracts · Subscriptions · Events"]
    C2["Deliveries · OpsAudit"]
  end
```

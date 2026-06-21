# chatium-schema

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-schema/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/041-schema.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-schema
description: Модуль @app/schema в Chatium — ZType, s, схемы Heap и валидация. Использовать для валидации body/параметров и типов Heap.
---

# chatium-schema

Схемы и типы, совместимые с Heap, и билдер `s`. Модуль `@app/schema`. Используется для валидации тел запросов, параметров роутов и структур Heap.

## Когда использовать

- Валидация body в API (.body(s => s.object({ ... })))
- Описание структур данных и типов Heap (ZObject, ZString, ZNumber и др.)
- Типизация полей и схем (ZType, ZMoney, ZStorageFile, ZJobRouteRef и т.д.)

## Основные экспорты

- **ZType<HS>** — базовый интерфейс типа схемы.
- **ZObject**, **ZString**, **ZNumber**, **ZBoolean**, **ZDate**, **ZEnum**, **ZMoney**, **ZStorageFile**, **ZRecord**, **ZTuple**, **ZLiteral**, **ZUndefined**, **ZAny**, **ZCurrency** — типы полей.
- **ZJobRouteRef**, **ZFuntionRouteRef** — ссылки на джоб/роут.
- **s** — билдер схем (SchemaBuilder) и namespace с конструкторами.

## Паттерны

- В роутах после **`app.post('/')`** / **`app.get('/')`**: **`.body(s => …)`** или **`.query(s => …)`**, затем **`.handle(async (ctx, req) => …)`** (см. **002-routing.md**, **chatium-api-endpoint**). Метода **`.result()`** в цепочке роутинга нет.
- Совместно с 008-heap и chatium-api-endpoint.

## Чеклист

- [ ] Импорт s или Z*-типов из @app/schema
- [ ] Схема **`.body()`** / **`.query()`** в API по контракту **002-routing** / **chatium-api-endpoint**
- [ ] При необходимости — отдельный пакет @app/validation (001-standards)

## Ссылки на документацию

- **041-schema.md** — @app/schema
- **008-heap.md** — Heap, таблицы
- **001-standards.md** — валидация

@chatium

# Модуль @app/schema: Схемы и типы Heap

Краткий справочник по модулю `@app/schema` — построение схем, совместимых с Heap (ZType, ZObject, ZString, ZNumber и др.) и билдер `s`. Типизация: `node_modules/@app/schema/index.d.ts`. В 001-standards упоминается валидация через Zod/@app/validation — при необходимости уточнять отдельный пакет validation.

## Содержание

- [Назначение](#назначение)
- [Основные экспорты](#основные-экспорты)
- [Связанные документы](#связанные-документы)

---

## Назначение

**@app/schema** — типы и билдер для описания структур данных и схем Heap: ZType, ZObject, ZString, ZNumber, ZBoolean, ZDate, ZEnum, ZMoney, ZStorageFile, ZRecord, ZTuple, ZLiteral, ZUndefined, ZAny, ZJobRouteRef, ZFuntionRouteRef и др. Билдер `s` и namespace `s` позволяют декларативно задавать схему с привязкой к HeapSchema.

---

## Основные экспорты

- **ZType<HS>** — базовый интерфейс типа схемы.
- **ZObject**, **ZString**, **ZNumber**, **ZBoolean**, **ZDate**, **ZEnum**, **ZMoney**, **ZStorageFile**, **ZRecord**, **ZTuple**, **ZLiteral**, **ZUndefined**, **ZAny**, **ZCurrency** — типы полей.
- **ZJobRouteRef**, **ZFuntionRouteRef** (опечатка в API) — ссылки на джоб/роут.
- **s** — билдер схем (SchemaBuilder) и namespace с конструкторами типов.

Используется для валидации и типизации тел запросов, параметров роутов и структур Heap. При описании структур Heap поля `id`, `createdAt`, `updatedAt` зарезервированы и в схему полей не включаются (см. [008-heap.md](008-heap.md)).

---

## Связанные документы

- [008-heap.md](008-heap.md) — Heap, таблицы, типы
- [001-standards.md](001-standards.md) — валидация (Zod / @app/validation)
- [025-app-modules.md](025-app-modules.md) — сводка по модулям @app

**Источник типов:** `node_modules/@app/schema/index.d.ts`

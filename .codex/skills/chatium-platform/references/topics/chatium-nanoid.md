# chatium-nanoid

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-nanoid/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/045-nanoid.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-nanoid
description: Модуль @app/nanoid в Chatium — accountNanoid, nanoid для генерации уникальных ID. Использовать для сущностей, токенов, ключей.
---

# chatium-nanoid

Генерация коротких уникальных строковых ID. Модуль `@app/nanoid`. Две области: привязанная к аккаунту (accountNanoid) и общая для приложения (nanoid / appNanoid).

## Когда использовать

- Уникальные id для записей Heap (если не используете авто-id)
- Токены, ключи, коды
- Внешние идентификаторы (external_id и т.п.)

## API

- **accountNanoid(ctxOrName)** — сгенерировать ID в области аккаунта. Принимает RichUgcCtx или строку (имя области).
- **nanoid** (appNanoid) — сгенерировать ID в области приложения.

Возвращаемое значение — строка, пригодная как уникальный идентификатор.

## Чеклист

- [ ] Импорт accountNanoid или nanoid из @app/nanoid
- [ ] accountNanoid при привязке к аккаунту; nanoid для глобальной уникальности
- [ ] Типы в node_modules/@app/nanoid/index.d.ts

## Ссылки на документацию

- **045-nanoid.md** — @app/nanoid
- **008-heap.md** — создание записей с id

# chatium-agent-tool

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-agent-tool/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/010-agents.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-agent-tool
description: Создаёт инструмент (tool) для AI-агента Chatium — app.function, meta, body, handle, регистрация через хук. Использовать при добавлении новых инструментов агента.
---

# chatium-agent-tool

Создаёт инструмент (tool) для AI-агента Chatium: `app.function`, meta, body, handle, регистрация через хук. Использовать при добавлении новых инструментов агента.

## Шаблон инструмента

```ts
export const myTool = app
  .function('/myToolName')
  .meta({ name: 'myToolName', description: 'Описание для LLM' })
  .body(s => s.object({
    context: s.object({ userId: s.string(), chainId: s.string() }),
    input: s.object({ query: s.string() })
  }))
  .handle(async (ctx, body) => {
    const { context, input } = body
    // логика инструмента
    return { result: '...' }
  })
```

## Регистрация (хук)

```ts
app.accountHook('@start/agent/tools', async (ctx, { agentId }) => {
  return [myTool]
})
```

## Паттерны и антипаттерны (010-agents.md)

- **Описание** (`meta.description`) должно быть понятным для LLM
- **Body:** всегда `context` + `input`
- Возвращать структурированный результат
- Обрабатывать ошибки (не бросать необработанные исключения)

## Чеклист

- [ ] `app.function('/name')` с уникальным путём
- [ ] `meta.name` и `meta.description` для LLM
- [ ] `.body()` с `context` и `input`
- [ ] `.handle()` с обработкой ошибок
- [ ] Регистрация в хуке `@start/agent/tools`

## Ссылки

- **010-agents.md** — создание инструментов, паттерны и антипаттерны
- **034-hooks.md** — хуки приложения

## Примеры

- `inner/samples/imported/instrument-dlya-ii-agenta-proverka-podpiski-na-kanal/`
- `inner/samples/imported/instrument-ii-otpravka-v-chat-tg/`
- `inner/samples/imported/sendposttochannel/`

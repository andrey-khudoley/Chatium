---
name: chatium-config
description: Конфигурация workspace в Chatium — readWorkspaceFile, updateWorkspaceFile, config.json. Использовать для настроек приложения.
---

# chatium-config

Чтение и запись файлов конфигурации на уровне workspace: `readWorkspaceFile`, `updateWorkspaceFile`, стандартный `config.json`. Только серверный код.

## Когда использовать

- Хранение настроек приложения (API-ключи, флаги, URL)
- Конфигурация интеграций
- Параметры, которые редко меняются
- Не для данных пользователей (использовать Heap) и не для частых изменений

## Чтение

```ts
import { readWorkspaceFile } from '@start/sdk'

const raw = await readWorkspaceFile(ctx, 'config.json') || '{}'
const config = JSON.parse(raw)
```

## Запись

```ts
import { updateWorkspaceFile } from '@start/sdk'

await updateWorkspaceFile(ctx, 'config.json', {
  source: JSON.stringify(newConfig, null, 2)
})
```

## Паттерны

- Типизировать config (интерфейс/тип) и парсить после чтения.
- Обрабатывать ошибки парсинга (try/catch, логирование через ctx.account.log()).
- Не хранить секреты в config.json без дополнительной защиты (следовать лучшим практикам платформы).

## Чеклист

- [ ] Чтение: readWorkspaceFile(ctx, 'config.json')
- [ ] Запись: updateWorkspaceFile(ctx, 'config.json', { source: string })
- [ ] Парсинг и валидация JSON
- [ ] Использование только на бэкенде (api/, jobs, hooks)

## Ссылки на документацию

- **013-config.md** — конфигурация, readWorkspaceFile, updateWorkspaceFile, типизация, лучшие практики

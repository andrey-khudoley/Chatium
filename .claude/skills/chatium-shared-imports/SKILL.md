---
name: chatium-shared-imports
description: Клиентский бандл Chatium — метка // @shared, запрет импорта lib/repos/tables из Vue; вынос констант в shared/. Использовать при правках pages/*.vue, компонентов админки, форм с ключами настроек.
---

# chatium-shared-imports

Предотвращение ошибки сборки: *«Module … exists, but does not have shared file mark»* при импорте серверного кода в клиентский бандл.

## Когда открывать скилл

- Редактируете `pages/*.vue`, клиентские компоненты, стили под `@shared`-страницей.
- Нужны строковые ключи Heap (`lava_api_key`, `project_name` и т.д.), enum-константы, хелперы без Heap для форм.
- После генерации кода с импортом `from '../lib/...'` в Vue.

## Правило платформы

| Слой | Что можно |
|------|-----------|
| Клиент (Vue, попадает в бандл с `@shared`) | Только модули с **`// @shared`** в первой строке (`shared/*.ts`), роуты API (`route.run`), `@app/socket` и др. разрешённые клиентские API. |
| Сервер | `lib/`, `repos/`, `tables/`, вызовы Heap, `logger.lib`. |

**Нельзя:** `import { SETTING_KEYS } from '../lib/settings.lib'` в Vue — `settings.lib` тянет репозиторий и логгер.

## Паттерн: ключи настроек

**1.** Файл `shared/fooSettingKeys.ts`:

```ts
// @shared
export const FOO_SETTING_KEYS = {
  FOO_API_KEY: 'foo_api_key',
  FOO_BASE_URL: 'foo_base_url',
} as const
```

**2.** В `lib/settings.lib.ts`: `import { FOO_SETTING_KEYS } from '../shared/fooSettingKeys'` и в объект `SETTING_KEYS` добавить `...FOO_SETTING_KEYS`.

**3.** В Vue: `import { FOO_SETTING_KEYS } from '../shared/fooSettingKeys'`.

Так строки остаются единственным источником на сервере и доступны клиенту легально.

**Утилиты без Heap** (нормализация URL, форматирование) — тоже в `shared/*.ts` с `// @shared`.

## Чеклист

- [ ] В изменённых Vue-файлах нет импорта из `lib/`, `repos/`, `tables/` (кроме явно помеченных `// @shared` файлов в этих папках — редкость).
- [ ] Новый общий код для клиента — файл в `shared/` с `// @shared`.
- [ ] Константы синхронизированы с `SETTING_KEYS` на сервере (spread из shared).

## Связанные материалы

- Платформенные ограничения Vue / Heap — см. `CLAUDE.md` §1 (Платформенные инварианты).
- Скилл: `chatium-vue-page` — страницы Vue; после правок импортов сверяться с этим скиллом.

## Примеры в проекте

- `shared/lavaSettingKeys.ts` + использование в `pages/AdminPage.vue` и `lib/settings.lib.ts` (проект `lava_gc_integration`).

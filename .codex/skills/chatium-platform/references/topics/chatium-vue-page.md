# chatium-vue-page

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-vue-page/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/007-vue.md; inner/docs/002-routing.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

# chatium-vue-page

## Description

Создаёт Vue-страницу или компонент для Chatium: Composition API, Tailwind, данные через SSR/fetch (не Heap на клиенте). Использовать при добавлении UI-страниц.

**Импорты клиента:** не тянуть `lib/`, `repos/`, `tables/` в Vue — только `shared/` с `// @shared` и вызовы `*.run(ctx)` у `@shared-route`. Подробно — скилл **chatium-shared-imports**, правило `.codex/skills/chatium-platform/references/rules.md#chatium-shared-imports.mdc`.

## Правила

- **Vue Composition API** — `<script setup lang="ts">`
- **Данные** — ТОЛЬКО через SSR props или fetch(); НИКОГДА не импортировать Heap/tables на клиенте
- **Импорты** — НЕ импортировать `lib/settings.lib` и аналоги в `pages/*.vue`; константы ключей — из `shared/*SettingKeys.ts` с `// @shared` (см. chatium-shared-imports)
- **Стили** — через `<style type="text/tailwindcss">`
- **Локальный tsconfig.json** — с `"extends"` на корневой

## Шаблон Vue-страницы

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
const props = defineProps<{ initialData: any }>()
const data = ref(props.initialData)
</script>
<template>
  <div class="min-h-screen bg-white">
    <!-- content -->
  </div>
</template>
<style type="text/tailwindcss">
/* tailwind styles */
</style>
```

## Шаблон серверного роута с SSR

```tsx
import jsx from '@app/html-jsx'
import { MyPage } from './pages/MyPage.vue'

export const route = app.html('/', async (ctx, req) => {
  const data = await SomeTable.findAll(ctx, { where: {...} })
  return (
    <html>
      <head>...</head>
      <body>
        <MyPage initialData={data} />
      </body>
    </html>
  )
})
```

## Чеклист

- [ ] Composition API (`<script setup>`)
- [ ] Данные через SSR props или fetch (не Heap на клиенте)
- [ ] Нет импорта серверных `lib/` / `repos/` / `tables/` — при константах см. chatium-shared-imports
- [ ] Tailwind для стилей
- [ ] Локальный tsconfig.json
- [ ] Серверный роут передаёт данные через props

## Ссылки на документацию

- **007-vue.md** — Vue в Chatium
- **001-standards.md** — стандарты кода
- **006-arch.md** — архитектура

## Примеры

- `inner/samples/imported/ai-agent-kak-chatgpt/pages/`
- `inner/samples/new_project/pages/`
- `tg/pa_sample/pages/ChatPage.vue`

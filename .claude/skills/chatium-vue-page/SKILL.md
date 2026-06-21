---
name: chatium-vue-page
description: Создаёт Vue-страницу или компонент для Chatium. Используйте при добавлении UI-страниц и компонентов.
---

# Vue-страницы и компоненты в Chatium

Руководство по созданию Vue-компонентов и страниц в соответствии со стандартами Chatium.

## Ключевые правила

- **Vue Composition API** — `<script setup lang="ts">`
- **Данные** — ТОЛЬКО через SSR props или fetch(); НИКОГДА не импортировать Heap/tables на клиенте
- **Импорты** — НЕ импортировать `lib/`, `repos/`, `tables/` в Vue; константы ключей — из `shared/*SettingKeys.ts` с `// @shared` (см. chatium-shared-imports)
- **Стили** — через `<style type="text/tailwindcss">`
- **Локальный tsconfig.json** — с `"extends"` на корневой (см. 007-vue.md)

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
import { jsx } from '@app/html-jsx'
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

## Использование @shared-route и .run()

Для загрузки данных из Vue компонента используйте роуты, помеченные `// @shared-route`, и вызывайте их через `.run(ctx)`:

```typescript
// api/products/list.ts (СЕРВЕР)
// @shared-route
import { Products } from '../../tables/products.table'

export const apiProductsListRoute = app.get('/', async (ctx, req) => {
  const products = await Products.findAll(ctx, { limit: 100 })
  return products
})
```

```vue
<!-- IndexPage.vue (КЛИЕНТ) -->
<script setup lang="ts">
declare const ctx: any

import { ref, onMounted } from 'vue'
import { apiProductsListRoute } from '../api/products/list'

const products = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    products.value = await apiProductsListRoute.run(ctx)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading">Загрузка...</div>
  <div v-else>
    <div v-for="product in products" :key="product.id">
      {{ product.name }}
    </div>
  </div>
</template>
```

### Типы вызовов

| Сценарий           | Синтаксис                                      |
| ------------------ | ---------------------------------------------- |
| GET без параметров | `route.run(ctx)`                               |
| GET с query        | `route.query({key: val}).run(ctx)`             |
| POST               | `route.run(ctx, {body})`                       |
| С path параметром  | `route({param: val}).run(ctx)`                 |
| Комбинированно     | `route({id}).query({filter}).run(ctx, {body})` |

**Важно:** `ctx` — это глобальная переменная, автоматически доступная в любом Vue компоненте. Не нужно её передавать через props.

## Критическое правило: Клиент vs Сервер

### ❌ ЧТО НЕЛЬЗЯ ДЕЛАТЬ В VUE:

1. **НЕЛЬЗЯ импортировать Heap таблицы:**

```vue
<!-- ❌ ОШИБКА -->
<script setup>
import { AnalyticsDatasets } from '../tables/datasets.table'
const datasets = await AnalyticsDatasets.findAll(ctx, {})
</script>
```

Heap таблицы работают только на сервере (.tsx файлы).

2. **НЕЛЬЗЯ использовать хардкод URL:**

```vue
<!-- ❌ ОШИБКА -->
<script setup>
async function saveData() {
  const response = await fetch('./dev/partnership/api/datasets/create')
}
</script>
```

3. **НЕЛЬЗЯ использовать `.run()` для НЕ-@shared-route маршрутов:**

Только маршруты с декоратором `@shared-route` доступны на клиенте.

### ✅ ЧТО НУЖНО ДЕЛАТЬ:

Данные должны поступать:
1. Через SSR props (загрузка на сервере)
2. Через `.run(ctx)` с `@shared-route` маршрутами
3. Через fetch() с URL, полученным на сервере через `withProjectRoot(route.url())`

## Работа с событиями и шаблонами

### Типовая ошибка: $event vs e

В шаблоне Vue в инлайновом выражении используйте **`$event`**, не `e`:

```vue
<!-- ✅ ПРАВИЛЬНО -->
<template>
  <input @input="setValue($event.target.value)" />
</template>

<!-- ❌ НЕПРАВИЛЬНО -->
<template>
  <input @input="setValue(e.target.value)" />
</template>
```

Ошибка: `TypeError: element is not a function`.

### Критично: inline-выражения не являются полным TypeScript

В выражениях шаблона (`@click="..."`, `:class="..."`, `{{ ... }}`) нельзя использовать TypeScript синтаксис:

```vue
<!-- ❌ НЕПРАВИЛЬНО (приведение типа) -->
<template>
  <input @input="onTitle(row, ($event.target as HTMLInputElement).value)" />
</template>

<!-- ✅ ПРАВИЛЬНО -->
<template>
  <input @input="onTitleInputEvent(row, $event)" />
</template>

<script setup>
function onTitleInputEvent(row: Row, e: Event) {
  const t = e.target
  if (!(t instanceof HTMLInputElement)) return
  onTitle(row, t.value)
}
</script>
```

Ошибка: `Unexpected token, expected ","`.

## Генерация ссылок

Всегда используйте роут-объекты, не хардкод:

```vue
<!-- ✅ ПРАВИЛЬНО -->
<template>
  <a :href="withProjectRoot(settingsRoute.url())">Настройки</a>
  <a :href="withProjectRoot(postRoute.url({ id: post.id }))">{{ post.title }}</a>
</template>

<script setup>
import { settingsRoute, postRoute } from '../routes'
import { withProjectRoot } from '../config/routes'
</script>

<!-- ❌ НЕПРАВИЛЬНО - НИКОГДА ТАК НЕ ДЕЛАЙТЕ! -->
<template>
  <a :href="'./settings'">Настройки</a>
</template>
```

## tsconfig.json для Vue-модулей

При использовании Vue-компонентов в модуле создайте локальный `tsconfig.json`:

```json
{
  "extends": "../../../../tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "jsx": "preserve",
    "strict": false,
    "noUncheckedIndexedAccess": false
  },
  "include": ["**/*.ts", "**/*.tsx", "**/*.vue"],
  "exclude": ["node_modules"]
}
```

**Важно:** Путь в `"extends"` должен вести к корневому tsconfig.json. При переносе модуля обновите количество `../`.

## Чеклист

- [ ] Composition API (`<script setup>`)
- [ ] Данные через SSR props или fetch (не Heap на клиенте)
- [ ] Нет импорта серверных `lib/` / `repos/` / `tables/` — при константах см. chatium-shared-imports
- [ ] Tailwind для стилей
- [ ] Локальный tsconfig.json
- [ ] Серверный роут передаёт данные через props
- [ ] Все внутренние ссылки используют роут-объекты + `withProjectRoot()`
- [ ] Нет хардкода URL
- [ ] В шаблоне используется `$event`, не `e`
- [ ] Нет TypeScript синтаксиса в inline-выражениях шаблона

## Ссылки на документацию

- **007-vue.md** — Vue в Chatium (полная документация)
- **006-arch.md** — архитектура и структура проекта
- **001-standards.md** — стандарты кода
- **chatium-shared-imports** — правила импортов для клиента
- **chatium-security** — CSRF защита

## Примеры

- `inner/samples/imported/ai-agent-kak-chatgpt/pages/`
- `inner/samples/new_project/pages/`
- `tg/pa_sample/pages/ChatPage.vue`

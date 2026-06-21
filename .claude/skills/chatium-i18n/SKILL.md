---
name: chatium-i18n
description: Интернационализация в Chatium — ctx.t(), ctx.lang, YAML-файлы переводов, плюралы. Использовать при мультиязычных приложениях.
---

# chatium-i18n

Переводы и мультиязычность: `ctx.t()` для перевода по ключу, `ctx.lang` для текущего языка, переводы в YAML (`*.lang.yml`). Использовать при добавлении локализации.

## Когда использовать

- Мультиязычный интерфейс (страницы, кнопки, сообщения)
- Переводы в API-ответах и уведомлениях
- Плюралы и формы слов (1 файл / 5 файлов)
- Переключение языка пользователем

## Основные API

- **ctx.lang** — текущий язык ('ru', 'en' и т.д.)
- **ctx.t(key)** — перевод по ключу
- **ctx.t(key, params)** — перевод с подстановкой параметров
- **ctx.t(key, fallback)** — значение по умолчанию при отсутствии ключа

```ts
const title = ctx.t('page.title')
const greeting = ctx.t('welcome.name', { name: user.name })
const text = ctx.t('missing.key', 'Default text')
```

## Файлы переводов

- YAML-файлы с расширением `*.lang.yml` в workspace
- Вложенные ключи через точку: `page.title`, `welcome.message`
- Настройка workspace для путей к файлам переводов

Пример структуры файла (lang/ru.yml):

```yaml
page:
  title: 'Главная страница'
  subtitle: 'Добро пожаловать'

welcome:
  message: 'Привет, {{name}}!'
  button: 'Начать'

cart:
  empty: 'Корзина пуста'
  count: '{{count}} товар|{{count}} товара|{{count}} товаров'
```

## Паттерны

- **В Vue**: использовать `ctx.t()` в template и script (ctx доступен глобально).
- **На бэкенде**: `ctx.t()` в роутах и джобах для сообщений и писем.
- **Плюралы**: отдельные ключи или параметр count с формой в YAML (для русского: `|` разделяет три формы, для английского: две формы).

## Использование в Vue компонентах

```vue
<template>
  <div>
    <h1>{{ ctx.t('page.title') }}</h1>
    <p>{{ ctx.t('welcome.message', { name: userName }) }}</p>
    <button>{{ ctx.t('welcome.button') }}</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const userName = computed(() => ctx.user?.displayName || 'Guest')
</script>
```

## Использование на бэкенде

```typescript
// В API роутах
export const apiGreetingRoute = app.get('/greeting', async (ctx, req) => {
  const userName = req.query.name || 'Guest'
  
  return {
    message: ctx.t('welcome.message', { name: userName }),
    language: ctx.lang
  }
})

// В отложенных задачах
const notificationJob = app.job('/send-notification', async (ctx, params) => {
  const message = ctx.t(`notifications.${params.type}`, {
    name: params.name
  })
  
  await sendNotification(ctx, params.userId, message)
})
```

## Плюралы

Русский язык — три формы (0 товаров, 1 товар, 2-4 товара, 5+ товаров):

```yaml
items:
  count: '{{count}} товар|{{count}} товара|{{count}} товаров'
```

Английский язык — две формы (singular/plural):

```yaml
items:
  count: '{{count}} item|{{count}} items'
```

Использование с параметром count:

```typescript
ctx.t('items.count', { count: 5 }) // 5 товаров
ctx.t('items.count', { count: 1 }) // 1 товар
```

## Переключение языка

Язык определяется автоматически из настроек пользователя или браузера. Для ручной смены:

```typescript
// Обновление языка пользователя
await ctx.user.updateExtendedInfo(ctx, {
  lang: 'en'
})
```

API роут для смены языка:

```typescript
export const changeLanguageRoute = app.post('/change-language', async (ctx, req) => {
  const { language } = req.body
  
  if (!['ru', 'en'].includes(language)) {
    return {
      success: false,
      error: ctx.t('errors.invalidLanguage')
    }
  }
  
  await ctx.user.updateExtendedInfo(ctx, {
    lang: language
  })
  
  return { success: true }
})
```

## Чеклист

- [ ] Создать/обновить *.lang.yml с ключами в каталоге lang/
- [ ] Использовать ctx.t() вместо хардкода строк
- [ ] При необходимости — ctx.lang для условного вывода
- [ ] Параметры и fallback в ctx.t() где нужно
- [ ] Проверить плюралы для всех языков (особенно русский)
- [ ] Синхронизировать ключи между всеми языков-файлами

## Ссылки на документацию

- **011-i18n.md** — интернационализация, YAML, плюралы, переключение языка, лучшие практики

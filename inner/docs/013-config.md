@chatium

# Работа с файлами конфигурации в Chatium

Исчерпывающее руководство по чтению и записи файлов конфигурации (config.json) в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Чтение конфигурации](#чтение-конфигурации)
- [Запись конфигурации](#запись-конфигурации)
- [Практические примеры](#практические-примеры)
  - [Получение настроек](#получение-настроек)
  - [Обновление настроек](#обновление-настроек)
  - [Типизированная конфигурация](#типизированная-конфигурация)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**Файлы конфигурации** — JSON файлы для хранения настроек приложения на уровне workspace.

### Ключевые особенности

- **readWorkspaceFile** — чтение файла из workspace
- **updateWorkspaceFile** — запись файла в workspace
- **config.json** — стандартный файл конфигурации
- **Серверный код** — работа с файлами только на бэкенде

### Когда использовать

- ✅ Хранение настроек приложения
- ✅ Конфигурация интеграций
- ✅ Параметры, которые редко меняются
- ✅ Данные, которые нужны при инициализации
- ❌ Не используйте для данных пользователей (используйте Heap)
- ❌ Не используйте для частых изменений

---

## Чтение конфигурации

### readWorkspaceFile

Чтение файла из workspace.

```typescript
import { readWorkspaceFile } from '@start/sdk'

async function getConfig(ctx: app.Ctx) {
  const configRaw = (await readWorkspaceFile(ctx, 'config.json')) || '{}'

  try {
    const config = JSON.parse(configRaw)
    return config
  } catch (e: any) {
    ctx.account.log('Ошибка чтения config', {
      level: 'error',
      json: { error: e.message }
    })
  }

  return {}
}
```

**Использование**:

```typescript
export const getSettingsRoute = app.get('/settings', async (ctx, req) => {
  const config = await getConfig(ctx)

  return {
    success: true,
    settings: config
  }
})
```

---

## Запись конфигурации

### updateWorkspaceFile

Запись файла в workspace.

```typescript
import { updateWorkspaceFile } from '@start/sdk'

async function writeConfig(ctx: app.Ctx, config: any) {
  await updateWorkspaceFile(ctx, 'config.json', {
    source: JSON.stringify(config, null, 2)
  })

  ctx.account.log('Config обновлён', {
    level: 'info',
    json: { config }
  })

  return true
}
```

**Использование**:

```typescript
export const updateSettingsRoute = app.post('/settings/update', async (ctx, req) => {
  const { settings } = req.body

  await writeConfig(ctx, settings)

  return {
    success: true,
    message: 'Настройки сохранены'
  }
})
```

---

## Практические примеры

### Получение настроек

**API роут для получения конфигурации**:

```typescript
// api/config.ts
import { readWorkspaceFile } from '@start/sdk'

export const getConfigRoute = app.get('/config', async (ctx, req) => {
  const configRaw = (await readWorkspaceFile(ctx, 'config.json')) || '{}'

  try {
    const config = JSON.parse(configRaw)

    return {
      success: true,
      config
    }
  } catch (e: any) {
    ctx.account.log('Ошибка парсинга config', {
      level: 'error',
      json: { error: e.message }
    })

    return {
      success: false,
      error: 'Ошибка чтения конфигурации',
      config: {}
    }
  }
})
```

### Обновление настроек

**API роут для обновления конфигурации**:

```typescript
// api/config.ts
import { readWorkspaceFile, updateWorkspaceFile } from '@start/sdk'

export const updateConfigRoute = app.post('/config/update', async (ctx, req) => {
  const { key, value } = req.body

  // Читаем текущую конфигурацию
  const configRaw = (await readWorkspaceFile(ctx, 'config.json')) || '{}'
  let config = {}

  try {
    config = JSON.parse(configRaw)
  } catch (e: any) {
    ctx.account.log('Ошибка парсинга config', {
      level: 'error',
      json: { error: e.message }
    })
  }

  // Обновляем значение
  config[key] = value

  // Сохраняем
  await updateWorkspaceFile(ctx, 'config.json', {
    source: JSON.stringify(config, null, 2)
  })

  ctx.account.log('Config обновлён', {
    level: 'info',
    json: { key, value }
  })

  return {
    success: true,
    config
  }
})
```

### Типизированная конфигурация

**Определение типа конфигурации**:

```typescript
// shared/config.ts

export type AppConfig = {
  telegram: {
    botToken: string
    channelId: string
  }
  email: {
    from: string
    replyTo: string
  }
  features: {
    notifications: boolean
    analytics: boolean
  }
  apiKeys: {
    openai: string
    stripe: string
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  telegram: {
    botToken: '',
    channelId: ''
  },
  email: {
    from: 'noreply@example.com',
    replyTo: 'support@example.com'
  },
  features: {
    notifications: true,
    analytics: false
  },
  apiKeys: {
    openai: '',
    stripe: ''
  }
}
```

**Типизированные функции чтения/записи**:

```typescript
// api/config.ts
import { readWorkspaceFile, updateWorkspaceFile } from '@start/sdk'
import { AppConfig, DEFAULT_CONFIG } from '../shared/config'

export async function getAppConfig(ctx: app.Ctx): Promise<AppConfig> {
  const configRaw = (await readWorkspaceFile(ctx, 'config.json')) || '{}'

  try {
    const config = JSON.parse(configRaw)

    // Мерджим с дефолтными значениями
    return {
      ...DEFAULT_CONFIG,
      ...config,
      telegram: { ...DEFAULT_CONFIG.telegram, ...config.telegram },
      email: { ...DEFAULT_CONFIG.email, ...config.email },
      features: { ...DEFAULT_CONFIG.features, ...config.features },
      apiKeys: { ...DEFAULT_CONFIG.apiKeys, ...config.apiKeys }
    }
  } catch (e: any) {
    ctx.account.log('Ошибка чтения config, использую дефолтные значения', {
      level: 'warn',
      json: { error: e.message }
    })

    return DEFAULT_CONFIG
  }
}

export async function updateAppConfig(
  ctx: app.Ctx,
  config: Partial<AppConfig>
): Promise<AppConfig> {
  // Читаем текущую конфигурацию
  const currentConfig = await getAppConfig(ctx)

  // Мерджим с новыми значениями
  const newConfig: AppConfig = {
    telegram: { ...currentConfig.telegram, ...config.telegram },
    email: { ...currentConfig.email, ...config.email },
    features: { ...currentConfig.features, ...config.features },
    apiKeys: { ...currentConfig.apiKeys, ...config.apiKeys }
  }

  // Сохраняем
  await updateWorkspaceFile(ctx, 'config.json', {
    source: JSON.stringify(newConfig, null, 2)
  })

  ctx.account.log('Config обновлён', {
    level: 'info',
    json: { config: newConfig }
  })

  return newConfig
}
```

**Использование типизированных функций**:

```typescript
// api/settings.ts
import { getAppConfig, updateAppConfig } from './config'

export const getSettingsRoute = app.get('/settings', async (ctx, req) => {
  const config = await getAppConfig(ctx)

  return {
    success: true,
    telegram: config.telegram,
    email: config.email,
    features: config.features
    // apiKeys не возвращаем для безопасности
  }
})

export const updateTelegramSettingsRoute = app.post('/settings/telegram', async (ctx, req) => {
  const { botToken, channelId } = req.body

  const newConfig = await updateAppConfig(ctx, {
    telegram: {
      botToken,
      channelId
    }
  })

  return {
    success: true,
    telegram: newConfig.telegram
  }
})
```

**Инициализация при старте**:

```typescript
// api/init.ts
import { getAppConfig } from './config'

export const initRoute = app.get('/init', async (ctx, req) => {
  const config = await getAppConfig(ctx)

  // Используем конфигурацию для инициализации
  if (config.telegram.botToken) {
    await initializeTelegramBot(ctx, config.telegram)
  }

  if (config.features.analytics) {
    await enableAnalytics(ctx)
  }

  return {
    success: true,
    message: 'Приложение инициализировано'
  }
})
```

---

## Лучшие практики

### Обработка ошибок

✅ **Всегда проверяйте парсинг JSON**:

```typescript
async function getConfig(ctx: app.Ctx) {
  const configRaw = (await readWorkspaceFile(ctx, 'config.json')) || '{}'

  try {
    return JSON.parse(configRaw)
  } catch (e: any) {
    ctx.account.log('Ошибка парсинга config', {
      level: 'error',
      json: { error: e.message, configRaw }
    })

    // Возвращаем дефолтные значения
    return {}
  }
}
```

### Значения по умолчанию

✅ **Предоставляйте дефолтные значения**:

```typescript
async function getConfig(ctx: app.Ctx) {
  const configRaw = (await readWorkspaceFile(ctx, 'config.json')) || '{}'

  const defaultConfig = {
    apiKey: '',
    enabled: false,
    timeout: 30000
  }

  try {
    const config = JSON.parse(configRaw)
    return { ...defaultConfig, ...config }
  } catch {
    return defaultConfig
  }
}
```

### Валидация

✅ **Валидируйте входные данные**:

```typescript
export const updateConfigRoute = app.post('/config/update', async (ctx, req) => {
  const { apiKey } = req.body

  // Валидация
  if (!apiKey || typeof apiKey !== 'string') {
    return {
      success: false,
      error: 'Некорректный API ключ'
    }
  }

  if (apiKey.length < 32) {
    return {
      success: false,
      error: 'API ключ слишком короткий'
    }
  }

  // Обновление
  await updateAppConfig(ctx, { apiKeys: { ...config.apiKeys, openai: apiKey } })

  return { success: true }
})
```

### Форматирование

✅ **Используйте читабельное форматирование**:

```typescript
await updateWorkspaceFile(ctx, 'config.json', {
  source: JSON.stringify(config, null, 2) // 2 пробела для отступов
})
```

### Безопасность

✅ **Не возвращайте секреты в API**:

```typescript
export const getPublicSettingsRoute = app.get('/settings/public', async (ctx, req) => {
  const config = await getAppConfig(ctx)

  // Возвращаем только публичные настройки
  return {
    success: true,
    settings: {
      features: config.features,
      email: {
        from: config.email.from // Только публичные поля
      }
      // apiKeys НЕ возвращаем!
    }
  }
})
```

### Кеширование

✅ **Кешируйте для часто используемых настроек**:

```typescript
let cachedConfig: AppConfig | null = null
let cacheTime = 0
const CACHE_TTL = 60000 // 1 минута

async function getCachedConfig(ctx: app.Ctx): Promise<AppConfig> {
  const now = Date.now()

  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig
  }

  cachedConfig = await getAppConfig(ctx)
  cacheTime = now

  return cachedConfig
}

// Сброс кеша при обновлении
async function updateAppConfigWithCache(
  ctx: app.Ctx,
  config: Partial<AppConfig>
): Promise<AppConfig> {
  const newConfig = await updateAppConfig(ctx, config)

  // Сбрасываем кеш
  cachedConfig = null

  return newConfig
}
```

---

## Связанные документы

- **008-heap.md** — Для хранения данных пользователей
- **002-routing.md** — API роуты для работы с конфигурацией
- **001-standards.md** — Стандарты кодирования

---

**Версия**: 1.0  
**Дата**: 2025-11-03  
**Последнее обновление**: Создание инструкции по работе с конфигурацией

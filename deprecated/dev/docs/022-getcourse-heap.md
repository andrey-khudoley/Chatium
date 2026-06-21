# Heap.Table() - Создание таблиц через TypeScript API в Chatium для GetCourse

**⚠️ КРИТИЧЕСКИ ВАЖНО: Эта документация описывает метод создания таблиц через `Heap.Table()` в TypeScript файлах. Это альтернатива JSON-файлам таблиц, описанным в 008-heap.md.**

Исчерпывающее руководство по созданию таблиц Heap через TypeScript API `Heap.Table()` в проектах Chatium для GetCourse. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Введение](#введение)
- [Базовый синтаксис Heap.Table()](#базовый-синтаксис-heaptable)
- [Структура определения таблицы](#структура-определения-таблицы)
- [Типы полей](#типы-полей)
  - [Heap.String() - строковые поля](#heapstring---строковые-поля)
  - [Heap.Number() - числовые поля](#heapnumber---числовые-поля)
  - [Heap.Boolean() - булевы поля](#heapboolean---булевы-поля)
  - [Heap.DateTime() - дата и время](#heapdatetime---дата-и-время)
  - [Heap.Any() - произвольные данные](#heapany---произвольные-данные)
  - [Heap.Optional() - опциональные поля](#heapoptional---опциональные-поля)
- [Опции полей](#опции-полей)
  - [customMeta - метаданные поля](#custommeta---метаданные-поля)
  - [searchable - настройки поиска](#searchable---настройки-поиска)
  - [defaultValue - значение по умолчанию](#defaultvalue---значение-по-умолчанию)
- [Полный пример таблицы](#полный-пример-таблицы)
- [Экспорт и типизация](#экспорт-и-типизация)
- [Использование таблиц](#использование-таблиц)
- [Частые ошибки](#частые-ошибки)
- [Сравнение с JSON-таблицами](#сравнение-с-json-таблицами)
- [Лучшие практики](#лучшие-практики)

---

## Введение

**Heap.Table()** — TypeScript API для программного создания таблиц Heap в Chatium. Этот метод позволяет определять таблицы непосредственно в TypeScript коде, что обеспечивает:

- ✅ Полную типизацию TypeScript
- ✅ Автодополнение в IDE
- ✅ Рефакторинг и переименование полей
- ✅ Экспорт типов для использования в коде
- ✅ Валидацию на этапе компиляции

### Когда использовать Heap.Table()

**✅ Используйте Heap.Table() когда:**

- Нужна полная типизация TypeScript
- Таблица создаётся программно или динамически
- Требуется экспорт типов для использования в коде
- Работаете в проектах GetCourse с автоматической генерацией таблиц

**❌ Используйте JSON-таблицы (008-heap.md) когда:**

- Таблица статична и не требует типизации
- Нужна простота определения через JSON
- Работаете с простыми структурами данных

---

## Базовый синтаксис Heap.Table()

**Минимальный пример**:

```typescript
import { Heap } from '@app/heap'

export const TableName = Heap.Table(
  'table_name', // Имя таблицы в базе данных
  {
    // Определение полей
    fieldName: Heap.FieldType(options)
  },
  {
    // Опции таблицы (опционально)
    customMeta: { title: 'Название таблицы', description: 'Описание' }
  }
)
```

**Ключевые параметры**:

1. **Первый параметр** (`'table_name'`) — имя таблицы в базе данных

   - Должно быть уникальным в рамках workspace
   - Рекомендуется использовать префикс проекта (например: `templates_eventhookmanager_...`)
   - Используйте snake_case для имён

2. **Второй параметр** (объект полей) — определение структуры таблицы

   - Каждое поле определяется через соответствующий тип Heap
   - Поля могут быть обязательными или опциональными

3. **Третий параметр** (опции таблицы, опционально) — метаданные таблицы
   - `customMeta` — заголовок и описание таблицы

---

## Структура определения таблицы

### Имя таблицы

Имя таблицы должно быть уникальным и следовать соглашениям:

```typescript
// ✅ Хорошо - с префиксом проекта
Heap.Table('templates_eventhookmanager_event_logs_O6Z', { ... })

// ✅ Хорошо - понятное имя
Heap.Table('t_metric_events_settings', { ... })

// ❌ Плохо - слишком короткое, может конфликтовать
Heap.Table('logs', { ... })

// ❌ Плохо - camelCase (используйте snake_case)
Heap.Table('eventLogs', { ... })
```

### Определение полей

Поля определяются как свойства объекта:

```typescript
export const MyTable = Heap.Table('my_table', {
  // Обязательное строковое поле
  name: Heap.String({
    customMeta: { title: 'Название' }
  }),

  // Опциональное числовое поле
  count: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Количество' }
    })
  ),

  // Булево поле со значением по умолчанию
  isActive: Heap.Boolean({
    customMeta: { title: 'Активен' },
    defaultValue: true
  })
})
```

---

## Типы полей

### Heap.String() - строковые поля

**Базовый синтаксис**:

```typescript
fieldName: Heap.String({
  customMeta: { title: 'Название поля' },
  searchable: { langs: ['ru', 'en'], embeddings: false },
  defaultValue: 'default value'
})
```

**Примеры**:

```typescript
export const UsersTable = Heap.Table('users', {
  // Простое строковое поле
  email: Heap.String({
    customMeta: { title: 'Email' }
  }),

  // С поиском (embeddings выключены по умолчанию)
  description: Heap.String({
    customMeta: { title: 'Описание' },
    searchable: {
      langs: ['ru', 'en'],
      embeddings: false // ✅ По умолчанию ВЫКЛЮЧЕНО
    }
  }),

  // С значением по умолчанию
  status: Heap.String({
    customMeta: { title: 'Статус' },
    defaultValue: 'pending'
  }),

  // Опциональное поле
  phone: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Телефон' }
    })
  )
})
```

**Опции Heap.String()**:

| Опция                   | Тип        | Описание                                   |
| ----------------------- | ---------- | ------------------------------------------ |
| `customMeta.title`      | `string`   | Отображаемое название поля                 |
| `searchable.langs`      | `string[]` | Языки для полнотекстового поиска           |
| `searchable.embeddings` | `boolean`  | Включить эмбеддинги (по умолчанию `false`) |
| `defaultValue`          | `string`   | Значение по умолчанию                      |

**⚠️ ВАЖНО**: Всегда отключайте `embeddings: false` по умолчанию. Включайте только при необходимости семантического поиска.

### Heap.Number() - числовые поля

**Базовый синтаксис**:

```typescript
fieldName: Heap.Number({
  customMeta: { title: 'Название поля' },
  defaultValue: 0
})
```

**Примеры**:

```typescript
export const ProductsTable = Heap.Table('products', {
  // Простое числовое поле
  price: Heap.Number({
    customMeta: { title: 'Цена' }
  }),

  // С значением по умолчанию
  quantity: Heap.Number({
    customMeta: { title: 'Количество' },
    defaultValue: 0
  }),

  // С поиском (для числовых полей редко используется)
  rating: Heap.Number({
    customMeta: { title: 'Рейтинг' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),

  // Опциональное поле
  discount: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Скидка (%)' }
    })
  )
})
```

**Опции Heap.Number()**:

| Опция                   | Тип        | Описание                              |
| ----------------------- | ---------- | ------------------------------------- |
| `customMeta.title`      | `string`   | Отображаемое название поля            |
| `searchable.langs`      | `string[]` | Языки для поиска (редко используется) |
| `searchable.embeddings` | `boolean`  | Эмбеддинги (по умолчанию `false`)     |
| `defaultValue`          | `number`   | Значение по умолчанию                 |

### Heap.Boolean() - булевы поля

**Базовый синтаксис**:

```typescript
fieldName: Heap.Boolean({
  customMeta: { title: 'Название поля' },
  defaultValue: false,
  searchable: { langs: ['ru', 'en'], embeddings: false }
})
```

**Примеры**:

```typescript
export const SettingsTable = Heap.Table('settings', {
  // Простое булево поле
  isActive: Heap.Boolean({
    customMeta: { title: 'Активен' }
  }),

  // Со значением по умолчанию
  notificationsEnabled: Heap.Boolean({
    customMeta: { title: 'Уведомления включены' },
    defaultValue: true
  }),

  // С поиском
  isPublic: Heap.Boolean({
    customMeta: { title: 'Публичный' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),

  // Опциональное поле
  isVerified: Heap.Optional(
    Heap.Boolean({
      customMeta: { title: 'Верифицирован' }
    })
  )
})
```

**Опции Heap.Boolean()**:

| Опция                   | Тип        | Описание                          |
| ----------------------- | ---------- | --------------------------------- |
| `customMeta.title`      | `string`   | Отображаемое название поля        |
| `searchable.langs`      | `string[]` | Языки для поиска                  |
| `searchable.embeddings` | `boolean`  | Эмбеддинги (по умолчанию `false`) |
| `defaultValue`          | `boolean`  | Значение по умолчанию             |

### Heap.DateTime() - дата и время

**Базовый синтаксис**:

```typescript
fieldName: Heap.DateTime({
  customMeta: { title: 'Название поля' },
  searchable: { langs: ['ru', 'en'], embeddings: false }
})
```

**Примеры**:

```typescript
export const EventsTable = Heap.Table('events', {
  // Простое поле даты
  createdAt: Heap.DateTime({
    customMeta: { title: 'Дата создания' }
  }),

  // С поиском
  eventDate: Heap.DateTime({
    customMeta: { title: 'Дата события' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),

  // Опциональное поле
  deletedAt: Heap.Optional(
    Heap.DateTime({
      customMeta: { title: 'Дата удаления' }
    })
  )
})
```

**Использование**:

```typescript
// Создание записи
await EventsTable.create(ctx, {
  eventDate: new Date(),
  createdAt: new Date('2025-12-01')
})

// Фильтрация
const upcomingEvents = await EventsTable.findAll(ctx, {
  where: {
    eventDate: { $gte: new Date() }
  }
})
```

**Опции Heap.DateTime()**:

| Опция                   | Тип        | Описание                          |
| ----------------------- | ---------- | --------------------------------- |
| `customMeta.title`      | `string`   | Отображаемое название поля        |
| `searchable.langs`      | `string[]` | Языки для поиска                  |
| `searchable.embeddings` | `boolean`  | Эмбеддинги (по умолчанию `false`) |

### Heap.Any() - произвольные данные

**Базовый синтаксис**:

```typescript
fieldName: Heap.Any()
// или
fieldName: Heap.Optional(Heap.Any())
```

**Примеры**:

```typescript
export const EventLogsTable = Heap.Table('event_logs', {
  // Произвольные данные (JSON объект)
  payload: Heap.Optional(Heap.Any()),

  // Метаданные события
  metadata: Heap.Optional(Heap.Any())
})
```

**Использование**:

```typescript
// Сохранение произвольных данных
await EventLogsTable.create(ctx, {
  payload: {
    eventType: 'user.created',
    userId: '123',
    data: {
      /* любые данные */
    }
  }
})
```

**⚠️ ВАЖНО**: `Heap.Any()` не поддерживает поиск и фильтрацию. Используйте только для хранения произвольных JSON данных.

### Heap.Optional() - опциональные поля

**Базовый синтаксис**:

```typescript
fieldName: Heap.Optional(Heap.FieldType(options))
```

**Примеры**:

```typescript
export const UsersTable = Heap.Table('users', {
  // Обязательное поле
  email: Heap.String({
    customMeta: { title: 'Email' }
  }),

  // Опциональное строковое поле
  phone: Heap.Optional(
    Heap.String({
      customMeta: { title: 'Телефон' }
    })
  ),

  // Опциональное числовое поле
  age: Heap.Optional(
    Heap.Number({
      customMeta: { title: 'Возраст' }
    })
  ),

  // Опциональное поле даты
  lastLoginAt: Heap.Optional(
    Heap.DateTime({
      customMeta: { title: 'Последний вход' }
    })
  ),

  // Опциональное произвольное поле
  metadata: Heap.Optional(Heap.Any())
})
```

**Использование**:

```typescript
// Можно не передавать опциональные поля
await UsersTable.create(ctx, {
  email: 'user@example.com'
  // phone, age, lastLoginAt не обязательны
})

// Или передать их
await UsersTable.create(ctx, {
  email: 'user@example.com',
  phone: '+1234567890',
  age: 25
})
```

**⚠️ ВАЖНО**: Все поля по умолчанию обязательны. Используйте `Heap.Optional()` для полей, которые могут отсутствовать.

---

## Опции полей

### customMeta - метаданные поля

**Назначение**: Предоставляет человекочитаемую информацию о поле.

**Синтаксис**:

```typescript
customMeta: {
  title: string // Отображаемое название поля
}
```

**Примеры**:

```typescript
export const ProductsTable = Heap.Table('products', {
  name: Heap.String({
    customMeta: { title: 'Название продукта' }
  }),

  price: Heap.Number({
    customMeta: { title: 'Цена (руб.)' }
  }),

  description: Heap.String({
    customMeta: { title: 'Описание товара' }
  })
})
```

**Использование**: `customMeta.title` используется в UI для отображения названий полей вместо технических имён.

### searchable - настройки поиска

**Назначение**: Включает полнотекстовый поиск по полю.

**Синтаксис**:

```typescript
searchable: {
  langs: string[],      // Языки для поиска: ['ru', 'en']
  embeddings: boolean   // ✅ По умолчанию false - ВЫКЛЮЧЕНО
}
```

**Примеры**:

```typescript
export const ArticlesTable = Heap.Table('articles', {
  // Поиск выключен (по умолчанию)
  title: Heap.String({
    customMeta: { title: 'Заголовок' }
    // searchable не указан = поиск выключен
  }),

  // Поиск включен, embeddings выключены (рекомендуется)
  content: Heap.String({
    customMeta: { title: 'Содержание' },
    searchable: {
      langs: ['ru', 'en'],
      embeddings: false // ✅ По умолчанию
    }
  }),

  // Поиск с embeddings (только при необходимости)
  semanticContent: Heap.String({
    customMeta: { title: 'Семантический контент' },
    searchable: {
      langs: ['ru'],
      embeddings: true // ⚠️ Только для семантического поиска
    }
  })
})
```

**⚠️ КРИТИЧЕСКИ ВАЖНО**:

- **По умолчанию `embeddings: false`** — всегда отключайте, если нет явной необходимости
- **Включайте `embeddings: true`** только для семантического поиска (поиск по смыслу, а не по словам)
- **Embeddings увеличивают нагрузку** и стоимость операций

**Когда включать embeddings**:

- ✅ Семантический поиск (поиск синонимов, близких по смыслу)
- ✅ Многоязычный поиск с автоматическим переводом смысла
- ❌ Обычный поиск по названиям, артикулам, именам
- ❌ Поиск по точным совпадениям

### defaultValue - значение по умолчанию

**Назначение**: Устанавливает значение поля при создании записи, если оно не указано.

**Синтаксис**:

```typescript
defaultValue: value // Значение должно соответствовать типу поля
```

**Примеры**:

```typescript
export const SettingsTable = Heap.Table('settings', {
  // Строковое значение по умолчанию
  status: Heap.String({
    customMeta: { title: 'Статус' },
    defaultValue: 'pending'
  }),

  // Числовое значение по умолчанию
  count: Heap.Number({
    customMeta: { title: 'Счётчик' },
    defaultValue: 0
  }),

  // Булево значение по умолчанию
  isActive: Heap.Boolean({
    customMeta: { title: 'Активен' },
    defaultValue: true
  })
})
```

**Использование**:

```typescript
// Значение по умолчанию будет использовано
await SettingsTable.create(ctx, {
  // status будет 'pending'
  // count будет 0
  // isActive будет true
})

// Можно переопределить
await SettingsTable.create(ctx, {
  status: 'active', // Переопределяет defaultValue
  count: 10,
  isActive: false
})
```

---

## Полный пример таблицы

**Реальный пример из проекта**:

```typescript
import { Heap } from '@app/heap'

export const ConversationMessagesTable = Heap.Table(
  'templates_eventhookmanager_conversation_messages',
  {
    conversationId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID обращения' },
        searchable: { langs: ['ru', 'en'], embeddings: false }
      })
    ),
    messageId: Heap.Optional(
      Heap.String({
        customMeta: { title: 'ID сообщения' },
        searchable: { langs: ['ru', 'en'], embeddings: false }
      })
    ),
    messageText: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Текст сообщения' },
        searchable: { langs: ['ru', 'en'], embeddings: false }
      })
    ),
    authorType: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Тип автора' },
        searchable: { langs: ['ru', 'en'], embeddings: false }
      })
    ),
    timestamp: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Время события' },
        searchable: { langs: ['ru', 'en'], embeddings: false }
      })
    ),
    payload: Heap.Optional(Heap.Any())
  },
  { customMeta: { title: 'Conversation Messages', description: 'Сообщения в обращениях' } }
)

export default ConversationMessagesTable

export type ConversationMessagesTableRow = typeof ConversationMessagesTable.T
export type ConversationMessagesTableRowJson = typeof ConversationMessagesTable.JsonT
```

**Разбор примера**:

1. **Имя таблицы**: `'templates_eventhookmanager_conversation_messages'`

   - Префикс `templates_eventhookmanager_` указывает на проект
   - Используется snake_case

2. **Поля**:

   - Все поля опциональны через `Heap.Optional()`
   - Строковые поля имеют поиск с `embeddings: false`
   - Поле `payload` использует `Heap.Any()` для произвольных данных

3. **Метаданные таблицы**:

   - `title` и `description` для UI

4. **Экспорт типов**:
   - `ConversationMessagesTableRow` — тип строки таблицы
   - `ConversationMessagesTableRowJson` — JSON-тип строки

---

## Экспорт и типизация

### Экспорт таблицы

**Рекомендуемый паттерн**:

```typescript
import { Heap } from '@app/heap'

export const MyTable = Heap.Table('my_table', {
  // поля
})

// Экспорт по умолчанию для удобного импорта
export default MyTable
```

**Использование**:

```typescript
// Именованный импорт
import { MyTable } from '../tables/my_table.table'

// Или импорт по умолчанию
import MyTable from '../tables/my_table.table'
```

### Экспорт типов

**Рекомендуемый паттерн**:

```typescript
export const MyTable = Heap.Table('my_table', {
  name: Heap.String({ customMeta: { title: 'Название' } }),
  count: Heap.Number({ customMeta: { title: 'Количество' } })
})

// Тип строки таблицы (для работы с записями)
export type MyTableRow = typeof MyTable.T

// JSON-тип строки (для сериализации)
export type MyTableRowJson = typeof MyTable.JsonT
```

**Использование типов**:

```typescript
import { MyTable, MyTableRow } from '../tables/my_table.table'

// Типизированная функция
async function processRecord(ctx: Ctx, record: MyTableRow): Promise<void> {
  // record имеет тип MyTableRow
  console.log(record.name, record.count)
}

// Получение записи
const record = await MyTable.findById(ctx, id)
if (record) {
  // record имеет тип MyTableRow
  processRecord(ctx, record)
}
```

---

## Использование таблиц

### CRUD операции

Все операции CRUD работают так же, как описано в 008-heap.md:

```typescript
import ConversationMessagesTable from '../tables/conversation_messages.table'

// Создание
const message = await ConversationMessagesTable.create(ctx, {
  conversationId: '123',
  messageId: '456',
  messageText: 'Привет!',
  authorType: 'user',
  timestamp: new Date(),
  payload: {
    /* данные */
  }
})

// Чтение
const messages = await ConversationMessagesTable.findAll(ctx, {
  where: { conversationId: '123' },
  limit: 100
})

// Обновление
await ConversationMessagesTable.update(ctx, {
  id: message.id,
  messageText: 'Обновлённый текст'
})

// Удаление
await ConversationMessagesTable.delete(ctx, message.id)
```

### Фильтрация и поиск

```typescript
// Фильтрация
const messages = await ConversationMessagesTable.findAll(ctx, {
  where: {
    conversationId: '123',
    authorType: 'user'
  }
})

// Полнотекстовый поиск (если поле имеет searchable)
const results = await ConversationMessagesTable.searchBy(ctx, {
  query: 'привет',
  where: { conversationId: '123' }
})
```

---

## Частые ошибки

### ❌ Ошибка #1: Использование app.table() вместо Heap.Table()

**НЕПРАВИЛЬНО**:

```typescript
// ❌ app.table() НЕ существует в Chatium!
const conversationMessagesTable = app.table('conversation_messages', {
  fields: [
    { name: 'conversationId', kind: 'StringKind', title: 'ID обращения' }
    // ...
  ]
})
```

**Ошибка**: `"schema is invalid: data/properties/fields must be object,boolean"`

**ПРАВИЛЬНО**:

```typescript
// ✅ Используйте Heap.Table()
import { Heap } from '@app/heap'

export const ConversationMessagesTable = Heap.Table('conversation_messages', {
  conversationId: Heap.String({
    customMeta: { title: 'ID обращения' }
  })
})
```

### ❌ Ошибка #2: Включение embeddings без необходимости

**НЕПРАВИЛЬНО**:

```typescript
// ❌ Embeddings включены без явной необходимости
export const MessagesTable = Heap.Table('messages', {
  text: Heap.String({
    searchable: {
      langs: ['ru', 'en'],
      embeddings: true // ← Увеличивает нагрузку!
    }
  })
})
```

**ПРАВИЛЬНО**:

```typescript
// ✅ По умолчанию embeddings ВЫКЛЮЧЕНЫ
export const MessagesTable = Heap.Table('messages', {
  text: Heap.String({
    searchable: {
      langs: ['ru', 'en'],
      embeddings: false // ✅ По умолчанию
    }
  })
})
```

### ❌ Ошибка #3: Забыли Heap.Optional() для опциональных полей

**НЕПРАВИЛЬНО**:

```typescript
// ❌ Поле обязательно, но может отсутствовать
export const UsersTable = Heap.Table('users', {
  phone: Heap.String({
    // ← Обязательное поле!
    customMeta: { title: 'Телефон' }
  })
})

// При создании без phone будет ошибка
await UsersTable.create(ctx, {
  email: 'user@example.com'
  // phone отсутствует → ОШИБКА!
})
```

**ПРАВИЛЬНО**:

```typescript
// ✅ Поле опционально
export const UsersTable = Heap.Table('users', {
  phone: Heap.Optional(
    // ← Опциональное поле
    Heap.String({
      customMeta: { title: 'Телефон' }
    })
  )
})

// Теперь можно создавать без phone
await UsersTable.create(ctx, {
  email: 'user@example.com'
  // phone не обязателен
})
```

### ❌ Ошибка #4: Неправильное имя таблицы

**НЕПРАВИЛЬНО**:

```typescript
// ❌ Слишком короткое, может конфликтовать
export const LogsTable = Heap.Table('logs', { ... })

// ❌ camelCase (используйте snake_case)
export const EventLogsTable = Heap.Table('eventLogs', { ... })
```

**ПРАВИЛЬНО**:

```typescript
// ✅ С префиксом проекта
export const LogsTable = Heap.Table('templates_eventhookmanager_event_logs_O6Z', { ... })

// ✅ Понятное имя в snake_case
export const EventLogsTable = Heap.Table('t_event_logs', { ... })
```

---

## Сравнение с JSON-таблицами

### Heap.Table() (TypeScript)

**Преимущества**:

- ✅ Полная типизация TypeScript
- ✅ Автодополнение в IDE
- ✅ Рефакторинг и переименование
- ✅ Экспорт типов
- ✅ Валидация на этапе компиляции

**Недостатки**:

- ❌ Требует TypeScript
- ❌ Более сложный синтаксис

**Когда использовать**:

- Проекты GetCourse с автоматической генерацией
- Когда нужна типизация
- Динамическое создание таблиц

### JSON-таблицы (008-heap.md)

**Преимущества**:

- ✅ Простой JSON-синтаксис
- ✅ Не требует TypeScript
- ✅ Легко редактировать

**Недостатки**:

- ❌ Нет типизации
- ❌ Нет автодополнения
- ❌ Нет рефакторинга

**Когда использовать**:

- Простые статические таблицы
- Когда типизация не критична

---

## Лучшие практики

### ✅ Именование

```typescript
// ✅ Используйте префикс проекта
Heap.Table('templates_eventhookmanager_event_logs_O6Z', { ... })

// ✅ Используйте snake_case
Heap.Table('conversation_messages', { ... })

// ✅ Понятные имена
Heap.Table('t_metric_events_settings', { ... })
```

### ✅ Структура файла

```typescript
// tables/my_table.table.ts

import { Heap } from '@app/heap'

// 1. Определение таблицы
export const MyTable = Heap.Table('my_table', {
  // поля
})

// 2. Экспорт по умолчанию
export default MyTable

// 3. Экспорт типов
export type MyTableRow = typeof MyTable.T
export type MyTableRowJson = typeof MyTable.JsonT
```

### ✅ Опциональные поля

```typescript
// ✅ Всегда используйте Heap.Optional() для полей, которые могут отсутствовать
export const MyTable = Heap.Table('my_table', {
  // Обязательное поле
  email: Heap.String({ customMeta: { title: 'Email' } }),

  // Опциональное поле
  phone: Heap.Optional(Heap.String({ customMeta: { title: 'Телефон' } }))
})
```

### ✅ Поиск и embeddings

```typescript
// ✅ По умолчанию embeddings ВЫКЛЮЧЕНЫ
export const MyTable = Heap.Table('my_table', {
  name: Heap.String({
    searchable: {
      langs: ['ru', 'en'],
      embeddings: false // ✅ По умолчанию
    }
  })
})

// ✅ Включайте embeddings только при необходимости
export const ArticlesTable = Heap.Table('articles', {
  content: Heap.String({
    searchable: {
      langs: ['ru'],
      embeddings: true // ⚠️ Только для семантического поиска
    }
  })
})
```

### ✅ Метаданные

```typescript
// ✅ Всегда добавляйте customMeta.title
export const MyTable = Heap.Table('my_table', {
  name: Heap.String({
    customMeta: { title: 'Название' } // ✅ Для UI
  })
})

// ✅ Добавляйте метаданные таблицы
export const MyTable = Heap.Table(
  'my_table',
  {
    /* поля */
  },
  {
    customMeta: {
      title: 'Моя таблица',
      description: 'Описание таблицы'
    }
  }
)
```

---

## Связанные документы

- **008-heap.md** — Работа с Heap (JSON-таблицы и CRUD операции)
- **006-arch.md** — Организация файлов таблиц
- **002-routing.md** — Использование таблиц в API роутах

---

**Версия**: 1.0  
**Дата**: 2025-12-08  
**Важно**: Эта документация описывает метод создания таблиц через `Heap.Table()` в TypeScript файлах для проектов GetCourse. Для JSON-таблиц см. 008-heap.md.

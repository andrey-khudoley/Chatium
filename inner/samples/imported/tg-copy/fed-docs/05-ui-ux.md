# UI и UX федеративных чатов

## Главный принцип

**Пользователь всегда должен видеть, из какого аккаунта пришел участник.**

Это критически важно для:
- Доверия (кто эти люди?)
- Контекста (почему они здесь?)
- Безопасности (откуда пришло сообщение?)

## Отображение участников

### 1. В сообщениях

#### Локальный участник (из своего аккаунта)
```
┌─────────────────────────────────────┐
│ Иван Петров              14:23      │
│ Привет всем!                        │
└─────────────────────────────────────┘
```

#### Удалённый участник
```
┌─────────────────────────────────────┐
│ Мария Сидорова 🌐 other.chatium.ru  │
│ из other.chatium.ru          14:24  │
│ Здравствуйте!                       │
└─────────────────────────────────────┘
```

**Важные детали:**
- Иконка глобуса (🌐) указывает на федеративного участника
- Домен аккаунта отображается под именем (серым цветом, мелким шрифтом)
- При наведении — tooltip с полным URL инстанса

#### Компонент сообщения

```vue
<template>
  <div class="message" :class="{ 'message-federated': message.isFederated }">
    <div class="message-author">
      <!-- Имя -->
      <span class="author-name">{{ message.author.displayName }}</span>
      
      <!-- Индикатор федеративного участника -->
      <span v-if="message.author.instanceDomain" class="federation-badge" :title="federationTooltip">
        🌐
      </span>
      
      <!-- Время -->
      <span class="message-time">{{ formatTime(message.createdAt) }}</span>
    </div>
    
    <!-- Домен под именем -->
    <div v-if="message.author.instanceDomain" class="author-instance">
      из {{ message.author.instanceDomain }}
    </div>
    
    <!-- Текст сообщения -->
    <div class="message-text">{{ message.text }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: Object,
})

const federationTooltip = computed(() => {
  if (!props.message.author.instanceDomain) return ''
  return `Участник из ${props.message.author.instanceUrl}`
})
</script>

<style scoped>
.author-instance {
  font-size: 11px;
  color: #667781;
  margin-top: 2px;
  font-style: italic;
}

.federation-badge {
  font-size: 12px;
  margin-left: 4px;
  cursor: help;
}

.message-federated {
  /* Можно добавить тонкий border слева для визуального отличия */
  border-left: 2px solid #3b82f6;
  padding-left: 8px;
}
</style>
```

### 2. В списке участников

```
┌──────────────────────────────────────────┐
│ Участники (12)                    [✕]    │
├──────────────────────────────────────────┤
│                                          │
│ Локальные участники (5)                 │
│ ────────────────────────────────────     │
│                                          │
│ 👤 Иван Петров                Owner     │
│ 👤 Анна Смирнова              Admin     │
│ 👤 Пётр Васильев                         │
│ 👤 Ольга Ковалёва                        │
│ 👤 Дмитрий Соколов                       │
│                                          │
│ Из other.chatium.ru (4)                  │
│ ────────────────────────────────────     │
│                                          │
│ 🌐 Мария Сидорова                        │
│    other.chatium.ru                      │
│ 🌐 Алексей Морозов                       │
│    other.chatium.ru                      │
│ 🌐 Елена Новикова              Admin     │
│    other.chatium.ru                      │
│ 🌐 Сергей Лебедев                        │
│    other.chatium.ru                      │
│                                          │
│ Из client.example.com (3)                │
│ ────────────────────────────────────     │
│                                          │
│ 🌐 John Smith                            │
│    client.example.com                    │
│ 🌐 Jane Doe                              │
│    client.example.com                    │
│ 🌐 Bob Johnson                           │
│    client.example.com                    │
│                                          │
└──────────────────────────────────────────┘
```

**Группировка по инстансам:**
- Локальные участники всегда сверху
- Федеративные группируются по доменам
- Счётчик участников для каждой группы

#### Компонент списка участников

```vue
<template>
  <div class="participants-panel">
    <div class="panel-header">
      <h3>Участники ({{ totalCount }})</h3>
      <button @click="$emit('close')">✕</button>
    </div>
    
    <div class="participants-list">
      <!-- Локальные участники -->
      <div v-if="localParticipants.length > 0" class="participants-group">
        <div class="group-header">
          Локальные участники ({{ localParticipants.length }})
        </div>
        <div
          v-for="p in localParticipants"
          :key="p.id"
          class="participant-item"
        >
          <div class="participant-avatar">
            <img v-if="p.avatarUrl" :src="p.avatarUrl" />
            <div v-else class="avatar-placeholder">
              {{ p.displayName[0] }}
            </div>
          </div>
          <div class="participant-info">
            <div class="participant-name">{{ p.displayName }}</div>
          </div>
          <div v-if="p.role !== 'guest'" class="participant-role">
            {{ roleLabel(p.role) }}
          </div>
        </div>
      </div>
      
      <!-- Федеративные участники (группировка по инстансам) -->
      <div
        v-for="(participants, domain) in federatedGroups"
        :key="domain"
        class="participants-group"
      >
        <div class="group-header">
          🌐 Из {{ domain }} ({{ participants.length }})
        </div>
        <div
          v-for="p in participants"
          :key="p.id"
          class="participant-item participant-federated"
        >
          <div class="participant-avatar">
            <img v-if="p.avatarUrl" :src="p.avatarUrl" />
            <div v-else class="avatar-placeholder">
              {{ p.displayName[0] }}
            </div>
          </div>
          <div class="participant-info">
            <div class="participant-name">{{ p.displayName }}</div>
            <div class="participant-instance">{{ p.instanceDomain }}</div>
          </div>
          <div v-if="p.role !== 'guest'" class="participant-role">
            {{ roleLabel(p.role) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  participants: Array,
})

const localParticipants = computed(() => {
  return props.participants.filter(p => p.isLocal)
})

const federatedParticipants = computed(() => {
  return props.participants.filter(p => !p.isLocal)
})

const federatedGroups = computed(() => {
  const groups = {}
  for (const p of federatedParticipants.value) {
    const domain = p.instanceDomain
    if (!groups[domain]) {
      groups[domain] = []
    }
    groups[domain].push(p)
  }
  return groups
})

const totalCount = computed(() => props.participants.length)

function roleLabel(role) {
  const labels = {
    owner: 'Владелец',
    admin: 'Администратор',
    guest: '',
  }
  return labels[role] || ''
}
</script>

<style scoped>
.participants-group {
  margin-bottom: 24px;
}

.group-header {
  font-size: 13px;
  font-weight: 600;
  color: #667781;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9edef;
}

.participant-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.participant-item:hover {
  background: #f5f6f6;
}

.participant-federated {
  /* Можно добавить тонкий левый border для федеративных */
  border-left: 2px solid #3b82f6;
}

.participant-info {
  flex: 1;
  margin-left: 12px;
}

.participant-instance {
  font-size: 11px;
  color: #667781;
  margin-top: 2px;
  font-style: italic;
}

.participant-role {
  font-size: 12px;
  color: #00a884;
  font-weight: 500;
}
</style>
```

### 3. В информации о чате

```
┌──────────────────────────────────────────┐
│                                          │
│        [Аватар чата]                     │
│                                          │
│           Мой чат                        │
│                                          │
│  🌐 Федеративный чат                     │
│  Подключено 3 инстанса                   │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  📊 Статистика                           │
│  • Всего участников: 12                 │
│  • Локальных: 5                          │
│  • Из other.chatium.ru: 4                │
│  • Из client.example.com: 3              │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  🔗 Приглашение в федеративный чат       │
│  https://my.chatium.ru/projekt-chat/...  │
│  [Копировать ссылку]                     │
│                                          │
└──────────────────────────────────────────┘
```

### 4. При создании федеративного чата

#### Шаг 1: Создание обычного чата
```
┌──────────────────────────────────────────┐
│ Создать новый чат                        │
├──────────────────────────────────────────┤
│                                          │
│ Название:                                │
│ [                                    ]   │
│                                          │
│ Описание:                                │
│ [                                    ]   │
│                                          │
│ Тип:                                     │
│ ( ) Группа                               │
│ ( ) Канал                                │
│                                          │
│ ☐ Публичный чат                          │
│ ☐ Федеративный чат                       │
│   (доступен для подключения из других    │
│    Chatium-аккаунтов)                    │
│                                          │
│          [Отмена]  [Создать]             │
│                                          │
└──────────────────────────────────────────┘
```

#### Шаг 2: Получение federation URL (после создания)
```
┌──────────────────────────────────────────┐
│ ✅ Чат создан!                           │
├──────────────────────────────────────────┤
│                                          │
│ Ваш чат теперь доступен для              │
│ подключения из других аккаунтов.         │
│                                          │
│ Отправьте эту ссылку администраторам     │
│ других Chatium-инстансов:                │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ https://my.chatium.ru/projekt-chat/│   │
│ │ api/federation/connect?token=...   │   │
│ │ &feedId=...                        │   │
│ └────────────────────────────────────┘   │
│                                          │
│          [Копировать ссылку]             │
│          [Готово]                        │
│                                          │
└──────────────────────────────────────────┘
```

### 5. Подключение к федеративному чату

```
┌──────────────────────────────────────────┐
│ Подключиться к федеративному чату        │
├──────────────────────────────────────────┤
│                                          │
│ Вставьте ссылку приглашения:             │
│                                          │
│ [                                    ]   │
│                                          │
│ ⓘ Ссылка должна начинаться с https://   │
│   и содержать federation token           │
│                                          │
│          [Отмена]  [Подключиться]        │
│                                          │
└──────────────────────────────────────────┘
```

#### После успешного подключения
```
┌──────────────────────────────────────────┐
│ ✅ Успешно подключено!                   │
├──────────────────────────────────────────┤
│                                          │
│ Вы подключились к федеративному чату:    │
│                                          │
│        [Аватар чата]                     │
│                                          │
│           Мой чат                        │
│    Хост: my.chatium.ru                   │
│                                          │
│ Участников: 12                           │
│ Сообщений: 1,234                         │
│                                          │
│          [Открыть чат]                   │
│                                          │
└──────────────────────────────────────────┘
```

## Индикаторы статуса соединения

### В шапке чата

```
┌──────────────────────────────────────────┐
│  [←] Мой чат                        [...] │
│      🌐 my.chatium.ru • ● Подключено     │
└──────────────────────────────────────────┘
```

**Статусы:**
- `● Подключено` (зеленая точка) — WebSocket активен
- `○ Соединение потеряно` (серая точка) — WebSocket отключен, пытается переподключиться
- `● Только чтение` (желтая точка) — подключение есть, но отправка временно недоступна

### Компонент статуса

```vue
<template>
  <div class="federation-status">
    <span class="status-icon">🌐</span>
    <span class="status-domain">{{ hostDomain }}</span>
    <span class="status-separator">•</span>
    <span class="status-indicator" :class="`status-${status}`">
      <span class="status-dot">●</span>
      {{ statusLabel }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  hostDomain: String,
  isConnected: Boolean,
  isReadonly: Boolean,
})

const status = computed(() => {
  if (!props.isConnected) return 'disconnected'
  if (props.isReadonly) return 'readonly'
  return 'connected'
})

const statusLabel = computed(() => {
  const labels = {
    connected: 'Подключено',
    disconnected: 'Соединение потеряно',
    readonly: 'Только чтение',
  }
  return labels[status.value]
})
</script>

<style scoped>
.federation-status {
  font-size: 12px;
  color: #667781;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-dot {
  font-size: 8px;
}

.status-connected .status-dot {
  color: #00a884;
}

.status-disconnected .status-dot {
  color: #8696a0;
}

.status-readonly .status-dot {
  color: #f59e0b;
}
</style>
```

## Уведомления

### При новом подключении инстанса

Системное сообщение в чате:
```
┌─────────────────────────────────────┐
│ 🌐 Инстанс client.example.com       │
│ подключился к чату                  │
│                         14:23       │
└─────────────────────────────────────┘
```

### При присоединении участника из другого инстанса

```
┌─────────────────────────────────────┐
│ 🌐 John Smith из client.example.com │
│ присоединился к чату                │
│                         14:25       │
└─────────────────────────────────────┘
```

### При потере соединения

Toast уведомление в правом верхнем углу:
```
┌──────────────────────────────────┐
│ ⚠️ Соединение с my.chatium.ru    │
│ потеряно. Попытка                │
│ переподключения...               │
└──────────────────────────────────┘
```

### При восстановлении соединения

```
┌──────────────────────────────────┐
│ ✅ Соединение восстановлено      │
└──────────────────────────────────┘
```

## Контекстное меню сообщения

Для сообщений от федеративных участников добавляется пункт:

```
┌──────────────────────────┐
│ Ответить                 │
│ Переслать                │
│ Скопировать              │
│ ───────────────────────  │
│ ℹ️ О пользователе        │
│ 🌐 Открыть инстанс       │
└──────────────────────────┘
```

При клике на "О пользователе":
```
┌──────────────────────────────────────┐
│ John Smith                           │
├──────────────────────────────────────┤
│                                      │
│ Из: client.example.com               │
│ URL: https://client.example.com      │
│                                      │
│ В этом чате с: 15.01.2025            │
│ Сообщений: 42                        │
│ Роль: Участник                       │
│                                      │
│          [Закрыть]                   │
│                                      │
└──────────────────────────────────────┘
```

## Разделы настроек

### Для владельца хост-чата

```
┌──────────────────────────────────────────┐
│ Настройки федерации                      │
├──────────────────────────────────────────┤
│                                          │
│ ☑ Федерация включена                     │
│                                          │
│ 🔗 Ссылка для подключения:               │
│ https://my.chatium.ru/projekt-chat/...   │
│ [Копировать]  [Обновить]                 │
│                                          │
│ 📊 Подключенные инстансы (3):            │
│                                          │
│ • other.chatium.ru                       │
│   Участников: 4                          │
│   Последняя активность: 2 мин назад      │
│   [Отключить]                            │
│                                          │
│ • client.example.com                     │
│   Участников: 3                          │
│   Последняя активность: 5 мин назад      │
│   [Отключить]                            │
│                                          │
│ • partner.chatium.io                     │
│   Участников: 0                          │
│   Последняя активность: час назад        │
│   ⚠️ Неактивно                           │
│   [Отключить]                            │
│                                          │
└──────────────────────────────────────────┘
```

### Для админа подключенного инстанса

```
┌──────────────────────────────────────────┐
│ Федеративное подключение                 │
├──────────────────────────────────────────┤
│                                          │
│ Хост: my.chatium.ru                      │
│ Статус: ● Подключено                     │
│                                          │
│ Наших участников: 3                      │
│ Всего участников: 12                     │
│                                          │
│ Последняя синхронизация: 30 сек назад    │
│                                          │
│          [Отключиться от чата]           │
│                                          │
└──────────────────────────────────────────┘
```

## Адаптивность

### Мобильная версия

На мобильных устройствах:
- Домен инстанса в сообщениях отображается всегда (не только при hover)
- В списке участников группировка сохраняется
- Индикатор федеративного статуса в шапке сокращается до иконки 🌐

```
┌─────────────────────────┐
│ [←] Мой чат      🌐 [...] │
├─────────────────────────┤
│                         │
│ Мария Сидорова 🌐       │
│ other.chatium.ru 14:24  │
│ Здравствуйте!           │
│                         │
└─────────────────────────┘
```

## Анимации и переходы

### Появление нового сообщения от федеративного участника
- Легкий fade-in эффект
- Подсветка левого border синим цветом на 1 секунду

### Подключение/отключение инстанса
- Toast уведомление появляется с slide-in справа
- Автоматически скрывается через 5 секунд

### Изменение статуса соединения
- Точка статуса плавно меняет цвет (transition: 0.3s)

## Доступность (Accessibility)

### ARIA атрибуты
```vue
<div
  class="participant-item"
  role="listitem"
  :aria-label="`${p.displayName}${p.instanceDomain ? ` из ${p.instanceDomain}` : ''}`"
>
```

### Клавиатурная навигация
- Tab для навигации между участниками
- Enter для открытия профиля
- Esc для закрытия модалок

### Цветовые контрасты
- Все индикаторы должны иметь достаточный контраст (WCAG AA)
- Федеративные участники различимы не только цветом, но и иконкой 🌐

## Примеры реального использования

### Сценарий 1: Компания с несколькими офисами

```
Офис Москва (my.chatium.ru)
  └─ Создает чат "Общий проект"
  
Офис Санкт-Петербург (spb.chatium.ru)
  └─ Подключается к "Общий проект"
  
Офис Новосибирск (nsk.chatium.ru)
  └─ Подключается к "Общий проект"
```

В чате все видят:
- Локальные участники (из своего офиса)
- Участники из spb.chatium.ru
- Участники из nsk.chatium.ru

### Сценарий 2: Партнёрские проекты

```
Компания A (companya.chatium.ru)
  └─ Создает чат "Партнерский проект"
  
Компания B (companyb.chatium.io)
  └─ Подключается
```

Обе стороны видят:
- Кто из их компании
- Кто из партнёрской компании
- Все в едином пространстве общения

## Резюме UI/UX

✅ **Прозрачность:**
- Всегда видно, из какого инстанса участник
- Статус соединения отображается в шапке
- Статистика подключений доступна владельцу

✅ **Удобство:**
- Одна ссылка для подключения
- Автоматическая синхронизация
- Группировка участников по инстансам

✅ **Безопасность через UI:**
- Федеративные участники визуально отличаются
- При hover видна полная информация об инстансе
- Владелец может отключить любой инстанс в один клик

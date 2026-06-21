# Компоненты настроек событий датасета

Эта папка содержит модульные компоненты для настройки параметров различных типов событий в датасетах.

## Архитектура

Каждый тип события может иметь свои уникальные настройки. Компоненты появляются динамически после выбора типа события в модальном окне редактирования компонента датасета.

## Существующие компоненты

### PageviewEventSettings.vue

Настройки для события **"Просмотр страницы (pageview)"**

**Поля:**

- `urls: string[]` - Фильтр по URL (совпадение с любой частью: домен или путь)
  - Множественный выбор через кнопку "+"
  - Разделитель "или" между полями
  - Логика: применяются все условия через ИЛИ

### Остальные события

Для других событий (button_click, link_click, user/created, dealPaid и т.д.) пока не требуется специфичных настроек, поэтому блок "Настройки события" для них не отображается.

Когда понадобятся специфичные настройки для конкретного события - создайте соответствующий компонент `<EventName>EventSettings.vue` и добавьте `case` в `eventSettingsComponent` computed.

## Создание нового компонента настроек

### Пример: добавление настроек для события "button_click"

1. **Создайте файл** `ButtonClickEventSettings.vue` в этой папке

```vue
<template>
  <div class="space-y-4">
    <!-- Ваши поля настроек -->
    <div>
      <label class="block text-sm font-medium mb-2">CSS селектор кнопки</label>
      <input
        v-model="selector"
        type="text"
        placeholder=".btn-primary"
        class="w-full px-3 py-2 rounded-lg border"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  settings: { type: Object, required: true },
  isDark: { type: Boolean, default: false }
})

const emit = defineEmits(['update:settings'])

const selector = ref(props.settings.selector || '')

watch(selector, (newValue) => {
  emit('update:settings', { ...props.settings, selector: newValue })
})
</script>
```

2. **Импортируйте** в `DatasetConfigPage.vue`:

```javascript
import ButtonClickEventSettings from '../components/dataset-event-settings/ButtonClickEventSettings.vue'
```

3. **Добавьте case** в `eventSettingsComponent`:

```javascript
switch (eventType) {
  case 'pageview':
    return PageviewEventSettings
  case 'button_click':
    return ButtonClickEventSettings
  default:
    return null
}
```

## Принципы

- **Модульность**: Каждый тип события = отдельный компонент
- **Динамичность**: Компонент появляется только после выбора события
- **Расширяемость**: Легко добавлять новые типы событий
- **Чистота**: Настройки изолированы и не пересекаются между типами

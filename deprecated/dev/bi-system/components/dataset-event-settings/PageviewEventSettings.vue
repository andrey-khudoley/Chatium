<template>
  <div class="space-y-4">
    <!-- Фильтры в стиле Notion -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <label class="block text-sm font-medium">Фильтр (опционально)</label>
        <div class="relative" v-click-outside="() => (showAddMenu = false)">
          <button
            @click.prevent="showAddMenu = !showAddMenu"
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer relative"
            :class="
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'
            "
          >
            <i class="fas fa-plus text-xs"></i>
            <span>Добавить</span>
            <i class="fas fa-chevron-down ml-1 text-xs"></i>
          </button>

          <!-- Выпадающее меню -->
          <div
            v-if="showAddMenu"
            class="absolute right-0 mt-1 w-48 rounded-lg shadow-lg z-50 border"
            :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
          >
            <button
              @click.prevent="
                addFilterRule()
                showAddMenu = false
              "
              type="button"
              class="w-full text-left px-4 py-2 text-sm rounded-t-lg transition-colors"
              :class="
                isDark
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              "
            >
              <i class="fas fa-filter mr-2"></i>
              Добавить правило
            </button>
            <button
              @click.prevent="
                addFilterGroup()
                showAddMenu = false
              "
              type="button"
              class="w-full text-left px-4 py-2 text-sm rounded-b-lg transition-colors"
              :class="
                isDark
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              "
            >
              <i class="fas fa-folder mr-2"></i>
              Добавить группу
              <div
                class="text-xs opacity-70 mt-0.5"
                :class="isDark ? 'text-gray-300' : 'text-gray-600'"
              >
                Группа для вложенных фильтров
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Корневой уровень фильтров -->
      <div v-if="localFilter && localFilter.length > 0" class="space-y-2">
        <!-- Элементы фильтра -->
        <div class="space-y-2">
          <FilterItem
            v-for="(item, index) in localFilter"
            :key="getItemId(item)"
            :item="item"
            :index="index"
            :level="0"
            :isDark="isDark"
            :showOperatorBefore="index > 0"
            :parentOperator="rootOperator"
            :parentPath="[]"
            @update="updateFilterItem"
            @remove="removeFilterItem"
            @add-group="addGroup"
            @add-rule="addRule"
            @duplicate="duplicateItem"
            @turn-into-group="turnIntoGroup"
            @toggle-parent-operator="toggleRootOperator"
          />
        </div>
      </div>

      <!-- Кнопка удаления всего фильтра -->
      <div
        v-if="localFilter && localFilter.length > 0"
        class="mt-4 pt-4 border-t"
        :class="isDark ? 'border-gray-700' : 'border-gray-300'"
      >
        <button
          @click.prevent="deleteAllFilters"
          type="button"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          :class="
            isDark
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          "
        >
          <i class="fas fa-trash"></i>
          <span>Удалить фильтр</span>
        </button>
      </div>

      <p class="text-xs mt-2 opacity-70">
        Создайте иерархическую структуру фильтров с операторами AND/OR. Правила можно группировать
        для сложных условий.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import FilterItem from './FilterItem.vue'

const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  isDark: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:settings'])

// Флаг для предотвращения циклических обновлений
let isUpdatingFromProps = false

// Состояние выпадающего меню
const showAddMenu = ref(false)

// Оператор между элементами на корневом уровне
const rootOperator = ref('OR')

// Генератор уникальных ID
function generateId() {
  return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Преобразуем старый формат в новый
function normalizeFilter(settings) {
  // Если есть новый формат filter - используем его
  if (settings.filter) {
    // Проверяем, это объект с operator и conditions или массив
    if (settings.filter.operator && Array.isArray(settings.filter.conditions)) {
      // Новый формат с оператором
      rootOperator.value = settings.filter.operator || 'OR'
      return settings.filter.conditions.map((item) => {
        if ('property' in item) {
          return {
            id: item.id || generateId(),
            property: item.property,
            operator: item.operator,
            value: item.value
          }
        } else {
          return normalizeGroup(item)
        }
      })
    } else if (Array.isArray(settings.filter) && settings.filter.length > 0) {
      // Старый формат - массив (для обратной совместимости)
      rootOperator.value = 'OR' // По умолчанию OR для старого формата
      return settings.filter.map((item) => {
        if ('property' in item) {
          return {
            id: item.id || generateId(),
            property: item.property,
            operator: item.operator,
            value: item.value
          }
        } else {
          return normalizeGroup(item)
        }
      })
    }
  }

  // Преобразуем старый формат urlGroups
  if (settings.urlGroups && Array.isArray(settings.urlGroups) && settings.urlGroups.length > 0) {
    const conditions = []
    for (const group of settings.urlGroups) {
      if (group.urls && Array.isArray(group.urls)) {
        for (const url of group.urls) {
          if (url && url.trim()) {
            const trimmedUrl = url.trim()
            const utmMatch = trimmedUrl.match(
              /^(utm_source|utm_medium|utm_campaign|utm_term|utm_content)=(.+)$/
            )

            if (utmMatch) {
              conditions.push({
                id: generateId(),
                property: utmMatch[1],
                operator: 'is',
                value: utmMatch[2].trim()
              })
            } else {
              conditions.push({
                id: generateId(),
                property: 'urlPath',
                operator: 'contains',
                value: trimmedUrl
              })
            }
          }
        }
      }
    }

    if (conditions.length > 1) {
      return [
        {
          id: generateId(),
          operator: 'OR',
          conditions: conditions
        }
      ]
    } else if (conditions.length === 1) {
      return [conditions[0]]
    }
  }

  // Преобразуем старый формат urls
  if (settings.urls && Array.isArray(settings.urls) && settings.urls.length > 0) {
    const conditions = []
    for (const url of settings.urls) {
      if (url && url.trim()) {
        const trimmedUrl = url.trim()
        const utmMatch = trimmedUrl.match(
          /^(utm_source|utm_medium|utm_campaign|utm_term|utm_content)=(.+)$/
        )

        if (utmMatch) {
          conditions.push({
            id: generateId(),
            property: utmMatch[1],
            operator: 'is',
            value: utmMatch[2].trim()
          })
        } else {
          conditions.push({
            id: generateId(),
            property: 'urlPath',
            operator: 'contains',
            value: trimmedUrl
          })
        }
      }
    }

    if (conditions.length > 0) {
      const operator = settings.urlOperator || 'OR'
      if (conditions.length === 1) {
        return [conditions[0]]
      } else {
        return [
          {
            id: generateId(),
            operator: operator,
            conditions: conditions
          }
        ]
      }
    }
  }

  return []
}

function normalizeGroup(group) {
  return {
    id: group.id || generateId(),
    operator: group.operator || 'AND',
    conditions: (group.conditions || []).map((item) => {
      if ('property' in item) {
        return {
          id: item.id || generateId(),
          property: item.property,
          operator: item.operator,
          value: item.value
        }
      } else {
        return normalizeGroup(item)
      }
    })
  }
}

// Инициализируем локальное состояние
const initialFilter = normalizeFilter(props.settings || {})
const localFilter = ref(initialFilter)

// Получить ID элемента
function getItemId(item) {
  return item.id
}

// Синхронизация с props
watch(
  () => props.settings,
  (newSettings) => {
    if (isUpdatingFromProps) {
      return
    }

    const normalizedFilter = normalizeFilter(newSettings || {})
    const currentStr = JSON.stringify(localFilter.value)
    const newStr = JSON.stringify(normalizedFilter)

    if (currentStr !== newStr) {
      isUpdatingFromProps = true
      localFilter.value = normalizedFilter
      nextTick(() => {
        isUpdatingFromProps = false
      })
    }
  },
  { deep: true, immediate: false }
)

// Обновить настройки
function updateSettings() {
  if (isUpdatingFromProps) {
    return
  }

  const newSettings = {
    ...props.settings
  }

  // Удаляем старые форматы
  delete newSettings.urlGroups
  delete newSettings.urls
  delete newSettings.urlOperator

  // Устанавливаем новый формат с оператором
  if (localFilter.value.length > 0) {
    newSettings.filter = {
      operator: rootOperator.value,
      conditions: localFilter.value
    }
  } else {
    delete newSettings.filter
  }

  emit('update:settings', newSettings)
}

// Отслеживаем изменения фильтра и оператора
watch(
  [localFilter, rootOperator],
  () => {
    if (!isUpdatingFromProps) {
      nextTick(() => {
        updateSettings()
      })
    }
  },
  { deep: true }
)

// Переключить оператор на корневом уровне
function toggleRootOperator(path) {
  // Если путь пустой или не передан - переключаем корневой оператор
  if (!path || path.length === 0) {
    rootOperator.value = rootOperator.value === 'AND' ? 'OR' : 'AND'
    return
  }

  // Иначе переключаем оператор вложенной группы
  toggleGroupOperator(localFilter.value, path)
}

// Переключить оператор группы по пути
function toggleGroupOperator(root, path) {
  if (path.length === 0) return

  const [firstIndex, ...restPath] = path
  const currentItem = root[firstIndex]

  if (restPath.length === 0) {
    // Достигли нужной группы
    if ('conditions' in currentItem) {
      currentItem.operator = currentItem.operator === 'AND' ? 'OR' : 'AND'
    }
  } else if ('conditions' in currentItem) {
    // Продолжаем рекурсию
    toggleGroupOperator(currentItem.conditions, restPath)
  }
}

// Добавить правило на корневом уровне
function addFilterRule() {
  const newCondition = {
    id: generateId(),
    property: 'urlPath',
    operator: 'contains',
    value: ''
  }

  if (!localFilter.value) {
    localFilter.value = []
  }

  localFilter.value.push(newCondition)
}

// Добавить группу на корневом уровне
function addFilterGroup() {
  const newGroup = {
    id: generateId(),
    operator: 'AND',
    conditions: []
  }

  if (!localFilter.value) {
    localFilter.value = []
  }

  localFilter.value.push(newGroup)
}

// Обновить элемент фильтра
function updateFilterItem(path, item) {
  if (path.length === 0) {
    // Пустой path означает корневой уровень, но индекс не передан
    // Это не должно происходить, но на всякий случай обработаем
    return
  } else if (path.length === 1) {
    // Корневой уровень: path содержит только индекс
    const index = path[0]
    if (index >= 0 && index < localFilter.value.length) {
      localFilter.value[index] = item
    }
  } else {
    // Вложенный уровень: path содержит несколько индексов
    updateNestedItem(localFilter.value, path, item)
  }
}

// Обновить вложенный элемент
function updateNestedItem(root, path, item) {
  if (path.length === 0) return

  const [firstIndex, ...restPath] = path
  const currentItem = root[firstIndex]

  if (restPath.length === 0) {
    root[firstIndex] = item
  } else if ('conditions' in currentItem) {
    updateNestedItem(currentItem.conditions, restPath, item)
  }
}

// Удалить элемент фильтра
function removeFilterItem(path) {
  if (path.length === 0) {
    // Пустой path означает корневой уровень, но индекс не передан
    // Это не должно происходить, но на всякий случай обработаем
    return
  } else if (path.length === 1) {
    // Корневой уровень: path содержит только индекс
    const index = path[0]
    if (index >= 0 && index < localFilter.value.length) {
      localFilter.value.splice(index, 1)
    }
  } else {
    // Вложенный уровень: path содержит несколько индексов
    removeNestedItem(localFilter.value, path)
  }
}

// Удалить вложенный элемент
function removeNestedItem(root, path) {
  if (path.length === 0) return

  const [firstIndex, ...restPath] = path
  const currentItem = root[firstIndex]

  if (restPath.length === 0) {
    root.splice(firstIndex, 1)
  } else if ('conditions' in currentItem) {
    removeNestedItem(currentItem.conditions, restPath)
  }
}

// Дублировать элемент
function duplicateItem(path) {
  let itemToDuplicate = null
  let insertIndex = 0

  if (path.length === 0) {
    // Пустой path означает корневой уровень, но индекс не передан
    // Это не должно происходить, но на всякий случай обработаем
    return
  } else if (path.length === 1) {
    // Корневой уровень: path содержит только индекс
    const index = path[0]
    if (index >= 0 && index < localFilter.value.length) {
      itemToDuplicate = localFilter.value[index]
      insertIndex = index
    }
  } else {
    // Вложенный уровень: path содержит несколько индексов
    itemToDuplicate = getNestedItem(localFilter.value, path)
    insertIndex = null // Для вложенных элементов используем addNestedItemAfter
  }

  if (!itemToDuplicate) return

  // Создаём глубокую копию с новым ID
  const duplicated = JSON.parse(JSON.stringify(itemToDuplicate))
  duplicated.id = generateId()

  // Если это группа, рекурсивно обновляем ID всех вложенных элементов
  if ('conditions' in duplicated) {
    function updateIds(item) {
      item.id = generateId()
      if ('conditions' in item) {
        item.conditions.forEach(updateIds)
      }
    }
    updateIds(duplicated)
  }

  // Добавляем после оригинала
  if (path.length === 1 && insertIndex !== null) {
    // Корневой уровень: добавляем после элемента с индексом insertIndex
    localFilter.value.splice(insertIndex + 1, 0, duplicated)
  } else if (path.length > 1) {
    // Вложенный уровень: используем addNestedItemAfter
    addNestedItemAfter(localFilter.value, path, duplicated)
  }
}

// Получить вложенный элемент
function getNestedItem(root, path) {
  if (path.length === 0) return null

  const [firstIndex, ...restPath] = path
  const currentItem = root[firstIndex]

  if (restPath.length === 0) {
    return currentItem
  } else if ('conditions' in currentItem) {
    return getNestedItem(currentItem.conditions, restPath)
  }

  return null
}

// Добавить элемент после указанного пути
function addNestedItemAfter(root, path, item) {
  if (path.length === 0) return

  const [firstIndex, ...restPath] = path
  const currentItem = root[firstIndex]

  if (restPath.length === 0) {
    // Добавляем после текущего элемента
    root.splice(firstIndex + 1, 0, item)
  } else if ('conditions' in currentItem) {
    addNestedItemAfter(currentItem.conditions, restPath, item)
  }
}

// Превратить правило в группу
function turnIntoGroup(path) {
  let itemToConvert = null
  let parentArray = null
  let itemIndex = 0

  if (path.length === 0) {
    // Пустой path означает корневой уровень, но индекс не передан
    // Это не должно происходить, но на всякий случай обработаем
    return
  } else if (path.length === 1) {
    // Корневой уровень: path содержит только индекс
    itemIndex = path[0]
    if (itemIndex >= 0 && itemIndex < localFilter.value.length) {
      itemToConvert = localFilter.value[itemIndex]
      parentArray = localFilter.value
    }
  } else {
    // Вложенный уровень: path содержит несколько индексов
    const result = getNestedItemWithParent(localFilter.value, path)
    if (result) {
      itemToConvert = result.item
      parentArray = result.parent
      itemIndex = result.index
    }
  }

  if (!itemToConvert || 'conditions' in itemToConvert) {
    // Уже группа или не найдено
    return
  }

  // Превращаем правило в группу
  const newGroup = {
    id: generateId(),
    operator: 'AND',
    conditions: [
      {
        ...itemToConvert,
        id: generateId() // Новый ID для правила внутри группы
      }
    ]
  }

  parentArray[itemIndex] = newGroup
}

// Получить вложенный элемент с родительским массивом
function getNestedItemWithParent(root, path) {
  if (path.length === 0) return null

  const [firstIndex, ...restPath] = path
  const currentItem = root[firstIndex]

  if (restPath.length === 0) {
    return {
      item: currentItem,
      parent: root,
      index: firstIndex
    }
  } else if ('conditions' in currentItem) {
    return getNestedItemWithParent(currentItem.conditions, restPath)
  }

  return null
}

// Добавить группу
function addGroup(path) {
  const newGroup = {
    id: generateId(),
    operator: 'AND',
    conditions: []
  }

  if (path.length === 0) {
    localFilter.value.push(newGroup)
  } else {
    addNestedItem(localFilter.value, path, newGroup)
  }
}

// Добавить вложенный элемент
function addNestedItem(root, path, item) {
  if (path.length === 0) {
    root.push(item)
    return
  }

  const [firstIndex, ...restPath] = path
  const currentItem = root[firstIndex]

  if ('conditions' in currentItem) {
    addNestedItem(currentItem.conditions, restPath, item)
  }
}

// Добавить правило
function addRule(path) {
  const newCondition = {
    id: generateId(),
    property: 'urlPath',
    operator: 'contains',
    value: ''
  }

  if (path.length === 0) {
    localFilter.value.push(newCondition)
  } else {
    addNestedItem(localFilter.value, path, newCondition)
  }
}

// Удалить все фильтры
function deleteAllFilters() {
  if (confirm('Вы уверены, что хотите удалить все фильтры?')) {
    localFilter.value = []
    rootOperator.value = 'OR'
  }
}

// Директива для закрытия меню при клике вне его
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}

onMounted(() => {
  console.log('[PageviewEventSettings] Компонент смонтирован с новой структурой фильтров')
  console.log('[PageviewEventSettings] localFilter:', localFilter.value)
  console.log('[PageviewEventSettings] rootOperator:', rootOperator.value)
})
</script>

<style scoped>
.filter-item {
  transition: all 0.2s;
}

.filter-item-group {
  padding: 8px;
  border-radius: 8px;
}

.filter-group {
  padding: 8px;
  border-radius: 8px;
}
</style>

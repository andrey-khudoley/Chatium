<template>
  <div class="filter-item-wrapper">
    <!-- Оператор перед элементом (если не первый) -->
    <div v-if="showOperatorBefore" class="flex items-center mb-2">
      <button
        @click="toggleParentOperator"
        type="button"
        class="px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1"
        :class="
          isDark
            ? parentOperator === 'AND'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-purple-600 text-white hover:bg-purple-700'
            : parentOperator === 'AND'
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-purple-500 text-white hover:bg-purple-600'
        "
      >
        {{ parentOperator }}
        <i class="fas fa-chevron-down text-xs"></i>
      </button>
    </div>

    <div class="filter-item" :class="{ 'filter-item-group': isGroup }">
      <!-- Условие (правило) -->
      <div
        v-if="isCondition"
        class="flex items-center gap-2 p-2.5 rounded-lg border group hover:shadow-sm transition-all"
        :class="
          isDark
            ? 'border-gray-600 bg-gray-800/50 hover:bg-gray-800'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        "
      >
        <span class="text-xs font-medium opacity-70">Where</span>

        <select
          :value="item.property"
          @change="updateItem({ property: $event.target.value })"
          class="px-2.5 py-1.5 rounded text-xs border font-medium"
          :class="
            isDark
              ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
              : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
          "
        >
          <option v-for="prop in properties" :key="prop.value" :value="prop.value">
            {{ prop.label }}
          </option>
        </select>

        <select
          :value="item.operator"
          @change="updateItem({ operator: $event.target.value })"
          class="px-2.5 py-1.5 rounded text-xs border font-medium"
          :class="
            isDark
              ? 'bg-gray-700 border-gray-600 text-white hover:border-gray-500'
              : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
          "
        >
          <option v-for="op in operators" :key="op.value" :value="op.value">
            {{ op.label }}
          </option>
        </select>

        <input
          v-if="item.operator !== 'isEmpty' && item.operator !== 'isNotEmpty'"
          :value="item.value || ''"
          @input="updateItem({ value: $event.target.value })"
          type="text"
          placeholder="Значение"
          class="flex-1 px-2.5 py-1.5 rounded text-xs border"
          :class="
            isDark
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
          "
        />

        <!-- Контекстное меню -->
        <div class="relative" v-click-outside="() => (showContextMenu = false)">
          <button
            @click.prevent.stop="showContextMenu = !showContextMenu"
            type="button"
            class="p-1.5 rounded transition-all opacity-0 group-hover:opacity-100"
            :class="
              isDark
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
            "
            title="Дополнительные действия"
          >
            <i class="fas fa-ellipsis-v text-xs"></i>
          </button>

          <!-- Выпадающее меню -->
          <div
            v-if="showContextMenu"
            class="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg z-50 border"
            :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
          >
            <button
              @click.prevent.stop="
                duplicateItem()
                showContextMenu = false
              "
              type="button"
              class="w-full text-left px-4 py-2 text-sm rounded-t-lg transition-colors"
              :class="
                isDark
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              "
            >
              <i class="fas fa-copy mr-2"></i>
              Дублировать
            </button>
            <button
              @click.prevent.stop="
                turnIntoGroup()
                showContextMenu = false
              "
              type="button"
              class="w-full text-left px-4 py-2 text-sm transition-colors"
              :class="
                isDark
                  ? 'bg-gray-800 text-white hover:bg-gray-700'
                  : 'bg-white text-gray-900 hover:bg-gray-50'
              "
            >
              <i class="fas fa-folder-plus mr-2"></i>
              Превратить в группу
            </button>
            <button
              @click.prevent.stop="
                removeItem()
                showContextMenu = false
              "
              type="button"
              class="w-full text-left px-4 py-2 text-sm rounded-b-lg transition-colors"
              :class="
                isDark
                  ? 'bg-gray-800 text-red-400 hover:bg-red-900/20'
                  : 'bg-white text-red-600 hover:bg-red-50'
              "
            >
              <i class="fas fa-trash mr-2"></i>
              Удалить
            </button>
          </div>
        </div>
      </div>

      <!-- Группа -->
      <div
        v-if="isGroup"
        class="filter-group border rounded-lg p-3"
        :class="isDark ? 'border-gray-600 bg-gray-800/30' : 'border-gray-300 bg-gray-50/50'"
      >
        <div class="flex items-center gap-2 mb-3">
          <button
            @click="toggleGroupOperator"
            type="button"
            class="px-3 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1"
            :class="
              isDark
                ? item.operator === 'AND'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
                : item.operator === 'AND'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-purple-500 text-white hover:bg-purple-600'
            "
          >
            {{ item.operator }}
            <i class="fas fa-chevron-down text-xs"></i>
          </button>

          <!-- Контекстное меню для группы -->
          <div class="relative ml-auto" v-click-outside="() => (showContextMenu = false)">
            <button
              @click.prevent.stop="showContextMenu = !showContextMenu"
              type="button"
              class="p-1.5 rounded transition-all opacity-70 hover:opacity-100"
              :class="
                isDark
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
              "
              title="Дополнительные действия"
            >
              <i class="fas fa-ellipsis-v text-xs"></i>
            </button>

            <!-- Выпадающее меню -->
            <div
              v-if="showContextMenu"
              class="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg z-50 border"
              :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
            >
              <button
                @click.prevent.stop="
                  duplicateItem()
                  showContextMenu = false
                "
                type="button"
                class="w-full text-left px-4 py-2 text-sm rounded-t-lg transition-colors"
                :class="
                  isDark
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                "
              >
                <i class="fas fa-copy mr-2"></i>
                Дублировать
              </button>
              <button
                @click.prevent.stop="
                  removeItem()
                  showContextMenu = false
                "
                type="button"
                class="w-full text-left px-4 py-2 text-sm rounded-b-lg transition-colors"
                :class="
                  isDark
                    ? 'bg-gray-800 text-red-400 hover:bg-red-900/20'
                    : 'bg-white text-red-600 hover:bg-red-50'
                "
              >
                <i class="fas fa-trash mr-2"></i>
                Удалить
              </button>
            </div>
          </div>
        </div>

        <!-- Вложенные элементы -->
        <div
          class="ml-4 space-y-2 border-l-2 pl-4"
          :class="isDark ? 'border-gray-600' : 'border-gray-300'"
        >
          <FilterItem
            v-for="(childItem, childIndex) in item.conditions"
            :key="childItem.id"
            :item="childItem"
            :index="childIndex"
            :level="level + 1"
            :isDark="isDark"
            :showOperatorBefore="false"
            :parentOperator="item.operator"
            :parentPath="[...parentPath, index]"
            @update="(path, item) => $emit('update', [index, ...path], item)"
            @remove="(path) => $emit('remove', [index, ...path])"
            @add-group="(path) => $emit('add-group', [index, ...path])"
            @add-rule="(path) => $emit('add-rule', [index, ...path])"
            @duplicate="(path) => $emit('duplicate', [index, ...path])"
            @turn-into-group="(path) => $emit('turn-into-group', [index, ...path])"
            @toggle-parent-operator="(path) => toggleGroupOperatorInParent([index, ...path])"
          />
        </div>

        <!-- Кнопки добавления внутри группы -->
        <div class="mt-3 ml-4">
          <div class="relative" v-click-outside="() => (showAddMenu = false)">
            <button
              @click.prevent.stop="showAddMenu = !showAddMenu"
              type="button"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
              :class="
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              "
            >
              <i class="fas fa-plus text-xs"></i>
              <span>Добавить</span>
              <i class="fas fa-chevron-down ml-1 text-xs"></i>
            </button>

            <!-- Выпадающее меню -->
            <div
              v-if="showAddMenu"
              class="absolute left-0 mt-1 w-48 rounded-lg shadow-lg z-50 border"
              :class="isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'"
            >
              <button
                @click.prevent.stop="
                  addRuleToItem()
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
                @click.prevent.stop="
                  addGroupToItem()
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  isDark: {
    type: Boolean,
    default: false
  },
  showOperatorBefore: {
    type: Boolean,
    default: false
  },
  parentOperator: {
    type: String,
    default: 'OR'
  },
  parentPath: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update',
  'remove',
  'add-group',
  'add-rule',
  'duplicate',
  'turn-into-group',
  'toggle-parent-operator'
])

const isCondition = 'property' in props.item
const isGroup = 'conditions' in props.item

const showContextMenu = ref(false)
const showAddMenu = ref(false)

const properties = [
  { value: 'urlPath', label: 'URL путь' },
  { value: 'url', label: 'URL' },
  { value: 'utm_source', label: 'UTM Source' },
  { value: 'utm_medium', label: 'UTM Medium' },
  { value: 'utm_campaign', label: 'UTM Campaign' },
  { value: 'utm_term', label: 'UTM Term' },
  { value: 'utm_content', label: 'UTM Content' }
]

const operators = [
  { value: 'is', label: 'Равно' },
  { value: 'isNot', label: 'Не равно' },
  { value: 'contains', label: 'Содержит' },
  { value: 'doesNotContain', label: 'Не содержит' },
  { value: 'startsWith', label: 'Начинается с' },
  { value: 'endsWith', label: 'Заканчивается на' },
  { value: 'isEmpty', label: 'Пусто' },
  { value: 'isNotEmpty', label: 'Не пусто' }
]

function updateItem(updates) {
  const updated = { ...props.item, ...updates }
  emit('update', [props.index], updated)
}

function removeItem() {
  emit('remove', [props.index])
}

function toggleGroupOperator() {
  if (isGroup) {
    const newOperator = props.item.operator === 'AND' ? 'OR' : 'AND'
    updateItem({ operator: newOperator })
  }
}

function toggleParentOperator() {
  // Если это элемент внутри группы (parentPath не пустой), переключаем оператор группы
  if (props.parentPath.length > 0) {
    // Переключаем оператор родительской группы
    emit('toggle-parent-operator', props.parentPath)
  } else {
    // Если это корневой уровень, переключаем корневой оператор
    emit('toggle-parent-operator', [])
  }
}

function toggleGroupOperatorInParent(path) {
  // Передаём событие дальше вверх по иерархии
  emit('toggle-parent-operator', path)
}

function addGroupToItem() {
  emit('add-group', [props.index])
}

function addRuleToItem() {
  emit('add-rule', [props.index])
}

function duplicateItem() {
  emit('duplicate', [props.index])
}

function turnIntoGroup() {
  emit('turn-into-group', [props.index])
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
</script>

<style scoped>
.filter-item-wrapper {
  transition: all 0.2s;
}

.filter-item {
  transition: all 0.2s;
}

.filter-item-group {
  padding: 8px;
  border-radius: 8px;
}

.filter-group {
  transition: all 0.2s;
}
</style>

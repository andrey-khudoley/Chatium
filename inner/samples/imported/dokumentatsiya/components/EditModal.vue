<template>
  <div
    v-if="isOpen"
    @click.self="$emit('close')"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
      <h2 class="text-xl font-bold mb-4">{{ title }}</h2>

      <!-- Title Input -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ ctx.t('Title') }}</label>
        <input
          v-model="localData.title"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :placeholder="ctx.t('Enter title')"
        />
      </div>

      <!-- Slug Input -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">{{
          ctx.t('Slug (URL)')
        }}</label>
        <input
          v-model="localData.slug"
          @input="handleSlugInput"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :placeholder="ctx.t('url-friendly-slug')"
        />
        <p class="text-xs text-gray-500 mt-1">{{ ctx.t('Leave empty for auto-generation') }}</p>
      </div>

      <!-- Type Selector -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ ctx.t('Type') }}</label>
        <select
          v-model="localData.type"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="page">{{ ctx.t('Page') }}</option>
          <option value="section">{{ ctx.t('Section') }}</option>
        </select>
      </div>

      <!-- Order Input (only when editing) -->
      <div v-if="!isCreating" class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ ctx.t('Order') }}</label>
        <input
          v-model.number="localData.order"
          type="number"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :placeholder="ctx.t('Sort order')"
        />
      </div>

      <!-- Published Checkbox -->
      <div class="mb-4">
        <label class="flex items-center">
          <input
            v-model="localData.isPublished"
            type="checkbox"
            class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span class="text-sm font-medium text-gray-700">{{ ctx.t('Published') }}</span>
        </label>
        <p class="text-xs text-gray-500 mt-1">
          {{ ctx.t('Unpublished pages are visible only to administrators') }}
        </p>
      </div>

      <!-- Parent Selector -->
      <div class="mb-4">
        <ParentSelector
          :documents="documents"
          :node-type="nodeType"
          :node-id="nodeId"
          :node-doc-type="localData.type"
          :selected-value="selectedParent"
          @select="handleParentSelect"
        />
      </div>

      <!-- Buttons -->
      <div class="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          v-if="!isCreating"
          @click="$emit('delete')"
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          <i class="fas fa-trash mr-1"></i>{{ ctx.t('Delete') }}
        </button>
        <div v-else></div>

        <div class="flex space-x-2">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {{ ctx.t('Cancel') }}
          </button>
          <button
            @click="handleSave"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <i class="fas fa-save mr-1"></i>{{ ctx.t('Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import ParentSelector from './ParentSelector.vue'

const props = defineProps({
  isOpen: Boolean,
  nodeType: String, // 'page' | 'section'
  nodeId: String,
  data: Object, // { title, type, parentId }
  documents: Array
})

const emit = defineEmits(['close', 'save', 'delete'])

const localData = ref({
  title: '',
  slug: '',
  type: 'page',
  parentId: null,
  order: 0,
  isPublished: false // Will be updated in watch based on type
})

const selectedParent = ref('none')
const parentSelected = ref(false) // Track if parent was explicitly selected
const slugManuallyEdited = ref(false) // Track if user manually edited slug

// Транслитерация для автогенерации slug
function transliterate(text) {
  const ru = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
    А: 'A',
    Б: 'B',
    В: 'V',
    Г: 'G',
    Д: 'D',
    Е: 'E',
    Ё: 'Yo',
    Ж: 'Zh',
    З: 'Z',
    И: 'I',
    Й: 'Y',
    К: 'K',
    Л: 'L',
    М: 'M',
    Н: 'N',
    О: 'O',
    П: 'P',
    Р: 'R',
    С: 'S',
    Т: 'T',
    У: 'U',
    Ф: 'F',
    Х: 'H',
    Ц: 'Ts',
    Ч: 'Ch',
    Ш: 'Sh',
    Щ: 'Sch',
    Ъ: '',
    Ы: 'Y',
    Ь: '',
    Э: 'E',
    Ю: 'Yu',
    Я: 'Ya'
  }

  return text
    .split('')
    .map((char) => ru[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const title = computed(() => {
  const isCreating = !props.nodeId
  if (isCreating) {
    return props.nodeType === 'section' ? ctx.t('Create Section') : ctx.t('Create Page')
  }
  return props.nodeType === 'section' ? ctx.t('Edit Section') : ctx.t('Edit Page')
})

const isCreating = computed(() => !props.nodeId)

watch(
  () => props.data,
  (newData) => {
    if (newData) {
      const isCreating = !props.nodeId
      const isSection = (newData.type || props.nodeType) === 'section'

      localData.value = {
        title: newData.title || '',
        slug: newData.slug || '',
        type: newData.type || 'page',
        parentId: newData.parentId || null,
        order: newData.order || 0,
        // If isPublished is explicitly provided, use it; otherwise use default based on type
        isPublished:
          newData.isPublished !== undefined
            ? newData.isPublished
            : isCreating && isSection
              ? true
              : false
      }

      // Set selected parent based on current data
      if (newData.parentId) {
        const parentId =
          typeof newData.parentId === 'string' ? newData.parentId : newData.parentId.id
        selectedParent.value = `doc:${parentId}`
        parentSelected.value = true // Mark as selected if parentId exists in data
      } else {
        selectedParent.value = 'none'
        parentSelected.value = false
      }
      // Reset slug manually edited flag when data changes
      slugManuallyEdited.value = false
    }
  },
  { immediate: true }
)

// Автогенерация slug при изменении title (только при создании и если пользователь не редактировал вручную)
watch(
  () => localData.value.title,
  (newTitle) => {
    if (newTitle && !slugManuallyEdited.value && isCreating.value) {
      localData.value.slug = transliterate(newTitle)
    }
  }
)

// Обработчик ручного редактирования slug
function handleSlugInput() {
  slugManuallyEdited.value = true
}

function handleParentSelect(value) {
  selectedParent.value = value
  parentSelected.value = true // Mark that parent was explicitly selected
}

function handleSave() {
  const saveData = {
    title: localData.value.title,
    slug: localData.value.slug,
    type: localData.value.type,
    isPublished: localData.value.isPublished
  }

  // Only include order when editing (not creating)
  if (!isCreating.value) {
    saveData.order = localData.value.order
  }

  // Only include parentId if parent was explicitly selected
  if (parentSelected.value) {
    let parentId = null

    if (selectedParent.value !== 'none') {
      const [type, id] = selectedParent.value.split(':')
      if (type === 'doc') {
        parentId = id
      }
    }

    saveData.parentId = parentId
  }

  emit('save', saveData)
}
</script>

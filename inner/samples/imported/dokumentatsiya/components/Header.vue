<template>
  <header class="bg-white border-b border-gray-200 px-4 py-3 pt-6">
    <div class="max-w-7xl mx-auto">
      <!-- First row: Logo and Search -->
      <div class="flex items-center justify-between pb-3 mb-4 border-gray-100">
        <!-- Logo -->
        <a :href="props.basePath" class="flex items-center space-x-3 cursor-pointer">
          <img
            src="https://fs.cdn-chatium.io/get/image_gc_dQ8uxvoDUR.512x512.png"
            alt="Chatium"
            class="w-8 h-8 rounded-md object-cover"
          />
          <span class="text-4xl font-bold text-gray-900">{{ ctx.t('Documentation') }}<br /></span>
        </a>

        <!-- Search and Settings -->
        <div class="flex items-center space-x-3">
          <!-- Settings Icon (Admin Only) -->
          <a
            v-if="ctx.user?.is('Admin')"
            :href="settingsPageRoute.url()"
            class="text-gray-500 hover:text-gray-900 transition-colors"
            :title="ctx.t('Settings')"
          >
            <i class="fas fa-cog text-lg"></i>
          </a>

          <!-- Search -->
          <div class="relative hidden lg:block">
            <i
              class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"
            ></i>
            <input
              ref="searchInputElement"
              v-model="searchQuery"
              @input="handleSearch"
              @keydown="handleSearchKeydown"
              type="text"
              :placeholder="ctx.t('Search...')"
              class="w-80 pl-10 pr-12 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <kbd
              class="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded"
            >
              ⌘ K
            </kbd>

            <!-- Search Results Dropdown -->
            <div
              v-if="showResults && searchResults.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-10"
            >
              <button
                v-for="(result, index) in searchResults"
                :key="result.id"
                @click="selectResult(result)"
                :class="[
                  'w-full text-left px-4 py-2 border-b border-gray-100 last:border-b-0 transition-colors',
                  selectedIndex === index ? 'bg-blue-100' : 'hover:bg-blue-50'
                ]"
              >
                <div class="flex items-center space-x-2">
                  <img
                    v-if="result.imageHash"
                    :src="getThumbnailUrl(result.imageHash, 32)"
                    class="w-4 h-4 object-cover rounded"
                    :alt="result.title"
                  />
                  <i
                    v-else-if="result.icon"
                    :class="`fas fa-${result.icon} text-gray-400 text-sm`"
                  ></i>
                  <i
                    v-else
                    :class="`fas ${result.type === 'section' ? 'fa-folder' : 'fa-file-lines'} text-gray-400 text-sm`"
                  ></i>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-900 truncate">{{ result.title }}</div>
                    <div class="text-xs text-gray-500">
                      {{ result.type === 'section' ? ctx.t('Section') : ctx.t('Page') }}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <!-- No Results Message -->
            <div
              v-else-if="showResults && searchQuery.length >= 2"
              class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500 z-10"
            >
              {{ ctx.t('No results found') }}
            </div>
          </div>
        </div>

        <!-- Burger Menu Button (mobile) -->
        <button @click="$emit('toggle-menu')" class="md:hidden text-gray-600 hover:text-gray-900">
          <i class="fas fa-bars text-lg"></i>
        </button>
      </div>

      <!-- Second row: Horizontal Menu (Top-level Sections) + Controls -->
      <nav class="hidden md:flex items-center justify-between">
        <div class="flex items-center space-x-8">
          <a
            v-for="section in sections"
            :key="section.id"
            @click.prevent="$emit('section-change', section.id)"
            @dblclick="handleSectionDoubleClick(section)"
            :class="[
              'pb-1 text-sm transition-colors relative cursor-pointer flex items-center gap-2',
              currentActiveId === section.id
                ? 'text-gray-900 font-semibold border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-900'
            ]"
          >
            <!-- Section Image/Icon -->
            <img
              v-if="section.imageHash"
              :src="getThumbnailUrl(section.imageHash, 32)"
              class="w-4 h-4 object-cover rounded"
              :alt="section.title"
            />
            <i v-else-if="section.icon" :class="['fas', `fa-${section.icon}`, 'text-sm']"></i>
            {{ section.title }}
          </a>
        </div>

        <!-- Admin Controls -->
        <div v-if="ctx.user?.is('Admin')" class="flex items-center space-x-2">
          <!-- Add Section Button (only in edit mode) -->
          <button
            v-if="!isViewMode"
            @click="$emit('add-section')"
            class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <i class="fas fa-plus mr-1"></i>{{ ctx.t('Add Section') }}
          </button>

          <!-- Add Page Button (only in edit mode) -->
          <button
            v-if="!isViewMode"
            @click="$emit('add-page')"
            class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            <i class="fas fa-plus mr-1"></i>{{ ctx.t('Add Page') }}
          </button>

          <!-- View/Edit Toggle -->
          <button
            @click="$emit('toggle-view-mode')"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              isViewMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            <i :class="isViewMode ? 'fas fa-pen' : 'fas fa-eye'" class="mr-1"></i
            >{{ isViewMode ? ctx.t('Edit') : ctx.t('View') }}
          </button>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { apiDocumentSearchRoute } from '../api/documents'
import { getThumbnailUrl } from '@app/storage'
import { settingsPageRoute } from '../index'

const props = defineProps({
  basePath: String,
  activeSectionId: String,
  sections: Array,
  isViewMode: Boolean
})

const emit = defineEmits([
  'section-change',
  'edit',
  'navigate',
  'navigate-home',
  'toggle-menu',
  'toggle-view-mode',
  'add-section',
  'add-page'
])

const searchQuery = ref('')
const searchResults = ref([])
const showResults = ref(false)
const selectedIndex = ref(-1)
const currentActiveId = ref(null)
const searchInputElement = ref(null)

onMounted(async () => {
  currentActiveId.value = props.activeSectionId

  // Add Cmd+K keyboard shortcut
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      searchInputElement.value?.focus()
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

watch(
  () => props.activeSectionId,
  (newValue) => {
    currentActiveId.value = newValue
  }
)

async function handleSearch() {
  if (searchQuery.value.length < 2) {
    showResults.value = false
    searchResults.value = []
    selectedIndex.value = -1
    return
  }

  try {
    showResults.value = true
    const results = await apiDocumentSearchRoute.query({ q: searchQuery.value }).run(ctx)
    searchResults.value = results || []
    selectedIndex.value = -1
  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
    selectedIndex.value = -1
  }
}

function handleSearchKeydown(event) {
  if (!showResults.value || searchResults.value.length === 0) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, searchResults.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (selectedIndex.value >= 0) {
        selectResult(searchResults.value[selectedIndex.value])
      }
      break
    case 'Escape':
      searchQuery.value = ''
      showResults.value = false
      selectedIndex.value = -1
      break
  }
}

function selectResult(result) {
  searchQuery.value = ''
  showResults.value = false
  searchResults.value = []
  selectedIndex.value = -1
  // Don't set currentActiveId here - let parent component handle it via prop
  // The parent will find the root section and update activeSectionId
  emit('navigate', result.id)
}

function handleSectionDoubleClick(section) {
  if (!ctx.user?.is('Admin')) return
  emit('edit', {
    nodeId: section.id,
    nodeType: 'section',
    title: section.title,
    type: section.type,
    order: section.order || 0,
    parentId: section.parentId
  })
}

defineExpose({ currentActiveId })
</script>

<style scoped>
/* Prevent double-click text selection on logo */
.cursor-pointer {
  user-select: none;
}
</style>

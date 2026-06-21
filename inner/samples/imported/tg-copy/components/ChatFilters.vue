<template>
  <div class="filters-container">
    <div 
      ref="filtersList"
      class="filters-list"
      @wheel="onWheel"
    >
      <div
        v-for="(filter, index) in allFilters"
        :key="filter.id"
        :class="[
          'filter-item',
          { active: activeFilter === filter.id },
          { dragging: draggedFilter?.id === filter.id },
          { 'drag-over': dragOverIndex === index },
          { 'is-custom': filter.isCustom }
        ]"
        :draggable="true"
        @dragstart="onDragStart($event, filter, index)"
        @dragover="onDragOver($event, index)"
        @drop="onDrop($event, index)"
        @dragend="onDragEnd"
        @click="selectFilter(filter.id)"
        @contextmenu.prevent="onContextMenu($event, filter)"
      >
        <span class="filter-icon" v-if="filter.icon">{{ filter.icon }}</span>
        <i v-else-if="filter.iconClass" :class="filter.iconClass"></i>
        <span class="filter-name">{{ filter.name }}</span>
        <span v-if="filter.count !== undefined" class="filter-count">{{ filter.count }}</span>
      </div>
      
      <!-- Кнопка добавления папки -->
      <button 
        class="filter-item add-folder-btn"
        @click="$emit('create-folder')"
        title="Создать папку"
      >
        <i class="fas fa-plus"></i>
      </button>
    </div>
    
    <!-- Кнопки прокрутки (для мобильных/планшетов) -->
    <button 
      v-if="canScrollLeft"
      class="scroll-btn scroll-left"
      @click="scroll('left')"
    >
      <i class="fas fa-chevron-left"></i>
    </button>
    <button 
      v-if="canScrollRight"
      class="scroll-btn scroll-right"
      @click="scroll('right')"
    >
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
  
  <!-- Контекстное меню для кастомных папок -->
  <div 
    v-if="showContextMenu" 
    class="context-menu-overlay"
    @click="showContextMenu = false"
  >
    <div 
      class="context-menu"
      :style="{ top: contextMenuPos.y + 'px', left: contextMenuPos.x + 'px' }"
      @click.stop
    >
      <button @click="editFolder" class="context-item">
        <i class="fas fa-edit"></i>
        <span>Изменить</span>
      </button>
      <button @click="deleteFolder" class="context-item danger">
        <i class="fas fa-trash"></i>
        <span>Удалить</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  filters: {
    type: Array,
    default: () => []
  },
  customFolders: {
    type: Array,
    default: () => []
  },
  activeFilter: {
    type: String,
    default: 'all'
  },
  chats: {
    type: Array,
    default: () => []
  },
  filterOrders: {
    type: Array,
    default: () => []
  },
  inboxBadges: {
    type: Map,
    default: () => new Map()
  }
})

const emit = defineEmits([
  'select-filter', 
  'reorder-filters', 
  'create-folder', 
  'edit-folder', 
  'delete-folder'
])

const filtersList = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

// Drag & drop state
const draggedFilter = ref(null)
const draggedIndex = ref(null)
const dragOverIndex = ref(null)

// Context menu state
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const contextMenuFilter = ref(null)

// Базовые фильтры
const baseFilters = computed(() => [
  { id: 'all', name: 'Все', iconClass: 'fas fa-layer-group' },
  { id: 'groups', name: 'Группы', iconClass: 'fas fa-users' },
  { id: 'personal', name: 'Личные', iconClass: 'fas fa-user' },
  { id: 'channels', name: 'Каналы', iconClass: 'fas fa-bullhorn' },
])

// Подсчёт непрочитанных сообщений для каждого фильтра
const filtersWithCounts = computed(() => {
  return baseFilters.value.map(filter => {
    let unreadCount = 0
    let targetChats = []

    if (filter.id === 'all') {
      targetChats = props.chats
    } else if (filter.id === 'groups') {
      targetChats = props.chats.filter(c => c.type === 'group')
    } else if (filter.id === 'personal') {
      targetChats = props.chats.filter(c => c.type === 'direct')
    } else if (filter.id === 'channels') {
      targetChats = props.chats.filter(c => c.type === 'channel')
    }

    // Суммируем непрочитанные сообщения
    unreadCount = targetChats.reduce((sum, chat) => {
      return sum + (props.inboxBadges.get(chat.inboxSubjectId) || 0)
    }, 0)

    return { ...filter, count: unreadCount > 0 ? unreadCount : undefined, isCustom: false }
  })
})

// Кастомные папки с суммой непрочитанных
const customFoldersWithFlag = computed(() => {
  return props.customFolders.map(folder => {
    // Суммируем непрочитанные сообщения для чатов в папке
    const unreadCount = (folder.chatIds || []).reduce((sum, feedId) => {
      const chat = props.chats.find(c => c.feedId === feedId)
      if (chat) {
        return sum + (props.inboxBadges.get(chat.inboxSubjectId) || 0)
      }
      return sum
    }, 0)

    return {
      ...folder,
      id: `folder-${folder.id}`,
      isCustom: true,
      count: unreadCount > 0 ? unreadCount : undefined
    }
  })
})

// Все фильтры вместе с учётом сохранённого порядка
const allFilters = computed(() => {
  const base = filtersWithCounts.value
  const custom = customFoldersWithFlag.value
  
  // Если есть сохранённый порядок - используем его
  if (props.filterOrders && props.filterOrders.length > 0) {
    const all = [...base, ...custom]
    const orderMap = new Map(props.filterOrders.map(o => [o.filterId, o.position]))
    
    // Сортируем по сохранённой позиции
    return all.sort((a, b) => {
      const posA = orderMap.get(a.id) ?? 999999
      const posB = orderMap.get(b.id) ?? 999999
      return posA - posB
    })
  }
  
  // По умолчанию - базовые фильтры первыми, потом кастомные
  return [...base, ...custom]
})

function selectFilter(filterId) {
  emit('select-filter', filterId)
}

function onWheel(event) {
  if (filtersList.value) {
    event.preventDefault()
    // Поддержка горизонтального скролла тачпада (deltaX) и вертикального колеса мыши (deltaY)
    const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY
    filtersList.value.scrollLeft += delta
    updateScrollButtons()
  }
}

function scroll(direction) {
  if (filtersList.value) {
    const scrollAmount = 150
    filtersList.value.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
    setTimeout(updateScrollButtons, 300)
  }
}

function updateScrollButtons() {
  if (!filtersList.value) return
  const { scrollLeft, scrollWidth, clientWidth } = filtersList.value
  canScrollLeft.value = scrollLeft > 0
  canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 5
}

// Drag & drop handlers
function onDragStart(event, filter, index) {
  draggedFilter.value = filter
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', filter.id)
}

function onDragOver(event, index) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

function onDrop(event, index) {
  event.preventDefault()
  dragOverIndex.value = null
  
  if (draggedIndex.value === null || draggedIndex.value === index) return
  
  // Создаём новый порядок фильтров
  const newFilters = [...allFilters.value]
  const [removed] = newFilters.splice(draggedIndex.value, 1)
  newFilters.splice(index, 0, removed)
  
  // Отделяем базовые и кастомные фильтры
  const baseIds = ['all', 'groups', 'personal', 'channels']
  const newOrder = newFilters.map(f => ({
    id: f.id,
    isCustom: f.isCustom,
    originalId: f.isCustom ? f.id.replace('folder-', '') : f.id
  }))
  
  emit('reorder-filters', newOrder)
}

function onDragEnd() {
  draggedFilter.value = null
  draggedIndex.value = null
  dragOverIndex.value = null
}

// Context menu
function onContextMenu(event, filter) {
  if (!filter.isCustom) return
  
  contextMenuFilter.value = filter
  contextMenuPos.value = { x: event.clientX, y: event.clientY }
  showContextMenu.value = true
}

function editFolder() {
  if (contextMenuFilter.value) {
    emit('edit-folder', contextMenuFilter.value.originalId || contextMenuFilter.value.id.replace('folder-', ''))
  }
  showContextMenu.value = false
}

function deleteFolder() {
  if (contextMenuFilter.value) {
    emit('delete-folder', contextMenuFilter.value.originalId || contextMenuFilter.value.id.replace('folder-', ''))
  }
  showContextMenu.value = false
}

onMounted(() => {
  nextTick(() => {
    updateScrollButtons()
    if (filtersList.value) {
      filtersList.value.addEventListener('scroll', updateScrollButtons)
    }
  })
})

onUnmounted(() => {
  if (filtersList.value) {
    filtersList.value.removeEventListener('scroll', updateScrollButtons)
  }
})
</script>

<style scoped>
.filters-container {
  position: relative;
  display: flex;
  align-items: center;
}

.filters-list {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0.25rem 0;
  flex: 1;
}

.filters-list::-webkit-scrollbar {
  display: none;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 1.25rem;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  user-select: none;
}

.filter-item:hover {
  background: var(--bg-hover);
}

.filter-item.active {
  background: var(--accent-light);
  color: var(--accent-primary);
}

.filter-item.is-custom {
  background: var(--bg-secondary);
}

.filter-item.is-custom.active {
  background: var(--accent-light);
}

.filter-item.dragging {
  opacity: 0.5;
}

.filter-item.drag-over {
  border-left: 2px solid var(--accent-primary);
}

.filter-icon {
  font-size: 0.875rem;
}

.filter-name {
  line-height: 1;
}

.filter-count {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  background: var(--bg-hover);
  border-radius: 0.75rem;
  color: var(--text-secondary);
  min-width: 1.125rem;
  text-align: center;
}

.filter-item.active .filter-count {
  background: var(--accent-primary);
  color: white;
}

.add-folder-btn {
  width: 2rem;
  height: 2rem;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.add-folder-btn:hover {
  background: var(--accent-light);
  color: var(--accent-primary);
}

/* Scroll buttons */
.scroll-btn {
  position: absolute;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  box-shadow: var(--shadow-sm);
  z-index: 2;
}

.scroll-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.scroll-left {
  left: 0;
}

.scroll-right {
  right: 0;
}

/* Context menu */
.context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.context-menu {
  position: fixed;
  min-width: 9rem;
  background: var(--menu-bg);
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg);
  padding: 0.375rem 0;
  z-index: 1001;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  width: 100%;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
}

.context-item:hover {
  background: var(--menu-hover);
}

.context-item.danger {
  color: var(--danger-color);
}

.context-item i {
  font-size: 0.875rem;
  width: 1rem;
  text-align: center;
}
</style>
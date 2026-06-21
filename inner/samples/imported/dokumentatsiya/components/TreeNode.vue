<template>
  <div>
    <!-- Drop Zone Before (for reordering) -->
    <div
      v-if="level > 0 || node.type === 'page'"
      @dragover.prevent="handleDropZoneDragOver($event, 'before')"
      @dragleave="handleDropZoneLeave"
      @drop.prevent="handleDropZoneDrop($event, 'before')"
      class="relative"
    >
      <!-- Preview placeholder -->
      <div
        v-if="dropPosition === 'before' && localDraggedData"
        :style="{
          paddingLeft:
            (level === 0
              ? 12
              : level === 1 && parentNode?.type === 'page'
                ? 20
                : level === 1
                  ? 12
                  : (level - 1) * 20) + 'px'
        }"
        class="flex items-center py-2 px-3 text-sm bg-blue-50 border-2 border-dashed border-blue-400 rounded opacity-75"
      >
        <i class="fas fa-file-alt mr-2 text-sm text-blue-500"></i>
        <span class="text-blue-600">{{ localDraggedData.title }}</span>
        <i class="fas fa-arrow-down ml-auto text-blue-400 text-sm"></i>
      </div>
      <!-- Drop line indicator -->
      <div
        v-if="dropPosition === 'before' && !localDraggedData"
        :class="['h-1 transition-all bg-blue-500']"
        :style="{ marginLeft: Math.max(12, (level - 1) * 16 + 12) + 'px' }"
      ></div>
    </div>

    <!-- Page Node -->
    <div
      v-if="node.type === 'page' && (node.isPublished || !isViewMode || ctx.user?.is('Admin'))"
      :draggable="ctx.user?.is('Admin') && !isViewMode ? 'true' : 'false'"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
      @click="handlePageClick"
      @dblclick="handlePageDoubleClick"
      :class="[
        'flex items-center py-1 pr-3 text-sm group relative cursor-pointer rounded-lg',
        isActive ? 'bg-blue-50 text-blue-500' : 'text-gray-700 hover:bg-gray-50',
        isDragging ? 'opacity-40' : '',
        isMovingToParent ? 'ring-2 ring-purple-400 ring-inset bg-purple-50' : '',
        isDropTarget && localDraggedData
          ? 'ring-2 ring-blue-400 ring-inset'
          : isDropTarget
            ? 'bg-blue-100 border-l-4 border-blue-500'
            : '',
        !node.isPublished && ctx.user?.is('Admin') ? 'italic text-gray-400' : ''
      ]"
      :style="{
        paddingLeft:
          (level === 0
            ? 12
            : level === 1 && parentNode?.type === 'page'
              ? 20
              : level === 1
                ? 12
                : (level - 1) * 20) + 'px'
      }"
    >
      <!-- Icon (clickable for admins only in edit mode) -->
      <img
        v-if="node.imageHash"
        :src="getThumbnailUrl(node.imageHash, 48)"
        class="w-6 h-6 flex-shrink-0 object-cover rounded"
        style="margin-right: 12px"
        @click.prevent.stop="showIconSelector = true"
        :style="{ cursor: ctx.user?.is('Admin') && !isViewMode ? 'pointer' : 'default' }"
      />
      <i
        v-else-if="node.icon"
        :class="[
          'fas',
          `fa-${node.icon}`,
          'text-base flex-shrink-0',
          isActive ? 'text-blue-500' : 'text-gray-400'
        ]"
        style="margin-right: 12px; display: inline-block"
        @click.prevent.stop="showIconSelector = true"
        :style="{ cursor: ctx.user?.is('Admin') && !isViewMode ? 'pointer' : 'default' }"
      ></i>
      <i
        v-else
        :class="[
          'fas fa-file-lines text-base flex-shrink-0',
          isActive ? 'text-blue-500' : 'text-gray-400'
        ]"
        style="margin-right: 12px; display: inline-block"
        @click.prevent.stop="showIconSelector = true"
        :style="{ cursor: ctx.user?.is('Admin') && !isViewMode ? 'pointer' : 'default' }"
      ></i>

      <span class="flex-1">{{ node.title }}</span>

      <!-- Unsaved Indicator -->
      <div v-if="isUnsaved" class="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mr-2"></div>

      <!-- Move to parent indicator -->
      <div
        v-if="isMovingToParent"
        class="ml-2 flex items-center space-x-1 text-purple-600 flex-shrink-0"
      >
        <i class="fas fa-level-up-alt text-xs"></i>
        <span class="text-xs">to parent</span>
      </div>

      <!-- Expand/Collapse Arrow (right side, only for pages) -->
      <i
        v-if="node.type === 'page' && node.children && node.children.length > 0"
        :class="[
          'fas',
          shouldShowChildren ? 'fa-chevron-down' : 'fa-chevron-right',
          'ml-2 text-xs text-gray-400 cursor-pointer flex-shrink-0'
        ]"
        @click.prevent.stop="toggleExpand"
      ></i>

      <div
        v-if="ctx.user?.is('Admin') && !isViewMode"
        class="ml-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <button
          v-if="index > 0"
          @click.prevent="$emit('move-up', { nodeId: node.id, nodeType: node.type })"
          class="text-gray-400 hover:text-blue-600 p-1"
          title="Move up"
        >
          <i class="fas fa-arrow-up text-xs"></i>
        </button>
        <button
          v-if="index < totalSiblings - 1"
          @click.prevent="$emit('move-down', { nodeId: node.id, nodeType: node.type })"
          class="text-gray-400 hover:text-blue-600 p-1"
          title="Move down"
        >
          <i class="fas fa-arrow-down text-xs"></i>
        </button>
        <button
          @click.prevent="$emit('create-child', node.id)"
          class="text-gray-400 hover:text-blue-600 p-1"
          title="Add child"
        >
          <i class="fas fa-plus text-xs"></i>
        </button>
        <button
          @click.prevent="$emit('edit', { nodeId: node.id, nodeType: node.type, type: node.type })"
          class="text-gray-400 hover:text-blue-600 p-1"
          title="Edit"
        >
          <i class="fas fa-cog text-xs"></i>
        </button>
      </div>
    </div>

    <!-- Section Node (Header) -->
    <div
      v-else-if="
        node.type === 'section' && (node.isPublished || !isViewMode || ctx.user?.is('Admin'))
      "
      :draggable="ctx.user?.is('Admin') && !isViewMode ? 'true' : 'false'"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
      @dblclick="handleSectionDoubleClick"
      :class="[
        'flex items-center py-1 pr-3 text-sm group relative mt-4 mb-1 rounded-lg',
        'text-gray-900 font-semibold',
        isDragging ? 'opacity-40' : '',
        isMovingToParent ? 'ring-2 ring-purple-400 ring-inset bg-purple-50' : '',
        isDropTarget && localDraggedData
          ? 'ring-2 ring-blue-400 ring-inset'
          : isDropTarget
            ? 'bg-blue-50 border-l-4 border-blue-500'
            : ''
      ]"
      :style="{
        paddingLeft:
          (level === 0
            ? 12
            : level === 1 && parentNode?.type === 'page'
              ? 20
              : level === 1
                ? 12
                : (level - 1) * 20) + 'px'
      }"
    >
      <span class="flex-1 cursor-pointer">{{ node.title }}</span>

      <div
        v-if="ctx.user?.is('Admin') && !isViewMode"
        class="ml-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 flex-shrink-0"
      >
        <button
          v-if="index > 0"
          @click.prevent="$emit('move-up', { nodeId: node.id, nodeType: node.type })"
          class="text-gray-400 hover:text-blue-600 p-1"
          title="Move up"
        >
          <i class="fas fa-arrow-up text-xs"></i>
        </button>
        <button
          v-if="index < totalSiblings - 1"
          @click.prevent="$emit('move-down', { nodeId: node.id, nodeType: node.type })"
          class="text-gray-400 hover:text-blue-600 p-1"
          title="Move down"
        >
          <i class="fas fa-arrow-down text-xs"></i>
        </button>
        <button
          @click.prevent="$emit('create-child', node.id)"
          class="text-gray-400 hover:text-blue-600 p-1"
          title="Add child"
        >
          <i class="fas fa-plus text-xs"></i>
        </button>
        <button
          @click.prevent="$emit('edit', { nodeId: node.id, nodeType: node.type, type: node.type })"
          class="text-gray-400 hover:text-blue-600 p-1"
          title="Edit"
        >
          <i class="fas fa-cog text-xs"></i>
        </button>
      </div>
    </div>

    <!-- Children (collapsed unless in path) -->
    <div v-if="shouldShowChildren && node.children && node.children.length > 0">
      <TreeNode
        v-for="(child, index) in node.children"
        :key="child.id"
        :node="child"
        :level="level + 1"
        :currentDocId="currentDocId"
        :currentPath="currentPath"
        :draggingNodeId="draggingNodeId"
        :draggingNodeData="draggingNodeData"
        :dragStartX="dragStartX"
        :isLastChild="index === node.children.length - 1"
        :parentNode="node"
        :index="index"
        :totalSiblings="node.children.length"
        :unsavedPages="unsavedPages"
        :isViewMode="isViewMode"
        @navigate="$emit('navigate', $event)"
        @delete-document="$emit('delete-document', $event)"
        @create-child="$emit('create-child', $event)"
        @node-move="$emit('node-move', $event)"
        @move-up="$emit('move-up', $event)"
        @move-down="$emit('move-down', $event)"
        @edit="$emit('edit', $event)"
        @icon-change="$emit('icon-change', $event)"
      />

      <!-- Drop zone inside section (to remove parent, keep section) -->
      <div
        v-if="node.type === 'section'"
        @dragover.prevent="handleSectionDropZoneDragOver"
        @dragleave="handleSectionDropZoneLeave"
        @drop.prevent="handleSectionDropZoneDrop"
        :class="[
          'transition-all py-2',
          isSectionDropZone ? 'bg-blue-50 border-2 border-dashed border-blue-400' : ''
        ]"
        :style="{ paddingLeft: Math.max(12, level * 16 + 12) + 'px' }"
      >
        <div
          v-if="isSectionDropZone && localDraggedData"
          class="flex items-center text-xs text-blue-600 py-1"
        >
          <i class="fas fa-file-alt mr-2 text-blue-500"></i>
          <span class="font-medium">{{ localDraggedData.title }}</span>
          <i class="fas fa-level-up-alt ml-auto"></i>
        </div>
        <div v-else-if="isSectionDropZone" class="text-xs text-blue-600 py-1">
          <i class="fas fa-level-up-alt mr-1"></i>
          Drop here to move to section root
        </div>
      </div>
    </div>

    <!-- Drop zone inside empty section -->
    <div
      v-if="node.type === 'section' && (!node.children || node.children.length === 0)"
      @dragover.prevent="handleSectionDropZoneDragOver"
      @dragleave="handleSectionDropZoneLeave"
      @drop.prevent="handleSectionDropZoneDrop"
      :class="[
        'transition-all py-2',
        isSectionDropZone ? 'bg-blue-50 border-2 border-dashed border-blue-400' : ''
      ]"
      :style="{ paddingLeft: (level + 1) * 16 + 12 + 'px' }"
    >
      <div
        v-if="isSectionDropZone && localDraggedData"
        class="flex items-center text-sm text-blue-600 py-1"
      >
        <i class="fas fa-file-alt mr-2 text-blue-500"></i>
        <span class="font-medium">{{ localDraggedData.title }}</span>
        <i class="fas fa-arrow-right ml-auto"></i>
      </div>
      <div v-else-if="isSectionDropZone" class="text-xs text-blue-600 py-1">
        <i class="fas fa-level-up-alt mr-1"></i>
        Drop here to add to section
      </div>
    </div>

    <!-- Drop Zone After (for reordering) -->
    <div
      v-if="isLastChild || level === 0"
      @dragover.prevent="handleDropZoneDragOver($event, 'after')"
      @dragleave="handleDropZoneLeave"
      @drop.prevent="handleDropZoneDrop($event, 'after')"
      class="relative"
    >
      <!-- Preview placeholder -->
      <div
        v-if="dropPosition === 'after' && localDraggedData"
        :style="{
          paddingLeft:
            (level === 0
              ? 12
              : level === 1 && parentNode?.type === 'page'
                ? 20
                : level === 1
                  ? 12
                  : (level - 1) * 20) + 'px'
        }"
        class="flex items-center py-2 px-3 text-sm bg-blue-50 border-2 border-dashed border-blue-400 rounded opacity-75"
      >
        <i class="fas fa-file-alt mr-2sm text-blue-500"></i>
        <span class="text-blue-600">{{ localDraggedData.title }}</span>
        <i class="fas fa-arrow-down ml-auto text-blue-400 text-sm"></i>
      </div>
      <!-- Drop line indicator -->
      <div
        v-if="dropPosition === 'after' && !localDraggedData"
        :class="['h-1 transition-all bg-blue-500']"
        :style="{ marginLeft: Math.max(12, (level - 1) * 16 + 12) + 'px' }"
      ></div>
    </div>

    <!-- Icon Selector Modal -->
    <IconSelector
      :isOpen="showIconSelector"
      :currentIcon="node.icon"
      :currentImageHash="node.imageHash"
      @close="showIconSelector = false"
      @select="handleIconSelect"
      @select-image="handleImageSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import IconSelector from './IconSelector.vue'
import { getThumbnailUrl } from '@app/storage'

const props = defineProps({
  node: Object,
  level: {
    type: Number,
    default: 0
  },
  currentDocId: String,
  currentPath: Array, // Path from root to current document
  draggingNodeId: String,
  draggingNodeData: Object, // Full data about dragging node
  dragStartX: Number, // Starting X position from parent
  isLastChild: Boolean,
  parentNode: Object, // Parent node data (for moving up)
  index: Number, // Index in siblings array
  totalSiblings: Number, // Total number of siblings
  unsavedPages: Object, // Map of unsaved page IDs
  isViewMode: Boolean // If true, hide admin controls and disable drag
})

const emit = defineEmits([
  'navigate',
  'delete-document',
  'create-child',
  'node-move',
  'move-up',
  'move-down',
  'edit',
  'icon-change'
])

// Local expand/collapse state
const isManuallyExpanded = ref(true) // Start expanded by default
const isDragging = ref(false)
const isDropTarget = ref(false)
const dropPosition = ref(null) // 'before' | 'after' | null
const isSectionDropZone = ref(false)
const localDraggedData = ref(null) // Local copy for display
const isMovingToParent = ref(false) // Moving to parent level
const showIconSelector = ref(false)

const isActive = computed(() => {
  return props.node.type === 'page' && props.node.id === props.currentDocId
})

const isUnsaved = computed(() => {
  return props.node.type === 'page' && props.unsavedPages && props.unsavedPages[props.node.id]
})

const isInPath = computed(() => {
  if (!props.currentPath || props.currentPath.length === 0) return false
  return props.currentPath.some((doc) => doc.id === props.node.id)
})

const shouldShowChildren = computed(() => {
  // If manually collapsed, don't show children
  if (!isManuallyExpanded.value) return false

  // For sections, show children if expanded
  if (props.node.type === 'section') return true

  // For pages, show children only if this node is in the current path
  return isInPath.value
})

function toggleExpand() {
  isManuallyExpanded.value = !isManuallyExpanded.value
}

function handlePageClick(e) {
  // Ignore if clicking on buttons
  if (e.target.closest('button')) return

  emit('navigate', props.node.id)
}

function handlePageDoubleClick(e) {
  // Ignore if clicking on buttons
  if (e.target.closest('button')) return

  // Only admins can edit - works in any mode
  if (!ctx.user?.is('Admin')) return

  e.preventDefault()
  e.stopPropagation()

  emit('edit', { nodeId: props.node.id, nodeType: props.node.type, type: props.node.type })
}

function handleSectionDoubleClick(e) {
  // Ignore if clicking on buttons
  if (e.target.closest('button')) return

  // Only admins can edit - works in any mode
  if (!ctx.user?.is('Admin')) return

  e.preventDefault()
  e.stopPropagation()

  emit('edit', { nodeId: props.node.id, nodeType: props.node.type, type: props.node.type })
}

function handleIconSelect(icon) {
  emit('icon-change', { nodeId: props.node.id, icon, imageHash: null })
}

function handleImageSelect(imageHash) {
  emit('icon-change', { nodeId: props.node.id, icon: null, imageHash })
}

function handleDragStart(e) {
  // Prevent drag in view mode or for non-admin users
  if (!ctx.user?.is('Admin') || props.isViewMode) {
    e.preventDefault()
    return
  }

  isDragging.value = true
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData(
    'application/json',
    JSON.stringify({
      id: props.node.id,
      type: props.node.type,
      title: props.node.title,
      parentId: props.node.parentId,
      order: props.node.order
    })
  )

  // Notify parent about dragging with full node data and starting X position
  emit('node-move', {
    type: 'drag-start',
    nodeId: props.node.id,
    startX: e.clientX, // Pass starting X position
    nodeData: {
      id: props.node.id,
      type: props.node.type,
      title: props.node.title,
      parentId: props.node.parentId,
      order: props.node.order
    }
  })
}

function handleDragEnd(e) {
  isDragging.value = false
  isDropTarget.value = false
  dropPosition.value = null
  isSectionDropZone.value = false
  localDraggedData.value = null
  isMovingToParent.value = false

  // Notify parent about drag end
  emit('node-move', { type: 'drag-end' })
}

function handleDragOver(e) {
  e.preventDefault()

  // Use draggingNodeData from props
  if (!props.draggingNodeData) return

  // Don't allow drop on self
  if (props.draggingNodeData.id === props.node.id) return

  // Check drag direction (right to left = move to parent)
  const currentX = e.clientX
  const threshold = 30 // pixels threshold

  if (props.draggingNodeData.id && currentX < props.dragStartX - threshold && props.parentNode) {
    // Moving to parent level (left direction)
    isMovingToParent.value = true
    isDropTarget.value = false
    localDraggedData.value = props.draggingNodeData
    return
  }

  isMovingToParent.value = false

  // Don't allow dropping section into page
  if (props.draggingNodeData.type === 'section' && props.node.type === 'page') return

  isDropTarget.value = true
  localDraggedData.value = props.draggingNodeData
}

function handleDragLeave(e) {
  // Only reset if we're actually leaving this element
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDropTarget.value = false
    isMovingToParent.value = false
    localDraggedData.value = null
  }
}

function handleDrop(e) {
  e.preventDefault()
  e.stopPropagation()
  const wasMovingToParent = isMovingToParent.value
  isDropTarget.value = false
  isMovingToParent.value = false
  localDraggedData.value = null

  const dragData = e.dataTransfer.getData('application/json')
  if (!dragData) return

  try {
    const dragged = JSON.parse(dragData)

    // Don't allow drop on self
    if (dragged.id === props.node.id) return

    // Handle moving to parent level
    if (wasMovingToParent && props.parentNode) {
      emit('node-move', {
        type: 'move-to-parent',
        draggedId: dragged.id,
        draggedType: dragged.type,
        parentNode: props.parentNode
      })
      return
    }

    // Don't allow dropping section into page
    if (dragged.type === 'section' && props.node.type === 'page') return

    // Determine drop target
    let targetParentId = null

    if (props.node.type === 'section') {
      // Drop into section
      targetParentId = props.node.id
    } else if (props.node.type === 'page') {
      // Drop into page (as child)
      targetParentId = props.node.id
    }

    // Notify parent to handle the move
    emit('node-move', {
      type: 'drop',
      draggedId: dragged.id,
      draggedType: dragged.type,
      targetId: props.node.id,
      targetType: props.node.type,
      targetParentId
    })
  } catch (err) {
    console.error('Failed to handle drop:', err)
  }
}

// Drop zone handlers (for reordering)
function handleDropZoneDragOver(e, position) {
  e.preventDefault()

  // Use draggingNodeData from props (passed from Sidebar)
  if (props.draggingNodeData && props.draggingNodeData.id !== props.node.id) {
    localDraggedData.value = props.draggingNodeData
    dropPosition.value = position
  }
}

function handleDropZoneLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    dropPosition.value = null
    localDraggedData.value = null
  }
}

function handleDropZoneDrop(e, position) {
  e.preventDefault()
  e.stopPropagation()
  dropPosition.value = null
  localDraggedData.value = null

  const dragData = e.dataTransfer.getData('application/json')
  if (!dragData) return

  try {
    const dragged = JSON.parse(dragData)
    if (dragged.id === props.node.id) return

    // Calculate new order based on position
    const newOrder = position === 'before' ? props.node.order - 0.5 : props.node.order + 0.5

    // Emit reorder event
    emit('node-move', {
      type: 'reorder',
      draggedId: dragged.id,
      draggedType: dragged.type,
      targetId: props.node.id,
      targetType: props.node.type,
      position,
      newOrder,
      // Keep same parent context as target
      targetParentId: props.node.parentId || null
    })
  } catch (err) {
    console.error('Failed to handle drop zone drop:', err)
  }
}

// Section drop zone handlers (to remove parent but keep section)
function handleSectionDropZoneDragOver(e) {
  e.preventDefault()

  if (!props.draggingNodeData) return
  if (props.draggingNodeData.type !== 'page' && props.draggingNodeData.type !== 'section') return
  if (props.draggingNodeData.id === props.node.id) return

  isSectionDropZone.value = true
  localDraggedData.value = props.draggingNodeData
}

function handleSectionDropZoneLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isSectionDropZone.value = false
    localDraggedData.value = null
  }
}

function handleSectionDropZoneDrop(e) {
  e.preventDefault()
  e.stopPropagation()
  isSectionDropZone.value = false
  localDraggedData.value = null

  const dragData = e.dataTransfer.getData('application/json')
  if (!dragData) return

  try {
    const dragged = JSON.parse(dragData)
    if (dragged.type !== 'page' && dragged.type !== 'section') return

    // Move to section root (remove parent, keep section)
    emit('node-move', {
      type: 'move-to-section-root',
      draggedId: dragged.id,
      draggedType: dragged.type,
      targetParentId: props.node.id
    })
  } catch (err) {
    console.error('Failed to handle section drop zone drop:', err)
  }
}
</script>

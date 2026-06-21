<template>
  <div class="h-full w-80 bg-white flex flex-col">
    <!-- Tree Navigation -->
    <div
      class="flex-1 overflow-y-auto pt-8"
      @dragover.prevent="handleRootDragOver"
      @dragleave="handleRootDragLeave"
      @drop.prevent="handleRootDrop"
    >
      <div v-if="loading" class="p-4 text-center">
        <i class="fas fa-spinner fa-spin text-gray-400"></i>
      </div>

      <div v-else>
        <TreeNode
          v-for="(node, index) in filteredTree"
          :key="node.id"
          :node="node"
          :level="0"
          :currentDocId="currentDocId"
          :currentPath="currentPath"
          :draggingNodeId="draggingNodeId"
          :draggingNodeData="draggingNodeData"
          :dragStartX="dragStartX"
          :isLastChild="index === filteredTree.length - 1"
          :parentNode="null"
          :index="index"
          :totalSiblings="filteredTree.length"
          :unsavedPages="unsavedPages"
          :isViewMode="isViewMode"
          @navigate="$emit('navigate', $event)"
          @delete-document="$emit('delete-document', $event)"
          @create-child="$emit('create-child', $event)"
          @edit="$emit('edit', $event)"
          @node-move="handleNodeMove"
          @move-up="handleMoveUp"
          @move-down="handleMoveDown"
          @icon-change="$emit('icon-change', $event)"
        />
      </div>

      <!-- Root Drop Zone (visible when dragging) -->
      <div
        v-if="draggingNodeId"
        @dragover.prevent="handleRootDropZoneDragOver"
        @dragleave="handleRootDropZoneLeave"
        @drop.prevent="handleRootDropZoneDrop"
        :class="[
          'mx-3 my-2 transition-all rounded-lg',
          isRootDropZone ? 'bg-blue-50 border-2 border-dashed border-blue-400 py-1' : 'py-1'
        ]"
      >
        <div
          v-if="isRootDropZone && draggingNodeData"
          class="flex items-center justify-center text-xs text-blue-600 space-x-2"
        >
          <i class="fas fa-file-alt text-blue-500"></i>
          <span class="font-medium">{{ draggingNodeData.title }}</span>
          <i class="fas fa-arrow-up text-blue-400"></i>
        </div>
        <div v-else-if="isRootDropZone" class="text-xs text-blue-600 text-center">
          <i class="fas fa-arrow-up mr-1"></i>
          {{ ctx.t('Drop here to move to root level') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { apiDocumentMoveRoute } from '../api/documents'
import { indexPageRoute } from '../index'
import TreeNode from './TreeNode.vue'

const props = defineProps({
  currentDocId: String,
  activeSectionId: String,
  tree: Array,
  currentPath: Array,
  unsavedPages: Object,
  isViewMode: Boolean
})

const emit = defineEmits([
  'navigate',
  'delete-document',
  'create-child',
  'edit',
  'icon-change',
  'reload-tree'
])

const loading = ref(false)
const draggingNodeId = ref(null)
const draggingNodeData = ref(null)
const dragStartX = ref(0)
const isRootDropZone = ref(false)

// Filter tree based on activeSectionId
const filteredTree = computed(() => {
  if (!props.tree || props.tree.length === 0) return []

  if (props.activeSectionId) {
    // Find the section and return its children
    return findSectionChildren(props.tree, props.activeSectionId)
  }

  return props.tree
})

function findSectionChildren(tree, sectionId) {
  for (const node of tree) {
    if (node.id === sectionId) {
      return node.children || []
    }
    if (node.children && node.children.length > 0) {
      const result = findSectionChildren(node.children, sectionId)
      if (result.length > 0) return result
    }
  }
  return []
}

async function handleNodeMove(event) {
  if (event.type === 'drag-start') {
    draggingNodeId.value = event.nodeId
    draggingNodeData.value = event.nodeData
    dragStartX.value = event.startX
  } else if (event.type === 'drag-end') {
    draggingNodeId.value = null
    draggingNodeData.value = null
    dragStartX.value = 0
  } else if (event.type === 'drop') {
    try {
      if (event.draggedType === 'page' || event.draggedType === 'section') {
        await apiDocumentMoveRoute({ id: event.draggedId }).run(ctx, {
          targetParentId: event.targetParentId,
          targetOrder: null
        })
        emit('reload-tree')
      }
    } catch (error) {
      console.error('Failed to move node:', error)
      alert('Failed to move item. Please try again.')
    }
  } else if (event.type === 'reorder') {
    try {
      await apiDocumentMoveRoute({ id: event.draggedId }).run(ctx, {
        targetParentId: event.targetParentId,
        targetOrder: event.newOrder
      })
      emit('reload-tree')
    } catch (error) {
      console.error('Failed to reorder node:', error)
      alert('Failed to reorder item. Please try again.')
    }
  } else if (event.type === 'move-to-parent') {
    try {
      const parentNode = event.parentNode

      let newParentId = null

      if (parentNode.type === 'section') {
        newParentId = null
      } else if (parentNode.type === 'page') {
        newParentId = parentNode.parentId || null
      }

      await apiDocumentMoveRoute({ id: event.draggedId }).run(ctx, {
        targetParentId: newParentId,
        targetOrder: null
      })
      emit('reload-tree')
    } catch (error) {
      console.error('Failed to move to parent:', error)
      alert('Failed to move to parent level. Please try again.')
    }
  } else if (event.type === 'move-to-section-root') {
    try {
      await apiDocumentMoveRoute({ id: event.draggedId }).run(ctx, {
        targetParentId: event.targetParentId,
        targetOrder: null
      })
      emit('reload-tree')
    } catch (error) {
      console.error('Failed to move to section root:', error)
      alert('Failed to move to section root. Please try again.')
    }
  }
}

function handleRootDragOver(e) {
  e.preventDefault()
}

function handleRootDragLeave(e) {}

function handleRootDrop(e) {
  e.preventDefault()
}

function handleRootDropZoneDragOver(e) {
  e.preventDefault()
  isRootDropZone.value = true
}

function handleRootDropZoneLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isRootDropZone.value = false
  }
}

async function handleRootDropZoneDrop(e) {
  e.preventDefault()
  e.stopPropagation()
  isRootDropZone.value = false

  const dragData = e.dataTransfer.getData('application/json')
  if (!dragData) return

  try {
    const dragged = JSON.parse(dragData)

    await apiDocumentMoveRoute({ id: dragged.id }).run(ctx, {
      targetParentId: null,
      targetOrder: null
    })
    emit('reload-tree')
  } catch (error) {
    console.error('Failed to move to root:', error)
    alert('Failed to move to root. Please try again.')
  }
}

async function handleMoveUp(event) {
  try {
    const { nodeId, nodeType } = event

    const context = findNodeContext(props.tree, nodeId)
    if (!context || context.index === 0) return

    const currentNode = context.siblings[context.index]
    const prevNode = context.siblings[context.index - 1]

    await apiDocumentMoveRoute({ id: nodeId }).run(ctx, {
      targetParentId: currentNode.parentId || null,
      targetOrder: prevNode.order - 0.5
    })
    emit('reload-tree')
  } catch (error) {
    console.error('Failed to move up:', error)
    alert('Failed to move item up. Please try again.')
  }
}

async function handleMoveDown(event) {
  try {
    const { nodeId, nodeType } = event

    const context = findNodeContext(props.tree, nodeId)
    if (!context || context.index === context.siblings.length - 1) return

    const currentNode = context.siblings[context.index]
    const nextNode = context.siblings[context.index + 1]

    await apiDocumentMoveRoute({ id: nodeId }).run(ctx, {
      targetParentId: currentNode.parentId || null,
      targetOrder: nextNode.order + 0.5
    })
    emit('reload-tree')
  } catch (error) {
    console.error('Failed to move down:', error)
    alert('Failed to move item down. Please try again.')
  }
}

function findNodeContext(nodes, nodeId, parentId = null) {
  if (!nodes) return null

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === nodeId) {
      return {
        siblings: nodes,
        index: i,
        parentId
      }
    }
  }

  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      const newParentId = node.id
      const result = findNodeContext(node.children, nodeId, newParentId)
      if (result) return result
    }
  }

  return null
}
</script>

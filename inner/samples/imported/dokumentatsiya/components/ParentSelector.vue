<template>
  <div class="w-full">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      {{ label }}
    </label>

    <div class="border border-gray-300 rounded-lg bg-white">
      <!-- No parent option (only for sections) -->
      <div
        v-if="nodeDocType === 'section'"
        @click="selectParent('none')"
        :class="[
          'px-3 py-2 cursor-pointer border-b border-gray-200 flex items-center',
          selectedValue === 'none' ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-50'
        ]"
      >
        <div class="flex-1">Без родителя (корневой уровень)</div>
        <i v-if="selectedValue === 'none'" class="fas fa-check text-blue-600 ml-2"></i>
      </div>

      <!-- Tree items -->
      <div class="max-h-64 overflow-y-auto">
        <TreeItem
          v-for="item in topLevelItems"
          :key="`${item.type}:${item.id}`"
          :item="item"
          :level="0"
          :selected="selectedValue"
          :all-documents="documents"
          :node-type="nodeType"
          :node-id="nodeId"
          :node-doc-type="nodeDocType"
          @select="selectParent"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TreeItem from './ParentSelectorTreeItem.vue'

const props = defineProps({
  documents: Array,
  nodeType: String, // 'page' | 'section'
  nodeId: String,
  nodeDocType: String, // Type of the node being edited (page/section)
  selectedValue: String
})

const emit = defineEmits(['select'])

const label = computed(() => {
  return props.nodeDocType === 'section' ? 'Родительская секция' : 'Родительский элемент'
})

// Build top-level items
const topLevelItems = computed(() => {
  const items = []

  if (props.nodeDocType === 'section') {
    // For sections: show only other top-level sections
    const topSections = (props.documents || [])
      .filter((d) => d.type === 'section' && !d.parentId && d.id !== props.nodeId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    topSections.forEach((section) => {
      items.push({
        type: 'section',
        id: section.id,
        title: section.title
      })
    })
  } else {
    // For pages: show all top-level sections and orphan pages
    const topSections = (props.documents || [])
      .filter((d) => d.type === 'section' && !d.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    topSections.forEach((section) => {
      items.push({
        type: 'section',
        id: section.id,
        title: section.title
      })
    })

    // Add orphan top-level pages
    const orphanPages = (props.documents || [])
      .filter((d) => d.type === 'page' && !d.parentId && d.id !== props.nodeId)
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    orphanPages.forEach((page) => {
      items.push({
        type: 'page',
        id: page.id,
        title: page.title
      })
    })
  }

  return items
})

function selectParent(value) {
  emit('select', value)
}
</script>

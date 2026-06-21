<template>
  <div>
    <!-- Item -->
    <div
      @click="handleSelect"
      :class="[
        'px-3 py-2 cursor-pointer border-b border-gray-100 flex items-center',
        isSelected && 'bg-blue-100 text-blue-900',
        !isSelected && 'hover:bg-gray-50'
      ]"
      :style="{ paddingLeft: `${12 + level * 20}px` }"
    >
      <!-- Expander for items with children -->
      <div class="flex items-center flex-1 gap-2">
        <i
          v-if="hasChildren"
          @click.stop="toggleExpanded"
          :class="[
            'fas text-xs cursor-pointer transition-transform',
            expanded ? 'fa-chevron-down' : 'fa-chevron-right'
          ]"
        />
        <div v-else class="w-4"></div>

        <!-- Item icon -->
        <i
          :class="[
            'fas text-sm',
            item.type === 'section' ? 'fa-folder text-yellow-500' : 'fa-file-lines text-gray-400'
          ]"
        />

        <!-- Item title -->
        <span class="flex-1 text-sm">{{ item.title }}</span>
      </div>

      <!-- Checkmark for selected -->
      <i v-if="isSelected" class="fas fa-check text-blue-600 ml-2 text-sm"></i>
    </div>

    <!-- Children -->
    <ParentSelectorTreeItem
      v-for="child in children"
      v-if="expanded && hasChildren"
      :key="`${child.type}:${child.id}`"
      :item="child"
      :level="level + 1"
      :selected="selected"
      :all-documents="allDocuments"
      :node-type="nodeType"
      :node-id="nodeId"
      :node-doc-type="nodeDocType"
      @select="$emit('select', $event)"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  item: Object, // { type, id, title }
  level: Number,
  selected: String,
  allDocuments: Array,
  nodeType: String,
  nodeId: String,
  nodeDocType: String // Type of the node being edited
})

const emit = defineEmits(['select'])

const expanded = ref(true)

const hasChildren = computed(() => {
  if (props.item.type === 'section') {
    if (props.nodeDocType === 'section') {
      // When editing a section: only check for nested sections
      const children =
        props.allDocuments?.filter((d) => {
          const parentId = typeof d.parentId === 'string' ? d.parentId : d.parentId?.id
          return d.type === 'section' && parentId === props.item.id
        }) || []
      return children.length > 0
    } else {
      // When editing a page: check for both nested sections and pages
      const children =
        props.allDocuments?.filter((d) => {
          const parentId = typeof d.parentId === 'string' ? d.parentId : d.parentId?.id
          return parentId === props.item.id
        }) || []
      return children.length > 0
    }
  } else {
    // For pages: check for child pages and sections
    const children =
      props.allDocuments?.filter((d) => {
        const parentId = typeof d.parentId === 'string' ? d.parentId : d.parentId?.id
        return parentId === props.item.id
      }) || []
    return children.length > 0
  }
})

const children = computed(() => {
  const items = []

  if (props.item.type === 'section') {
    if (props.nodeDocType === 'section') {
      // When editing a section: show only nested sections
      const nestedSections = (props.allDocuments || [])
        .filter((d) => {
          const parentId = typeof d.parentId === 'string' ? d.parentId : d.parentId?.id
          return d.type === 'section' && parentId === props.item.id
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0))

      return nestedSections.map((s) => ({ type: 'section', id: s.id, title: s.title }))
    } else {
      // When editing a page: show nested sections and pages
      const nestedSections = (props.allDocuments || [])
        .filter((d) => {
          const parentId = typeof d.parentId === 'string' ? d.parentId : d.parentId?.id
          return d.type === 'section' && parentId === props.item.id
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0))

      const nestedPages = (props.allDocuments || [])
        .filter((d) => {
          const parentId = typeof d.parentId === 'string' ? d.parentId : d.parentId?.id
          return d.type === 'page' && parentId === props.item.id
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0))

      const allItems = [
        ...nestedSections.map((s) => ({ type: 'section', id: s.id, title: s.title })),
        ...nestedPages.map((p) => ({ type: 'page', id: p.id, title: p.title }))
      ].sort((a, b) => {
        const aItem = props.allDocuments?.find((d) => d.id === a.id)
        const bItem = props.allDocuments?.find((d) => d.id === b.id)
        return (aItem?.order || 0) - (bItem?.order || 0)
      })

      return allItems
    }
  } else {
    // For pages: always show child pages and sections
    const childPages = (props.allDocuments || [])
      .filter((d) => {
        const parentId = typeof d.parentId === 'string' ? d.parentId : d.parentId?.id
        return d.type === 'page' && parentId === props.item.id
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const childSections = (props.allDocuments || [])
      .filter((d) => {
        const parentId = typeof d.parentId === 'string' ? d.parentId : d.parentId?.id
        return d.type === 'section' && parentId === props.item.id
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const allChildren = [
      ...childSections.map((s) => ({ type: 'section', id: s.id, title: s.title })),
      ...childPages.map((p) => ({ type: 'page', id: p.id, title: p.title }))
    ].sort((a, b) => {
      const aItem = props.allDocuments?.find((d) => d.id === a.id)
      const bItem = props.allDocuments?.find((d) => d.id === b.id)
      return (aItem?.order || 0) - (bItem?.order || 0)
    })

    return allChildren
  }
})

const isSelected = computed(() => {
  return props.selected === `doc:${props.item.id}`
})

function toggleExpanded() {
  expanded.value = !expanded.value
}

function handleSelect() {
  emit('select', `doc:${props.item.id}`)
}
</script>

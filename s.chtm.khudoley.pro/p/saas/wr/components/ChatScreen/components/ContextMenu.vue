<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'

export interface ContextMenuItem {
  label: string
  icon?: string
  danger?: boolean
  children?: ContextMenuItem[]
  action?: () => void
}

const props = defineProps<{
  items: ContextMenuItem[]
  x: number
  y: number
  forceAbove?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const menuEl = ref<HTMLDivElement | null>(null)
const submenuItems = ref<ContextMenuItem[] | null>(null)
const submenuPos = ref({ top: 0, left: 0 })
const activeIndex = ref<number | null>(null)
const showAbove = ref(false)

function checkPosition() {
  const el = menuEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  if (rect.bottom > viewportHeight - 10) {
    showAbove.value = true
  }
}

function onItemClick(item: ContextMenuItem) {
  if (item.children?.length) return
  item.action?.()
  emit('close')
}

function onItemEnter(item: ContextMenuItem, idx: number, event: MouseEvent) {
  if (item.children?.length) {
    activeIndex.value = idx
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const menuRect = menuEl.value?.getBoundingClientRect()
    submenuPos.value = { top: rect.top - (menuRect?.top ?? 0), left: rect.width + 4 }
    submenuItems.value = item.children
  } else {
    activeIndex.value = null
    submenuItems.value = null
  }
}

function onClickOutside(e: MouseEvent | TouchEvent) {
  const root = menuEl.value
  if (!root) return
  const target =
    e instanceof TouchEvent && e.touches.length > 0
      ? document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY)
      : (e.target as Node)
  if (target && !root.contains(target as Node)) {
    emit('close')
  }
}

onMounted(async () => {
  await nextTick()
  if (props.forceAbove) {
    showAbove.value = true
  } else {
    checkPosition()
  }
  setTimeout(() => {
    document.addEventListener('mousedown', onClickOutside, true)
    document.addEventListener('touchstart', onClickOutside, true)
    document.addEventListener('contextmenu', onClickOutside, true)
  }, 0)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside, true)
  document.removeEventListener('touchstart', onClickOutside, true)
  document.removeEventListener('contextmenu', onClickOutside, true)
})
</script>

<template>
  <div ref="menuEl" class="ctx-menu" :class="{ 'ctx-menu--above': showAbove }">
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="ctx-menu-item"
      :class="{
        'ctx-menu-item--danger': item.danger,
        'ctx-menu-item--active': activeIndex === idx
      }"
      @click="onItemClick(item)"
      @mouseenter="onItemEnter(item, idx, $event)"
    >
      <i v-if="item.icon" :class="item.icon" class="ctx-menu-icon"></i>
      <span class="ctx-menu-label">{{ item.label }}</span>
      <i v-if="item.children?.length" class="fas fa-chevron-right ctx-menu-arrow"></i>
    </div>

    <!-- Submenu -->
    <div
      v-if="submenuItems"
      class="ctx-submenu"
      :style="{ top: submenuPos.top + 'px', left: submenuPos.left + 'px' }"
    >
      <div
        v-for="(child, cidx) in submenuItems"
        :key="cidx"
        class="ctx-menu-item"
        :class="{ 'ctx-menu-item--danger': child.danger }"
        @click="
          () => {
            child.action?.()
            emit('close')
          }
        "
      >
        <i v-if="child.icon" :class="child.icon" class="ctx-menu-icon"></i>
        <span class="ctx-menu-label">{{ child.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ctx-menu {
  position: absolute;
  left: 0;
  top: 100%;
  z-index: 9999;
  min-width: 200px;
  max-width: 260px;
  background: var(--wr-ctx-menu-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--wr-ctx-menu-border);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  margin-top: 4px;
}

.ctx-menu--above {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 4px;
}

.ctx-submenu {
  position: absolute;
  z-index: 10000;
  min-width: 180px;
  background: var(--wr-ctx-menu-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--wr-ctx-menu-border);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.ctx-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 7px;
  cursor: pointer;
  color: var(--wr-ctx-menu-text);
  font-size: 13px;
  transition: background 0.12s;
  user-select: none;
}

.ctx-menu-item:hover,
.ctx-menu-item--active {
  background: var(--wr-ctx-menu-hover);
}

.ctx-menu-item--danger {
  color: #dc2626;
}

.ctx-menu-item--danger:hover {
  background: rgba(220, 38, 38, 0.12);
}

.ctx-menu-icon {
  width: 16px;
  text-align: center;
  font-size: 12px;
  opacity: 0.7;
}

.ctx-menu-label {
  flex: 1;
}

.ctx-menu-arrow {
  font-size: 10px;
  opacity: 0.4;
}
</style>

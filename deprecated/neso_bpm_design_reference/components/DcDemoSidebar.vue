<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { NavChildItem, NavItem } from '../shared/bpmVueExportedTypes'
import { setStoredSidebarCollapsed } from '../shared/sidebarStorage'

const props = defineProps<{
  theme?: 'dark' | 'light'
  logoText?: string
  logoImageUrl?: string
  userName?: string
  userRole?: string
  logoutUrl?: string
  items: NavItem[]
  collapsed?: boolean
  mobileOpen?: boolean
  activeId?: string | null
}>()

const emit = defineEmits<{
  close: []
  select: [id: string]
  toggleCollapse: []
}>()

const expandedGroups = ref<Record<string, boolean>>({})
const hasMobileOpen = computed(() => !!props.mobileOpen)
const isMobileViewport = ref(false)
const isCollapsed = computed(
  () => !!props.collapsed && !isMobileViewport.value && !hasMobileOpen.value
)

const MOBILE_BREAKPOINT_PX = 980
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`
let mediaList: MediaQueryList | null = null

function updateMobile() {
  isMobileViewport.value = !!mediaList?.matches
}

onMounted(() => {
  if (typeof window === 'undefined' || !window.matchMedia) return
  mediaList = window.matchMedia(MOBILE_QUERY)
  updateMobile()
  mediaList.addEventListener('change', updateMobile)
})

onBeforeUnmount(() => {
  mediaList?.removeEventListener('change', updateMobile)
  mediaList = null
})

watch(
  () => props.items,
  (items: NavItem[]) => {
    const next: Record<string, boolean> = {}
    for (const item of items) {
      if (item.children?.length) {
        next[item.id] = expandedGroups.value[item.id] ?? item.id === props.activeId
      }
    }
    expandedGroups.value = next
    openActiveParent()
  },
  { immediate: true, deep: true }
)

watch(
  () => props.activeId,
  () => openActiveParent(),
  { immediate: true }
)

watch(isCollapsed, (val) => {
  if (!val) openActiveParent()
})

function hasChildren(item: NavItem): boolean {
  return !!item.children?.length
}

function isOpen(item: NavItem): boolean {
  return !!expandedGroups.value[item.id]
}

function isActive(item: NavItem): boolean {
  if (props.activeId === item.id) return true
  if (!item.children?.length || !props.activeId) return false
  return item.children.some((c) => c.id === props.activeId)
}

function openActiveParent() {
  if (!props.activeId) return
  const next = { ...expandedGroups.value }
  for (const item of props.items) {
    if (item.children?.some((c) => c.id === props.activeId)) {
      next[item.id] = true
    }
  }
  expandedGroups.value = next
}

function toggleGroup(item: NavItem) {
  expandedGroups.value = {
    ...expandedGroups.value,
    [item.id]: !expandedGroups.value[item.id]
  }
}

function onLeafClick(id: string) {
  emit('select', id)
  if (hasMobileOpen.value) emit('close')
}

function onItemClick(item: NavItem) {
  if (hasChildren(item)) {
    if (isCollapsed.value) {
      emit('toggleCollapse')
      expandedGroups.value = { ...expandedGroups.value, [item.id]: true }
      return
    }
    toggleGroup(item)
    return
  }
  onLeafClick(item.id)
}

function onLinkClick() {
  emit('close')
}

function onCollapseClick() {
  setStoredSidebarCollapsed(!props.collapsed)
  emit('toggleCollapse')
}
</script>

<template>
  <aside
    class="bpm-sb"
    :class="[
      `bpm-sb--${theme ?? 'dark'}`,
      {
        'bpm-sb--collapsed': isCollapsed,
        'bpm-sb--mobile-open': hasMobileOpen
      }
    ]"
    aria-label="BPM navigation"
  >
    <header class="bpm-sb__header">
      <div
        class="bpm-sb__brand"
        :class="{ 'bpm-sb__brand--collapsed': isCollapsed }"
        :title="isCollapsed ? (logoText ?? 'NeSo BPM') : ''"
      >
        <div class="bpm-sb__brand-media">
          <img
            class="bpm-sb__brand-img"
            :src="
              logoImageUrl ??
              'https://sel.cdn-chatium.io/thumbnail/image_msk_bxpKawmlab.512x512.png/s/128x?'
            "
            :alt="(logoText ?? 'NeSo BPM') + ' logo'"
          />
        </div>
        <div class="bpm-sb__brand-slot" :aria-hidden="isCollapsed">
          <div class="bpm-sb__brand-text">
            <span class="bpm-sb__brand-title">{{ logoText ?? 'NeSo BPM' }}</span>
            <span class="bpm-sb__brand-sub">Process Control Plane</span>
          </div>
        </div>
      </div>

      <div class="bpm-sb__header-actions">
        <button
          type="button"
          class="bpm-sb__btn bpm-sb__btn--collapse"
          :aria-label="isCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
          @click="onCollapseClick"
        >
          <i
            :class="isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left'"
            aria-hidden="true"
          ></i>
        </button>
        <button
          type="button"
          class="bpm-sb__btn bpm-sb__btn--close"
          aria-label="Закрыть меню"
          @click="emit('close')"
        >
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <div class="bpm-sb__divider bpm-sb__divider--after-header" aria-hidden="true"></div>

    <section
      class="bpm-sb__status"
      :class="{ 'bpm-sb__status--collapsed': isCollapsed }"
      role="status"
      aria-label="Control status"
    >
      <span class="bpm-sb__status-dot" aria-hidden="true"></span>
      <div class="bpm-sb__status-slot" :aria-hidden="isCollapsed">
        <div class="bpm-sb__status-text">
          <p class="bpm-sb__status-title">Control status</p>
          <p class="bpm-sb__status-desc">7 SLA risks across active processes</p>
        </div>
      </div>
    </section>

    <nav class="bpm-sb__nav" aria-label="Process spaces">
      <div
        class="bpm-sb__nav-heading-wrap"
        :class="{ 'bpm-sb__nav-heading-wrap--collapsed': isCollapsed }"
        :aria-hidden="isCollapsed"
      >
        <p class="bpm-sb__nav-heading">Process spaces</p>
      </div>

      <div
        v-for="item in items"
        :key="item.id"
        class="bpm-sb__group"
        :class="{
          'bpm-sb__group--active': isActive(item),
          'bpm-sb__group--open': isOpen(item),
          'bpm-sb__group--has-children': hasChildren(item)
        }"
      >
        <a
          v-if="item.href && !hasChildren(item)"
          :href="item.href"
          class="bpm-sb__link"
          :class="{
            'bpm-sb__link--active': isActive(item),
            'bpm-sb__link--collapsed': isCollapsed
          }"
          :title="isCollapsed ? item.label : undefined"
          :aria-current="isActive(item) ? 'page' : undefined"
          @click="onLinkClick"
        >
          <span class="bpm-sb__link-indicator" aria-hidden="true"></span>
          <span class="bpm-sb__link-icon">
            <i :class="['fas', item.icon]" aria-hidden="true"></i>
          </span>
          <div
            class="bpm-sb__link-slot"
            :class="{ 'bpm-sb__link-slot--collapsed': isCollapsed }"
            :aria-hidden="isCollapsed"
          >
            <span class="bpm-sb__link-label">{{ item.label }}</span>
            <span v-if="item.badge" class="bpm-sb__badge">{{ item.badge }}</span>
            <span
              v-if="hasChildren(item)"
              class="bpm-sb__caret"
              :class="{ 'bpm-sb__caret--open': isOpen(item) }"
            >
              <i class="fas fa-chevron-down" aria-hidden="true"></i>
            </span>
          </div>
        </a>
        <button
          v-else
          type="button"
          class="bpm-sb__link"
          :class="{
            'bpm-sb__link--active': isActive(item),
            'bpm-sb__link--collapsed': isCollapsed
          }"
          :title="isCollapsed ? item.label : undefined"
          :aria-expanded="hasChildren(item) ? isOpen(item) : undefined"
          :aria-current="isActive(item) && !hasChildren(item) ? 'page' : undefined"
          @click="onItemClick(item)"
        >
          <span class="bpm-sb__link-indicator" aria-hidden="true"></span>
          <span class="bpm-sb__link-icon">
            <i :class="['fas', item.icon]" aria-hidden="true"></i>
          </span>
          <div
            class="bpm-sb__link-slot"
            :class="{ 'bpm-sb__link-slot--collapsed': isCollapsed }"
            :aria-hidden="isCollapsed"
          >
            <span class="bpm-sb__link-label">{{ item.label }}</span>
            <span v-if="item.badge" class="bpm-sb__badge">{{ item.badge }}</span>
            <span
              v-if="hasChildren(item)"
              class="bpm-sb__caret"
              :class="{ 'bpm-sb__caret--open': isOpen(item) }"
            >
              <i class="fas fa-chevron-down" aria-hidden="true"></i>
            </span>
          </div>
        </button>

        <div
          v-if="hasChildren(item)"
          class="bpm-sb__sub"
          :class="{ 'bpm-sb__sub--open': isOpen(item) && !isCollapsed }"
          role="group"
          :aria-label="item.label"
        >
          <div class="bpm-sb__sub-track" aria-hidden="true"></div>
          <div class="bpm-sb__sub-inner">
            <component
              v-for="child in item.children"
              :key="child.id"
              :is="child.href ? 'a' : 'button'"
              :href="child.href"
              :type="child.href ? undefined : 'button'"
              class="bpm-sb__sub-link"
              :class="{ 'bpm-sb__sub-link--active': activeId === child.id }"
              :aria-current="activeId === child.id ? 'page' : undefined"
              @click="child.href ? onLinkClick() : onLeafClick(child.id)"
            >
              <span class="bpm-sb__sub-icon">
                <i v-if="child.icon" :class="['fas', child.icon]"></i>
                <span v-else class="bpm-sb__sub-dot"></span>
              </span>
              <span class="bpm-sb__sub-label">{{ child.label }}</span>
              <span v-if="child.badge" class="bpm-sb__badge">{{ child.badge }}</span>
            </component>
          </div>
        </div>
      </div>
    </nav>

    <div class="bpm-sb__divider bpm-sb__divider--before-footer" aria-hidden="true"></div>

    <footer class="bpm-sb__footer">
      <div
        class="bpm-sb__user"
        :title="isCollapsed ? `${userName ?? 'Operator'} — ${userRole ?? 'Workflow Admin'}` : ''"
      >
        <div class="bpm-sb__avatar">
          <i class="fas fa-user-gear" aria-hidden="true"></i>
        </div>
        <div
          class="bpm-sb__user-slot"
          :class="{ 'bpm-sb__user-slot--collapsed': isCollapsed }"
          :aria-hidden="isCollapsed"
        >
          <div class="bpm-sb__user-text">
            <span class="bpm-sb__user-name">{{ userName ?? 'Operator' }}</span>
            <span class="bpm-sb__user-role">{{ userRole ?? 'Workflow Admin' }}</span>
          </div>
          <a class="bpm-sb__logout" :href="logoutUrl ?? '#'" aria-label="Выйти" title="Выйти">
            <i class="fas fa-right-from-bracket" aria-hidden="true"></i>
            <span class="bpm-sb__logout-text">Выйти</span>
          </a>
        </div>
      </div>
    </footer>
  </aside>
</template>

<style scoped>
/* Easing: мягкий ease-out для плавного замедления в конце
   Задержка сдвига (при collapse: status растворяется, затем всё сдвигается) */
.bpm-sb {
  --bpm-ease: cubic-bezier(0.33, 1, 0.68, 1);
  --bpm-shift-delay: 0s;
}

/* Корень: фиксированная полоса слева, высота экрана */
.bpm-sb {
  --bpm-sb-width: 260px;
  --bpm-sb-width-collapsed: 78px;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 48;
  width: var(--sidebar-width, var(--bpm-sb-width));
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 12px 10px 10px;
  color: var(--text-primary);
  background: var(
      --gradient-glass,
      linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, transparent 50%)
    ),
    var(--surface-glass, rgba(20, 30, 40, 0.6));
  backdrop-filter: blur(20px);
  border-right: 1px solid var(--border-strong, rgba(255, 255, 255, 0.1));
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transition:
    width 0.4s var(--bpm-ease),
    transform 0.4s var(--bpm-ease),
    padding 0.4s var(--bpm-ease);
}

.bpm-sb--collapsed {
  --bpm-shift-delay: 0.2s;
  width: var(--sidebar-collapsed-width, var(--bpm-sb-width-collapsed));
  padding: 12px 8px 10px;
  transition:
    width 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    transform 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    padding 0.4s var(--bpm-ease) var(--bpm-shift-delay);
}

/* Разделители секций */
.bpm-sb__divider {
  height: 1px;
  flex-shrink: 0;
  background: var(--border-strong, rgba(255, 255, 255, 0.12));
  opacity: 0.8;
}

.bpm-sb__divider--after-header {
  margin: 0 0 10px;
}

.bpm-sb__divider--before-footer {
  margin: 12px 0 8px;
}

.bpm-sb--light .bpm-sb__divider {
  background: var(--border-strong, rgba(0, 0, 0, 0.12));
}

.bpm-sb--light {
  box-shadow: 6px 0 20px rgba(0, 0, 0, 0.08);
}

/* Шапка: две строки — brand сверху, collapse bar снизу (ширина как у status) */
.bpm-sb__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 10px;
  transition: gap 0.4s var(--bpm-ease) var(--bpm-shift-delay);
  isolation: isolate;
}

.bpm-sb--collapsed .bpm-sb__header {
  gap: 6px;
  transition: gap 0.4s var(--bpm-ease);
}

.bpm-sb__header-actions {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: stretch;
  width: 100%;
  min-height: 0;
}

/* Brand: изображение сверху (ширина = collapse button), текст снизу; z-index ниже header-actions, чтобы кнопка получала клики */
.bpm-sb__brand {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  align-items: start;
  gap: 8px;
  min-width: 0;
  flex: 1;
  width: 100%;
  transition:
    grid-template-rows 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    gap 0.4s var(--bpm-ease) var(--bpm-shift-delay);
}

.bpm-sb__brand--collapsed {
  grid-template-rows: 1fr 0fr;
  flex: none;
  width: 100%;
  min-width: 0;
  gap: 0;
  /* Задержка: сжатие строки после исчезновения текста */
  transition:
    grid-template-rows 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    gap 0.4s var(--bpm-ease) var(--bpm-shift-delay);
}

.bpm-sb__brand-media {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  padding: 6px;
}

.bpm-sb__brand-img {
  display: block;
  width: 55px;
  height: 55px;
  object-fit: contain;
  border-radius: var(--radius-sm, 8px);
}

.bpm-sb__brand-slot {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.35s var(--bpm-ease) var(--bpm-shift-delay);
}

/* При сворачивании: сначала скрываем текст (без задержки), чтобы нижележащие элементы не наезжали */
.bpm-sb__brand--collapsed .bpm-sb__brand-slot {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s var(--bpm-ease);
}

.bpm-sb__brand-slot .bpm-sb__brand-text {
  white-space: nowrap;
}

.bpm-sb__brand-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 6px;
}

.bpm-sb__brand-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.bpm-sb__brand-sub {
  font-size: 0.65rem;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
  letter-spacing: 0.04em;
}

.bpm-sb__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.15));
  border-radius: var(--radius-md, 10px);
  background: color-mix(in srgb, var(--surface-2, rgba(255, 255, 255, 0.08)) 80%, transparent);
  color: var(--text-secondary, rgba(255, 255, 255, 0.8));
  cursor: pointer;
  transition:
    border-color 0.25s var(--bpm-ease),
    color 0.25s var(--bpm-ease),
    background 0.25s var(--bpm-ease),
    transform 0.2s var(--bpm-ease),
    width 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    height 0.4s var(--bpm-ease) var(--bpm-shift-delay);
}

.bpm-sb__btn:hover {
  color: var(--text-primary, #fff);
  border-color: var(--border-accent, rgba(255, 255, 255, 0.3));
  background: color-mix(in srgb, var(--surface-2, rgba(255, 255, 255, 0.12)) 90%, transparent);
}

.bpm-sb__btn:active {
  transform: scale(0.98);
}

.bpm-sb__btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring, 0 0 0 2px rgba(100, 180, 100, 0.35));
}

/* Collapse bar: полная ширина (как status), высота 18px, стиль как status */
.bpm-sb__btn--collapse {
  width: 100%;
  height: 18px;
  min-height: 18px;
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.12));
  background: color-mix(in srgb, var(--surface-2, rgba(255, 255, 255, 0.06)) 80%, transparent);
  transition:
    border-color 0.25s var(--bpm-ease),
    color 0.25s var(--bpm-ease),
    background 0.25s var(--bpm-ease),
    transform 0.2s var(--bpm-ease),
    width 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    height 0.4s var(--bpm-ease) var(--bpm-shift-delay);
}

.bpm-sb__btn--collapse:hover {
  border-color: var(--border-strong, rgba(255, 255, 255, 0.18));
  background: color-mix(in srgb, var(--surface-2, rgba(255, 255, 255, 0.08)) 90%, transparent);
}

.bpm-sb__btn--collapse i {
  font-size: 0.5rem;
  opacity: 0.85;
  pointer-events: none; /* клик срабатывает по всей области кнопки (иконка + рамка) */
}

.bpm-sb--collapsed .bpm-sb__btn--collapse {
  height: 18px;
  min-height: 18px;
  transition:
    width 0.4s var(--bpm-ease),
    height 0.4s var(--bpm-ease);
}

.bpm-sb__btn--close {
  display: none;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
}

/* Сворачивание: status растворяется первым → sidebar и остальное сдвигается (delay)
   Разворачивание: sidebar сдвигается → status проявляется (без задержки)
   visibility с delay при collapse, чтобы opacity успела проанимироваться */
.bpm-sb__status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 10px;
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.12));
  background: color-mix(in srgb, var(--surface-2, rgba(255, 255, 255, 0.06)) 80%, transparent);
  flex-shrink: 0;
  overflow: hidden;
  opacity: 1;
  visibility: visible;
  max-height: 80px;
  transition:
    opacity 0.25s var(--bpm-ease),
    visibility 0s,
    max-height 0.35s var(--bpm-ease),
    padding 0.3s var(--bpm-ease),
    margin 0.3s var(--bpm-ease),
    border 0.3s var(--bpm-ease),
    background 0.3s var(--bpm-ease);
}

/* При сворачивании: сначала скрываем (opacity), затем сжимаем — чтобы nav не наезжал */
.bpm-sb__status--collapsed {
  opacity: 0;
  visibility: hidden;
  max-height: 0;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  transition:
    opacity 0.15s var(--bpm-ease),
    visibility 0s linear 0.15s,
    max-height 0.3s var(--bpm-ease) var(--bpm-shift-delay),
    padding 0.3s var(--bpm-ease) var(--bpm-shift-delay),
    margin 0.3s var(--bpm-ease) var(--bpm-shift-delay),
    border 0.3s var(--bpm-ease) var(--bpm-shift-delay),
    background 0.3s var(--bpm-ease) var(--bpm-shift-delay);
}

.bpm-sb__status-slot {
  min-width: 0;
  overflow: hidden;
}

.bpm-sb__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-warning, #e8a030);
  box-shadow: 0 0 10px color-mix(in srgb, var(--status-warning, #e8a030) 60%, transparent);
  flex-shrink: 0;
  animation: bpm-sb-pulse 2.5s ease-in-out infinite;
  transition:
    width 0.28s var(--bpm-ease),
    height 0.28s var(--bpm-ease);
}

.bpm-sb__status--collapsed .bpm-sb__status-dot {
  width: 8px;
  height: 8px;
}

@keyframes bpm-sb-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.75;
  }
}

.bpm-sb__status:hover {
  border-color: var(--border-strong, rgba(255, 255, 255, 0.18));
  background: color-mix(in srgb, var(--surface-2, rgba(255, 255, 255, 0.08)) 90%, transparent);
}

.bpm-sb__status-text {
  min-width: 0;
}

.bpm-sb__status-title {
  margin: 0;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bpm-sb__status-desc {
  margin: 2px 0 0;
  font-size: 0.7rem;
  color: var(--text-secondary, rgba(255, 255, 255, 0.8));
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Навигация */
.bpm-sb__nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  scrollbar-gutter: stable;
}

.bpm-sb__nav::-webkit-scrollbar {
  width: 6px;
}

.bpm-sb__nav::-webkit-scrollbar-track {
  background: transparent;
}

.bpm-sb__nav::-webkit-scrollbar-thumb {
  border-radius: 3px;
  background: color-mix(in srgb, var(--text-tertiary, rgba(255, 255, 255, 0.4)) 60%, transparent);
}

.bpm-sb__nav::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary, rgba(255, 255, 255, 0.5));
}

.bpm-sb--collapsed .bpm-sb__nav {
  padding-right: 0;
}

.bpm-sb__nav-heading-wrap {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  opacity: 1;
  transition:
    grid-template-rows 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    opacity 0.35s var(--bpm-ease);
}

.bpm-sb__nav-heading-wrap > * {
  min-height: 0;
}

.bpm-sb__nav-heading-wrap--collapsed {
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    opacity 0.3s var(--bpm-ease) var(--bpm-shift-delay);
}

.bpm-sb__nav-heading {
  margin: 0 0 8px;
  padding: 0 4px;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
}

.bpm-sb__group {
  margin-bottom: 4px;
}

.bpm-sb__link,
a.bpm-sb__link {
  position: relative;
  width: 100%;
  min-height: 36px;
  display: grid;
  grid-template-columns: 18px 1fr;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.8));
  background: transparent;
  cursor: pointer;
  text-decoration: none;
  text-align: left;
  font: inherit;
  transition:
    grid-template-columns 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    gap 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    justify-content 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    background 0.25s var(--bpm-ease),
    border-color 0.25s var(--bpm-ease),
    color 0.25s var(--bpm-ease),
    box-shadow 0.25s var(--bpm-ease),
    transform 0.2s var(--bpm-ease);
  box-sizing: border-box;
}

.bpm-sb__link--collapsed,
a.bpm-sb__link--collapsed {
  grid-template-columns: 18px 0fr;
  gap: 0;
  justify-content: center;
  padding: 0;
}

.bpm-sb__link-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.35s var(--bpm-ease);
}

.bpm-sb__link-slot--collapsed {
  opacity: 0;
  transition: opacity 0.3s var(--bpm-ease) var(--bpm-shift-delay);
}

.bpm-sb__link-slot .bpm-sb__link-label {
  flex: 1;
  min-width: 0;
}

.bpm-sb__link:active,
a.bpm-sb__link:active {
  transform: scale(0.99);
}

.bpm-sb__link:hover,
a.bpm-sb__link:hover {
  background: color-mix(in srgb, var(--accent-soft, rgba(100, 180, 100, 0.2)) 50%, transparent);
  color: var(--text-primary, #fff);
}

.bpm-sb__link:focus-visible,
a.bpm-sb__link:focus-visible {
  outline: 2px solid var(--accent, #6a9);
  outline-offset: 2px;
}

.bpm-sb__link--active,
a.bpm-sb__link--active {
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-accent, rgba(255, 255, 255, 0.35));
  border-left: 3px solid var(--accent, #6a9);
  background: color-mix(in srgb, var(--accent-soft, rgba(100, 180, 100, 0.25)) 75%, transparent);
}

/* В активном состоянии используем border-left вместо отдельного индикатора — без наезжания линий */
.bpm-sb__link--active .bpm-sb__link-indicator,
a.bpm-sb__link--active .bpm-sb__link-indicator {
  display: none;
}

.bpm-sb__link-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0.6);
  width: 3px;
  height: 18px;
  /* Левый край повторяет скругление ссылки */
  border-radius: 0 4px 4px 0;
  background: var(--accent, #6a9);
  opacity: 0;
  transition:
    opacity 0.22s var(--bpm-ease),
    transform 0.22s var(--bpm-ease);
  pointer-events: none;
}

.bpm-sb--collapsed .bpm-sb__link--active .bpm-sb__link-indicator,
.bpm-sb--collapsed a.bpm-sb__link--active .bpm-sb__link-indicator {
  opacity: 1;
  transform: translateY(-50%) scaleY(1);
  height: 20px;
}

.bpm-sb__link--collapsed,
a.bpm-sb__link--collapsed {
  padding: 0;
}

.bpm-sb__link--collapsed .bpm-sb__link-indicator,
a.bpm-sb__link--collapsed .bpm-sb__link-indicator {
  left: 2px;
}

.bpm-sb__link-icon {
  width: 18px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.bpm-sb__link--active .bpm-sb__link-icon,
a.bpm-sb__link--active .bpm-sb__link-icon {
  color: var(--accent, inherit);
}

.bpm-sb__link-label {
  flex: 1;
  min-width: 0;
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bpm-sb__badge {
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.15));
  background: color-mix(in srgb, var(--surface-3, rgba(255, 255, 255, 0.1)) 85%, transparent);
  color: var(--text-secondary, rgba(255, 255, 255, 0.9));
}

.bpm-sb__caret {
  flex-shrink: 0;
  font-size: 0.56rem;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
  transition: transform 0.24s var(--bpm-ease);
}

.bpm-sb__caret--open {
  transform: rotate(180deg);
}

/* Подменю */
.bpm-sb__sub {
  position: relative;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s var(--bpm-ease);
}

.bpm-sb__sub--open {
  max-height: 420px;
}

.bpm-sb__sub-inner {
  transition: opacity 0.2s var(--bpm-ease) 0.06s;
}

.bpm-sb__sub:not(.bpm-sb__sub--open) .bpm-sb__sub-inner {
  opacity: 0;
}

.bpm-sb__sub--open .bpm-sb__sub-inner {
  opacity: 1;
}

.bpm-sb__sub-track {
  position: absolute;
  left: 18px;
  top: 0;
  bottom: 0;
  z-index: 0;
  width: 1px;
  background: linear-gradient(
    180deg,
    var(--border-soft, rgba(255, 255, 255, 0.15)) 0%,
    var(--border-soft, rgba(255, 255, 255, 0.15)) 100%
  );
  opacity: 0.6;
  pointer-events: none;
}

.bpm-sb__sub-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0 6px 0;
  padding-right: 8px;
  padding-left: 22px;
}

.bpm-sb__sub-link,
button.bpm-sb__sub-link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  margin-left: 0;
  padding: 0 8px 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 6px);
  color: var(--text-secondary, rgba(255, 255, 255, 0.8));
  background: transparent;
  cursor: pointer;
  text-decoration: none;
  text-align: left;
  font: inherit;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.12s ease;
  box-sizing: border-box;
}

.bpm-sb__sub-link:active,
button.bpm-sb__sub-link:active {
  transform: scale(0.99);
}

.bpm-sb__sub-link:hover,
button.bpm-sb__sub-link:hover {
  background: color-mix(in srgb, var(--accent-soft, rgba(100, 180, 100, 0.2)) 50%, transparent);
  color: var(--text-primary, #fff);
}

.bpm-sb__sub-link:focus-visible,
button.bpm-sb__sub-link:focus-visible {
  outline: 2px solid var(--accent, #6a9);
  outline-offset: 2px;
}

.bpm-sb__sub-link--active,
button.bpm-sb__sub-link--active {
  color: var(--text-primary, #fff);
  border: 1px solid var(--border-accent, rgba(255, 255, 255, 0.3));
  border-left: 3px solid var(--accent, #6a9);
  background: color-mix(in srgb, var(--accent-soft, rgba(100, 180, 100, 0.2)) 85%, transparent);
}

.bpm-sb__sub-icon {
  width: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
}

.bpm-sb__sub-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary, rgba(255, 255, 255, 0.5));
}

.bpm-sb__sub-label {
  flex: 1;
  min-width: 0;
  font-size: 0.76rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Футер: пользователь */
.bpm-sb__footer {
  flex-shrink: 0;
  margin-top: 8px;
}

.bpm-sb__user {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 44px;
  padding: 0 8px;
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.12));
  background: color-mix(in srgb, var(--surface-2, rgba(255, 255, 255, 0.06)) 75%, transparent);
  overflow: hidden;
  transition:
    grid-template-columns 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    gap 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    border-color 0.25s var(--bpm-ease),
    background 0.25s var(--bpm-ease),
    height 0.4s var(--bpm-ease),
    padding 0.4s var(--bpm-ease),
    border-radius 0.4s var(--bpm-ease);
}

.bpm-sb__user:hover {
  border-color: var(--border-strong, rgba(255, 255, 255, 0.18));
  background: color-mix(in srgb, var(--surface-2, rgba(255, 255, 255, 0.1)) 85%, transparent);
}

.bpm-sb--collapsed .bpm-sb__user {
  grid-template-columns: auto 0fr;
  gap: 0;
  height: 38px;
  padding: 0 calc((100% - 24px) / 2);
  border-radius: 10px;
}

.bpm-sb__user-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.4s var(--bpm-ease);
}

.bpm-sb__user-slot--collapsed {
  opacity: 0;
  transition: opacity 0.4s var(--bpm-ease) var(--bpm-shift-delay);
}

.bpm-sb__user-slot .bpm-sb__user-text {
  flex: 1;
  min-width: 0;
}

.bpm-sb__avatar {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm, 8px);
  background: color-mix(in srgb, var(--accent-soft, rgba(100, 180, 100, 0.25)) 70%, transparent);
  color: var(--text-primary, #fff);
  font-size: 0.72rem;
  transition:
    width 0.4s var(--bpm-ease) var(--bpm-shift-delay),
    height 0.4s var(--bpm-ease) var(--bpm-shift-delay);
}

.bpm-sb--collapsed .bpm-sb__avatar {
  width: 24px;
  height: 24px;
}

.bpm-sb__user-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.bpm-sb__user-name {
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bpm-sb__user-role {
  font-size: 0.65rem;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bpm-sb__logout {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: var(--radius-xs, 4px);
  color: var(--text-secondary, rgba(255, 255, 255, 0.8));
  text-decoration: none;
  font-size: 0.7rem;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.bpm-sb__logout:hover {
  color: var(--accent, #6a9);
  background: color-mix(in srgb, var(--accent-soft, rgba(100, 180, 100, 0.15)) 60%, transparent);
}

.bpm-sb__logout:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring, 0 0 0 2px var(--accent, #6a9));
}

.bpm-sb__logout-text {
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  white-space: nowrap;
  transition:
    max-width 0.28s var(--bpm-ease),
    opacity 0.22s var(--bpm-ease);
}

.bpm-sb__user:hover .bpm-sb__logout-text {
  max-width: 3rem;
  opacity: 1;
}

/* Мобильный вид: выезд слева, кнопка закрыть */
@media (max-width: 980px) {
  .bpm-sb {
    width: min(86vw, 320px);
    max-width: min(86vw, 320px);
    transform: translateX(-100%);
    z-index: 52;
    padding: 12px 10px 10px;
  }

  .bpm-sb--mobile-open {
    transform: translateX(0);
  }

  .bpm-sb__btn--close {
    display: flex;
  }

  .bpm-sb__btn--collapse {
    display: none;
  }

  .bpm-sb__header-actions {
    justify-content: flex-end;
  }

  .bpm-sb__brand {
    flex: 1;
    justify-content: flex-start;
  }

  .bpm-sb__status,
  .bpm-sb__status--collapsed {
    opacity: 1;
    visibility: visible;
    max-height: 80px;
    padding: 8px 10px;
    margin-bottom: 10px;
    border: 1px solid var(--border-soft, rgba(255, 255, 255, 0.12));
    background: color-mix(in srgb, var(--surface-2, rgba(255, 255, 255, 0.06)) 80%, transparent);
  }

  .bpm-sb__link,
  a.bpm-sb__link {
    min-height: 44px;
  }

  .bpm-sb__sub-link,
  button.bpm-sb__sub-link {
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bpm-sb,
  .bpm-sb__link,
  a.bpm-sb__link,
  .bpm-sb__sub-link,
  button.bpm-sb__sub-link,
  .bpm-sb__sub,
  .bpm-sb__caret,
  .bpm-sb__btn,
  .bpm-sb__brand,
  .bpm-sb__brand-slot,
  .bpm-sb__avatar,
  .bpm-sb__user,
  .bpm-sb__user-slot,
  .bpm-sb__status,
  .bpm-sb__status-slot,
  .bpm-sb__status-dot,
  .bpm-sb__nav-heading-wrap,
  .bpm-sb__link-slot {
    transition-duration: 0.01ms !important;
  }

  .bpm-sb__link:active,
  a.bpm-sb__link:active,
  .bpm-sb__sub-link:active,
  button.bpm-sb__sub-link:active {
    transform: none;
  }

  .bpm-sb__btn:active {
    transform: none;
  }

  .bpm-sb__status-dot {
    animation: none;
  }
}
</style>

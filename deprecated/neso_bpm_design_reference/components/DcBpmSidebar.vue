<script setup lang="ts">
import { computed } from 'vue'
import DcDemoSidebar from './DcDemoSidebar.vue'
import type { NavItem } from '../shared/bpmVueExportedTypes'
import { filterNavItems } from '../shared/navVisibility'
import type { NavVisibilityContext } from '../shared/navVisibility'
import { BPM_HOME_NAV_ITEMS } from '../shared/bpmNavConfig'

const props = withDefaults(
  defineProps<{
    /** Подсвечиваемый пункт (текущая страница). */
    activeId?: string | null
    /** URL главной страницы (для пункта «Главная»). */
    homeUrl: string
    loginUrl: string
    adminUrl: string
    testsUrl: string
    designUrl: string
    /** URL страницы «Клиенты → Диалоги». */
    clientsDialogsUrl?: string
    scenarioCount?: number
    /** Контекст для показа/скрытия пунктов (роль, права). Без контекста или с пустой ролью — админка скрыта. */
    visibilityContext?: NavVisibilityContext | null
    theme?: 'dark' | 'light'
    logoText?: string
    userName?: string
    userRole?: string
    collapsed?: boolean
    mobileOpen?: boolean
  }>(),
  {
    activeId: null,
    scenarioCount: 0,
    visibilityContext: () => ({})
  }
)

const emit = defineEmits<{
  close: []
  select: [id: string]
  toggleCollapse: []
}>()

const visibilityContext = computed<NavVisibilityContext>(() => props.visibilityContext ?? {})

const childIdToUrl = computed<Record<string, string>>(() => ({
  'admin-panel': props.adminUrl,
  'admin-tests': props.testsUrl,
  'admin-design': props.designUrl,
  'client-dialogs': props.clientsDialogsUrl ?? ''
}))

const menuItems = computed<NavItem[]>(() => {
  const items = filterNavItems(BPM_HOME_NAV_ITEMS, visibilityContext.value)
  const count = props.scenarioCount ?? 0
  const urlMap = childIdToUrl.value
  return items.map((item) => {
    const withParentHref =
      !item.children && item.id === 'home' ? { ...item, href: props.homeUrl } : item
    if (!item.children) {
      return withParentHref
    }
    const children = item.children.map((child) => {
      const url = urlMap[child.id]
      const withBadge =
        item.id === 'admin' && child.id === 'admin-design' ? { ...child, badge: count } : child
      return url ? { ...withBadge, href: url } : withBadge
    })
    return { ...item, children }
  })
})

function closeSidebar() {
  emit('close')
}

function onSelect(id: string) {
  const url =
    id === 'home'
      ? props.homeUrl
      : id === 'admin-panel'
        ? props.adminUrl
        : id === 'admin-tests'
          ? props.testsUrl
          : id === 'admin-design'
            ? props.designUrl
            : id === 'client-dialogs'
              ? (props.clientsDialogsUrl ?? '')
              : ''
  if (url) {
    window.location.href = url
  }
  emit('select', id)
}
</script>

<template>
  <DcDemoSidebar
    :theme="theme"
    :logo-text="logoText"
    :user-name="userName"
    :user-role="userRole"
    :logout-url="loginUrl"
    :items="menuItems"
    :collapsed="collapsed"
    :mobile-open="mobileOpen"
    :active-id="activeId"
    @close="closeSidebar"
    @select="onSelect"
    @toggle-collapse="emit('toggleCollapse')"
  />
</template>

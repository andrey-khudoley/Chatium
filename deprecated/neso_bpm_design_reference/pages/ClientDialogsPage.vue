<script setup lang="ts">
import { computed, ref } from 'vue'
import { DcBpmHeaderControls, DcBpmSidebar, DcClientSupportDesk, DcPageHeader } from '../components'
import { DcAppShell, DcContent, DcMain } from '../layout'
import { bpmCopy, type BpmLocale } from '../shared/bpmI18n'
import { getClientSupportDemo } from '../shared/clientSupportDemo'
import { getStoredSidebarCollapsed } from '../shared/sidebarStorage'
import { getStoredTheme, setStoredTheme } from '../shared/themeStorage'
import { getDefaultThemePresetId, getThemePresetById } from '../shared/themeCatalog'

const props = defineProps<{
  projectTitle: string
  homeUrl: string
  loginUrl: string
  adminUrl: string
  testsUrl: string
  designUrl: string
  clientsDialogsUrl: string
  scenarioCount: number
}>()

const sidebarCollapsed = ref(getStoredSidebarCollapsed())
const sidebarOpen = ref(false)
const locale = ref<BpmLocale>('ru')
const storedTheme = getStoredTheme()
const selectedPresetId = ref(getDefaultThemePresetId(storedTheme ?? 'light'))

const currentTheme = computed(() => getThemePresetById(selectedPresetId.value)?.mode ?? 'light')
const breadcrumbs = computed(() => [ui.value.home, 'Клиенты', 'Диалоги'])
const ui = computed(() => bpmCopy[locale.value])
const clientSupportDemo = computed(() => getClientSupportDemo(locale.value))

const navVisibilityContext = computed(() => ({ userRole: 'admin' }))

function closeSidebar() {
  sidebarOpen.value = false
}

function toggleSidebarMobile() {
  sidebarOpen.value = !sidebarOpen.value
}

function setLocale(next: BpmLocale) {
  locale.value = next
}

function onThemeChange(id: string) {
  const mode = id === 'dark' ? 'dark' : 'light'
  setStoredTheme(mode)
  selectedPresetId.value = getDefaultThemePresetId(mode)
}
</script>

<template>
  <DcAppShell
    :theme="currentTheme"
    :theme-preset-id="selectedPresetId"
    :ready="true"
    :sidebar-collapsed="sidebarCollapsed"
    :sidebar-open="sidebarOpen"
    @close-sidebar="closeSidebar"
  >
    <template #sidebar>
      <DcBpmSidebar
        active-id="client-dialogs"
        :home-url="homeUrl"
        :login-url="loginUrl"
        :admin-url="adminUrl"
        :tests-url="testsUrl"
        :design-url="designUrl"
        :clients-dialogs-url="clientsDialogsUrl"
        :scenario-count="scenarioCount"
        :visibility-context="navVisibilityContext"
        theme="light"
        logo-text="NeSo BPM"
        user-name="Guest"
        user-role="BPM Workspace"
        :collapsed="sidebarCollapsed"
        :mobile-open="sidebarOpen"
        @close="closeSidebar"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      />
    </template>

    <template #header>
      <DcPageHeader
        :theme="currentTheme"
        title="Диалоги"
        :breadcrumbs="breadcrumbs"
        :show-menu-toggle="true"
        @menu-toggle="toggleSidebarMobile"
      >
        <template #actions>
          <DcBpmHeaderControls
            :language-label="ui.navLanguage"
            :theme-label="ui.navTheme"
            :locale="locale"
            :theme-options="[]"
            :selected-theme-id="currentTheme"
            theme-variant="light-dark"
            :open-index-label="ui.openLanding"
            index-url="https://example.com/"
            :theme-light-aria-label="ui.themeLight"
            :theme-dark-aria-label="ui.themeDark"
            @change-locale="setLocale"
            @change-theme="onThemeChange"
          />
        </template>
      </DcPageHeader>
    </template>

    <DcMain>
      <DcContent>
        <section class="client-dialogs-page__section client-dialogs-page__section--full">
          <DcClientSupportDesk
            title="Клиентские диалоги"
            subtitle="Операционная переписка: очередь диалогов, окно сообщений, карточка клиента"
            :threads="clientSupportDemo.threads"
            :messages="clientSupportDemo.messages"
            :profiles="clientSupportDemo.profiles"
          />
        </section>
      </DcContent>
    </DcMain>
  </DcAppShell>
</template>

<style scoped>
.client-dialogs-page__section {
  display: grid;
  gap: 8px;
}

.client-dialogs-page__section--full {
  grid-template-columns: 1fr;
}
</style>

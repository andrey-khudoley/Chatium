<template>
  <AppBackground />
  <div class="app-shell">
    <Sidebar class="sidebar-desktop" />
    <MobileDrawer />
    <div class="main-col">
      <Topbar />
      <main class="screen-area">
        <HomeScreen v-if="store.screen === 'home'" />
        <JournalScreen v-else-if="store.screen === 'journal'" />
        <TasksScreen v-else-if="store.screen === 'tasks'" />
        <DialogsScreen v-else-if="store.screen === 'dialogs'" />
        <FinancesScreen v-else-if="store.screen === 'finances'" />
        <ParaScreen v-else-if="store.screen === 'para'" />
        <ToolsScreen v-else-if="store.screen === 'tools'" />
        <ServicesScreen v-else-if="store.screen === 'services'" />
        <LibraryScreen v-else-if="store.screen === 'library'" />
        <DetailScreen v-else-if="store.screen === 'detail'" />
        <ComponentsScreen v-else-if="store.screen === 'components'" />
        <StubScreen v-else />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { store, ensureStores } from '../shared/store'
import { applyTheme } from '../shared/theme'

import { seedTasks, seedTodayTasks, seedHabits } from '../shared/mocks/tasks.mock'
import { seedLib } from '../shared/mocks/library.mock'
import { seedProjs, seedRefs } from '../shared/mocks/para.mock'
import { seedServices } from '../shared/mocks/services.mock'
import { seedThreads } from '../shared/mocks/dialogs.mock'

import AppBackground from '../components/shell/AppBackground.vue'
import Sidebar from '../components/shell/Sidebar.vue'
import Topbar from '../components/shell/Topbar.vue'
import MobileDrawer from '../components/shell/MobileDrawer.vue'

import HomeScreen from './screens/HomeScreen.vue'
import JournalScreen from './screens/JournalScreen.vue'
import TasksScreen from './screens/TasksScreen.vue'
import DialogsScreen from './screens/DialogsScreen.vue'
import FinancesScreen from './screens/FinancesScreen.vue'
import ParaScreen from './screens/ParaScreen.vue'
import ToolsScreen from './screens/ToolsScreen.vue'
import ServicesScreen from './screens/ServicesScreen.vue'
import LibraryScreen from './screens/LibraryScreen.vue'
import DetailScreen from './screens/DetailScreen.vue'
import ComponentsScreen from './screens/ComponentsScreen.vue'
import StubScreen from './screens/StubScreen.vue'

onMounted(() => {
  applyTheme(document.documentElement, store.accent, store.density === 'comfy')
  ensureStores(
    seedTasks,
    seedLib,
    seedProjs,
    seedRefs,
    seedTodayTasks,
    seedHabits,
    seedServices,
    seedThreads
  )
})
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar-desktop {
  display: flex;
}
.main-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.screen-area {
  flex: 1;
  overflow-y: auto;
}
@media (max-width: 880px) {
  .sidebar-desktop {
    display: none;
  }
}
</style>

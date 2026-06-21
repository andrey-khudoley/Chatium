<script setup lang="ts">
import { withDefaults } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { DEFAULT_USER_TIMEZONE_OFFSET_HOURS } from '../shared/user-settings-defaults'

const props = withDefaults(
  defineProps<{
    projectTitle: string
    indexUrl: string
    profileUrl: string
    loginUrl: string
    isAuthenticated: boolean
    isAdmin?: boolean
    adminUrl?: string
    testsUrl?: string
    pomodoroUrl: string
    toolsStateUrl?: string
    toolsControlUrl?: string
    encodedFocusToolsSocketId?: string
    timezoneOffsetHours?: number
  }>(),
  { timezoneOffsetHours: DEFAULT_USER_TIMEZONE_OFFSET_HOURS },
)
</script>

<template>
  <div class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
    <GlobalGlitch />
    <Header
      :projectTitle="props.projectTitle"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
      :isAdmin="props.isAdmin"
      :adminUrl="props.adminUrl"
      :testsUrl="props.testsUrl"
      :timezoneOffsetHours="props.timezoneOffsetHours"
      :enableToolClockWidget="true"
      :toolsStateUrl="props.toolsStateUrl"
      :toolsControlUrl="props.toolsControlUrl"
      :encodedFocusToolsSocketId="props.encodedFocusToolsSocketId"
    />
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner tools-shell">
        <h2 class="tools-title">Инструменты</h2>
        <div class="tools-grid">
          <a class="tools-card tools-card--link" :href="props.pomodoroUrl">
            <i class="fas fa-clock tools-card-icon" />
            <span>Таймеры</span>
          </a>
        </div>
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-layout { min-height: 100vh; }
.content-wrapper { display: flex; }
.content-inner { width: 100%; }
.tools-shell { max-width: 860px; margin: 0 auto; padding: 1rem; }
.tools-title { margin: 0 0 1rem; text-transform: uppercase; letter-spacing: .12em; font-size: .9rem; }
.tools-grid { display: grid; gap: .8rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.tools-card { border: 1px solid var(--color-border); background: var(--color-bg-secondary); color: var(--color-text); text-decoration: none; }
.tools-card--link { display: inline-flex; gap: .6rem; align-items: center; padding: .9rem 1rem; min-height: 3.2rem; }
.tools-card:hover { border-color: var(--color-accent); box-shadow: 0 0 10px var(--color-accent-light); }
.tools-card-icon { color: var(--color-accent-hover); }
</style>

<template>
  <div class="flex items-center gap-1.5 sm:gap-2">
    <ShareButton v-if="episode" :episode="episode" />

    <slot />
    <button
      @click="toggleTheme()"
      class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-all duration-200 header-action-btn"
      :title="currentTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'"
    >
      <i v-if="currentTheme === 'dark'" class="fas fa-sun text-xs header-action-icon"></i>
      <i v-else class="fas fa-moon text-xs header-action-icon"></i>
    </button>

    <a
      v-if="isAdmin"
      :href="adminUrl"
      class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-all duration-200 header-action-btn"
      title="Админка"
    >
      <i class="fas fa-cog text-xs header-action-icon"></i>
    </a>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { currentTheme, toggleTheme } from '../shared/theme'
import { adminListRoute } from '../admin'
import ShareButton from './ShareButton.vue'

const props = defineProps({
  episode: { type: Object, default: null }
})

const isAdmin = ref(ctx.user && ctx.user.is('Admin'))
const adminUrl = adminListRoute.url()
</script>

<style scoped>
.header-action-btn {
  background: var(--wr-btn-subtle-bg);
}
.header-action-btn:hover {
  background: var(--wr-btn-subtle-hover-bg);
}
.header-action-icon {
  color: var(--wr-text-tertiary);
  transition: color 0.2s;
}
.header-action-btn:hover .header-action-icon {
  color: var(--wr-text-primary);
}
</style>

<script setup lang="ts">
import Header from '../Header.vue'

defineProps<{
  projectTitle: string
  indexUrl: string
  profileUrl: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  testsUrl?: string
}>()
</script>

<template>
  <div class="page-container flex flex-col flex-1 min-h-0">
    <Header
      :projectTitle="projectTitle"
      :indexUrl="indexUrl"
      :profileUrl="profileUrl"
      :loginUrl="loginUrl"
      :isAuthenticated="isAuthenticated"
      :isAdmin="isAdmin"
      :adminUrl="adminUrl"
      :testsUrl="testsUrl"
    />
    <main class="content-wrapper flex-1 overflow-y-auto relative z-10">
      <slot />
    </main>
  </div>
</template>

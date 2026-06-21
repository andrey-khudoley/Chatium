<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('LoginPage')

const props = defineProps<{
  back: string
}>()

const signinUrl = computed(() => `/s/auth/signin?back=${encodeURIComponent(props.back)}`)

onMounted(() => {
  log.info('Component mounted', {
    back: props.back,
    signinUrl: signinUrl.value,
    logLevel: (window as Window & { __BOOT__?: { logLevel?: unknown } }).__BOOT__?.logLevel
  })
  log.debug('Login page ready, redirect target', { signinUrl: signinUrl.value })
})

onUnmounted(() => {
  log.info('Component unmounted')
})
</script>

<template>
  <div>
    <a :href="signinUrl">Войти</a>
  </div>
</template>

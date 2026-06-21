<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('LoginPage')

const props = defineProps<{
  back: string
}>()

const signinUrl = computed(() => `/s/auth/signin?back=${encodeURIComponent(props.back)}`)

onMounted(() => {
  log.info('Component mounted', { signinUrl: signinUrl.value })
})
</script>

<template>
  <div>
    <a :href="signinUrl">Войти</a>
  </div>
</template>

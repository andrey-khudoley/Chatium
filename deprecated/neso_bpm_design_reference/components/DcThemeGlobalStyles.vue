<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { getGlobalThemeStyles, getThemeStyleElementId } from '../shared/themeStyles'

const props = defineProps<{
  theme?: 'dark' | 'light'
  themePresetId?: string
}>()

const styleId = getThemeStyleElementId()

function injectStyles(theme: 'dark' | 'light', presetId?: string) {
  if (typeof document === 'undefined') return

  let el = document.getElementById(styleId) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = styleId
    document.head.appendChild(el)
  }

  el.textContent = getGlobalThemeStyles(theme, presetId)
}

function applyCurrentTheme() {
  injectStyles(props.theme ?? 'dark', props.themePresetId)
}

onMounted(() => {
  applyCurrentTheme()
})

watch(
  () => [props.theme, props.themePresetId],
  () => {
    applyCurrentTheme()
  },
  { immediate: false }
)
</script>

<template>
  <template />
</template>

<script setup lang="ts">
import { appUiStyleToCss } from './styles/styles'
import { AppUiBox } from './types'
import Button from './Button.vue'

interface BoxProps {
  block: AppUiBox
}

const props = defineProps<BoxProps>()
</script>

<template>
  <div class="AppUiBoxContainer" :style="appUiStyleToCss(block.style)">
    <template v-for="(block, index) in props.block.blocks || []" :key="index">
      <Box v-if="block.type === 'box'" :block="block" />

      <Button v-else-if="block.type === 'button'" :block="block" />
    </template>
  </div>
</template>

<style scoped>
.AppUiBoxContainer {
  /* paddingLeft: '10px', */
  /* paddingRight: '10px', */
  /* marginBottom: '20px', */
}
</style>

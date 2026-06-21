<script setup lang="ts">
import { computed } from 'vue'
import Box from './Box.vue'
import Button from './Button.vue'
import type { AppUiBlock, AppUiBlocks, AppUiBox, AppUiButton } from './types'

interface AppUiPresenterProps {
  blocks: AppUiBlocks
}

const props = defineProps<AppUiPresenterProps>()

const blockItems = computed<AppUiBlock[]>(() =>
  Array.isArray(props.blocks) ? props.blocks : [props.blocks]
)
</script>

<template>
  <div class="AppUiPresenter">
    <template v-for="(block, index) in blockItems" :key="index">
      <Box v-if="block.type === 'box'" :block="block" />

      <Button v-else-if="block.type === 'button'" :block="block" />
    </template>
  </div>
</template>

<style scoped>
.AppUiPresenter {
  /* Add styles as needed */
}
</style>

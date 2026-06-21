<template>
  <div
    :class="[
      'flex items-center w-full max-w-sm h-20 p-4 rounded-2xl shadow-sm transition-colors duration-300',
      cardClasses
    ]"
    :style="{
      height: `${ITEM_HEIGHT}px`,
      marginBottom: `${ITEM_MARGIN_BOTTOM}px`
    }"
  >
    <div
      class="flex-shrink-0 w-12 h-12 bg-white/70 rounded-lg flex items-center justify-center mr-4"
    >
      <component :is="prize.icon" class="w-7 h-7" />
    </div>
    <div class="flex-grow">
      <div :class="['text-lg font-bold', { 'opacity-90': !isSelected }]">
        {{ prize.percentage }}%
      </div>
      <div :class="['text-sm', isSelected ? 'opacity-90' : 'opacity-60']">
        {{ prize.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Prize } from '../types'

// --- CONSTANTS ---
const ITEM_HEIGHT = 80
const ITEM_MARGIN_BOTTOM = 16

// --- PROPS & COMPUTED ---
const props = defineProps<{
  prize: Prize
  isSelected: boolean
}>()

const cardClasses = computed(() => {
  return props.isSelected ? props.prize.selectedColor : props.prize.color
})
</script>

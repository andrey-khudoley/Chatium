<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon/Icon.vue'

interface IconButtonProps {
  name?: string
  size?: number
  class?: string
  style?: Record<string, string>
}

const props = withDefaults(defineProps<IconButtonProps>(), {
  size: 28
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

function clickHandler(event: MouseEvent) {
  event.stopPropagation()
  event.stopImmediatePropagation()
  emit('click', event)
}

const buttonStyle = computed(() => {
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    borderRadius: `${props.size}px`,
    ...props.style
  }
})

const buttonClass = computed(() => {
  return ['IconButton', props.class].filter(Boolean).join(' ')
})

const iconSize = computed(() => {
  return Math.floor(props.size * 0.5)
})
</script>

<template>
  <div :style="buttonStyle" :class="buttonClass" @click="clickHandler">
    <Icon v-if="name" :name="name" :size="iconSize" />

    <slot v-else></slot>
  </div>
</template>

<style scoped>
.IconButton {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: gray;
  vertical-align: text-top;
  flex-shrink: 0;
}

.IconButton:hover {
  background-color: #00000012;
  color: black;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'

interface SpinnerProps {
  size?: number
  style?: Record<string, string | number>
  class?: string
}

const props = defineProps<SpinnerProps>()

const spinnerClass = computed(() => {
  return ['Spinner', props.class].filter(Boolean).join(' ')
})

const spinnerStyle = computed(() => {
  return {
    width: props.size ? `${props.size}px` : undefined,
    height: props.size ? `${props.size}px` : undefined,
    borderWidth: props.size ? `${props.size * 0.16}px` : undefined,
    ...props.style
  }
})
</script>

<template>
  <span :class="spinnerClass" :style="spinnerStyle"></span>
</template>

<style scoped>
.Spinner {
  width: 0.8em;
  height: 0.8em;
  border: 0.125em solid currentcolor;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: Spinner__rotation 0.8s linear infinite;
}

@keyframes Spinner__rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

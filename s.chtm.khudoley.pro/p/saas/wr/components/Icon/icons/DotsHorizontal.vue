<script setup lang="ts">
interface SvgProps {
  size?: number
  fill?: string
  style?: string
  id?: string
  class?: any
}

defineProps<SvgProps>()
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size?.toString()"
    :height="size?.toString()"
    viewBox="0 0 24 24"
    :fill="fill"
    v-bind="$attrs"
  >
    <path
      d="M6 12c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm9 0c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm9 0c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"
    />
  </svg>
</template>

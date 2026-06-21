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
      d="M12 18c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0-9c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z"
    />
  </svg>
</template>

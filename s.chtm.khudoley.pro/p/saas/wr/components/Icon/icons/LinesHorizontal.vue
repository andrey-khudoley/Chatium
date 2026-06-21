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
    <path d="M24 6h-24v-4h24v4zm0 4h-24v4h24v-4zm0 8h-24v4h24v-4z" />
  </svg>
</template>

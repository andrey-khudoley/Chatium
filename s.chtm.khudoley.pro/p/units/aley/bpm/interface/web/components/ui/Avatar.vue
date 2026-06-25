<template>
  <div
    class="avatar"
    :style="{
      width: (size ?? 32) + 'px',
      height: (size ?? 32) + 'px',
      fontSize: (size ?? 32) * 0.42 + 'px',
      background: bg || 'var(--accent-soft)',
      color: color || 'var(--accent)',
      border: `1px solid ${borderColor || 'var(--accent-line)'}`
    }"
  >
    {{ initial || (name ? name.charAt(0).toUpperCase() : '?') }}
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    name?: string
    initial?: string
    size?: number
    bg?: string
    color?: string
    borderColor?: string
  }>(),
  { size: 32 }
)
</script>

<style scoped>
.avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex: none;
  user-select: none;
}
</style>

<template>
  <div class="deco-label">
    <span class="n">{{ num }}</span>
    <span class="r"></span>
    <span>{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ num: string; text: string }>()
</script>

<script setup lang="ts"></script>

<template>
  <div class="dc-content">
    <slot />
  </div>
</template>

<style scoped>
.dc-content {
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
}
</style>

<template>
  <div class="skeleton-loader">
    <div v-if="type === 'list'">
      <div v-for="i in (count || 5)" :key="i" class="skeleton-row">
        <div class="skeleton skeleton-line" style="width: 50%; height: 1.2rem;"></div>
        <div class="skeleton skeleton-line" style="width: 15%; height: 1rem;"></div>
        <div class="skeleton skeleton-line" style="width: 20%; height: 1rem;"></div>
        <div class="skeleton skeleton-line" style="width: 15%; height: 1rem;"></div>
      </div>
    </div>

    <div v-else-if="type === 'document'">
      <div class="skeleton skeleton-line" style="width: 70%; height: 1.875rem; margin-bottom: 1.5rem;"></div>
      <div class="skeleton skeleton-line" style="width: 100%; height: 1rem; margin-bottom: 0.75rem;"></div>
      <div class="skeleton skeleton-line" style="width: 95%; height: 1rem; margin-bottom: 0.75rem;"></div>
      <div class="skeleton skeleton-line" style="width: 100%; height: 1rem; margin-bottom: 2rem;"></div>

      <div class="skeleton skeleton-line" style="width: 60%; height: 1.5rem; margin-bottom: 1rem;"></div>
      <div class="skeleton skeleton-line" style="width: 100%; height: 1rem; margin-bottom: 0.75rem;"></div>
      <div class="skeleton skeleton-line" style="width: 100%; height: 1rem; margin-bottom: 0.75rem;"></div>
      <div class="skeleton skeleton-line" style="width: 85%; height: 1rem;"></div>
    </div>

    <div v-else-if="type === 'editor'">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div>
          <div class="skeleton skeleton-line" style="width: 60%; height: 1rem; margin-bottom: 1rem;"></div>
          <div class="skeleton" style="width: 100%; height: 600px;"></div>
        </div>
        <div>
          <div class="skeleton skeleton-line" style="width: 60%; height: 1rem; margin-bottom: 1rem;"></div>
          <div class="skeleton" style="width: 100%; height: 600px;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type?: 'list' | 'document' | 'editor'
  count?: number
}>()
</script>

<style scoped>
.skeleton-loader {
  width: 100%;
}

.skeleton-row {
  display: grid;
  grid-template-columns: 50% 15% 20% 15%;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 0.5rem;
}

@media (max-width: 768px) {
  .skeleton-row {
    grid-template-columns: 1fr;
  }
}
</style>

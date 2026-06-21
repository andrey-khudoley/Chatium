<script setup lang="ts">
defineProps<{
  title: string
  description: string
  objective: string
  tags: string[]
  slug: string
}>()
</script>

<template>
  <section class="dc-scenario-hero">
    <p class="dc-scenario-hero__kicker mono">Scenario · {{ slug }}</p>
    <h2 class="dc-scenario-hero__title">{{ title }}</h2>
    <p class="dc-scenario-hero__description">{{ description }}</p>

    <div class="dc-scenario-hero__objective">
      <strong>Objective:</strong>
      <span>{{ objective }}</span>
    </div>

    <div class="dc-scenario-hero__tags">
      <span v-for="tag in tags" :key="tag" class="dc-scenario-hero__tag">{{ tag }}</span>
    </div>
  </section>
</template>

<style scoped>
.dc-scenario-hero {
  min-width: 0;
  padding: 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  box-shadow: var(--shadow-sm);
}

.dc-scenario-hero__kicker {
  margin: 0;
  font-size: 0.66rem;
  letter-spacing: 0;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.dc-scenario-hero__title {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.12rem, 1.6vw, 1.5rem);
  font-weight: 850;
  letter-spacing: 0;
}

.dc-scenario-hero__description {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.45;
}

.dc-scenario-hero__objective {
  margin-top: 10px;
  padding: 9px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--accent-soft) 46%, transparent);
  display: grid;
  gap: 3px;
  font-size: 0.76rem;
}

.dc-scenario-hero__tags {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dc-scenario-hero__tag {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  font-size: 0.68rem;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-3) 82%, transparent);
}

.mono {
  font-family: var(--font-mono);
}
</style>

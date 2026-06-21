<script setup lang="ts">
import type { RoleStackItem } from '../../shared/bpmVueExportedTypes'

defineProps<{
  title: string
  subtitle?: string
  roles: RoleStackItem[]
}>()

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}
</script>

<template>
  <section class="dc-role-stack">
    <header>
      <h3>{{ title }}</h3>
      <p v-if="subtitle">{{ subtitle }}</p>
    </header>

    <div class="dc-role-stack__list">
      <article
        v-for="item in roles"
        :key="item.id"
        class="dc-role-stack__item"
        :class="`state-${item.state}`"
      >
        <div class="dc-role-stack__avatar">{{ initials(item.name) }}</div>
        <div class="dc-role-stack__meta">
          <strong>{{ item.name }}</strong>
          <span>{{ item.role }}</span>
        </div>
        <em>{{ item.state }}</em>
      </article>
    </div>
  </section>
</template>

<style scoped>
.dc-role-stack {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 12px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-2) 84%, transparent);
  display: grid;
  gap: 10px;
}

.dc-role-stack header h3 {
  margin: 0;
  font-size: 0.86rem;
}

.dc-role-stack header p {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.dc-role-stack__list {
  display: grid;
  gap: 7px;
}

.dc-role-stack__item {
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  padding: 7px;
  display: grid;
  grid-template-columns: 34px 1fr auto;
  gap: 8px;
  align-items: center;
  background: color-mix(in srgb, var(--surface-3) 84%, transparent);
}

.dc-role-stack__avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--border-soft);
  display: grid;
  place-items: center;
  font-size: 0.67rem;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-1) 88%, transparent);
}

.dc-role-stack__meta {
  display: grid;
  gap: 1px;
}

.dc-role-stack__meta strong {
  font-size: 0.74rem;
}

.dc-role-stack__meta span {
  font-size: 0.67rem;
  color: var(--text-tertiary);
}

.dc-role-stack__item em {
  font-style: normal;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}

.dc-role-stack__item.state-online {
  border-color: color-mix(in srgb, var(--status-success) 44%, var(--border-soft));
}

.dc-role-stack__item.state-busy {
  border-color: color-mix(in srgb, var(--status-warning) 44%, var(--border-soft));
}

.dc-role-stack__item.state-offline {
  border-color: color-mix(in srgb, var(--status-danger) 44%, var(--border-soft));
}

@media (max-width: 680px) {
  .dc-role-stack__item {
    grid-template-columns: 34px 1fr;
  }

  .dc-role-stack__item em {
    grid-column: 1 / -1;
    padding-left: 42px;
  }
}
</style>

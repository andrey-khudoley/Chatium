<script setup lang="ts">
import type { ClientProfile } from '../../shared/clientSupportDemo'

const props = defineProps<{
  profile: ClientProfile
}>()
</script>

<template>
  <aside class="dc-client-contact-panel">
    <header class="dc-client-contact-panel__header">
      <div class="dc-client-contact-panel__avatar">
        {{ props.profile.name.slice(0, 2).toUpperCase() }}
      </div>
      <div>
        <h3>{{ props.profile.name }}</h3>
        <p>{{ props.profile.externalId }}</p>
      </div>
    </header>

    <div class="dc-client-contact-panel__actions">
      <button type="button" class="primary">Взять клиента</button>
      <button type="button">Передать клиента</button>
    </div>

    <section class="dc-client-contact-panel__card">
      <h4>Контакты</h4>
      <dl>
        <div>
          <dt>Телефон</dt>
          <dd>{{ props.profile.phone }}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{{ props.profile.email }}</dd>
        </div>
      </dl>
    </section>

    <section class="dc-client-contact-panel__card">
      <h4>CRM</h4>
      <dl>
        <div>
          <dt>Ответственный</dt>
          <dd>{{ props.profile.owner }}</dd>
        </div>
        <div>
          <dt>Состояние сделки</dt>
          <dd>{{ props.profile.dealStatus }}</dd>
        </div>
      </dl>

      <div class="dc-client-contact-panel__chips">
        <span v-for="tag in props.profile.tags" :key="tag">{{ tag }}</span>
      </div>

      <div class="dc-client-contact-panel__chips">
        <span v-for="list in props.profile.lists" :key="list">{{ list }}</span>
      </div>
    </section>

    <section class="dc-client-contact-panel__card">
      <h4>Системные переменные</h4>
      <div class="dc-client-contact-panel__vars">
        <article v-for="variable in props.profile.variables" :key="variable.key">
          <span>{{ variable.key }}</span>
          <strong>{{ variable.value }}</strong>
        </article>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.dc-client-contact-panel {
  width: 330px;
  min-width: 300px;
  border-left: 1px solid color-mix(in srgb, var(--border-soft) 70%, transparent);
  padding: 12px;
  display: grid;
  gap: 10px;
  align-content: start;
  max-height: 100%;
  overflow: auto;
  background: color-mix(in srgb, var(--surface-2) 94%, transparent);
}

.dc-client-contact-panel__header {
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 8px;
  align-items: center;
}

.dc-client-contact-panel__avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--border-soft);
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-family: var(--font-mono);
  background: color-mix(in srgb, var(--status-warning) 40%, var(--surface-2));
}

.dc-client-contact-panel__header h3 {
  margin: 0;
  font-size: 0.96rem;
}

.dc-client-contact-panel__header p {
  margin: 3px 0 0;
  font-size: 0.68rem;
  color: var(--text-tertiary);
}

.dc-client-contact-panel__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.dc-client-contact-panel__actions button {
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  background: color-mix(in srgb, var(--surface-3) 88%, transparent);
  color: var(--text-secondary);
  font-size: 0.72rem;
}

.dc-client-contact-panel__actions button.primary {
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--status-success) 72%, #2ac089),
    color-mix(in srgb, var(--status-success) 84%, #169968)
  );
  color: #ffffff;
  border-color: color-mix(in srgb, var(--status-success) 56%, var(--border-soft));
}

.dc-client-contact-panel__card {
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--border-soft) 72%, transparent);
  background: color-mix(in srgb, var(--surface-3) 90%, transparent);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.dc-client-contact-panel__card h4 {
  margin: 0;
  font-size: 0.76rem;
}

.dc-client-contact-panel__card dl {
  margin: 0;
  display: grid;
  gap: 8px;
}

.dc-client-contact-panel__card dl div {
  display: grid;
  gap: 2px;
}

.dc-client-contact-panel__card dt {
  font-size: 0.64rem;
  color: var(--text-tertiary);
}

.dc-client-contact-panel__card dd {
  margin: 0;
  font-size: 0.73rem;
}

.dc-client-contact-panel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dc-client-contact-panel__chips span {
  display: inline-flex;
  align-items: center;
  height: 23px;
  border-radius: 999px;
  border: 1px dashed color-mix(in srgb, var(--border-soft) 74%, transparent);
  padding: 0 8px;
  font-size: 0.64rem;
  color: var(--text-secondary);
}

.dc-client-contact-panel__vars {
  display: grid;
  gap: 7px;
}

.dc-client-contact-panel__vars article {
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--border-soft) 72%, transparent);
  padding: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  background: color-mix(in srgb, var(--surface-2) 90%, transparent);
}

.dc-client-contact-panel__vars span {
  font-size: 0.66rem;
  color: var(--text-tertiary);
}

.dc-client-contact-panel__vars strong {
  font-size: 0.69rem;
}

@media (max-width: 1320px) {
  .dc-client-contact-panel {
    width: 100%;
    min-width: 0;
    border-left: none;
    border-top: 1px solid color-mix(in srgb, var(--border-soft) 70%, transparent);
  }
}
</style>

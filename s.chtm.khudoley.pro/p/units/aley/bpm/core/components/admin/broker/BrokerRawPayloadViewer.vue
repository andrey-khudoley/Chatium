<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  eventId: string
  payload: unknown
  metadata: unknown
  loading?: boolean
  error?: string
}>()

defineEmits<{ (e: 'close'): void }>()

const payloadJson = computed(() => JSON.stringify(props.payload ?? null, null, 2))
const metadataJson = computed(() => JSON.stringify(props.metadata ?? null, null, 2))
</script>

<template>
  <div v-if="open" class="broker-raw" role="dialog" aria-modal="true">
    <div class="broker-raw__backdrop" @click="$emit('close')"></div>
    <section class="broker-raw__panel">
      <div class="broker-raw__hd">
        <div>
          <h3>Raw payload</h3>
          <p>{{ eventId }}</p>
        </div>
        <button type="button" class="ap-btn ap-btn--sm" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div v-if="loading" class="broker-raw__empty">
        <i class="fas fa-circle-notch fa-spin"></i> Загрузка payload
      </div>
      <p v-else-if="error" class="ap-err"><i class="fas fa-exclamation-circle"></i> {{ error }}</p>
      <div v-else class="broker-raw__grid">
        <section>
          <h4>payload</h4>
          <pre class="custom-scrollbar">{{ payloadJson }}</pre>
        </section>
        <section>
          <h4>metadata</h4>
          <pre class="custom-scrollbar">{{ metadataJson }}</pre>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.broker-raw {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.broker-raw__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
}

.broker-raw__panel {
  position: relative;
  z-index: 1;
  width: min(960px, 100%);
  max-height: min(760px, 92vh);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--c-bdr-hi);
  background: var(--c-bg-deep);
  color: var(--c-tx);
  padding: 1rem;
  box-shadow: 0 20px 70px rgba(0, 0, 0, 0.5);
}

.broker-raw__hd {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.broker-raw__hd h3,
.broker-raw__grid h4 {
  margin: 0;
  color: var(--c-tx2);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.broker-raw__hd p {
  margin: 0.25rem 0 0;
  color: var(--c-tx3);
  font-size: 0.72rem;
  word-break: break-word;
}

.broker-raw__grid {
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.broker-raw__grid section {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.broker-raw__grid pre {
  min-height: 14rem;
  max-height: 60vh;
  overflow: auto;
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--c-bdr);
  background: rgba(5, 4, 7, 0.98);
  color: var(--c-tx);
  font-size: 0.72rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.broker-raw__empty {
  color: var(--c-tx2);
  font-size: 0.8rem;
}

@media (max-width: 760px) {
  .broker-raw__grid {
    grid-template-columns: 1fr;
  }
}
</style>

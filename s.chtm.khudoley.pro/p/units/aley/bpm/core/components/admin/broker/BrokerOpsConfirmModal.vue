<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  title: string
  details: string
  confirmLabel: string
  initialReason?: string
  requireReason?: boolean
  pending?: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm', reason: string): void
}>()

const reason = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) reason.value = props.initialReason || ''
  }
)

function confirm() {
  emit('confirm', reason.value.trim())
}
</script>

<template>
  <div v-if="open" class="broker-modal" role="dialog" aria-modal="true">
    <div class="broker-modal__backdrop" @click="$emit('cancel')"></div>
    <section class="broker-modal__panel">
      <div class="broker-modal__hd">
        <h3>{{ title }}</h3>
        <button
          type="button"
          class="ap-btn ap-btn--sm"
          :disabled="pending"
          @click="$emit('cancel')"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      <p class="broker-modal__details">{{ details }}</p>
      <label class="broker-field">
        <span>Reason</span>
        <textarea
          v-model="reason"
          class="ap-input broker-reason"
          rows="3"
          placeholder="Краткая причина операции"
          :disabled="pending"
        ></textarea>
      </label>
      <p v-if="error" class="ap-err"><i class="fas fa-exclamation-circle"></i> {{ error }}</p>
      <div class="broker-modal__ft">
        <button type="button" class="ap-btn" :disabled="pending" @click="$emit('cancel')">
          Отмена
        </button>
        <button
          type="button"
          class="ap-btn ap-btn--danger"
          :disabled="pending || (requireReason && !reason.trim())"
          @click="confirm"
        >
          <i v-if="pending" class="fas fa-circle-notch fa-spin"></i>
          <i v-else class="fas fa-check"></i>
          {{ confirmLabel }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.broker-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.broker-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.64);
}

.broker-modal__panel {
  position: relative;
  z-index: 1;
  width: min(520px, 100%);
  border: 1px solid var(--c-bdr-hi);
  background: var(--c-bg-deep);
  color: var(--c-tx);
  padding: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
}

.broker-modal__hd,
.broker-modal__ft {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.broker-modal__hd h3 {
  margin: 0;
  color: var(--c-tx);
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.broker-modal__details {
  margin: 0.75rem 0;
  color: var(--c-tx2);
  font-size: 0.78rem;
  word-break: break-word;
}

.broker-field {
  display: grid;
  gap: 0.35rem;
  color: var(--c-tx3);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.broker-reason {
  min-height: 5.5rem;
  resize: vertical;
}

.broker-modal__ft {
  justify-content: flex-end;
  margin-top: 0.85rem;
}
</style>

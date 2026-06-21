<template>
  <div class="glass rounded-xl p-4 sm:p-5">
    <div class="flex items-center justify-between mb-4 sm:mb-5">
      <h3 class="font-semibold text-sm wr-text-primary truncate">
        <i class="fas fa-file-alt mr-2 text-primary"></i>{{ form.formTitle }}
      </h3>
      <div
        v-if="hasPaidSteps"
        class="flex items-center gap-1.5 text-xs font-semibold"
        style="color: #4ade80"
      >
        <i class="fas fa-coins text-[10px]"></i>
        {{ form.paymentCompleted }} оплат
      </div>
    </div>

    <!-- Desktop: horizontal funnel -->
    <div class="funnel-row hidden sm:flex">
      <div class="funnel-cell">
        <div class="step-value" :style="{ color: '#06b6d4' }">{{ form.seen }}</div>
        <div class="step-label">Увидели</div>
        <div class="step-bar">
          <div class="step-bar-fill" style="width: 100%; background: #06b6d4"></div>
        </div>
      </div>

      <div class="funnel-arrow-cell">
        <div class="arrow-percent" v-if="rates.seenToSubmit !== null">
          {{ rates.seenToSubmit }}%
        </div>
        <div class="arrow-head">›</div>
      </div>

      <div class="funnel-cell">
        <div class="step-value" :style="{ color: '#4ade80' }">{{ form.submitted }}</div>
        <div class="step-label">Отправлено</div>
        <div class="step-bar">
          <div
            class="step-bar-fill"
            :style="{ width: barPct(form.submitted, form.seen), background: '#4ade80' }"
          ></div>
        </div>
      </div>

      <template v-if="hasPaidSteps">
        <div class="funnel-arrow-cell">
          <div class="arrow-percent" v-if="rates.submitToPayment !== null">
            {{ rates.submitToPayment }}%
          </div>
          <div class="arrow-head">›</div>
        </div>

        <div class="funnel-cell">
          <div class="step-value" :style="{ color: '#facc15' }">{{ form.paymentPageOpened }}</div>
          <div class="step-label">К оплате</div>
          <div class="step-bar">
            <div
              class="step-bar-fill"
              :style="{ width: barPct(form.paymentPageOpened, form.seen), background: '#facc15' }"
            ></div>
          </div>
        </div>

        <div class="funnel-arrow-cell">
          <div class="arrow-percent" v-if="rates.paymentToPaid !== null">
            {{ rates.paymentToPaid }}%
          </div>
          <div class="arrow-head">›</div>
        </div>

        <div class="funnel-cell">
          <div class="step-value" :style="{ color: '#4ade80' }">{{ form.paymentCompleted }}</div>
          <div class="step-label">Оплачено</div>
          <div class="step-bar">
            <div
              class="step-bar-fill"
              :style="{ width: barPct(form.paymentCompleted, form.seen), background: '#22c55e' }"
            ></div>
          </div>
        </div>
      </template>
    </div>

    <!-- Mobile: vertical funnel -->
    <div class="sm:hidden space-y-2">
      <div class="mobile-step">
        <div class="mobile-step-header">
          <span class="mobile-step-dot" style="background: #06b6d4"></span>
          <span class="mobile-step-label">Увидели</span>
          <span class="mobile-step-value" :style="{ color: '#06b6d4' }">{{ form.seen }}</span>
        </div>
        <div class="mobile-step-bar">
          <div class="mobile-step-bar-fill" style="width: 100%; background: #06b6d4"></div>
        </div>
      </div>

      <div v-if="rates.seenToSubmit !== null" class="mobile-arrow">
        <i class="fas fa-arrow-down text-[8px] wr-text-tertiary"></i>
        <span class="text-[10px] wr-text-tertiary font-semibold">{{ rates.seenToSubmit }}%</span>
      </div>

      <div class="mobile-step">
        <div class="mobile-step-header">
          <span class="mobile-step-dot" style="background: #4ade80"></span>
          <span class="mobile-step-label">Отправлено</span>
          <span class="mobile-step-value" :style="{ color: '#4ade80' }">{{ form.submitted }}</span>
        </div>
        <div class="mobile-step-bar">
          <div
            class="mobile-step-bar-fill"
            :style="{ width: barPct(form.submitted, form.seen), background: '#4ade80' }"
          ></div>
        </div>
      </div>

      <template v-if="hasPaidSteps">
        <div v-if="rates.submitToPayment !== null" class="mobile-arrow">
          <i class="fas fa-arrow-down text-[8px] wr-text-tertiary"></i>
          <span class="text-[10px] wr-text-tertiary font-semibold"
            >{{ rates.submitToPayment }}%</span
          >
        </div>

        <div class="mobile-step">
          <div class="mobile-step-header">
            <span class="mobile-step-dot" style="background: #facc15"></span>
            <span class="mobile-step-label">К оплате</span>
            <span class="mobile-step-value" :style="{ color: '#facc15' }">{{
              form.paymentPageOpened
            }}</span>
          </div>
          <div class="mobile-step-bar">
            <div
              class="mobile-step-bar-fill"
              :style="{ width: barPct(form.paymentPageOpened, form.seen), background: '#facc15' }"
            ></div>
          </div>
        </div>

        <div v-if="rates.paymentToPaid !== null" class="mobile-arrow">
          <i class="fas fa-arrow-down text-[8px] wr-text-tertiary"></i>
          <span class="text-[10px] wr-text-tertiary font-semibold">{{ rates.paymentToPaid }}%</span>
        </div>

        <div class="mobile-step">
          <div class="mobile-step-header">
            <span class="mobile-step-dot" style="background: #22c55e"></span>
            <span class="mobile-step-label">Оплачено</span>
            <span class="mobile-step-value" :style="{ color: '#22c55e' }">{{
              form.paymentCompleted
            }}</span>
          </div>
          <div class="mobile-step-bar">
            <div
              class="mobile-step-bar-fill"
              :style="{ width: barPct(form.paymentCompleted, form.seen), background: '#22c55e' }"
            ></div>
          </div>
        </div>
      </template>
    </div>

    <!-- Bottom conversion summary -->
    <div
      class="mt-4 pt-3 border-t flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2"
      style="border-color: var(--wr-border-light)"
    >
      <div class="text-xs">
        <span class="wr-text-tertiary">Конверсия:</span>
        <span class="font-semibold ml-1" :style="{ color: rateColor(form.conversionRate) }"
          >{{ form.conversionRate }}%</span
        >
      </div>
      <div v-if="hasPaidSteps" class="text-xs">
        <span class="wr-text-tertiary">Оплата:</span>
        <span class="font-semibold ml-1" :style="{ color: rateColor(form.paymentRate) }"
          >{{ form.paymentRate }}%</span
        >
      </div>
      <div v-if="hasPaidSteps" class="text-xs">
        <span class="wr-text-tertiary">Сквозная:</span>
        <span class="font-semibold ml-1" :style="{ color: rateColor(throughRate) }"
          >{{ throughRate }}%</span
        >
      </div>
      <div class="text-xs wr-text-tertiary text-[10px]">
        • Автопоказ: {{ form.shown }} • Открыли: {{ form.opened }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  form: { type: Object, required: true }
})

const hasPaidSteps = computed(() => {
  return (props.form.paymentPageOpened || 0) > 0 || (props.form.paymentCompleted || 0) > 0
})

const throughRate = computed(() => {
  const seen = props.form.seen || 0
  const paid = props.form.paymentCompleted || 0
  if (seen === 0) return 0
  return Math.round((paid / seen) * 100)
})

const rates = computed(() => {
  const f = props.form
  return {
    seenToSubmit: rate(f.submitted, f.seen),
    submitToPayment: rate(f.paymentPageOpened, f.submitted),
    paymentToPaid: rate(f.paymentCompleted, f.paymentPageOpened)
  }
})

function rate(to, from) {
  if (!from || from === 0) return null
  return Math.round((to / from) * 100)
}

function barPct(value, total) {
  if (!total || total === 0) return '0%'
  const pct = Math.max((value / total) * 100, value > 0 ? 4 : 0)
  return Math.min(pct, 100) + '%'
}

function rateColor(r) {
  if (r >= 50) return '#4ade80'
  if (r >= 25) return '#facc15'
  if (r >= 10) return '#f59e0b'
  if (r > 0) return '#ef4444'
  return 'var(--wr-text-tertiary)'
}
</script>

<style scoped>
/* Desktop horizontal funnel */
.funnel-row {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding-bottom: 4px;
}

.funnel-cell {
  flex: 1;
  min-width: 64px;
  text-align: center;
  padding: 0 4px;
}

.step-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.step-label {
  font-size: 10px;
  color: var(--wr-text-tertiary);
  margin-top: 2px;
  white-space: nowrap;
}

.step-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--wr-btn-subtle-bg);
  margin-top: 8px;
  overflow: hidden;
}

.step-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.funnel-arrow-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  width: 40px;
  min-width: 40px;
  padding-top: 6px;
  position: relative;
}

.arrow-percent {
  font-size: 9px;
  font-weight: 600;
  color: var(--wr-text-tertiary);
  white-space: nowrap;
  line-height: 1;
}

.arrow-head {
  font-size: 16px;
  font-weight: 300;
  color: var(--wr-text-tertiary);
  line-height: 1;
  opacity: 0.5;
}

/* Mobile vertical funnel */
.mobile-step {
  padding: 0;
}

.mobile-step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.mobile-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mobile-step-label {
  font-size: 12px;
  color: var(--wr-text-secondary);
  flex: 1;
}

.mobile-step-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.mobile-step-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--wr-btn-subtle-bg);
  overflow: hidden;
  margin-left: 16px;
}

.mobile-step-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.mobile-arrow {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 18px;
}
</style>

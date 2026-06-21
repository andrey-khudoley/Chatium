<template>
  <div class="glass rounded-xl p-5">
    <h3 class="font-semibold text-sm mb-6 wr-text-primary">
      <i class="fas fa-filter mr-2 text-primary"></i>Воронка конверсии
    </h3>

    <div v-if="!summary" class="text-xs wr-text-tertiary py-4 text-center">Нет данных</div>

    <div v-else class="space-y-3">
      <!-- Step 1: Увидели форму -->
      <div class="funnel-step">
        <div class="funnel-bar" :style="{ width: '100%', background: getStepColor(0) }">
          <div class="funnel-content">
            <div class="flex items-center justify-between w-full px-4 py-3">
              <div class="flex items-center gap-3">
                <i class="fas fa-users text-base"></i>
                <span class="font-medium">Увидели форму</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-lg font-bold">{{ summary.totalSeen }}</span>
                <span class="text-xs opacity-75">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrow + Conversion 1 -->
      <div class="funnel-arrow">
        <div class="conversion-badge" v-if="conversions.seenToStarted !== null">
          <i class="fas fa-arrow-down text-xs"></i>
          <span class="font-semibold">{{ conversions.seenToStarted }}%</span>
        </div>
      </div>

      <!-- Step 2: Начали заполнять -->
      <div class="funnel-step">
        <div
          class="funnel-bar"
          :style="{
            width: barWidth(summary.totalFieldFocused, summary.totalSeen),
            background: getStepColor(1)
          }"
        >
          <div class="funnel-content">
            <div class="flex items-center justify-between w-full px-4 py-3">
              <div class="flex items-center gap-3">
                <i class="fas fa-edit text-base"></i>
                <span class="font-medium">Начали заполнять</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-lg font-bold">{{ summary.totalFieldFocused }}</span>
                <span class="text-xs opacity-75"
                  >{{ percentage(summary.totalFieldFocused, summary.totalSeen) }}%</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrow + Conversion 2 -->
      <div class="funnel-arrow">
        <div class="conversion-badge" v-if="conversions.startedToSubmitted !== null">
          <i class="fas fa-arrow-down text-xs"></i>
          <span class="font-semibold">{{ conversions.startedToSubmitted }}%</span>
        </div>
      </div>

      <!-- Step 3: Отправлено -->
      <div class="funnel-step">
        <div
          class="funnel-bar"
          :style="{
            width: barWidth(summary.totalSubmitted, summary.totalSeen),
            background: getStepColor(2)
          }"
        >
          <div class="funnel-content">
            <div class="flex items-center justify-between w-full px-4 py-3">
              <div class="flex items-center gap-3">
                <i class="fas fa-paper-plane text-base"></i>
                <span class="font-medium">Отправлено</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-lg font-bold">{{ summary.totalSubmitted }}</span>
                <span class="text-xs opacity-75"
                  >{{ percentage(summary.totalSubmitted, summary.totalSeen) }}%</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrow + Conversion 3 (только если есть переходы на оплату) -->
      <template v-if="summary.totalPaymentPageOpened > 0">
        <div class="funnel-arrow">
          <div class="conversion-badge" v-if="conversions.submittedToPayment !== null">
            <i class="fas fa-arrow-down text-xs"></i>
            <span class="font-semibold">{{ conversions.submittedToPayment }}%</span>
          </div>
        </div>

        <!-- Step 4: К оплате -->
        <div class="funnel-step">
          <div
            class="funnel-bar"
            :style="{
              width: barWidth(summary.totalPaymentPageOpened, summary.totalSeen),
              background: getStepColor(3)
            }"
          >
            <div class="funnel-content">
              <div class="flex items-center justify-between w-full px-4 py-3">
                <div class="flex items-center gap-3">
                  <i class="fas fa-credit-card text-base"></i>
                  <span class="font-medium">Перешли к оплате</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-lg font-bold">{{ summary.totalPaymentPageOpened }}</span>
                  <span class="text-xs opacity-75"
                    >{{ percentage(summary.totalPaymentPageOpened, summary.totalSeen) }}%</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Arrow + Conversion 4 -->
        <div class="funnel-arrow">
          <div class="conversion-badge" v-if="conversions.paymentToCompleted !== null">
            <i class="fas fa-arrow-down text-xs"></i>
            <span class="font-semibold">{{ conversions.paymentToCompleted }}%</span>
          </div>
        </div>

        <!-- Step 5: Оплачено -->
        <div class="funnel-step">
          <div
            class="funnel-bar"
            :style="{
              width: barWidth(summary.totalPaymentCompleted, summary.totalSeen),
              background: getStepColor(4)
            }"
          >
            <div class="funnel-content">
              <div class="flex items-center justify-between w-full px-4 py-3">
                <div class="flex items-center gap-3">
                  <i class="fas fa-check-circle text-base"></i>
                  <span class="font-medium">Оплачено</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-lg font-bold">{{ summary.totalPaymentCompleted }}</span>
                  <span class="text-xs opacity-75"
                    >{{ percentage(summary.totalPaymentCompleted, summary.totalSeen) }}%</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Summary stats -->
      <div class="mt-6 pt-4 border-t" style="border-color: var(--wr-border-light)">
        <div class="grid grid-cols-2 gap-4 text-center">
          <div>
            <div class="text-xs wr-text-tertiary mb-1">Общая конверсия</div>
            <div class="text-xl font-bold text-primary">
              {{ percentage(summary.totalSubmitted, summary.totalSeen) }}%
            </div>
            <div class="text-[10px] wr-text-tertiary mt-0.5">увидели → отправлено</div>
          </div>
          <div v-if="summary.totalPaymentCompleted > 0">
            <div class="text-xs wr-text-tertiary mb-1">Конверсия в оплату</div>
            <div class="text-xl font-bold" style="color: #4ade80">
              {{ percentage(summary.totalPaymentCompleted, summary.totalSeen) }}%
            </div>
            <div class="text-[10px] wr-text-tertiary mt-0.5">увидели → оплачено</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: {
    type: Object,
    default: null
  }
})

const COLORS = [
  '#06b6d4', // seen - cyan
  '#a78bfa', // started - purple
  '#4ade80', // submitted - green
  '#facc15', // payment - yellow
  '#f8005b' // completed - pink
]

function getStepColor(index) {
  return COLORS[index] || '#9ca3af'
}

function percentage(value, total) {
  if (!total || total === 0) return 0
  return Math.round((value / total) * 100)
}

function barWidth(value, total) {
  const minWidth = 30 // минимальная ширина в процентах для читаемости
  if (!total || total === 0) return `${minWidth}%`
  const percent = Math.max((value / total) * 100, value > 0 ? minWidth : 0)
  return `${Math.min(percent, 100)}%`
}

function conversionRate(from, to) {
  if (!from || from === 0) return null
  return Math.round((to / from) * 100)
}

const conversions = computed(() => {
  if (!props.summary) {
    return {
      seenToStarted: null,
      startedToSubmitted: null,
      submittedToPayment: null,
      paymentToCompleted: null
    }
  }

  return {
    seenToStarted: conversionRate(props.summary.totalSeen, props.summary.totalFieldFocused),
    startedToSubmitted: conversionRate(
      props.summary.totalFieldFocused,
      props.summary.totalSubmitted
    ),
    submittedToPayment: conversionRate(
      props.summary.totalSubmitted,
      props.summary.totalPaymentPageOpened
    ),
    paymentToCompleted: conversionRate(
      props.summary.totalPaymentPageOpened,
      props.summary.totalPaymentCompleted
    )
  }
})
</script>

<style scoped>
.funnel-step {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: flex-start;
}

.funnel-bar {
  min-width: 200px;
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.funnel-bar:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.funnel-content {
  width: 100%;
  color: white;
}

.funnel-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
  position: relative;
}

.conversion-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-primary);
  font-size: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.conversion-badge i {
  opacity: 0.6;
}
</style>

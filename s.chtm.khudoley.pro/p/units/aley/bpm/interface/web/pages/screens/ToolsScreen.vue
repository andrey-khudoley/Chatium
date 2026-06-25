<template>
  <div data-role="screenpad" class="screen anim-fadein">
    <DecoLabel num="06" text="инструменты" style="margin-bottom: 18px" />

    <div data-role="homegrid" class="tools-grid">
      <!-- Помодоро -->
      <div class="pomo-card card">
        <span class="pomo-label">Помодоро · фокус</span>
        <div class="pomo-time">{{ pomoDisplay }}</div>
        <div class="pomo-progress-wrap">
          <ProgressBar :value="pomoPct" />
        </div>
        <div class="pomo-btns">
          <PrimaryButton @click="togglePomo">{{
            store.pomoRunning ? 'Пауза' : 'Старт'
          }}</PrimaryButton>
          <button class="reset-btn" @click="resetPomo">Сброс</button>
        </div>
      </div>

      <!-- Привычки -->
      <div class="gcard card">
        <span class="gut">01</span>
        <div class="habits-header">
          <span class="section-title">Привычки сегодня</span>
          <span class="habits-done">{{ habitsDone }} / {{ store.habits.length }}</span>
        </div>
        <div class="habits-list">
          <div v-for="h in store.habits" :key="h.id" class="habit-row" @click="toggleHabit(h)">
            <Checkbox :model-value="h.done" @update:model-value="h.done = $event" />
            <span :class="['habit-name', { done: h.done }]">{{ h.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Модули инструментов -->
    <div class="tools-section-title">Модули</div>
    <div data-role="metrics" class="modules-grid">
      <div
        v-for="tool in tools"
        :key="tool.id"
        class="module-card liftcard"
        @click="go('stub', tool.name)"
      >
        <div class="module-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="none"
            stroke="var(--accent)"
            stroke-width="1.4"
          >
            <circle cx="8" cy="8" r="5.5" />
            <circle cx="8" cy="8" r="2.3" />
          </svg>
        </div>
        <div>
          <div class="module-name">{{ tool.name }}</div>
          <div class="module-desc">{{ tool.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { store, go } from '../../shared/store'
import { seedTools, POMO_DURATION } from '../../shared/mocks/tools.mock'
import ProgressBar from '../../components/ui/ProgressBar.vue'
import PrimaryButton from '../../components/ui/PrimaryButton.vue'
import Checkbox from '../../components/ui/Checkbox.vue'
import DecoLabel from '../../components/ui/DecoLabel.vue'
import type { Habit } from '../../shared/types/task'

const tools = seedTools

const pomoDisplay = computed(() => {
  const rem = POMO_DURATION - store.pomoSec
  const m = Math.floor(rem / 60)
    .toString()
    .padStart(2, '0')
  const s = (rem % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})
const pomoPct = computed(() => (store.pomoSec / POMO_DURATION) * 100)
const habitsDone = computed(() => store.habits.filter((h) => h.done).length)

let interval: ReturnType<typeof setInterval> | null = null

function togglePomo() {
  store.pomoRunning = !store.pomoRunning
  if (store.pomoRunning) {
    interval = setInterval(() => {
      if (store.pomoSec >= POMO_DURATION) {
        store.pomoRunning = false
        store.pomoSec = 0
        if (interval) clearInterval(interval)
        return
      }
      store.pomoSec++
    }, 1000)
  } else {
    if (interval) clearInterval(interval)
  }
}

function resetPomo() {
  store.pomoRunning = false
  store.pomoSec = 0
  if (interval) clearInterval(interval)
}

function toggleHabit(h: Habit) {
  h.done = !h.done
}

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<style scoped>
.screen {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.tools-grid {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 16px;
  align-items: stretch;
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 24px;
}
.pomo-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.pomo-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg2);
}
.pomo-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 58px;
  font-weight: 600;
  line-height: 1;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
}
.pomo-progress-wrap {
  width: 100%;
  max-width: 240px;
}
.pomo-btns {
  display: flex;
  gap: 10px;
}
.reset-btn {
  background: var(--surface-2);
  color: var(--fg);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 9px 18px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.12s;
}
.reset-btn:hover {
  border-color: var(--line-2);
}
.gcard {
  position: relative;
  overflow: hidden;
  padding-left: calc(40px + var(--pad)) !important;
}
.gut {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  border-right: 1px solid var(--line);
  background: var(--surface-2);
  background-image: repeating-linear-gradient(0deg, transparent 0 13px, var(--line) 13px 14px);
  display: flex;
  justify-content: center;
  padding-top: 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
}
.habits-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 13px;
}
.section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg);
}
.habits-done {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--ok);
}
.habits-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.habit-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.1s;
}
.habit-row:hover {
  background: var(--surface-2);
}
.habit-name {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  color: var(--fg);
}
.habit-name.done {
  text-decoration: line-through;
  color: var(--fg3);
}
.tools-section-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--fg);
}
.modules-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.module-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 17px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.module-icon {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.module-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--fg);
}
.module-desc {
  font-size: 11.5px;
  color: var(--fg2);
  line-height: 1.45;
  margin-top: 4px;
}
</style>

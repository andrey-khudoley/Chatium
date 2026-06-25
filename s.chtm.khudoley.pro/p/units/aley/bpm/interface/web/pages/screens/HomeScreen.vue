<template>
  <div data-role="screenpad" class="screen anim-fadein">
    <!-- Hero -->
    <div class="hero-card">
      <div
        style="
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(var(--line) 1px, transparent 1px),
            linear-gradient(90deg, var(--line) 1px, transparent 1px);
          background-size: 30px 30px;
          -webkit-mask-image: radial-gradient(120% 150% at 100% 0%, #000, transparent 60%);
          mask-image: radial-gradient(120% 150% at 100% 0%, #000, transparent 60%);
          opacity: 0.7;
        "
      ></div>
      <div data-role="herorow" class="hero-row">
        <div class="hero-left">
          <DecoLabel num="00" text="обзор системы" style="margin-bottom: 14px" />
          <div class="hero-greeting">
            Доброе утро, Андрей<span style="color: var(--accent)">.</span>
          </div>
          <div class="hero-sub">Понедельник, 22 июня · фокус дня — согласовать договор к 10:00</div>
        </div>
        <div data-role="herohud" class="hero-hud">
          <div class="hud-time">
            <span class="hud-tz">Москва · Пн</span>
            <span class="hud-clock">09:24</span>
          </div>
          <div class="hud-status">
            <span class="status-row"
              ><span class="ok-dot"></span><span style="color: var(--fg)">в норме</span></span
            >
            <span class="status-sub">8 синхр · 0 ошибок</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Метрики -->
    <div data-role="metrics" class="metrics-grid">
      <StatCard
        v-for="m in metrics"
        :key="m.l"
        :label="m.l"
        :value="m.v"
        :dot="m.dot"
        :trend="m.trend"
        :trend-color="m.trendColor"
        @click="m.screen && go(m.screen)"
      />
    </div>

    <!-- Основная сетка -->
    <div data-role="homegrid" class="home-grid">
      <!-- Левая колонка -->
      <div class="left-col">
        <!-- Задачи на сегодня -->
        <div class="card gcard">
          <span class="gut">01</span>
          <div class="card-header">
            <span class="card-title">Задачи на сегодня</span>
            <span class="mono-sm">{{ todayDone }}/{{ store.todayTasks.length }}</span>
            <div style="flex: 1"></div>
            <span class="link-sm" @click="go('tasks')">Все задачи →</span>
          </div>
          <div v-for="t in store.todayTasks" :key="t.id" class="task-row">
            <Checkbox v-model="t.done" />
            <span class="pr-dot" :style="{ background: prColor(t.pr) }"></span>
            <span :class="['task-title', { done: t.done }]" @click="openDetail('task', t.id)">{{
              t.title
            }}</span>
            <span class="task-proj">{{ t.proj }}</span>
            <span class="task-time">{{ t.time }}</span>
          </div>
        </div>

        <!-- Активность за неделю -->
        <div class="card gcard">
          <span class="gut">02</span>
          <div class="card-header">
            <span class="card-title">Активность за неделю</span>
            <div style="flex: 1"></div>
            <span class="ok-text">23 закрыто</span>
          </div>
          <BarChart :bars="weekBarData" :height="84" />
        </div>
      </div>

      <!-- Правая колонка -->
      <div class="right-col">
        <!-- Быстрые действия -->
        <div class="card">
          <span class="card-title">Быстрые действия</span>
          <div class="qa-grid">
            <button class="qa-btn" @click="go('journal')">
              <span class="qa-icon">＋</span>Захватить
            </button>
            <button class="qa-btn" @click="go('tasks')">
              <span class="qa-icon">＋</span>Задача
            </button>
            <button class="qa-btn" @click="go('finances')">
              <span class="qa-icon">＋</span>Транзакция
            </button>
            <button class="qa-btn" @click="go('library')">
              <span class="qa-icon">＋</span>Материал
            </button>
          </div>
        </div>

        <!-- Диалоги -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Диалоги</span>
            <span class="link-sm" @click="go('dialogs')">Все →</span>
          </div>
          <div
            v-for="t in store.threads.slice(0, 3)"
            :key="t.id"
            class="thread-row"
            @click="go('dialogs')"
          >
            <div class="thread-avatar">{{ t.name[0] }}</div>
            <div class="thread-info">
              <span class="thread-name">{{ t.name }}</span>
              <span class="thread-last">{{ t.last }}</span>
            </div>
            <div class="thread-meta">
              <span class="thread-time">{{ t.time }}</span>
              <span v-if="t.unread" class="unread-badge">{{ t.unread }}</span>
            </div>
          </div>
        </div>

        <!-- Журнал мини -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Журнал</span>
            <span class="mono-sm">7 входящих</span>
            <span class="link-sm" @click="go('journal')">Открыть →</span>
          </div>
          <div v-for="j in journal.slice(0, 3)" :key="j.id" class="journal-row">
            <SourceChip :src="j.src" />
            <span class="journal-txt">{{ j.txt }}</span>
            <span class="journal-time">{{ j.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, go, openDetail } from '../../shared/store'
import { prColor } from '../../shared/format'
import { seedMetrics, seedWeekBars } from '../../shared/mocks/metrics.mock'
import { seedJournal } from '../../shared/mocks/journal.mock'
import StatCard from '../../components/ui/StatCard.vue'
import Checkbox from '../../components/ui/Checkbox.vue'
import BarChart from '../../components/ui/BarChart.vue'
import SourceChip from '../../components/ui/SourceChip.vue'
import DecoLabel from '../../components/ui/DecoLabel.vue'

const metrics = seedMetrics
const journal = seedJournal

const weekBarData = computed(() => seedWeekBars.map((b) => ({ label: b.d, value: b.v })))
const todayDone = computed(() => store.todayTasks.filter((t) => t.done).length)
</script>

<style scoped>
.screen {
  padding: 24px;
  max-width: 1180px;
  margin: 0 auto;
}
.hero-card {
  position: relative;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 22px 24px;
  margin-bottom: 22px;
}
.hero-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.hero-left {
  min-width: 0;
}
.hero-greeting {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 27px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg);
  line-height: 1.1;
}
.hero-sub {
  font-size: 13px;
  color: var(--fg2);
  margin-top: 8px;
}
.hero-hud {
  flex: none;
  display: flex;
  align-items: stretch;
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
  background: var(--bg);
}
.hud-time {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 17px;
}
.hud-tz {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg3);
}
.hud-clock {
  font-family: 'JetBrains Mono', monospace;
  font-size: 26px;
  font-weight: 600;
  line-height: 1;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
}
.hud-status {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 13px 17px;
  border-left: 1px solid var(--line);
}
.status-row {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg2);
}
.ok-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ok);
  flex: none;
  animation: softpulse 2.4s infinite;
}
.status-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--fg3);
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 22px;
}
.home-grid {
  display: grid;
  grid-template-columns: 1.62fr 1fr;
  gap: 16px;
  align-items: start;
}
.left-col,
.right-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.card {
  position: relative;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: var(--pad);
}
.gcard {
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
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg);
}
.mono-sm {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg3);
}
.link-sm {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}
.link-sm:hover {
  filter: brightness(1.15);
}
.ok-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--ok);
}
.task-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 0;
  border-top: 1px solid var(--line);
}
.pr-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
.task-title {
  font-size: 13.5px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  color: var(--fg);
}
.task-title.done {
  text-decoration: line-through;
  color: var(--fg3);
}
.task-proj {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--fg2);
  background: var(--surface-2);
  border-radius: 3px;
  padding: 3px 8px;
  white-space: nowrap;
  flex: none;
}
.task-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg3);
  width: 46px;
  text-align: right;
  flex: none;
}
.qa-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 13px;
}
.qa-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--fg);
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.12s,
    background 0.12s;
}
.qa-btn:hover {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}
.qa-icon {
  color: var(--accent);
  font-size: 15px;
  line-height: 1;
  flex: none;
}
.thread-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 0;
  border-top: 1px solid var(--line);
  cursor: pointer;
}
.thread-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  flex: none;
}
.thread-info {
  flex: 1;
  min-width: 0;
}
.thread-name {
  font-size: 12.5px;
  color: var(--fg);
  font-weight: 600;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.thread-last {
  font-size: 11.5px;
  color: var(--fg2);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 3px;
}
.thread-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex: none;
}
.thread-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--fg3);
}
.unread-badge {
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--accent);
  color: var(--accent-fg);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.journal-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid var(--line);
}
.journal-txt {
  font-size: 12.5px;
  color: var(--fg);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.journal-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--fg3);
  flex: none;
}
</style>

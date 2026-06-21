<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  phase: 'work' | 'rest' | 'long_rest'
  remainingSec: number
  overtimeSec: number
  phaseDurationSec: number
  status: 'stopped' | 'running' | 'paused' | 'awaiting_continue'
  phaseLabel: string
  statusLabel: string
  timeLabel: string
}>()

const radius = 90
const circumference = 2 * Math.PI * radius

const progress = computed(() => {
  if (props.status === 'awaiting_continue' || props.overtimeSec > 0) return 1
  const total = Math.max(1, props.phaseDurationSec)
  const remain = Math.max(0, Math.min(total, props.remainingSec))
  return 1 - remain / total
})

const dashOffset = computed(() => circumference * (1 - progress.value))

const phaseClass = computed(() => {
  if (props.phase === 'work') return 'phase-work'
  if (props.phase === 'rest') return 'phase-rest'
  return 'phase-long-rest'
})
</script>

<template>
  <section class="dial-card" :class="[phaseClass, `status-${props.status}`]">
    <div class="dial-scanlines"></div>
    <div class="dial-shell">
      <svg class="dial-svg" viewBox="0 0 220 220" role="img" :aria-label="`${props.phaseLabel}: ${props.timeLabel}`">
        <defs>
          <linearGradient id="gradient-work" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#d3234b" />
            <stop offset="100%" stop-color="#ff4567" />
          </linearGradient>
          <linearGradient id="gradient-rest" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2f8f8f" />
            <stop offset="100%" stop-color="#3db8b8" />
          </linearGradient>
          <linearGradient id="gradient-long-rest" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8566ff" />
            <stop offset="100%" stop-color="#a78bff" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Tick marks -->
        <g class="dial-ticks">
          <line
            v-for="i in 60"
            :key="i"
            :x1="110 + 82 * Math.cos((i * 6 - 90) * Math.PI / 180)"
            :y1="110 + 82 * Math.sin((i * 6 - 90) * Math.PI / 180)"
            :x2="110 + (i % 5 === 0 ? 75 : 79) * Math.cos((i * 6 - 90) * Math.PI / 180)"
            :y2="110 + (i % 5 === 0 ? 75 : 79) * Math.sin((i * 6 - 90) * Math.PI / 180)"
            :stroke-width="i % 5 === 0 ? 1.5 : 0.5"
            stroke="rgba(255,255,255,0.12)"
          />
        </g>

        <circle class="dial-track" cx="110" cy="110" :r="radius" />
        <circle
          class="dial-progress"
          cx="110"
          cy="110"
          :r="radius"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
      <div class="dial-center">
        <p class="dial-time">{{ props.timeLabel }}</p>
        <p class="dial-status">{{ props.statusLabel }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dial-card {
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  padding: 1.25rem 1rem;
  transition: all .4s ease;
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 6px, 6px 6px, 6px 0,
    calc(100% - 6px) 0, calc(100% - 6px) 6px, 100% 6px,
    100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%,
    6px 100%, 6px calc(100% - 6px), 0 calc(100% - 6px)
  );
}

.dial-scanlines {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.06) 0px,
    rgba(0, 0, 0, 0.06) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 1;
  animation: dial-scanline-flicker 6s linear infinite;
}

@keyframes dial-scanline-flicker {
  0%, 100% { opacity: .42; }
  50% { opacity: .36; }
}

.dial-shell {
  position: relative;
  width: min(280px, 80vw);
  margin: 0 auto;
  z-index: 2;
}

.dial-svg {
  width: 100%;
  height: auto;
  display: block;
  transform: rotate(-90deg);
}

.dial-ticks line {
  transition: stroke .4s ease;
}

.dial-track {
  fill: none;
  stroke: rgba(255, 255, 255, .06);
  stroke-width: 12;
}

.dial-progress {
  fill: none;
  stroke-width: 12;
  stroke-linecap: round;
  transition: stroke-dashoffset .55s linear, stroke .4s ease, filter .4s ease;
  filter: url(#glow);
}

.phase-work .dial-progress {
  stroke: url(#gradient-work);
}
.phase-rest .dial-progress {
  stroke: url(#gradient-rest);
}
.phase-long-rest .dial-progress {
  stroke: url(#gradient-long-rest);
}

.status-running .dial-progress {
  filter: url(#glow);
  animation: none;
}

.status-paused .dial-progress {
  opacity: .6;
  animation: paused-blink 2.6s ease-in-out infinite;
}

@keyframes paused-blink {
  0%, 100% { opacity: .62; }
  50% { opacity: .5; }
}

.status-stopped .dial-progress {
  opacity: .3;
  animation: none;
}

.status-awaiting_continue .dial-progress {
  opacity: 1;
  animation: overtime-pulse 1.8s ease-in-out infinite;
}

@keyframes overtime-pulse {
  0%, 100% { opacity: 1; filter: url(#glow); }
  50% { opacity: 0.88; filter: url(#glow-strong); }
}

.dial-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  z-index: 3;
}

.dial-time {
  margin: 0;
  line-height: 1;
  font-size: clamp(2.2rem, 8vw, 3rem);
  letter-spacing: .1em;
  color: var(--color-text);
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
  text-shadow:
    0 0 12px rgba(232, 232, 232, .3),
    0.5px 0 0 rgba(255, 0, 255, 0.06),
    -0.5px 0 0 rgba(0, 255, 255, 0.06);
}

.status-running .dial-time {
  text-shadow:
    0 0 16px rgba(232, 232, 232, .4),
    0.5px 0 0 rgba(255, 0, 255, 0.08),
    -0.5px 0 0 rgba(0, 255, 255, 0.08);
}

.dial-status {
  margin: .35rem 0 0;
  color: var(--color-text-secondary);
  font-size: .72rem;
  text-transform: uppercase;
  letter-spacing: .12em;
}

.status-paused .dial-time {
  animation: time-paused-blink 2.6s ease-in-out infinite;
}

@keyframes time-paused-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: .88; }
}
</style>

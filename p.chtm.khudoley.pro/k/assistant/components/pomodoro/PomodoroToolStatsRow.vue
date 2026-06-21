<script setup lang="ts">
defineProps<{
  firstText: string
  secondText: string
  thirdText: string
  firstLabel: string
  secondLabel: string
  thirdLabel: string
  firstIcon: string
  secondIcon: string
  thirdIcon: string
}>()
</script>

<template>
  <div class="tool-stats-row">
    <div class="stat-cell">
      <span class="stat-cell__value">{{ firstText }}</span>
      <span class="stat-cell__label">
        <i :class="firstIcon" /> {{ firstLabel }}
      </span>
    </div>
    <div class="stat-cell">
      <span class="stat-cell__value">{{ secondText }}</span>
      <span class="stat-cell__label">
        <i :class="secondIcon" /> {{ secondLabel }}
      </span>
    </div>
    <div class="stat-cell">
      <span class="stat-cell__value">{{ thirdText }}</span>
      <span class="stat-cell__label">
        <i :class="thirdIcon" /> {{ thirdLabel }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.tool-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.stat-cell {
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.02);
  padding: 0.6rem 0.5rem;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 3px,
    3px 3px,
    3px 0,
    calc(100% - 3px) 0,
    calc(100% - 3px) 3px,
    100% 3px,
    100% calc(100% - 3px),
    calc(100% - 3px) calc(100% - 3px),
    calc(100% - 3px) 100%,
    3px 100%,
    3px calc(100% - 3px),
    0 calc(100% - 3px)
  );
}

.stat-cell::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.04) 0px,
    rgba(0, 0, 0, 0.04) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
}

.stat-cell:hover {
  border-color: var(--color-border-light);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 0 8px var(--pomodoro-phase-glow, var(--color-accent-light));
}

.stat-cell__value {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  color: var(--color-text);
  line-height: 1;
  margin-bottom: 0.35rem;
  text-shadow: 0 0 8px rgba(232, 232, 232, 0.2);
}

.stat-cell__label {
  display: block;
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1;
}

.stat-cell__label i {
  font-size: 0.6rem;
  color: var(--pomodoro-phase-color, var(--color-accent));
  opacity: 0.7;
}

@media (max-width: 400px) {
  .tool-stats-row {
    grid-template-columns: 1fr;
  }
}
</style>

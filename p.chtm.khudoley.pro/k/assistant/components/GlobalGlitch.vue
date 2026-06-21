<template>
  <div class="global-glitch-style-anchor" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { createComponentLogger } from '../shared/logger'

const log = createComponentLogger('GlobalGlitch')

onMounted(() => {
  log.info('Component mounted')
})
</script>

<style>
.global-glitch-style-anchor {
  display: none;
}

/* Глобальный эффект глитча для всей страницы */
.global-glitch-active {
  animation: global-page-glitch 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both !important;
}

@keyframes global-page-glitch {
  0%, 100% {
    transform: translate(0) skew(0deg);
    filter: none;
  }
  10% {
    transform: translate(-3px, 0) skew(-0.5deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.7))
            drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.7))
            hue-rotate(90deg);
  }
  20% {
    transform: translate(3px, 0) skew(0.5deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7))
            drop-shadow(2px 0 0 rgba(0, 255, 255, 0.7))
            hue-rotate(-90deg);
  }
  30% {
    transform: translate(-2px, 0) skew(-0.3deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.8))
            drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.8))
            brightness(1.2);
  }
  40% {
    transform: translate(2px, 0) skew(0.3deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.8))
            drop-shadow(2px 0 0 rgba(0, 255, 255, 0.8))
            contrast(1.3);
  }
  50% {
    transform: translate(-3px, 0) skew(-0.5deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.7))
            drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.7))
            saturate(2);
  }
  60% {
    transform: translate(3px, 0) skew(0.5deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7))
            drop-shadow(2px 0 0 rgba(0, 255, 255, 0.7))
            invert(0.1);
  }
  70% {
    transform: translate(-2px, 0) skew(-0.2deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.6))
            drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.6))
            brightness(1.1);
  }
  80% {
    transform: translate(2px, 0) skew(0.2deg);
    filter: drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.6))
            drop-shadow(1px 0 0 rgba(0, 255, 255, 0.6))
            contrast(1.2);
  }
  90% {
    transform: translate(-1px, 0) skew(0deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.5))
            drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.5))
            brightness(1.05);
  }
}

.global-glitch-active * {
  pointer-events: none !important;
}
</style>

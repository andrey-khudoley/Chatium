<template>
  <transition name="fade">
    <button
      v-if="isVisible"
      class="scroll-to-top"
      @click="scrollToTop"
      title="Прокрутить наверх"
      aria-label="Прокрутить наверх"
    >
      <i class="fas fa-arrow-up"></i>
    </button>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const isVisible = ref(false)
const scrollThreshold = 300

function handleScroll() {
  isVisible.value = window.scrollY > scrollThreshold
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.scroll-to-top {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  box-shadow: 0 4px 12px 0 rgba(37, 99, 235, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 999;
  backdrop-filter: blur(8px);
}

.scroll-to-top:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px 0 rgba(37, 99, 235, 0.5);
  background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%);
}

.scroll-to-top:active {
  transform: translateY(-2px);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

@media (max-width: 768px) {
  .scroll-to-top {
    bottom: 1.5rem;
    right: 1.5rem;
    width: 2.75rem;
    height: 2.75rem;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .scroll-to-top {
    bottom: 1rem;
    right: 1rem;
    width: 2.5rem;
    height: 2.5rem;
    font-size: 0.875rem;
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .scroll-to-top {
    bottom: 1.5rem;
    right: 1.5rem;
  }
}

@media print {
  .scroll-to-top {
    display: none !important;
  }
}
</style>

<template>
  <Teleport to="body">
    <div v-if="store.navOpen" class="mobile-drawer-backdrop" @click="store.navOpen = false"></div>
    <div class="mobile-drawer" :class="{ open: store.navOpen }">
      <Sidebar />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { store } from '../../shared/store'
import Sidebar from './Sidebar.vue'
</script>

<style scoped>
.mobile-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 55;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(1px);
  animation: fadeUp 0.18s ease;
}
.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 60;
  width: 266px;
  transform: translateX(-100%);
  transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: none;
}
.mobile-drawer.open {
  transform: translateX(0);
  box-shadow: 24px 0 64px rgba(0, 0, 0, 0.55);
}
</style>

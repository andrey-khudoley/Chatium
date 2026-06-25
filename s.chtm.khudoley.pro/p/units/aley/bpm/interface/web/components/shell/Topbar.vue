<template>
  <div data-role="topbar" class="topbar">
    <!-- Кнопка меню (мобиле) -->
    <button data-role="menubtn" class="menu-btn" @click="store.navOpen = !store.navOpen">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <line x1="2.5" y1="4.5" x2="13.5" y2="4.5" />
        <line x1="2.5" y1="8" x2="13.5" y2="8" />
        <line x1="2.5" y1="11.5" x2="13.5" y2="11.5" />
      </svg>
    </button>

    <span class="screen-code">{{ screenCode }}</span>
    <div class="screen-title">{{ screenTitle }}</div>
    <div class="spacer"></div>

    <!-- Поиск (скрывается на мобиле) -->
    <div data-role="topsearch" class="search-box">
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        stroke="var(--fg3)"
        stroke-width="1.5"
        style="flex: none"
      >
        <circle cx="7" cy="7" r="4.2" />
        <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
      </svg>
      <input placeholder="Поиск по системе…" class="search-input" />
    </div>

    <!-- Кнопка захвата -->
    <button class="capture-btn" @click="go('journal')">
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <line x1="7" y1="2.5" x2="7" y2="11.5" />
        <line x1="2.5" y1="7" x2="11.5" y2="7" />
      </svg>
      Захват
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, go } from '../../shared/store'
import { SCREEN_CODES, SCREEN_TITLES } from '../../config/project'

const screenCode = computed(() => SCREEN_CODES[store.screen] || '--')
const screenTitle = computed(() => SCREEN_TITLES[store.screen] || store.stubName || '')
</script>

<style scoped>
.topbar {
  height: 58px;
  flex: none;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 22px;
  background: var(--bg);
}
.menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-left: -4px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--fg);
  cursor: pointer;
  flex: none;
}
.menu-btn:hover {
  border-color: var(--line-2);
}
.screen-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--accent);
  flex: none;
}
.screen-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spacer {
  flex: 1;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 260px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 8px 12px;
}
.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--fg);
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  outline: none;
  min-width: 0;
}
.capture-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--accent);
  color: var(--accent-fg);
  border: none;
  border-radius: 4px;
  padding: 9px 14px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  flex: none;
  transition: filter 0.12s;
}
.capture-btn:hover {
  filter: brightness(1.08);
}
</style>

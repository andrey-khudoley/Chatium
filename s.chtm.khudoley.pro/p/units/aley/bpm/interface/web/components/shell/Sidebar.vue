<template>
  <div data-role="sidebar" class="sidebar" :data-open="store.navOpen ? 'true' : 'false'">
    <!-- Бренд -->
    <div class="sidebar-brand">
      <div class="brand-icon">F</div>
      <div class="brand-text">
        <span class="brand-name">FLOW</span>
        <span class="brand-sub">Личная BPM-система</span>
      </div>
    </div>

    <!-- Навигация -->
    <nav class="sidebar-nav">
      <div class="nav-item" :class="{ active: store.screen === 'home' }" @click="go('home')">
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <path d="M2.5 7 8 2.5 13.5 7" />
          <path d="M3.8 7v6.2h8.4V7" />
        </svg>
        <span class="nav-label">Главная</span>
      </div>

      <div class="nav-section-label">Пространство</div>

      <div class="nav-item" :class="{ active: store.screen === 'journal' }" @click="go('journal')">
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
          <line x1="2.5" y1="6.4" x2="13.5" y2="6.4" />
          <line x1="5.4" y1="9.4" x2="10.6" y2="9.4" />
          <line x1="5.4" y1="11.2" x2="8.6" y2="11.2" />
        </svg>
        <span class="nav-label">Журнал</span>
        <span class="nav-count">7</span>
      </div>
      <div class="nav-item" :class="{ active: store.screen === 'tasks' }" @click="go('tasks')">
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
          <polyline points="5,8 7,10 11,5.5" />
        </svg>
        <span class="nav-label">Задачи</span>
        <span class="nav-count">{{ activeTaskCount }}</span>
      </div>
      <div class="nav-item" :class="{ active: store.screen === 'dialogs' }" @click="go('dialogs')">
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <path
            d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6l-3 2.5V10.5H4.5a2 2 0 0 1-2-2Z"
          />
        </svg>
        <span class="nav-label">Диалоги</span>
        <span class="nav-dot"></span>
      </div>

      <div class="nav-section-label">Модули</div>

      <div class="nav-item" :class="{ active: store.screen === 'tools' }" @click="go('tools')">
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <path
            d="M10.5 2.8a3 3 0 0 0-3.9 3.7L2.7 10.4a1.3 1.3 0 0 0 1.9 1.9l3.9-3.9a3 3 0 0 0 3.7-3.9l-1.8 1.8-1.6-.4-.4-1.6Z"
          />
        </svg>
        <span class="nav-label">Инструменты</span>
      </div>
      <div class="nav-item" :class="{ active: store.screen === 'para' }" @click="go('para')">
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1" />
          <rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1" />
          <rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1" />
          <rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1" />
        </svg>
        <span class="nav-label">PARA</span>
      </div>
      <div
        class="nav-item"
        :class="{ active: store.screen === 'finances' }"
        @click="go('finances')"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <circle cx="8" cy="8" r="5.5" />
          <path
            d="M9.6 6.2c-.3-.7-1-1-1.7-1-1 0-1.6.6-1.6 1.3 0 1.9 3.4.9 3.4 2.9 0 .8-.7 1.4-1.7 1.4-.9 0-1.6-.4-1.9-1.1"
          />
          <line x1="8" y1="4" x2="8" y2="5" />
          <line x1="8" y1="11" x2="8" y2="12" />
        </svg>
        <span class="nav-label">Финансы</span>
      </div>
      <div
        class="nav-item"
        :class="{ active: store.screen === 'services' }"
        @click="go('services')"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <circle cx="8" cy="8" r="2.1" />
          <path
            d="M8 1.6v1.7M8 12.7v1.7M3.5 3.5l1.2 1.2M11.3 11.3l1.2 1.2M1.6 8h1.7M12.7 8h1.7M3.5 12.5l1.2-1.2M11.3 4.7l1.2-1.2"
          />
        </svg>
        <span class="nav-label">Сервисы</span>
      </div>
      <div class="nav-item" :class="{ active: store.screen === 'library' }" @click="go('library')">
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <path d="M2.6 3.3c1.6-.7 3.4-.7 5 0v9c-1.6-.7-3.4-.7-5 0Z" />
          <path d="M13.4 3.3c-1.6-.7-3.4-.7-5 0v9c1.6-.7 3.4-.7 5 0Z" />
        </svg>
        <span class="nav-label">Библиотека</span>
      </div>
    </nav>

    <!-- Футер -->
    <div class="sidebar-footer">
      <div
        class="nav-item"
        :class="{ active: store.screen === 'components' }"
        @click="go('components')"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <circle cx="5.6" cy="5.6" r="2.7" />
          <rect x="8.6" y="8.6" width="5" height="5" rx="1" />
        </svg>
        <span class="nav-label">Дизайн-система</span>
      </div>
      <div class="user-card">
        <div class="user-avatar">А</div>
        <div class="user-info">
          <span class="user-name">Андрей</span>
          <span class="user-sub">khudoley.pro</span>
        </div>
        <span class="user-status"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store, go } from '../../shared/store'

const activeTaskCount = computed(() => store.tasks.filter((t) => t.status === 'doing').length || 5)
</script>

<style scoped>
.sidebar {
  width: 224px;
  flex: none;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  background: var(--bg);
  min-width: 0;
}
.sidebar-brand {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  flex: none;
}
.brand-icon {
  width: 26px;
  height: 26px;
  border-radius: 3px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: var(--accent-fg);
  flex: none;
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  min-width: 0;
}
.brand-name {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.02em;
  color: var(--fg);
}
.brand-sub {
  font-size: 10.5px;
  color: var(--fg3);
}
.sidebar-nav {
  flex: 1;
  overflow: auto;
  padding: 12px 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
}
.nav-section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.13em;
  color: var(--fg3);
  text-transform: uppercase;
  padding: 15px 9px 6px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 9px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--fg2);
  font-size: 13px;
  font-weight: 500;
  transition:
    background 0.12s,
    color 0.12s;
}
.nav-item:hover {
  background: var(--surface-2);
  color: var(--fg);
}
.nav-item.active {
  background: var(--surface-2);
  color: var(--fg);
  font-weight: 600;
}
.nav-item svg {
  flex: none;
}
.nav-label {
  flex: 1;
}
.nav-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg3);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 1px 6px;
}
.nav-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex: none;
  animation: softpulse 2.2s infinite;
}
.sidebar-footer {
  border-top: 1px solid var(--line);
  padding: 11px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 9px 4px;
}
.user-avatar {
  width: 27px;
  height: 27px;
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
.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--fg);
}
.user-sub {
  font-size: 10.5px;
  color: var(--fg3);
}
.user-status {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ok);
  flex: none;
}
</style>

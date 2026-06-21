<script setup lang="ts">
defineProps<{
  campaignUrl: string
  campaignTitle: string
  indexUrl: string
  currentSection?: string
}>()
</script>

<template>
  <aside class="sidebar w-56 shrink-0 flex flex-col">
    <div class="sidebar-header p-4 border-b border-[var(--color-border)]">
      <a
        :href="indexUrl"
        class="sidebar-back-link text-[var(--color-text)] hover:text-[var(--color-accent)] text-sm font-medium transition-colors"
      >
        <i class="fas fa-arrow-left mr-2"></i>Все кампании
      </a>
      <h2
        class="text-[var(--color-text)] font-semibold mt-2 truncate text-[15px]"
        :title="campaignTitle"
      >
        {{ campaignTitle }}
      </h2>
    </div>
    <nav class="flex-1 p-2">
      <a
        :href="campaignUrl + '#'"
        aria-label="Дашборд"
        :class="!currentSection || currentSection === 'dashboard' ? 'nav-item-active' : 'nav-item'"
        class="nav-link flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150"
      >
        <i class="fas fa-chart-line w-5 shrink-0" aria-hidden="true"></i>
        <span>Дашборд</span>
      </a>
      <a
        :href="campaignUrl + '#partners'"
        aria-label="Партнёры"
        :class="
          currentSection === 'partners' || currentSection === 'partner'
            ? 'nav-item-active'
            : 'nav-item'
        "
        class="nav-link flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150"
      >
        <i class="fas fa-users w-5 shrink-0" aria-hidden="true"></i>
        <span>Партнёры</span>
      </a>
      <a
        :href="campaignUrl + '#referrals'"
        aria-label="Рефералы"
        :class="currentSection === 'referrals' ? 'nav-item-active' : 'nav-item'"
        class="nav-link flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150"
      >
        <i class="fas fa-user-friends w-5 shrink-0" aria-hidden="true"></i>
        <span>Рефералы</span>
      </a>
      <a
        :href="campaignUrl + '#pages'"
        aria-label="Страницы"
        :class="currentSection === 'pages' ? 'nav-item-active' : 'nav-item'"
        class="nav-link flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150"
      >
        <i class="fas fa-file-alt w-5 shrink-0" aria-hidden="true"></i>
        <span>Страницы</span>
      </a>
      <a
        :href="campaignUrl + '#bot'"
        aria-label="Бот"
        :class="currentSection === 'bot' ? 'nav-item-active' : 'nav-item'"
        class="nav-link flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150"
      >
        <i class="fas fa-robot w-5 shrink-0" aria-hidden="true"></i>
        <span>Бот</span>
      </a>
      <a
        :href="campaignUrl + '#about'"
        aria-label="О кампании"
        :class="currentSection === 'about' ? 'nav-item-active' : 'nav-item'"
        class="nav-link flex items-center gap-2 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150"
      >
        <i class="fas fa-info-circle w-5 shrink-0" aria-hidden="true"></i>
        <span>О кампании</span>
      </a>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  min-height: 100vh;
  /* Полупрозрачный фон — сквозь панель просвечивает CRT-сетка, панель часть экрана */
  background: rgba(20, 20, 20, 0.88);
  border-right: 1px solid var(--color-border);
  /* Лёгкая внутренняя тень по правому краю — как край экрана/рамы CRT */
  box-shadow: inset -8px 0 16px -8px rgba(0, 0, 0, 0.5);
  z-index: 20;
  position: relative;
}

.sidebar-header {
  /* Тонкая затемнённая полоса сверху, в духе верхней части экрана */
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, transparent 12px);
  border-bottom-color: var(--color-border);
}

.sidebar-back-link {
  display: inline-flex;
  align-items: center;
}

.nav-link {
  font-weight: 500;
  color: var(--color-text);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.nav-item-active {
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: 600;
}

.nav-item-active i {
  color: var(--color-accent);
}
</style>

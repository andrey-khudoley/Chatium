<script setup lang="ts">
interface Setting {
  id: string
  key: string
  value: any
}

const props = defineProps<{
  settings: Setting[]
  projectTitle: string
}>()
</script>

<template>
  <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
    <!-- Header -->
    <header class="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] py-4">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow"
          >
            <i class="fas fa-chart-line text-white"></i>
          </div>
          <h1 class="text-xl font-bold text-[var(--color-text)]">{{ projectTitle }}</h1>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 py-8">
      <div class="container mx-auto px-4 max-w-4xl">
        <div class="card">
          <div class="flex items-center gap-3 mb-6">
            <i class="fas fa-cog text-xl" style="color: var(--color-primary)"></i>
            <h2 class="text-2xl font-bold">Настройки</h2>
          </div>

          <div v-if="settings.length === 0" class="text-center py-12">
            <i class="fas fa-inbox text-4xl mb-4 text-[var(--color-text-tertiary)]"></i>
            <p class="text-[var(--color-text-secondary)]">Нет настроек</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Ключ</th>
                  <th>Значение</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="setting in settings" :key="setting.id">
                  <td class="font-medium">{{ setting.key }}</td>
                  <td>{{ String(setting.value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] py-4">
      <div class="container mx-auto px-4 max-w-4xl">
        <div
          class="flex items-center justify-center gap-2 text-[var(--color-text-secondary)] text-sm"
        >
          <i class="fas fa-chart-line"></i>
          <span>{{ projectTitle }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --color-bg: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-tertiary: #64748b;
  --color-border: #334155;
  --color-primary: #38bdf8;
  --color-primary-hover: #0ea5e9;
  --transition: all 0.2s ease;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
}

body {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  margin: 0;
  letter-spacing: 0.03em;
}

/* Стилизация выделения текста */
::selection {
  background: #e0335a;
  color: #ffffff;
}

::-moz-selection {
  background: #e0335a;
  color: #ffffff;
}

.card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%);
  border: 1.5px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.table th {
  font-weight: 400;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.15);
}

.table tr:hover {
  background: var(--color-bg-secondary);
}

/* Глобальный эффект глитча для всей страницы */
.global-glitch-active {
  animation: global-page-glitch 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both !important;
}

@keyframes global-page-glitch {
  0%,
  100% {
    transform: translate(0) skew(0deg);
    filter: none;
  }
  10% {
    transform: translate(-3px, 0) skew(-0.5deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.7))
      hue-rotate(90deg);
  }
  20% {
    transform: translate(3px, 0) skew(0.5deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.7))
      hue-rotate(-90deg);
  }
  30% {
    transform: translate(-2px, 0) skew(-0.3deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.8)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.8))
      brightness(1.2);
  }
  40% {
    transform: translate(2px, 0) skew(0.3deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.8)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.8))
      contrast(1.3);
  }
  50% {
    transform: translate(-3px, 0) skew(-0.5deg);
    filter: drop-shadow(2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(-2px 0 0 rgba(0, 255, 255, 0.7))
      saturate(2);
  }
  60% {
    transform: translate(3px, 0) skew(0.5deg);
    filter: drop-shadow(-2px 0 0 rgba(255, 0, 255, 0.7)) drop-shadow(2px 0 0 rgba(0, 255, 255, 0.7))
      invert(0.1);
  }
  70% {
    transform: translate(-2px, 0) skew(-0.2deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.6)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.6))
      brightness(1.1);
  }
  80% {
    transform: translate(2px, 0) skew(0.2deg);
    filter: drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.6)) drop-shadow(1px 0 0 rgba(0, 255, 255, 0.6))
      contrast(1.2);
  }
  90% {
    transform: translate(-1px, 0) skew(0deg);
    filter: drop-shadow(1px 0 0 rgba(255, 0, 255, 0.5)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.5))
      brightness(1.05);
  }
}

.global-glitch-active * {
  pointer-events: none !important;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { DcThemeGlobalStyles } from '../components'

const props = defineProps<{
  back: string
  homeUrl: string
}>()

const signinUrl = computed(() => `/s/auth/signin?back=${encodeURIComponent(props.back)}`)
</script>

<template>
  <DcThemeGlobalStyles theme="dark" theme-preset-id="midnight-pine" />

  <main class="bpm-login-page">
    <section class="bpm-login-card">
      <p class="bpm-login-kicker">BPM Access</p>
      <h1>Вход в NeSo BPM</h1>
      <p>
        Страница входа вынесена в новый BPM-проект. Для доступа используется стандартный auth flow
        Chatium.
      </p>

      <div class="bpm-login-actions">
        <a :href="signinUrl" class="primary">Войти</a>
        <a :href="homeUrl">На главную</a>
      </div>
    </section>
  </main>
</template>

<style scoped>
.bpm-login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
}

.bpm-login-card {
  width: min(520px, 100%);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-soft);
  padding: 18px;
  background: var(--gradient-glass), color-mix(in srgb, var(--surface-1) 84%, transparent);
  box-shadow: var(--shadow-md);
}

.bpm-login-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.66rem;
  color: var(--text-tertiary);
}

.bpm-login-card h1 {
  margin: 7px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 2.6vw, 2rem);
}

.bpm-login-card p {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
  line-height: 1.5;
}

.bpm-login-actions {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bpm-login-actions a {
  height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-soft);
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.76rem;
}

.bpm-login-actions a.primary {
  color: var(--accent-contrast);
  border-color: color-mix(in srgb, var(--accent) 58%, var(--border-soft));
  background: linear-gradient(140deg, var(--accent-strong), var(--accent));
}

.bpm-login-actions a:hover {
  color: var(--text-primary);
  border-color: var(--border-accent);
}
</style>

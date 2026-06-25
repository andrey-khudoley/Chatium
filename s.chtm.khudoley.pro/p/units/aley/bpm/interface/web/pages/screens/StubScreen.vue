<template>
  <div class="stub-screen anim-fadein">
    <div class="stub-card" data-deco="corner corner2">
      <DecoLabel num="--" text="модуль в разработке" style="margin-bottom: 18px" />
      <div class="stub-name">{{ store.stubName || 'Модуль' }}</div>
      <p class="stub-desc">
        Этот раздел находится в разработке и появится в следующих стадиях системы.
      </p>
      <button class="back-btn" @click="go('home')">← Вернуться на главную</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { store, go } from '../../shared/store'
import DecoLabel from '../../components/ui/DecoLabel.vue'
</script>

<style scoped>
.stub-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 48px 24px;
}
.stub-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 40px 48px;
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.stub-name {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--fg);
  letter-spacing: -0.01em;
}
.stub-desc {
  font-size: 13.5px;
  color: var(--fg2);
  line-height: 1.6;
}
.back-btn {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 9px 16px;
  color: var(--fg);
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s;
}
.back-btn:hover {
  border-color: var(--accent-line);
  color: var(--accent);
}
</style>

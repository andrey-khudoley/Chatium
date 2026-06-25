<template>
  <div data-role="screenpad" class="screen anim-fadein">
    <DecoLabel num="07" text="сервисы" style="margin-bottom: 13px" />
    <p class="screen-desc">
      Внешние сервисы — источники событий для журнала. Подключённые синхронизируются автоматически и
      наполняют систему.
    </p>

    <div class="service-groups">
      <div v-for="group in serviceGroups" :key="group.cat" class="service-group">
        <div class="group-header">
          <span class="group-label">{{ group.cat }}</span>
          <div class="group-line"></div>
          <span class="group-count">{{ group.services.length }}</span>
        </div>
        <div data-role="metrics" class="services-grid">
          <div
            v-for="svc in group.services"
            :key="svc.id"
            class="service-card"
            :class="{ connected: svc.on }"
          >
            <div class="svc-icon" :style="{ color: svc.on ? 'var(--accent)' : 'var(--fg3)' }">
              {{ svc.glyph }}
            </div>
            <div class="svc-info">
              <div class="svc-name-row">
                <span class="svc-name">{{ svc.name }}</span>
                <span v-if="svc.tag" class="svc-tag">{{ svc.tag }}</span>
              </div>
              <div class="svc-desc">{{ svc.desc }}</div>
              <div class="svc-last" :style="{ color: svc.on ? 'var(--fg3)' : 'var(--warn)' }">
                {{ svc.last }}
              </div>
            </div>
            <Toggle v-model="svc.on" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { store } from '../../shared/store'
import DecoLabel from '../../components/ui/DecoLabel.vue'
import Toggle from '../../components/ui/Toggle.vue'

const serviceGroups = computed(() => {
  const map = new Map<string, typeof store.services>()
  for (const s of store.services) {
    if (!map.has(s.cat)) map.set(s.cat, [])
    map.get(s.cat)!.push(s)
  }
  return Array.from(map.entries()).map(([cat, services]) => ({ cat, services }))
})
</script>

<style scoped>
.screen {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}
.screen-desc {
  font-size: 13px;
  color: var(--fg2);
  line-height: 1.55;
  max-width: 600px;
  margin-bottom: 22px;
}
.service-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 12px;
}
.group-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg2);
}
.group-line {
  flex: 1;
  height: 1px;
  background: var(--line);
}
.group-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--fg3);
}
.services-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.service-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: border-color 0.12s;
}
.service-card.connected {
  border-color: var(--line);
}
.svc-icon {
  width: 42px;
  height: 42px;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  flex: none;
}
.svc-info {
  flex: 1;
  min-width: 0;
}
.svc-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.svc-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg);
}
.svc-tag {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 5px;
  padding: 2px 7px;
  flex: none;
}
.svc-desc {
  font-size: 11.5px;
  color: var(--fg2);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.svc-last {
  font-size: 10.5px;
  margin-top: 6px;
}
</style>

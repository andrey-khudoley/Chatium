<template>
  <div data-role="screenpad" class="screen anim-fadein">
    <DecoLabel num="09" text="дизайн-система" style="margin-bottom: 6px" />
    <p class="screen-desc">
      Дизайн-система FLOW — Inter и Space Grotesk для интерфейса, JetBrains Mono для данных.
      Инженерная плотность, сетка и шум на фоне, HUD-углы и единый малиновый акцент.
    </p>

    <!-- Палитра -->
    <section class="ds-section">
      <h3 class="section-title">Палитра</h3>
      <div class="palette-grid">
        <div v-for="p in palette" :key="p.l" class="palette-item">
          <div class="palette-swatch" :style="{ background: p.v }"></div>
          <div class="palette-label">{{ p.l }}</div>
        </div>
      </div>
    </section>

    <!-- Типографика -->
    <section class="ds-section">
      <h3 class="section-title">Типографика</h3>
      <div class="card">
        <div class="typo-grotesk">Space Grotesk</div>
        <div class="typo-h2">Заголовок раздела · 20</div>
        <div class="typo-body">
          Основной текст 13.5 — задачи, сообщения, описания. Читаемый, спокойный, без лишнего шума.
        </div>
        <div class="typo-sub">Вторичный текст 12 — метаданные и подписи.</div>
        <div class="typo-nums">
          <span class="deco-val" style="font-size: 32px; color: var(--fg)">128</span>
          <span
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 14px;
              color: var(--accent);
              font-variant-numeric: tabular-nums;
            "
            >1 234 · 09:30 · 87%</span
          >
        </div>
        <div class="typo-mono">Space Grotesk — числа-герои · JetBrains Mono — данные</div>
      </div>
    </section>

    <!-- Кнопки и статусы -->
    <section class="ds-section">
      <h3 class="section-title">Кнопки · поля · статусы</h3>
      <div class="card">
        <div class="comp-row">
          <PrimaryButton>Основная</PrimaryButton>
          <button class="secondary-btn">Вторичная</button>
          <button class="ghost-btn">Призрачная</button>
        </div>
        <div class="comp-row" style="margin-top: 16px">
          <div class="search-demo">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="var(--fg3)"
              stroke-width="1.5"
            >
              <circle cx="7" cy="7" r="4.2" />
              <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
            </svg>
            <span style="font-size: 12.5px; color: var(--fg3)">Текстовое поле</span>
          </div>
          <div class="status-pills">
            <Pill v-for="s in statusPills" :key="s.l" :label="s.l" :color="s.c" :bg="s.bg" dot />
          </div>
        </div>
      </div>
    </section>

    <!-- Стат-плитки -->
    <section class="ds-section">
      <h3 class="section-title">Стат-плитки · метрики</h3>
      <div class="stat-grid">
        <StatCard
          label="Выполнено"
          value="23"
          dot="var(--ok)"
          trend="↑ 12% к прошлой нед"
          trend-color="var(--ok)"
        />
        <div class="card">
          <div class="prog-label">Прогресс проекта</div>
          <div class="prog-val">68%</div>
          <ProgressBar :value="68" />
        </div>
        <div class="card">
          <div class="prog-label" style="margin-bottom: 12px">Активность</div>
          <BarChart :bars="demoBarData" :height="40" />
        </div>
      </div>
    </section>

    <!-- HUD и декор -->
    <section class="ds-section">
      <h3 class="section-title">HUD-декор и нумерация</h3>
      <div class="hud-grid">
        <div class="card" data-deco="corner corner2">
          <DecoLabel num="00" text="моно-метка секции" />
          <div style="display: flex; align-items: center; gap: 10px; margin-top: 14px">
            <DecoRail />
            <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
              >Акцентный рейл заголовка</span
            >
          </div>
          <div class="deco-foot" style="color: var(--fg3); margin-top: 14px">
            HUD-углы · пунктирная сноска
          </div>
        </div>
        <GutterCard num="07">
          <div style="font-size: 14px; font-weight: 700; color: var(--fg); margin-bottom: 6px">
            Гаттер с номером
          </div>
          <div style="font-size: 12px; color: var(--fg2); line-height: 1.5">
            Левое поле с пунктирной сеткой и моно-номером — фирменный приём карточек системы.
          </div>
        </GutterCard>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PrimaryButton from '../../components/ui/PrimaryButton.vue'
import Pill from '../../components/ui/Pill.vue'
import StatCard from '../../components/ui/StatCard.vue'
import ProgressBar from '../../components/ui/ProgressBar.vue'
import BarChart from '../../components/ui/BarChart.vue'
import DecoLabel from '../../components/ui/DecoLabel.vue'
import DecoRail from '../../components/ui/DecoRail.vue'
import GutterCard from '../../components/ui/GutterCard.vue'

const palette = [
  { l: '--bg', v: 'var(--bg)' },
  { l: '--surface', v: 'var(--surface)' },
  { l: '--surface-2', v: 'var(--surface-2)' },
  { l: '--elevated', v: 'var(--elevated)' },
  { l: '--accent', v: 'var(--accent)' },
  { l: '--ok', v: 'var(--ok)' },
  { l: '--warn', v: 'var(--warn)' }
]

const statusPills = [
  { l: 'Входящие', c: 'var(--fg3)', bg: 'var(--surface-2)' },
  { l: 'В работе', c: 'var(--accent)', bg: 'var(--accent-soft)' },
  { l: 'Ожидание', c: 'var(--warn)', bg: 'rgba(224,160,66,0.15)' },
  { l: 'Готово', c: 'var(--ok)', bg: 'rgba(52,211,153,0.15)' },
  { l: 'Отменено', c: 'var(--fg3)', bg: 'var(--surface-2)' }
]

const demoBarData = [
  { label: 'Пн', value: 60 },
  { label: 'Вт', value: 85 },
  { label: 'Ср', value: 45 },
  { label: 'Чт', value: 90 },
  { label: 'Пт', value: 70 },
  { label: 'Сб', value: 30 },
  { label: 'Вс', value: 20 }
]
</script>

<style scoped>
.screen {
  padding: 24px;
  max-width: 920px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.screen-desc {
  font-size: 13px;
  color: var(--fg2);
  line-height: 1.55;
  max-width: 600px;
}
.ds-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.section-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--fg);
}
.palette-grid {
  display: flex;
  gap: 11px;
  flex-wrap: wrap;
}
.palette-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.palette-swatch {
  width: 92px;
  height: 56px;
  border-radius: 4px;
  border: 1px solid var(--line);
}
.palette-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  color: var(--fg3);
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.typo-grotesk {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 0.95;
  color: var(--fg);
}
.typo-h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--fg);
}
.typo-body {
  font-size: 13.5px;
  color: var(--fg);
  line-height: 1.55;
}
.typo-sub {
  font-size: 12px;
  color: var(--fg2);
}
.typo-nums {
  display: flex;
  align-items: baseline;
  gap: 16px;
  flex-wrap: wrap;
  border-top: 1px solid var(--line);
  padding-top: 13px;
}
.typo-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg3);
}
.comp-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.secondary-btn {
  background: var(--surface-2);
  color: var(--fg);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 9px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.12s;
}
.secondary-btn:hover {
  border-color: var(--line-2);
}
.ghost-btn {
  background: transparent;
  color: var(--fg2);
  border: none;
  padding: 9px 12px;
  font-family: 'Inter', sans-serif;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.12s;
}
.ghost-btn:hover {
  color: var(--fg);
}
.search-demo {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 10px 13px;
}
.status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.prog-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--fg2);
}
.prog-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--fg);
  margin: 11px 0 9px;
  font-variant-numeric: tabular-nums;
}
.hud-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
</style>

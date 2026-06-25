<template>
  <div data-role="screenpad" class="screen anim-fadein">
    <DecoLabel num="04" text="финансы" style="margin-bottom: 12px" />
    <p class="screen-desc">
      Деньги как часть системы. Операции из банка попадают в журнал автоматически, бюджеты держат
      расходы под контролем.
    </p>

    <!-- Балансы -->
    <div data-role="metrics" class="balances-grid">
      <div v-for="b in balances" :key="b.l" class="balance-card" data-deco="corner corner2">
        <span class="balance-label">{{ b.l }}</span>
        <span class="balance-val">{{ b.v }}</span>
        <span class="deco-foot" style="color: var(--fg3)">{{ b.sub }}</span>
      </div>
    </div>

    <!-- Основная сетка -->
    <div data-role="homegrid" class="main-grid">
      <!-- Левая: бюджет + операции -->
      <div class="left-col">
        <!-- Бюджет -->
        <div class="gcard card">
          <span class="gut">01</span>
          <div class="card-header">
            <span class="card-title">Бюджет · июнь</span>
            <span class="budget-total">92 400 / 120 000 ₽</span>
          </div>
          <div class="budget-list">
            <div v-for="b in budgets" :key="b.name" class="budget-item">
              <div class="budget-item-header">
                <span class="budget-name">{{ b.name }}</span>
                <span class="budget-label" :style="{ color: budgetColor(b) }">{{
                  budgetLabel(b)
                }}</span>
              </div>
              <ProgressBar :value="(b.spent / b.limit) * 100" :color="budgetColor(b)" />
            </div>
          </div>
        </div>

        <!-- Операции -->
        <div class="gcard card">
          <span class="gut">02</span>
          <div class="card-header">
            <span class="card-title">Последние операции</span>
            <span class="link-sm" @click="go('journal')">В журнал →</span>
          </div>
          <div v-for="tx in transactions" :key="tx.id" class="tx-row">
            <div class="tx-icon">{{ tx.name[0] }}</div>
            <div class="tx-info">
              <span class="tx-name">{{ tx.name }}</span>
              <span class="tx-cat">{{ tx.cat }}</span>
            </div>
            <div class="tx-amt-col">
              <span class="tx-amt" :style="{ color: tx.amt > 0 ? 'var(--ok)' : 'var(--fg)' }">
                {{ tx.amt > 0 ? '+' : '' }}{{ tx.amt.toLocaleString('ru') }} ₽
              </span>
              <span class="tx-date">{{ tx.date }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Правая: счета + график + цель -->
      <div class="right-col">
        <div class="card">
          <span class="card-title">Счета</span>
          <div class="accounts">
            <div v-for="a in accounts" :key="a.name" class="account-row">
              <span class="acc-dot"></span>
              <span class="acc-name">{{ a.name }}</span>
              <span class="acc-val">{{ a.v }}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Расходы по месяцам</span>
            <span class="mono-sm">₽ тыс</span>
          </div>
          <BarChart :bars="spendBarData" :height="92" />
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Цель · финансовая подушка</span>
            <span class="accent-mono">72%</span>
          </div>
          <div class="mono-sm" style="margin-bottom: 10px">108 000 / 150 000 ₽</div>
          <ProgressBar :value="72" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { go } from '../../shared/store'
import {
  seedBudgets,
  seedTransactions,
  seedSpendBars,
  seedAccounts
} from '../../shared/mocks/finances.mock'
import ProgressBar from '../../components/ui/ProgressBar.vue'
import BarChart from '../../components/ui/BarChart.vue'
import DecoLabel from '../../components/ui/DecoLabel.vue'

const budgets = seedBudgets
const transactions = seedTransactions
const accounts = seedAccounts
const spendBarData = computed(() => seedSpendBars.map((b) => ({ label: b.m, value: b.v })))

const balances = [
  { l: 'Баланс', v: '118 920 ₽', sub: 'все счета · 22 июн' },
  { l: 'Расходы · июнь', v: '92 400 ₽', sub: 'из 120 000 ₽ бюджета' },
  { l: 'Доходы · июнь', v: '185 000 ₽', sub: 'два платежа' },
  { l: 'Экономия · июнь', v: '92 600 ₽', sub: '→ 72% финподушка' }
]

function budgetColor(b: { spent: number; limit: number }) {
  const pct = b.spent / b.limit
  if (pct >= 1) return 'var(--warn)'
  if (pct >= 0.85) return 'var(--warn)'
  return 'var(--accent)'
}

function budgetLabel(b: { name: string; spent: number; limit: number }) {
  return `${b.spent.toLocaleString('ru')} / ${b.limit.toLocaleString('ru')} ₽`
}
</script>

<style scoped>
.screen {
  padding: 24px;
  max-width: 1180px;
  margin: 0 auto;
}
.screen-desc {
  font-size: 13px;
  color: var(--fg2);
  line-height: 1.55;
  max-width: 600px;
  margin-bottom: 18px;
}
.balances-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.balance-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 15px 16px 13px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.balance-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg2);
}
.balance-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 600;
  line-height: 0.95;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
}
.main-grid {
  display: grid;
  grid-template-columns: 1.62fr 1fr;
  gap: 16px;
  align-items: start;
}
.left-col,
.right-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: var(--pad);
}
.gcard {
  padding-left: calc(40px + var(--pad)) !important;
  position: relative;
  overflow: hidden;
}
.gut {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  border-right: 1px solid var(--line);
  background: var(--surface-2);
  background-image: repeating-linear-gradient(0deg, transparent 0 13px, var(--line) 13px 14px);
  display: flex;
  justify-content: center;
  padding-top: 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--fg);
}
.budget-total {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg3);
}
.mono-sm {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg3);
}
.accent-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--accent);
}
.link-sm {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  cursor: pointer;
}
.link-sm:hover {
  filter: brightness(1.15);
}
.budget-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.budget-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.budget-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.budget-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--fg);
}
.budget-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}
.tx-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 0;
  border-top: 1px solid var(--line);
}
.tx-icon {
  width: 30px;
  height: 30px;
  border-radius: 3px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--fg2);
  flex: none;
}
.tx-info {
  flex: 1;
  min-width: 0;
}
.tx-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tx-cat {
  font-size: 11px;
  color: var(--fg3);
  margin-top: 2px;
  display: block;
}
.tx-amt-col {
  text-align: right;
  flex: none;
}
.tx-amt {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  display: block;
}
.tx-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--fg3);
  margin-top: 2px;
  display: block;
}
.accounts {
  margin-top: 11px;
  display: flex;
  flex-direction: column;
}
.account-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 0;
  border-top: 1px solid var(--line);
}
.acc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  flex: none;
}
.acc-name {
  font-size: 12.5px;
  color: var(--fg);
  flex: 1;
  min-width: 0;
}
.acc-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--fg);
}
</style>

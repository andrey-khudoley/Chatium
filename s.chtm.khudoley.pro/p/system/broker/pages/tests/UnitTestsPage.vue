<script setup lang="ts">
declare const ctx: any

import { ref, computed } from 'vue'
import { TEST_CATEGORIES } from '../../shared/tests/test-definitions'
import { brokerRunSingleTestRoute } from '../../api/tests/run-tests/run-single'
import { brokerRunAllTestsRoute } from '../../api/tests/run-tests/run-all'

interface TestResult {
  success: boolean
  message: string
}

type Status = 'pending' | 'running' | 'passed' | 'failed'

// Компонент импортирует shared/* (данные тестов) и роут-объекты с
// // @shared-route (brokerRunSingleTestRoute/brokerRunAllTestsRoute) — вызов
// через .run(ctx, ...) с глобальным ctx (007-vue.md, «@shared-route и метод
// .run()»; образец — inner/samples/new_project/tests/pages/UnitTestsPage.vue,
// фикс-раунда 1, п.17). Никакого fetch/хардкода URL.

const results = ref<Record<string, Record<string, TestResult>>>({})
const statuses = ref<Record<string, Record<string, Status>>>({})
const isRunning = ref(false)
const summary = ref<{
  total: number
  passed: number
  failed: number
  duration: number
  success: boolean
} | null>(null)

const stats = computed(() => {
  let total = 0
  let passed = 0
  let failed = 0
  for (const category of TEST_CATEGORIES) {
    for (const test of category.tests) {
      total++
      const r = results.value[category.name]?.[test.name]
      if (r) {
        if (r.success) passed++
        else failed++
      }
    }
  }
  return { total, passed, failed }
})

function getStatus(categoryName: string, testName: string): Status {
  return statuses.value[categoryName]?.[testName] ?? 'pending'
}

function setStatus(categoryName: string, testName: string, status: Status) {
  if (!statuses.value[categoryName]) statuses.value[categoryName] = {}
  statuses.value[categoryName][testName] = status
}

function setResult(categoryName: string, testName: string, result: TestResult) {
  if (!results.value[categoryName]) results.value[categoryName] = {}
  results.value[categoryName][testName] = result
}

async function runSingle(categoryName: string, testName: string) {
  setStatus(categoryName, testName, 'running')
  try {
    const data = await brokerRunSingleTestRoute.run(ctx, {
      category: categoryName,
      test: testName
    })
    if (!data.success) {
      setResult(categoryName, testName, { success: false, message: 'Ошибка запроса' })
      setStatus(categoryName, testName, 'failed')
      return
    }
    const result: TestResult = data.result
    setResult(categoryName, testName, result)
    setStatus(categoryName, testName, result.success ? 'passed' : 'failed')
  } catch (error: any) {
    setResult(categoryName, testName, { success: false, message: error?.message || String(error) })
    setStatus(categoryName, testName, 'failed')
  }
}

async function runAll() {
  if (isRunning.value) return
  isRunning.value = true
  results.value = {}
  statuses.value = {}
  summary.value = null

  for (const category of TEST_CATEGORIES) {
    for (const test of category.tests) {
      setStatus(category.name, test.name, 'running')
    }
  }

  try {
    const data = await brokerRunAllTestsRoute.run(ctx, {})
    if (!data.success) return

    summary.value = data.summary
    for (const item of data.results as Array<{
      category: string
      test: string
      success: boolean
      message: string
    }>) {
      setResult(item.category, item.test, { success: item.success, message: item.message })
      setStatus(item.category, item.test, item.success ? 'passed' : 'failed')
    }
  } catch (error: any) {
    // Симметрично runSingle (фикс-раунда 1, п.19) — сетевой/серверный сбой не
    // должен оставлять статусы вечно "running".
    for (const category of TEST_CATEGORIES) {
      for (const test of category.tests) {
        setStatus(category.name, test.name, 'failed')
      }
    }
  } finally {
    isRunning.value = false
  }
}
</script>

<template>
  <div
    style="
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
      font-family: monospace;
      color: #ddd;
      background: #111;
    "
  >
    <header
      style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      "
    >
      <div>
        <h1 style="font-size: 20px; margin: 0">broker — Unit Tests</h1>
        <p style="color: #888; margin: 4px 0 0">
          Всего: {{ stats.total }} · Успешно: {{ stats.passed }} · Ошибок: {{ stats.failed }}
        </p>
      </div>
      <button :disabled="isRunning" style="padding: 8px 16px; cursor: pointer" @click="runAll">
        {{ isRunning ? 'Выполняется…' : 'Запустить все тесты' }}
      </button>
    </header>

    <div v-if="summary" style="margin-bottom: 16px">
      <strong :style="{ color: summary.success ? '#4caf50' : '#f44336' }">
        summary.success = {{ summary.success }} (total={{ summary.total }}, passed={{
          summary.passed
        }}, failed={{ summary.failed }}, duration={{ summary.duration }}ms)
      </strong>
    </div>

    <section
      v-for="category in TEST_CATEGORIES"
      :key="category.name"
      style="margin-bottom: 20px; border: 1px solid #333; padding: 12px"
    >
      <h2 style="font-size: 14px; text-transform: uppercase; margin: 0 0 8px">
        {{ category.title }}
      </h2>
      <div
        v-for="test in category.tests"
        :key="test.name"
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-top: 1px solid #222;
        "
      >
        <div>
          <div>{{ test.description }}</div>
          <div style="font-size: 11px; color: #666">{{ category.name }}/{{ test.name }}</div>
          <div
            v-if="results[category.name]?.[test.name]"
            style="font-size: 12px"
            :style="{ color: results[category.name]?.[test.name]?.success ? '#4caf50' : '#f44336' }"
          >
            {{ results[category.name]?.[test.name]?.message }}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px">
          <span>{{ getStatus(category.name, test.name) }}</span>
          <button style="cursor: pointer" @click="runSingle(category.name, test.name)">
            Запустить
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

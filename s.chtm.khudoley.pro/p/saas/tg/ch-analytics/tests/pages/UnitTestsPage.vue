<script setup lang="ts">
declare const ctx: any

import { ref, onMounted, onUnmounted, computed } from 'vue'
import {
  apiStartAllTestsRoute,
  apiStartSingleTestRoute,
  apiGetManualSocketIdRoute
} from '../api/start-tests'
import { TEST_CATEGORIES } from '../shared/test-definitions'
import { getOrCreateBrowserSocketClient } from '@app/socket'

interface TestResult {
  success: boolean
  message: string
}

interface ConsoleLine {
  id: string
  timestamp: string
  category: string
  test: string
  status: 'running' | 'passed' | 'failed' | 'info'
  message?: string
  type: 'test' | 'header' | 'summary' | 'info'
}

const testResults = ref<Record<string, Record<string, TestResult>>>({})
const testStatuses = ref<
  Record<string, Record<string, 'pending' | 'running' | 'passed' | 'failed'>>
>({})
const isRunning = ref(false)
const consoleLines = ref<ConsoleLine[]>([])
const consoleContainer = ref<HTMLElement | null>(null)
const socketSubscription = ref<any>(null)
const currentTestRunId = ref<string | null>(null)
const currentEncodedSocketId = ref<string | null>(null)

// Статистика
const stats = computed(() => {
  let total = 0
  let passed = 0
  let failed = 0

  for (const category of TEST_CATEGORIES) {
    for (const test of category.tests) {
      total++
      const result = testResults.value[category.name]?.[test.name]
      if (result) {
        if (result.success) {
          passed++
        } else {
          failed++
        }
      }
    }
  }

  return { total, passed, failed }
})

function addConsoleLine(line: ConsoleLine) {
  consoleLines.value.push(line)
  setTimeout(() => {
    if (consoleContainer.value) {
      consoleContainer.value.scrollTop = consoleContainer.value.scrollHeight
    }
  }, 0)
}

function getTimestamp(): string {
  const now = new Date()
  return now.toLocaleTimeString('ru-RU', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function setupSocketListener() {
  if (!socketSubscription.value) {
    return
  }

  socketSubscription.value.listen((data: any) => {
    const timestamp = getTimestamp()

    if (data.type === 'all-tests-started') {
      addConsoleLine({
        id: `header-${Date.now()}`,
        timestamp,
        category: '',
        test: '',
        status: 'passed',
        type: 'header',
        message: '=== ЗАПУСК ТЕСТОВ ==='
      })
    } else if (data.type === 'category-started') {
      addConsoleLine({
        id: `cat-${data.data.categoryName}-${Date.now()}`,
        timestamp,
        category: data.data.categoryName,
        test: '',
        status: 'passed',
        type: 'header',
        message: `>>> ${data.data.categoryTitle}`
      })
    } else if (data.type === 'test-started') {
      const { category, testName } = data.data
      if (!testStatuses.value[category]) {
        testStatuses.value[category] = {}
      }
      testStatuses.value[category][testName] = 'running'

      const test = TEST_CATEGORIES.find((c) => c.name === category)?.tests.find(
        (t) => t.name === testName
      )
      const runningLineId = `test-${category}-${testName}-${Date.now()}`

      addConsoleLine({
        id: runningLineId,
        timestamp,
        category,
        test: testName,
        status: 'running',
        type: 'test',
        message: test?.description || testName
      })
    } else if (data.type === 'test-completed') {
      const { category, testName, result } = data.data

      if (!testResults.value[category]) {
        testResults.value[category] = {}
      }
      if (!testStatuses.value[category]) {
        testStatuses.value[category] = {}
      }

      testResults.value[category][testName] = result
      testStatuses.value[category][testName] = result.success ? 'passed' : 'failed'

      // Обновляем существующую строку - ищем последнюю строку с этой категорией и тестом
      let lineIndex = -1
      for (let i = consoleLines.value.length - 1; i >= 0; i--) {
        const line = consoleLines.value[i]
        if (line.category === category && line.test === testName && line.type === 'test') {
          lineIndex = i
          break
        }
      }

      const test = TEST_CATEGORIES.find((c) => c.name === category)?.tests.find(
        (t) => t.name === testName
      )
      const message = `${test?.description || testName} - ${result.message}`

      if (lineIndex !== -1) {
        consoleLines.value[lineIndex] = {
          ...consoleLines.value[lineIndex],
          status: result.success ? 'passed' : 'failed',
          type: 'test',
          message
        }
      } else {
        // Если строка не найдена, добавляем новую
        addConsoleLine({
          id: `test-${category}-${testName}-completed-${Date.now()}`,
          timestamp,
          category,
          test: testName,
          status: result.success ? 'passed' : 'failed',
          type: 'test',
          message
        })
      }
    } else if (data.type === 'test-error') {
      const { category, testName, error } = data.data
      if (!testResults.value[category]) {
        testResults.value[category] = {}
      }
      if (!testStatuses.value[category]) {
        testStatuses.value[category] = {}
      }

      testResults.value[category][testName] = {
        success: false,
        message: error
      }
      testStatuses.value[category][testName] = 'failed'

      // Обновляем существующую строку
      const lineIndex = consoleLines.value.findIndex(
        (line) => line.category === category && line.test === testName && line.status === 'running'
      )

      if (lineIndex !== -1) {
        const test = TEST_CATEGORIES.find((c) => c.name === category)?.tests.find(
          (t) => t.name === testName
        )
        consoleLines.value[lineIndex] = {
          ...consoleLines.value[lineIndex],
          status: 'failed',
          message: `${test?.description || testName} - ${error}`
        }
      }
    } else if (data.type === 'test-info') {
      // Добавляем INFO сообщение в консоль
      const { category, testName, message } = data.data
      addConsoleLine({
        id: `info-${category}-${testName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        category: category || '',
        test: testName || '',
        status: 'info',
        type: 'info',
        message: message || ''
      })
    } else if (data.type === 'category-completed') {
      // Категория завершена - проверяем, все ли категории завершены
      checkAllTestsCompleted()
    } else if (data.type === 'all-tests-error') {
      isRunning.value = false
      addConsoleLine({
        id: `error-${Date.now()}`,
        timestamp: getTimestamp(),
        category: '',
        test: '',
        status: 'failed',
        type: 'test',
        message: `Ошибка запуска тестов: ${data.data.error}`
      })
    }
  })
}

async function subscribeToSocket(encodedSocketId: string) {
  // Если подписка уже существует для этого socketId, не пересоздаём её
  if (socketSubscription.value && currentEncodedSocketId.value === encodedSocketId) {
    return
  }

  // Отписываемся от предыдущей подписки
  if (socketSubscription.value) {
    if (typeof socketSubscription.value.unsubscribe === 'function') {
      socketSubscription.value.unsubscribe()
    }
    socketSubscription.value = null
  }

  try {
    const socketClient = await getOrCreateBrowserSocketClient()
    socketSubscription.value = socketClient.subscribeToData(encodedSocketId)
    currentEncodedSocketId.value = encodedSocketId

    if (!socketSubscription.value) {
      console.error('[UnitTestsPage] Failed to create subscription!')
      return
    }

    // Устанавливаем обработчик событий
    setupSocketListener()
  } catch (error: any) {
    console.error('[UnitTestsPage] Ошибка установки подписки:', error)
  }
}

function checkAllTestsCompleted() {
  // Проверяем, все ли тесты завершены
  let allCompleted = true
  let hasRunning = false

  for (const category of TEST_CATEGORIES) {
    for (const test of category.tests) {
      const status = testStatuses.value[category.name]?.[test.name]
      if (status === 'running') {
        hasRunning = true
        allCompleted = false
        break
      }
      if (!status || status === 'pending') {
        allCompleted = false
      }
    }
    if (hasRunning) break
  }

  // Если все тесты завершены и нет выполняющихся - показываем итоги
  if (allCompleted && !hasRunning) {
    updateSummary()
    isRunning.value = false
  }
}

function updateSummary() {
  // Удаляем старую итоговую строку если есть
  const summaryIndex = consoleLines.value.findIndex((line) => line.type === 'summary')
  if (summaryIndex !== -1) {
    consoleLines.value.splice(summaryIndex, 1)
  }

  // Добавляем новую итоговую строку
  addConsoleLine({
    id: `summary-${Date.now()}`,
    timestamp: getTimestamp(),
    category: '',
    test: '',
    status: stats.value.failed > 0 ? 'failed' : 'passed',
    type: 'summary',
    message: `=== РЕЗУЛЬТАТЫ: Всего ${stats.value.total}, Пройдено ${stats.value.passed}, Провалено ${stats.value.failed} ===`
  })
}

async function runAllTests() {
  isRunning.value = true
  testResults.value = {}
  testStatuses.value = {}
  consoleLines.value = []

  // Инициализируем статусы
  for (const category of TEST_CATEGORIES) {
    testStatuses.value[category.name] = {}
    for (const test of category.tests) {
      testStatuses.value[category.name][test.name] = 'pending'
    }
  }

  try {
    // Запускаем тесты через джобы
    const result = await apiStartAllTestsRoute.run(ctx, {})

    if (!result.success) {
      isRunning.value = false
      return
    }

    currentTestRunId.value = result.testRunId

    // Подписываемся на WebSocket для получения обновлений
    // ВАЖНО: Для всех тестов используется уникальный socketId, поэтому нужно установить подписку на него
    await subscribeToSocket(result.encodedSocketId)
  } catch (error: any) {
    isRunning.value = false
  }
}

async function runSingleTest(categoryName: string, testName: string) {
  if (!testResults.value[categoryName]) {
    testResults.value[categoryName] = {}
  }
  if (!testStatuses.value[categoryName]) {
    testStatuses.value[categoryName] = {}
  }

  testStatuses.value[categoryName][testName] = 'running'

  try {
    // Запускаем тест через джоб (подписка уже установлена при монтировании компонента)
    const result = await apiStartSingleTestRoute.run(ctx, {
      category: categoryName,
      test: testName
    })

    if (!result.success) {
      testStatuses.value[categoryName][testName] = 'failed'
      testResults.value[categoryName][testName] = {
        success: false,
        message: result.error || 'Ошибка запуска теста'
      }
      return
    }

    currentTestRunId.value = result.testRunId
  } catch (error: any) {
    testStatuses.value[categoryName][testName] = 'failed'
    testResults.value[categoryName][testName] = {
      success: false,
      message: error.message || 'Ошибка выполнения теста'
    }
  }
}

onMounted(async () => {
  // Устанавливаем подписку для точечных тестов заранее
  try {
    const socketResult = await apiGetManualSocketIdRoute.run(ctx, {})
    if (socketResult.success) {
      await subscribeToSocket(socketResult.encodedSocketId)
    }
  } catch (error) {
    console.error('[UnitTestsPage] Ошибка установки подписки при монтировании:', error)
  }
})

onUnmounted(() => {
  // Отписываемся от WebSocket при размонтировании компонента
  if (socketSubscription.value) {
    if (typeof socketSubscription.value.unsubscribe === 'function') {
      socketSubscription.value.unsubscribe()
    }
    socketSubscription.value = null
  }
})
</script>

<template>
  <div class="tests-page">
    <div class="tests-container">
      <div class="tests-header">
        <div class="header-content">
          <h1 class="page-title">UNIT TESTS</h1>
          <div v-if="stats.total > 0" class="stats">
            <span class="stat-item">Всего: {{ stats.total }}</span>
            <span class="stat-item stat-success">Пройдено: {{ stats.passed }}</span>
            <span class="stat-item stat-error">Провалено: {{ stats.failed }}</span>
          </div>
        </div>
        <button @click="runAllTests" :disabled="isRunning" class="run-button">
          <span v-if="isRunning">[RUNNING...]</span>
          <span v-else>[RUN ALL TESTS]</span>
        </button>
      </div>

      <div class="console-output" ref="consoleContainer">
        <div
          v-for="line in consoleLines"
          :key="line.id"
          :class="['console-line', `line-${line.type}`, `status-${line.status}`]"
        >
          <span class="line-timestamp">[{{ line.timestamp }}]</span>
          <span v-if="line.type === 'test'" class="line-status">
            <span v-if="line.status === 'running'" class="status-running">[...]</span>
            <span v-else-if="line.status === 'passed'" class="status-ok">[OK]</span>
            <span v-else-if="line.status === 'failed'" class="status-error">[ERROR]</span>
          </span>
          <span v-else-if="line.type === 'info'" class="line-status">
            <span class="status-info">[INFO]</span>
          </span>
          <span
            v-if="(line.type === 'test' || line.type === 'info') && line.category && line.test"
            class="line-test-path"
          >
            {{ line.category }}/{{ line.test }}
          </span>
          <span v-else-if="line.type === 'header'" class="line-header">{{ line.message }}</span>
          <span v-else-if="line.type === 'summary'" class="line-summary">{{ line.message }}</span>
          <span
            v-if="(line.type === 'test' || line.type === 'info') && line.message"
            class="line-message"
            :title="line.message"
            >{{ line.message }}</span
          >
        </div>
        <div v-if="consoleLines.length === 0" class="console-empty">
          <span class="console-prompt">$</span> Нажмите [RUN ALL TESTS] для запуска тестов
        </div>
      </div>

      <div class="tests-categories">
        <div v-for="category in TEST_CATEGORIES" :key="category.name" class="category-section">
          <h2 class="category-title">
            <i :class="['fa-solid', category.icon]"></i>
            {{ category.title }}
          </h2>
          <div class="tests-list">
            <div
              v-for="test in category.tests"
              :key="test.name"
              :class="[
                'test-item',
                {
                  'test-pending': testStatuses[category.name]?.[test.name] === 'pending',
                  'test-running': testStatuses[category.name]?.[test.name] === 'running',
                  'test-passed': testStatuses[category.name]?.[test.name] === 'passed',
                  'test-failed': testStatuses[category.name]?.[test.name] === 'failed'
                }
              ]"
            >
              <div class="test-info">
                <span class="test-status-indicator">
                  <span
                    v-if="testStatuses[category.name]?.[test.name] === 'pending'"
                    class="indicator-pending"
                    >[ ]</span
                  >
                  <span
                    v-else-if="testStatuses[category.name]?.[test.name] === 'running'"
                    class="indicator-running"
                    >[...]</span
                  >
                  <span
                    v-else-if="testStatuses[category.name]?.[test.name] === 'passed'"
                    class="indicator-ok"
                    >[OK]</span
                  >
                  <span
                    v-else-if="testStatuses[category.name]?.[test.name] === 'failed'"
                    class="indicator-error"
                    >[ERROR]</span
                  >
                </span>
                <span class="test-description">{{ test.description }}</span>
              </div>
              <button
                @click="runSingleTest(category.name, test.name)"
                :disabled="isRunning || testStatuses[category.name]?.[test.name] === 'running'"
                class="test-run-button"
              >
                [RUN]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tests-page {
  min-height: 100vh;
  padding: 2rem;
  position: relative;
  z-index: 100;
  color: var(--color-text);
}

.tests-container {
  max-width: 1200px;
  margin: 0 auto;
}

.tests-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 1.5rem;
  font-weight: normal;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
  color: var(--color-text);
  text-transform: uppercase;
}

.stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.stat-item {
  font-family: 'Share Tech Mono', monospace;
}

.stat-success {
  color: var(--color-success);
}

.stat-error {
  color: var(--color-error);
}

.run-button {
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.05em;
}

.run-button:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
  box-shadow: 0 0 10px rgba(211, 35, 75, 0.3);
}

.run-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.console-output {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  margin-bottom: 2rem;
  max-height: 500px;
  overflow-y: auto;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  min-height: 200px;
}

.console-line {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0; /* Позволяет flex-элементам сжиматься */
}

.line-timestamp {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.line-status {
  flex-shrink: 0;
  white-space: nowrap; /* Статус не переносится */
}

.line-test-path {
  color: var(--color-text-tertiary);
  font-size: 0.8em;
  flex-shrink: 0;
  margin-right: 0.5rem;
  font-family: 'Share Tech Mono', monospace;
}

.status-ok {
  color: var(--color-success);
  font-weight: bold;
}

.status-error {
  color: var(--color-error);
  font-weight: bold;
}

.status-running {
  color: #00aaff;
  animation: blink 1s infinite;
}

.status-info {
  color: #88ccff;
  font-weight: normal;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0.3;
  }
}

.line-header {
  color: var(--color-accent);
  font-weight: bold;
}

.line-summary {
  color: var(--color-text);
  font-weight: bold;
}

.line-message {
  color: var(--color-text-secondary);
  flex: 1;
  min-width: 0; /* Позволяет тексту переноситься */
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap; /* Сохраняет переносы строк */
}

.line-summary.status-failed {
  color: var(--color-error);
}

.line-summary.status-passed {
  color: var(--color-success);
}

.console-empty {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.console-prompt {
  color: var(--color-accent);
  margin-right: 0.5rem;
}

.tests-categories {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.category-section {
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
}

.category-title {
  font-size: 1.125rem;
  font-weight: normal;
  margin-bottom: 1rem;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  letter-spacing: 0.05em;
}

.tests-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.test-item:hover {
  border-color: var(--color-border-light);
  background: rgba(0, 0, 0, 0.4);
}

.test-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.test-status-indicator {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.875rem;
  flex-shrink: 0;
  min-width: 50px;
}

.indicator-pending {
  color: var(--color-text-tertiary);
}

.indicator-running {
  color: #00aaff;
  animation: blink 1s infinite;
}

.indicator-ok {
  color: var(--color-success);
  font-weight: bold;
}

.indicator-error {
  color: var(--color-error);
  font-weight: bold;
}

.test-description {
  color: var(--color-text);
  font-size: 0.875rem;
}

.test-run-button {
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.05em;
}

.test-run-button:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.test-run-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Scrollbar стилизация */
.console-output::-webkit-scrollbar {
  width: 8px;
}

.console-output::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.console-output::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.console-output::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-light);
}
</style>

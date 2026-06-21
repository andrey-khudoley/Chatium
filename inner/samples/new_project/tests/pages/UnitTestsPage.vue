<script setup lang="ts">
declare const ctx: any

import { ref, onMounted, onUnmounted, computed } from 'vue'
import {
  apiRunAllTestsRoute,
  apiRunSingleTestRoute,
  apiGetManualSocketIdRoute
} from '../api/start-tests'
import { TEST_CATEGORIES } from '../shared/test-definitions'
import { getOrCreateBrowserSocketClient } from '@app/socket'

interface TestResult {
  success: boolean
  message: string
}

type ConsoleLevel = 'info' | 'warn' | 'error'

interface ConsoleLine {
  id: string
  timestamp: string
  category: string
  test: string
  status: 'running' | 'passed' | 'failed' | 'info'
  level: ConsoleLevel
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
const levelFilters = ref<Record<ConsoleLevel, boolean>>({
  info: true,
  warn: true,
  error: true
})

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

const filteredConsoleLines = computed(() => {
  return consoleLines.value.filter((line) => levelFilters.value[line.level])
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
        level: 'info',
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
        level: 'info',
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
        level: 'info',
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
          level: result.success ? 'info' : 'error',
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
          level: result.success ? 'info' : 'error',
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
          level: 'error',
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
        level: 'info',
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
        level: 'error',
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
      }
      if (!status || status === 'pending' || status === 'running') {
        allCompleted = false
      }
    }
  }

  if (allCompleted && !hasRunning) {
    isRunning.value = false

    addConsoleLine({
      id: `summary-${Date.now()}`,
      timestamp: getTimestamp(),
      category: '',
      test: '',
      status: 'passed',
      level: 'info',
      type: 'summary',
      message: `Тесты завершены. Успешно: ${stats.value.passed}, Ошибок: ${stats.value.failed}`
    })
  }
}

async function startAllTests() {
  console.log('[CLIENT] startAllTests вызван')

  if (isRunning.value) {
    console.log('[CLIENT] Тесты уже выполняются, выход')
    return
  }

  try {
    isRunning.value = true
    consoleLines.value = []
    console.log('[CLIENT] Флаг isRunning установлен, консоль очищена')

    // Сбрасываем статусы и результаты
    testResults.value = {}
    testStatuses.value = {}
    console.log('[CLIENT] Результаты и статусы сброшены')

    const timestamp = getTimestamp()
    addConsoleLine({
      id: `header-start-${Date.now()}`,
      timestamp,
      category: '',
      test: '',
      status: 'info',
      level: 'info',
      type: 'header',
      message: 'Запуск всех тестов...'
    })
    console.log('[CLIENT] Заголовок добавлен в консоль')

    console.log('[CLIENT] Вызов API apiRunAllTestsRoute.run(ctx)')
    const result = await apiRunAllTestsRoute.run(ctx)
    console.log('[CLIENT] Результат API вызова:', result)

    if (!result.success) {
      console.error('[CLIENT] Ошибка запуска всех тестов:', result.error)
      isRunning.value = false
      addConsoleLine({
        id: `error-start-${Date.now()}`,
        timestamp: getTimestamp(),
        category: '',
        test: '',
        status: 'failed',
        level: 'error',
        type: 'test',
        message: `Ошибка запуска тестов: ${result.error || 'Неизвестная ошибка'}`
      })
      return
    }

    currentTestRunId.value = result.testRunId
    console.log('[CLIENT] testRunId установлен:', result.testRunId)

    if (result.encodedSocketId) {
      console.log('[CLIENT] Подписка на WebSocket с encodedSocketId:', result.encodedSocketId)
      await subscribeToSocket(result.encodedSocketId)
      console.log('[CLIENT] Подписка на WebSocket установлена')
    } else {
      console.warn('[CLIENT] encodedSocketId не получен из API')
    }
  } catch (error: any) {
    console.error('[CLIENT] Критическая ошибка в startAllTests:', error)
    console.error('[CLIENT] Stack trace:', error?.stack)

    isRunning.value = false
    addConsoleLine({
      id: `error-start-${Date.now()}`,
      timestamp: getTimestamp(),
      category: '',
      test: '',
      status: 'failed',
      level: 'error',
      type: 'test',
      message: `Критическая ошибка: ${error?.message || error}`
    })
  }
}

async function ensureManualSocketSubscription() {
  if (socketSubscription.value && currentEncodedSocketId.value) {
    return
  }

  const res = await apiGetManualSocketIdRoute.run(ctx, {})
  if (!res.success || !res.encodedSocketId) {
    console.error(
      '[UnitTestsPage] Не удалось получить encodedSocketId для ручных тестов',
      res.error
    )
    return
  }

  await subscribeToSocket(res.encodedSocketId)
}

async function runSingleTest(categoryName: string, testName: string) {
  console.log('[CLIENT] runSingleTest вызван:', { categoryName, testName })

  try {
    console.log('[CLIENT] Проверка подписки на WebSocket...')
    await ensureManualSocketSubscription()
    console.log('[CLIENT] Подписка на WebSocket установлена')

    if (!testStatuses.value[categoryName]) {
      testStatuses.value[categoryName] = {}
    }
    testStatuses.value[categoryName][testName] = 'running'
    console.log('[CLIENT] Статус теста установлен: running')

    const timestamp = getTimestamp()
    const test = TEST_CATEGORIES.find((c) => c.name === categoryName)?.tests.find(
      (t) => t.name === testName
    )
    console.log('[CLIENT] Тест найден:', test)

    addConsoleLine({
      id: `manual-${categoryName}-${testName}-${Date.now()}`,
      timestamp,
      category: categoryName,
      test: testName,
      status: 'running',
      level: 'info',
      type: 'test',
      message: test?.description || testName
    })
    console.log('[CLIENT] Лог в консоль добавлен')

    console.log('[CLIENT] Вызов API apiRunSingleTestRoute.run с параметрами:', {
      route: 'apiRunSingleTestRoute',
      params: { category: categoryName, test: testName }
    })

    const result = await apiRunSingleTestRoute.run(ctx, {
      category: categoryName,
      test: testName
    })

    console.log('[CLIENT] Результат API вызова:', result)

    if (!result.success) {
      console.error('[CLIENT] Тест завершился с ошибкой:', result.error)
      testStatuses.value[categoryName][testName] = 'failed'

      addConsoleLine({
        id: `manual-error-${categoryName}-${testName}-${Date.now()}`,
        timestamp: getTimestamp(),
        category: categoryName,
        test: testName,
        status: 'failed',
        level: 'error',
        type: 'test',
        message: `Ошибка запуска теста: ${result.error || 'Неизвестная ошибка'}`
      })
    } else {
      // Одиночный тест: результат приходит в HTTP-ответе, WebSocket не используется
      const testResult = result.result as TestResult
      if (!testResults.value[categoryName]) {
        testResults.value[categoryName] = {}
      }
      testResults.value[categoryName][testName] = testResult
      testStatuses.value[categoryName][testName] = testResult.success ? 'passed' : 'failed'

      const test = TEST_CATEGORIES.find((c) => c.name === categoryName)?.tests.find(
        (t) => t.name === testName
      )
      const message = `${test?.description || testName} - ${testResult.message}`

      // Обновляем строку консоли со статусом "running" на итоговый результат
      let lineIndex = -1
      for (let i = consoleLines.value.length - 1; i >= 0; i--) {
        const line = consoleLines.value[i]
        if (line.category === categoryName && line.test === testName && line.type === 'test') {
          lineIndex = i
          break
        }
      }
      if (lineIndex !== -1) {
        consoleLines.value[lineIndex] = {
          ...consoleLines.value[lineIndex],
          status: testResult.success ? 'passed' : 'failed',
          level: testResult.success ? 'info' : 'error',
          type: 'test',
          message
        }
      } else {
        addConsoleLine({
          id: `manual-${categoryName}-${testName}-done-${Date.now()}`,
          timestamp: getTimestamp(),
          category: categoryName,
          test: testName,
          status: testResult.success ? 'passed' : 'failed',
          level: testResult.success ? 'info' : 'error',
          type: 'test',
          message
        })
      }
    }
  } catch (error: any) {
    console.error('[CLIENT] Критическая ошибка в runSingleTest:', error)
    console.error('[CLIENT] Stack trace:', error?.stack)

    testStatuses.value[categoryName][testName] = 'failed'
    addConsoleLine({
      id: `manual-error-${categoryName}-${testName}-${Date.now()}`,
      timestamp: getTimestamp(),
      category: categoryName,
      test: testName,
      status: 'failed',
      level: 'error',
      type: 'test',
      message: `Критическая ошибка: ${error?.message || error}`
    })
  }
}

function getTestStatus(
  categoryName: string,
  testName: string
): 'pending' | 'running' | 'passed' | 'failed' {
  return testStatuses.value[categoryName]?.[testName] || 'pending'
}

function getStatusIcon(status: 'pending' | 'running' | 'passed' | 'failed'): string {
  switch (status) {
    case 'running':
      return 'fas fa-spinner fa-spin text-yellow-400'
    case 'passed':
      return 'fas fa-check text-[var(--color-success)]'
    case 'failed':
      return 'fas fa-xmark text-[var(--color-error)]'
    default:
      return 'fas fa-circle text-[var(--color-text-tertiary)]'
  }
}

function getStatusText(status: 'pending' | 'running' | 'passed' | 'failed'): string {
  switch (status) {
    case 'running':
      return 'Выполняется'
    case 'passed':
      return 'Успешно'
    case 'failed':
      return 'Ошибка'
    default:
      return 'Не запущен'
  }
}

function getLevelClass(level: ConsoleLevel): string {
  switch (level) {
    case 'error':
      return 'text-[var(--color-error)]'
    case 'warn':
      return 'text-yellow-300'
    default:
      return 'text-[var(--color-text-secondary)]'
  }
}

onMounted(async () => {
  // При монтировании пытаемся получить encodedSocketId для ручных тестов
  try {
    await ensureManualSocketSubscription()
  } catch (error: any) {
    console.error('[UnitTestsPage] Ошибка инициализации сокета:', error)
  }
})

onUnmounted(() => {
  if (socketSubscription.value && typeof socketSubscription.value.unsubscribe === 'function') {
    socketSubscription.value.unsubscribe()
  }
  socketSubscription.value = null
})
</script>

<template>
  <div class="relative min-h-screen flex items-stretch justify-center p-4 md:p-8">
    <div class="relative z-10 w-full max-w-6xl">
      <!-- Header -->
      <header class="mb-6 md:mb-8">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1
              class="text-2xl md:text-3xl font-normal text-[var(--color-text)] tracking-[0.2em] uppercase"
            >
              UNIT TESTS
            </h1>
            <p class="text-sm md:text-base text-[var(--color-text-secondary)] mt-2">
              Автоматические проверки инфраструктуры проекта
            </p>
          </div>
          <div class="flex flex-col items-start md:items-end gap-2">
            <button
              class="inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-text)] hover:bg-[var(--color-accent-medium)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="isRunning"
              @click="startAllTests"
            >
              <i v-if="isRunning" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-play"></i>
              <span class="tracking-[0.18em] uppercase text-xs">Запустить все тесты</span>
            </button>
            <div class="flex gap-3 text-xs text-[var(--color-text-tertiary)]">
              <span>Всего: {{ stats.total }}</span>
              <span class="text-[var(--color-success)]">Успешно: {{ stats.passed }}</span>
              <span class="text-[var(--color-error)]">Ошибок: {{ stats.failed }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Main content -->
      <div
        class="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] gap-4 md:gap-6 items-start"
      >
        <!-- Tests list -->
        <section
          class="bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)] p-4 md:p-5"
        >
          <div class="flex items-center justify-between mb-4 md:mb-5">
            <h2
              class="text-sm md:text-base tracking-[0.18em] uppercase text-[var(--color-text-secondary)]"
            >
              Категории тестов
            </h2>
          </div>

          <div class="space-y-4 md:space-y-5">
            <div
              v-for="category in TEST_CATEGORIES"
              :key="category.name"
              class="border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]"
            >
              <header
                class="px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between border-b border-[var(--color-border)] bg-[rgba(211,35,75,0.08)]"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-full border border-[var(--color-border-light)] flex items-center justify-center bg-[rgba(0,0,0,0.5)]"
                  >
                    <i :class="['fas', category.icon, 'text-[var(--color-accent)]']"></i>
                  </div>
                  <div>
                    <h3 class="text-sm md:text-base text-[var(--color-text)]">
                      {{ category.title }}
                    </h3>
                    <p class="text-xs text-[var(--color-text-tertiary)]">
                      {{ category.tests.length }} тест(ов)
                    </p>
                  </div>
                </div>
              </header>

              <div class="divide-y divide-[var(--color-border)]">
                <div
                  v-for="test in category.tests"
                  :key="`${category.name}/${test.name}`"
                  class="px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-3 md:gap-4"
                >
                  <div class="w-6 md:w-8 flex justify-center">
                    <i :class="getStatusIcon(getTestStatus(category.name, test.name))"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div
                      class="flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-2"
                    >
                      <div class="min-w-0">
                        <p class="text-xs md:text-sm text-[var(--color-text)] truncate">
                          {{ test.description }}
                        </p>
                        <p class="text-[10px] md:text-xs text-[var(--color-text-tertiary)] mt-0.5">
                          {{ category.name }}/{{ test.name }}
                        </p>
                      </div>
                      <div class="flex items-center gap-2 md:gap-3">
                        <span
                          class="inline-flex items-center justify-center px-2 py-0.5 border border-[var(--color-border-light)] text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]"
                        >
                          {{ getStatusText(getTestStatus(category.name, test.name)) }}
                        </span>
                        <button
                          class="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--color-border-light)] text-[10px] md:text-xs uppercase tracking-[0.18em] text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                          @click="runSingleTest(category.name, test.name)"
                        >
                          <i class="fas fa-play text-[10px]"></i>
                          <span>Запустить</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Console -->
        <section
          class="bg-[var(--color-bg-secondary)] border-2 border-[var(--color-border)] flex flex-col self-start"
        >
          <header
            class="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <i class="fas fa-terminal text-[var(--color-accent)]"></i>
              <span class="text-sm tracking-[0.18em] uppercase text-[var(--color-text-secondary)]">
                Консоль тестов
              </span>
            </div>
            <div class="flex items-center gap-3 text-[10px] text-[var(--color-text-tertiary)]">
              <label class="flex items-center gap-1 cursor-pointer">
                <input
                  v-model="levelFilters.info"
                  type="checkbox"
                  class="accent-[var(--color-accent)]"
                />
                <span class="uppercase tracking-[0.18em] text-[var(--color-text-secondary)]"
                  >info</span
                >
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input
                  v-model="levelFilters.warn"
                  type="checkbox"
                  class="accent-[var(--color-accent)]"
                />
                <span class="uppercase tracking-[0.18em] text-yellow-300">warn</span>
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input
                  v-model="levelFilters.error"
                  type="checkbox"
                  class="accent-[var(--color-accent)]"
                />
                <span class="uppercase tracking-[0.18em] text-[var(--color-error)]">error</span>
              </label>
              <span class="flex items-center gap-1 ml-1">
                <span class="w-2 h-2 rounded-full bg-[var(--color-success)]"></span>
                <span>WebSocket</span>
              </span>
            </div>
          </header>

          <div
            ref="consoleContainer"
            class="flex-1 max-h-[70vh] overflow-y-auto px-3 md:px-4 py-3 md:py-4 text-[11px] md:text-xs font-mono bg-[radial-gradient(circle_at_top,_rgba(211,35,75,0.12),_transparent_55%),_var(--color-bg-secondary)]"
          >
            <div v-if="consoleLines.length === 0" class="text-[var(--color-text-tertiary)] italic">
              Нажмите «Запустить все тесты» или кнопку «Запустить» рядом с конкретным тестом, чтобы
              увидеть вывод.
            </div>

            <div
              v-for="line in filteredConsoleLines"
              :key="line.id"
              class="whitespace-pre-wrap leading-relaxed"
            >
              <span class="text-[var(--color-text-tertiary)] mr-2">[{{ line.timestamp }}]</span>
              <span
                class="mr-2 text-[10px] uppercase tracking-[0.18em]"
                :class="getLevelClass(line.level)"
              >
                {{ line.level }}
              </span>

              <template v-if="line.type === 'header'">
                <span class="text-[var(--color-accent)] font-semibold">{{ line.message }}</span>
              </template>

              <template v-else-if="line.type === 'summary'">
                <span class="text-[var(--color-success)] font-semibold">{{ line.message }}</span>
              </template>

              <template v-else-if="line.type === 'info'">
                <span class="text-[var(--color-text-secondary)]">{{ line.message }}</span>
              </template>

              <template v-else>
                <span
                  v-if="line.category && line.test"
                  class="text-[var(--color-text-tertiary)] mr-2"
                >
                  {{ line.category }}/{{ line.test }}:
                </span>
                <span
                  :class="{
                    'text-[var(--color-success)]': line.status === 'passed',
                    'text-[var(--color-error)]': line.status === 'failed',
                    'text-[var(--color-text-secondary)]': line.status === 'running'
                  }"
                >
                  {{ line.message }}
                </span>
              </template>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

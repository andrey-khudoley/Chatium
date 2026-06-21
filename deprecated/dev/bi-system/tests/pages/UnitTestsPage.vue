<template>
  <div class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
    <div class="bg-[var(--color-bg-secondary)] shadow-md border-b-4 border-[var(--color-primary)]">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div
              class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg"
            >
              <i class="fas fa-flask text-white text-xl"></i>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-[var(--color-text)]">Unit Tests</h1>
              <p class="text-sm text-[var(--color-text-secondary)]">Заготовка аналитики</p>
            </div>
          </div>

          <button @click="runAllTests" :disabled="running" class="btn btn-primary">
            <i :class="['fas', running ? 'fa-spinner fa-spin' : 'fa-play', 'mr-2']"></i>
            {{ running ? 'Выполняется...' : 'Запустить все тесты' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="testsCompleted"
      class="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]"
    >
      <div class="container mx-auto px-4 py-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            class="text-center p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
          >
            <div class="text-3xl font-bold text-[var(--color-text)]">{{ totalTests }}</div>
            <div class="text-sm text-[var(--color-text-secondary)] mt-1">Всего тестов</div>
          </div>
          <div
            class="text-center p-4 rounded-lg bg-[var(--color-success-light)] border border-[var(--color-success)]"
          >
            <div class="text-3xl font-bold" style="color: var(--color-success)">
              {{ passedTests }}
            </div>
            <div class="text-sm text-[var(--color-text-secondary)] mt-1">Пройдено</div>
          </div>
          <div
            class="text-center p-4 rounded-lg bg-[var(--color-danger-light)] border border-[var(--color-danger)]"
          >
            <div class="text-3xl font-bold" style="color: var(--color-danger)">
              {{ failedTests }}
            </div>
            <div class="text-sm text-[var(--color-text-secondary)] mt-1">Провалено</div>
          </div>
          <div
            class="text-center p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
          >
            <div class="text-3xl font-bold text-[var(--color-text)]">{{ duration }}мс</div>
            <div class="text-sm text-[var(--color-text-secondary)] mt-1">Время выполнения</div>
          </div>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-4 py-8">
      <div v-for="category in testCategories" :key="category.name" class="mb-6">
        <div class="card">
          <div
            class="px-6 py-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
            @click="toggleCategory(category.name)"
          >
            <div class="flex items-center space-x-3">
              <i :class="['fas', category.icon]" style="color: var(--color-primary)"></i>
              <h2 class="text-lg font-semibold text-[var(--color-text)]">{{ category.title }}</h2>
              <span class="text-sm text-[var(--color-text-secondary)]"
                >({{ category.tests.length }} тестов)</span
              >
            </div>

            <div class="flex items-center space-x-4">
              <div
                v-if="getCategoryStats(category.name).total > 0"
                class="flex items-center space-x-2 text-sm"
              >
                <span style="color: var(--color-success)">
                  <i class="fas fa-check-circle"></i> {{ getCategoryStats(category.name).passed }}
                </span>
                <span style="color: var(--color-danger)">
                  <i class="fas fa-times-circle"></i> {{ getCategoryStats(category.name).failed }}
                </span>
              </div>

              <button
                @click.stop="runCategoryTests(category.name)"
                :disabled="running"
                class="btn btn-primary text-sm"
                style="padding: 0.25rem 1rem"
              >
                <i class="fas fa-play mr-1"></i>
                Запустить
              </button>

              <i
                :class="[
                  'fas',
                  expandedCategories[category.name] ? 'fa-chevron-up' : 'fa-chevron-down',
                  'text-[var(--color-text-tertiary)]'
                ]"
              ></i>
            </div>
          </div>

          <div v-show="expandedCategories[category.name]" class="p-6">
            <div class="space-y-4">
              <div
                v-for="test in category.tests"
                :key="test.name"
                :class="[
                  'p-4 rounded-lg border-2 transition-all',
                  test.status === 'passed'
                    ? 'bg-[var(--color-success-light)] border-[var(--color-success)]'
                    : test.status === 'failed'
                      ? 'bg-[var(--color-danger-light)] border-[var(--color-danger)]'
                      : test.status === 'running'
                        ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)]'
                        : 'bg-[var(--color-bg)] border-[var(--color-border)]'
                ]"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                      <i
                        :class="[
                          'fas',
                          test.status === 'passed'
                            ? 'fa-check-circle'
                            : test.status === 'failed'
                              ? 'fa-times-circle'
                              : test.status === 'running'
                                ? 'fa-spinner fa-spin'
                                : 'fa-circle'
                        ]"
                        :style="{
                          color:
                            test.status === 'passed'
                              ? 'var(--color-success)'
                              : test.status === 'failed'
                                ? 'var(--color-danger)'
                                : test.status === 'running'
                                  ? 'var(--color-primary)'
                                  : 'var(--color-text-tertiary)'
                        }"
                      ></i>
                      <h3 class="font-semibold text-[var(--color-text)]">{{ test.name }}</h3>
                    </div>

                    <p class="text-sm text-[var(--color-text-secondary)] mb-2">
                      {{ test.description }}
                    </p>

                    <div
                      v-if="test.status === 'passed'"
                      class="text-sm flex items-center"
                      style="color: var(--color-success)"
                    >
                      <i class="fas fa-check-circle mr-2"></i>
                      <span>Тест пройден успешно</span>
                      <span v-if="test.duration" class="ml-2 text-[var(--color-text-secondary)]"
                        >({{ test.duration }}мс)</span
                      >
                    </div>

                    <div v-if="test.status === 'failed'" class="space-y-2">
                      <div class="text-sm flex items-center" style="color: var(--color-danger)">
                        <i class="fas fa-exclamation-triangle mr-2"></i>
                        <span>{{ test.error || 'Тест провален' }}</span>
                      </div>
                      <div
                        v-if="test.details"
                        class="text-xs bg-[var(--color-danger-light)] p-3 rounded font-mono whitespace-pre-wrap border border-[var(--color-danger)]"
                        style="color: var(--color-danger)"
                      >
                        {{ test.details }}
                      </div>
                    </div>

                    <div
                      v-if="test.status === 'running'"
                      class="text-sm flex items-center"
                      style="color: var(--color-primary)"
                    >
                      <i class="fas fa-spinner fa-spin mr-2"></i>
                      <span>Выполняется...</span>
                    </div>
                  </div>

                  <button
                    @click="runSingleTest(category.name, test.name)"
                    :disabled="running || test.status === 'running'"
                    class="ml-4 px-3 py-1.5 bg-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text)] text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--color-border)]"
                  >
                    <i class="fas fa-redo mr-1"></i>
                    Повторить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { apiGetTestsListRoute, apiRunSingleTestRoute } from '../api/run-tests'

const testCategories = ref([])
const running = ref(false)
const testsCompleted = ref(false)
const duration = ref(0)

const expandedCategories = reactive({})

const totalTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => sum + cat.tests.length, 0)
})

const passedTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => {
    return sum + cat.tests.filter((t) => t.status === 'passed').length
  }, 0)
})

const failedTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => {
    return sum + cat.tests.filter((t) => t.status === 'failed').length
  }, 0)
})

onMounted(async () => {
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  const result = await apiGetTestsListRoute.run(ctx)
  if (result.success) {
    testCategories.value = result.categories.map((cat) => ({
      ...cat,
      tests: cat.tests.map((t) => ({
        ...t,
        status: 'pending',
        error: '',
        details: '',
        duration: 0
      }))
    }))

    // Все разделы открыты по умолчанию
    result.categories.forEach((cat) => {
      expandedCategories[cat.name] = true
    })
  }
})

async function runAllTests() {
  running.value = true
  testsCompleted.value = false
  const startTime = Date.now()

  testCategories.value.forEach((category) => {
    category.tests.forEach((test) => {
      test.status = 'pending'
      test.error = ''
      test.details = ''
      test.duration = 0
    })
  })

  for (const category of testCategories.value) {
    await runCategoryTests(category.name, false)
  }

  duration.value = Date.now() - startTime
  testsCompleted.value = true
  running.value = false
}

async function runCategoryTests(categoryName, setRunning = true) {
  if (setRunning) running.value = true

  const category = testCategories.value.find((c) => c.name === categoryName)
  if (!category) {
    if (setRunning) running.value = false
    return
  }

  for (const test of category.tests) {
    await runTest(categoryName, test.name)
  }

  if (setRunning) running.value = false
}

async function runSingleTest(categoryName, testName) {
  running.value = true
  await runTest(categoryName, testName)
  running.value = false
}

async function runTest(categoryName, testName) {
  const category = testCategories.value.find((c) => c.name === categoryName)
  if (!category) return

  const test = category.tests.find((t) => t.name === testName)
  if (!test) return

  test.status = 'running'
  test.error = ''
  test.details = ''

  const startTime = Date.now()

  try {
    const result = await apiRunSingleTestRoute.run(ctx, {
      category: categoryName,
      testName
    })

    test.status = result.success ? 'passed' : 'failed'
    test.error = result.error || ''
    test.details = result.stack || ''
  } catch (error) {
    test.status = 'failed'
    test.error = error.message
    test.details = error.stack || ''
  }

  test.duration = Date.now() - startTime
}

function getCategoryStats(categoryName) {
  const category = testCategories.value.find((c) => c.name === categoryName)
  if (!category) return { total: 0, passed: 0, failed: 0 }

  return {
    total: category.tests.length,
    passed: category.tests.filter((t) => t.status === 'passed').length,
    failed: category.tests.filter((t) => t.status === 'failed').length
  }
}

function toggleCategory(name) {
  expandedCategories[name] = !expandedCategories[name]
}
</script>

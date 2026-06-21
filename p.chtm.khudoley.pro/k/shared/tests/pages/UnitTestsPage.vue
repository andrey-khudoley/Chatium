<template>
  <div class="min-h-screen" style="background: var(--color-bg); color: var(--color-text);">
    <!-- Хедер -->
    <div class="bg-white dark:bg-gray-800 shadow-md border-b-4 border-primary">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center space-x-3">
            <i class="fas fa-flask text-primary text-2xl"></i>
            <div>
              <h1 class="text-2xl font-bold" style="color: var(--color-text);">Unit Tests - Knowledge App</h1>
              <p class="text-sm" style="color: var(--color-text-secondary);">Комплексное тестирование множественного выбора и API</p>
            </div>
          </div>
          
          <button 
            @click="runAllTests"
            :disabled="running"
            class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <i :class="['fas', running ? 'fa-spinner fa-spin' : 'fa-play']"></i>
            <span>{{ running ? 'Выполняется...' : 'Запустить все тесты' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Статистика -->
    <div v-if="testsCompleted" class="bg-white dark:bg-gray-800 border-b" style="border-color: var(--color-border);">
      <div class="container mx-auto px-4 py-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-3xl font-bold" style="color: var(--color-text);">{{ totalTests }}</div>
            <div class="text-sm" style="color: var(--color-text-secondary);">Всего тестов</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold" style="color: var(--color-success);">{{ passedTests }}</div>
            <div class="text-sm" style="color: var(--color-text-secondary);">Пройдено</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold" style="color: var(--color-danger);">{{ failedTests }}</div>
            <div class="text-sm" style="color: var(--color-text-secondary);">Провалено</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold" style="color: var(--color-text-secondary);">{{ duration }}мс</div>
            <div class="text-sm" style="color: var(--color-text-secondary);">Время выполнения</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Категории тестов -->
    <div class="container mx-auto px-4 py-8 max-w-6xl">
      <div v-for="category in testCategories" :key="category.name" class="mb-6">
        <div class="card">
          <div 
            class="flex items-center justify-between cursor-pointer mb-4 pb-4"
            style="border-bottom: 1.5px solid var(--color-border);"
            @click="toggleCategory(category.name)"
          >
            <div class="flex items-center space-x-3">
              <i :class="['fas', category.icon, 'text-primary']"></i>
              <h2 class="text-xl font-bold" style="color: var(--color-text);">{{ category.title }}</h2>
              <span class="text-sm" style="color: var(--color-text-tertiary);">({{ category.tests.length }} тестов)</span>
            </div>
            
            <div class="flex items-center space-x-4">
              <div v-if="getCategoryStats(category.name).total > 0" class="flex items-center space-x-2 text-sm">
                <span style="color: var(--color-success);">
                  <i class="fas fa-check-circle"></i> {{ getCategoryStats(category.name).passed }}
                </span>
                <span style="color: var(--color-danger);">
                  <i class="fas fa-times-circle"></i> {{ getCategoryStats(category.name).failed }}
                </span>
              </div>
              
              <button
                @click.stop="runCategoryTests(category.name)"
                :disabled="running"
                class="px-4 py-1 bg-primary text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:bg-gray-400"
              >
                <i class="fas fa-play mr-1"></i>
                Запустить
              </button>
              
              <i :class="['fas', expandedCategories[category.name] ? 'fa-chevron-up' : 'fa-chevron-down']" style="color: var(--color-text-tertiary);"></i>
            </div>
          </div>
          
          <!-- Тесты -->
          <div v-if="expandedCategories[category.name]" class="space-y-3">
            <div 
              v-for="test in category.tests" 
              :key="test.name"
              :class="[
                'p-4 rounded-lg border-2 transition-all',
                test.status === 'passed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                test.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                test.status === 'running' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              ]"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <i 
                      :class="[
                        'fas',
                        test.status === 'passed' ? 'fa-check-circle text-green-600' :
                        test.status === 'failed' ? 'fa-times-circle text-red-600' :
                        test.status === 'running' ? 'fa-spinner fa-spin text-blue-600' :
                        'fa-circle text-gray-400'
                      ]"
                    ></i>
                    <h3 class="font-semibold" style="color: var(--color-text);">{{ test.name }}</h3>
                  </div>
                  
                  <p class="text-sm mb-2" style="color: var(--color-text-secondary);">{{ test.description }}</p>
                  
                  <!-- Успех -->
                  <div v-if="test.status === 'passed'" class="text-sm" style="color: var(--color-success);">
                    <i class="fas fa-info-circle mr-1"></i>
                    {{ test.message || 'Тест пройден успешно' }}
                    <span v-if="test.duration" class="ml-2" style="color: var(--color-text-tertiary);">({{ test.duration }}мс)</span>
                  </div>
                  
                  <!-- Ошибка -->
                  <div v-if="test.status === 'failed'" class="space-y-2">
                    <div class="text-sm" style="color: var(--color-danger);">
                      <i class="fas fa-exclamation-triangle mr-1"></i>
                      {{ test.error || 'Тест провален' }}
                    </div>
                    <div v-if="test.details" class="text-xs bg-red-100 dark:bg-red-900/40 p-2 rounded font-mono whitespace-pre-wrap" style="color: var(--color-danger);">
                      {{ test.details }}
                    </div>
                  </div>
                </div>
                
                <button
                  @click="runSingleTest(category.name, test.name)"
                  :disabled="running || test.status === 'running'"
                  class="ml-4 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style="color: var(--color-text);"
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
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { apiGetTestsListRoute, apiRunSingleTestRoute } from '../api/run-tests'

interface Test {
  name: string
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  message?: string
  error?: string
  details?: string
  duration?: number
}

interface TestCategory {
  name: string
  title: string
  icon: string
  tests: Test[]
}

const testCategories = ref<TestCategory[]>([])
const running = ref(false)
const testsCompleted = ref(false)
const duration = ref(0)

const expandedCategories = reactive<Record<string, boolean>>({})

const totalTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => sum + cat.tests.length, 0)
})

const passedTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => {
    return sum + cat.tests.filter(t => t.status === 'passed').length
  }, 0)
})

const failedTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => {
    return sum + cat.tests.filter(t => t.status === 'failed').length
  }, 0)
})

function getCategoryStats(categoryName: string) {
  const category = testCategories.value.find(c => c.name === categoryName)
  if (!category) return { total: 0, passed: 0, failed: 0 }
  
  return {
    total: category.tests.length,
    passed: category.tests.filter(t => t.status === 'passed').length,
    failed: category.tests.filter(t => t.status === 'failed').length
  }
}

function toggleCategory(name: string) {
  expandedCategories[name] = !expandedCategories[name]
}

async function runAllTests() {
  running.value = true
  testsCompleted.value = false
  const startTime = Date.now()
  
  // Сбрасываем все тесты
  testCategories.value.forEach(category => {
    category.tests.forEach(test => {
      test.status = 'pending'
      test.message = ''
      test.error = ''
      test.details = ''
      test.duration = 0
    })
  })
  
  // Запускаем тесты по категориям
  for (const category of testCategories.value) {
    await runCategoryTests(category.name, false)
  }
  
  duration.value = Date.now() - startTime
  testsCompleted.value = true
  running.value = false
}

async function runCategoryTests(categoryName: string, setRunning = true) {
  if (setRunning) running.value = true
  
  const category = testCategories.value.find(c => c.name === categoryName)
  if (!category) {
    if (setRunning) running.value = false
    return
  }
  
  for (const test of category.tests) {
    await runTest(categoryName, test.name)
  }
  
  if (setRunning) running.value = false
}

async function runSingleTest(categoryName: string, testName: string) {
  running.value = true
  await runTest(categoryName, testName)
  running.value = false
}

async function runTest(categoryName: string, testName: string) {
  const category = testCategories.value.find(c => c.name === categoryName)
  if (!category) return
  
  const test = category.tests.find(t => t.name === testName)
  if (!test) return
  
  test.status = 'running'
  test.message = ''
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
    test.duration = result.duration || 0
  } catch (error: any) {
    test.status = 'failed'
    test.error = error.message
    test.details = error.stack || ''
  }
  
  test.duration = Date.now() - startTime
}

onMounted(async () => {
  const result = await apiGetTestsListRoute.run(ctx)
  if (result.success) {
    testCategories.value = result.categories.map((cat: any) => ({
      ...cat,
      tests: cat.tests.map((t: any) => ({
        ...t,
        status: 'pending',
        error: '',
        details: '',
        duration: 0
      }))
    }))
    
    // Раскрываем все категории по умолчанию
    result.categories.forEach((cat: any) => {
      expandedCategories[cat.name] = true
    })
  }
})
</script>

<style scoped>
.card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg) 100%);
  border: 1.5px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.card:hover {
  box-shadow: var(--shadow-md);
}
</style>


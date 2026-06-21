<template>
  <div
    class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col"
    @animationend="onAppLayoutAnimationEnd"
  >
    <GlobalGlitch />
    <Header
      v-if="bootLoaderDone"
      :projectTitle="props.projectTitle"
      :indexUrl="props.indexUrl"
      :uiUrl="props.uiUrl"
      :testsUrl="props.testsUrl"
    />
    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <!-- Кнопка запуска и статистика -->
        <div v-if="bootLoaderDone" class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            @click="runAllTests"
            :disabled="running"
            class="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <i :class="['fas', running ? 'fa-spinner fa-spin' : 'fa-play']"></i>
            <span>{{ running ? 'Выполняется...' : 'Запустить все тесты' }}</span>
          </button>
          <div v-if="testsCompleted" class="flex items-center gap-6 text-[var(--color-text-secondary)]">
            <span class="text-[var(--color-text)]"><span class="font-bold">{{ totalTests }}</span> всего</span>
            <span class="text-green-400"><i class="fas fa-check-circle mr-1"></i><span class="font-bold">{{ passedTests }}</span> пройдено</span>
            <span class="text-red-400"><i class="fas fa-times-circle mr-1"></i><span class="font-bold">{{ failedTests }}</span> провалено</span>
            <span><span class="font-bold">{{ duration }}</span>мс</span>
          </div>
        </div>

        <!-- Категории тестов -->
        <div class="space-y-4">
          <div
            v-for="category in testCategories"
            :key="category.name"
            class="tests-category rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          >
            <div
              class="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors"
              @click="toggleCategory(category.name)"
            >
              <div class="flex items-center gap-3">
                <i :class="['fas', category.icon, 'text-[var(--color-accent)]']"></i>
                <h2 class="text-lg font-semibold text-[var(--color-text)]">{{ category.title }}</h2>
                <span class="text-sm text-[var(--color-text-tertiary)]">({{ category.tests.length }} тестов)</span>
              </div>
              <div class="flex items-center gap-4">
                <div v-if="getCategoryStats(category.name).total > 0" class="flex items-center gap-2 text-sm">
                  <span class="text-green-400"><i class="fas fa-check-circle"></i> {{ getCategoryStats(category.name).passed }}</span>
                  <span class="text-red-400"><i class="fas fa-times-circle"></i> {{ getCategoryStats(category.name).failed }}</span>
                </div>
                <button
                  @click.stop="runCategoryTests(category.name)"
                  :disabled="running"
                  class="px-4 py-1 bg-[var(--color-accent)] text-white text-sm rounded hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-60"
                >
                  <i class="fas fa-play mr-1"></i>
                  Запустить
                </button>
                <i :class="['fas', expandedCategories[category.name] ? 'fa-chevron-up' : 'fa-chevron-down', 'text-[var(--color-text-tertiary)]']"></i>
              </div>
            </div>
            <div v-show="expandedCategories[category.name]" class="p-6">
              <div class="space-y-3">
                <div
                  v-for="test in category.tests"
                  :key="test.name"
                  :class="[
                    'p-4 rounded-lg border transition-all',
                    test.status === 'passed' ? 'bg-green-900/20 border-green-600/50' :
                    test.status === 'failed' ? 'bg-red-900/20 border-red-600/50' :
                    test.status === 'running' ? 'bg-[var(--color-accent-light)] border-[var(--color-accent)]' :
                    'bg-[var(--color-bg-tertiary)] border-[var(--color-border)]'
                  ]"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <i
                          :class="[
                            'fas',
                            test.status === 'passed' ? 'fa-check-circle text-green-400' :
                            test.status === 'failed' ? 'fa-times-circle text-red-400' :
                            test.status === 'running' ? 'fa-spinner fa-spin text-[var(--color-accent)]' :
                            'fa-circle text-[var(--color-text-tertiary)]'
                          ]"
                        ></i>
                        <h3 class="font-semibold text-[var(--color-text)]">{{ test.name }}</h3>
                      </div>
                      <p class="text-sm text-[var(--color-text-secondary)] mb-2">{{ test.description }}</p>
                      <div v-if="test.status === 'passed'" class="text-sm text-green-400">
                        <i class="fas fa-info-circle mr-1"></i>
                        Тест пройден успешно
                        <span v-if="test.duration" class="ml-2 text-[var(--color-text-tertiary)]">({{ test.duration }}мс)</span>
                      </div>
                      <div v-if="test.status === 'failed'" class="space-y-2">
                        <div class="text-sm text-red-400">
                          <i class="fas fa-exclamation-triangle mr-1"></i>
                          {{ test.error || 'Тест провален' }}
                        </div>
                        <div v-if="test.details" class="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] p-2 rounded font-mono text-[var(--color-text-secondary)] whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {{ test.details }}
                        </div>
                      </div>
                    </div>
                    <button
                      @click="runSingleTest(category.name, test.name)"
                      :disabled="running || test.status === 'running'"
                      class="ml-4 px-3 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text)] border border-[var(--color-border)] text-sm rounded hover:border-[var(--color-border-light)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
    </main>
    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import Header from '../../components/Header.vue'
import GlobalGlitch from '../../components/GlobalGlitch.vue'
import AppFooter from '../../components/AppFooter.vue'
import { apiGetTestsListRoute, apiRunSingleTestRoute } from '../api/run-tests'

declare const ctx: app.Ctx

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  uiUrl: string
  testsUrl: string
}>()

const testCategories = ref<Array<{
  name: string
  title: string
  icon: string
  tests: Array<{
    name: string
    description: string
    status: string
    error: string
    details: string
    duration: number
  }>
>>([])
const running = ref(false)
const testsCompleted = ref(false)
const duration = ref(0)
const bootLoaderDone = ref(false)
const expandedCategories = reactive<Record<string, boolean>>({})

function onAppLayoutAnimationEnd(e: AnimationEvent) {
  if (e.animationName === 'crt-power-on') {
    (e.target as HTMLElement).classList.add('app-layout-appeared')
  }
}

function startAnimations() {
  bootLoaderDone.value = true
}

function triggerGlitch() {
  const appLayout = document.querySelector('.app-layout')
  if (appLayout) {
    appLayout.classList.add('global-glitch-active')
    setTimeout(() => appLayout.classList.remove('global-glitch-active'), 500)
  }
}

function openChatiumLink() {
  triggerGlitch()
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}

onMounted(async () => {
  if (typeof window !== 'undefined' && window.hideAppLoader) window.hideAppLoader()
  if (typeof window !== 'undefined' && window.bootLoaderComplete) {
    startAnimations()
  } else if (typeof window !== 'undefined') {
    window.addEventListener('bootloader-complete', startAnimations)
  }
  const result = await apiGetTestsListRoute.run(ctx)
  if (result.success) {
    testCategories.value = result.categories.map((cat: { name: string; title: string; icon: string; tests: Array<{ name: string; description: string }> }) => ({
      ...cat,
      tests: cat.tests.map((t: { name: string; description: string }) => ({
        ...t,
        status: 'pending',
        error: '',
        details: '',
        duration: 0
      }))
    }))
    testCategories.value.forEach((cat: { name: string }) => {
      expandedCategories[cat.name] = true
    })
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('bootloader-complete', startAnimations)
  }
})

const totalTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => sum + cat.tests.length, 0)
})

const passedTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => sum + cat.tests.filter(t => t.status === 'passed').length, 0)
})

const failedTests = computed(() => {
  return testCategories.value.reduce((sum, cat) => sum + cat.tests.filter(t => t.status === 'failed').length, 0)
})

function toggleCategory(name: string) {
  expandedCategories[name] = !expandedCategories[name]
}

function getCategoryStats(categoryName: string) {
  const category = testCategories.value.find(c => c.name === categoryName)
  if (!category) return { total: 0, passed: 0, failed: 0 }
  return {
    total: category.tests.length,
    passed: category.tests.filter(t => t.status === 'passed').length,
    failed: category.tests.filter(t => t.status === 'failed').length
  }
}

async function runAllTests() {
  running.value = true
  testsCompleted.value = false
  const startTime = Date.now()
  testCategories.value.forEach(category => {
    category.tests.forEach(test => {
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
  test.error = ''
  test.details = ''
  const startTime = Date.now()
  try {
    const result = await apiRunSingleTestRoute.run(ctx, { category: categoryName, testName })
    test.status = result.success ? 'passed' : 'failed'
    test.error = result.error || ''
    test.details = result.stack || ''
  } catch (error: unknown) {
    test.status = 'failed'
    test.error = error instanceof Error ? error.message : String(error)
    test.details = error instanceof Error && error.stack ? error.stack : ''
  }
  test.duration = Date.now() - startTime
}
</script>

<style scoped>
.content-wrapper {
  flex: 1;
  min-height: 0;
  padding: 2rem 0;
}

.content-inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>

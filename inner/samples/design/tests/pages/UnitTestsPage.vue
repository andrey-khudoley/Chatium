<script setup lang="ts">
declare const ctx: any

import { ref, onMounted } from 'vue'
import { apiRunTestsRoute } from '../api/run-tests'
import { TEST_CATEGORIES } from '../shared/test-definitions'

const testResults = ref<Record<string, Record<string, { success: boolean; message: string }>>>({})
const isRunning = ref(false)

async function runAllTests() {
  isRunning.value = true
  testResults.value = {}

  for (const category of TEST_CATEGORIES) {
    testResults.value[category.name] = {}
    for (const test of category.tests) {
      const result = await apiRunTestsRoute.run(ctx, { category: category.name, test: test.name })
      testResults.value[category.name][test.name] = result
    }
  }

  isRunning.value = false
}

async function runSingleTest(categoryName: string, testName: string) {
  if (!testResults.value[categoryName]) {
    testResults.value[categoryName] = {}
  }
  const result = await apiRunTestsRoute.run(ctx, { category: categoryName, test: testName })
  testResults.value[categoryName][testName] = result
}

onMounted(() => {
  runAllTests()
})
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold">Unit Tests</h1>
        <button
          @click="runAllTests"
          :disabled="isRunning"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
        >
          {{ isRunning ? 'Выполняется...' : 'Запустить все' }}
        </button>
      </div>

      <div v-for="category in TEST_CATEGORIES" :key="category.name" class="mb-6">
        <h2 class="text-xl font-semibold mb-3 flex items-center gap-2">
          <i :class="['fa-solid', category.icon]"></i>
          {{ category.title }}
        </h2>

        <div class="space-y-2">
          <div
            v-for="test in category.tests"
            :key="test.name"
            class="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <span
                v-if="testResults[category.name]?.[test.name]"
                :class="
                  testResults[category.name][test.name].success ? 'text-green-500' : 'text-red-500'
                "
              >
                <i
                  :class="[
                    'fa-solid',
                    testResults[category.name][test.name].success ? 'fa-check' : 'fa-xmark'
                  ]"
                ></i>
              </span>
              <span v-else class="text-gray-500">
                <i class="fa-solid fa-minus"></i>
              </span>
              <span>{{ test.description }}</span>
            </div>

            <button
              @click="runSingleTest(category.name, test.name)"
              class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              Запустить
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

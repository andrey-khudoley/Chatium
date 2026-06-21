<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto py-8 px-4">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{{ ctx.t('Settings') }}</h1>
            <p class="mt-2 text-sm text-gray-600">
              {{ ctx.t('Documentation Settings Management') }}
            </p>
          </div>
          <a
            :href="basePath"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <i class="fas fa-arrow-left mr-2"></i>{{ ctx.t('Back') }}
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <i class="fas fa-spinner fa-spin text-3xl text-gray-400"></i>
        <p class="mt-4 text-gray-600">{{ ctx.t('Loading settings...') }}</p>
      </div>

      <!-- Settings Form -->
      <div v-else class="bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">{{ ctx.t('URL Type') }}</h2>
          <p class="mt-1 text-sm text-gray-600">
            {{ ctx.t('Select URL format for documentation pages') }}
          </p>
        </div>

        <div class="p-6 space-y-4">
          <!-- URL Type Setting -->
          <div class="space-y-3">
            <label class="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                v-model="urlType"
                value="slug"
                class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div class="flex-1">
                <div class="font-medium text-gray-900">{{ ctx.t('Slug-based URLs') }}</div>
                <div class="text-sm text-gray-500 mt-1">
                  {{ ctx.t('Use readable URLs with slug fields of pages') }}
                  <div class="mt-1 text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                    /doc/getting-started/installation
                  </div>
                </div>
              </div>
            </label>

            <label class="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                v-model="urlType"
                value="slug-only"
                class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div class="flex-1">
                <div class="font-medium text-gray-900">{{ ctx.t('Slug-only URLs') }}</div>
                <div class="text-sm text-gray-500 mt-1">
                  {{ ctx.t('Use only page slug without full path') }}
                  <div class="mt-1 text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                    /doc/installation
                  </div>
                </div>
              </div>
            </label>

            <label class="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                v-model="urlType"
                value="id"
                class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div class="flex-1">
                <div class="font-medium text-gray-900">{{ ctx.t('ID-based URLs') }}</div>
                <div class="text-sm text-gray-500 mt-1">
                  {{ ctx.t('Use direct URLs with document IDs') }}
                  <div class="mt-1 text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                    /doc/id/abc123xyz
                  </div>
                </div>
              </div>
            </label>
          </div>

          <!-- Save Button -->
          <div class="pt-4 flex justify-end space-x-3">
            <button
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {{ ctx.t('Cancel') }}
            </button>
            <button
              @click="handleSave"
              :disabled="saving"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i v-if="saving" class="fas fa-spinner fa-spin mr-2"></i>
              {{ saving ? ctx.t('Saving...') : ctx.t('Save') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Success Message -->
      <div
        v-if="showSuccess"
        class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3"
      >
        <i class="fas fa-check-circle text-green-600"></i>
        <span class="text-sm text-green-800">{{ ctx.t('Settings successfully saved') }}</span>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3"
      >
        <i class="fas fa-exclamation-circle text-red-600"></i>
        <span class="text-sm text-red-800">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiConfigGetRoute, apiConfigSetRoute } from '../api/config'
import { apiGetBasePathRoute } from '../index'

const props = defineProps({
  basePath: String
})

const loading = ref(true)
const saving = ref(false)
const showSuccess = ref(false)
const error = ref('')
const urlType = ref('slug') // default value
const basePath = ref(props.basePath || '/doc')

onMounted(async () => {
  try {
    // Load base path
    const basePathResult = await apiGetBasePathRoute.run(ctx)
    basePath.value = basePathResult.basePath

    // Load current URL type setting
    const config = await apiConfigGetRoute({ key: 'url_type' }).run(ctx)
    if (config) {
      urlType.value = config.value
    }
  } catch (err) {
    console.error('Failed to load settings:', err)
    error.value = ctx.t('Failed to load settings')
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  saving.value = true
  error.value = ''
  showSuccess.value = false

  try {
    await apiConfigSetRoute.run(ctx, {
      key: 'url_type',
      value: urlType.value,
      description: 'Use slug-based URLs (slug), slug-only URLs (slug-only), or ID-based URLs (id)'
    })

    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to save settings:', err)
    error.value = ctx.t('Failed to save settings')
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  window.location.href = basePath.value
}
</script>

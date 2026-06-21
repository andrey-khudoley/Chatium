<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <a :href="indexPageRoute.url()" class="text-blue-600 hover:text-blue-700">
              <i class="fas fa-arrow-left mr-2"></i>К блогу
            </a>
            <h1 class="text-2xl font-bold text-gray-900 hidden sm:block">Админка блога</h1>
            <h1 class="text-xl font-bold text-gray-900 sm:hidden">Админка</h1>
          </div>

          <!-- Desktop menu -->
          <div class="hidden sm:flex items-center space-x-3">
            <button @click="showSettingsModal = true" class="text-gray-600 hover:text-gray-800 p-2">
              <i class="fas fa-cog text-xl"></i>
            </button>
            <button
              data-action="create-new"
              @click="createNewPost"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <i class="fas fa-plus mr-2"></i>Новый пост
            </button>
          </div>

          <!-- Mobile menu -->
          <div class="sm:hidden">
            <button
              @click="showMobileMenu = !showMobileMenu"
              class="text-gray-600 hover:text-gray-800 p-2"
            >
              <i class="fas fa-bars text-xl"></i>
            </button>
          </div>
        </div>

        <!-- Mobile dropdown menu -->
        <div v-if="showMobileMenu" class="sm:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
          <div class="flex flex-col space-y-3">
            <button
              data-action="create-new"
              @click="createNewPost"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <i class="fas fa-plus mr-2"></i>Новый пост
            </button>
            <button
              @click="
                showSettingsModal = true
                showMobileMenu = false
              "
              class="text-gray-600 hover:text-gray-800 p-2 text-left"
            >
              <i class="fas fa-cog mr-2"></i>Настройки
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-6 py-8">
      <!-- AI Post Generation Form -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div class="p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            <i class="fas fa-magic text-purple-600 mr-2"></i>
            Написать пост с ИИ
          </h2>
          <form @submit.prevent="generatePost" @keydown="handleKeyDown" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                О чем написать пост?
              </label>
              <textarea
                v-model="aiForm.topic"
                rows="3"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                placeholder="Например: Лучшие практики Vue.js разработки, Как настроить Docker для разработки..."
              ></textarea>
            </div>
            <div class="flex items-center justify-between">
              <span
                v-if="promptFirstLine"
                @click="showSettingsModal = true"
                class="text-sm text-gray-500 border-b border-dotted border-gray-400 cursor-pointer hover:text-gray-700"
              >
                {{ promptFirstLine }}
              </span>
              <div v-else></div>
              <button
                type="submit"
                :disabled="aiGenerating || !aiForm.topic.trim()"
                class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <i v-if="aiGenerating" class="fas fa-spinner fa-spin mr-2"></i>
                <i v-else class="fas fa-magic mr-2"></i>
                {{ aiGenerating ? 'Генерирую...' : 'Написать пост' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
        <p class="text-gray-600 mt-4">Загрузка постов...</p>
      </div>

      <!-- Posts Table -->
      <div v-else class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Заголовок
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Статус
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Дата создания
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Действия
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="post in posts"
              :key="post.id"
              @click="goToEditPost(post)"
              class="hover:bg-gray-50 cursor-pointer"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ post.title }}</div>
                    <div class="text-sm text-gray-500">{{ post.slug }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="{
                    'bg-green-100 text-green-800': post.published,
                    'bg-yellow-100 text-yellow-800': !post.published
                  }"
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                >
                  {{ post.published ? 'Опубликован' : 'Черновик' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(post.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center space-x-2">
                  <button
                    @click.stop="goToEditPost(post)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <a
                    v-if="post.published"
                    :href="blogPostRoute({ slug: post.slug }).url()"
                    target="_blank"
                    class="text-green-600 hover:text-green-900"
                  >
                    <i class="fas fa-eye"></i>
                  </a>
                  <button @click.stop="deletePost(post)" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Settings Modal -->
    <div
      v-if="showSettingsModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto m-4">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900">
              <i class="fas fa-cog text-gray-600 mr-2"></i>
              Настройки генерации постов
            </h2>
            <button @click="closeSettingsModal" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <form @submit.prevent="saveSettings" class="p-6 space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Системный промпт для ИИ
            </label>
            <textarea
              v-model="settingsForm.systemPrompt"
              rows="15"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500 font-mono text-sm"
              placeholder="Введите системный промпт, который будет определять стиль и требования к генерируемым постам..."
            ></textarea>
            <p class="text-xs text-gray-500 mt-2">
              Этот промпт определяет, как ИИ будет писать посты для вашего блога. Опишите стиль,
              тон, структуру и требования к статьям.
            </p>
          </div>

          <div class="flex items-center justify-end space-x-4 pt-4">
            <button
              type="button"
              @click="closeSettingsModal"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="settingsSaving"
              class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <i v-if="settingsSaving" class="fas fa-spinner fa-spin mr-2"></i>
              {{ settingsSaving ? 'Сохраняю...' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  apiBlogAllPostsRoute,
  apiBlogCreatePostRoute,
  apiBlogUpdatePostRoute,
  apiBlogDeletePostRoute,
  apiBlogGeneratePostRoute,
  apiBlogGetSettingsRoute,
  apiBlogSaveSettingsRoute
} from '../api/blog'
import { indexPageRoute } from '../index'
import { blogPostRoute } from '../post'
import { editPostPageRoute } from '../editPost'

const posts = ref([])
const loading = ref(true)
const showSettingsModal = ref(false)
const aiGenerating = ref(false)
const promptFirstLine = ref('')
const showMobileMenu = ref(false)

const settingsSaving = ref(false)

const aiForm = ref({
  topic: ''
})

const settingsForm = ref({
  systemPrompt: ''
})

onMounted(async () => {
  await loadPosts()
  await loadSettings()

  // Add event listener to "Новый пост" button to create new post
  const newPostButton = document.querySelector('button[data-action="create-new"]')
  if (newPostButton) {
    newPostButton.addEventListener('click', createNewPost)
  }
})

async function loadPosts() {
  try {
    loading.value = true
    posts.value = await apiBlogAllPostsRoute.run(ctx)
  } catch (error) {
    console.error('Error loading posts:', error)
    alert('Ошибка загрузки постов')
  } finally {
    loading.value = false
  }
}

async function loadSettings() {
  try {
    const settings = await apiBlogGetSettingsRoute.run(ctx)
    settingsForm.value.systemPrompt = settings.systemPrompt

    // Извлекаем первую строчку промпта для отображения
    const firstLine = settings.systemPrompt.split('\n')[0]
    promptFirstLine.value = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine
  } catch (error) {
    console.error('Error loading settings:', error)
    // Не показываем ошибку пользователю, просто используем дефолтные настройки
  }
}

function goToEditPost(post) {
  window.location.href = editPostPageRoute({ id: post.id }).url()
}

function createNewPost() {
  window.location.href = editPostPageRoute({ id: 'new' }).url()
}

function closeSettingsModal() {
  showSettingsModal.value = false
  // Не сбрасываем форму, чтобы пользователь не потерял изменения при случайном закрытии
}

function handleKeyDown(event) {
  // Обработка cmd+enter или ctrl+enter для отправки формы
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    if (!aiGenerating.value && aiForm.value.topic.trim()) {
      generatePost()
    }
  }
}

async function generatePost() {
  if (!aiForm.value.topic.trim()) {
    alert('Пожалуйста, укажите тему для поста')
    return
  }

  try {
    aiGenerating.value = true

    const response = await apiBlogGeneratePostRoute.run(ctx, {
      topic: aiForm.value.topic
    })

    // Очищаем форму после успешной генерации
    aiForm.value.topic = ''

    // Перенаправляем на страницу редактирования
    if (response.redirectUrl) {
      window.location.href = response.redirectUrl
    }
  } catch (error) {
    console.error('Error generating post:', error)
    alert('Ошибка генерации поста')
  } finally {
    aiGenerating.value = false
  }
}

async function saveSettings() {
  try {
    settingsSaving.value = true

    await apiBlogSaveSettingsRoute.run(ctx, {
      systemPrompt: settingsForm.value.systemPrompt
    })

    closeSettingsModal()

    // Обновляем первую строчку промпта после сохранения
    const firstLine = settingsForm.value.systemPrompt.split('\n')[0]
    promptFirstLine.value = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine
    alert('Настройки успешно сохранены!')
  } catch (error) {
    console.error('Error saving settings:', error)
    alert('Ошибка сохранения настроек')
  } finally {
    settingsSaving.value = false
  }
}

async function deletePost(post) {
  if (confirm(`Вы уверены, что хотите удалить пост "${post.title}"?`)) {
    try {
      await apiBlogDeletePostRoute({ id: post.id }).run(ctx, {})
      await loadPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Ошибка удаления поста')
    }
  }
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div
          class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0"
        >
          <div class="flex items-center space-x-4">
            <a :href="blogAdminRoute.url()" class="text-blue-600 hover:text-blue-700">
              <i class="fas fa-arrow-left mr-2"></i>К админке
            </a>
            <button
              v-if="postData && form.slug && !isGenerating"
              type="button"
              @click="navigateToPreview"
              class="hidden md:inline-flex px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <i class="fas fa-eye mr-1 md:mr-2 hidden md:inline"></i>Просмотр
            </button>
            <!-- Desktop title -->
            <h1 class="hidden md:block text-2xl font-bold text-gray-900">
              {{
                isGenerating
                  ? 'Генерация поста'
                  : postData?.id
                    ? 'Редактировать пост'
                    : 'Новый пост'
              }}
            </h1>
            <!-- Mobile title -->
            <h1 class="block md:hidden text-2xl font-bold text-gray-900">
              {{ isGenerating ? 'Генерация поста' : 'Пост' }}
            </h1>
          </div>
          <div
            class="flex items-center space-x-2 md:space-x-3 w-full md:w-auto justify-end md:justify-start"
          >
            <span v-if="lastSaved" class="text-sm text-gray-500">
              Сохранено: {{ formatTime(lastSaved) }}
            </span>
            <button
              v-if="postData && postData.id && !isGenerating"
              type="button"
              @click="deletePost"
              class="hidden md:inline-flex px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              <i class="fas fa-trash mr-1 md:mr-2 hidden md:inline"></i>Удалить
            </button>
            <button
              type="submit"
              @click="savePost"
              :disabled="saving || isGenerating"
              class="hidden md:inline-flex px-3 py-1 md:px-6 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <i v-if="saving" class="fas fa-spinner fa-spin mr-1 md:mr-2 hidden md:inline"></i>
              {{ saving ? 'Сохраняю...' : 'Сохранить' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Unpublished Post Warning -->
    <div
      v-if="!form.published && postData && !isGenerating"
      class="bg-yellow-50 border-b border-yellow-200"
    >
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <i class="fas fa-exclamation-triangle text-yellow-600"></i>
            <p class="text-yellow-800 font-medium">
              Этот пост не опубликован и не виден посетителям
            </p>
          </div>
          <button
            @click="publishPost"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Опубликовать
          </button>
        </div>
      </div>
    </div>

    <!-- Generation Status -->
    <div v-if="isGenerating" class="bg-purple-50 border-b border-purple-200">
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div class="flex items-center space-x-3">
          <i class="fas fa-magic text-purple-600 animate-pulse"></i>
          <div>
            <h3 class="font-medium text-purple-900">{{ generationStatus }}</h3>
            <p class="text-sm text-purple-700">Это может занять несколько минут...</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-6 py-8">
      <div v-if="loading" class="text-center py-12">
        <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
        <p class="text-gray-600 mt-4">Загрузка...</p>
      </div>

      <form v-else @submit.prevent="savePost" class="bg-white rounded-lg shadow p-6 space-y-6">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Заголовок</label>
          <input
            v-model="form.title"
            type="text"
            required
            :disabled="isGenerating"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            @input="generateSlug"
          />
        </div>

        <!-- Slug -->
        <div v-if="!isGenerating">
          <label class="block text-sm font-medium text-gray-700 mb-2">URL (slug)</label>
          <input
            v-model="form.slug"
            type="text"
            required
            :disabled="isGenerating"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>

        <!-- Excerpt -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Краткое описание</label>
          <textarea
            v-model="form.excerpt"
            rows="3"
            :disabled="isGenerating"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          ></textarea>
        </div>

        <!-- Content -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Содержимое</label>
          <textarea
            v-model="form.content"
            rows="20"
            required
            :disabled="isGenerating"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="Используйте простой текст или маркдаун..."
          ></textarea>
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Теги (через запятую)</label>
          <input
            v-model="form.tags"
            type="text"
            :disabled="isGenerating"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="javascript, vue, chatium"
          />
        </div>

        <!-- Published -->
        <div class="flex items-center">
          <input
            v-model="form.published"
            type="checkbox"
            id="published"
            :disabled="isGenerating"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <label for="published" class="ml-2 block text-sm text-gray-900">
            Опубликовать пост
          </label>
        </div>
      </form>
    </main>

    <!-- Mobile Action Buttons -->
    <div class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
      <div class="flex space-x-3">
        <button
          v-if="postData && form.slug && !isGenerating"
          type="button"
          @click="navigateToPreview"
          class="flex-1 px-4 py-3 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-center"
        >
          Просмотр
        </button>
        <button
          v-if="postData && postData.id && !isGenerating"
          type="button"
          @click="deletePost"
          class="flex-1 px-4 py-3 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 text-center"
        >
          Удалить
        </button>
        <button
          type="submit"
          @click="savePost"
          :disabled="saving || isGenerating"
          class="flex-1 px-4 py-3 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-center"
        >
          <i v-if="saving" class="fas fa-spinner fa-spin mr-2"></i>
          {{ saving ? 'Сохраняю...' : 'Сохранить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { blogAdminRoute } from '../admin'
import {
  apiBlogCreatePostRoute,
  apiBlogUpdatePostRoute,
  apiBlogGetPostByIdRoute,
  apiBlogDeletePostRoute
} from '../api/blog'
import { blogPostRoute } from '../post'

const props = defineProps({
  postId: String,
  encodedSocketId: String
})

const postData = ref(null)
const loading = ref(true)
const saving = ref(false)
const lastSaved = ref(null)
const isGenerating = ref(false)
const generationStatus = ref('Генерирую пост с помощью ИИ...')

const form = ref({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  tags: '',
  published: false
})

onMounted(async () => {
  await loadPost()

  // Подключаемся к websocket для получения обновлений генерации
  if (props.encodedSocketId) {
    const socketClient = await getOrCreateBrowserSocketClient()
    const subs = socketClient.subscribeToData(props.encodedSocketId)

    subs.listen((data) => {
      console.log('Socket data received', data)

      if (data.type === 'generation-status') {
        isGenerating.value = data.generating
        generationStatus.value = data.message

        // Если генерация завершена, обновляем форму
        if (!data.generating && data.post) {
          form.value = {
            title: data.post.title,
            slug: data.post.slug,
            excerpt: data.post.excerpt || '',
            content: data.post.content,
            tags: data.post.tags || '',
            published: data.post.published
          }
        }
      }
    })
  }
})

async function loadPost() {
  if (!props.postId || props.postId === 'new') {
    loading.value = false
    return
  }

  try {
    loading.value = true
    postData.value = await apiBlogGetPostByIdRoute({ id: props.postId }).run(ctx)

    // Проверяем, является ли пост генерируемым
    if (postData.value.content === 'Идет генерация контента...') {
      isGenerating.value = true
      generationStatus.value = 'Генерирую пост с помощью ИИ...'
    }

    form.value = {
      title: postData.value.title,
      slug: postData.value.slug,
      excerpt: postData.value.excerpt || '',
      content: postData.value.content,
      tags: postData.value.tags || '',
      published: postData.value.published
    }
  } catch (error) {
    console.error('Error loading post:', error)
    alert('Ошибка загрузки поста')
  } finally {
    loading.value = false
  }
}

function generateSlug() {
  if (!form.value.slug || form.value.slug === '' || form.value.slug.startsWith('generating-')) {
    form.value.slug = form.value.title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 100)
  }
}

async function savePost() {
  try {
    saving.value = true

    if (postData.value && postData.value.id) {
      // Update existing post
      await apiBlogUpdatePostRoute({ id: postData.value.id }).run(ctx, {
        ...form.value,
        wasPublished: postData.value.published
      })
    } else {
      // Create new post
      const newPost = await apiBlogCreatePostRoute.run(ctx, form.value)
      postData.value = newPost
      // Обновляем URL без перезагрузки страницы
      window.history.pushState({}, '', `/editPost/${newPost.id}`)
    }

    lastSaved.value = new Date()
  } catch (error) {
    console.error('Error saving post:', error)
    alert('Ошибка сохранения поста')
  } finally {
    saving.value = false
  }
}

async function publishPost() {
  try {
    form.value.published = true
    saving.value = true

    await apiBlogUpdatePostRoute({ id: postData.value.id }).run(ctx, {
      ...form.value,
      wasPublished: postData.value.published
    })

    lastSaved.value = new Date()
  } catch (error) {
    console.error('Error publishing post:', error)
    alert('Ошибка публикации поста')
  } finally {
    saving.value = false
  }
}

async function deletePost() {
  if (!confirm('Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.')) {
    return
  }

  try {
    await apiBlogDeletePostRoute({ id: postData.value.id }).run(ctx, {})
    window.location.href = blogAdminRoute.url()
  } catch (error) {
    alert('Ошибка при удалении поста')
  }
}

function navigateToPreview() {
  window.location.href = blogPostRoute({ slug: form.value.slug }).url()
}

function goBack() {
  window.location.href = blogAdminRoute.url()
}

function formatTime(date) {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

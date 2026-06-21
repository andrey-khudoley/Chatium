<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <a
            :href="indexPageRoute.url()"
            class="flex items-center text-blue-600 hover:text-blue-700"
          >
            <i class="fas fa-arrow-left mr-2"></i>
            <span class="hidden md:inline">Назад к блогу</span>
            <span class="md:hidden">Блог</span>
          </a>
          <div class="flex items-center space-x-4">
            <button @click="sharePost" class="text-gray-600 hover:text-blue-600">
              <i class="fas fa-share mr-2 hidden md:inline"></i>Поделиться
            </button>
            <a
              v-if="ctx.user?.is('Admin')"
              :href="editPostPageRoute({ id: props.post.id }).url()"
              class="text-blue-600 hover:text-blue-700"
            >
              <i class="fas fa-edit mr-2 hidden md:inline"></i>
              Редактировать
            </a>
          </div>
        </div>
      </div>
    </nav>

    <!-- Unpublished Warning for Admins -->
    <div
      v-if="!props.post.published && ctx.user?.is('Admin')"
      class="bg-yellow-50 border-l-4 border-yellow-400 p-4"
    >
      <div class="max-w-4xl mx-auto px-6">
        <div class="flex items-center">
          <i class="fas fa-exclamation-triangle text-yellow-400 mr-3"></i>
          <p class="text-yellow-800 font-medium">
            Этот пост не опубликован и виден только администраторам
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-20">
      <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
      <p class="text-gray-600 mt-4">Загрузка поста...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-20">
      <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-6"></i>
      <h2 class="text-2xl font-semibold text-gray-800 mb-2">Пост не найден</h2>
      <p class="text-gray-600 mb-8">Возможно, пост был удален или переименован</p>
      <a
        :href="indexPageRoute.url()"
        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
      >
        Вернуться к блогу
      </a>
    </div>

    <!-- Post Content -->
    <article v-else-if="props.post" class="max-w-4xl mx-auto px-6 py-12">
      <!-- Post Header -->
      <header class="mb-12">
        <!-- Cover Image -->
        <div v-if="props.post.coverImage" class="mb-8">
          <img
            :src="getThumbnailUrl(props.post.coverImage, 800, 400)"
            :alt="props.post.title"
            class="w-full h-80 object-cover rounded-xl shadow-lg"
          />
        </div>

        <!-- Post Meta -->
        <div class="flex items-center justify-between mb-6 text-sm text-gray-500">
          <time>{{ formatDate(props.post.publishedAt || props.post.createdAt) }}</time>
          <div class="flex items-center space-x-4">
            <span>
              <i class="fas fa-clock mr-1"></i>
              {{ props.post.readingTime || 1 }} мин чтения
            </span>
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-4xl font-bold text-gray-900 mb-6 leading-tight">
          {{ props.post.title }}
        </h1>

        <!-- Tags -->
        <div v-if="props.post.tags" class="flex flex-wrap gap-2 mb-8">
          <span
            v-for="tag in props.post.tags.split(',')"
            :key="tag.trim()"
            class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
          >
            {{ tag.trim() }}
          </span>
        </div>
      </header>

      <!-- Post Content -->
      <div class="prose prose-lg max-w-none">
        <div v-html="formatContent(props.post.content)"></div>
      </div>

      <!-- Post Footer -->
      <footer class="mt-16 pt-8 border-t border-gray-200">
        <div class="flex items-center justify-between">
          <div class="text-gray-600">
            <p>Понравился пост? Поделитесь с друзьями!</p>
          </div>
          <div class="flex space-x-4">
            <button @click="shareToTwitter" class="text-blue-400 hover:text-blue-500">
              <i class="fab fa-twitter text-xl"></i>
            </button>
            <button @click="shareToFacebook" class="text-blue-600 hover:text-blue-700">
              <i class="fab fa-facebook text-xl"></i>
            </button>
            <button @click="shareToLinkedIn" class="text-blue-700 hover:text-blue-800">
              <i class="fab fa-linkedin text-xl"></i>
            </button>
            <button @click="sharePost" class="text-gray-600 hover:text-gray-700">
              <i class="fas fa-link text-xl"></i>
            </button>
          </div>
        </div>
      </footer>
    </article>

    <!-- Comments Section -->
    <section v-if="props.post" class="bg-white border-t border-gray-200">
      <div class="max-w-4xl mx-auto px-6 py-16">
        <h2 class="text-2xl font-bold text-gray-900 mb-8">Комментарии ({{ comments.length }})</h2>

        <!-- Comment Form -->
        <div v-if="ctx.user" class="mb-12 bg-gray-50 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Оставить комментарий</h3>
          <textarea
            v-model="newComment"
            placeholder="Напишите свой комментарий..."
            rows="4"
            class="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          ></textarea>
          <div class="flex justify-between items-center mt-4">
            <p class="text-sm text-gray-600">
              {{ ctx.user.displayName }}
            </p>
            <button
              @click="submitComment"
              :disabled="!newComment.trim() || submittingComment"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <i v-if="submittingComment" class="fas fa-spinner fa-spin mr-2"></i>
              {{ submittingComment ? 'Отправляется...' : 'Отправить' }}
            </button>
          </div>
        </div>

        <!-- Login prompt for guests -->
        <div v-else class="mb-12 bg-gray-50 rounded-lg p-6 text-center">
          <p class="text-gray-600 mb-4">Войдите, чтобы оставить комментарий</p>
          <a
            :href="profilePageRoute.url()"
            class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Войти
          </a>
        </div>

        <!-- Comments List -->
        <div v-if="loadingComments" class="text-center py-8">
          <i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
          <p class="text-gray-600 mt-2">Загрузка комментариев...</p>
        </div>

        <div v-else-if="comments.length === 0" class="text-center py-8 text-gray-600">
          <i class="fas fa-comment text-4xl text-gray-300 mb-4"></i>
          <p>Пока нет комментариев. Будьте первым!</p>
        </div>

        <div v-else class="space-y-6">
          <article
            v-for="comment in comments"
            :key="comment.id"
            class="border border-gray-200 rounded-lg p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3 mb-3">
                <div>
                  <p class="font-semibold text-gray-900">
                    {{
                      comment.author
                        ? comment.author.firstName && comment.author.lastName
                          ? `${comment.author.firstName} ${comment.author.lastName}`
                          : comment.author.displayName || 'Пользователь'
                        : 'Пользователь'
                    }}
                  </p>
                  <p class="text-sm text-gray-500">{{ formatDate(comment.createdAt) }}</p>
                </div>
              </div>
              <div v-if="ctx.user?.is('Admin')" class="flex items-center space-x-2">
                <button
                  @click="deleteComment(comment.id)"
                  class="text-red-600 hover:text-red-700 text-sm"
                  title="Удалить комментарий"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div class="prose prose-sm max-w-none">
              <p class="text-gray-700 whitespace-pre-wrap">{{ comment.content }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Related Posts -->
    <section v-if="relatedPosts.length > 0" class="bg-white">
      <div class="max-w-4xl mx-auto px-6 py-16">
        <h2 class="text-2xl font-bold text-gray-900 mb-8">Похожие посты</h2>
        <div class="grid md:grid-cols-2 gap-8">
          <article
            v-for="relatedPost in relatedPosts"
            :key="relatedPost.id"
            class="blog-card cursor-pointer"
            @click="goToPost(relatedPost.slug)"
          >
            <div v-if="relatedPost.coverImage" class="mb-4">
              <img
                :src="getThumbnailUrl(relatedPost.coverImage, 300, 200)"
                :alt="relatedPost.title"
                class="w-full h-40 object-cover rounded-lg"
              />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ relatedPost.title }}</h3>
            <p class="text-gray-600 text-sm mb-3">
              {{ relatedPost.excerpt || relatedPost.content.substring(0, 100) + '...' }}
            </p>
            <time class="text-xs text-gray-500">
              {{ formatDate(relatedPost.publishedAt || relatedPost.createdAt) }}
            </time>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiBlogPostsListRoute } from '../api/blog'
import {
  apiCommentsListRoute,
  apiCommentsCreateRoute,
  apiCommentsDeleteRoute
} from '../api/comments'
import { indexPageRoute } from '../index'
import { blogPostRoute } from '../post'
import { profilePageRoute } from '../profile'
import { editPostPageRoute } from '../editPost'
import { getThumbnailUrl } from '@app/storage'

// Comments
const comments = ref([])
const loadingComments = ref(true)
const newComment = ref('')
const submittingComment = ref(false)

// Post data
const props = defineProps(['post'])
const relatedPosts = ref([])
const loading = ref(false)
const error = ref(!props.post)

// Load comments when component mounts
onMounted(async () => {
  if (props.post) {
    await loadComments()
  }
})

async function loadComments() {
  try {
    loadingComments.value = true
    comments.value = await apiCommentsListRoute({ postId: props.post.id }).run(ctx)
  } catch (err) {
    console.error('Error loading comments:', err)
  } finally {
    loadingComments.value = false
  }
}

async function submitComment() {
  if (!newComment.value.trim() || submittingComment.value) return

  try {
    submittingComment.value = true

    const comment = await apiCommentsCreateRoute.run(ctx, {
      postId: props.post.id,
      content: newComment.value.trim()
    })

    // Add new comment to the top of the list
    comments.value.unshift(comment)

    // Clear the form
    newComment.value = ''
  } catch (err) {
    console.error('Error submitting comment:', err)
    alert('Ошибка при отправке комментария. Попробуйте еще раз.')
  } finally {
    submittingComment.value = false
  }
}

async function deleteComment(commentId) {
  if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
    return
  }

  try {
    await apiCommentsDeleteRoute({ id: commentId }).run(ctx, {})
    // Remove comment from list
    comments.value = comments.value.filter((c) => c.id !== commentId)
  } catch (err) {
    console.error('Error deleting comment:', err)
    alert('Ошибка при удалении комментария')
  }
}

function formatDate(dateString) {
  const date = new Date(dateString.arg || dateString)
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow'
  })
}

function getReadingTime(content) {
  if (!content) return 1
  const wordsPerMinute = 200
  const words = content.split(' ').length
  return Math.ceil(words / wordsPerMinute)
}

function formatContent(content) {
  // Простая обработка маркдауна
  return content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/\n/g, '<br>')
}

function goToPost(slug) {
  window.location.href = blogPostRoute({ slug }).url()
}

function sharePost() {
  if (navigator.share) {
    navigator.share({
      title: props.post.title,
      url: window.location.href
    })
  } else {
    navigator.clipboard.writeText(window.location.href)
    alert('Ссылка скопирована в буфер обмена!')
  }
}

function shareToTwitter() {
  const url = encodeURIComponent(window.location.href)
  const text = encodeURIComponent(props.post.title)
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
}

function shareToFacebook() {
  const url = encodeURIComponent(window.location.href)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
}

function shareToLinkedIn() {
  const url = encodeURIComponent(window.location.href)
  const title = encodeURIComponent(props.post.title)
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank')
}
</script>

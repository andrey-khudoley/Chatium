<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-6 py-8">
        <div class="flex items-center justify-between">
          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-4 flex-1">
            <div v-if="ctx.user" class="flex items-center space-x-4">
              <a
                :href="profilePageRoute.url()"
                class="text-gray-600 hover:text-blue-600 transition-colors text-sm"
              >
                <i class="fas fa-user mr-2"></i>Мой профиль
              </a>
              <div v-if="ctx.user && ctx.user.is('Admin')">
                <a
                  :href="blogAdminRoute.url()"
                  class="text-gray-600 hover:text-blue-600 transition-colors text-sm"
                >
                  <i class="fas fa-cog mr-2"></i>Админка
                </a>
              </div>
            </div>
          </div>

          <!-- Right side - Login/Logout -->
          <div class="hidden md:flex items-center">
            <a
              v-if="!ctx.user"
              :href="profilePageRoute.url()"
              class="text-gray-600 hover:text-blue-600 transition-colors"
            >
              <i class="fas fa-user mr-2"></i>Войти
            </a>
            <a
              v-else
              href="/s/auth/sign-out"
              class="text-gray-600 hover:text-red-600 px-4 py-2 text-sm"
              onclick="event.preventDefault(); fetch('/s/auth/sign-out', {method: 'POST'}).then(() => window.location.reload())"
            >
              <i class="fas fa-sign-out-alt mr-2"></i>Выйти
            </a>
          </div>

          <!-- Mobile Menu Button -->
          <button
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <i class="fas fa-bars text-xl" v-if="!mobileMenuOpen"></i>
            <i class="fas fa-times text-xl" v-else></i>
          </button>
        </div>

        <!-- Title Section -->
        <div class="mt-4">
          <h1 class="text-3xl font-bold text-gray-900">Название блога</h1>
          <p class="text-lg text-gray-600 mt-1 hidden sm:block">
            Персональный блог о разработке и технологиях
          </p>
        </div>

        <!-- Mobile Navigation Menu -->
        <div v-if="mobileMenuOpen" class="md:hidden mt-4 py-4 border-t border-gray-200">
          <div class="flex flex-col space-y-3">
            <div v-if="!ctx.user">
              <a
                :href="profilePageRoute.url()"
                class="flex items-center text-gray-600 hover:text-blue-600 transition-colors py-2"
                @click="mobileMenuOpen = false"
              >
                <i class="fas fa-user mr-3"></i>Войти
              </a>
            </div>
            <div v-else class="flex flex-col space-y-3">
              <a
                :href="profilePageRoute.url()"
                class="flex items-center text-gray-600 hover:text-blue-600 transition-colors py-2"
                @click="mobileMenuOpen = false"
              >
                <i class="fas fa-user mr-3"></i>Мой профиль
              </a>
              <a
                href="/s/auth/sign-out"
                class="flex items-center text-gray-600 hover:text-red-600 py-2"
                onclick="event.preventDefault(); fetch('/s/auth/sign-out', {method: 'POST'}).then(() => window.location.reload())"
              >
                <i class="fas fa-sign-out-alt mr-3"></i>Выйти
              </a>
              <a
                v-if="ctx.user && ctx.user.is('Admin')"
                :href="blogAdminRoute.url()"
                class="flex items-center text-gray-600 hover:text-blue-600 py-2"
                @click="mobileMenuOpen = false"
              >
                <i class="fas fa-cog mr-3"></i>Админка
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-6 py-12 flex-grow">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
        <p class="text-gray-600 mt-4">Загрузка постов...</p>
      </div>

      <!-- Posts Grid -->
      <div v-else-if="posts.length > 0" class="space-y-8">
        <article
          v-for="post in posts"
          :key="post.id"
          class="blog-card bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer"
          @click="goToPost(post.slug)"
        >
          <div class="md:flex">
            <!-- Post Image -->
            <div v-if="post.coverImage" class="md:w-1/3">
              <img
                :src="getThumbnailUrl(post.coverImage, 400, 250)"
                :alt="post.title"
                class="w-full h-48 md:h-full object-cover"
              />
            </div>

            <!-- Post Content -->
            <div class="p-6 md:w-2/3" :class="{ 'md:w-full': !post.coverImage }">
              <div class="flex items-center justify-between mb-4">
                <time class="text-sm text-gray-500">
                  {{ formatDate(post.publishedAt || post.createdAt) }}
                </time>
                <div v-if="post.tags" class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in post.tags.split(',')"
                    :key="tag.trim()"
                    class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {{ tag.trim() }}
                  </span>
                </div>
              </div>

              <h3 class="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                {{ post.title }}
              </h3>

              <p class="text-gray-600 line-clamp-3 leading-relaxed mb-4">
                {{ post.excerpt || post.content.substring(0, 150) + '...' }}
              </p>

              <div class="flex items-center justify-between">
                <span class="text-blue-600 font-medium hover:text-blue-700">
                  Читать далее <i class="fas fa-arrow-right ml-1"></i>
                </span>
                <div class="text-sm text-gray-500">
                  <i class="fas fa-clock mr-1"></i>
                  {{ post.readingTime }} мин чтения
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16">
        <i class="fas fa-blog text-6xl text-gray-300 mb-6"></i>
        <h3 class="text-xl font-semibold text-gray-600 mb-2">Пока что постов нет</h3>
        <p class="text-gray-500">Скоро здесь появятся интересные материалы!</p>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 mt-20">
      <div class="max-w-4xl mx-auto px-6 py-8">
        <div class="text-center text-gray-600">
          <p>&copy; 2024 Название блога. Все права защищены.</p>
          <p class="mt-2 text-sm">Сделано с ❤️ на Chatium</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiBlogPostsListRoute, apiBlogGetSettingsRoute } from '../api/blog'
import { blogAdminRoute } from '../admin'
import { blogPostRoute } from '../post'
import { profilePageRoute } from '../profile'
import { getThumbnailUrl } from '@app/storage'

const posts = ref([])
const loading = ref(true)
const mobileMenuOpen = ref(false)
const aiGenerating = ref(false)
const systemPrompt = ref('')
const showSystemPrompt = ref(false)

onMounted(async () => {
  try {
    posts.value = await apiBlogPostsListRoute.run(ctx)
  } catch (error) {
    console.error('Error loading posts:', error)
  } finally {
    loading.value = false
  }
})

function goToPost(slug) {
  window.location.href = blogPostRoute({ slug }).url()
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div
    class="min-h-screen text-white overflow-x-hidden"
    style="background: linear-gradient(180deg, #0a0a0f 0%, #111118 100%)"
  >
    <!-- Animated Background -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute top-0 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-blob"
      ></div>
      <div
        class="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute -bottom-40 left-1/3 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <div class="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <!-- Header -->
      <header class="text-center mb-10 sm:mb-14">
        <div
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-sm text-gray-400 font-medium tracking-wide">AI Creative Studio</span>
        </div>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
          <span
            class="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
          >
            Генератор медиа
          </span>
        </h1>
        <p class="text-gray-400 text-lg max-w-xl mx-auto">
          Создавайте уникальные изображения и видео с помощью передовых AI-моделей
        </p>
      </header>

      <!-- Main Card -->
      <div class="glass-card rounded-3xl p-1 mb-10">
        <div class="rounded-3xl p-6 sm:p-8" style="background: rgba(17, 17, 24, 0.8)">
          <!-- Tabs -->
          <div class="flex gap-2 p-1.5 bg-white/5 rounded-2xl mb-8 max-w-md mx-auto">
            <button
              @click="activeTab = 'image'"
              :class="[
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300',
                activeTab === 'image'
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Изображение</span>
            </button>
            <button
              @click="activeTab = 'video'"
              :class="[
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300',
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              ]"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Видео</span>
            </button>
          </div>

          <!-- Image Generation Tab -->
          <div v-show="activeTab === 'image'" class="animate-fade-in">
            <div class="grid lg:grid-cols-2 gap-8">
              <!-- Left Column - Settings -->
              <div class="space-y-6">
                <!-- Model Selection -->
                <div class="space-y-2">
                  <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Модель
                  </label>
                  <select
                    v-model="imageForm.model"
                    class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 cursor-pointer"
                  >
                    <option value="bytedance-seed/seedream-4.5">✨ Seedream 4.5</option>
                    <option value="black-forest-labs/flux.2-max">🔥 Flux 2 Max</option>
                    <option value="black-forest-labs/flux.2-flex">⚡ Flux 2 Flex</option>
                    <option value="black-forest-labs/flux.2-pro">💎 Flux 2 Pro</option>
                    <option value="google/gemini-3-pro-image-preview">🌟 Nano Banana Pro</option>
                    <option value="google/gemini-2.5-flash-image">🚀 Nano Banana</option>
                    <option value="openai/gpt-5-image-mini">🤖 GPT-5 Image Mini</option>
                    <option value="openai/gpt-5-image">🎨 GPT-5 Image</option>
                  </select>
                </div>

                <!-- Mode Selection -->
                <div class="space-y-2">
                  <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                      />
                    </svg>
                    Режим генерации
                  </label>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      @click="imageForm.mode = 'text-to-image'"
                      :class="[
                        'flex flex-col items-center justify-center py-4 px-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-200',
                        imageForm.mode === 'text-to-image'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : ''
                      ]"
                    >
                      <svg
                        class="w-6 h-6 mb-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span class="text-xs font-medium">Текст → Изображение</span>
                    </button>
                    <button
                      type="button"
                      @click="imageForm.mode = 'image-to-image'"
                      :class="[
                        'flex flex-col items-center justify-center py-4 px-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-200',
                        imageForm.mode === 'image-to-image'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                          : ''
                      ]"
                    >
                      <svg
                        class="w-6 h-6 mb-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span class="text-xs font-medium">Изображение → Изображение</span>
                    </button>
                  </div>
                </div>

                <!-- Prompt Input -->
                <div class="space-y-2">
                  <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    Описание
                  </label>
                  <textarea
                    v-model="imageForm.prompt"
                    rows="4"
                    placeholder="Опишите желаемое изображение максимально детально..."
                    class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 resize-none"
                  ></textarea>
                </div>

                <!-- Generate Button -->
                <button
                  @click="generateImage"
                  :disabled="
                    isGenerating ||
                    !imageForm.prompt ||
                    (imageForm.mode === 'image-to-image' && !imageForm.uploadedImageHash)
                  "
                  class="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span v-if="!isGenerating" class="flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                    Сгенерировать
                  </span>
                  <span v-else class="flex items-center justify-center gap-2">
                    <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Генерация...
                  </span>
                </button>
              </div>

              <!-- Right Column - Source Image -->
              <div v-if="imageForm.mode === 'image-to-image'" class="space-y-4">
                <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Исходное изображение
                </label>

                <!-- Upload Zone -->
                <div
                  class="border-2 border-dashed border-white/10 rounded-2xl p-8 cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                  @click="$refs.imageFileInput.click()"
                  @dragover.prevent
                  @drop.prevent="handleImageDrop"
                >
                  <input
                    type="file"
                    ref="imageFileInput"
                    @change="handleImageUpload"
                    accept="image/*"
                    class="hidden"
                  />
                  <div v-if="!imageForm.uploadedImageHash" class="text-center">
                    <div
                      class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 flex items-center justify-center"
                    >
                      <svg
                        class="w-8 h-8 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <p class="text-gray-400 mb-1">Перетащите изображение или кликните</p>
                    <p class="text-gray-500 text-sm">PNG, JPG до 10MB</p>
                  </div>
                  <div v-else class="relative group">
                    <img
                      :src="`https://fs.cdn-chatium.io/get/${imageForm.uploadedImageHash}`"
                      class="w-full h-48 object-cover rounded-xl"
                    />
                    <div
                      class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center"
                    >
                      <span class="text-white text-sm">Кликните чтобы изменить</span>
                    </div>
                  </div>
                </div>

                <!-- Uploaded Images Grid -->
                <div v-if="uploadedImages.length > 0">
                  <p class="text-xs text-gray-500 mb-3">Или выберите из загруженных:</p>
                  <div class="grid grid-cols-4 gap-2">
                    <div
                      v-for="img in uploadedImages"
                      :key="img.id"
                      @click="imageForm.uploadedImageHash = img.uploadedImageHash"
                      :class="[
                        'relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200',
                        imageForm.uploadedImageHash === img.uploadedImageHash
                          ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-[#111118] scale-95'
                          : 'hover:scale-95 opacity-60 hover:opacity-100'
                      ]"
                    >
                      <img
                        :src="`https://fs.cdn-chatium.io/get/${img.uploadedImageHash}`"
                        class="w-full h-full object-cover"
                      />
                      <div
                        v-if="imageForm.uploadedImageHash === img.uploadedImageHash"
                        class="absolute inset-0 bg-purple-500/20 flex items-center justify-center"
                      >
                        <svg
                          class="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Video Generation Tab -->
          <div v-show="activeTab === 'video'" class="animate-fade-in">
            <div class="grid lg:grid-cols-2 gap-8">
              <!-- Left Column - Settings -->
              <div class="space-y-6">
                <!-- Model Selection -->
                <div class="space-y-2">
                  <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Модель
                  </label>
                  <select
                    v-model="videoForm.model"
                    class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200 cursor-pointer"
                  >
                    <option value="wan/2-2-a14b">🎬 Wan 2</option>
                    <option value="wan/2-2-5b-fast">⚡ Wan 2 Fast</option>
                    <option value="runway">🎥 Runway</option>
                  </select>
                </div>

                <!-- Mode Selection -->
                <div class="space-y-2">
                  <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                      />
                    </svg>
                    Режим генерации
                  </label>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      @click="videoForm.mode = 'text-to-video'"
                      :class="[
                        'flex flex-col items-center justify-center py-4 px-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-200',
                        videoForm.mode === 'text-to-video'
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : ''
                      ]"
                    >
                      <svg
                        class="w-6 h-6 mb-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span class="text-xs font-medium">Текст → Видео</span>
                    </button>
                    <button
                      type="button"
                      @click="videoForm.mode = 'image-to-video'"
                      :class="[
                        'flex flex-col items-center justify-center py-4 px-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-200',
                        videoForm.mode === 'image-to-video'
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : ''
                      ]"
                    >
                      <svg
                        class="w-6 h-6 mb-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span class="text-xs font-medium">Изображение → Видео</span>
                    </button>
                  </div>
                </div>

                <!-- Prompt Input -->
                <div class="space-y-2">
                  <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                    Описание
                  </label>
                  <textarea
                    v-model="videoForm.prompt"
                    rows="4"
                    placeholder="Опишите желаемое видео: движение, сцену, эффекты..."
                    class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200 resize-none"
                  ></textarea>
                </div>

                <!-- Generate Button -->
                <button
                  @click="generateVideo"
                  :disabled="
                    isGenerating ||
                    !videoForm.prompt ||
                    (videoForm.mode === 'image-to-video' && !videoForm.uploadedImageHash)
                  "
                  class="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span v-if="!isGenerating" class="flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Сгенерировать
                  </span>
                  <span v-else class="flex items-center justify-center gap-2">
                    <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Генерация...
                  </span>
                </button>
              </div>

              <!-- Right Column - Source Image -->
              <div v-if="videoForm.mode === 'image-to-video'" class="space-y-4">
                <label class="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Исходное изображение
                </label>

                <!-- Upload Zone -->
                <div
                  class="border-2 border-dashed border-white/10 rounded-2xl p-8 cursor-pointer hover:border-white/20 hover:bg-white/5 transition-all duration-200"
                  @click="$refs.videoFileInput.click()"
                  @dragover.prevent
                  @drop.prevent="handleVideoDrop"
                >
                  <input
                    type="file"
                    ref="videoFileInput"
                    @change="handleVideoImageUpload"
                    accept="image/*"
                    class="hidden"
                  />
                  <div v-if="!videoForm.uploadedImageHash" class="text-center">
                    <div
                      class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/10 flex items-center justify-center"
                    >
                      <svg
                        class="w-8 h-8 text-cyan-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <p class="text-gray-400 mb-1">Перетащите изображение или кликните</p>
                    <p class="text-gray-500 text-sm">PNG, JPG до 10MB</p>
                  </div>
                  <div v-else class="relative group">
                    <img
                      :src="`https://fs.cdn-chatium.io/get/${videoForm.uploadedImageHash}`"
                      class="w-full h-48 object-cover rounded-xl"
                    />
                    <div
                      class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center"
                    >
                      <span class="text-white text-sm">Кликните чтобы изменить</span>
                    </div>
                  </div>
                </div>

                <!-- Uploaded Images Grid -->
                <div v-if="uploadedImages.length > 0">
                  <p class="text-xs text-gray-500 mb-3">Или выберите из загруженных:</p>
                  <div class="grid grid-cols-4 gap-2">
                    <div
                      v-for="img in uploadedImages"
                      :key="img.id"
                      @click="videoForm.uploadedImageHash = img.uploadedImageHash"
                      :class="[
                        'relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200',
                        videoForm.uploadedImageHash === img.uploadedImageHash
                          ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-[#111118] scale-95'
                          : 'hover:scale-95 opacity-60 hover:opacity-100'
                      ]"
                    >
                      <img
                        :src="`https://fs.cdn-chatium.io/get/${img.uploadedImageHash}`"
                        class="w-full h-full object-cover"
                      />
                      <div
                        v-if="videoForm.uploadedImageHash === img.uploadedImageHash"
                        class="absolute inset-0 bg-cyan-500/20 flex items-center justify-center"
                      >
                        <svg
                          class="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- History Section -->
      <div v-if="filteredGenerations.length > 0" class="glass-card rounded-3xl p-1">
        <div class="rounded-3xl p-6 sm:p-8" style="background: rgba(17, 17, 24, 0.8)">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-white flex items-center gap-2">
              <svg
                class="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              История генераций
            </h2>
            <span class="text-sm text-gray-500">{{ filteredGenerations.length }} результатов</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="gen in filteredGenerations"
              :key="gen.id"
              class="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-200 group"
            >
              <!-- Status Badge -->
              <div class="flex items-center justify-between mb-3">
                <span
                  :class="getTypeBadgeClass(gen.type)"
                  class="px-3 py-1 rounded-full text-xs font-medium"
                >
                  {{ getTypeLabel(gen.type) }}
                </span>
                <span
                  :class="getStatusBadgeClass(gen.status)"
                  class="px-2 py-1 rounded-full text-xs font-medium"
                >
                  <span v-if="gen.status === 'processing'" class="flex items-center gap-1">
                    <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                    Обработка
                  </span>
                  <span v-else-if="gen.status === 'completed'" class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Готово
                  </span>
                  <span v-else class="flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Ошибка
                  </span>
                </span>
              </div>

              <!-- Result Preview -->
              <div class="relative aspect-square rounded-xl overflow-hidden bg-white/5 mb-3">
                <div
                  v-if="gen.status === 'processing'"
                  class="absolute inset-0 flex items-center justify-center"
                >
                  <div class="text-center">
                    <div class="w-12 h-12 mx-auto mb-3 relative">
                      <div
                        class="absolute inset-0 rounded-full border-2 border-purple-500/20"
                      ></div>
                      <div
                        class="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin"
                      ></div>
                    </div>
                    <p class="text-sm text-gray-400">Генерируем...</p>
                  </div>
                </div>

                <img
                  v-else-if="gen.generatedImageHash"
                  :src="`https://fs.cdn-chatium.io/get/${gen.generatedImageHash}`"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                <video
                  v-else-if="gen.generatedVideoHash"
                  :src="gen.generatedVideoHash"
                  controls
                  class="w-full h-full object-cover"
                ></video>

                <div
                  v-else-if="gen.status === 'failed'"
                  class="absolute inset-0 flex items-center justify-center"
                >
                  <div class="text-center text-red-400">
                    <svg
                      class="w-10 h-10 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <p class="text-sm">Ошибка генерации</p>
                  </div>
                </div>
              </div>

              <!-- Prompt -->
              <p v-if="gen.prompt" class="text-sm text-gray-400 line-clamp-2 mb-3">
                {{ gen.prompt }}
              </p>
              <p v-if="gen.error" class="text-sm text-red-400 line-clamp-2 mb-3">{{ gen.error }}</p>

              <!-- Download Button -->
              <button
                v-if="gen.generatedImageHash"
                @click="
                  downloadFile(
                    `https://fs.cdn-chatium.io/get/${gen.generatedImageHash}`,
                    'image.png'
                  )
                "
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all duration-200"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Скачать
              </button>

              <button
                v-if="gen.generatedVideoHash"
                @click="downloadFile(gen.generatedVideoHash, 'video.mp4')"
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all duration-200"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Скачать
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="glass-card rounded-3xl p-1">
        <div class="rounded-3xl p-12 text-center" style="background: rgba(17, 17, 24, 0.8)">
          <div
            class="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center"
          >
            <svg
              class="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-white mb-2">Пока нет генераций</h3>
          <p class="text-gray-400">Создайте своё первое изображение или видео с помощью AI</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  apiGenerateImageRoute,
  apiGenerateVideoRoute,
  apiGetGenerationsRoute,
  apiUploadImageRoute
} from '../api/generations'
import { obtainStorageFilePutUrl } from '@app/storage'

const activeTab = ref('image')
const isGenerating = ref(false)
const generations = ref([])

const imageForm = ref({
  model: 'google/gemini-2.5-flash-image',
  mode: 'text-to-image',
  prompt: '',
  uploadedImageHash: ''
})

const videoForm = ref({
  model: 'wan/2-2-a14b',
  mode: 'text-to-video',
  prompt: '',
  uploadedImageHash: ''
})

const uploadedImages = computed(() => {
  return generations.value.filter(
    (g) => g.type === 'upload' && g.uploadedImageHash && g.status === 'completed'
  )
})

const filteredGenerations = computed(() => {
  return generations.value.filter((g) => g.type !== 'upload')
})

const imageFileInput = ref(null)
const videoFileInput = ref(null)

async function loadGenerations() {
  try {
    const result = await apiGetGenerationsRoute.run(ctx)
    generations.value = result
  } catch (error) {
    console.error('Failed to load generations:', error)
  }
}

async function uploadFile(file) {
  const uploadUrl = await obtainStorageFilePutUrl(ctx)
  const formData = new FormData()
  formData.append('Filedata', file)

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', uploadUrl)

    request.addEventListener('load', function () {
      if (request.status === 200) {
        resolve(request.response)
      } else {
        reject(new Error('Upload failed'))
      }
    })

    request.addEventListener('error', () => reject(new Error('Upload failed')))
    request.send(formData)
  })
}

async function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const hash = await uploadFile(file)
    if (hash) {
      imageForm.value.uploadedImageHash = hash
      await apiUploadImageRoute.run(ctx, { imageHash: hash })
      await loadGenerations()
    }
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

async function handleVideoImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const hash = await uploadFile(file)
    if (hash) {
      videoForm.value.uploadedImageHash = hash
      await apiUploadImageRoute.run(ctx, { imageHash: hash })
      await loadGenerations()
    }
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

async function handleImageDrop(event) {
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    try {
      const hash = await uploadFile(file)
      if (hash) {
        imageForm.value.uploadedImageHash = hash
        await apiUploadImageRoute.run(ctx, { imageHash: hash })
        await loadGenerations()
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }
}

async function handleVideoDrop(event) {
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    try {
      const hash = await uploadFile(file)
      if (hash) {
        videoForm.value.uploadedImageHash = hash
        await apiUploadImageRoute.run(ctx, { imageHash: hash })
        await loadGenerations()
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }
}

async function generateImage() {
  if (!imageForm.value.prompt) return
  if (imageForm.value.mode === 'image-to-image' && !imageForm.value.uploadedImageHash) return

  isGenerating.value = true
  try {
    await apiGenerateImageRoute.run(ctx, {
      prompt: imageForm.value.prompt,
      model: imageForm.value.model,
      mode: imageForm.value.mode,
      uploadedImageHash: imageForm.value.uploadedImageHash || undefined
    })

    imageForm.value.prompt = ''

    const pollInterval = setInterval(async () => {
      await loadGenerations()
      const latestGen = generations.value.find((g) => g.type !== 'upload')
      if (latestGen && latestGen.status !== 'processing') {
        clearInterval(pollInterval)
        isGenerating.value = false
      }
    }, 2000)
  } catch (error) {
    console.error('Generation failed:', error)
    isGenerating.value = false
  }
}

async function generateVideo() {
  if (!videoForm.value.prompt) return
  if (videoForm.value.mode === 'image-to-video' && !videoForm.value.uploadedImageHash) return

  isGenerating.value = true
  try {
    await apiGenerateVideoRoute.run(ctx, {
      prompt: videoForm.value.prompt,
      model: videoForm.value.model,
      mode: videoForm.value.mode,
      uploadedImageHash: videoForm.value.uploadedImageHash || undefined
    })

    videoForm.value.prompt = ''

    const pollInterval = setInterval(async () => {
      await loadGenerations()
      const latestGen = generations.value.find((g) => g.type !== 'upload')
      if (latestGen && latestGen.status !== 'processing') {
        clearInterval(pollInterval)
        isGenerating.value = false
      }
    }, 2000)
  } catch (error) {
    console.error('Generation failed:', error)
    isGenerating.value = false
  }
}

function getTypeBadgeClass(type) {
  if (type === 'image') return 'bg-purple-500/20 text-purple-300'
  if (type === 'video') return 'bg-cyan-500/20 text-cyan-300'
  return 'bg-gray-500/20 text-gray-300'
}

function getTypeLabel(type) {
  if (type === 'image') return '🎨 Изображение'
  if (type === 'video') return '🎬 Видео'
  return '📁 Загрузка'
}

function getStatusBadgeClass(status) {
  if (status === 'completed') return 'bg-emerald-500/20 text-emerald-300'
  if (status === 'processing') return 'bg-amber-500/20 text-amber-300'
  if (status === 'failed') return 'bg-red-500/20 text-red-300'
  return 'bg-gray-500/20 text-gray-300'
}

function downloadFile(fileUrl, filename) {
  const link = document.createElement('a')
  link.href = fileUrl
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(() => {
  loadGenerations()
})
</script>

<style scoped>
.glass-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

select option {
  background: #111118;
  color: white;
}
</style>

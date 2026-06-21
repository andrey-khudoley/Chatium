<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[var(--tg-theme-bg-gradient-from)] to-[var(--tg-theme-bg-gradient-to)] p-6"
  >
    <div
      class="bg-[var(--tg-theme-card-bg)] rounded-2xl shadow-lg border border-[var(--tg-theme-border-light)] p-8 max-w-sm w-full"
    >
      <!-- Заголовок -->
      <div class="text-center mb-8">
        <p class="text-[var(--tg-theme-text-muted)] text-sm font-medium uppercase tracking-wide">
          Текущий пользователь
        </p>
      </div>

      <!-- Фотография пользователя -->
      <div class="flex justify-center mb-6">
        <div
          class="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--tg-theme-accent-color)] shadow-lg"
        >
          <img
            v-if="props.user.imageUrl"
            :src="props.user.imageUrl"
            :alt="`${props.user.firstName} ${props.user.lastName}`"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full bg-[var(--tg-theme-accent-bg)] flex items-center justify-center"
          >
            <i class="fas fa-user text-[var(--tg-theme-accent-color)] text-3xl"></i>
          </div>
        </div>
      </div>

      <!-- Имя и фамилия -->
      <div class="text-center">
        <h2 class="text-[var(--tg-theme-text-primary)] text-xl font-semibold mb-1">
          {{ props.user.firstName }} {{ props.user.lastName }}
        </h2>
        <p v-if="props.user.username" class="text-[var(--tg-theme-text-secondary)] text-sm">
          @{{ props.user.username }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ user: any }>()
</script>

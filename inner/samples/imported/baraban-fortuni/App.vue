<template>
  <div
    class="min-h-[100svh] flex flex-col items-center justify-center p-4 font-sans text-gray-800 bg-slate-50"
  >
    <div class="w-full max-w-sm mx-auto flex flex-col items-center">
      <h1 class="text-3xl font-bold mb-2 text-slate-700">Колесо Фортуны</h1>
      <p class="text-slate-500 mb-8">Нажмите кнопку, чтобы начать</p>

      <div class="relative w-full" :style="{ height: `${REEL_CONTAINER_HEIGHT}px` }">
        <!-- Fading overlays -->
        <div
          class="absolute top-0 left-0 w-full h-1/4 bg-gradient-to-b from-slate-50 to-transparent z-10"
        />
        <div
          class="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-slate-50 to-transparent z-10"
        />

        <!-- Pointer Arrow -->
        <div
          class="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 z-20"
          style="
            border-top: 14px solid transparent;
            border-bottom: 14px solid transparent;
            border-right: 20px solid #1e293b;
          "
        />

        <div class="w-full h-full overflow-hidden">
          <div
            class="flex flex-col items-center"
            :style="{
              transform: `translateY(${translationY}px)`,
              transitionProperty: 'transform',
              transitionDuration: isSpinning ? `${SPIN_DURATION_MS}ms` : '0ms',
              transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)'
            }"
          >
            <PrizeCard
              v-for="(prize, index) in reelItems"
              :key="index"
              :prize="prize"
              :is-selected="
                !isSpinning && index === SCRAMBLE_ITEMS_COUNT + (winningPrizeIndex ?? -1)
              "
            />
          </div>
        </div>
      </div>

      <div
        v-if="winningPrize && !isSpinning"
        class="mt-6 text-center transition-opacity duration-500"
      >
        <p class="text-slate-500">Поздравляем! Ваш приз:</p>
        <p class="text-2xl font-bold text-slate-800">{{ winningPrize.name }}</p>
      </div>

      <button
        @click="handleSpin"
        :disabled="isSpinning"
        class="mt-8 w-full py-4 px-6 bg-blue-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-300 transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100"
      >
        {{ isSpinning ? 'Крутится...' : 'Крутить' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Prize } from './types'
import {
  HealthIcon,
  GroceriesIcon,
  TravelIcon,
  EntertainmentIcon,
  MarketIcon,
  CafeIcon,
  TransportIcon,
  HomeIcon
} from './components/Icons'
import PrizeCard from './components/PrizeCard.vue'

// --- CONSTANTS ---
const ITEM_HEIGHT = 80
const ITEM_MARGIN_BOTTOM = 16
const TOTAL_ITEM_HEIGHT = ITEM_HEIGHT + ITEM_MARGIN_BOTTOM
const REEL_CONTAINER_HEIGHT = TOTAL_ITEM_HEIGHT * 3 + ITEM_HEIGHT
const SCRAMBLE_ITEMS_COUNT = 100
const OVERSHOOT_ITEMS_COUNT = 10
const SPIN_DURATION_MS = 7000

const INITIAL_PRIZES: Prize[] = [
  {
    id: 1,
    name: 'Здоровье',
    label: 'Health',
    percentage: 7,
    icon: HealthIcon,
    color: 'bg-emerald-50 text-emerald-700',
    selectedColor: 'bg-emerald-400 text-white'
  },
  {
    id: 2,
    name: 'Продукты',
    label: 'Groceries',
    percentage: 15,
    icon: GroceriesIcon,
    color: 'bg-sky-100 text-sky-800',
    selectedColor: 'bg-sky-500 text-white'
  },
  {
    id: 3,
    name: 'Сервис Тревел',
    label: 'Travel',
    percentage: 7,
    icon: TravelIcon,
    color: 'bg-orange-100 text-orange-800',
    selectedColor: 'bg-orange-400 text-white'
  },
  {
    id: 4,
    name: 'Развлечения',
    label: 'Entertainment',
    percentage: 5,
    icon: EntertainmentIcon,
    color: 'bg-purple-100 text-purple-800',
    selectedColor: 'bg-purple-500 text-white'
  },
  {
    id: 5,
    name: 'Сервис Маркет',
    label: 'Market',
    percentage: 10,
    icon: MarketIcon,
    color: 'bg-indigo-100 text-indigo-800',
    selectedColor: 'bg-indigo-500 text-white'
  },
  {
    id: 6,
    name: 'Кафе и Рестораны',
    label: 'Cafe',
    percentage: 8,
    icon: CafeIcon,
    color: 'bg-yellow-50 text-yellow-700',
    selectedColor: 'bg-yellow-400 text-white'
  },
  {
    id: 7,
    name: 'Транспорт',
    label: 'Transport',
    percentage: 12,
    icon: TransportIcon,
    color: 'bg-rose-100 text-rose-800',
    selectedColor: 'bg-rose-500 text-white'
  },
  {
    id: 8,
    name: 'Дом и Ремонт',
    label: 'Home',
    percentage: 20,
    icon: HomeIcon,
    color: 'bg-slate-200 text-slate-800',
    selectedColor: 'bg-slate-500 text-white'
  }
]

// --- HELPER FUNCTIONS ---
const shuffleArray = (array: unknown[]): unknown[] => {
  const newArray = [...array]
  // for (let i = newArray.length - 1; i > 0; i--) {
  //   const j = Math.floor(Math.random() * (i + 1))
  //   ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  // }
  return newArray
}

// --- STATE & COMPUTED ---
const isSpinning = ref(false)
const winningPrizeIndex = ref<number | null>(null)
const translationY = ref(0)

const reelItems = computed(() => {
  const scramblePart = shuffleArray(
    Array(Math.ceil(SCRAMBLE_ITEMS_COUNT / INITIAL_PRIZES.length))
      .fill(INITIAL_PRIZES)
      .flat()
  ).slice(0, SCRAMBLE_ITEMS_COUNT)

  const winningPart = INITIAL_PRIZES

  const overshootPart = shuffleArray(
    Array(Math.ceil(OVERSHOOT_ITEMS_COUNT / INITIAL_PRIZES.length))
      .fill(INITIAL_PRIZES)
      .flat()
  ).slice(0, OVERSHOOT_ITEMS_COUNT)

  return [...scramblePart, ...winningPart, ...overshootPart]
})

const winningPrize = computed(() => {
  return winningPrizeIndex.value !== null ? INITIAL_PRIZES[winningPrizeIndex.value] : null
})

// --- METHODS ---
const handleSpin = () => {
  if (isSpinning.value) return

  winningPrizeIndex.value = null
  translationY.value = 0

  setTimeout(() => {
    const winnerIndex = Math.floor(Math.random() * INITIAL_PRIZES.length)
    const targetReelIndex = SCRAMBLE_ITEMS_COUNT + winnerIndex

    const containerCenter = REEL_CONTAINER_HEIGHT / 2
    const itemCenter = ITEM_HEIGHT / 2
    const offsetToCenter = containerCenter - itemCenter

    const newTranslationY = -(targetReelIndex * TOTAL_ITEM_HEIGHT) + offsetToCenter

    isSpinning.value = true
    translationY.value = newTranslationY

    setTimeout(() => {
      isSpinning.value = false
      winningPrizeIndex.value = winnerIndex
    }, SPIN_DURATION_MS + 200)
  }, 100)
}
</script>

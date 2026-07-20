<template>
  <div>
    <div class="grain-overlay"></div>

    <nav class="navbar fixed top-0 left-0 right-0 z-50" :class="{ 'is-scrolled': scrolled }">
      <div class="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 h-16 flex items-center justify-between">
        <a
          href="#"
          class="font-display text-lg text-warm-100/80 hover:text-warm-100 transition-colors"
          style="line-height: 1.15"
          >НФ</a
        >
        <div class="hidden md:flex items-center gap-8">
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            class="font-body text-xs text-warm-300/50 hover:text-warm-100 transition-colors tracking-wide uppercase"
            >{{ link.label }}</a
          >
        </div>
        <a
          href="https://t.me/Fomina_Nadine"
          target="_blank"
          rel="noopener"
          class="font-body text-xs text-amber/70 hover:text-amber transition-colors tracking-wide"
        >
          <i class="fab fa-telegram mr-1"></i>Написать
        </a>
      </div>
    </nav>

    <HeroSection />
    <MethodSection />
    <ResultsSection />
    <ServicesSection />
    <AboutSection />
    <TestimonialsSection />
    <ContactSection />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import HeroSection from '../components/HeroSection.vue'
import MethodSection from '../components/MethodSection.vue'
import ResultsSection from '../components/ResultsSection.vue'
import ServicesSection from '../components/ServicesSection.vue'
import AboutSection from '../components/AboutSection.vue'
import TestimonialsSection from '../components/TestimonialsSection.vue'
import ContactSection from '../components/ContactSection.vue'

const scrolled = ref(false)
let observer = null

const navLinks = [
  { href: '#method', label: 'Подход' },
  { href: '#results', label: 'Результаты' },
  { href: '#services', label: 'Услуги' },
  { href: '#about', label: 'Обо мне' },
  { href: '#contact', label: 'Контакт' }
]

function onScroll() {
  scrolled.value = window.scrollY > 60
}

function initRevealObserver() {
  const els = document.querySelectorAll('.reveal')
  if (!els.length) return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )

  els.forEach((el) => observer.observe(el))
}

function hidePreloader() {
  const preloader = document.getElementById('preloader')
  if (preloader) {
    preloader.classList.add('is-hidden')
    setTimeout(() => {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader)
    }, 700)
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  nextTick(() => {
    initRevealObserver()
  })

  setTimeout(hidePreloader, 800)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (observer) observer.disconnect()
})
</script>

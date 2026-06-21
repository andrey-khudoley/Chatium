<template>
  <main>
    <HeroSection @open-modal="showModal = true" />
    <SignsSection />
    <QualityOfLifeSection />
    <WhySection />

    <ProgramSection />
    <EnergyLevels />
    <PracticalTips />
    <ImportanceSection />
    <ApproachSection />
    <SpeakerSection />
    <AudienceSection @open-modal="showModal = true" />
    <FormatSection @open-modal="showModal = true" />

    <footer class="py-8 bg-slate-900 text-center">
      <p class="text-sage-300/60 text-sm">© 2026 Проект «Практики.ру». Все права защищены.</p>
    </footer>

    <RegistrationModal :is-open="showModal" @close="showModal = false" />
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HeroSection from '../components/HeroSection.vue'
import SignsSection from '../components/SignsSection.vue'
import QualityOfLifeSection from '../components/QualityOfLifeSection.vue'
import WhySection from '../components/WhySection.vue'

import ProgramSection from '../components/ProgramSection.vue'
import EnergyLevels from '../components/EnergyLevels.vue'
import PracticalTips from '../components/PracticalTips.vue'
import ImportanceSection from '../components/ImportanceSection.vue'
import ApproachSection from '../components/ApproachSection.vue'
import SpeakerSection from '../components/SpeakerSection.vue'
import AudienceSection from '../components/AudienceSection.vue'
import FormatSection from '../components/FormatSection.vue'
import RegistrationModal from '../components/RegistrationModal.vue'

const showModal = ref(false)

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  )

  document.querySelectorAll('.animate-on-scroll, .flow-in-right').forEach((el) => {
    observer.observe(el)
  })
})
</script>

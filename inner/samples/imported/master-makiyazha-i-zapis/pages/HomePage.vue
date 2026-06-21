<template>
  <div class="min-h-screen">
    <Header />
    <main class="pt-16">
      <HeroSection />
      <ServicesSection />
      <PortfolioSection />
      <AboutSection />
      <BookingSection />
    </main>
    <Footer />
  </div>
</template>

<script setup>
import Header from '../components/Header.vue'
import HeroSection from '../components/HeroSection.vue'
import ServicesSection from '../components/ServicesSection.vue'
import PortfolioSection from '../components/PortfolioSection.vue'
import AboutSection from '../components/AboutSection.vue'
import BookingSection from '../components/BookingSection.vue'
import Footer from '../components/Footer.vue'
</script>
